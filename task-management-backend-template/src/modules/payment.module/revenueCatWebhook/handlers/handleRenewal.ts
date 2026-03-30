import { UserSubscription } from '../../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../user.module/user/user.model';
import { PaymentTransaction } from '../../paymentTransaction/paymentTransaction.model';
import { TPaymentGateway, TPaymentStatus } from '../../paymentTransaction/paymentTransaction.constant';
import { TTransactionFor } from '../../../../constants/TTransactionFor';
import { UserSubscriptionStatusType } from '../../../subscription.module/userSubscription/userSubscription.constant';
// import { enqueueWebNotification } from '../../../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
// import { TRole } from '../../../../middlewares/roles'; // ❌ Deprecated - migrated to notification.module
// import { TNotificationType } from '../../../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { NotificationService } from '../../../notification.module/notification/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../../notification.module/notification/notification.constant';

/**
 * Handle RENEWAL Event
 * 
 * Triggered when a subscription is renewed (successful payment)
 * Updates the UserSubscription dates and creates a new PaymentTransaction
 */
export const handleRenewal = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleRenewal :: ', event);

    const {
      product_id,
      subscriber,
      environment,
    } = event;

    const revenueCatUserId = subscriber.original_app_user_id;
    const platform = subscriber.original_platform;
    const orderId = event.id || event.event_id;
    const transactionId = event.transaction_id || orderId;

    // Find user by RevenueCat user ID
    const user = await User.findOne({ revenueCatUserId });

    if (!user) {
      console.error('❌ User not found for RevenueCat user:', revenueCatUserId);
      return;
    }

    // Find the active subscription
    const userSubscription = await UserSubscription.findOne({
      userId: user._id,
      paymentGateway: 'revenuecat',
      status: UserSubscriptionStatusType.active,
    }).sort({ createdAt: -1 });

    if (!userSubscription) {
      console.error('❌ No active RevenueCat subscription found for user:', user.email);
      return;
    }

    // Update subscription dates
    userSubscription.currentPeriodStartDate = new Date(event.event_time_ms);
    userSubscription.expirationDate = new Date(subscriber.expiration_at_ms);
    userSubscription.renewalDate = new Date(subscriber.expiration_at_ms);
    userSubscription.billingCycle += 1;
    await userSubscription.save();

    console.log('✅ UserSubscription renewed, billing cycle:', userSubscription.billingCycle);

    // Create PaymentTransaction for renewal
    const newPayment = await PaymentTransaction.create({
      userId: user._id,
      referenceFor: TTransactionFor.UserSubscription,
      referenceId: userSubscription._id,
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

    console.log('✅ Renewal PaymentTransaction created:', newPayment._id);

    /*-─────────────────────────────────
    |  ❌ OLD: enqueueWebNotification (Deprecated)
    |  await enqueueWebNotification(
    |    `Your subscription has been renewed successfully! Next billing date: ${userSubscription.expirationDate.toDateString()}`,
    |    user._id,
    |    user._id,
    |    TRole.user,
    |    TNotificationType.payment,
    |    null,
    |    userSubscription._id
    |  );
    └──────────────────────────────────*/

    // ✅ NEW: Scalable notification.module implementation
    const notificationService = new NotificationService();
    await notificationService.createNotification({
      receiverId: new Types.ObjectId(user._id as string),
      senderId: new Types.ObjectId(user._id as string),
      title: 'Subscription Renewed',
      subTitle: `Your subscription has been renewed successfully! Next billing date: ${userSubscription.expirationDate.toDateString()}`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      linkFor: 'subscription',
      linkId: new Types.ObjectId(userSubscription._id as string),
      referenceFor: 'subscription',
      referenceId: new Types.ObjectId(userSubscription._id as string),
      data: {
        subscriptionId: userSubscription._id,
        eventType: 'renewal',
        nextBillingDate: userSubscription.expirationDate,
      }
    });

    console.log('✅ Renewal notification sent to user');
  } catch (error) {
    console.error('❌ Error in handleRenewal:', error);
    throw error;
  }
};
