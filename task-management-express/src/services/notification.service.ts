import { notificationQueueV2 } from "../helpers/bullmq/notificationWorkerV2";
import { Notification } from "../modules/notification/notification.model";
import { TNotificationType } from "../modules/notification/notification.constants";
//@ts-ignore
import { Types } from "mongoose";
import { errorLogger, logger } from "../shared/logger";
import { NotificationStatus, NotificationPriority, NotificationChannel } from "../modules/notification.module/notification/notification.constant";

/*-─────────────────────────────────
|  ⚠️ DEPRECATED - Legacy Notification Helper
|  
|  This function is kept for backward compatibility.
|  NEW CODE should use: notificationService.createNotification()
|  
|  Migration: Update all callers to use the new service directly.
|  
|  @deprecated Use NotificationService.createNotification() instead
└──────────────────────────────────*/

//---------------------------------
//  global method to send notification through bull queue
//---------------------------------
export async function enqueueWebNotification(
  // existingTrainingProgram, user: any
  title: string,
  senderId: string,
  receiverId: string,
  /***
   * receiverRole can be null .. important for admin
   * ** */
  receiverRole: string | null, // for admin .. we must need role .. otherwise we dont need role

  type: TNotificationType,

  idOfType: Types.ObjectId, //🧩

  //---------------------------------
  // queryParamValue  so that in query we can pass queryParamKey=queryParamValue
  //---------------------------------
  linkFor?: string | null,

  //---------------------------------
  // queryParamValue
  //---------------------------------
  linkId?: string | null,
) {
  try {
    // ✅ STEP 1: Create notification in DB first
    const notification = await Notification.create({
      title,
      senderId: new Types.ObjectId(senderId),
      receiverId: receiverId ? new Types.ObjectId(receiverId) : null,
      receiverRole,
      type,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      linkFor,
      linkId: linkId ? new Types.ObjectId(linkId) : null,
      referenceFor: type,
      referenceId: idOfType,
      status: NotificationStatus.PENDING,
    });

    logger.info(`📧 [Legacy Helper] Notification created: ${notification._id}`);

    // ✅ STEP 2: Queue for V2 worker delivery (only pass ID)
    const job = await notificationQueueV2.add(
      'deliverNotification',
      {
        notificationId: notification._id.toString(),
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000, // 2s, 4s, 8s
        },
        removeOnComplete: true,
        removeOnFail: 1000, // keep failed jobs for debugging
      }
    );

    logger.info(`📧 [Legacy Helper] Notification queued for delivery: ${notification._id}`);

  } catch (error) {
    errorLogger.error(`❌ [Legacy Helper] Failed to enqueue notification:`, error);
    throw error;
  }

  // console.log("🔔 enqueueWebNotification hit :: notifAdded -> ")//notifAdded
}