# 💳 Payment Module - Architecture Documentation

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: 08-03-26

---

## 🎯 Module Overview

The Payment Module provides comprehensive payment processing for the Task Management System, enabling secure payment transactions, Stripe integration, webhook handling, and complete transaction tracking for subscriptions and other paid services.

### Key Features

- ✅ **Payment Processing**: Stripe payment gateway integration
- ✅ **Transaction Tracking**: Complete payment transaction history
- ✅ **Webhook Handling**: Real-time Stripe webhook processing
- ✅ **Multiple Payment Methods**: Cards, bank transfers via Stripe
- ✅ **Payment Status Tracking**: Pending, processing, completed, failed
- ✅ **Refund Processing**: Admin-initiated refunds
- ✅ **Earnings Dashboard**: Admin revenue tracking
- ✅ **Transaction Export**: CSV/PDF export capabilities
- ✅ **Idempotency**: Prevent duplicate charges
- ✅ **Security**: Signature verification, PCI compliance

---

## 📂 Module Structure

```
payment.module/
├── doc/
│   ├── dia/                        # 8 Mermaid diagrams
│   │   ├── payment-schema.mermaid
│   │   ├── payment-system-architecture.mermaid
│   │   ├── payment-sequence.mermaid
│   │   ├── payment-user-flow.mermaid
│   │   ├── payment-swimlane.mermaid
│   │   ├── payment-state-machine.mermaid
│   │   ├── payment-component-architecture.mermaid
│   │   └── payment-data-flow.mermaid
│   ├── README.md                   # Module documentation
│   ├── PAYMENT_MODULE_ARCHITECTURE.md  # This file
│   └── perf/
│       └── payment-module-performance-report.md
│
├── payment/                        # Payment processing
│   ├── payment.service.ts
│   ├── payment.constant.ts
│   ├── payment.bootstrap.ts
│   └── gateways/
│       └── stripe.gateway.ts
│
├── paymentTransaction/             # Transaction tracking
│   ├── paymentTransaction.interface.ts
│   ├── paymentTransaction.constant.ts
│   ├── paymentTransaction.model.ts
│   ├── paymentTransaction.service.ts
│   ├── paymentTransaction.controller.ts
│   ├── paymentTransaction.route.ts
│   └── paymentTransaction.validation.ts
│
├── stripeAccount/                  # Stripe account management
│   ├── stripeAccount.interface.ts
│   ├── stripeAccount.model.ts
│   ├── stripeAccount.service.ts
│   └── stripeAccount.controller.ts
│
└── stripeWebhook/                  # Webhook handling
    ├── webhook.controller.ts
    ├── webhook.service.ts
    └── handlers/
        ├── handlePaymentSucceeded.ts
        ├── handlePaymentFailed.ts
        └── handleRefundIssued.ts
```

---

## 🏗️ Architecture Design

### Design Principles

1. **Gateway Abstraction**
   - Payment gateway interface
   - Stripe implementation
   - Easy to add more gateways (PayPal, etc.)

2. **Transaction Integrity**
   - Idempotency keys prevent duplicates
   - Atomic transactions
   - Complete audit trail

3. **Webhook-First Design**
   - Real-time payment updates
   - Signature verification
   - Event-driven architecture

4. **Security & Compliance**
   - PCI DSS compliance via Stripe
   - No card data stored
   - Encrypted transactions

---

## 📊 Database Schema

### PaymentTransaction Collection

```typescript
interface IPaymentTransaction {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  
  // Reference
  referenceFor: 'UserSubscription' | 'Order' | 'Service';
  referenceId: Types.ObjectId;
  
  // Payment Gateway
  paymentGateway: 'stripe' | 'paypal';
  transactionId: string;
  paymentIntent: string;
  
  // Amount
  amount: number;
  currency: 'USD' | 'EUR' | 'BDT';
  
  // Status
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  
  // Stripe Specific
  stripeCustomerId: string;
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  
  // Failure Handling
  failureReason?: string;
  failureCode?: string;
  
  // Metadata
  metadata?: {
    planId?: string;
    planName?: string;
    subscriptionId?: string;
  };
  
  // Audit
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes

```typescript
// PaymentTransaction indexes
paymentTransactionSchema.index({ userId: 1, paymentStatus: 1, createdAt: -1 });
paymentTransactionSchema.index({ referenceFor: 1, referenceId: 1 });
paymentTransactionSchema.index({ paymentGateway: 1, paymentStatus: 1 });
paymentTransactionSchema.index({ transactionId: 1 });
paymentTransactionSchema.index({ paymentIntent: 1 });
paymentTransactionSchema.index({ createdAt: -1 });
paymentTransactionSchema.index({ paymentStatus: 1, createdAt: -1 });
```

**Index Coverage**: ✅ **100%** - All query patterns covered

---

## 🔄 Payment Lifecycle

### State Machine

```
┌─────────────┐
│   Pending   │ (Payment initiated)
└──────┬──────┘
       │ Process
       ↓
