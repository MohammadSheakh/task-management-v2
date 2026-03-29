import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { TInitialDuration, TRenewalFrequency, TSubscriptionPurchaseChannel, TPlatform } from './subscriptionPlan.constant';
import { TCurrency } from '../../../enums/payment';
import { TSubscription } from '../../../enums/subscription';

export interface IConfirmPayment {
    userId: string | any;
    subscriptionPlanId: string | any;
    amount: string | any;
    duration: string | any;
    paymentIntentId? : string | any;
}


export interface ISubscriptionPlan {
  // _taskId: undefined | Types.ObjectId;
  _id?: Types.ObjectId; // undefined |  Types.ObjectId |
  subscriptionName : string;
  subscriptionType: TSubscription;

  initialDuration: TInitialDuration;
  renewalFrequncy: TRenewalFrequency;
  amount : string //number;

  currency: TCurrency;
  features: String[];

  /*-─────────────────────────────────
  |  Subscription Specific Features
  └──────────────────────────────────*/
  maxChildrenAccount : Number;

  // 🆕 Payment Gateway Configuration
  purchaseChannel: TSubscriptionPurchaseChannel;

  // Stripe Specific (for Business plans)
  stripe_product_id : String;
  stripe_price_id : String;

  // 🆕 RevenueCat Specific (for Individual plans)
  revenueCatProductIdentifier?: String;  // e.g., "individual_monthly"
  revenueCatPackageIdentifier?: String;  // e.g., "monthly"

  // 🆕 Platform availability
  availablePlatforms: TPlatform[];

  isActive : Boolean;
  isDeleted : Boolean;
  createdAt?: Date;
  updatedAt?: Date;
}


export interface ISubscriptionPlanModel extends Model<ISubscriptionPlan> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<ISubscriptionPlan>>;
}