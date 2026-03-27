export enum UserSubscriptionStatusType {
    processing = 'processing',
    active = 'active',
    past_due = 'past_due',
    cancelled = 'cancelled',
    cancelling = 'cancelling', // From Qwen chat .. for cancel subscription
    unpaid = 'unpaid',
    incomplete = 'incomplete',
    incomplete_expired = 'incomplete_expired',
    trialing = 'trialing',
    freeTrial = 'freeTrial',
    expired = 'expired',
    payment_failed = 'payment_failed', // From claude .. for handle payment failed
}

/**
 * Subscription Gateway Enum
 * Defines the payment gateway used for subscription
 */
export enum SubscriptionGateway {
  STRIPE = 'stripe',
  REVENUECAT = 'revenuecat',
}

/**
 * Type export from enum
 */
export type TSubscriptionGateway = `${SubscriptionGateway}`;

/**
 * Re-export shared types from subscriptionPlan.constant
 */
export type { TPaymentEnvironment, TPaymentPlatform } from '../../payment.module/paymentTransaction/paymentTransaction.constant';
export type { TPlatform } from '../subscriptionPlan/subscriptionPlan.constant';


