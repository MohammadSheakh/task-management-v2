# 💳 Payment System - Complete Guide

**Date**: 08-03-26  
**Version**: 1.0  
**Status**: ✅ Production Ready

---

## 🎯 Executive Summary

This guide provides comprehensive understanding of the Payment System, including architecture, Stripe integration, webhook handling, and best practices for processing payments in the Task Management System.

---

## 📊 System Overview

### What is Payment Module?

The Payment Module enables:
- ✅ **Payment Processing**: Secure payments via Stripe
- ✅ **Transaction Tracking**: Complete payment history
- ✅ **Webhook Handling**: Real-time payment updates
- ✅ **Refund Processing**: Admin-initiated refunds
- ✅ **Earnings Dashboard**: Revenue tracking for admins
- ✅ **Export Functionality**: CSV/PDF transaction exports

### Key Statistics

| Metric | Value |
|--------|-------|
| **Designed Capacity** | 100K+ transactions |
| **Payment Gateway** | Stripe (primary) |
| **Average Response Time** | < 200ms (Stripe API) |
| **Webhook Processing** | < 500ms |
| **API Endpoints** | 6 endpoints |

---

## 🏗️ Architecture Deep Dive

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
│  Flutter App │ Website │ Admin Dashboard                    │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                               │
│  Load Balancer │ Rate Limiter │ Authentication              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Payment Module Backend                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │→ │  Controllers │→ │   Services   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                          ↓                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Stripe     │  │   MongoDB    │  │   BullMQ     │      │
│  │   (Payment)  │  │ (Transactions)│ │  (Export)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                          ↑                                   │
│  ┌──────────────┐      │                                     │
│  │   Stripe     │──────┘                                     │
│  │   Webhooks   │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Payment Flow Examples

### Flow 1: User Makes Payment

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Initiates payment
       ↓
┌─────────────┐
│ Frontend    │
│ (Stripe     │
│  Elements)  │
└──────┬──────┘
       │ 2. Collects card data
       ↓
┌─────────────┐
│ POST        │
│ /payment-   │
│ transactions│
│ /create     │
└──────┬──────┘
       │ 3. Create payment intent
       ↓
┌─────────────┐
│ Stripe      │
│ API         │
└──────┬──────┘
       │ 4. Return client secret
       ↓
┌─────────────┐
│ Frontend    │
│ confirms    │
│ payment     │
└──────┬──────┘
       │ 5. Process payment
       ↓
┌─────────────┐
│ Stripe      │
│ webhook     │
└──────┬──────┘
       │ 6. payment_intent.succeeded
       ↓
┌─────────────┐
│ Create      │
│ transaction │
│ record      │
└──────┬──────┘
       │ 7. Send notification
       ↓
┌─────────────┐
│ Payment     │
│ Complete    │
└─────────────┘
```

**API Calls**:
```bash
# 1. Create payment intent
POST /payment-transactions/create
{
  "amount": 29.99,
  "currency": "USD",
  "referenceFor": "UserSubscription",
  "referenceId": "64f5a1b2c3d4e5f6g7h8i9j0"
}

# 2. Frontend confirms with Stripe
# (Handled by Stripe.js)

# 3. Webhook received
POST /stripe-webhook
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 2999,
      "currency": "usd"
    }
  }
}
```

---

### Flow 2: Webhook Processing

```
┌─────────────┐
│   Stripe    │
└──────┬──────┘
       │ 1. Payment event occurs
       ↓
┌─────────────┐
│ POST        │
│ /stripe-    │
│ webhook     │
└──────┬──────┘
       │ 2. Verify signature
       ↓
   ┌───┴───┐
   │       │
  Valid   Invalid
   │       │
   │       ↓
   │  ┌─────────────┐
   │  │ Return 400  │
   │  │ Error       │
   │  └─────────────┘
   │
   ↓
┌─────────────┐
│ Route to    │
│ handler     │
└──────┬──────┘
       │ 3. Handle event
       ↓
┌─────────────┐
│ Update      │
│ transaction │
│ status      │
└──────┬──────┘
       │ 4. Send notification
       ↓
┌─────────────┐
│ Return 200  │
│ OK          │
└─────────────┘
```

**Webhook Handler**:
```typescript
POST /stripe-webhook
Content-Type: application/json
Stripe-Signature: sig_abc123

{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 2999,
      "currency": "usd",
      "metadata": {
        "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
        "referenceFor": "UserSubscription",
        "referenceId": "64f5a1b2c3d4e5f6g7h8i9j1"
      }
    }
  }
}

