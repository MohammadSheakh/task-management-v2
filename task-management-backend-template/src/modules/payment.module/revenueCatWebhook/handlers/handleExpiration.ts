import { UserSubscription } from '../../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../user.module/user/user.model';
import { UserSubscriptionStatusType } from '../../../subscription.module/userSubscription/userSubscription.constant';
import { TSubscription } from '../../../../enums/subscription';
import { enqueueWebNotification } from '../../../../services/notification.service';
import { TRole } from '../../../../middlewares/roles';
import { TNotificationType } from '../../../notification/notification.constants';

/**
 * Handle EXPIRATION Event
 * 
 * Triggered when a subscription expires (after cancellation or failed payment)
 * Updates subscription status to expired and reverts user to 'none' subscription
 */
export const handleExpiration = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleExpiration :: ', event);

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

    // Find the expired subscription
    const userSubscription = await UserSubscription.findOne({
      userId: user._id,
      paymentGateway: 'revenuecat',
      revenueCatUserId,
    }).sort({ createdAt: -1 });

    if (!userSubscription) {
      console.error('❌ No RevenueCat subscription found for user:', user.email);
      return;
    }

    // Update subscription status
    userSubscription.status = UserSubscriptionStatusType.expired;
    userSubscription.isActive = false;
    await userSubscription.save();

    console.log('✅ UserSubscription marked as expired');

    // Update user subscription type
    await User.findByIdAndUpdate(user._id, {
      $set: {
        subscriptionType: TSubscription.none,
      },
    });

    console.log('✅ User subscription type reverted to none');

    // Send notification to user
    await enqueueWebNotification(
      `Your subscription has expired. Please renew to continue accessing premium features.`,
      user._id,
      user._id,
      TRole.user,
      TNotificationType.payment,
      null,
      userSubscription._id
    );

    console.log('✅ Expiration notification sent to user');
  } catch (error) {
    console.error('❌ Error in handleExpiration:', error);
    throw error;
  }
};
