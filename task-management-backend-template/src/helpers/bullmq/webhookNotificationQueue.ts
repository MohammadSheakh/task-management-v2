//@ts-ignore
import { Queue, Worker, Job } from 'bullmq';
import { redisPubClient } from '../redis/redis';
import { logger, errorLogger } from '../../shared/logger';
import { Notification } from '../../modules/notification.module/notification/notification.model';
import { notificationQueueV2 } from './notificationWorkerV2';
import {
  NotificationType,
  NotificationPriority,
  NotificationChannel,
  NotificationStatus,
} from '../../modules/notification.module/notification/notification.constant';
import { User } from '../../modules/user.module/user/user.model';

/*-─────────────────────────────────
|  💳 Stripe Webhook Notification Queue
|
|  PURPOSE:
|  - Send payment/subscription notifications asynchronously
|  - Decouple webhook processing from user notifications
|  - Ensure reliable delivery with retry logic
|
|  JOB TYPES:
|  - paymentSuccess: Invoice payment succeeded
|  - paymentFailed: Invoice payment failed
|  - subscriptionCreated: New subscription created
|  - subscriptionCancelled: Subscription cancelled
|  - subscriptionUpdated: Subscription plan/period updated
|  - trialWillEnd: Trial ending in 3 days
|
|  @version 2.0.0
|  @author Senior Backend Engineer
└──────────────────────────────────*/

export const webhookNotificationQueue = new Queue(
  'stripe-webhook-notifications',
  {
    connection: redisPubClient.options,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  },
);

/*-─────────────────────────────────
|  Job Data Interface
└──────────────────────────────────*/
export interface IWebhookNotificationJobData {
  userId: string;
  jobType:
    | 'paymentSuccess'
    | 'paymentFailed'
    | 'subscriptionCreated'
    | 'subscriptionCancelled'
    | 'subscriptionUpdated'
    | 'trialWillEnd';
  metadata: Record<string, any>;
}

/*-─────────────────────────────────
|  Queue Helper Functions
|  Use these to add jobs to the queue
└──────────────────────────────────*/

export const queuePaymentSuccessNotification = async (data: {
  userId: string;
  amount: number;
  currency: string;
  billingReason: string;
  subscriptionId: string;
  billingCycle?: number;
}): Promise<void> => {
  await webhookNotificationQueue.add('paymentSuccess', {
    userId: data.userId,
    jobType: 'paymentSuccess',
    metadata: {
      amount: data.amount,
      currency: data.currency,
      billingReason: data.billingReason,
      subscriptionId: data.subscriptionId,
      billingCycle: data.billingCycle,
    },
  });
  logger.info(
    `[Webhook Queue] Queued payment success notification for user ${data.userId}`,
  );
};

export const queuePaymentFailedNotification = async (data: {
  userId: string;
  amount: number;
  currency: string;
  attemptCount: number;
  subscriptionId: string;
}): Promise<void> => {
  await webhookNotificationQueue.add('paymentFailed', {
    userId: data.userId,
    jobType: 'paymentFailed',
    metadata: {
      amount: data.amount,
      currency: data.currency,
      attemptCount: data.attemptCount,
      subscriptionId: data.subscriptionId,
    },
  });
  logger.info(
    `[Webhook Queue] Queued payment failed notification for user ${data.userId}`,
  );
};

export const queueSubscriptionCreatedNotification = async (data: {
  userId: string;
  subscriptionId: string;
  subscriptionType: string;
  trialEnd?: Date;
}): Promise<void> => {
  await webhookNotificationQueue.add('subscriptionCreated', {
    userId: data.userId,
    jobType: 'subscriptionCreated',
    metadata: {
      subscriptionId: data.subscriptionId,
      subscriptionType: data.subscriptionType,
      trialEnd: data.trialEnd,
    },
  });
  logger.info(
    `[Webhook Queue] Queued subscription created notification for user ${data.userId}`,
  );
};

export const queueSubscriptionCancelledNotification = async (data: {
  userId: string;
  subscriptionId: string;
  cancelledAt: Date;
  endsAt?: Date;
  cancelAtPeriodEnd: boolean;
}): Promise<void> => {
  await webhookNotificationQueue.add('subscriptionCancelled', {
    userId: data.userId,
    jobType: 'subscriptionCancelled',
    metadata: {
      subscriptionId: data.subscriptionId,
      cancelledAt: data.cancelledAt,
      endsAt: data.endsAt,
      cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    },
  });
  logger.info(
    `[Webhook Queue] Queued subscription cancelled notification for user ${data.userId}`,
  );
};

