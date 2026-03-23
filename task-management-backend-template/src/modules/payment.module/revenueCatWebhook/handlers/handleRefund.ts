import { UserSubscription } from '../../subscription.module/userSubscription/userSubscription.model';
import { User } from '../../../../user.module/user/user.model';
import { PaymentTransaction } from '../../paymentTransaction/paymentTransaction.model';
import { TPaymentGateway, TPaymentStatus } from '../../paymentTransaction/paymentTransaction.constant';
import { TTransactionFor } from '../../../../constants/TTransactionFor';
import { UserSubscriptionStatusType } from '../../subscription.module/userSubscription/userSubscription.constant';
import { enqueueWebNotification } from '../../../../services/notification.service';
import { TRole } from '../../../../middlewares/roles';
import { TNotificationType } from '../../../notification/notification.constants';

/**
 * Handle REFUND Event
 * 
 * Triggered when a refund is processed for a subscription
 * Updates payment status and may revoke access depending on policy
 */
export const handleRefund = async (event: any): Promise<void> => {
  try {
    console.log('1️⃣ ℹ️ handleRefund :: ', event);

    const {
      product_id,
      subscriber,
      environment,
    } = event;

    const revenueCatUserId = subscriber.original_app_user_id;
    const orderId = event.id || event.event_id;

    // Find user by RevenueCat user ID
    const user = await User.findOne({ revenueCatUserId });

    if (!user) {
      console.error('❌ User not found for RevenueCat user:', revenueCatUserId);
      return;
    }

    // Find the payment transaction
    const paymentTransaction = await PaymentTransaction.findOne({
      revenueCatOrderId: orderId,
    });

    if (!paymentTransaction) {
      console.error('❌ Payment transaction not found for order:', orderId);
      return;
    }

    // Update payment status to refunded
    paymentTransaction.paymentStatus = TPaymentStatus.refunded;
    await paymentTransaction.save();

    console.log('✅ PaymentTransaction marked as refunded');

    // Find the subscription
    const userSubscription = await UserSubscription.findOne({
      userId: user._id,
      paymentGateway: 'revenuecat',
    }).sort({ createdAt: -1 });

    if (userSubscription) {
      // Optionally revoke access immediately or keep until period end
      // This depends on your refund policy
      userSubscription.status = UserSubscriptionStatusType.cancelled;
      userSubscription.isActive = false;
      await userSubscription.save();

      console.log('✅ UserSubscription cancelled due to refund');

      // Update user subscription type
      await User.findByIdAndUpdate(user._id, {
        $set: {
          subscriptionType: TSubscription.none,
        },
      });
    }

    // Send notification to user
    await enqueueWebNotification(
      `A refund has been processed for your subscription. Your access has been ${userSubscription?.status === UserSubscriptionStatusType.cancelled ? 'revoked' : 'maintained until period end'}.`,
      user._id,
      user._id,
      TRole.user,
      TNotificationType.payment,
      null,
      userSubscription?._id
    );

    // Send notification to admin
    await enqueueWebNotification(
      `Refund processed for user ${user.email} - Order: ${orderId}`,
      user._id,
      null,
      TRole.admin,
      TNotificationType.payment,
      null,
      paymentTransaction._id
    );

    console.log('✅ Refund notifications sent');
  } catch (error) {
    console.error('❌ Error in handleRefund:', error);
    throw error;
  }
};
