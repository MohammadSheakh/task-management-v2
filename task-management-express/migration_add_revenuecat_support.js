/**
 * MongoDB Migration Script
 * 
 * Purpose: Add RevenueCat support fields to existing collections
 * 
 * Usage:
 *   mongosh your_database < migration_add_revenuecat_support.js
 * 
 * OR in MongoDB Compass:
 *   Copy and paste each section into the respective collection
 */

//==============================================
// 1. Update SubscriptionPlan Collection
//==============================================

print("🔄 Updating SubscriptionPlan collection...");

db.SubscriptionPlan.updateMany(
  {},
  {
    $set: {
      // Set purchaseChannel based on subscriptionType
      purchaseChannel: { 
        $cond: [
          { $eq: ["$subscriptionType", "individual"] }, 
          "revenuecat", 
          "stripe"
        ] 
      },
      // Set availablePlatforms based on subscriptionType
      availablePlatforms: { 
        $cond: [
          { $eq: ["$subscriptionType", "individual"] }, 
          ["ios", "android"], 
          ["web"]
        ] 
      },
      // Set RevenueCat product identifier for individual plans
      revenueCatProductIdentifier: { 
        $cond: [
          { $eq: ["$subscriptionType", "individual"] }, 
          "individual_monthly", 
          null
        ] 
      },
      // Set RevenueCat package identifier for individual plans
      revenueCatPackageIdentifier: { 
        $cond: [
          { $eq: ["$subscriptionType", "individual"] }, 
          "monthly", 
          null
        ] 
      }
    }
  }
);

print("✅ SubscriptionPlan collection updated");


//==============================================
// 2. Update UserSubscription Collection
//==============================================

print("🔄 Updating UserSubscription collection...");

db.UserSubscription.updateMany(
  {},
  {
    $set: {
      // Default to stripe for existing subscriptions
      paymentGateway: "stripe",
      // Default to web platform
      purchasePlatform: "web",
      // Initialize RevenueCat fields to null
      revenueCatUserId: null,
      revenueCatOrderId: null,
      revenueCatTransactionId: null,
      revenueCatEnvironment: null,
      appleReceiptData: null,
      googlePurchaseToken: null,
      originalTransactionId: null,
      // Initialize Stripe customer ID
      stripe_customer_id: null
    }
  }
);

print("✅ UserSubscription collection updated");


//==============================================
// 3. Update PaymentTransaction Collection
//==============================================

print("🔄 Updating PaymentTransaction collection...");

db.PaymentTransaction.updateMany(
  {},
  {
    $set: {
      // Initialize RevenueCat fields to null
      revenueCatOrderId: null,
      revenueCatEnvironment: null,
      platform: "web"
    }
  }
);

print("✅ PaymentTransaction collection updated");


//==============================================
// 4. Update User Collection
//==============================================

print("🔄 Updating User collection...");

db.User.updateMany(
  {},
  {
    $set: {
      // Initialize RevenueCat user ID to null
      revenueCatUserId: null
    }
  }
);

print("✅ User collection updated");


//==============================================
// 5. Create Performance Indexes
//==============================================

print("📊 Creating indexes for better query performance...");

// UserSubscription indexes
print("  - Creating UserSubscription indexes...");
db.UserSubscription.createIndex({ paymentGateway: 1, userId: 1 });
db.UserSubscription.createIndex({ revenueCatUserId: 1 });
db.UserSubscription.createIndex({ revenueCatOrderId: 1 });
db.UserSubscription.createIndex({ revenueCatTransactionId: 1 });

// PaymentTransaction indexes
print("  - Creating PaymentTransaction indexes...");
db.PaymentTransaction.createIndex({ revenueCatOrderId: 1 });
db.PaymentTransaction.createIndex({ paymentGateway: 1, userId: 1 });
db.PaymentTransaction.createIndex({ platform: 1, userId: 1 });

// User indexes
print("  - Creating User indexes...");
db.User.createIndex({ revenueCatUserId: 1 });

print("✅ Indexes created successfully");


//==============================================
// 6. Verification
//==============================================

print("\n🔍 Verification...");

// Count updated documents
const subscriptionPlanCount = db.SubscriptionPlan.countDocuments({});
const userSubscriptionCount = db.UserSubscription.countDocuments({});
const paymentTransactionCount = db.PaymentTransaction.countDocuments({});
const userCount = db.User.countDocuments({});

print(`\n📊 Collection Statistics:`);
print(`  - SubscriptionPlan: ${subscriptionPlanCount} documents`);
print(`  - UserSubscription: ${userSubscriptionCount} documents`);
print(`  - PaymentTransaction: ${paymentTransactionCount} documents`);
print(`  - User: ${userCount} documents`);

// Sample verification
print(`\n📋 Sample SubscriptionPlan document:`);
printjson(db.SubscriptionPlan.findOne().select({
  subscriptionName: 1,
  subscriptionType: 1,
  purchaseChannel: 1,
  availablePlatforms: 1,
  revenueCatProductIdentifier: 1,
  stripe_product_id: 1
}));

print(`\n📋 Sample UserSubscription document:`);
printjson(db.UserSubscription.findOne().select({
  paymentGateway: 1,
  purchasePlatform: 1,
  revenueCatUserId: 1,
  revenueCatOrderId: 1,
  stripe_subscription_id: 1
}));


//==============================================
// Migration Complete
//==============================================

print("\n✅ Migration completed successfully!");
print("\n⚠️  Next Steps:");
print("  1. Verify data in your application");
print("  2. Test RevenueCat webhook integration");
print("  3. Test Stripe webhook integration (ensure no regression)");
print("  4. Update application code to use new fields");
print("\n📚 Documentation:");
print("  - src/modules/subscription.module/HYBRID_SUBSCRIPTION_SUMMARY.md");
print("  - src/modules/subscription.module/revenueCat/README.md");
print("  - src/modules/subscription.module/revenueCat/SETUP_GUIDE.md");
