import { UserSubscription } from '../../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../user.module/user/user.model';
import { UserSubscriptionStatusType } from '../../../subscription.module/userSubscription/userSubscription.constant';
import { TSubscription } from '../../../../enums/subscription';
// import { enqueueWebNotification } from '../../../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
// import { TRole } from '../../../../middlewares/roles'; // ❌ Deprecated - migrated to notification.module
// import { TNotificationType } from '../../../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { NotificationService } from '../../../notification.module/notification/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../../notification.module/notification/notification.constant';

/**
 * Handle CANCELLATION Event
 * 
 * Triggered when a user cancels their subscription
 * Sets cancelledAtPeriodEnd to true, subscription remains active until expiration
 */
export const handleCancellation = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleCancellation :: ', event);

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

    // Update subscription status
    userSubscription.cancelledAt = new Date(event_time_ms);
    userSubscription.cancelledAtPeriodEnd = true;
    userSubscription.status = UserSubscriptionStatusType.cancelling;
    await userSubscription.save();

    console.log('✅ UserSubscription marked as cancelling, expires at:', userSubscription.expirationDate);

    /*-─────────────────────────────────
    |  ❌ OLD: enqueueWebNotification (Deprecated)
    |  // Send notification to user
    |  await enqueueWebNotification(
    |    `Your subscription has been cancelled. You will retain access until ${userSubscription.expirationDate.toDateString()}`,
    |    user._id,
    |    user._id,
    |    TRole.user,
    |    TNotificationType.payment,
    |    null,
    |    userSubscription._id
    |  );
    |
    |  // Send notification to admin
    |  await enqueueWebNotification(
    |    `User ${user.email} cancelled their Individual subscription`,
    |    user._id,
    |    null,
    |    TRole.admin,
    |    TNotificationType.payment,
    |    null,
    |    userSubscription._id
    |  );
    └──────────────────────────────────*/

    // ✅ NEW: Scalable notification.module implementation
    const notificationService = new NotificationService();

    // Notification to user
    await notificationService.createNotification({
      receiverId: new Types.ObjectId(user._id as string),
      senderId: new Types.ObjectId(user._id as string),
      title: 'Subscription Cancelled',
      subTitle: `Your subscription has been cancelled. You will retain access until ${userSubscription.expirationDate.toDateString()}`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      linkFor: 'subscription',
      linkId: new Types.ObjectId(userSubscription._id as string),
      referenceFor: 'subscription',
      referenceId: new Types.ObjectId(userSubscription._id as string),
      data: {
        subscriptionId: userSubscription._id,
        eventType: 'cancellation',
        accessUntil: userSubscription.expirationDate,
      }
    });

    // Notification to admin
    await notificationService.createNotification({
      senderId: new Types.ObjectId(user._id as string),
      receiverRole: 'admin',
      title: 'User Subscription Cancelled',
      subTitle: `User ${user.email} cancelled their Individual subscription`,
      type: NotificationType.PAYMENT,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'subscription',
      linkId: new Types.ObjectId(userSubscription._id as string),
      referenceFor: 'subscription',
      referenceId: new Types.ObjectId(userSubscription._id as string),
      data: {
        userId: user._id,
        userEmail: user.email,
        subscriptionId: userSubscription._id,
        eventType: 'cancellation',
      }
    });

    console.log('✅ Cancellation notifications sent');
  } catch (error) {
    console.error('❌ Error in handleCancellation:', error);
    throw error;
  }
};
