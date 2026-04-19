//@ts-ignore
import mongoose from 'mongoose';
//@ts-ignore
import Stripe from 'stripe';
import stripe from '../../../config/paymentGateways/stripe.config';
import { logger } from '../../../shared/logger';
import { errorLogger } from '../../../shared/logger';
import { redisClient } from '../../../helpers/redis/redis';
import { User } from '../../user.module/user/user.model';
import { IUser } from '../../user.module/user/user.interface';
import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import {
  TPaymentGateway,
  TPaymentStatus,
} from '../paymentTransaction/paymentTransaction.constant';
import { PaymentTransaction } from '../paymentTransaction/paymentTransaction.model';
import { FailedWebhook } from './failedWebhook.model';
import {
  queuePaymentSuccessNotification,
  queueSubscriptionCreatedNotification,
  queueSubscriptionUpdatedNotification,
} from '../../../helpers/bullmq/webhookNotificationQueue';

/*-─────────────────────────────────
|  Role: System | Module: Stripe Webhook
|  Action: Handle invoice.payment_succeeded event (v2)
|  Auth: Webhook Signature Verified
|  Idempotency: Enforced via paymentIntent unique index
└──────────────────────────────────*/

// ✅ Export metadata interface for other modules
export interface IMetadataForFreeTrial {
  userId: string;
  subscriptionType: string;
  subscriptionPlanId?: string;
  referenceId: string;
  referenceFor: string;
  currency: string;
  amount: string;
}

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

// ✅ Calculate next renewal date from current period end
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

// ✅ Idempotency check — prevent duplicate payment processing
const checkIdempotency = async (
  paymentIntent: string,
): Promise<boolean> => {
  const existingPayment = await PaymentTransaction.findOne({
    paymentIntent,
  }).lean();
  return !!existingPayment;
};

// ✅ Log failed webhook for retry/monitoring
const logFailedWebhook = async (
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

// ✅ Retrieve subscription with error handling
const retrieveSubscription = async (
  subscriptionId: string,
): Promise<Stripe.Subscription> => {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    throw new Error(
      `Failed to retrieve Stripe subscription ${subscriptionId}: ${error.message}`,
    );
  }
};

// ✅ Find user - V3 ENHANCEMENT: Try multiple strategies
// Strategy 1: Find by stripe_customer_id (if already set)
// Strategy 2: Find from UserSubscription via metadata.referenceId
const findUser = async (
  customerId: string,
  metadata: IMetadataForFreeTrial,
): Promise<IUser | null> => {
  // Try finding by stripe_customer_id first
  let user = await User.findOne({ stripe_customer_id: customerId }).lean() as Promise<IUser | null>;
  
  if (user) {
    logger.info(`[Stripe] Found user by stripe_customer_id: ${customerId}`);
    return user;
  }

  // Fallback: Find user from UserSubscription using referenceId
  if (metadata.referenceId) {
    const subscription = await UserSubscription.findById(metadata.referenceId).lean();
    if (subscription && subscription.userId) {
      user = await User.findById(subscription.userId).lean() as Promise<IUser | null>;
      if (user) {
        logger.info(`[Stripe] Found user via UserSubscription.referenceId: ${metadata.referenceId}`);
        return user;
      }
    }
  }

  // Fallback: Try from metadata.userId directly
  if (metadata.userId) {
    user = await User.findById(metadata.userId).lean() as Promise<IUser | null>;
    if (user) {
      logger.info(`[Stripe] Found user by metadata.userId: ${metadata.userId}`);
      return user;
    }
  }

  return null;
};

// ✅ Create payment transaction record
const createPaymentTransaction = async (data: {
  userId: mongoose.Types.ObjectId;
  referenceFor: string;
  referenceId: string;
  paymentIntent: string;
  amount: number;
  currency: string;
  subscriptionId: string;
  invoiceInfo: Record<string, any>;
}): Promise<any> => {
  return PaymentTransaction.create({
    userId: data.userId,
    referenceFor: data.referenceFor,
    referenceId: data.referenceId,
    paymentGateway: TPaymentGateway.stripe,
    transactionId: data.subscriptionId,
    paymentIntent: data.paymentIntent,
    amount: data.amount,
    currency: data.currency,
    paymentStatus: TPaymentStatus.completed,
    gatewayResponse: data.invoiceInfo,
  });
};

