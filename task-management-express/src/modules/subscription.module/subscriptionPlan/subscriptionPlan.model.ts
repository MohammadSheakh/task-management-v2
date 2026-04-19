//@ts-ignore
import { model, Schema } from 'mongoose';
import paginate from '../../../common/plugins/paginate';

import {
  TInitialDuration,
  TRenewalFrequency,
} from './subscriptionPlan.constant';

import { ISubscriptionPlan, ISubscriptionPlanModel } from './subscriptionPlan.interface';
import { TCurrency } from '../../../enums/payment';
import { TSubscription } from '../../../enums/subscription';

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    subscriptionName: {
      type: String,
      required: [true, 'Subscription name is required'],
      trim: true,
      unique: false,
      minlength: 2,
      maxlength: 100,
    },
    subscriptionType: {
      type: String,
      enum: [
        TSubscription.individual,
        TSubscription.business_starter,
        TSubscription.business_level1,
        TSubscription.business_level2,
      ],
      required: [
        true,
        `subscriptionType is required it can be ${Object.values(
          TSubscription
        ).join(', ')}`,
      ],
    },
    // 🆓🆓🆓🆓 FREE TRIAL FIELDS
    freeTrialEnabled: { //✅ TRIAL_AVAILABLE
      type: Boolean,
      default: true,
      required: [false, 'freeTrialEnabled is not required'],
    },
    freeTrialDurationDays: { //🆓🆓🆓🆓📅 TRIAL_DAYS
      type: Number,
      // default: 7, // 7 days free trial
      min: [0, 'Free trial duration must be non-negative'],
      required: [false, 'freeTrialDurationDays is not required'],
    },

    initialDuration: {
      type: String,
      enum: [
        TInitialDuration.month,
        TInitialDuration.year,
      ],
      default: TInitialDuration.month,
      required: [
        true,
        `Initial Duration is required.. it can be  ${Object.values(TInitialDuration).join(
          ', '
        )}`,
      ],
    },

    renewalFrequncy: {
      type: String,
      enum: [
        TRenewalFrequency.monthly,
        TRenewalFrequency.yearly,
      ],
      default: TRenewalFrequency.monthly,
      required: [
        true,
        `Renewal Frequncy is required .. It can be  ${Object.values(
          TRenewalFrequency
        ).join(', ')}`,
      ],
    },

    amount: {
      type: String, // Number
      required: [false, 'Initial Fee is required'],
      // min: [0, 'Initial Fee must be greater than zero'],
    },
    currency: {
      type: String,
      enum: [TCurrency.usd],
      required: [
        true,
        `Currency is required .. it can be  ${Object.values(TCurrency).join(
          ', '
        )}`,
      ],
      default: TCurrency.usd,
    },

    /*-─────────────────────────────────
    |  Subscription Specific Features
    └──────────────────────────────────*/
    maxChildrenAccount:{
      type: Number,
      required : [
        true,
        `maxChildrenAccount is required.`,
      ]
    },

    //---------------------------------
    // in stripe .. we always have to create new subscription
    // and we can not update existing subscription ...
    //---------------------------------
    stripe_product_id : {
      type: String,
      required: [false, 'stripe_product_id is not required'],
    },
    stripe_price_id : {
      type: String,
      required: [false, 'stripe_price_id is not required'],
    },

    // 🆕 RevenueCat Configuration
    purchaseChannel: {
      type: String,
      enum: ['stripe', 'revenuecat', 'both'],
      required: [true, 'purchaseChannel is required'],
      default: 'stripe',
    },
    
    revenueCatProductIdentifier: {
      type: String,
      required: [false, 'revenueCatProductIdentifier is not required'],
    },
    
    revenueCatPackageIdentifier: {
      type: String,
      required: [false, 'revenueCatPackageIdentifier is not required'],
    },
    
    // 🆕 Platform availability
    availablePlatforms: [{
      type: String,
      enum: ['ios', 'android', 'web'],
    }],

    isActive : {
      type: Boolean,
      required: [false, 'isActive is not required'],
      default: true,
    },

    isDeleted: {
      type: Boolean,
      required: [false, 'isDeleted is not required'],
      default: false,
    }
  },
  {
    timestamps: true ,
  }
);

subscriptionPlanSchema.plugin(paginate);

// Use transform to rename _id to _projectId
subscriptionPlanSchema.set('toJSON', {
  //@ts-ignore
  transform: function (doc, ret, options) {
    ret._subscriptionId = ret._id;  // Rename _id to _subscriptionId
    delete ret._id;  // Remove the original _id field
    return ret;
  }
});

export const SubscriptionPlan = model<ISubscriptionPlan, ISubscriptionPlanModel>(
  'SubscriptionPlan',
  subscriptionPlanSchema
);
