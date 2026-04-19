/*-─────────────────────────────────
|  ⚠️ DEPRECATED - V1 Subscription Cancellation Handler
|
|  ❌ KNOWN ISSUES:
|  - Uses console.log instead of structured logger
|  - No Redis cache invalidation
|  - No FailedWebhook logging
|  - Finds user by stripe_subscription_id (should find by customer)
|  - No validation on subscription state
|
|  ✅ FIX: Use handleSubscriptionCancellation.v2.ts instead
|
|  STATUS: Kept for reference, DO NOT USE in production
|  @deprecated Use handleSubscriptionCancellation.v2.ts
└──────────────────────────────────*/

import { User } from "../../user.module/user/user.model";

// 7. HANDLE SUBSCRIPTION CANCELLATION WEBHOOK
export const handleSubscriptionCancellation = async (subscription) => {
  try {
    const user = await User.findOne({ 
      stripe_subscription_id: subscription.id 
    });
    
    if (!user) return;
    
    // Update user status to cancelled
    await User.findByIdAndUpdate(user._id, {
      subscriptionStatus: 'none',
      isSubscriptionActive: false,
      stripe_subscription_id: null
    });
    
    console.log(`🔚 Subscription cancelled for user: ${user.email}`);
    
  } catch (error) {
    console.error('Error handling subscription cancellation:', error);
  }
}
