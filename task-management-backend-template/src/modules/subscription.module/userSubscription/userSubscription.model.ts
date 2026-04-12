//@ts-ignore
import { model, Schema } from 'mongoose';
import paginate from '../../../common/plugins/paginate';
import { UserSubscriptionStatusType } from './userSubscription.constant';
import {
  IUserSubscription,
  IUserSubscriptionModel,
} from './userSubscription.interface';

const userSubscriptionSchema = new Schema<IUserSubscription>(
  {
    userId: {
      //🔗
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [false, 'User Id is required'],
    },
    subscriptionPlanId: {
      //🔗
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: [false, 'Subscription Plan Id is required'],
    },
    subscriptionStartDate: {
      type: Date,
      required: false,
      /******
       * frist i think required should be true ..
       * then i thought it should be false ..
       * it should create in webhook after successful payment
       *
       * ** */
      validate: {
        validator: value => value <= new Date(),
        message: 'Subscription Start Date must be in the past',
      },
    },
    currentPeriodStartDate: {
      // renewal period end date
      type: Date,
      required: false,
    },
    // renewalDate is not expiration date
    expirationDate: {
      type: Date,
      required: false,
    },

    renewalDate: {
      type: Date,
      required: false,

    },

    billingCycle: {
      type: Number,
      required: [true, 'billingCycle is required'],
      default: 0,
    },
    isAutoRenewed: {
      type: Boolean,
      required: [false, 'isAutoRenewed is not required'],
      default: false,
    },
    cancelledAt: {
      type: Date,
      required: [false, 'cancelledAt is not required'],
      default: null,
    },
    cancelledAtPeriodEnd: {
      type: Boolean,
      required: [false, 'cancelledAtPeriodEnd is not required'],
      default: false,
    },
    status: {
      type: String,
      enum: [
        UserSubscriptionStatusType.processing,
        UserSubscriptionStatusType.active,
        UserSubscriptionStatusType.past_due,
        UserSubscriptionStatusType.cancelled,
        UserSubscriptionStatusType.unpaid,
        UserSubscriptionStatusType.incomplete,
        UserSubscriptionStatusType.incomplete_expired,
        UserSubscriptionStatusType.trialing,
        UserSubscriptionStatusType.payment_failed // by claude
      ],
      required: [
        true,
        `status is required .. It can be  ${Object.values(
          UserSubscriptionStatusType
        ).join(', ')}`,
      ],
    },
    isFromFreeTrial :{
      /******
       * by this we can track is this subscription
       * from free trial or not
       *
       * true hoile amader ke
       * Standard Subscription
       * ta assign kore dite hobe
       *
       * ****** */
      type: Boolean,
      required:[true, 'isFromFreeTrial is required']
    },
    
    // Stripe Specific (for Business plans)
    stripe_subscription_id: {
      type: String,
      required: [false, 'stripe_subscription_id is not required'], // 🟢🟢 for recurring payment
      // default: null,
    },

    stripe_transaction_id : {
      type: String,
      required: [false, 'stripe_transaction_id is not required'], // 🟢🟢 for one time payment
    },
    
    // 🆕 RevenueCat Specific (for Individual plans)
    paymentGateway: {
      type: String,
      enum: ['stripe', 'revenuecat'],
      required: [true, 'paymentGateway is required'],
      default: 'stripe',
    },
    
    revenueCatUserId: {
      type: String,
      required: [false, 'revenueCatUserId is not required'],
    },
    
    revenueCatOrderId: {
      type: String,
      required: [false, 'revenueCatOrderId is not required'],
    },
    
    revenueCatTransactionId: {
      type: String,
      required: [false, 'revenueCatTransactionId is not required'],
    },
    
    appleReceiptData: {
      type: String,
      required: [false, 'appleReceiptData is not required'],
    },
    
    googlePurchaseToken: {
      type: String,
      required: [false, 'googlePurchaseToken is not required'],
    },
    
    originalTransactionId: {
      type: String,
      required: [false, 'originalTransactionId is not required'],
    },
    
    revenueCatEnvironment: {
      type: String,
      enum: ['production', 'sandbox'],
      required: [false, 'revenueCatEnvironment is not required'],
    },
    
    // 🆕 Purchase Platform
    purchasePlatform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      required: [false, 'purchasePlatform is not required'],
    },
    
    stripe_customer_id: {
      type: String,
      required: [false, 'stripe_customer_id is not required'],
    },

    isDeleted: {
      type: Boolean,
      required: [false, 'isDeleted is not required'],
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

userSubscriptionSchema.plugin(paginate);

/*-─────────────────────────────────
|  INDEXES — Optimized for 100K+ users
|  Rule: Every filter/sort/lookup field MUST have an index
└──────────────────────────────────*/

// ✅ Primary lookup by user
userSubscriptionSchema.index({ userId: 1 });

// ✅ Stripe subscription ID lookup (webhook handlers)
userSubscriptionSchema.index({ stripe_subscription_id: 1 }, { sparse: true });

// ✅ Stripe customer ID lookup
userSubscriptionSchema.index({ stripe_customer_id: 1 }, { sparse: true });

// ✅ Status-based queries (active subscriptions, cancellations, etc.)
userSubscriptionSchema.index({ status: 1 });

// ✅ Compound index: user + status (most common query pattern)
userSubscriptionSchema.index({ userId: 1, status: 1 });

// ✅ Compound index: status + renewalDate (expiry monitoring)
userSubscriptionSchema.index({ status: 1, renewalDate: 1 });

// ✅ Subscription plan analytics
userSubscriptionSchema.index({ subscriptionPlanId: 1 });

// ✅ Cancellation tracking
userSubscriptionSchema.index({ cancelledAt: 1 }, { sparse: true });

// ✅ Auto-renewal queries
userSubscriptionSchema.index({ isAutoRenewed: 1, status: 1 });

// ✅ Payment gateway + platform analytics
userSubscriptionSchema.index({ paymentGateway: 1, purchasePlatform: 1 });

// ✅ TTL index for soft-deleted records (auto-cleanup after 90 days)
userSubscriptionSchema.index(
  { updatedAt: 1 },
  {
    expireAfterSeconds: 7776000, // 90 days
    partialFilterExpression: { isDeleted: true },
  },
);

// auto calculate the renewal date if its not provided ...
// TODO : MUST ::: need to check this code is working or not .. 
userSubscriptionSchema.pre('save', async function() {
  // Rename _id to _projectId
  //this._taskId = this._id;
  //this._id = undefined;  // Remove the default _id field

  if (!this.renewalDate) {
    const renewalPeriods = {
      daily: 1,
      weekly: 7,
      monthly: 30,
      yearly: 365,
    };

    this.renewalDate = new Date(this.subscriptionStartDate);
    this.renewalDate.setDate(
      this.renewalDate.getDate() + renewalPeriods[this.renewalFrequncy]
    );
  }

  // auto update the status if  renewal date has passed
  if (this.renewalDate < new Date()) {
    this.status = UserSubscriptionStatusType.expired;
  }
});

// Use transform to rename _id to _projectId
userSubscriptionSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._userSubscriptionId = ret._id; // Rename _id to _userSubscriptionId
    delete ret._id; // Remove the original _id field
    return ret;
  },
});

export const UserSubscription = model<
  IUserSubscription,
  IUserSubscriptionModel
>('UserSubscription', userSubscriptionSchema);