// ✅ Update user subscription with payment details
const updateUserSubscription = async (
  referenceId: string,
  updateData: Record<string, any>,
): Promise<void> => {
  await UserSubscription.findByIdAndUpdate(referenceId, {
    $set: updateData,
  });
};

// ✅ Mark user as having used free trial
const markFreeTrialUsed = async (
  userId: string,
  subscriptionType: string,
): Promise<void> => {
  await User.findByIdAndUpdate(userId, {
    $set: {
      hasUsedFreeTrial: true,
      subscriptionType,
    },
  });
};

// ✅ Main handler for subscription_create (first payment after trial)
const handleSubscriptionCreate = async (
  invoice: any,
  subscription: Stripe.Subscription,
  metadata: IMetadataForFreeTrial,
  user: IUser,
): Promise<void> => {
  const { referenceId, userId, subscriptionType, subscriptionPlanId } =
    metadata;

  // ✅ Idempotency check
  const isDuplicate = await checkIdempotency(invoice.payment_intent);
  if (isDuplicate) {
    logger.warn(
      `[Stripe] Duplicate payment detected for intent: ${invoice.payment_intent}`,
    );
    return;
  }

  // ✅ Calculate dates from Stripe
  const subscriptionStartDate = safeDate(invoice.period_start);
  const currentPeriodStart = safeDate(subscription.current_period_start);
  const currentPeriodEnd = safeDate(subscription.current_period_end);
  const renewalDate = calculateRenewalDate(
    subscription.current_period_end,
    subscription.items.data[0].price.recurring?.interval,
  );

  // ✅ Create payment transaction
  const invoiceInfo = {
    customer: invoice.customer,
    payment_intent: invoice.payment_intent,
    price_id: invoice.lines.data[0].price.id,
    period_start: invoice.period_start,
    period_end: invoice.period_end,
    amount_paid: invoice.amount_paid,
    billing_reason: invoice.billing_reason,
    subscriptionId: invoice.subscription,
  };

  await createPaymentTransaction({
    userId: user._id as mongoose.Types.ObjectId,
    referenceFor: metadata.referenceFor,
    referenceId: metadata.referenceId,
    paymentIntent: invoice.payment_intent,
    amount: Number(metadata.amount),
    currency: metadata.currency,
    subscriptionId: subscription.id,
    invoiceInfo,
  });

  // ✅ Update UserSubscription
  await updateUserSubscription(referenceId, {
    stripe_subscription_id: subscription.id,
    stripe_transaction_id: invoice.payment_intent,
    subscriptionPlanId: subscriptionPlanId || null,
    status: UserSubscriptionStatusType.active,
    subscriptionStartDate,
    currentPeriodStartDate: currentPeriodStart,
    expirationDate: currentPeriodEnd,
    renewalDate,
    billingCycle: 1,
    isAutoRenewed: true,
    purchasePlatform: 'web',
  });

  // ✅ Mark free trial as used
  await markFreeTrialUsed(userId, subscriptionType);

  // ✅ Invalidate cache
  await invalidateSubscriptionCache(userId, referenceId);

  // ✅ Queue notification via BullMQ
  await queuePaymentSuccessNotification({
    userId,
    amount: Number(metadata.amount),
    currency: metadata.currency,
    billingReason: 'subscription_create',
    subscriptionId: subscription.id,
    billingCycle: 1,
  });

  // ✅ Queue subscription created notification
  await queueSubscriptionCreatedNotification({
    userId,
    subscriptionId: referenceId,
    subscriptionType,
    trialEnd: subscription.trial_end
      ? new Date(subscription.trial_end * 1000)
      : undefined,
  });

  logger.info(
    `[Stripe] Subscription created for user ${userId}, subscription ${referenceId}`,
  );
};