export const queueSubscriptionUpdatedNotification = async (data: {
  userId: string;
  subscriptionId: string;
  updateType: string;
  oldPlan?: string;
  newPlan?: string;
  prorationAmount?: number;
}): Promise<void> => {
  await webhookNotificationQueue.add('subscriptionUpdated', {
    userId: data.userId,
    jobType: 'subscriptionUpdated',
    metadata: {
      subscriptionId: data.subscriptionId,
      updateType: data.updateType,
      oldPlan: data.oldPlan,
      newPlan: data.newPlan,
      prorationAmount: data.prorationAmount,
    },
  });
  logger.info(
    `[Webhook Queue] Queued subscription updated notification for user ${data.userId}`,
  );
};

export const queueTrialWillEndNotification = async (data: {
  userId: string;
  subscriptionId: string;
  trialEndDate: Date;
  daysRemaining: number;
}): Promise<void> => {
  await webhookNotificationQueue.add('trialWillEnd', {
    userId: data.userId,
    jobType: 'trialWillEnd',
    metadata: {
      subscriptionId: data.subscriptionId,
      trialEndDate: data.trialEndDate,
      daysRemaining: data.daysRemaining,
    },
  });
  logger.info(
    `[Webhook Queue] Queued trial will end notification for user ${data.userId}`,
  );
};

/*-─────────────────────────────────
|  Worker Implementation
└──────────────────────────────────*/

export const startWebhookNotificationWorker = (): void => {
  const worker = new Worker<IWebhookNotificationJobData>(
    'stripe-webhook-notifications',
    async (job: Job<IWebhookNotificationJobData>) => {
      const { userId, jobType, metadata } = job.data;

      logger.info(
        `[Webhook Notification Worker] Processing job: ${job.id}, type: ${jobType}, user: ${userId}`,
      );

      try {
        // ✅ Fetch user details
        const user = await User.findById(userId).lean();
        if (!user) {
          logger.warn(
            `[Webhook Notification Worker] User ${userId} not found — skipping notification`,
          );
          return { success: false, reason: 'User not found' };
        }

        // ✅ Build notification payload based on job type
        const notificationPayload = buildNotificationPayload(
          jobType,
          user,
          metadata,
        );

        if (!notificationPayload) {
          logger.warn(
            `[Webhook Notification Worker] Unknown job type: ${jobType}`,
          );
          return { success: false, reason: 'Unknown job type' };
        }

        // ✅ Create notification in DB
        const notification = await Notification.create(notificationPayload);

        // ✅ Queue for async delivery via V2 notification worker
        await notificationQueueV2.add('deliverNotification', {
          notificationId: notification._id.toString(),
        });

        logger.info(
          `[Webhook Notification Worker] Notification created: ${notification._id}`,
          {
            userId,
            jobType,
            notificationId: notification._id,
          },
        );

        return {
          success: true,
          notificationId: notification._id,
          jobType,
          userId,
        };
      } catch (error) {
        errorLogger.error(
          `[Webhook Notification Worker] Job ${job.id} failed:`,
          error,
        );
        throw error; // Triggers retry with backoff
      }
    },
    {
      connection: redisPubClient.options,
      concurrency: 10,
    },
  );

  // ✅ Event listeners
  worker.on('completed', (job, result) =>
    logger.info(
      `✅ [Webhook Notification Worker] Job ${job.id} completed`,
      result,
    ),
  );

  worker.on('failed', (job, error) =>
    errorLogger.error(
      `❌ [Webhook Notification Worker] Job ${job?.id} failed`,
      {
        error: error?.message,
        jobId: job?.id,
        jobType: job?.data?.jobType,
        attemptsMade: job?.attemptsMade,
      },
    ),
  );

  logger.info(
    '[Webhook Notification Worker] Started stripe-webhook-notifications worker',
  );
};

/*-─────────────────────────────────
|  Helper: Build Notification Payload
└──────────────────────────────────*/

