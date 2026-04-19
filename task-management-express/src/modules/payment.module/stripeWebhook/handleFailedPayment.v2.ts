//@ts-ignore
import Stripe from 'stripe';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';
import { User } from '../../user.module/user/user.model';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { FailedWebhook } from './failedWebhook.model';
import { redisClient } from '../../../helpers/redis/redis';
import { queuePaymentFailedNotification } from '../../../helpers/bullmq/webhookNotificationQueue';

/*-─────────────────────────────────
|  Role: System | Module: Stripe Webhook
|  Action: Handle payment failures (invoice.payment_failed, checkout.session.expired)
|  Auth: Webhook Signature Verified
|  Idempotency: Enforced via event ID tracking
└──────────────────────────────────*/

// ✅ Map Stripe payment status to internal status
const mapPaymentFailureStatus = (
  attemptCount: number,
  nextPaymentAttempt: number | null,
): UserSubscriptionStatusType => {
  // If no more payment attempts will be made
  if (attemptCount >= 4) {
    return UserSubscriptionStatusType.unpaid;
  }
  // Payment is past due but will retry
  return UserSubscriptionStatusType.past_due;
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

// ✅ Handle invoice.payment_failed — subscription payment failure
export const handleFailedPaymentV2 = async (
  invoice: Stripe.Invoice,
): Promise<boolean> => {
  const correlationId = `stripe_inv_failed_${invoice.id}`;
  logger.info(`[Stripe] Processing invoice.payment_failed: ${invoice.id}`, {
    correlationId,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt,
  });

  try {
    // ✅ Validate required fields
    if (!invoice.subscription) {
      logger.warn(
        `[Stripe] Invoice ${invoice.id} has no subscription — skipping`,
        { correlationId },
      );
      return false;
    }

    if (!invoice.customer) {
      logger.warn(
        `[Stripe] Invoice ${invoice.id} has no customer — skipping`,
        { correlationId },
      );
      return false;
    }

    // ✅ Find user by Stripe customer ID
    const user = await User.findOne({
      stripe_customer_id: invoice.customer,
    }).lean();

    if (!user) {
      logger.error(
        `[Stripe] User not found for customer: ${invoice.customer}`,
        { correlationId },
      );
      return false;
    }

    // ✅ Find user's active subscription
    const userSubscription = await UserSubscription.findOne({
      userId: user._id,
      stripe_subscription_id: invoice.subscription,
      status: {
        $in: [
          UserSubscriptionStatusType.active,
          UserSubscriptionStatusType.past_due,
          UserSubscriptionStatusType.trialing,
        ],
      },
    }).lean();

    if (!userSubscription) {
      logger.warn(
        `[Stripe] No active subscription found for user ${user._id}`,
        { correlationId },
      );
      return false;
    }

    // ✅ Determine new status based on attempt count
    const newStatus = mapPaymentFailureStatus(
      invoice.attempt_count || 1,
      invoice.next_payment_attempt,
    );

    // ✅ Update subscription status
    await UserSubscription.findByIdAndUpdate(userSubscription._id, {
      $set: {
        status: newStatus,
        stripe_transaction_id: invoice.payment_intent,
      },
    });

    // ✅ Invalidate cache
    await invalidateSubscriptionCache(
      user._id.toString(),
      userSubscription._id.toString(),
    );

    // ✅ Queue notification via BullMQ
    await queuePaymentFailedNotification({
      userId: user._id.toString(),
      amount: invoice.amount_paid || 0,
      currency: invoice.currency || 'usd',
      attemptCount: invoice.attempt_count || 1,
      subscriptionId: invoice.subscription as string,
    });

    logger.info(
      `[Stripe] Subscription ${userSubscription._id} status updated to ${newStatus} for user ${user._id}`,
      {
        correlationId,
        attemptCount: invoice.attempt_count,
        nextPaymentAttempt: invoice.next_payment_attempt,
      },
    );

    // ✅ TODO: Queue notification email via BullMQ
    // await notificationQueue.add('sendPaymentFailureEmail', {
    //   userId: user._id.toString(),
    //   email: user.email,
    //   subscriptionId: userSubscription._id.toString(),
    //   attemptCount: invoice.attempt_count,
    // });

    return true;
  } catch (error) {
    errorLogger.error(
      `[Stripe] Error handling failed payment: ${invoice.id}`,
      error,
    );

    // ✅ Log for retry/monitoring
    await logFailedWebhookEntry(
      invoice.id,
      invoice.subscription as string,
      invoice.metadata || {},
      error as Error,
      'handleFailedPayment',
    );

    // ✅ Re-throw to trigger Stripe retry
    throw error;
  }
};

// ✅ Handle checkout.session.expired — user abandoned checkout
export const handleCheckoutSessionExpiredV2 = async (
  session: Stripe.Checkout.Session,
): Promise<boolean> => {
  const correlationId = `stripe_session_expired_${session.id}`;
  logger.info(
    `[Stripe] Processing checkout.session.expired: ${session.id}`,
    { correlationId },
  );

  try {
    // ✅ Extract metadata if present
    const metadata = session.metadata || {};
    const { userId, referenceId } = metadata;

    if (!userId || !referenceId) {
      logger.info(
        `[Stripe] Checkout session ${session.id} has no subscription metadata — skipping`,
        { correlationId },
      );
      return false;
    }

    // ✅ Log abandoned checkout for analytics
    logger.info(
      `[Stripe] Checkout abandoned by user ${userId}, subscription ${referenceId}`,
      {
        correlationId,
        sessionId: session.id,
        userId,
        referenceId,
      },
    );

    // ✅ Optional: Update subscription status to incomplete_expired
    const userSubscription = await UserSubscription.findById(referenceId).lean();

    if (
      userSubscription &&
      userSubscription.status === UserSubscriptionStatusType.incomplete
    ) {
      await UserSubscription.findByIdAndUpdate(referenceId, {
        $set: {
          status: UserSubscriptionStatusType.incomplete_expired,
        },
      });

      // ✅ Invalidate cache
      await invalidateSubscriptionCache(userId, referenceId);

      logger.info(
        `[Stripe] Subscription ${referenceId} marked as incomplete_expired`,
        { correlationId },
      );
    }

    return true;
  } catch (error) {
    errorLogger.error(
      `[Stripe] Error handling expired checkout session: ${session.id}`,
      error,
    );

    // ✅ Log for monitoring
    await logFailedWebhookEntry(
      session.id,
      session.subscription as string,
      session.metadata || {},
      error as Error,
      'handleCheckoutSessionExpired',
    );

    // ✅ Do NOT re-throw — session expiry is not retryable
    return false;
  }
};
