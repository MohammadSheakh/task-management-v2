
export enum TInitialDuration {
    day = 'day',
    week = 'week',
    month = 'month',
    year = 'year',
}

export enum TRenewalFrequency {
    daily = 'daily',
    weekly = 'weekly',
    monthly = 'monthly',
    yearly = 'yearly',
}

/**
 * Subscription Purchase Channel Enum
 * Defines where the subscription can be purchased
 */
export enum SubscriptionPurchaseChannel {
  STRIPE = 'stripe',
  REVENUECAT = 'revenuecat',
  BOTH = 'both',
}

/**
 * Platform Enum
 * Defines the platform availability
 */
export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

/**
 * Type exports from enums
 */
export type TSubscriptionPurchaseChannel = `${SubscriptionPurchaseChannel}`;
export type TPlatform = `${Platform}`;
