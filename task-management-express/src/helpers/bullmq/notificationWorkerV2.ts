//@ts-ignore
import { Queue, Worker, Job } from "bullmq";
import { errorLogger, logger } from "../../shared/logger";
import { Notification } from "../../modules/notification/notification.model";
import { redisPubClient } from "../redis/redis";
import { socketService } from "../socket/socketForChatV3";
import { TRole } from "../../middlewares/roles";
import { buildTranslatedField } from "../../utils/buildTranslatedField";
import { StatusCodes } from "http-status-codes";
import { INotificationDocument } from "../../modules/notification.module/notification/notification.interface";

/*-─────────────────────────────────
|  💎✨🔍 V2 Notification Queue - FIXED
|  
|  ISSUE IN V1: Worker was creating notification AGAIN
|  when it was already created by notification.service.ts
|  
|  FIX: V2 worker only processes EXISTING notification:
|  1. Fetch notification from DB (already created)
|  2. Deliver via socket/email/push
|  3. Update delivery status
|  4. NO duplicate creation
|  
|  Flow: createNotification() → Queue Job → V2 Worker Processes
└──────────────────────────────────*/

export const notificationQueueV2 = new Queue("notificationQueue-v2", {
  connection: redisPubClient.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: { 
      type: 'exponential', 
      delay: 2000 
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

/*-─────────────────────────────────
|  Job Data Interface
└──────────────────────────────────*/
interface INotificationJobDataV2 {
  notificationId: string;  // Only pass ID, not full payload
}

/*-─────────────────────────────────
|  V2 Notification Worker
|  
|  RESPONSIBILITIES:
|  1. Fetch EXISTING notification from DB
|  2. Deliver via appropriate channel (socket, email, push)
|  3. Update delivery status (deliveredAt)
|  4. Handle offline users (store for later delivery)
|  
|  DOES NOT:
|  - Create new notifications (already done by service)
|  - Duplicate entries
└──────────────────────────────────*/
export const startNotificationWorkerV2 = () => {
  const worker = new Worker<INotificationJobDataV2>(
    "notificationQueue-v2",
    async (job: Job<INotificationJobDataV2>) => {
      const { notificationId } = job.data;
      
      logger.info(`🔄 [V2 Worker] Processing notification job ${job.id} for notification ${notificationId}`);

      try {
        // ✅ STEP 1: Fetch EXISTING notification from DB
        const notification = await Notification.findById(notificationId)
          .populate('senderId', 'name profileImage')
          .populate('receiverId', 'name profileImage')
          .lean() as INotificationDocument | null;

        if (!notification) {
          logger.warn(`⚠️ [V2 Worker] Notification ${notificationId} not found in DB`);
          return { success: false, reason: 'Notification not found' };
        }

        // If already delivered, skip
        if (notification.deliveredAt) {
          logger.info(`ℹ️ [V2 Worker] Notification ${notificationId} already delivered at ${notification.deliveredAt}`);
          return { success: true, alreadyDelivered: true };
        }

        logger.info(`📧 [V2 Worker] Processing notification: ${notification.title}`, {
          id: notification._id,
          receiverId: notification.receiverId,
          receiverRole: notification.receiverRole,
          channels: notification.channels,
        });

        // ✅ STEP 2: Build notification payload for delivery
        const [titleObj]: [any] = await Promise.all([
          buildTranslatedField(notification.title as string)
        ]);

        const deliveryPayload = {
          _id: notification._id.toString(),
          title: titleObj,
          subTitle: notification.subTitle,
          senderId: notification.senderId,
          receiverId: notification.receiverId?.toString(),
          receiverRole: notification.receiverRole,
          type: notification.type,
          linkFor: notification.linkFor,
          linkId: notification.linkId?.toString(),
          referenceFor: notification.referenceFor,
          referenceId: notification.referenceId?.toString(),
          priority: notification.priority,
          channels: notification.channels,
          data: notification.data,
          createdAt: notification.createdAt,
        };

        // ✅ STEP 3: Deliver via appropriate channels
        const deliveryResults: Record<string, boolean> = {};

        // --- Channel 1: Real-time Socket Delivery ---
        if (notification.channels.includes('in_app')) {
          const socketResult = await deliverViaSocket(notification, deliveryPayload);
          deliveryResults.socket = socketResult;
        }

        // --- Channel 2: Email Delivery (if enabled) ---
        if (notification.channels.includes('email')) {
          // TODO: Integrate email service
          logger.info(`📧 [V2 Worker] Email delivery pending for notification ${notificationId}`);
          deliveryResults.email = false; // Placeholder
        }

        // --- Channel 3: Push Notification (if enabled) ---
        if (notification.channels.includes('push')) {
          // TODO: Integrate push notification service (FCM/APNS)
          logger.info(`📱 [V2 Worker] Push delivery pending for notification ${notificationId}`);
          deliveryResults.push = false; // Placeholder
        }

        // ✅ STEP 4: Update notification delivery status
        await Notification.findByIdAndUpdate(
          notificationId,
          {
            deliveredAt: new Date(),
            status: 'delivered',
            'metadata.deliveryResults': deliveryResults,
          }
        );

        logger.info(`✅ [V2 Worker] Notification ${notificationId} delivered successfully`, deliveryResults);

        return { 
          success: true, 
          notificationId, 
          deliveryResults,
          deliveredAt: new Date() 
        };

      } catch (err: any) {
        errorLogger.error(`❌ [V2 Worker] Notification job ${job.id} failed:`, {
          error: err.message,
          stack: err.stack,
          notificationId,
          jobId: job.id,
          attempt: job.attemptsMade,
        });
        throw err; // Ensures retry/backoff
      }
    },
    { 
      connection: redisPubClient.options,
      concurrency: 10, // Max 10 concurrent jobs
    }
  );

  // ✅ Event Listeners
  worker.on("completed", (job, result) =>
    logger.info(`✅ [V2 Worker] Job ${job.id} completed`, result)
  );
  
  worker.on("failed", (job, err) =>
    errorLogger.error(`❌ [V2 Worker] Job ${job?.id} failed`, {
      error: err.message,
      jobId: job?.id,
      jobName: job?.name,
      attemptsMade: job?.attemptsMade,
    })
  );

  worker.on("progress", (job, progress) =>
    logger.info(`🔄 [V2 Worker] Job ${job.id} progress:`, progress)
  );
};

/*-─────────────────────────────────
|  Helper: Deliver Notification via Socket
└──────────────────────────────────*/
async function deliverViaSocket(
  notification: INotificationDocument,
  payload: any
): Promise<boolean> {
  try {
    let eventName: string;
    let emitted: boolean;

    // 🎨 GUIDE FOR FRONTEND: Admin listens to notification::admin event
    if (notification.receiverRole === TRole.admin) {
      eventName = `notification::admin`;

      emitted = socketService.emitToRole(
        notification.receiverRole!,
        eventName,
        payload
      );

      if (emitted) {
        logger.info(`🔔 [V2 Socket] Real-time notification sent to ${notification.receiverRole}`);
      } else {
        logger.info(`📴 [V2 Socket] ${notification.receiverRole} is offline, notification stored in DB only`);
      }

      return emitted;
    } 
    
    // 🎨 GUIDE FOR FRONTEND: User listens to notification::{userId} event
    if (notification.receiverId) {
      const receiverId = notification.receiverId.toString();
      eventName = `notification::${receiverId}`;

      emitted = await socketService.emitToUser(
        receiverId,
        eventName,
        payload
      );

      if (emitted) {
        logger.info(`🔔 [V2 Socket] Real-time notification sent to user ${receiverId}`);
      } else {
        logger.info(`📴 [V2 Socket] User ${receiverId} is offline, notification stored in DB only`);
      }

      return emitted;
    }

    logger.warn(`⚠️ [V2 Socket] No valid receiver found for notification ${notification._id}`);
    return false;

  } catch (err: any) {
    errorLogger.error(`❌ [V2 Socket] Failed to deliver notification via socket:`, err);
    return false;
  }
}

/*-─────────────────────────────────
|  V2 Queue Status Helper
└──────────────────────────────────*/
export const getNotificationQueueV2Status = async () => {
  try {
    const waitingCount = await notificationQueueV2.getWaitingCount();
    const activeCount = await notificationQueueV2.getActiveCount();
    const failedCount = await notificationQueueV2.getFailedCount();
    const delayedCount = await notificationQueueV2.getDelayedCount();

    return {
      queue: 'notificationQueue-v2',
      waiting: waitingCount,
      active: activeCount,
      failed: failedCount,
      delayed: delayedCount,
      timestamp: new Date(),
    };
  } catch (err: any) {
    errorLogger.error(`❌ Failed to get V2 queue status:`, err);
    throw err;
  }
};
