//@ts-ignore
import stripe from '../../../config/paymentGateways/stripe.config';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { redisClient } from '../../../helpers/redis/redis';
import { queueSubscriptionCancelledNotification } from '../../../helpers/bullmq/webhookNotificationQueue';

/*-─────────────────────────────────
|  Role: User/Admin | Module: Stripe Webhook
|  Action: Cancel user subscription (API-triggered, v2)
|  Auth: Required (via controller)
|  Purpose: Cancel immediately or at period end
└──────────────────────────────────*/

// ✅ Cancellation result interface
export interface ICancelSubscriptionResult {
  success: boolean;
  message: string;
  subscriptionId: string;
  cancelledAt: Date;
  endsAt: Date | null;
  refundAmount?: number;
}

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

// ✅ Cancel subscription immediately via Stripe
const cancelImmediately = async (
  stripeSubscriptionId: string,
): Promise<void> => {
  try {
    await stripe.subscriptions.cancel(stripeSubscriptionId);
    logger.info(
      `[Stripe] Subscription ${stripeSubscriptionId} cancelled immediately`,
    );
  } catch (error) {
    throw new Error(
      `Failed to cancel Stripe subscription ${stripeSubscriptionId}: ${error.message}`,
    );
  }
};

// ✅ Cancel subscription at period end via Stripe
const cancelAtPeriodEnd = async (
  stripeSubscriptionId: string,
): Promise<void> => {
  try {
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    logger.info(
      `[Stripe] Subscription ${stripeSubscriptionId} marked for cancellation at period end`,
    );
  } catch (error) {
    throw new Error(
      `Failed to mark Stripe subscription ${stripeSubscriptionId} for cancellation: ${error.message}`,
    );
  }
};

// ✅ Main cancellation service function
export const cancelUserSubscriptionV2 = async (
  userSubscriptionId: string,
  cancelImmediatelyFlag: boolean = false,
): Promise<ICancelSubscriptionResult> => {
  const correlationId = `cancel_sub_${userSubscriptionId}`;
  logger.info(
    `[Subscription] Cancelling subscription: ${userSubscriptionId}`,
    {
      correlationId,
      cancelImmediately: cancelImmediatelyFlag,
    },
  );

  try {
    // ✅ Find subscription
    const userSubscription = await UserSubscription.findById(
      userSubscriptionId,
    ).lean();

    if (!userSubscription) {
      throw new Error(
        `UserSubscription ${userSubscriptionId} not found`,
      );
    }

    if (!userSubscription.stripe_subscription_id) {
      throw new Error(
        `UserSubscription ${userSubscriptionId} has no Stripe subscription ID`,
      );
    }

    // ✅ Check if already cancelled
    if (
      userSubscription.status === UserSubscriptionStatusType.cancelled ||
      userSubscription.status === UserSubscriptionStatusType.incomplete_expired
    ) {
      throw new Error(
        `Subscription ${userSubscriptionId} is already cancelled`,
      );
    }

    const { _id: subscriptionId, userId, stripe_subscription_id } =
      userSubscription;

    // ✅ Cancel via Stripe
    if (cancelImmediatelyFlag) {
      // Cancel immediately — user loses access right away
      await cancelImmediately(stripe_subscription_id);

      await UserSubscription.findByIdAndUpdate(subscriptionId, {
        $set: {
          status: UserSubscriptionStatusType.cancelled,
          cancelledAt: new Date(),
          cancelledAtPeriodEnd: false,
          isAutoRenewed: false,
          stripe_subscription_id: null,
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
        cancelledAt: new Date(),
        endsAt: new Date(),
        cancelAtPeriodEnd: false,
      });

      logger.info(
        `[Subscription] Subscription ${subscriptionId} cancelled immediately for user ${userId}`,
        { correlationId },
      );

      return {
        success: true,
        message: 'Subscription cancelled immediately',
        subscriptionId: subscriptionId.toString(),
        cancelledAt: new Date(),
        endsAt: new Date(),
      };
    } else {
      // Cancel at period end — user keeps access until billing cycle ends
      await cancelAtPeriodEnd(stripe_subscription_id);

      // Get period end date from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        stripe_subscription_id,
      );

      const endsAt = stripeSubscription.current_period_end
        ? new Date(stripeSubscription.current_period_end * 1000)
        : null;

      await UserSubscription.findByIdAndUpdate(subscriptionId, {
        $set: {
          status: UserSubscriptionStatusType.cancelling,
          cancelledAt: new Date(),
          cancelledAtPeriodEnd: true,
          isAutoRenewed: false,
          renewalDate: endsAt,
          expirationDate: endsAt,
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
        cancelledAt: new Date(),
        endsAt,
        cancelAtPeriodEnd: true,
      });

      logger.info(
        `[Subscription] Subscription ${subscriptionId} marked for cancellation at period end for user ${userId}`,
        { correlationId, endsAt },
      );

      return {
        success: true,
        message:
          'Subscription will cancel at the end of current billing period',
        subscriptionId: subscriptionId.toString(),
        cancelledAt: new Date(),
        endsAt,
      };
    }
  } catch (error) {
    errorLogger.error(
      `[Subscription] Error cancelling subscription: ${userSubscriptionId}`,
      error,
    );
    throw error;
  }
};
