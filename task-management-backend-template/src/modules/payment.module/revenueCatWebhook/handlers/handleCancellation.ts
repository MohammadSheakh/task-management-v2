import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../../user.module/user/user.model';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { TSubscription } from '../../../../enums/subscription';
import { enqueueWebNotification } from '../../../../services/notification.service';
import { TRole } from '../../../../middlewares/roles';
import { TNotificationType } from '../../../notification/notification.constants';

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

    // Send notification to user
    await enqueueWebNotification(
      `Your subscription has been cancelled. You will retain access until ${userSubscription.expirationDate.toDateString()}`,
      user._id,
      user._id,
      TRole.user,
      TNotificationType.payment,
      null,
      userSubscription._id
    );

    // Send notification to admin
    await enqueueWebNotification(
      `User ${user.email} cancelled their Individual subscription`,
      user._id,
      null,
      TRole.admin,
      TNotificationType.payment,
      null,
      userSubscription._id
    );

    console.log('✅ Cancellation notifications sent');
  } catch (error) {
    console.error('❌ Error in handleCancellation:', error);
    throw error;
  }
};
