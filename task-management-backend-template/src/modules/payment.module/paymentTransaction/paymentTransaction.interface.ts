//@ts-ignore
import { Model, Types, Schema } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { TPaymentGateway, TPaymentStatus, TPaymentEnvironment, TPaymentPlatform } from './paymentTransaction.constant';
import { TCurrency } from '../../../enums/payment';
import { TTransactionFor } from '../../../constants/TTransactionFor';

export interface IPaymentTransaction {
  // _taskId: undefined | Types.ObjectId;
  _id?: Types.ObjectId; // undefined |  Types.ObjectId |
  userId: Types.ObjectId; //🔗
  referenceFor :  TTransactionFor; //🧩
  referenceId: Types.ObjectId; //🔗
  //---------------------------------
  // const refModel = mongoose.model(result.type);
  // const isExistRefference = await refModel.findById(result.refferenceId).session(session);
  //---------------------------------
  paymentGateway: TPaymentGateway;
  transactionId : string; // from kappes
  paymentIntent : string; // from kappes

  amount: number;
  currency: TCurrency;
  paymentStatus: TPaymentStatus;

    gatewayResponse: {
      type: Schema.Types.Mixed,
      default: null,
    };

  // 🆕 RevenueCat Specific Fields
  revenueCatOrderId?: string;
  revenueCatEnvironment?: TPaymentEnvironment;
  platform?: TPaymentPlatform;

  isDeleted? : Boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPaymentTransactionModel extends Model<IPaymentTransaction> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IPaymentTransaction>>;
}