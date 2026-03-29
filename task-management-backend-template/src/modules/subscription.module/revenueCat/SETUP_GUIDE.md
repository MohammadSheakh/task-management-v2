# 💳 Hybrid Subscription System Setup Guide

**RevenueCat (Individual) + Stripe (Business)**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [RevenueCat Setup](#revenuecat-setup)
5. [Stripe Setup](#stripe-setup)
6. [Environment Variables](#environment-variables)
7. [Database Migration](#database-migration)
8. [Testing](#testing)
9. [API Endpoints](#api-endpoints)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This system supports **dual payment gateways**:

| Subscription Type | Payment Gateway | Platform | Purchase Location |
|------------------|-----------------|----------|-------------------|
| **Individual** | RevenueCat | iOS, Android | Mobile App |
| **Business** | Stripe | Web | Web Dashboard |

### Key Features

- ✅ **Individual Plans**: RevenueCat handles iOS/Android in-app purchases
- ✅ **Business Plans**: Stripe handles web subscriptions
- ✅ **Admin Dashboard**: Create manual subscriptions for both gateways
- ✅ **Unified Schema**: Single `UserSubscription` collection for both gateways
- ✅ **Webhook Integration**: Real-time updates from both platforms

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Task Management App                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Individual Plan │         │  Business Plan   │         │
│  │  (Mobile App)    │         │  (Web Dashboard) │         │
│  │                  │         │                  │         │
│  │  RevenueCat SDK  │         │   Stripe SDK     │         │
│  │  - iOS (IAP)     │         │   - Card         │         │
│  │  - Android (IAP) │         │   - Bank Transfer│         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
│           ↓                             ↓                    │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  RevenueCat      │         │   Stripe         │         │
│  │  Backend API     │         │   Webhooks       │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                             │                    │
│           └──────────┬──────────────────┘                    │
│                      ↓                                       │
│           ┌────────────────────┐                            │
│           │  Your Backend      │                            │
│           │  - Unified Schema  │                            │
│           │  - Webhook Handlers│                            │
│           └────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

1. **Node.js** v16+ and npm/yarn
2. **MongoDB** database
3. **RevenueCat Account** ([dashboard.revenuecat.com](https://dashboard.revenuecat.com))
4. **Stripe Account** ([dashboard.stripe.com](https://dashboard.stripe.com))
5. **Apple Developer Account** (for iOS)
6. **Google Play Console Account** (for Android)

---

## 🐱 RevenueCat Setup

### Step 1: Create RevenueCat Account

1. Go to [dashboard.revenuecat.com](https://dashboard.revenuecat.com)
2. Sign up for an account
3. Create a new project (e.g., "Task Management App")

### Step 2: Add iOS App

1. In RevenueCat dashboard → **Apps** → **Add App** → **iOS**
2. Enter app name and bundle ID (e.g., `com.taskmanagement.app`)
3. Follow Apple App Store Connect setup:
   - Create App Store Connect account
   - Create app in App Store Connect
   - Enable **In-App Purchases** capability
   - Create subscription products in **App Store Connect** → **Features** → **Subscriptions**

### Step 3: Add Android App

1. In RevenueCat dashboard → **Apps** → **Add App** → **Android**
2. Enter app name and package name (e.g., `com.taskmanagement.app`)
3. Follow Google Play Console setup:
   - Create Google Play Console account
   - Create app in Google Play Console
   - Enable **In-app Billing**
   - Create subscription products in **Monetize** → **Subscriptions**

### Step 4: Create Products in RevenueCat

1. Go to **Entitlements** → **Create Entitlement** (e.g., "premium")
2. Go to **Products** → **Create Product**
   - **Individual Monthly**:
     - Product ID: `individual_monthly`
     - Subscription Group: "Individual"
     - Duration: Monthly
     - Price: $10.99
   - **Individual Annual**:
     - Product ID: `individual_annual`
     - Subscription Group: "Individual"
     - Duration: Annual
     - Price: $109.99 (2 months free)

3. Link products to App Store and Google Play products

### Step 5: Configure Webhooks

1. Go to **Project Settings** → **Webhooks**
2. Click **Add Webhook**
3. Enter webhook URL:
   ```
   https://your-domain.com/api/v1/revenuecat-webhook
   ```
4. Select events to receive:
   - ✅ INITIAL_PURCHASE
   - ✅ RENEWAL
   - ✅ CANCELLATION
   - ✅ EXPIRATION
   - ✅ REFUND
   - ✅ BILLING_ISSUE
   - ✅ SUBSCRIPTION
5. Copy the **Webhook Signing Secret**
6. Add to `.env` file (see [Environment Variables](#environment-variables))

### Step 6: Get RevenueCat API Key

1. Go to **Project Settings** → **API Keys**
2. Copy the **Public API Key**
3. Add to `.env` file

---

## stripe Stripe Setup

### Step 1: Create Stripe Account

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. Sign up/log in to your account
3. Enable **Test Mode** for development

### Step 2: Create Subscription Products

1. Go to **Products** → **Add Product**
   - **Business Starter**:
     - Name: "Business Starter"
     - Price: $29.99/month
     - Recurring: Monthly
   - **Business Level 1**:
     - Name: "Business Level 1"
     - Price: $49.99/month
     - Recurring: Monthly
   - **Business Level 2**:
     - Name: "Business Level 2"
     - Price: $79.99/month
     - Recurring: Monthly

2. Copy the **Product ID** and **Price ID** for each plan

### Step 3: Configure Webhooks

1. Go to **Developers** → **Webhooks** → **Add Endpoint**
2. Enter webhook URL:
   ```
   https://your-domain.com/api/v1/stripe/webhook
   ```
3. Select events to receive:
   - ✅ `checkout.session.completed`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.deleted`
   - ✅ `customer.subscription.updated`
4. Copy the **Webhook Signing Secret**
5. Add to `.env` file

### Step 4: Get Stripe API Keys

1. Go to **Developers** → **API Keys**
2. Copy the **Secret Key** (starts with `sk_test_` or `sk_live_`)
3. Add to `.env` file

---

## 🔐 Environment Variables

Add these to your `.env` file:

```bash
#======================================
# Stripe Configuration
#======================================
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_signing_secret
STRIPE_WEBHOOK_URL=https://your-domain.com/api/v1/stripe/webhook
STRIPE_SUCCESS_URL=https://your-frontend.com/subscription/success
STRIPE_CANCEL_URL=https://your-frontend.com/subscription/cancel
STRIPE_STANDARD_PLAN_PRICE_ID=price_your_standard_plan_price_id

#======================================
# RevenueCat Configuration
#======================================
REVENUECAT_API_KEY=your_revenuecat_public_api_key
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_signing_secret

#======================================
# App Configuration
#======================================
NODE_ENV=development  # or production
FRONTEND_URL=https://your-frontend.com
BACKEND_URL=https://your-backend.com
```

---

## 🗄️ Database Migration

Run this MongoDB migration to add new fields to existing collections:

```javascript
// migration_add_revenuecat_fields.js

// 1. Update SubscriptionPlan collection
db.SubscriptionPlan.updateMany(
  {},
  {
    $set: {
      purchaseChannel: { $cond: [{ $eq: ["$subscriptionType", "individual"] }, "revenuecat", "stripe"] },
      availablePlatforms: { $cond: [{ $eq: ["$subscriptionType", "individual"] }, ["ios", "android"], ["web"] } },
      revenueCatProductIdentifier: { $cond: [{ $eq: ["$subscriptionType", "individual"] }, "individual_monthly", null] },
      revenueCatPackageIdentifier: { $cond: [{ $eq: ["$subscriptionType", "individual"] }, "monthly", null] }
    }
  }
);

// 2. Update UserSubscription collection
db.UserSubscription.updateMany(
  {},
  {
    $set: {
      paymentGateway: "stripe",  // Default to stripe for existing subscriptions
      purchasePlatform: "web",
      revenueCatUserId: null,
      revenueCatOrderId: null,
      revenueCatTransactionId: null,
      revenueCatEnvironment: null,
      appleReceiptData: null,
      googlePurchaseToken: null,
      originalTransactionId: null
    }
  }
);

// 3. Update PaymentTransaction collection
db.PaymentTransaction.updateMany(
  {},
  {
    $set: {
      revenueCatOrderId: null,
      revenueCatEnvironment: null,
      platform: "web"
    }
  }
);

// 4. Update User collection
db.User.updateMany(
  {},
  {
    $set: {
      revenueCatUserId: null
    }
  }
);

// 5. Create indexes for better query performance
db.UserSubscription.createIndex({ paymentGateway: 1, userId: 1 });
db.UserSubscription.createIndex({ revenueCatUserId: 1 });
db.UserSubscription.createIndex({ revenueCatOrderId: 1 });

db.PaymentTransaction.createIndex({ revenueCatOrderId: 1 });
db.PaymentTransaction.createIndex({ paymentGateway: 1, userId: 1 });

db.User.createIndex({ revenueCatUserId: 1 });
```

Run migration:
```bash
mongosh your_database < migration_add_revenuecat_fields.js
```

---

## 🧪 Testing

### Test RevenueCat Webhooks

1. **Use RevenueCat Webhook Testing Tool**:
   - Go to **Project Settings** → **Webhooks**
   - Click **Test Webhook**
   - Select event type (e.g., INITIAL_PURCHASE)
   - RevenueCat will send a test event to your webhook

2. **Check Logs**:
   ```bash
   # Backend logs should show:
   🪝 RevenueCat webhook received
   ✅ RevenueCat webhook signature verified
   📦 Event type: INITIAL_PURCHASE
   ✅ UserSubscription created: ...
   ```

3. **Verify Database**:
   ```javascript
   // Check UserSubscription
   db.UserSubscription.findOne({ paymentGateway: "revenuecat" })
   
   // Check PaymentTransaction
   db.PaymentTransaction.findOne({ paymentGateway: "revenuecat" })
   ```

### Test Stripe Webhooks

1. **Use Stripe CLI**:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe
   
   # Login
   stripe login
   
   # Forward events to localhost
   stripe listen --forward-to localhost:6730/api/v1/stripe/webhook
   ```

2. **Trigger Test Events**:
   ```bash
   # Trigger checkout.session.completed
   stripe trigger checkout.session.completed
   
   # Trigger invoice.payment_succeeded
   stripe trigger invoice.payment_succeeded
   ```

### Test Admin Dashboard

1. **Create Manual RevenueCat Subscription**:
   ```bash
   POST /api/v1/revenuecat/manual-subscription
   Authorization: Bearer <admin_token>
   
   {
     "userId": "user_id_here",
     "subscriptionPlanId": "plan_id_here",
     "platform": "ios"
   }
   ```

2. **View User Subscriptions**:
   ```bash
   GET /api/v1/revenuecat/user/:userId
   Authorization: Bearer <admin_token>
   ```

---

## 📡 API Endpoints

### RevenueCat Endpoints (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/revenuecat/manual-subscription` | Create manual subscription |
| GET | `/api/v1/revenuecat/user/:userId` | Get user's RevenueCat subscriptions |
| POST | `/api/v1/revenuecat/sync-user-id` | Sync RevenueCat user ID |
| POST | `/api/v1/revenuecat/cancel/:subscriptionId` | Cancel subscription |
| GET | `/api/v1/revenuecat/subscriptions` | Get all subscriptions (paginated) |

### Webhook Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/stripe-webhook` | Stripe webhook handler |
| POST | `/api/v1/revenuecat-webhook` | RevenueCat webhook handler |

---

## 🚨 Troubleshooting

### Issue: Webhook Signature Verification Failed

**Solution**:
1. Verify webhook secret is correct in `.env`
2. Ensure `express.raw()` middleware is used before `express.json()`
3. Check webhook URL is publicly accessible (use ngrok for local testing)

```bash
# Test with ngrok
ngrok http 6730
```

### Issue: RevenueCat Products Not Syncing

**Solution**:
1. Verify product IDs match between RevenueCat and App Store/Google Play
2. Check entitlements are properly configured
3. Ensure app has correct bundle ID/package name

### Issue: Duplicate Subscriptions

**Solution**:
1. Check webhook idempotency logic
2. Verify `revenueCatOrderId` uniqueness check in handlers
3. Use database unique indexes on order IDs

### Issue: Subscription Status Not Updating

**Solution**:
1. Check webhook logs for errors
2. Verify event types are correctly mapped
3. Ensure MongoDB connection is stable

---

## 📝 Next Steps

1. **Mobile App Integration**:
   - Add RevenueCat SDK to Flutter app
   - Configure offerings and products
   - Implement purchase flow

2. **Admin Dashboard**:
   - Build UI for manual subscription creation
   - Add subscription management views
   - Implement analytics dashboard

3. **Monitoring**:
   - Set up webhook failure monitoring
   - Create admin health check endpoint
   - Configure alerts for failed payments

---

## 📚 References

- [RevenueCat Documentation](https://docs.revenuecat.com)
- [Stripe Documentation](https://stripe.com/docs)
- [RevenueCat Webhooks](https://docs.revenuecat.com/docs/webhooks)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)

---

**Last Updated**: 2026-03-23
**Author**: Backend Development Team