// ✅ Main handler for subscription_cycle (recurring payment)
const handleSubscriptionCycle = async (
  invoice: any,
  subscription: Stripe.Subscription,
  metadata: IMetadataForFreeTrial,
  user: IUser,
): Promise<void> => {
  const { referenceId, userId, subscriptionType } = metadata;

  // ✅ Idempotency check
  const isDuplicate = await checkIdempotency(invoice.payment_intent);
  if (isDuplicate) {
    logger.warn(
      `[Stripe] Duplicate payment detected for intent: ${invoice.payment_intent}`,
    );
    return;
  }

  // ✅ Calculate dates from Stripe
  const currentPeriodStart = safeDate(subscription.current_period_start);
  const currentPeriodEnd = safeDate(subscription.current_period_end);
  const renewalDate = calculateRenewalDate(
    subscription.current_period_end,
    subscription.items.data[0].price.recurring?.interval,
  );

  // ✅ Create payment transaction
  const invoiceInfo = {
    customer: invoice.customer,
    payment_intent: invoice.payment_intent,
    price_id: invoice.lines.data[0].price.id,
    period_start: invoice.period_start,
    period_end: invoice.period_end,
    amount_paid: invoice.amount_paid,
    billing_reason: invoice.billing_reason,
    subscriptionId: invoice.subscription,
  };

  await createPaymentTransaction({
    userId: user._id as mongoose.Types.ObjectId,
    referenceFor: metadata.referenceFor,
    referenceId: metadata.referenceId,
    paymentIntent: invoice.payment_intent,
    amount: Number(metadata.amount),
    currency: metadata.currency,
    subscriptionId: subscription.id,
    invoiceInfo,
  });

  // ✅ Update UserSubscription — increment billing cycle
  const existingSubscription = await UserSubscription.findById(referenceId).lean();
  const currentBillingCycle = existingSubscription?.billingCycle || 0;

  await updateUserSubscription(referenceId, {
    stripe_subscription_id: subscription.id,
    stripe_transaction_id: invoice.payment_intent,
    status: UserSubscriptionStatusType.active,
    currentPeriodStartDate: currentPeriodStart,
    expirationDate: currentPeriodEnd,
    renewalDate,
    billingCycle: currentBillingCycle + 1,
    isAutoRenewed: true,
  });

  // ✅ Mark free trial as used (idempotent)
  await markFreeTrialUsed(userId, subscriptionType);

  // ✅ Invalidate cache
  await invalidateSubscriptionCache(userId, referenceId);

  // ✅ Queue notification via BullMQ
  await queuePaymentSuccessNotification({
    userId,
    amount: Number(metadata.amount),
    currency: metadata.currency,
    billingReason: 'subscription_cycle',
    subscriptionId: subscription.id,
    billingCycle: currentBillingCycle + 1,
  });

  logger.info(
    `[Stripe] Subscription cycle payment for user ${userId}, cycle #${currentBillingCycle + 1}`,
  );
};

// ✅ Main handler for subscription_update (plan change, proration)
const handleSubscriptionUpdate = async (
  invoice: any,
  subscription: Stripe.Subscription,
  metadata: IMetadataForFreeTrial,
  user: IUser,
): Promise<void> => {
  const { referenceId, userId } = metadata;

  // ✅ Idempotency check
  const isDuplicate = await checkIdempotency(invoice.payment_intent);
  if (isDuplicate) {
    logger.warn(
      `[Stripe] Duplicate payment detected for intent: ${invoice.payment_intent}`,
    );
    return;
  }

  // ✅ Calculate dates from Stripe
  const currentPeriodStart = safeDate(subscription.current_period_start);
  const currentPeriodEnd = safeDate(subscription.current_period_end);
  const renewalDate = calculateRenewalDate(
    subscription.current_period_end,
    subscription.items.data[0].price.recurring?.interval,
  );

  // ✅ Create payment transaction for proration
  const invoiceInfo = {
    customer: invoice.customer,
    payment_intent: invoice.payment_intent,
    price_id: invoice.lines.data[0].price.id,
    period_start: invoice.period_start,
    period_end: invoice.period_end,
    amount_paid: invoice.amount_paid,
    billing_reason: invoice.billing_reason,
    subscriptionId: invoice.subscription,
  };

  await createPaymentTransaction({
    userId: user._id as mongoose.Types.ObjectId,
    referenceFor: metadata.referenceFor,
    referenceId: metadata.referenceId,
    paymentIntent: invoice.payment_intent,
    amount: Number(metadata.amount),
    currency: metadata.currency,
    subscriptionId: subscription.id,
    invoiceInfo,
  });

  // ✅ Update UserSubscription with new plan details
  await updateUserSubscription(referenceId, {
    stripe_subscription_id: subscription.id,
    stripe_transaction_id: invoice.payment_intent,
    currentPeriodStartDate: currentPeriodStart,
    expirationDate: currentPeriodEnd,
    renewalDate,
    isAutoRenewed: true,
  });

  // ✅ Invalidate cache
  await invalidateSubscriptionCache(userId, referenceId);

  // ✅ Queue notification via BullMQ
  await queuePaymentSuccessNotification({
    userId,
    amount: Number(metadata.amount),
    currency: metadata.currency,
    billingReason: 'subscription_update',
    subscriptionId: subscription.id,
  });

  await queueSubscriptionUpdatedNotification({
    userId,
    subscriptionId: referenceId,
    updateType: invoice.billing_reason,
    prorationAmount: Number(metadata.amount),
  });

  logger.info(
    `[Stripe] Subscription updated for user ${userId}, subscription ${referenceId}`,
  );
};

