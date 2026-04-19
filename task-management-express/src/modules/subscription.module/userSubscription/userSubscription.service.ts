import ApiError from '../../../errors/ApiError';
import { GenericService } from '../../_generic-module/generic.services';
import { IUserSubscription } from './userSubscription.interface';
import { UserSubscription } from './userSubscription.model';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import Stripe from 'stripe';
import { config } from '../../../config';
import { TSubscription } from '../../../enums/subscription';
import { TCurrency } from '../../../enums/payment';
import { SubscriptionPlan } from '../subscriptionPlan/subscriptionPlan.model';
import { ISubscriptionPlan } from '../subscriptionPlan/subscriptionPlan.interface';
import { UserSubscriptionStatusType } from './userSubscription.constant';
import stripe from '../../../config/paymentGateways/stripe.config';
import { User } from '../../user.module/user/user.model';
import { IUser } from '../../user.module/user/user.interface';
import { TTransactionFor } from '../../../constants/TTransactionFor';
import {Types} from 'mongoose';
import { errorLogger, logger } from '../../../shared/logger';

export class UserSubscriptionService extends GenericService<
  typeof UserSubscription,
  IUserSubscription
> {
  private stripe: Stripe;

  constructor() {
    super(UserSubscription);
    this.stripe = stripe;
  }

  /**
   * Get user's subscription history (all purchased subscriptions)
   * V3 ENHANCEMENT: Complete subscription list with populated plan details
   * Figma: subscription-flow-v1.png (Subscription History Table)
   *
   * @param userId - User ID
   * @returns Array of user's subscriptions with plan details
   */
  async getMySubscriptionHistory(userId: string): Promise<any[]> {
    const subscriptions = await this.model
      .find({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
        // Exclude processing status (incomplete purchases)
        status: { $ne: UserSubscriptionStatusType.processing },
      })
      .populate('subscriptionPlanId', 'subscriptionName subscriptionType amount currency maxChildrenAccount')
      .sort({ createdAt: -1 }) // Most recent first
      .lean();

    // Format response to match Figma table columns
    return subscriptions.map(sub => ({
      _id: sub._id,
      userSubscriptionId: sub._id.toString().slice(-6).toUpperCase(), // Short ID for display (e.g., "ZZPP000")
      subscriptionName: sub.subscriptionPlanId?.subscriptionName || 'Unknown Plan',
      subscriptionType: sub.subscriptionPlanId?.subscriptionType || 'unknown',
      startDate: sub.subscriptionStartDate,
      currentPeriodDate: sub.currentPeriodStartDate,
      expireDate: sub.expirationDate,
      price: sub.subscriptionPlanId?.amount || '0',
      currency: sub.subscriptionPlanId?.currency || 'usd',
      status: sub.status,
      billingCycle: sub.billingCycle,
      isAutoRenewed: sub.isAutoRenewed,
      cancelledAtPeriodEnd: sub.cancelledAtPeriodEnd,
      stripe_subscription_id: sub.stripe_subscription_id,
      maxChildrenAccount: sub.subscriptionPlanId?.maxChildrenAccount || 0,
    }));
  }

  /**
   * Get user's active subscription with full details
   * V3 ENHANCEMENT: Returns active/trialing subscription with plan info
   * Figma: subscription-flow-v1.png (Active Subscription Card)
   *
   * @param userId - User ID
   * @returns Active subscription details or null
   */
  async getMyActiveSubscription(userId: string): Promise<any | null> {
    const subscription = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        status: { $in: [UserSubscriptionStatusType.active, UserSubscriptionStatusType.trialing] },
        isDeleted: false,
      })
      .populate('subscriptionPlanId', 'subscriptionName subscriptionType amount currency maxChildrenAccount')
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return null;
    }

    // Format response to match Figma card layout
    return {
      _id: subscription._id,
      userSubscriptionId: subscription._id.toString().slice(-6).toUpperCase(),
      subscriptionName: subscription.subscriptionPlanId?.subscriptionName || 'Unknown Plan',
      subscriptionType: subscription.subscriptionPlanId?.subscriptionType || 'unknown',
      description: `${subscription.subscriptionPlanId?.subscriptionType === 'business_level1' ? 'Designed for teachers, parents, and business managers' : 'Premium'} subscription package`,
      price: subscription.subscriptionPlanId?.amount || '0',
      currency: subscription.subscriptionPlanId?.currency || 'usd',
      billingInterval: 'month', // Default to monthly
      status: subscription.status,
      startDate: subscription.subscriptionStartDate,
      currentPeriodStart: subscription.currentPeriodStartDate,
      currentPeriodEnd: subscription.expirationDate,
      renewalDate: subscription.renewalDate,
      billingCycle: subscription.billingCycle,
      isAutoRenewed: subscription.isAutoRenewed,
      cancelledAtPeriodEnd: subscription.cancelledAtPeriodEnd,
      maxChildrenAccount: subscription.subscriptionPlanId?.maxChildrenAccount || 0,
      stripe_subscription_id: subscription.stripe_subscription_id,
      stripe_customer_id: subscription.stripe_customer_id,
      // Account structure info for Figma card
      accountStructure: {
        maxUsers: subscription.subscriptionPlanId?.maxChildrenAccount || 0,
        primaryAccounts: 1,
        secondaryAccounts: (subscription.subscriptionPlanId?.maxChildrenAccount || 0) - 1,
      },
    };
  }

  /**
   * Cancel user's active subscription
   * V3 ENHANCEMENT: Improved error handling and better response
   * Figma: subscription-flow-v1.png (Cancel Subscription Button)
   *
   * @param userId - User ID
   * @param subscriptionId - Optional: Specific subscription ID to cancel
   * @returns Cancellation result
   */
  async cancelMySubscription(userId: string, subscriptionId?: string): Promise<any> {
    // Check if user has any subscription in cancelling status
    const isCancelling = await this.model.exists({
      userId: new Types.ObjectId(userId),
      status: UserSubscriptionStatusType.cancelling,
      isDeleted: false,
    });

    if (isCancelling) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'You already have a pending subscription cancellation. It will be cancelled at the end of the billing cycle.',
      );
    }

    // Find the subscription to cancel
    let userSub: any;
    
    if (subscriptionId) {
      // Cancel specific subscription
      userSub = await this.model.findById(subscriptionId).lean();
      
      if (!userSub) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
      }
      
      if (userSub.userId.toString() !== userId) {
        throw new ApiError(StatusCodes.FORBIDDEN, 'You can only cancel your own subscription');
      }
    } else {
      // Cancel the most recent active subscription
      userSub = await this.model
        .findOne({
          userId: new Types.ObjectId(userId),
          status: { $in: [UserSubscriptionStatusType.active, UserSubscriptionStatusType.trialing] },
          isDeleted: false,
        })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!userSub || !userSub.stripe_subscription_id) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No active subscription found to cancel. Please make sure you have an active subscription.',
      );
    }

    // Check if already cancelled at period end
    if (userSub.cancelledAtPeriodEnd) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This subscription is already scheduled for cancellation at the end of the billing cycle.',
      );
    }

    try {
      // Cancel at period end via Stripe
      const canceledSub = await stripe.subscriptions.update(userSub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      // Update local subscription record
      await this.model.findByIdAndUpdate(userSub._id, {
        $set: {
          cancelledAtPeriodEnd: true,
          status: UserSubscriptionStatusType.cancelling,
        },
      });

      logger.info(`[Subscription Cancelled] User ${userId} cancelled subscription ${userSub._id}`);

      return {
        subscriptionId: userSub._id,
        stripeSubscriptionId: userSub.stripe_subscription_id,
        status: 'cancelling',
        message: `Your subscription will remain active until ${userSub.expirationDate?.toLocaleDateString() || 'the end of the billing cycle'}. After that, it will be cancelled.`,
        cancelledAt: new Date(),
        effectiveCancellationDate: userSub.expirationDate,
      };
    } catch (error) {
      errorLogger.error(`[Stripe Cancel Error] Failed to cancel subscription ${userSub.stripe_subscription_id}`, error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to cancel subscription with Stripe. Please try again or contact support.',
      );
    }
  }

  /**
   * Get user subscription details for admin dashboard
   * V3 ENHANCEMENT: Matches Figma subscription-details-of-a-person.png
   * Figma: figma-asset/main-admin-dashboard/subscription-details-of-a-person.png
   *
   * @param userId - User ID to get subscription details for
   * @returns User subscription details with personal information
   */
  async getUserSubscriptionDetailsForAdmin(userId: string): Promise<any> {
    const { User } = await import('../../user.module/user/user.model');
    const { UserProfile } = await import('../../user.module/userProfile/userProfile.model');
    const { PaymentTransaction } = await import('../../payment.module/paymentTransaction/paymentTransaction.model');

    // Get user's most recent subscription
    const subscription = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .populate('subscriptionPlanId', 'subscriptionName subscriptionType amount currency')
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return null;
    }

    // Get user details
    const user = await User.findById(userId)
      .select('name email phoneNumber profileImage profileId role')
      .lean();

    // Get user profile if exists
    let userProfile = null;
    if (user?.profileId) {
      userProfile = await UserProfile.findById(user.profileId)
        .select('address gender dateOfBirth location')
        .lean();
    }

    // Calculate age from date of birth
    let age = null;
    if (userProfile?.dateOfBirth) {
      const birthDate = new Date(userProfile.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Get payment transaction for this subscription
    const paymentTransaction = await PaymentTransaction.findOne({
      referenceId: subscription._id,
      referenceFor: 'UserSubscription',
      paymentStatus: 'completed',
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Format response to match Figma layout
    return {
      user: {
        _id: user?._id,
        name: user?.name,
        email: user?.email,
        profileImage: user?.profileImage,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
      },
      userProfile: {
        address: userProfile?.address || userProfile?.location || null,
        gender: userProfile?.gender || null,
        dateOfBirth: userProfile?.dateOfBirth || null,
        age: age,
      },
      subscriptionBuyingInformation: {
        _id: subscription._id,
        userSubscriptionId: subscription._id.toString().slice(-6).toUpperCase(),
        subscriptionType: subscription.subscriptionPlanId?.subscriptionType || subscription.subscriptionType || 'unknown',
        subscriptionName: subscription.subscriptionPlanId?.subscriptionName || 'Unknown Plan',
        buyingDate: subscription.subscriptionStartDate || subscription.createdAt,
        currentPeriodStartDate: subscription.currentPeriodStartDate,
        currentPeriodEndDate: subscription.expirationDate,
        transactionId: paymentTransaction?.transactionId || paymentTransaction?.paymentIntent || subscription.stripe_subscription_id || 'N/A',
        withdrawAmount: paymentTransaction?.amount || subscription.subscriptionPlanId?.amount || 0,
        currency: paymentTransaction?.currency || 'usd',
        subscriptionExpired: subscription.expirationDate,
        cancelledAtPeriodEnd: subscription.cancelledAtPeriodEnd || false,
        cancelDate: subscription.cancelledAt || null,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        isAutoRenewed: subscription.isAutoRenewed,
        stripe_subscription_id: subscription.stripe_subscription_id,
        paymentGateway: paymentTransaction?.paymentGateway || 'stripe',
      },
    };
  }

  /**
   * Get user subscription details for admin dashboard
   * V3 ENHANCEMENT: Matches Figma subscription-details-of-a-person.png
   * Figma: figma-asset/main-admin-dashboard/subscription-details-of-a-person.png
   *
   * @param userId - User ID to get subscription details for
   * @returns User subscription details with personal information
   */
  async getUserSubscriptionDetailsForAdmin(userId: string): Promise<any> {
    const { User } = await import('../../user.module/user/user.model');
    const { UserProfile } = await import('../../user.module/userProfile/userProfile.model');
    const { PaymentTransaction } = await import('../../payment.module/paymentTransaction/paymentTransaction.model');

    // Get user's most recent subscription
    const subscription = await this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .populate('subscriptionPlanId', 'subscriptionName subscriptionType amount currency')
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return null;
    }

    // Get user details
    const user = await User.findById(userId)
      .select('name email phoneNumber profileImage profileId role')
      .lean();

    // Get user profile if exists
    let userProfile = null;
    if (user?.profileId) {
      userProfile = await UserProfile.findById(user.profileId)
        .select('address gender dateOfBirth location')
        .lean();
    }

    // Calculate age from date of birth
    let age = null;
    if (userProfile?.dateOfBirth) {
      const birthDate = new Date(userProfile.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Get payment transaction for this subscription
    const paymentTransaction = await PaymentTransaction.findOne({
      referenceId: subscription._id,
      referenceFor: 'UserSubscription',
      paymentStatus: 'completed',
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Format response to match Figma layout
    return {
      user: {
        _id: user?._id,
        name: user?.name,
        email: user?.email,
        profileImage: user?.profileImage,
        phoneNumber: user?.phoneNumber,
        role: user?.role,
      },
      userProfile: {
        address: userProfile?.address || userProfile?.location || null,
        gender: userProfile?.gender || null,
        dateOfBirth: userProfile?.dateOfBirth || null,
        age: age,
      },
      subscriptionBuyingInformation: {
        _id: subscription._id,
        userSubscriptionId: subscription._id.toString().slice(-6).toUpperCase(),
        subscriptionType: subscription.subscriptionPlanId?.subscriptionType || subscription.subscriptionType || 'unknown',
        subscriptionName: subscription.subscriptionPlanId?.subscriptionName || 'Unknown Plan',
        buyingDate: subscription.subscriptionStartDate || subscription.createdAt,
        currentPeriodStartDate: subscription.currentPeriodStartDate,
        currentPeriodEndDate: subscription.expirationDate,
        transactionId: paymentTransaction?.transactionId || paymentTransaction?.paymentIntent || subscription.stripe_subscription_id || 'N/A',
        withdrawAmount: paymentTransaction?.amount || subscription.subscriptionPlanId?.amount || 0,
        currency: paymentTransaction?.currency || 'usd',
        subscriptionExpired: subscription.expirationDate,
        cancelledAtPeriodEnd: subscription.cancelledAtPeriodEnd || false,
        cancelDate: subscription.cancelledAt || null,
        status: subscription.status,
        billingCycle: subscription.billingCycle,
        isAutoRenewed: subscription.isAutoRenewed,
        stripe_subscription_id: subscription.stripe_subscription_id,
        paymentGateway: paymentTransaction?.paymentGateway || 'stripe',
      },
    };
  }

  /**
   * Get all subscribed users with current active subscriptions
   * V3 ENHANCEMENT: Matches Figma earning-flow.png filters
   * Figma: figma-asset/main-admin-dashboard/earning-flow.png
   *
   * @param filters - Query filters
   * @param options - Pagination options
   * @returns Paginated list of subscribed users
   */
  async getSubscribedUsersV3(
    filters: any,
    options: any,
  ): Promise<any> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Build match query for active subscriptions
    const matchQuery: any = {
      isDeleted: false,
      status: filters.status || { $in: ['active', 'trialing'] },
    };

    // Apply filters
    if (filters.subscriptionType) {
      matchQuery.subscriptionType = filters.subscriptionType;
    }
    if (filters.userId) {
      matchQuery.userId = new Types.ObjectId(filters.userId);
    }

    // Aggregation pipeline
    const pipeline = [
      { $match: matchQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscriptionPlanId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          userSubscriptionId: '$_id',
          user: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            profileImage: '$user.profileImage',
          },
          subscriptionType: {
            $ifNull: ['$plan.subscriptionType', '$subscriptionType'],
          },
          subscriptionName: {
            $ifNull: ['$plan.subscriptionName', 'Unknown Plan'],
          },
          price: {
            $ifNull: ['$plan.amount', 0],
          },
          currency: {
            $ifNull: ['$plan.currency', 'usd'],
          },
          status: '$status',
          subscriptionStartDate: '$subscriptionStartDate',
          currentPeriodStartDate: '$currentPeriodStartDate',
          expirationDate: '$expirationDate',
          billingCycle: '$billingCycle',
          isAutoRenewed: '$isAutoRenewed',
          createdAt: '$createdAt',
        },
      },
    ];

    // Get total count
    const countPipeline = [
      { $match: matchQuery },
      { $count: 'total' },
    ];

    const [data, countResult] = await Promise.all([
      this.model.aggregate(pipeline),
      this.model.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages,
      },
    };
  }

  startFreeTrial = async (
    userId: string | undefined,
    subscriptionPlanId: string,
  ): Promise<any> => {
    /*******
     *  1. check users hasUsedFreeTrial
     *  2. +++++++ if true -> it means user is not eligible for free trial
     *  3. +++++++ if false -> he can start free trial ..
     *  4. -----------------------------
     *  5. we need to make sure after 7 days free trial end .. in what subscription rate
     *  6. we charge that customer ..
     *  7. we need to create a stripe checkout session for the user so that
     *  8. we can collect payment information and start the free trial ...
     *  9. after 7 days it will automatically upgrade the user to the selected subscription plan
     *  10. **** hasUsedFreeTrial should be set to true
     *
     * ***** */

    const user: IUser = await User.findById(userId);

    if (user.hasUsedFreeTrial) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `User is not eligible for free trial`,
      );
    }

    /*--------------------------------------
        let stripeCustomer;
        if(!user.stripe_customer_id){
            let _stripeCustomer = await stripe.customers.create({
                name: user?.name, // name because this user is coming from database not JWT Token
                email: user?.email,
            });
            
            stripeCustomer = _stripeCustomer.id;

            await User.findByIdAndUpdate(user?._id, { $set: { stripe_customer_id: stripeCustomer } }); 
        }else{
            stripeCustomer = user.stripe_customer_id;
        }
        -------------------------------------*/

    let stripeCustomer = await getOrCreateStripeCustomer(user);
    /*---------------------------------------------
        
        if (!user.stripe_customer_id) {

            console.log(" 1 ")

                // 🔹 No customer ID saved — create a new one
                const _stripeCustomer = await stripe.customers.create({
                    name: user?.name,
                    email: user?.email,
                });


                stripeCustomer = _stripeCustomer.id;

                await User.findByIdAndUpdate(user._id, {
                    $set: { stripe_customer_id: stripeCustomer },
                });
            } else {
                try {
                    // 🔹 Check if existing Stripe customer still exists
                    const retriveUser = await stripe.customers.retrieve(user.stripe_customer_id);

                    console.log("retriveUser ::", retriveUser)

                    if (retriveUser.deleted) {
                        // Customer deleted or invalid → recreate and update DB
                        const _stripeCustomer = await stripe.customers.create({
                            name: user?.name,
                            email: user?.email,
                        });

                        stripeCustomer = _stripeCustomer.id;

                        await User.findByIdAndUpdate(user._id, {
                            $set: { stripe_customer_id: stripeCustomer },
                        });
                    }
                } catch (err) {

                    console.log(" 3 ")
                    if (err.raw && err.raw.code === "resource_missing") {
                        // console.warn("⚠️ Stripe customer not found, recreating...");

                        // Customer deleted or invalid → recreate and update DB
                        const _stripeCustomer = await stripe.customers.create({
                            name: user?.name,
                            email: user?.email,
                        });

                        stripeCustomer = _stripeCustomer.id;

                        await User.findByIdAndUpdate(user._id, {
                            $set: { stripe_customer_id: stripeCustomer },
                        });
                    } else {

                        console.log("❌ Unexpected error when retrieving Stripe customer:", err);   

                        throw err; // rethrow other unexpected errors
                    }
                }1
        }

        ---------------------------------------------*/

    //---------------------------------
    // get active standard plan priceId from database
    //---------------------------------
    const plan: ISubscriptionPlan = await SubscriptionPlan.findOne({
      // subscriptionType: TSubscription.individual,
      _id: subscriptionPlanId,
      isActive: true,
    });

    if (!plan) {
      throw new ApiError(StatusCodes.NOT_FOUND, `No active plan found`);
    }
    //---------------------------------
    // Lets create a userSubscription // TODO : we have to check already have userSubsription or not ..
    //---------------------------------

    const newUserSubscription: IUserSubscription =
      await UserSubscription.create({
        userId: user._id, //🔗
        subscriptionPlanId: null, //🔗this will be assign after free trial end .. if stripe charge 70 dollar .. and in webhook we update this with standard plan
        subscriptionStartDate: new Date(),
        currentPeriodStartDate: null, // new Date(), // ⚡ we will update this in webhook after successful payment
        expirationDate: null, // new Date(new Date().setDate(new Date().getDate() + 1)), // 1 days free trial
        isFromFreeTrial: true, // this is from free trial
        cancelledAtPeriodEnd: false,
        status: UserSubscriptionStatusType.processing,
        // isAutoRenewed : 70 dollar pay houar pore true hobe
        // billingCycle :  it should be 1 .. after first 70 dollar payment
        // renewalDate : will be updated after 70 dollar for standard plan successful payment in webhook
        stripe_subscription_id: null, // because its free trial // after 70 dollar payment we will update this
        stripe_transaction_id: null, // because its free trial // after 70 dollar payment we will update this
        billingCycle: 0, // because its free trial
        // ⚡⚡⚡⚡ must null assign korte hobe renewal date e
        paymentGateway: 'stripe',
        /******
         *
         * when a user cancel his subscription
         *
         * we add that date at ** cancelledAt **
         *
         * ** status ** -> cancelled
         *
         * ******* */
      });

    // Create Stripe Checkout Session for trial with card collection
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomer,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripe_price_id /*config.stripe.standard_plan_price_id,*/,
          //---------------------------------
          // 🟢 70 dollar er priceId provide korte hobe .. which is comes from env file
          //---------------------------------
          quantity: 1,
        },
      ],

      // 🎯 KEY: TRIAL SETUP WITH CARD COLLECTION
      subscription_data: {
        trial_period_days: 7, // 7 days
        metadata: {
          userId: user._id.toString(),
          subscriptionType: TSubscription.individual.toString(),
          subscriptionPlanId: plan._id.toString(),
          referenceId: newUserSubscription._id.toString(),
          referenceFor: TTransactionFor.UserSubscription.toString(),
          /*****
           * because after 7 days .. after 70 dollar payment successful
           *
           * we need to create a payment transaction for this userSubscription
           * for that we need referenceId and referenceFor
           *
           * ******* */
          currency: TCurrency.usd.toString(),
          amount: plan.amount.toString(), // because its free trial and customer just book this
        },
      },
      success_url: config.stripe.success_url,
      cancel_url: config.stripe.cancel_url,
    });

    // always update hasUsedFreeTrial after session create
    await User.findByIdAndUpdate(user?._id, {
      $set: { hasUsedFreeTrial: true },
    }); // 🚩

    // TODO : MUST :  Try catch use korte hobe

    return session.url;
  };
}

