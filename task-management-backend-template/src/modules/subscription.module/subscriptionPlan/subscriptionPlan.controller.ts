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
//@ts-ignore
import mongoose from 'mongoose';
import { PaymentTransactionService } from '../../payment.module/paymentTransaction/paymentTransaction.service';
import { SubscriptionPlan } from './subscriptionPlan.model';

import { IUser } from '../../token/token.interface';
import { TSubscription } from '../../../enums/subscription';
import { IUserSubscription } from '../userSubscription/userSubscription.interface';
import { UserSubscriptionStatusType } from '../userSubscription/userSubscription.constant';
import { UserSubscription } from '../userSubscription/userSubscription.model';
import { config } from '../../../config';
// import { enqueueWebNotification } from '../../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
// import { TRole } from '../../../middlewares/roles'; // ❌ Deprecated - migrated to notification.module
// import { TNotificationType } from '../../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { NotificationService } from '../../notification.module/notification/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../notification.module/notification/notification.constant';
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

    const userDetails = await User.findById(user.userId).select('revenueCatUserId');

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
    let revenueCatUserId = userDetails.revenueCatUserId;
    
    if (!revenueCatUserId) {
      // Generate RevenueCat user ID (using user's MongoDB ID)
      revenueCatUserId = user?.userId.toString();
      
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

    /*-─────────────────────────────────
    |  ❌ OLD: enqueueWebNotification (Deprecated)
    |  await enqueueWebNotification(
    |    // TODO : MUST : subscription plan name can not be shown from user.subscriptionPlan field .. we have to fetch current subscription status .. not from JWT token
    |    `A User ${user.userId} ${user.subscriptionPlan} Cancel his subscription ${userSub.subscriptionPlanId} at ${new Date()}.`,
    |    user.userId, // senderId
    |    null, // receiverId
    |    TRole.admin, // receiverRole
    |    TNotificationType.payment, // type
    |    null, // linkFor
    |    null // linkId
    |  );
    └──────────────────────────────────*/

    // ✅ NEW: Scalable notification.module implementation
    const notificationService = new NotificationService();
    await notificationService.createNotification({
      senderId: new Types.ObjectId(user.userId as string),
      receiverRole: 'admin',
      title: 'Subscription Cancelled',
      subTitle: `User cancelled their subscription`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'subscription',
      linkId: userSub._id,
      referenceFor: 'subscription',
      referenceId: userSub._id,
      data: {
        userId: user.userId,
        userEmail: user.email,
        subscriptionId: userSub._id,
        subscriptionPlanId: userSub.subscriptionPlanId,
      }
    });

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Subscription will cancel at the end of the billing cycle',
      data: canceledSub,
    });
  });


  

  // ⚡⚡ From Fertie Project to suplify project to task-mgmt
  /*
   * As Admin can create subscription plan ...
   * // TODO : MUST : this should move to service layer ..
   *
  */
  /*
   * Create Subscription Plan (Admin Dashboard)
   * 
   * Business Logic:
   * - Individual plans → RevenueCat (iOS/Android mobile apps)
   * - Business plans (business_starter, business_level1, business_level2) → Stripe (web)
   * 
   * RevenueCat Setup (Manual - Admin must create in dashboard):
   * 1. Go to https://dashboard.revenuecat.com
   * 2. Create Product with identifier: {subscriptionType}_monthly
   * 3. Link to App Store Connect (iOS) and Google Play Console (Android)
   * 4. Create Package with identifier: monthly
   * 
   * Stripe Setup (Automatic):
   * - Products and prices are created automatically via Stripe API
   */
  create = catchAsync(async (req: Request, res: Response) => {
    const result = await subscriptionPlanService.createSubscriptionPlan(req.body);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `Subscription Plan created successfully. ${result.plan.purchaseChannel === 'revenuecat' ? '⚠️ Remember to create the product in RevenueCat dashboard.' : '✅ Stripe product and price created automatically.'}`,
      success: true,
    });
  });

  /*
    if admin wants to update a subscription plan , 
    then we have to create new stripe product and price and update the productId and priceId in our database

    lets see how it goes .. we can modify it later if needed
  */  



  // add more methods here if needed or override the existing ones
}
