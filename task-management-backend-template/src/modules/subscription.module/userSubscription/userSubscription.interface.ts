import { Model, Types } from 'mongoose';


import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { UserSubscriptionStatusType, TSubscriptionGateway, TPaymentEnvironment, TPlatform } from './userSubscription.constant';

export interface IUserSubscription {
  // _taskId: undefined | Types.ObjectId;
  _id?: Types.ObjectId; // undefined |  Types.ObjectId |
  userId :  Types.ObjectId; //🔗
  subscriptionPlanId: Types.ObjectId; //🔗
  subscriptionStartDate : Date;
  currentPeriodStartDate : Date;
  expirationDate : Date;
  renewalDate : Date;
  billingCycle: number;
  isAutoRenewed : boolean;
  cancelledAt :  Date ;
  cancelledAtPeriodEnd : boolean;
  status: UserSubscriptionStatusType;

  // 🆕 Payment Gateway Tracking
  paymentGateway: TSubscriptionGateway;

  // Stripe Specific (for Business plans)
  stripe_subscription_id : string; // 🟢🟢 for recurring payment
  stripe_transaction_id : string; // 🟢🟢 for one time payment
  stripe_customer_id?: string;

  // 🆕 RevenueCat Specific (for Individual plans)
  revenueCatUserId?: string;
  revenueCatOrderId?: string;
  revenueCatTransactionId?: string;
  appleReceiptData?: string;  // iOS receipt data
  googlePurchaseToken?: string;  // Android purchase token
  originalTransactionId?: string;  // For cross-platform upgrades
  revenueCatEnvironment?: TPaymentEnvironment;

  // 🆕 Purchase Platform
  purchasePlatform: TPlatform;

  isActive : boolean;

  isDeleted : boolean;
  createdAt?: Date;
  updatedAt?: Date;
 }

export interface IUserSubscriptionModel extends Model<IUserSubscription> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
    ) => Promise<PaginateResult<IUserSubscription>>;
}