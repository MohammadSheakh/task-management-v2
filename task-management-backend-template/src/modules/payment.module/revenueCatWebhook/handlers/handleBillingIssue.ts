import { UserSubscription } from '../../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../user.module/user/user.model';
import { UserSubscriptionStatusType } from '../../../subscription.module/userSubscription/userSubscription.constant';
// import { enqueueWebNotification } from '../../../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
// import { TRole } from '../../../../middlewares/roles'; // ❌ Deprecated - migrated to notification.module
// import { TNotificationType } from '../../../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { NotificationService } from '../../../notification.module/notification/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../../notification.module/notification/notification.constant';

/**
 * Handle BILLING_ISSUE Event
 * 
 * Triggered when there's a billing issue (payment failed, card expired, etc.)
 * Updates subscription status to past_due and notifies user
 */
export const handleBillingIssue = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleBillingIssue :: ', event);

    const {
      subscriber,
      event_time_ms,
    } = event;

    const revenueCatUserId = subscriber.original_app_user_id;

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
      status: { $in: [UserSubscriptionStatusType.active, UserSubscriptionStatusType.trialing] },
    }).sort({ createdAt: -1 });

    if (!userSubscription) {
      console.error('❌ No active RevenueCat subscription found for user:', user.email);
      return;
    }

    // Update subscription status to past_due
    userSubscription.status = UserSubscriptionStatusType.past_due;
    await userSubscription.save();

    console.log('✅ UserSubscription marked as past_due');

    /*-─────────────────────────────────
    |  ❌ OLD: enqueueWebNotification (Deprecated)
    |  await enqueueWebNotification(
    |    `There's an issue with your subscription payment. Please update your payment method to continue accessing premium features.`,
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
      title: 'Payment Issue',
      subTitle: "There's an issue with your subscription payment. Please update your payment method to continue accessing premium features.",
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      linkFor: 'subscription',
      linkId: new Types.ObjectId(userSubscription._id as string),
      referenceFor: 'subscription',
      referenceId: new Types.ObjectId(userSubscription._id as string),
      data: {
        subscriptionId: userSubscription._id,
        eventType: 'billing_issue',
      }
    });

    console.log('✅ Billing issue notification sent to user');
  } catch (error) {
    console.error('❌ Error in handleBillingIssue:', error);
    throw error;
  }
};
