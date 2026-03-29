//@ts-ignore
import { model, Schema } from 'mongoose';
import paginate from '../../../common/plugins/paginate';
import { IPaymentTransaction, IPaymentTransactionModel } from './paymentTransaction.interface';
import { TPaymentGateway, TPaymentStatus } from './paymentTransaction.constant';
import { TCurrency } from '../../../enums/payment';
import { TTransactionFor } from '../../../constants/TTransactionFor';

const paymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    userId: {//🔗 who create this transaction // who send money
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    /********
     * 📝 INFO
     * referenceFor and referenceId are also use in
     * WalletTransactionHistory model
     *
     * If you update here please update there also
     *
     * ******** */
    referenceFor: {
      type: String,
      enum: [
        TTransactionFor.UserSubscription, // previously it was SubscriptionPlan
        TTransactionFor.PurchasedJourney,
        TTransactionFor.PurchasedAdminCapsule,
      ],
      required: [true, `referenceFor is required .. it can be  ${Object.values(TTransactionFor).join(
        ', '
      )}`],
    },

    referenceId: { type: Schema.Types.ObjectId, refPath: 'referenceFor',
       required: [true, 'referenceId is required']
    },

    //---------------------------------
    // const refModel = mongoose.model(result.type);
    // const isExistRefference = await refModel.findById(result.refferenceId).session(session);
    //---------------------------------

    paymentGateway: {
      type: String,
      enum: [
        TPaymentGateway.stripe,
        TPaymentGateway.paypal,
        TPaymentGateway.sslcommerz,
        TPaymentGateway.revenuecat,  // 🆕 Added RevenueCat
        TPaymentGateway.none
      ],
      required: [true, `paymentGateway is required .. it can be  ${Object.values(TPaymentGateway).join(
              ', '
            )}`],
    },
    transactionId: { // from kappes
      type: String,
      default: null,
    },
    paymentIntent: { // from kappes
      type: String,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount must be greater than zero']
    },
    currency: {
      type: String,
      enum: [TCurrency.usd], // BDT
      required: true
    },
    paymentStatus: {
      type: String,
      enum: [
        TPaymentStatus.pending, // TODO : we need to add description for each of this
        TPaymentStatus.processing,
        TPaymentStatus.completed,
        TPaymentStatus.failed,
        TPaymentStatus.refunded,
        TPaymentStatus.cancelled,
        TPaymentStatus.partially_refunded,
        TPaymentStatus.disputed
      ],
      default: TPaymentStatus.pending
    },

    gatewayResponse: { // from kappes
      //---------------------------------
      // we need to store full response .. this will help us to debug payment related issue
      //---------------------------------
      type: Schema.Types.Mixed,
      default: null,
    },
    
    // 🆕 RevenueCat Specific Fields
    revenueCatOrderId: {
      type: String,
      default: null,
    },
    revenueCatEnvironment: {
      type: String,
      enum: ['production', 'sandbox'],
      default: null,
    },
    platform: {
      type: String,
      enum: ['ios', 'android', 'web'],
      default: null,
    },
    
    isDeleted: {
      type: Boolean,
      required: [false, 'isDeleted is not required'],
      default: false,
    },
  },
  { timestamps: true }
);

paymentTransactionSchema.plugin(paginate);

paymentTransactionSchema.pre('save', function(next) {
  // Rename _id to _projectId
  // this._taskId = this._id;
  // this._id = undefined;  // Remove the default _id field

  next();
});


// Use transform to rename _id to _projectId
paymentTransactionSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._paymentTransactionId = ret._id;  // Rename _id to _paymentTransactionId
    delete ret._id;  // Remove the original _id field
    return ret;
  }
});


export const PaymentTransaction = model<IPaymentTransaction, IPaymentTransactionModel>(
  'PaymentTransaction',
  paymentTransactionSchema
);


/***********************
    // For product purchases
    orderId: {//🔗
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: function() { return this.type.toString() === 'order'; }
    },
    // For subscription payments
    subscriptionId: { //🔗
      type: Schema.Types.ObjectId,
      // ref: 'UserSubscription',
      ref: 'Subscription',
      required: function() { return this.type.toString() === 'subscription'; } // 🔥🔥 bujhi nai 
    },

    bookedLabTestId: { //🔗
      type: Schema.Types.ObjectId,
      ref: 'LabTestBooking',
      required: function() { return this.type.toString() === 'labTest'; }
    },

    bookedAppointmentId : { //🔗
      type: Schema.Types.ObjectId,
      ref: 'DoctorPatientScheduleBooking',
      required: function() { return this.type.toString() === 'appointment'; }
    },

    bookedWorkoutClassScheduleId: { //🔗
      type: Schema.Types.ObjectId,
      ref: 'SpecialistPatientScheduleBooking',
      required: function() { return this.type.toString() === 'workoutClass'; }
    },

    bookedTrainingProgramId: {
      type: Schema.Types.ObjectId,
      ref: 'TrainingProgram',
      required: function() { return this.type.toString() === 'trainingProgram'; }
    },
    *********************************/