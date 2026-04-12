//@ts-ignore
import Stripe from 'stripe';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { FailedWebhook } from './failedWebhook.model';
import { redisClient } from '../../../helpers/redis/redis';
import { queueSubscriptionCancelledNotification } from '../../../helpers/bullmq/webhookNotificationQueue';

/*-─────────────────────────────────
|  Role: System | Module: Stripe Webhook
|  Action: Handle customer.subscription.deleted event (v2)
|  Auth: Webhook Signature Verified
|  Purpose: Mark subscription as cancelled/expired
└──────────────────────────────────*/

// ✅ Map Stripe cancellation reasons to internal status
const mapCancellationStatus = (
  cancellationDetails: {
    reason?: string;
    comment?: string;
  } | null,
  canceledAt: number | null,
): UserSubscriptionStatusType => {
  // If canceled by Stripe (payment failure, fraud, etc.)
  if (cancellationDetails?.reason === 'payment_failed') {
    return UserSubscriptionStatusType.payment_failed;
  }

  // If canceled at period end (user requested, still active until period ends)
  if (canceledAt) {
    return UserSubscriptionStatusType.cancelled;
  }

  // Default cancelled status
  return UserSubscriptionStatusType.cancelled;
};

// ✅ Invalidate Redis cache for user & subscription
const invalidateSubscriptionCache = async (
  userId: string,
  subscriptionId: string,
): Promise<void> => {
  try {
    const keysToDelete = [
      `user:${userId}:subscription`,
      `user:${userId}:profile`,
      `subscription:${subscriptionId}:detail`,
    ];
    await redisClient.del(keysToDelete);
    logger.info(
      `[Cache] Invalidated subscription cache for user ${userId}`,
    );
  } catch (error) {
    errorLogger.error('[Cache] Failed to invalidate subscription cache', error);
  }
};

// ✅ Log failed webhook for retry/monitoring
const logFailedWebhookEntry = async (
  eventId: string,
  subscriptionId: string,
  metadata: Record<string, any>,
  error: Error,
  stage: string,
): Promise<void> => {
  await FailedWebhook.create({
    eventId,
    subscriptionId,
    metadata,
    error: error.message,
    stage,
    attemptCount: 1,
    lastAttempt: new Date(),
    createdAt: new Date(),
  });
  errorLogger.error(`[Stripe Webhook] Failed at stage: ${stage}`, {
    eventId,
    subscriptionId,
    error: error.message,
  });
};

// ✅ Main handler for subscription deletion
export const handleSubscriptionCancellationV2 = async (
  subscription: Stripe.Subscription,
): Promise<boolean> => {
  const correlationId = `stripe_sub_deleted_${subscription.id}`;
  logger.info(
    `[Stripe] Processing customer.subscription.deleted: ${subscription.id}`,
    {
      correlationId,
      status: subscription.status,
      canceledAt: subscription.canceled_at,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  );

  try {
    // ✅ Validate subscription object
    if (!subscription.id) {
      throw new Error('Missing subscription ID in deletion event');
    }

    // ✅ Find subscription by Stripe ID
    const userSubscription = await UserSubscription.findOne({
      stripe_subscription_id: subscription.id,
    }).lean();

    if (!userSubscription) {
      logger.warn(
        `[Stripe] UserSubscription not found for stripe_subscription_id: ${subscription.id}`,
        { correlationId },
      );
      // ✅ Try fallback: find by userId from metadata
      const metadata = subscription.metadata || {};
      if (!metadata.referenceId) {
        return false;
      }

      const fallbackSubscription = await UserSubscription.findById(
        metadata.referenceId,
      ).lean();

      if (!fallbackSubscription) {
        logger.error(
          `[Stripe] Fallback: UserSubscription ${metadata.referenceId} not found`,
          { correlationId },
        );
        return false;
      }

      // ✅ Use fallback subscription
      return processCancellation(
        fallbackSubscription,
        subscription,
        correlationId,
      );
    }

    // ✅ Process cancellation
    return processCancellation(
      userSubscription,
      subscription,
      correlationId,
    );
  } catch (error) {
    errorLogger.error(
      `[Stripe] Error handling subscription cancellation: ${subscription.id}`,
      error,
    );

    // ✅ Log for retry/monitoring
    await logFailedWebhookEntry(
      subscription.id,
      subscription.id,
      subscription.metadata || {},
      error as Error,
      'handleSubscriptionCancellation',
    );

    // ✅ Re-throw to trigger Stripe retry
    throw error;
  }
};

// ✅ Process the cancellation update
const processCancellation = async (
  userSubscription: any,
  subscription: Stripe.Subscription,
  correlationId: string,
): Promise<boolean> => {
  const { _id: subscriptionId, userId } = userSubscription;

  // ✅ Determine new status
  const newStatus = mapCancellationStatus(
    subscription.cancellation_details,
    subscription.canceled_at,
  );

  // ✅ Calculate cancellation timestamp
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : new Date();

  // ✅ Update subscription
  await UserSubscription.findByIdAndUpdate(subscriptionId, {
    $set: {
      status: newStatus,
      cancelledAt: canceledAt,
      cancelledAtPeriodEnd: subscription.cancel_at_period_end || false,
      isAutoRenewed: false,
      stripe_subscription_id: null, // Clear Stripe subscription ID
    },
  });

  // ✅ Invalidate cache
  await invalidateSubscriptionCache(
    userId.toString(),
    subscriptionId.toString(),
  );

  // ✅ Queue notification via BullMQ
  await queueSubscriptionCancelledNotification({
    userId: userId.toString(),
    subscriptionId: subscriptionId.toString(),
    cancelledAt: canceledAt,
    endsAt: subscription.cancel_at_period_end
      ? new Date(subscription.current_period_end * 1000)
      : undefined,
    cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
  });

  logger.info(
    `[Stripe] Subscription ${subscriptionId} cancelled for user ${userId}`,
    {
      correlationId,
      status: newStatus,
      canceledAt,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  );

  // ✅ TODO: Queue cancellation confirmation email via BullMQ
  // await notificationQueue.add('sendCancellationEmail', {
  //   userId: userId.toString(),
  //   subscriptionId: subscriptionId.toString(),
  //   canceledAt,
  //   cancelAtPeriodEnd: subscription.cancel_at_period_end,
  // });

  return true;
};
