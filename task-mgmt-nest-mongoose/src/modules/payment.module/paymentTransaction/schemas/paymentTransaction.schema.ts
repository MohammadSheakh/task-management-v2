import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentGateway, PaymentStatus, Currency, TransactionType } from './constants/payment.constants';

/**
 * Payment Transaction Schema
 * Tracks all payment transactions across all gateways
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 *
 * @example
 * // Create transaction
 * const transaction = await paymentTransactionModel.create({
 *   userId: new Types.ObjectId('...'),
 *   referenceFor: TransactionType.UserSubscription,
 *   referenceId: new Types.ObjectId('...'),
 *   paymentGateway: PaymentGateway.stripe,
 *   amount: 2999,
 *   currency: Currency.usd,
 *   paymentStatus: PaymentStatus.pending,
 * });
 */
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PaymentTransaction {
  /**
   * MongoDB document ID
   */
  _id?: Types.ObjectId;

  /**
   * User who made the payment
   * @index true - Frequently queried by userId
   */
  @Prop({
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  })
  userId: Types.ObjectId;

  /**
   * What the payment is for
   * - userSubscription: Subscription plan purchase
   * - purchasedJourney: Journey purchase (future)
   * - purchasedAdminCapsule: Admin capsule purchase (future)
   */
  @Prop({
    type: String,
    enum: Object.values(TransactionType),
    required: [true, 'referenceFor is required'],
    index: true,
  })
  referenceFor: TransactionType;

  /**
   * ID of the referenced entity (subscription, journey, etc.)
   * Dynamic reference based on referenceFor
   */
  @Prop({
    type: Schema.Types.ObjectId,
    refPath: 'referenceFor',
    required: [true, 'referenceId is required'],
    index: true,
  })
  referenceId: Types.ObjectId;

  /**
   * Payment gateway used for this transaction
   */
  @Prop({
    type: String,
    enum: Object.values(PaymentGateway),
    required: [true, 'paymentGateway is required'],
    index: true,
  })
  paymentGateway: PaymentGateway;

  /**
   * Gateway transaction ID
   * Stripe: pi_xxx, RevenueCat: transaction_id, etc.
   */
  @Prop({ type: String, default: null, index: true })
  transactionId: string;

  /**
   * Stripe payment intent ID (Stripe-specific)
   */
  @Prop({ type: String, default: null })
  paymentIntent: string;

  /**
   * Payment amount in smallest currency unit (cents for USD)
   * @min 0 - Amount cannot be negative
   */
  @Prop({
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount must be greater than zero'],
  })
  amount: number;

  /**
   * Currency code (usd, bdt, eur, etc.)
   */
  @Prop({
    type: String,
    enum: Object.values(Currency),
    required: [true, 'Currency is required'],
  })
  currency: Currency;

  /**
   * Payment status
   * Tracks lifecycle from pending to completed/failed/refunded
   */
  @Prop({
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.pending,
    index: true,
  })
  paymentStatus: PaymentStatus;

  /**
   * Full gateway response
   * Store complete response for debugging and audit
   * @example
   * {
   *   id: 'pi_123',
   *   status: 'succeeded',
   *   amount: 2999,
   *   currency: 'usd',
   *   ...
   * }
   */
  @Prop({ type: Schema.Types.Mixed, default: null })
  gatewayResponse: Record<string, any>;

  /**
   * RevenueCat order ID (RevenueCat-specific)
   */
  @Prop({ type: String, default: null, index: true })
  revenueCatOrderId: string;

  /**
   * RevenueCat environment (sandbox or production)
   */
  @Prop({
    type: String,
    enum: ['production', 'sandbox'],
    default: null,
  })
  revenueCatEnvironment: 'production' | 'sandbox';

  /**
   * Platform where purchase was made
   */
  @Prop({
    type: String,
    enum: ['ios', 'android', 'web'],
    default: null,
  })
  platform: 'ios' | 'android' | 'web';

  /**
   * Soft delete flag
   */
  @Prop({ default: false })
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
 * Payment Transaction Schema Definition
 */
export const PaymentTransactionSchema = SchemaFactory.createForClass(PaymentTransaction);

/**
 * Indexes for efficient queries
 */

// Compound index for user's transactions
PaymentTransactionSchema.index({ userId: 1, paymentStatus: 1, isDeleted: 1 });

// Index for reference lookups
PaymentTransactionSchema.index({ referenceFor: 1, referenceId: 1, isDeleted: 1 });

// Index for gateway-specific queries
PaymentTransactionSchema.index({ paymentGateway: 1, transactionId: 1 });

// Index for revenue cat queries
PaymentTransactionSchema.index({ revenueCatOrderId: 1, isDeleted: 1 });

// Index for date-based queries (earnings reports)
PaymentTransactionSchema.index({ createdAt: -1, isDeleted: 1 });

// Index for status-based queries
PaymentTransactionSchema.index({ paymentStatus: 1, createdAt: -1, isDeleted: 1 });

/**
 * Virtual populate: Get user details
 */
PaymentTransactionSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate: Get reference entity (subscription, journey, etc.)
 * Note: This is a dynamic reference, so populate needs to specify the model
 */
PaymentTransactionSchema.virtual('reference', {
  refPath: 'referenceFor',
  localField: 'referenceId',
  foreignField: '_id',
  justOne: true,
});

/**
 * toJSON transformation
 * Adds paymentTransactionId and removes internal fields
 */
PaymentTransactionSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.paymentTransactionId = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

/**
 * Pre-save hook: Validate transaction data
 */
PaymentTransactionSchema.pre<PaymentTransactionDocument>('save', function (next) {
  // Validate amount is positive
  if (this.amount < 0) {
    throw new Error('Amount cannot be negative');
  }

  // Validate currency matches gateway
  if (this.paymentGateway === PaymentGateway.stripe && this.currency !== Currency.usd) {
    this.logger?.warn(`Stripe transaction with non-USD currency: ${this.currency}`);
  }

  next();
});

/**
 * Static method: Get transaction by revenue cat order ID
 */
PaymentTransactionSchema.statics.findByRevenueCatOrderId = async function (
  orderId: string,
): Promise<PaymentTransactionDocument | null> {
  return this.findOne({
    revenueCatOrderId: orderId,
    isDeleted: false,
  });
};

/**
 * Static method: Get transactions by user ID
 */
PaymentTransactionSchema.statics.findByUserId = async function (
  userId: string,
): Promise<PaymentTransactionDocument[]> {
  return this.find({
    userId: new Types.ObjectId(userId),
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Static method: Get completed transactions by user ID
 */
PaymentTransactionSchema.statics.findCompletedByUserId = async function (
  userId: string,
): Promise<PaymentTransactionDocument[]> {
  return this.find({
    userId: new Types.ObjectId(userId),
    paymentStatus: PaymentStatus.completed,
    isDeleted: false,
  }).sort({ createdAt: -1 });
};

/**
 * Payment Transaction Document Type
 */
export type PaymentTransactionDocument = PaymentTransaction & Document;

/**
 * Payment Transaction Model Type
 */
export type PaymentTransactionModel = typeof PaymentTransaction;
