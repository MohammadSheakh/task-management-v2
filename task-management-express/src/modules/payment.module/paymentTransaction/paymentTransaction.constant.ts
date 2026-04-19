
export enum TPaymentGateway {
    stripe = 'stripe',
    paypal = 'paypal',
    sslcommerz = 'sslcommerz',
    revenuecat = 'revenuecat',  // 🆕 Added RevenueCat
    none = 'none'
}
export enum TPaymentStatus {
    pending = 'pending',
    processing = 'processing',
    completed = 'completed',
    failed = 'failed',
    refunded = 'refunded',
    cancelled = 'cancelled',
    partially_refunded = 'partially_refunded',
    disputed = 'disputed'
}

export enum PaymentMethod {
    //  COD = 'Cod',
    //  CARD = 'Card',
     online = 'online',
}

/**
 * Payment Environment Enum
 * Defines the environment for payment processing (RevenueCat specific)
 */
export enum PaymentEnvironment {
  PRODUCTION = 'production',
  SANDBOX = 'sandbox',
}

/**
 * Payment Platform Enum
 * Defines the platform where payment was made
 */
export enum PaymentPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

/**
 * Type exports from enums
 */
export type TPaymentEnvironment = `${PaymentEnvironment}`;
export type TPaymentPlatform = `${PaymentPlatform}`;
