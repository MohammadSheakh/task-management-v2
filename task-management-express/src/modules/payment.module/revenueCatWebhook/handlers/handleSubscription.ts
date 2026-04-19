import { UserSubscription } from '../../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../user.module/user/user.model';
import { UserSubscriptionStatusType } from '../../../subscription.module/userSubscription/userSubscription.constant';

/**
 * Handle SUBSCRIPTION Event
 * 
 * Triggered for general subscription state changes
 * This is a catch-all handler for subscription updates
 */
export const handleSubscription = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleSubscription :: ', event);

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

    // Find the subscription
    const userSubscription = await UserSubscription.findOne({
      userId: user._id,
      paymentGateway: 'revenuecat',
    }).sort({ createdAt: -1 });

    if (!userSubscription) {
      console.log('ℹ️ No RevenueCat subscription found for user:', user.email);
      return;
    }

    // Handle specific subscription state changes
    const expirationTime = subscriber.expiration_at_ms;
    
    if (expirationTime) {
      const expirationDate = new Date(expirationTime);
      const now = new Date();

      // If expiration is in the past, mark as expired
      if (expirationDate < now) {
        userSubscription.status = UserSubscriptionStatusType.expired;
        userSubscription.isActive = false;
      } else {
        // Update expiration date
        userSubscription.expirationDate = expirationDate;
        userSubscription.renewalDate = expirationDate;
      }

      await userSubscription.save();
      console.log('✅ UserSubscription updated');
    }
  } catch (error) {
    console.error('❌ Error in handleSubscription:', error);
    throw error;
  }
};
