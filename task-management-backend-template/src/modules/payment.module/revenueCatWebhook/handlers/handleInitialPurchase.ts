import { User } from '../../../user.module/user/user.model';
import { UserSubscription } from '../../../subscription.module/userSubscription/userSubscription.model';
import { PaymentTransaction } from '../../paymentTransaction/paymentTransaction.model';
import { TPaymentGateway, TPaymentStatus } from '../../paymentTransaction/paymentTransaction.constant';
import { TTransactionFor } from '../../../../constants/TTransactionFor';
import { UserSubscriptionStatusType } from '../../../subscription.module/userSubscription/userSubscription.constant';
import { TSubscription } from '../../../../enums/subscription';
// import { enqueueWebNotification } from '../../../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
// import { TRole } from '../../../../middlewares/roles'; // ❌ Deprecated - migrated to notification.module
// import { TNotificationType } from '../../../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { NotificationService } from '../../../notification.module/notification/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../../notification.module/notification/notification.constant';

/**
 * Handle INITIAL_PURCHASE Event
 * 
 * Triggered when a user makes their first purchase through RevenueCat
 * This creates the UserSubscription and PaymentTransaction records
 */
export const handleInitialPurchase = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleInitialPurchase :: ', event);

    const {
      api_version,
      event_id,
      event_time_ms,
      product_id,
      subscriber,
      environment,
    } = event;

    // Extract user info from RevenueCat event
    const revenueCatUserId = subscriber.original_app_user_id;
    const platform = subscriber.original_platform; // 'ios' or 'android'
    const orderId = event.id || event.event_id;
    const transactionId = event.transaction_id || orderId;

    // Find user by RevenueCat user ID
    const user = await User.findOne({ revenueCatUserId });

    if (!user) {
      console.error('❌ User not found for RevenueCat user:', revenueCatUserId);
      return;
    }

    console.log('✅ User found:', user.email, 'Platform:', platform);

    // Check if payment transaction already exists (idempotency)
    const existingTransaction = await PaymentTransaction.findOne({
      revenueCatOrderId: orderId,
    });

    if (existingTransaction) {
      console.log('⚠️ Transaction already exists:', orderId);
      return;
    }

    // Map RevenueCat product_id to subscription type
    const subscriptionType = mapProductToSubscriptionType(product_id);

    if (!subscriptionType) {
      console.error('❌ Unknown product_id:', product_id);
      return;
    }

    // Find the subscription plan
    const subscriptionPlan = await (await import('../../subscription.module/subscriptionPlan/subscriptionPlan.model')).SubscriptionPlan.findOne({
      subscriptionType,
      isActive: true,
    });

    if (!subscriptionPlan) {
      console.error('❌ Active subscription plan not found for type:', subscriptionType);
      return;
    }

    // Create UserSubscription
    const newUserSubscription = await UserSubscription.create({
      userId: user._id,
      subscriptionPlanId: subscriptionPlan._id,
      paymentGateway: 'revenuecat',
      purchasePlatform: platform as 'ios' | 'android' | 'web',
      revenueCatUserId,
      revenueCatOrderId: orderId,
      revenueCatTransactionId: transactionId,
      revenueCatEnvironment: environment as 'production' | 'sandbox',
      subscriptionStartDate: new Date(event.event_time_ms),
      currentPeriodStartDate: new Date(event.event_time_ms),
      expirationDate: new Date(subscriber.expiration_at_ms),
      renewalDate: new Date(subscriber.expiration_at_ms),
      billingCycle: 1,
      isAutoRenewed: true,
      status: UserSubscriptionStatusType.active,
      isActive: true,
      isFromFreeTrial: false,
      cancelledAtPeriodEnd: false,
    });

    console.log('✅ UserSubscription created:', newUserSubscription._id);

    // Create PaymentTransaction
    const newPayment = await PaymentTransaction.create({
      userId: user._id,
      referenceFor: TTransactionFor.UserSubscription,
      referenceId: newUserSubscription._id,
      paymentGateway: TPaymentGateway.revenuecat,
      transactionId: transactionId,
      revenueCatOrderId: orderId,
      revenueCatEnvironment: environment as 'production' | 'sandbox',
      platform: platform as 'ios' | 'android' | 'web',
      amount: parseFloat(event.product_price) || 0,
      currency: 'USD',
      paymentStatus: TPaymentStatus.completed,
      gatewayResponse: event,
    });

    console.log('✅ PaymentTransaction created:', newPayment._id);

    // Update User
    await User.findByIdAndUpdate(user._id, {
      $set: {
        subscriptionType: subscriptionType,
        revenueCatUserId,
      },
    });

    console.log('✅ User updated with subscription type:', subscriptionType);

    /*-─────────────────────────────────
    |  ❌ OLD: enqueueWebNotification (Deprecated)
    |  await enqueueWebNotification(
    |    `Your Individual subscription has been activated successfully!`,
    |    user._id,
    |    user._id,
    |    TRole.user,
    |    TNotificationType.payment,
    |    null,
    |    newUserSubscription._id
    |  );
    └──────────────────────────────────*/

    // ✅ NEW: Scalable notification.module implementation
    const notificationService = new NotificationService();
    await notificationService.createNotification({
      receiverId: new Types.ObjectId(user._id as string),
      senderId: new Types.ObjectId(user._id as string),
      title: 'Subscription Activated',
      subTitle: 'Your Individual subscription has been activated successfully!',
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      linkFor: 'subscription',
      linkId: new Types.ObjectId(newUserSubscription._id as string),
      referenceFor: 'subscription',
      referenceId: new Types.ObjectId(newUserSubscription._id as string),
      data: {
        subscriptionId: newUserSubscription._id,
        eventType: 'initial_purchase',
      }
    });

    console.log('✅ Notification sent to user');
  } catch (error) {
    console.error('❌ Error in handleInitialPurchase:', error);
    throw error;
  }
};

/**
 * Map RevenueCat product_id to subscription type
 * Update this mapping based on your RevenueCat product configuration
 */
function mapProductToSubscriptionType(product_id: string): TSubscription | null {
  // Example mappings - adjust based on your RevenueCat setup
  const productMapping: Record<string, TSubscription> = {
    'individual_monthly': TSubscription.individual,
    'individual_annual': TSubscription.individual,
    // Add more mappings as needed
  };

  return productMapping[product_id] || null;
}