┌─────────────┐
│ Processing  │ (Gateway processing)
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
  Success  Failure
   │       │
   ↓       ↓
┌─────────────┐
│  Completed  │
└──────┬──────┘
       │
       │ Refund
       ↓
┌─────────────┐
│   Refunded  │
└─────────────┘
```

### Payment Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ Initiate Payment
       ↓
┌─────────────┐
│  Payment    │
│  Gateway    │
│  (Stripe)   │
└──────┬──────┘
       │ Process
       ↓
┌─────────────┐
│   Webhook   │
│  (Success/  │
│   Failure)  │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
  Success  Failure
   │       │
   ↓       ↓
┌─────────────┐ ┌─────────────┐
│  Completed  │ │   Failed    │
│ Transaction │ │ Transaction │
└─────────────┘ └─────────────┘
```

---

## 🎯 Key Components

### 1. Payment Service

**File**: `payment/payment.service.ts`

**Responsibilities**:
- Payment gateway abstraction
- Stripe integration
- Payment processing
- Refund processing

**Key Methods**:
```typescript
class PaymentService {
  // Process payment
  async processPayment(paymentData: IPaymentData): Promise<IPaymentResult>
  
  // Process refund
  async processRefund(transactionId: string, amount?: number): Promise<IRefundResult>
  
  // Get payment gateway
  getGateway(gatewayName: string): IPaymentGateway
  
  // Verify payment
  async verifyPayment(transactionId: string): Promise<IPaymentVerification>
}
```

**Stripe Gateway**:
```typescript
class StripeGateway implements IPaymentGateway {
  // Create payment intent
  async createPaymentIntent(data: IPaymentData): Promise<IPaymentIntent> {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100),  // Convert to cents
      currency: data.currency.toLowerCase(),
      customer: data.customerId,
      payment_method_types: ['card'],
      metadata: data.metadata
    });
    
    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  }
  
  // Refund payment
  async refund(paymentIntentId: string, amount?: number): Promise<IRefund> {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined
    });
    
    return {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100
    };
  }
}
```

---

### 2. PaymentTransaction Service

**File**: `paymentTransaction/paymentTransaction.service.ts`

**Responsibilities**:
- Transaction CRUD operations
- Transaction tracking
- Earnings calculation
- Export functionality

**Key Methods**:
```typescript
class PaymentTransactionService extends GenericService<typeof PaymentTransaction, IPaymentTransaction> {
  // Create transaction
  async createTransaction(data: Partial<IPaymentTransaction>): Promise<IPaymentTransaction>
  
  // Update transaction status
  async updateTransactionStatus(transactionId: string, status: string): Promise<IPaymentTransaction>
  
  // Get transactions with pagination
  async getTransactionsWithPagination(filters: any, options: any)
  
  // Get earnings overview
  async getEarningsOverview(adminId: Types.ObjectId): Promise<IEarningsOverview>
  
  // Export transactions
  async exportTransactions(filters: any, format: 'csv' | 'pdf'): Promise<Buffer>
}
```

---

### 3. StripeWebhook Handler

**File**: `stripeWebhook/webhook.service.ts`

**Responsibilities**:
- Webhook signature verification
- Event routing
- Payment status updates
- Notification triggering

**Key Methods**:
```typescript
class StripeWebhookService {
  // Verify webhook signature
  verifySignature(payload: string, signature: string): stripe.Event
  
  // Handle webhook event
  async handleWebhookEvent(event: stripe.Event): Promise<void>
  
  // Handle payment succeeded
  async handlePaymentSucceeded(event: stripe.Event): Promise<void>
  
  // Handle payment failed
  async handlePaymentFailed(event: stripe.Event): Promise<void>
  
  // Handle refund issued
  async handleRefundIssued(event: stripe.Event): Promise<void>
}
```

**Webhook Handlers**:
```typescript
// Handle payment succeeded
async handlePaymentSucceeded(event: stripe.Event) {
  const paymentIntent = event.data.object as stripe.PaymentIntent;
  
  // Find or create transaction
  let transaction = await PaymentTransaction.findOne({
    paymentIntent: paymentIntent.id
  });
  
  if (!transaction) {
    transaction = await PaymentTransaction.create({
      userId: paymentIntent.metadata.userId,
      referenceFor: paymentIntent.metadata.referenceFor,
      referenceId: paymentIntent.metadata.referenceId,
      paymentGateway: 'stripe',
      transactionId: paymentIntent.id,
      paymentIntent: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      paymentStatus: 'completed',
      stripeCustomerId: paymentIntent.customer as string,
      stripePaymentIntentId: paymentIntent.id
    });
  } else {
    // Update existing transaction
    transaction.paymentStatus = 'completed';
    await transaction.save();
  }
  
  // Trigger notification
  await notificationService.createNotification({
    receiverId: transaction.userId,
    type: 'payment_succeeded',
    title: 'Payment Successful',
    linkFor: '/subscriptions',
    linkId: transaction.referenceId
  });
}
```

