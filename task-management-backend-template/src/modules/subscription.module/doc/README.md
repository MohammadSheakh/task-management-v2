# 📊 Subscription Module

**Version**: 1.0.0  
**Status**: ✅ Complete  
**Last Updated**: 08-03-26

---

## 🎯 Module Purpose

The Subscription Module provides comprehensive subscription management for the Task Management System, supporting:
- **Individual Plans** ($10.99/mo) - Personal task management
- **Group Plans** ($29.99/mo) - Team/family management (up to 5 users)
- **Vise Plans** - Admin-approved custom subscriptions
- **Free Trials** - 14-day trial periods
- **Auto-Renewal** - Recurring billing via Stripe

---

## 📂 Module Structure

```
subscription.module/
├── doc/
│   ├── dia/                    # 8 Mermaid diagrams ✅
│   │   ├── subscription-schema.mermaid
│   │   ├── subscription-system-architecture.mermaid
│   │   ├── subscription-sequence.mermaid
│   │   ├── subscription-user-flow.mermaid
│   │   ├── subscription-swimlane.mermaid
│   │   ├── subscription-state-machine.mermaid
│   │   ├── subscription-component-architecture.mermaid
│   │   └── subscription-data-flow.mermaid
│   ├── README.md               # This file
│   └── perf/
│       └── subscription-module-performance-report.md
│
├── subscriptionPlan/           # Plan management
│   ├── subscriptionPlan.interface.ts
│   ├── subscriptionPlan.constant.ts
│   ├── subscriptionPlan.model.ts
│   ├── subscriptionPlan.service.ts
│   ├── subscriptionPlan.controller.ts
│   ├── subscriptionPlan.route.ts
│   └── subscriptionPlan.validation.ts
│
└── userSubscription/           # User subscriptions
    ├── userSubscription.interface.ts
    ├── userSubscription.constant.ts
    ├── userSubscription.model.ts
    ├── userSubscription.service.ts
    ├── userSubscription.controller.ts
    ├── userSubscription.route.ts
    ├── userSubscription.cron.ts    # Auto-renewal
    └── userSubscription.validation.ts
```

---

## 🚀 Features

### Subscription Plans
- ✅ Plan types: Individual, Group, Vise
- ✅ Pricing: $10.99/mo, $29.99/mo
- ✅ Stripe integration (products & prices)
- ✅ Feature lists
- ✅ Active/inactive status
- ✅ Admin CRUD operations

### User Subscriptions
- ✅ Subscribe to plans
- ✅ Cancel subscriptions
- ✅ Free trial (14 days)
- ✅ Auto-renewal (cron jobs)
- ✅ Status tracking (active, cancelled, expired, trial)
- ✅ Period tracking (start, end, current)
- ✅ Proration support

### Payment Integration
- ✅ Stripe payment processing
- ✅ Transaction recording
- ✅ Webhook handling
- ✅ Payment status tracking
- ✅ Failed payment retry

---

## 📡 API Endpoints

### Subscription Plans

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/subscription-plans/paginate` | ❌ | Public | Get active plans |
| GET | `/subscription-plans/:id` | ❌ | Public | Get plan by ID |
| POST | `/subscription-plans/` | ✅ | Admin | Create plan |
| PUT | `/subscription-plans/:id` | ✅ | Admin | Update plan |
| DELETE | `/subscription-plans/:id` | ✅ | Admin | Delete plan |
| POST | `/subscription-plans/purchase/:id` | ✅ | User | Purchase plan |

### User Subscriptions

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/user-subscriptions/paginate` | ✅ | User | Get my subscriptions |
| GET | `/user-subscriptions/:id` | ✅ | User | Get subscription details |
| POST | `/user-subscriptions/create` | ✅ | User | Create subscription |
| POST | `/user-subscriptions/cancel` | ✅ | User | Cancel subscription |
| POST | `/user-subscriptions/free-trial/start` | ✅ | User | Start free trial |
| PUT | `/user-subscriptions/update/:id` | ✅ | Admin | Update subscription |

---

## 🗄️ Database Schema

### SubscriptionPlan Collection

```typescript
{
  _id: ObjectId,
  subscriptionName: "Group Plan",
  subscriptionType: "standardPlus",
  initialDuration: "month",
  renewalFrequency: "monthly",
  amount: "29.99",
  currency: "USD",
  features: ["Up to 5 users", "1 Primary + 4 Secondary"],
  stripe_product_id: "prod_abc123",
  stripe_price_id: "price_xyz789",
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

### UserSubscription Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  subscriptionPlanId: ObjectId,
  status: "active",
  startDate: Date,
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  amount: 29.99,
  currency: "USD",
  stripe_subscription_id: "sub_abc123",
  stripe_customer_id: "cus_xyz789",
  isFreeTrial: false,
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 📊 Performance Targets

| Endpoint Type | Target Response Time | Cache Hit Rate |
|---------------|---------------------|----------------|
| Get Plans (Cached) | < 20ms | > 90% |
| Purchase Plan | < 500ms | N/A |
| Cancel Subscription | < 100ms | N/A |
| Get My Subscriptions | < 50ms | > 80% |

---

## 🔧 Dependencies

### Internal
- `payment.module` - Payment processing
- `user.module` - User data
- `paymentTransaction` - Transaction recording

### External
- Stripe API (products, prices, subscriptions)
- MongoDB (data storage)
- Redis (caching)
- Cron jobs (auto-renewal)

---

## 🧪 Testing Checklist

### Manual Testing
- [ ] Create subscription plan (Admin)
- [ ] View active plans (User)
- [ ] Purchase subscription (Stripe)
- [ ] Start free trial
- [ ] Cancel subscription
- [ ] Verify auto-renewal (cron)
- [ ] Test payment failure handling
- [ ] Verify Stripe webhook integration

### API Testing
- [ ] All endpoints respond correctly
- [ ] Authentication works
- [ ] Role-based access control
- [ ] Validation errors handled
- [ ] Pagination works

---

## 📝 Example Responses

### GET /subscription-plans/paginate

```json
{
  "success": true,
  "code": 200,
  "data": {
    "docs": [
      {
        "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
        "subscriptionName": "Individual Subscription",
        "subscriptionType": "standard",
        "amount": "10.99",
        "currency": "USD",
        "features": ["Single-user account", "Create personal tasks"],
        "isActive": true
      },
      {
        "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
        "subscriptionName": "Group Plan",
        "subscriptionType": "standardPlus",
        "amount": "29.99",
        "currency": "USD",
        "features": ["Up to 5 users", "1 Primary + 4 Secondary"],
        "isActive": true
      }
    ]
  },
  "message": "Subscription plans retrieved successfully"
}
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)
- [ ] Multiple payment gateways (PayPal, etc.)
- [ ] Coupon/discount codes
- [ ] Family plan sharing
- [ ] Usage-based billing
- [ ] Advanced analytics

### Phase 3 (Future)
- [ ] Mobile app subscriptions (App Store, Google Play)
- [ ] Enterprise plans (custom pricing)
- [ ] Team billing
- [ ] Invoice generation

---

## 🔗 Related Documentation

- [Performance Report](./perf/subscription-module-performance-report.md)
- [Schema Diagram](./dia/subscription-schema.mermaid)
- [System Architecture](./dia/subscription-system-architecture.mermaid)
- [Workflow](../workflow.md)

---

## 👥 Authors

- **Senior Backend Engineering Team**
- **Date**: 08-03-26

---

**Last Updated**: 08-03-26
