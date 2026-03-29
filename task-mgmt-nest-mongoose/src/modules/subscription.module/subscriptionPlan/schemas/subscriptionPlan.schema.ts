import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  SubscriptionType,
  InitialDuration,
  RenewalFrequency,
  PurchaseChannel,
  Platform,
  SUBSCRIPTION_DEFAULTS,
} from './constants/subscriptionPlan.constants';
import { Currency } from '../../../enums/payment';

/**
 * Subscription Plan Schema
 * Defines subscription tiers available for purchase
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 */
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class SubscriptionPlan {
  /**
   * MongoDB document ID
   */
  _id?: Types.ObjectId;

  /**
   * Display name for the subscription plan
   */
  @Prop({
    type: String,
    required: [true, 'Subscription name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters'],
  })
  subscriptionName: string;

  /**
   * Type of subscription (individual, business tiers)
   */
  @Prop({
    type: String,
    enum: Object.values(SubscriptionType),
    required: [true, 'subscriptionType is required'],
    index: true,
  })
  subscriptionType: SubscriptionType;

  /**
   * Free trial enabled flag
   */
  @Prop({
    type: Boolean,
    default: SUBSCRIPTION_DEFAULTS.FREE_TRIAL_ENABLED,
  })
  freeTrialEnabled: boolean;

  /**
   * Free trial duration in days
   */
  @Prop({
    type: Number,
    min: [0, 'Free trial duration must be non-negative'],
  })
  freeTrialDurationDays?: number;

  /**
   * Initial subscription duration (month/year)
   */
  @Prop({
    type: String,
    enum: Object.values(InitialDuration),
    default: InitialDuration.month,
    required: [true, 'Initial Duration is required'],
  })
  initialDuration: InitialDuration;

  /**
   * Renewal frequency (monthly/yearly)
   */
  @Prop({
    type: String,
    enum: Object.values(RenewalFrequency),
    default: RenewalFrequency.monthly,
    required: [true, 'Renewal Frequency is required'],
  })
  renewalFrequncy: RenewalFrequency;

  /**
   * Subscription amount (as string for precision)
   */
  @Prop({
    type: String,
    required: [false, 'Amount is not required'],
  })
  amount: string;

  /**
   * Currency code (usd, bdt, etc.)
   */
  @Prop({
    type: String,
    enum: Object.values(Currency),
    required: [true, 'Currency is required'],
    default: Currency.usd,
  })
  currency: Currency;

  /**
   * Maximum number of children accounts allowed
   */
  @Prop({
    type: Number,
    required: [true, 'maxChildrenAccount is required'],
  })
  maxChildrenAccount: number;

  /**
   * Stripe product ID
   */
  @Prop({ type: String })
  stripe_product_id: string;

  /**
   * Stripe price ID
   */
  @Prop({ type: String })
  stripe_price_id: string;

  /**
   * Purchase channel (stripe, revenuecat, both)
   */
  @Prop({
    type: String,
    enum: Object.values(PurchaseChannel),
    required: [true, 'purchaseChannel is required'],
    default: PurchaseChannel.stripe,
    index: true,
  })
  purchaseChannel: PurchaseChannel;

  /**
   * RevenueCat product identifier
   */
  @Prop({ type: String })
  revenueCatProductIdentifier: string;

  /**
   * RevenueCat package identifier
   */
  @Prop({ type: String })
  revenueCatPackageIdentifier: string;

  /**
   * Available platforms (ios, android, web)
   */
  @Prop({
    type: [String],
    enum: Object.values(Platform),
  })
  availablePlatforms: Platform[];

  /**
   * Plan is active and available for purchase
   */
  @Prop({
    type: Boolean,
    default: SUBSCRIPTION_DEFAULTS.IS_ACTIVE,
    index: true,
  })
  isActive: boolean;

  /**
   * Soft delete flag
   */
  @Prop({ default: SUBSCRIPTION_DEFAULTS.IS_DELETED })
  isDeleted: boolean;

  /**
   * Creation timestamp (auto-managed by Mongoose)
   */
  createdAt?: Date;

  /**
   * Last update timestamp (auto-managed by Mongoose)
   */
  updatedAt?: Date;
}

/**
 * Subscription Plan Schema Definition
 */
export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);

/**
 * Indexes for efficient queries
 */

// Index for active plans by type
SubscriptionPlanSchema.index({ subscriptionType: 1, isActive: 1, isDeleted: 1 });

// Index for purchase channel
SubscriptionPlanSchema.index({ purchaseChannel: 1, isActive: 1 });

// Index for Stripe product/price lookups
SubscriptionPlanSchema.index({ stripe_product_id: 1, isDeleted: 1 });
SubscriptionPlanSchema.index({ stripe_price_id: 1, isDeleted: 1 });

// Index for RevenueCat product lookups
SubscriptionPlanSchema.index({ revenueCatProductIdentifier: 1, isDeleted: 1 });

// Index for active plans
SubscriptionPlanSchema.index({ isActive: 1, isDeleted: 1, createdAt: -1 });

/**
 * toJSON transformation
 */
SubscriptionPlanSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.subscriptionPlanId = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

/**
 * Pre-save hook: Deactivate other plans of same type
 */
SubscriptionPlanSchema.pre<SubscriptionPlanDocument>('save', async function (next) {
  // If this is a new document or isActive changed to true
  if (this.isNew || this.isModified('isActive')) {
    const Model = this.constructor as any;

    if (this.isActive) {
      // Deactivate other active plans of the same subscription type
      await Model.updateMany(
        {
          subscriptionType: this.subscriptionType,
          _id: { $ne: this._id },
          isActive: true,
          isDeleted: false,
        },
        {
          $set: { isActive: false },
        },
      );
    }
  }

  next();
});

/**
 * Static method: Find active plan by subscription type
 */
SubscriptionPlanSchema.statics.findActiveByType = async function (
  subscriptionType: SubscriptionType,
): Promise<SubscriptionPlanDocument | null> {
  return this.findOne({
    subscriptionType,
    isActive: true,
    isDeleted: false,
  });
};

/**
 * Static method: Find all active plans
 */
SubscriptionPlanSchema.statics.findActivePlans = async function (): Promise<
  SubscriptionPlanDocument[]
> {
  return this.find({
    isActive: true,
    isDeleted: false,
  }).sort({ amount: 1 });
};

/**
 * Static method: Find plan by Stripe price ID
 */
SubscriptionPlanSchema.statics.findByStripePriceId = async function (
  priceId: string,
): Promise<SubscriptionPlanDocument | null> {
  return this.findOne({
    stripe_price_id: priceId,
    isDeleted: false,
  });
};

/**
 * Static method: Find plan by RevenueCat product identifier
 */
SubscriptionPlanSchema.statics.findByRevenueCatProduct = async function (
  productIdentifier: string,
): Promise<SubscriptionPlanDocument | null> {
  return this.findOne({
    revenueCatProductIdentifier: productIdentifier,
    isDeleted: false,
  });
};

/**
 * Subscription Plan Document Type
 */
export type SubscriptionPlanDocument = SubscriptionPlan & Document;

/**
 * Subscription Plan Model Type
 */
export type SubscriptionPlanModel = typeof SubscriptionPlan;