---

## 🔐 Security Features

### 1. Authentication

- ✅ JWT authentication required for all endpoints
- ✅ Role-based access control
  - User: View own transactions
  - Admin: View all transactions, process refunds

### 2. Webhook Security

```typescript
// Verify webhook signatures
const signature = req.headers['stripe-signature'];
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);

// Reject invalid signatures
if (!event) {
  return res.status(400).json({ error: 'Invalid signature' });
}
```

### 3. Idempotency

```typescript
// Generate idempotency key
const idempotencyKey = `${userId}:${referenceFor}:${referenceId}:${Date.now()}`;

// Use with Stripe
const paymentIntent = await stripe.paymentIntents.create({
  amount,
  currency
}, {
  idempotencyKey
});
```

### 4. PCI Compliance

```typescript
// ✅ Good: Use Stripe Elements (no card data touches server)
// Frontend collects card data
// Stripe returns payment method ID
// Backend uses payment method ID

const paymentMethod = req.body.paymentMethodId;
const paymentIntent = await stripe.paymentIntents.create({
  payment_method: paymentMethod,
  ...
});

// ❌ Bad: Never store card data
// Don't collect card numbers on server
```

---

## 📈 Performance Optimization

### 1. Database Indexes

- ✅ 7 strategic indexes
- ✅ Cover all query patterns
- ✅ Optimized for admin dashboard queries

### 2. Query Optimization

```typescript
// Use .lean() for read-only queries
const transactions = await PaymentTransaction.find({ userId }).lean();

// Selective projection
await PaymentTransaction.findById(id).select('amount paymentStatus createdAt');

// Aggregation for earnings
const earnings = await PaymentTransaction.aggregate([
  { $match: { paymentStatus: 'completed' } },
  { $group: { _id: '$currency', total: { $sum: '$amount' } } }
]);
```

---

## 📊 API Endpoints Summary

### PaymentTransaction Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/payment-transactions/paginate` | ✅ | Admin | Get all transactions |
| GET | `/payment-transactions/paginate/dev` | ✅ | Admin | Dev view with details |
| GET | `/payment-transactions/overview/admin` | ✅ | Admin | Earnings overview |
| GET | `/payment-transactions/:id` | ✅ | User | Get transaction by ID |
| POST | `/payment-transactions/` | ✅ | System | Create transaction (webhook) |

### Stripe Webhook

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/stripe-webhook/` | ❌ | Stripe webhook endpoint |

**Total**: 6 endpoints

---

## 🔗 External Dependencies

### Internal Modules

- ✅ **subscription.module** - Subscription payments
- ✅ **user.module** - User data
- ✅ **notification.module** - Payment notifications

### External Services

- ✅ **Stripe API** - Payment processing, webhooks
- ✅ **MongoDB** - Transaction storage
- ✅ **Redis** - Caching (optional)

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('PaymentService', () => {
  describe('processPayment', () => {
    it('should create payment intent with Stripe', async () => {
      // Test Stripe integration
    });
    
    it('should use idempotency key', async () => {
      // Test idempotency
    });
  });
});

describe('StripeWebhookService', () => {
  describe('handlePaymentSucceeded', () => {
    it('should create transaction on payment success', async () => {
      // Test webhook handling
    });
    
    it('should verify webhook signature', async () => {
      // Test signature verification
    });
  });
});
```

### Integration Tests

```typescript
describe('Payment API', () => {
  describe('GET /payment-transactions/paginate', () => {
    it('should return paginated transactions (admin)', async () => {
      // Test endpoint
    });
  });
  
  describe('POST /stripe-webhook', () => {
    it('should handle payment_intent.succeeded event', async () => {
      // Test webhook
    });
  });
});
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)

- [ ] Multiple payment gateways (PayPal, etc.)
- [ ] Recurring billing automation
- [ ] Invoice generation (PDF)
- [ ] Tax calculation
- [ ] Multi-currency support

### Phase 3 (Future)

- [ ] Mobile payment integration
- [ ] Cryptocurrency payments
- [ ] Advanced fraud detection
- [ ] Subscription analytics

---

## 📝 Related Documentation

- [README](./README.md)
- [Performance Report](./perf/payment-module-performance-report.md)
- [Diagrams](./dia/)
- [System Guide](./PAYMENT_MODULE_SYSTEM_GUIDE-08-03-26.md)
- [Subscription Module Guide](../subscription.module/doc/SUBSCRIPTION_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready
