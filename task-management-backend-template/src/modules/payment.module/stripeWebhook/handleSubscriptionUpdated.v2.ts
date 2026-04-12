//@ts-ignore
import Stripe from 'stripe';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { FailedWebhook } from './failedWebhook.model';
import { redisClient } from '../../../helpers/redis/redis';
import { queueSubscriptionUpdatedNotification } from '../../../helpers/bullmq/webhookNotificationQueue';

/*-─────────────────────────────────
|  Role: System | Module: Stripe Webhook
|  Action: Handle customer.subscription.updated event (v2)
|  Auth: Webhook Signature Verified
|  Purpose: Handle plan changes, proration, trial conversion, etc.
└──────────────────────────────────*/

// ✅ Safe date helper
const safeDate = (timestamp?: number | null): Date | null =>
  timestamp ? new Date(timestamp * 1000) : null;

// ✅ Calculate billing interval
const getBillingInterval = (
  interval?: string,
): 'daily' | 'weekly' | 'monthly' | 'yearly' => {
  const validIntervals = ['day', 'week', 'month', 'year'] as const;
  return (validIntervals.includes(interval as any)
    ? interval === 'day'
      ? 'daily'
      : interval === 'week'
        ? 'weekly'
        : interval === 'month'
          ? 'monthly'
          : 'yearly'
    : 'monthly') as 'daily' | 'weekly' | 'monthly' | 'yearly';
};

// ✅ Calculate renewal date
const calculateRenewalDate = (
  periodEndTimestamp: number,
  interval: string,
): Date => {
  const periodEnd = safeDate(periodEndTimestamp)!;
  const renewalPeriods = {
    daily: 1,
    weekly: 7,
    monthly: 30,
    yearly: 365,
  };
  const renewalDate = new Date(periodEnd);
  renewalDate.setDate(
    renewalDate.getDate() + renewalPeriods[getBillingInterval(interval)],
  );
  return renewalDate;
};

// ✅ Invalidate Redis cache
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

// ✅ Log failed webhook
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

// ✅ Determine update type from Stripe subscription changes
const determineUpdateType = (
  subscription: Stripe.Subscription,
  previousAttributes?: Record<string, any>,
): string => {
  if (previousAttributes) {
    if (previousAttributes.plan) {
      return 'plan_change';
    }
    if (previousAttributes.default_payment_method) {
      return 'payment_method_updated';
    }
    if (previousAttributes.cancel_at_period_end) {
      return subscription.cancel_at_period_end
        ? 'scheduled_cancellation'
        : 'cancellation_reverted';
    }
    if (previousAttributes.trial_end) {
      return 'trial_modified';
    }
    if (previousAttributes.items) {
      return 'quantity_or_items_updated';
    }
  }

  // Default: general update
  return 'subscription_updated';
};

// ✅ Main handler for subscription updates
export const handleSubscriptionUpdatedV2 = async (
  subscription: Stripe.Subscription,
  previousAttributes?: Record<string, any>,
): Promise<boolean> => {
  const correlationId = `stripe_sub_updated_${subscription.id}`;
  logger.info(
    `[Stripe] Processing customer.subscription.updated: ${subscription.id}`,
    {
      correlationId,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  );

  try {
    // ✅ Extract and validate metadata
    const metadata = subscription.metadata || {};
    const { userId, referenceId, subscriptionPlanId } = metadata;

    if (!userId || !referenceId) {
      logger.warn(
        `[Stripe] Missing userId or referenceId in subscription ${subscription.id} metadata`,
        { correlationId },
      );
      return false;
    }

    // ✅ Find user subscription
    const userSubscription = await UserSubscription.findById(referenceId).lean();

    if (!userSubscription) {
      logger.warn(
        `[Stripe] UserSubscription ${referenceId} not found for update`,
        { correlationId },
      );
      return false;
    }

    // ✅ Determine update type
    const updateType = determineUpdateType(subscription, previousAttributes);

    logger.info(
      `[Stripe] Subscription update type: ${updateType}`,
      {
        correlationId,
        subscriptionId: referenceId,
        stripeSubscriptionId: subscription.id,
      },
    );

    // ✅ Build update payload
    const updateData: Record<string, any> = {};

    // Update Stripe IDs if changed
    if (subscription.id !== userSubscription.stripe_subscription_id) {
      updateData.stripe_subscription_id = subscription.id;
    }

    // Update customer ID
    if (subscription.customer) {
      updateData.stripe_customer_id = subscription.customer;
    }

    // Update dates from Stripe
    const currentPeriodStart = safeDate(subscription.current_period_start);
    const currentPeriodEnd = safeDate(subscription.current_period_end);

    if (currentPeriodStart) {
      updateData.currentPeriodStartDate = currentPeriodStart;
    }

    if (currentPeriodEnd) {
      updateData.expirationDate = currentPeriodEnd;
      updateData.renewalDate = calculateRenewalDate(
        subscription.current_period_end!,
        subscription.items.data[0]?.price.recurring?.interval,
      );
    }

    // Update auto-renewal status
    updateData.isAutoRenewed = !subscription.cancel_at_period_end;

    // Update cancellation tracking
    if (subscription.cancel_at_period_end) {
      updateData.cancelledAtPeriodEnd = true;
      updateData.cancelledAt = subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : new Date();
    }

    // Update status based on Stripe status
    const statusMap: Record<string, UserSubscriptionStatusType> = {
      active: UserSubscriptionStatusType.active,
      past_due: UserSubscriptionStatusType.past_due,
      trialing: UserSubscriptionStatusType.trialing,
      canceled: UserSubscriptionStatusType.cancelled,
      incomplete: UserSubscriptionStatusType.incomplete,
      incomplete_expired: UserSubscriptionStatusType.incomplete_expired,
      unpaid: UserSubscriptionStatusType.unpaid,
    };

    if (statusMap[subscription.status]) {
      updateData.status = statusMap[subscription.status];
    }

    // Update plan ID if provided in metadata
    if (subscriptionPlanId) {
      updateData.subscriptionPlanId = subscriptionPlanId;
    }

    // ✅ Apply update
    await UserSubscription.findByIdAndUpdate(referenceId, {
      $set: updateData,
    });

    // ✅ Invalidate cache
    await invalidateSubscriptionCache(userId, referenceId);

    // ✅ Queue notification via BullMQ
    await queueSubscriptionUpdatedNotification({
      userId,
      subscriptionId: referenceId,
      updateType,
      prorationAmount: subscription.pending_invoice_amount
        ? subscription.pending_invoice_amount
        : undefined,
    });

    logger.info(
      `[Stripe] Subscription ${referenceId} updated successfully for user ${userId}`,
      {
        correlationId,
        updateType,
        fieldsUpdated: Object.keys(updateData),
      },
    );

    return true;
  } catch (error) {
    errorLogger.error(
      `[Stripe] Error handling subscription update: ${subscription.id}`,
      error,
    );

    // ✅ Log for retry/monitoring
    await logFailedWebhookEntry(
      subscription.id,
      subscription.id,
      subscription.metadata || {},
      error as Error,
      'handleSubscriptionUpdated',
    );

    // ✅ Re-throw to trigger Stripe retry
    throw error;
  }
};