export async function getOrCreateStripeCustomer(user: IUser): Promise<any> {
  let stripeCustomer: any;

  if (!user.stripe_customer_id) {
    // 🔹 No customer ID saved — create a new one
    const _stripeCustomer = await stripe.customers.create({
      name: user?.name,
      email: user?.email,
    });

    stripeCustomer = _stripeCustomer.id;

    await User.findByIdAndUpdate(user._id, {
      $set: { stripe_customer_id: stripeCustomer },
    });

    return stripeCustomer;
  } else {
    try {
      // 🔹 Check if existing Stripe customer still exists
      const retriveUser = await stripe.customers.retrieve(
        user.stripe_customer_id,
      );

      if (retriveUser.deleted) {
        // Customer deleted or invalid → recreate and update DB
        const _stripeCustomer = await stripe.customers.create({
          name: user?.name,
          email: user?.email,
        });

        stripeCustomer = _stripeCustomer.id;

        await User.findByIdAndUpdate(user._id, {
          $set: { stripe_customer_id: stripeCustomer },
        });

        return stripeCustomer;
      }
    } catch (err) {
      if (err.raw && err.raw.code === 'resource_missing') {
        // console.warn("⚠️ Stripe customer not found, recreating...");

        // Customer deleted or invalid → recreate and update DB
        const _stripeCustomer = await stripe.customers.create({
          name: user?.name,
          email: user?.email,
        });

        stripeCustomer = _stripeCustomer.id;

        await User.findByIdAndUpdate(user._id, {
          $set: { stripe_customer_id: stripeCustomer },
        });

        return stripeCustomer;
      } else {
        console.log(
          '❌ Unexpected error when retrieving Stripe customer:',
          err,
        );

        throw err; // rethrow other unexpected errors
      }
    }
  }
}

///////////////// OPTIONS ...
// Collect card but don't charge immediately
// payment_intent_data: {
//     setup_future_usage: 'off_session', // Save card for future charges
// },

//////////////// GIVEN BY GPT
// Success/Cancel URLs
// success_url: `${process.env.FRONTEND_URL}/trial-success?session_id={CHECKOUT_SESSION_ID}`,
// cancel_url: `${process.env.FRONTEND_URL}/trial-cancelled`,