Response: 200 OK
```

---

### Flow 3: Admin Processes Refund

```
┌─────────────┐
│   Admin     │
└──────┬──────┘
       │ 1. Views transaction
       ↓
┌─────────────┐
│ GET         │
│ /payment-   │
│ transactions│
│ /:id        │
└──────┬──────┘
       │ 2. Clicks "Refund"
       ↓
┌─────────────┐
│ POST        │
│ /payment-   │
│ transactions│
│ /:id/refund │
└──────┬──────┘
       │ 3. Process refund via Stripe
       ↓
┌─────────────┐
│ Stripe      │
│ API         │
└──────┬──────┘
       │ 4. Refund successful
       ↓
┌─────────────┐
│ Update      │
│ transaction │
│ status      │
└──────┬──────┘
       │ 5. Send notification
       ↓
┌─────────────┐
│ Refund      │
│ Complete    │
└─────────────┘
```

**API Call**:
```bash
POST /payment-transactions/:id/refund
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "amount": 29.99,  // Full or partial refund
  "reason": "Customer request"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "refundId": "re_abc123",
    "status": "succeeded",
    "amount": 29.99
  }
}
```

---

## 🎯 Usage Patterns

### Pattern 1: Subscription Payment

```typescript
// User subscribes to plan
POST /user-subscriptions/create
{
  "subscriptionPlanId": "64f5a1b2c3d4e5f6g7h8i9j0"
}

// Redirects to Stripe Checkout
// User completes payment
// Webhook creates transaction
// Subscription activated
```

---

### Pattern 2: Admin Views Earnings

```typescript
// Admin views earnings overview
GET /payment-transactions/overview/admin

// Returns:
{
  "success": true,
  "data": {
    "totalRevenue": 124580.75,
    "thisMonth": 12450.50,
    "lastMonth": 11890.25,
    "growthRate": 4.74,
    "byCurrency": {
      "USD": 100000.00,
      "EUR": 20000.00,
      "BDT": 4580.75
    }
  }
}
```

---

### Pattern 3: Export Transactions

```typescript
// Admin exports transactions
POST /payment-transactions/export
{
  "from": "2026-03-01",
  "to": "2026-03-31",
  "format": "csv"
}

// Returns CSV file
// Downloaded by admin
```

---

## 🔐 Security Best Practices

### 1. Webhook Signature Verification

```typescript
// ✅ Good: Verify webhook signatures
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

if (!event) {
  return res.status(400).json({ error: 'Invalid signature' });
}

// ❌ Bad: Don't trust webhook without verification
const event = req.body;  // Insecure!
```

### 2. Idempotency

```typescript
// ✅ Good: Use idempotency keys
const idempotencyKey = `${userId}:${referenceFor}:${referenceId}`;
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2999,
  currency: 'usd'
}, {
  idempotencyKey
});

// Prevents duplicate charges on retry

// ❌ Bad: No idempotency
const paymentIntent = await stripe.paymentIntents.create({...});
// May charge twice on network retry
```

### 3. PCI Compliance

```typescript
// ✅ Good: Use Stripe Elements
// Frontend collects card data
// Backend receives payment method ID
const paymentMethod = req.body.paymentMethodId;
const paymentIntent = await stripe.paymentIntents.create({
  payment_method: paymentMethod
});

// ❌ Bad: Never collect card data on server
// Don't handle raw card numbers!
```

---

## 📊 Performance Guidelines

### 1. Database Indexes

```typescript
// 7 strategic indexes
// All query patterns covered
// Optimized for admin dashboard

// Example: Get user's transactions
await PaymentTransaction.find({ userId })
  .sort({ createdAt: -1 })
  .limit(20);
// Uses index: { userId: 1, createdAt: -1 }
```

### 2. Query Optimization

```typescript
// Use .lean() for read-only queries
const transactions = await PaymentTransaction.find({ userId }).lean();

// Selective projection
await PaymentTransaction.findById(id).select('amount paymentStatus');

// Aggregation for earnings
const earnings = await PaymentTransaction.aggregate([
  { $match: { paymentStatus: 'completed' } },
  { $group: { _id: '$currency', total: { $sum: '$amount' } } }
]);
```

---

## 🧪 Testing Guide

### Manual Testing Checklist

```bash
# 1. Get transactions (admin)
curl -X GET http://localhost:5000/payment-transactions/paginate \
  -H "Authorization: Bearer <admin-token>"

# 2. Get earnings overview (admin)
curl -X GET http://localhost:5000/payment-transactions/overview/admin \
  -H "Authorization: Bearer <admin-token>"

# 3. Test webhook (use Stripe CLI)
stripe trigger payment_intent.succeeded