function buildNotificationPayload(
  jobType: string,
  user: any,
  metadata: Record<string, any>,
): any {
  const basePayload = {
    receiverId: user._id,
    senderId: null, // System notification
    channels: [NotificationChannel.IN_APP],
    status: NotificationStatus.PENDING,
    priority: NotificationPriority.NORMAL,
    isDeleted: false,
  };

  switch (jobType) {
    case 'paymentSuccess':
      return {
        ...basePayload,
        title: 'Payment Successful',
        subTitle: `Your payment of ${metadata.currency.toUpperCase()} ${(metadata.amount / 100).toFixed(2)} was processed successfully.`,
        type: NotificationType.PAYMENT,
        priority:
          metadata.billingReason === 'subscription_create'
            ? NotificationPriority.HIGH
            : NotificationPriority.NORMAL,
        linkFor: 'subscription',
        linkId: metadata.subscriptionId,
        referenceFor: 'UserSubscription',
        referenceId: metadata.subscriptionId,
        data: {
          amount: metadata.amount,
          currency: metadata.currency,
          billingReason: metadata.billingReason,
          billingCycle: metadata.billingCycle,
        },
      };

    case 'paymentFailed':
      return {
        ...basePayload,
        title: 'Payment Failed',
        subTitle: `Your payment of ${metadata.currency.toUpperCase()} ${(metadata.amount / 100).toFixed(2)} failed. Attempt ${metadata.attemptCount}. Please update your payment method.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.URGENT,
        linkFor: 'subscription',
        linkId: metadata.subscriptionId,
        referenceFor: 'UserSubscription',
        referenceId: metadata.subscriptionId,
        data: {
          amount: metadata.amount,
          currency: metadata.currency,
          attemptCount: metadata.attemptCount,
          actionRequired: 'update_payment_method',
        },
      };

    case 'subscriptionCreated':
      return {
        ...basePayload,
        title: 'Subscription Activated',
        subTitle: `Your ${metadata.subscriptionType} subscription is now active.${metadata.trialEnd ? ` Trial ends on ${new Date(metadata.trialEnd).toLocaleDateString()}.` : ''}`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        linkFor: 'subscription',
        linkId: metadata.subscriptionId,
        referenceFor: 'UserSubscription',
        referenceId: metadata.subscriptionId,
        data: {
          subscriptionType: metadata.subscriptionType,
          trialEnd: metadata.trialEnd,
        },
      };

    case 'subscriptionCancelled':
      return {
        ...basePayload,
        title: metadata.cancelAtPeriodEnd
          ? 'Subscription Cancellation Scheduled'
          : 'Subscription Cancelled',
        subTitle: metadata.cancelAtPeriodEnd
          ? `Your subscription will end on ${new Date(metadata.endsAt).toLocaleDateString()}. You'll retain access until then.`
          : 'Your subscription has been cancelled immediately.',
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        linkFor: 'subscription',
        linkId: metadata.subscriptionId,
        referenceFor: 'UserSubscription',
        referenceId: metadata.subscriptionId,
        data: {
          cancelledAt: metadata.cancelledAt,
          endsAt: metadata.endsAt,
          cancelAtPeriodEnd: metadata.cancelAtPeriodEnd,
        },
      };

    case 'subscriptionUpdated':
      return {
        ...basePayload,
        title: 'Subscription Updated',
        subTitle: `Your subscription has been updated.${metadata.newPlan ? ` Plan changed to ${metadata.newPlan}.` : ''}${metadata.prorationAmount ? ` Proration charge: ${metadata.prorationAmount}.` : ''}`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.NORMAL,
        linkFor: 'subscription',
        linkId: metadata.subscriptionId,
        referenceFor: 'UserSubscription',
        referenceId: metadata.subscriptionId,
        data: {
          updateType: metadata.updateType,
          oldPlan: metadata.oldPlan,
          newPlan: metadata.newPlan,
          prorationAmount: metadata.prorationAmount,
        },
      };

    case 'trialWillEnd':
      return {
        ...basePayload,
        title: 'Trial Ending Soon',
        subTitle: `Your free trial ends in ${metadata.daysRemaining} day${metadata.daysRemaining > 1 ? 's' : ''} on ${new Date(metadata.trialEndDate).toLocaleDateString()}. Upgrade to continue.`,
        type: NotificationType.PAYMENT,
        priority: NotificationPriority.HIGH,
        linkFor: 'subscription',
        linkId: metadata.subscriptionId,
        referenceFor: 'UserSubscription',
        referenceId: metadata.subscriptionId,
        data: {
          trialEndDate: metadata.trialEndDate,
          daysRemaining: metadata.daysRemaining,
          actionRequired: 'upgrade_subscription',
        },
      };

    default:
      return null;
  }
}
