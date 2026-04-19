//@ts-ignore
import Stripe from 'stripe';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { FailedWebhook } from './failedWebhook.model';
import { redisClient } from '../../../helpers/redis/redis';

/*-─────────────────────────────────
|  Role: System | Module: Stripe Webhook
|  Action: Handle customer.subscription.created event (v2)
|  Auth: Webhook Signature Verified
|  Purpose: Initialize subscription dates on creation
└──────────────────────────────────*/

// ✅ Safe date helper — returns null if timestamp is missing/invalid
const safeDate = (timestamp?: number | null): Date | null =>
  timestamp ? new Date(timestamp * 1000) : null;

// ✅ Calculate billing interval from Stripe price
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

// ✅ Calculate renewal date from period end
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

// ✅ Main handler for subscription creation dates
export const handleSubscriptionDatesV2 = async (
  subscription: Stripe.Subscription,
): Promise<boolean> => {
  const correlationId = `stripe_sub_created_${subscription.id}`;
  logger.info(
    `[Stripe] Processing customer.subscription.created: ${subscription.id}`,
    {
      correlationId,
      status: subscription.status,
      trialEnd: subscription.trial_end,
    },
  );

  try {
    // ✅ Extract and validate metadata
    const metadata = subscription.metadata || {};
    const { userId, referenceId, subscriptionPlanId } = metadata;

    if (!userId || !referenceId) {
      logger.error(
        `[Stripe] Missing userId or referenceId in subscription ${subscription.id} metadata`,
        { correlationId },
      );
      return false;
    }

    // ✅ Check if subscription already exists (idempotency)
    const existingSubscription = await UserSubscription.findById(
      referenceId,
    ).lean();

    if (!existingSubscription) {
      logger.warn(
        `[Stripe] UserSubscription ${referenceId} not found — will be created on payment success`,
        { correlationId },
      );
      // ✅ This is expected — UserSubscription is created after payment succeeds
      // We just log and return. The actual dates will be set in handleSuccessfulPaymentV2
      return false;
    }

    // ✅ Calculate dates from Stripe subscription data
    const subscriptionStartDate = safeDate(subscription.start_date);
    const currentPeriodStart = safeDate(subscription.current_period_start);
    const currentPeriodEnd = safeDate(subscription.current_period_end);
    const trialEnd = safeDate(subscription.trial_end);

    const isInTrial =
      !!subscription.trial_end && subscription.trial_end > Math.floor(Date.now() / 1000);

    const renewalDate = subscription.current_period_end
      ? calculateRenewalDate(
          subscription.current_period_end,
          subscription.items.data[0]?.price.recurring?.interval,
        )
      : null;

    // ✅ Determine status based on trial state
    let status = UserSubscriptionStatusType.processing;
    if (isInTrial) {
      status = UserSubscriptionStatusType.trialing;
    } else if (subscription.status === 'active') {
      status = UserSubscriptionStatusType.active;
    }

    // ✅ Update UserSubscription with accurate dates
    const updateData: Record<string, any> = {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      subscriptionStartDate: subscriptionStartDate || existingSubscription.subscriptionStartDate,
      currentPeriodStartDate: currentPeriodStart,
      expirationDate: trialEnd || currentPeriodEnd,
      renewalDate: renewalDate || existingSubscription.renewalDate,
      billingCycle: existingSubscription.billingCycle || 0,
      isAutoRenewed: !subscription.cancel_at_period_end,
      status,
      subscriptionPlanId: subscriptionPlanId || existingSubscription.subscriptionPlanId,
    };

    // ✅ If trial is active, set trial-specific fields
    if (isInTrial && trialEnd) {
      updateData.expirationDate = trialEnd;
      updateData.renewalDate = trialEnd;
    }

    await UserSubscription.findByIdAndUpdate(referenceId, {
      $set: updateData,
    });

    // ✅ Invalidate cache
    await invalidateSubscriptionCache(userId, referenceId);

    logger.info(
      `[Stripe] Subscription dates updated for ${referenceId}`,
      {
        correlationId,
        subscriptionStartDate,
        currentPeriodStart,
        currentPeriodEnd,
        trialEnd,
        isInTrial,
        status,
      },
    );

    return true;
  } catch (error) {
    errorLogger.error(
      `[Stripe] Error handling subscription dates: ${subscription.id}`,
      error,
    );

    // ✅ Log for retry/monitoring
    await logFailedWebhookEntry(
      subscription.id,
      subscription.id,
      subscription.metadata || {},
      error as Error,
      'handleSubscriptionDates',
    );

    // ✅ Re-throw to trigger Stripe retry
    throw error;
  }
};