# 4. Process refund (admin)
curl -X POST http://localhost:5000/payment-transactions/:id/refund \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":29.99,"reason":"Testing"}'
```

---

## 🔗 Integration Points

### With Subscription Module

```typescript
// Payment creates transaction for subscription
const transaction = await PaymentTransaction.create({
  userId,
  referenceFor: 'UserSubscription',
  referenceId: subscription._id,
  amount: plan.amount,
  paymentStatus: 'completed'
});

// Subscription activated on payment success
```

### With Notification Module

```typescript
// Send payment confirmation
await notificationService.createNotification({
  receiverId: userId,
  type: 'payment_succeeded',
  title: 'Payment Successful',
  linkFor: '/subscriptions',
  linkId: subscriptionId
});
```

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Stripe API keys configured
- [ ] Webhook endpoint configured in Stripe
- [ ] MongoDB indexes created
- [ ] Environment variables set
- [ ] Webhook secret stored

### Post-Deployment

- [ ] Test payment flow
- [ ] Verify webhooks working
- [ ] Test refund processing
- [ ] Monitor Stripe dashboard
- [ ] Check transaction recording

---

## 📝 Common Issues & Solutions

### Issue 1: Webhook Not Received

**Problem**: Stripe webhook not hitting endpoint

**Solution**:
```bash
# Check webhook endpoint in Stripe dashboard
# Ensure endpoint is publicly accessible (not localhost)
# Verify signature verification code

# Test locally with Stripe CLI
stripe listen --forward-to localhost:5000/stripe-webhook
```

### Issue 2: Duplicate Transactions

**Problem**: Same payment recorded twice

**Solution**:
```typescript
// Use idempotency keys
const idempotencyKey = `${userId}:${referenceFor}:${referenceId}`;

// Check for existing transaction
const existing = await PaymentTransaction.findOne({
  paymentIntent: paymentIntentId
});

if (existing) {
  return existing;  // Don't create duplicate
}
```

### Issue 3: Refund Fails

**Problem**: Refund request fails

**Solution**:
```typescript
// Check payment intent is chargeable
const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

if (paymentIntent.status !== 'succeeded') {
  throw new Error('Cannot refund unsuccessful payment');
}

// Use correct refund amount (in cents)
const refund = await stripe.refunds.create({
  payment_intent: paymentIntentId,
  amount: Math.round(amount * 100)  // Convert to cents
});
```

---

## 📊 API Endpoints Quick Reference

### Payment Transactions
```
GET    /payment-transactions/paginate          # Get all (admin)
GET    /payment-transactions/paginate/dev      # Dev view (admin)
GET    /payment-transactions/overview/admin    # Earnings overview
GET    /payment-transactions/:id               # Get by ID
POST   /payment-transactions/                  # Create (webhook)
```

### Stripe Webhook
```
POST   /stripe-webhook                         # Stripe webhook
```

---

## 🎯 Best Practices

### 1. Transaction Recording

```typescript
// ✅ Good: Record transaction on webhook
async handlePaymentSucceeded(event) {
  const paymentIntent = event.data.object;
  
  await PaymentTransaction.create({
    userId: paymentIntent.metadata.userId,
    paymentIntent: paymentIntent.id,
    paymentStatus: 'completed'
  });
}

// ❌ Bad: Record before payment confirmed
await PaymentTransaction.create({
  paymentStatus: 'pending'  // May never complete!
});
```

### 2. Error Handling

```typescript
// ✅ Good: Handle payment errors
try {
  const paymentIntent = await stripe.paymentIntents.create({...});
} catch (error) {
  logger.error('Payment failed:', error);
  await PaymentTransaction.create({
    paymentStatus: 'failed',
    failureReason: error.message
  });
}

// ❌ Bad: Silent failures
const paymentIntent = await stripe.paymentIntents.create({...});
// No error handling!
```

### 3. Webhook Processing

```typescript
// ✅ Good: Quick webhook response
async handleWebhook(req, res) {
  const event = verifySignature(req);
  
  // Queue for async processing
  await webhookQueue.add('processWebhook', { event });
  
  res.json({ received: true });  // Quick response
}

// ❌ Bad: Long processing in webhook
async handleWebhook(req, res) {
  await processPayment(req.body);  // Takes 5 seconds
  await sendEmail();  // Takes 2 seconds
  res.json({ received: true });  // Stripe times out!
}
```

---

## 📝 Related Documentation

- [Module Architecture](./PAYMENT_MODULE_ARCHITECTURE.md)
- [Performance Report](./perf/payment-module-performance-report.md)
- [Diagrams](./dia/)
- [Subscription Module Guide](../subscription.module/doc/SUBSCRIPTION_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready
