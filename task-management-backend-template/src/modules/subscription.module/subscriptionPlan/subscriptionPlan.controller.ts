//@ts-ignore
import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import { GenericController } from '../../_generic-module/generic.controller';
import { IConfirmPayment, ISubscriptionPlan } from './subscriptionPlan.interface';
import { SubscriptionPlanService } from './subscriptionPlan.service';
import sendResponse from '../../../shared/sendResponse';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import Stripe from 'stripe';
import ApiError from '../../../errors/ApiError';
import { TInitialDuration, TRenewalFrequency } from './subscriptionPlan.constant';
//@ts-ignore
import mongoose from 'mongoose';
import { PaymentTransactionService } from '../../payment.module/paymentTransaction/paymentTransaction.service';
import { SubscriptionPlan } from './subscriptionPlan.model';

import { TCurrency } from '../../../enums/payment';
import { IUser } from '../../token/token.interface';
import { TSubscription } from '../../../enums/subscription';
import { IUserSubscription } from '../userSubscription/userSubscription.interface';
import { UserSubscriptionStatusType } from '../userSubscription/userSubscription.constant';
import { UserSubscription } from '../userSubscription/userSubscription.model';
import { config } from '../../../config';
import { enqueueWebNotification } from '../../../services/notification.service';
import { TRole } from '../../../middlewares/roles';
import { TNotificationType } from '../../notification/notification.constants';
import { UserService } from '../../user.module/user/user.service';
import stripe from '../../../config/paymentGateways/stripe.config';
import { User } from '../../user.module/user/user.model';

const subscriptionPlanService = new SubscriptionPlanService();
const userService = new UserService();

const paymentTransactionService = new PaymentTransactionService();

export class SubscriptionController extends GenericController<
  typeof SubscriptionPlan,
  ISubscriptionPlan
> {
  private stripe: Stripe;

  constructor() {
    super(new SubscriptionPlanService(), 'Subscription Plan');
    // Initialize Stripe with secret key (from your Stripe Dashboard) // https://dashboard.stripe.com/test/dashboard
    this.stripe = stripe;
  }

  purchaseSubscriptionForSuplify = catchAsync(async (req: Request, res: Response) => {
    // TODO : in middleware we have to validate this subscriptionPlanId

    const { subscriptionPlanId } = req.params;

    if (!subscriptionPlanId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Subscription Plan ID is required in params' // TODO :  do this validation in middleware
      );
    }

    const checkoutUrl = await new SubscriptionPlanService()
    .purchaseSubscriptionForSuplify(
      subscriptionPlanId,
      (req.user as IUser)//.userId
    );


    // 🔗 Send Checkout URL to frontend
    sendResponse(res, {
        code: StatusCodes.OK,
        data: checkoutUrl,
        message: `Redirect to Checkout`,
        success: true,
    });
  });

  //-----------------------------------------
  // 🆕 RevenueCat Purchase Endpoint (for Mobile Apps)
  // POST /api/v1/subscription-plans/revenuecat-purchase/:subscriptionPlanId
  //-----------------------------------------
  purchaseRevenueCatSubscription = catchAsync(async (req: Request, res: Response) => {
    const { subscriptionPlanId } = req.params;
    const user = req.user as IUser;

    if (!subscriptionPlanId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Subscription Plan ID is required in params'
      );
    }

    // Get subscription plan
    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);

    if (!subscriptionPlan) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Subscription plan not found'
      );
    }

    // Verify this is a RevenueCat plan
    if (subscriptionPlan.purchaseChannel !== 'revenuecat' && subscriptionPlan.purchaseChannel !== 'both') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This plan is not configured for RevenueCat. Select an Individual plan.'
      );
    }

    // Get or create user in RevenueCat
    let revenueCatUserId = user.revenueCatUserId;
    
    if (!revenueCatUserId) {
      // Generate RevenueCat user ID (using user's MongoDB ID)
      revenueCatUserId = user.userId.toString();
      
      // Update user with RevenueCat ID
      await User.findByIdAndUpdate(user.userId, {
        $set: { revenueCatUserId }
      });
    }

    // Return RevenueCat configuration for mobile SDK
    const revenueCatConfig = {
      // RevenueCat API Key (public key, safe for client-side)
      apiKey: config.revenueCat?.apiKey || process.env.REVENUECAT_API_KEY,
      
      // User's RevenueCat ID
      appUserId: revenueCatUserId,
      
      // Product identifier (must match RevenueCat dashboard)
      productIdentifier: subscriptionPlan.revenueCatProductIdentifier,
      packageIdentifier: subscriptionPlan.revenueCatPackageIdentifier,
      
      // Plan details
      planDetails: {
        subscriptionName: subscriptionPlan.subscriptionName,
        subscriptionType: subscriptionPlan.subscriptionType,
        amount: subscriptionPlan.amount,
        currency: subscriptionPlan.currency,
        availablePlatforms: subscriptionPlan.availablePlatforms,
      },
      
      // Instructions for mobile app
      instructions: {
        ios: 'Use RevenueCat SDK to purchase package on iOS App Store',
        android: 'Use RevenueCat SDK to purchase package on Google Play Store',
        nextStep: 'After purchase, RevenueCat webhook will automatically update your subscription status'
      }
    };

    sendResponse(res, {
      code: StatusCodes.OK,
      data: revenueCatConfig,
      message: 'RevenueCat purchase configuration retrieved. Use this config with RevenueCat SDK in your mobile app.',
      success: true,
    });
  });


  //-----------------------------------------
  // Cancel subscription 
  //-----------------------------------------
  // POST /api/subscription/cancel
  cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const user = req.user as IUser;
    
    const isCancelling = await UserSubscription.exists(
      { 
        // _id: userSub._id, 
        userId: user.userId,
        status: UserSubscriptionStatusType.cancelling
      }
    );

    if (isCancelling) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'You already cancel your subscription');
    }

    // ISSUE : lets say user er duita subscription ek shathe purchase kora ase .. specific konta cancel hobe .. 
    // sheta bola hoy nai 
    const userSub:IUserSubscription = await UserSubscription.findOne({
       userId: user.userId,
       status: UserSubscriptionStatusType.active 
    });

    if (!userSub || !userSub.stripe_subscription_id) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'No active subscription found');
    }

    const canceledSub = await stripe.subscriptions.update(userSub.stripe_subscription_id, {
        cancel_at_period_end: true,
    });

    if (!canceledSub) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to cancel subscription');
    }

    // it will cancel the subscription at the end of the billing cycle
    await UserSubscription.findByIdAndUpdate(userSub._id, {
      $set: { 
        cancelledAtPeriodEnd: true, 
        status: UserSubscriptionStatusType.cancelling 
      },
    });

    // TODO : MUST : Send Notification to admin that .. a person cancel subscription

    await enqueueWebNotification(
      // TODO : MUST : subscription plan name can not be shown from user.subscriptionPlan field .. we have to fetch current subscription status .. not from JWT token
      `A User ${user.userId} ${user.subscriptionPlan} Cancel his subscription ${userSub.subscriptionPlanId} at ${new Date()}.`,
      user.userId, // senderId
      null, // receiverId
      TRole.admin, // receiverRole
      TNotificationType.payment, // type
      null, // linkFor
      null // linkId
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Subscription will cancel at the end of the billing cycle',
      data: canceledSub,
    });
  });


  /*-───────────────────────────────── ❌
  | as per clients requirement .. client wants to cancel a persons subscription from the admin end ..
  | and assign him vise subscription .. 

  | ===== we move these logic to service layer .. and call these logic from >>requestForViseSubscriptionToAdmin.controller<<
  └──────────────────────────────────*/
  cancelPatientsSubscriptionAndAssignViceSubscription = catchAsync(async (req : Request, res : Response) => {
    const {userId} = req.query.personId;
    
    const isCancelling = await UserSubscription.exists(
      { 
        // _id: userSub._id, 
        userId: userId,
        status: UserSubscriptionStatusType.cancelling
      }
    );

    // if (isCancelling) {
    //     throw new ApiError(StatusCodes.BAD_REQUEST, 'You already cancel your subscription');
    // }

    const userSub:IUserSubscription = await UserSubscription.findOne({
       userId: userId,
       status: UserSubscriptionStatusType.active 
    });

    if (!userSub || !userSub.stripe_subscription_id) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'No active subscription found');
    }

    const canceledSub = await stripe.subscriptions.update(userSub.stripe_subscription_id, {
        cancel_at_period_end: true,
    });

    if (!canceledSub) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Failed to cancel subscription');
    }

    // it will cancel the subscription at the end of the billing cycle
    await UserSubscription.findByIdAndUpdate(userSub._id, {
      $set: { 
        cancelledAtPeriodEnd: true, 
        status: UserSubscriptionStatusType.cancelling 
      },
    });

    //  Send Notification to patient that .. admin cancel your current subscription and assign vice subscription to you
    await enqueueWebNotification(
      `Admin cancel your current subscription ${user.subscriptionPlan} and assign vice subscription to you.`,
      user.userId, // senderId
      null, // receiverId
      TRole.admin, // receiverRole
      TNotificationType.payment, // type
      null, // linkFor
      null // linkId
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Subscription will cancel at the end of the billing cycle And Vice Subscription is successfully assigned.',
      data: canceledSub,
    });
  })

  // ⚡⚡ From Fertie Project to suplify project to task-mgmt
  /*
   * As Admin can create subscription plan ...
   * // TODO : MUST : this should move to service layer ..
   *
  */
  create = catchAsync(async (req: Request, res: Response) => {

    // make existing plans isActive false .. 
    const existingPlan = await SubscriptionPlan.find({
      isActive: true,
      subscriptionType : req.body.subscriptionType
    });

    existingPlan.forEach(async (plan:ISubscriptionPlan) => {
      plan.isActive = false;
      await plan.save();
    });

    const data : ISubscriptionPlan = req.body;

    data.subscriptionName = req.body.subscriptionName;
    data.amount = req.body.amount;
    data.subscriptionType = req.body.subscriptionType;
    data.initialDuration = TInitialDuration.month;
    data.renewalFrequncy = TRenewalFrequency.monthly;
    data.currency = TCurrency.usd;
    
    // 🆕 Set purchase channel based on subscription type
    if (req.body.subscriptionType === TSubscription.individual) {
      data.purchaseChannel = 'revenuecat';  // Individual plans use RevenueCat
      data.availablePlatforms = ['ios', 'android'];
    } else {
      data.purchaseChannel = 'stripe';  // Business plans use Stripe
      data.availablePlatforms = ['web'];
    }

    // now we have to create stripe product and price (for Business plans)
    // and then we have to save the productId and priceId in our database
    if (data.purchaseChannel === 'stripe' || data.purchaseChannel === 'both') {
      const product = await this.stripe.products.create({
        name: data.subscriptionType,
        description: `Subscription plan for ${data.subscriptionType}`,
      });

      const price = await this.stripe.prices.create({
        unit_amount: Math.round(parseFloat(data?.amount) * 100), // Amount in cents
        currency: data.currency,
        // -- as i dont want to make this recurring ...
        recurring: {
          interval: 'month', // or 'year' for yearly subscriptions
          interval_count: 1, // every 1 month
        },
        product: product.id,
      });
      data.stripe_product_id = product.id;
      data.stripe_price_id = price.id;
    }
    
    // 🆕 For RevenueCat plans, admin needs to create products in RevenueCat dashboard
    // RevenueCat product identifier should be provided in request
    if (data.purchaseChannel === 'revenuecat' || data.purchaseChannel === 'both') {
      data.revenueCatProductIdentifier = req.body.revenueCatProductIdentifier || `${data.subscriptionType}_monthly`;
      data.revenueCatPackageIdentifier = req.body.revenueCatPackageIdentifier || 'monthly';
    }
    
    data.isActive = true;

    const result = await this.service.create(data);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `${this.modelName} created successfully`,
      success: true,
    });
  }
  );

  /*
    if admin wants to update a subscription plan , 
    then we have to create new stripe product and price and update the productId and priceId in our database

    lets see how it goes .. we can modify it later if needed
  */  

    /*
  updateById = catchAsync(async (req: Request, res: Response) => {
    const data : ISubscriptionPlan = req.body;
    
    data.subscriptionName = req.body.subscriptionName;
    data.amount = req.body.amount;
    data.subscriptionType = TSubscription.premium;
    data.initialDuration = TInitialDuration.month;
    data.renewalFrequncy = TRenewalFrequency.monthly;
    data.currency = TCurrency.usd;
    data.features = req.body.features;

    if(!data.amount){
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `amount is required`
      );
    }

    // now we have to create stripe product and price 
    // and then we have to save the productId and priceId in our database
    const product = await this.stripe.products.create({
      name: data.subscriptionType,
      description: `Subscription plan for ${data.subscriptionType}`,
    });

    const price = await this.stripe.prices.create({
      unit_amount: data?.amount * 100, // Amount in cents
      currency: data.currency,
      recurring: {
        interval: 'month', // or 'year' for yearly subscriptions
        interval_count: 1, // Number of intervals (e.g., 1 month)
      },
      product: product.id,
    });
    
    data.stripe_product_id = product.id;
    data.stripe_price_id = price.id;

    const result = await this.service.updateById(req.params.id, data);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `${this.modelName} updated successfully`,
      success: true,
    });
  });
  */



  // add more methods here if needed or override the existing ones
}