// ✅ Export main handler
export const handleSuccessfulPaymentV2 = async (
  invoice: any,
): Promise<boolean> => {
  const correlationId = `stripe_inv_${invoice.id}`;
  logger.info(`[Stripe] Processing invoice.payment_succeeded: ${invoice.id}`, {
    correlationId,
    billingReason: invoice.billing_reason,
  });

  try {
    // ✅ Validate billing reason
    const validBillingReasons = [
      'subscription_create',
      'subscription_cycle',
      'subscription_update',
    ];

    if (!validBillingReasons.includes(invoice.billing_reason)) {
      logger.info(
        `[Stripe] Skipping invoice with billing_reason: ${invoice.billing_reason}`,
        { correlationId },
      );
      return false;
    }

    // ✅ Retrieve subscription
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) {
      throw new Error('Missing subscription ID in invoice');
    }

    const subscription = await retrieveSubscription(subscriptionId);

    // ✅ Extract and validate metadata (V3 ENHANCEMENT: Handle user JSON field)
    const metadata: IMetadataForFreeTrial = subscription.metadata as IMetadataForFreeTrial;

    // If userId is not directly in metadata, try to extract from user JSON field
    if (!metadata?.userId && subscription.metadata?.user) {
      try {
        const userData = JSON.parse(subscription.metadata.user);
        if (userData.userId) {
          logger.info('[Stripe] Extracted userId from user JSON field in metadata');
          // Create a merged metadata object with userId
          Object.assign(metadata, { userId: userData.userId });
        }
      } catch (err) {
        logger.warn('[Stripe] Failed to parse user JSON from metadata:', err);
      }
    }

    if (!metadata?.userId || !metadata?.referenceId) {
      logger.error('[Stripe] Metadata validation failed', {
        subscriptionId: subscription.id,
        hasUserId: !!metadata?.userId,
        hasReferenceId: !!metadata?.referenceId,
        rawMetadata: JSON.stringify(subscription.metadata).substring(0, 200),
      });
      throw new Error(
        'Missing required metadata: userId and referenceId are required',
      );
    }

    // ✅ Find user using enhanced strategy (V3)
    const user = await findUser(subscription.customer, metadata);
    if (!user) {
      throw new Error(
        `User not found for Stripe customer: ${subscription.customer}. Metadata: ${JSON.stringify(metadata)}`,
      );
    }

    // ✅ Route to appropriate handler based on billing reason
    switch (invoice.billing_reason) {
      case 'subscription_create':
        await handleSubscriptionCreate(
          invoice,
          subscription,
          metadata,
          user,
        );
        break;

      case 'subscription_cycle':
        await handleSubscriptionCycle(
          invoice,
          subscription,
          metadata,
          user,
        );
        break;

      case 'subscription_update':
        await handleSubscriptionUpdate(
          invoice,
          subscription,
          metadata,
          user,
        );
        break;

      default:
        logger.warn(
          `[Stripe] Unhandled billing reason: ${invoice.billing_reason}`,
          { correlationId },
        );
        return false;
    }

    logger.info(
      `[Stripe] Successfully processed invoice ${invoice.id}`,
      { correlationId },
    );
    return true;
  } catch (error) {
    errorLogger.error(
      `[Stripe] Error handling successful payment: ${invoice.id}`,
      error,
    );

    // ✅ Log for retry/monitoring
    await logFailedWebhook(
      invoice.id,
      invoice.subscription,
      invoice.metadata || {},
      error as Error,
      'handleSuccessfulPayment',
    );

    // ✅ Re-throw to trigger Stripe retry
    throw error;
  }
};
