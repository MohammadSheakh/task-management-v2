import { GenericService } from '../../_generic-module/generic.services';
import { UserSubscription } from '../userSubscription/userSubscription.model';
import { IUserSubscription } from '../userSubscription/userSubscription.interface';
import { User } from '../../user.module/user/user.model';
import { SubscriptionPlan } from '../subscriptionPlan/subscriptionPlan.model';
import { ISubscriptionPlan } from '../subscriptionPlan/subscriptionPlan.interface';
import ApiError from '../../../errors/ApiError';

//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { TSubscription } from '../../../enums/subscription';
import { PaymentTransaction } from '../../payment.module/paymentTransaction/paymentTransaction.model';
import { TPaymentGateway, TPaymentStatus } from '../../payment.module/paymentTransaction/paymentTransaction.constant';
import { UserSubscriptionStatusType } from '../userSubscription/userSubscription.constant';
import { TTransactionFor } from '../../../constants/TTransactionFor';
import { IUser } from '../../user.module/user/user.interface';

/**
 * RevenueCat Service
 * 
 * Handles RevenueCat subscription operations from admin dashboard
 * - Create manual subscriptions (for testing or special cases)
 * - Sync RevenueCat subscriptions
 * - Manage RevenueCat user IDs
 */
export class RevenueCatService extends GenericService<typeof UserSubscription, IUserSubscription> {
  constructor() {
    super(UserSubscription);
  }

  /**
   * Create a manual RevenueCat subscription from admin dashboard
   * This is useful for:
   * - Testing without going through RevenueCat
   * - Manual subscription grants (special cases, promotions, etc.)
   * - Migrating users from other systems
   */
  async createManualSubscription(
    userId: string,
    subscriptionPlanId: string,
    platform: 'ios' | 'android' | 'web',
    adminId: string
  ): Promise<IUserSubscription> {
    // Find user
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // Find subscription plan
    const subscriptionPlan = await SubscriptionPlan.findById(subscriptionPlanId);
    if (!subscriptionPlan) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription plan not found');
    }

    // Verify plan is for RevenueCat (Individual)
    if (subscriptionPlan.purchaseChannel !== 'revenuecat' && subscriptionPlan.purchaseChannel !== 'both') {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This plan is not configured for RevenueCat. Select an Individual plan.'
      );
    }

    // Generate a mock RevenueCat user ID if not exists
    if (!user.revenueCatUserId) {
      user.revenueCatUserId = `manual_${userId}_${Date.now()}`;
      await user.save();
    }

    // Create UserSubscription
    const newUserSubscription = await UserSubscription.create({
      userId: user._id,
      subscriptionPlanId: subscriptionPlan._id,
      paymentGateway: 'revenuecat',
      purchasePlatform: platform,
      revenueCatUserId: user.revenueCatUserId,
      revenueCatOrderId: `manual_${Date.now()}`,
      revenueCatTransactionId: `manual_txn_${Date.now()}`,
      revenueCatEnvironment: 'sandbox',
      subscriptionStartDate: new Date(),
      currentPeriodStartDate: new Date(),
      expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      billingCycle: 1,
      isAutoRenewed: false, // Manual subscription
      status: UserSubscriptionStatusType.active,
      isActive: true,
      isFromFreeTrial: false,
      cancelledAtPeriodEnd: false,
    });

    // Create PaymentTransaction (manual record)
    await PaymentTransaction.create({
      userId: user._id,
      referenceFor: TTransactionFor.UserSubscription,
      referenceId: newUserSubscription._id,
      paymentGateway: TPaymentGateway.revenuecat,
      revenueCatOrderId: newUserSubscription.revenueCatOrderId,
      revenueCatEnvironment: 'sandbox',
      platform: platform,
      amount: parseFloat(subscriptionPlan.amount as string) || 0,
      currency: 'USD',
      paymentStatus: TPaymentStatus.completed,
      gatewayResponse: {
        manual: true,
        createdBy: adminId,
        reason: 'Manual subscription grant from admin dashboard',
      },
    });

    // Update user subscription type
    await User.findByIdAndUpdate(userId, {
      $set: {
        subscriptionType: subscriptionPlan.subscriptionType as TSubscription,
      },
    });

    return newUserSubscription;
  }

  /**
   * Sync RevenueCat user ID to user profile
   */
  async syncRevenueCatUserId(
    userId: string,
    revenueCatUserId: string
  ): Promise<IUser> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { revenueCatUserId } },
      { new: true }
    );

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    return user;
  }

  /**
   * Get user's RevenueCat subscriptions
   */
  async getUserRevenueCatSubscriptions(userId: string): Promise<IUserSubscription[]> {
    return await UserSubscription.find({
      userId,
      paymentGateway: 'revenuecat',
      isDeleted: false,
    }).sort({ createdAt: -1 });
  }

  /**
   * Cancel a RevenueCat subscription (admin action)
   * Note: This only updates local DB. To cancel in RevenueCat,
   * you need to use RevenueCat API or dashboard.
   */
  async cancelRevenueCatSubscription(
    subscriptionId: string,
    reason?: string
  ): Promise<IUserSubscription> {
    const subscription = await UserSubscription.findById(subscriptionId);

    if (!subscription) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription not found');
    }

    if (subscription.paymentGateway !== 'revenuecat') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a RevenueCat subscription');
    }

    subscription.cancelledAt = new Date();
    subscription.cancelledAtPeriodEnd = true;
    subscription.status = UserSubscriptionStatusType.cancelling;
    await subscription.save();

    return subscription;
  }
}
