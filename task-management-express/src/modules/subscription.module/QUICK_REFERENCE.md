# 🚀 Quick Reference - Hybrid Subscription System

**RevenueCat + Stripe Integration**

---

## 📦 Environment Variables

```bash
# Stripe (Business Plans)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_WEBHOOK_URL=https://your-domain.com/api/v1/stripe/webhook

# RevenueCat (Individual Plans)
REVENUECAT_API_KEY=your_revenuecat_public_api_key
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_signing_secret
```

---

## 📡 API Endpoints

### Subscription Purchase

```http
# Stripe Purchase (Web) - Returns Checkout URL
POST   /api/v1/subscription-plans/purchase/:subscriptionPlanId
Authorization: Bearer <user_token>
Response: { "data": "https://checkout.stripe.com/..." }

# RevenueCat Purchase (Mobile) - Returns RevenueCat Config
POST   /api/v1/subscription-plans/revenuecat-purchase/:subscriptionPlanId
Authorization: Bearer <user_token>
Response: { "data": { "apiKey": "...", "appUserId": "...", "productIdentifier": "..." } }
```

### RevenueCat Admin (Admin Only)

```http
POST   /api/v1/revenuecat/manual-subscription     # Create manual subscription
GET    /api/v1/revenuecat/user/:userId            # Get user's subscriptions
POST   /api/v1/revenuecat/sync-user-id            # Sync RevenueCat user ID
POST   /api/v1/revenuecat/cancel/:subscriptionId  # Cancel subscription
GET    /api/v1/revenuecat/subscriptions           # Get all (paginated)
```

### Webhooks

```http
POST   /api/v1/stripe-webhook          # Stripe webhook handler
POST   /api/v1/revenuecat-webhook      # RevenueCat webhook handler
```

---

## 🗄️ Key Schema Fields

### UserSubscription

```typescript
{
  paymentGateway: 'stripe' | 'revenuecat',
  purchasePlatform: 'ios' | 'android' | 'web',
  
  // Stripe
  stripe_subscription_id: string,
  stripe_customer_id: string,
  
  // RevenueCat
  revenueCatUserId: string,
  revenueCatOrderId: string,
  revenueCatTransactionId: string,
  revenueCatEnvironment: 'production' | 'sandbox'
}
```

### SubscriptionPlan

```typescript
{
  purchaseChannel: 'stripe' | 'revenuecat' | 'both',
  availablePlatforms: ['ios', 'android', 'web'],
  
  // Stripe
  stripe_product_id: string,
  stripe_price_id: string,
  
  // RevenueCat
  revenueCatProductIdentifier: string,
  revenueCatPackageIdentifier: string
}
```

---

## 🪝 Webhook Events

### RevenueCat Events

| Event | Handler | Action |
|-------|---------|--------|
| `INITIAL_PURCHASE` | `handleInitialPurchase` | Create subscription + transaction |
| `RENEWAL` | `handleRenewal` | Update dates + create transaction |
| `CANCELLATION` | `handleCancellation` | Set cancelledAtPeriodEnd |
| `EXPIRATION` | `handleExpiration` | Mark as expired, revoke access |
| `REFUND` | `handleRefund` | Refund transaction, cancel subscription |
| `BILLING_ISSUE` | `handleBillingIssue` | Mark as past_due |

---

## 🧪 Testing Commands

### Test RevenueCat Webhook

```bash
# 1. In RevenueCat Dashboard → Project Settings → Webhooks
# 2. Click "Test Webhook"
# 3. Select event type
# 4. Check backend logs

# Expected logs:
🪝 RevenueCat webhook received
✅ RevenueCat webhook signature verified
📦 Event type: INITIAL_PURCHASE
✅ UserSubscription created: ...
```

### Test Stripe Webhook

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events
stripe listen --forward-to localhost:6730/api/v1/stripe/webhook

# Trigger test event
stripe trigger checkout.session.completed
```

### Test Manual Subscription

```bash
curl -X POST http://localhost:6730/api/v1/revenuecat/manual-subscription \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
    "subscriptionPlanId": "64f5a1b2c3d4e5f6g7h8i9j1",
    "platform": "ios"
  }'
```

---

## 🔧 Database Migration

```bash
# Run migration script
mongosh your_database < migration_add_revenuecat_support.js
```

---

## 📱 Mobile App Integration (Flutter)

```dart
// pubspec.yaml
dependencies:
  purchases_flutter: ^6.0.0

// Initialize RevenueCat
await Purchases.configure(
  apiKey: 'your_revenuecat_api_key',
  appUserID: user.id,
);

// Fetch offerings
Offerings offerings = await Purchases.getOfferings();

// Purchase package
CustomerInfo customerInfo = await Purchases.purchasePackage(
  package: monthlyPackage,
);
```

---

## 🚨 Common Issues

### Webhook Signature Failed

```bash
# Ensure express.raw() is before express.json()
app.post('/api/v1/revenuecat-webhook', express.raw({ type: 'application/json' }), handler);
app.use(express.json());
```

### Product ID Mismatch

```bash
# Verify identifiers match exactly
# Code: revenueCatProductIdentifier: "individual_monthly"
# RevenueCat Dashboard: Product ID: individual_monthly
```

### User Not Found

```bash
# Sync RevenueCat user ID
POST /api/v1/revenuecat/sync-user-id
{
  "userId": "...",
  "revenueCatUserId": "$RCAnonymousID:abc123"
}
```

---

## 📚 Documentation

- **HYBRID_SUBSCRIPTION_SUMMARY.md** - Implementation summary
- **revenueCat/README.md** - Module documentation
- **revenueCat/SETUP_GUIDE.md** - Setup instructions
- **migration_add_revenuecat_support.js** - Database migration

---

## ✅ Deployment Checklist

- [ ] Environment variables set
- [ ] Database migration run
- [ ] RevenueCat webhooks configured
- [ ] Stripe webhooks configured
- [ ] Test events received
- [ ] Manual subscription tested
- [ ] Mobile app integrated
- [ ] Monitoring set up

---

**Quick Start**: See [SETUP_GUIDE.md](./revenueCat/SETUP_GUIDE.md) for detailed setup instructions.
