# 🐱 RevenueCat Module - Individual Subscriptions

**Module for handling RevenueCat Individual subscriptions (iOS/Android)**

---

## 📋 Overview

This module integrates **RevenueCat** for handling Individual subscription purchases on mobile platforms (iOS/Android).

### Key Features

- ✅ **Webhook Integration**: Real-time subscription updates from RevenueCat
- ✅ **Event Handlers**: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, REFUND, BILLING_ISSUE
- ✅ **Admin Dashboard**: Create manual subscriptions, view user subscriptions
- ✅ **Unified Schema**: Works alongside Stripe Business subscriptions
- ✅ **Cross-Platform**: Supports iOS and Android purchases

---

## 📂 Module Structure

```
revenueCat/
├── SETUP_GUIDE.md              # Comprehensive setup guide
├── revenueCat.controller.ts    # Admin dashboard controllers
├── revenueCat.service.ts       # Business logic
├── revenueCat.route.ts         # API routes
└── webhookHandler.ts           # Main webhook handler
    └── handlers/
        ├── handleInitialPurchase.ts
        ├── handleRenewal.ts
        ├── handleCancellation.ts
        ├── handleExpiration.ts
        ├── handleRefund.ts
        ├── handleBillingIssue.ts
        └── handleSubscription.ts
```

---

## 🎯 Subscription Flow

### Individual Subscription Purchase (Mobile)

```
┌─────────────┐
│   User      │
│   (Mobile)  │
└──────┬──────┘
       │ Select Individual Plan
       ↓
┌─────────────┐
│  Your App   │
│  (Flutter)  │
└──────┬──────┘
       │ 1. Fetch offerings from RevenueCat SDK
       ↓
┌─────────────┐
│  RevenueCat │
│  SDK        │
└──────┬──────┘
       │ 2. Get available packages
       ↓
┌─────────────┐
│  Apple/     │
│  Google     │
│  Store      │
└──────┬──────┘
       │ 3. Complete IAP purchase
       ↓
┌─────────────┐
│  RevenueCat │
│  Backend    │
└──────┬──────┘
       │ 4. Webhook → YOUR backend
       │    POST /api/v1/revenuecat-webhook
       ↓
┌─────────────┐
│  Your       │
│  Backend    │
└──────┬──────┘
       │ 5. Create/Update:
       │    - UserSubscription (paymentGateway: 'revenuecat')
       │    - PaymentTransaction (paymentGateway: 'revenuecat')
       │    - User.subscriptionType
       ↓
┌─────────────┐
│  Success!   │
│  Premium    │
│  Access     │
└─────────────┘
```

---

## 🔧 Configuration

### Environment Variables

```bash
# RevenueCat Configuration
REVENUECAT_API_KEY=your_revenuecat_public_api_key
REVENUECAT_WEBHOOK_SECRET=your_revenuecat_webhook_signing_secret
```

### RevenueCat Dashboard Setup

1. **Create Account**: [dashboard.revenuecat.com](https://dashboard.revenuecat.com)
2. **Add Apps**: iOS + Android
3. **Create Products**:
   - `individual_monthly` - $10.99/month
   - `individual_annual` - $109.99/year
4. **Configure Webhooks**:
   - URL: `https://your-domain.com/api/v1/revenuecat-webhook`
   - Events: INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, REFUND, BILLING_ISSUE

---

## 📡 API Endpoints

### Admin Operations

#### 1. Create Manual Subscription
```http
POST /api/v1/revenuecat/manual-subscription
Authorization: Bearer <admin_token>

{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "subscriptionPlanId": "64f5a1b2c3d4e5f6g7h8i9j1",
  "platform": "ios"  // ios | android | web
}
```

#### 2. Get User's Subscriptions
```http
GET /api/v1/revenuecat/user/:userId
Authorization: Bearer <admin_token>
```

#### 3. Sync RevenueCat User ID
```http
POST /api/v1/revenuecat/sync-user-id
Authorization: Bearer <admin_token>

{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "revenueCatUserId": "$RCAnonymousID:abc123"
}
```

#### 4. Cancel Subscription
```http
POST /api/v1/revenuecat/cancel/:subscriptionId
Authorization: Bearer <admin_token>

{
  "reason": "User requested cancellation"
}
```

#### 5. Get All Subscriptions (Paginated)
```http
GET /api/v1/revenuecat/subscriptions?page=1&limit=20&status=active
Authorization: Bearer <admin_token>
```

---

## 🪝 Webhook Events

### Event Types Handled

| Event | Handler | Description |
|-------|---------|-------------|
| `INITIAL_PURCHASE` | `handleInitialPurchase.ts` | User subscribes for first time |
| `RENEWAL` | `handleRenewal.ts` | Subscription renewed successfully |
| `CANCELLATION` | `handleCancellation.ts` | User cancelled subscription |
| `EXPIRATION` | `handleExpiration.ts` | Subscription expired |
| `REFUND` | `handleRefund.ts` | Refund processed |
| `BILLING_ISSUE` | `handleBillingIssue.ts` | Payment failed |
| `SUBSCRIPTION` | `handleSubscription.ts` | General subscription update |

### Webhook Signature Verification

All RevenueCat webhooks are signed with HMAC-SHA256. The webhook handler automatically verifies signatures before processing events.

```typescript
// Automatic verification in webhookHandler.ts
const isValid = verifyRevenueCatSignature(req.body, signature, webhookSecret);
if (!isValid) {
  return res.status(401).json({ error: 'Invalid webhook signature' });
}
```

---

## 🗄️ Database Schema

### UserSubscription (RevenueCat Fields)

```typescript
{
  // ... common fields
  
  paymentGateway: 'revenuecat',  // 🆕
  purchasePlatform: 'ios',       // 🆕 ios | android | web
  
  // RevenueCat Specific
  revenueCatUserId: string,
  revenueCatOrderId: string,
  revenueCatTransactionId: string,
  appleReceiptData?: string,
  googlePurchaseToken?: string,
  originalTransactionId?: string,
  revenueCatEnvironment: 'production' | 'sandbox',
  
  // ... rest of fields
}
```

### PaymentTransaction (RevenueCat Fields)

```typescript
{
  // ... common fields
  
  paymentGateway: 'revenuecat',  // 🆕
  platform: 'ios',               // 🆕 ios | android | web
  
  // RevenueCat Specific
  revenueCatOrderId: string,
  revenueCatEnvironment: 'production' | 'sandbox',
  
  // ... rest of fields
}
```

---

## 🧪 Testing

### Test Webhook Events

1. **RevenueCat Dashboard** → Project Settings → Webhooks
2. Click **Test Webhook**
3. Select event type
4. Check backend logs:

```bash
# Expected logs
🪝 RevenueCat webhook received
✅ RevenueCat webhook signature verified
📦 Event type: INITIAL_PURCHASE
✅ User found: user@example.com Platform: ios
✅ UserSubscription created: 64f5a1b2c3d4e5f6g7h8i9j0
✅ PaymentTransaction created: 64f5a1b2c3d4e5f6g7h8i9j1
```

### Test Manual Subscription (Admin)

```bash
# Create test user
POST /api/v1/users
{
  "name": "Test User",
  "email": "test@example.com",
  "role": "user"
}

# Create manual subscription
POST /api/v1/revenuecat/manual-subscription
{
  "userId": "<user_id>",
  "subscriptionPlanId": "<plan_id>",
  "platform": "ios"
}
```

---

## 🔐 Security

### Webhook Signature Verification

- ✅ HMAC-SHA256 signature verification
- ✅ Timing-safe comparison
- ✅ Automatic rejection of invalid signatures

### Admin Authentication

- ✅ JWT authentication required
- ✅ Role-based access control (Admin only)
- ✅ Input validation

---

## 📊 Subscription Status Mapping

| RevenueCat Status | UserSubscription Status |
|------------------|------------------------|
| Active | `active` |
| Trial | `trialing` |
| Cancelled | `cancelling` → `cancelled` |
| Expired | `expired` |
| Billing Issue | `past_due` |
| Refunded | `cancelled` |

---

## 🚨 Common Issues

### 1. Webhook Not Receiving Events

**Solution**:
- Verify webhook URL is publicly accessible
- Use ngrok for local testing: `ngrok http 6730`
- Check webhook secret in `.env`

### 2. Signature Verification Failed

**Solution**:
- Ensure `express.raw()` middleware is used
- Verify webhook secret matches RevenueCat dashboard
- Check Content-Type header is `application/json`

### 3. User Not Found

**Solution**:
- Ensure `revenueCatUserId` is synced to User collection
- Use `/api/v1/revenuecat/sync-user-id` endpoint

---

## 📚 References

- [RevenueCat Documentation](https://docs.revenuecat.com)
- [RevenueCat Webhooks](https://docs.revenuecat.com/docs/webhooks)
- [Setup Guide](./SETUP_GUIDE.md)

---

**Last Updated**: 2026-03-23
**Author**: Backend Development Team
