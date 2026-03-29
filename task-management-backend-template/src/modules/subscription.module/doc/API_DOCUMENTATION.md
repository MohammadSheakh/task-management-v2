# Subscription Module - API Documentation

## 📋 Overview

Complete API documentation for the Subscription Module with support for **subscription plan management**, **user subscriptions**, **free trials**, and **subscription cancellation**.

**Base URL:** `{{baseUrl}}/v1`  
**Last Updated:** 10-03-26  
**Version:** 2.0

---

## 🏗️ Architecture

### Module Structure
```
src/modules/subscription.module/
├── subscriptionPlan/        # Subscription Plan Management
│   ├── subscriptionPlan.controller.ts
│   ├── subscriptionPlan.service.ts
│   ├── subscriptionPlan.interface.ts
│   ├── subscriptionPlan.validation.ts
│   └── subscriptionPlan.route.ts
│
├── userSubscription/        # User Subscription Management
│   ├── userSubscription.controller.ts
│   ├── userSubscription.service.ts
│   ├── userSubscription.interface.ts
│   ├── userSubscription.constant.ts
│   └── userSubscription.route.ts
│
└── doc/                     # Documentation
    ├── API_DOCUMENTATION.md
    └── dia/                 # Mermaid diagrams
```

---

## 🔐 Authentication

Most endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <access_token>
```

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `patient` | Regular users (customers) | Purchase & manage own subscriptions |
| `admin` | System administrators | Full subscription plan management |
| `public` | No authentication | View active subscription plans |

---

## 📚 Subscription Plan Endpoints

**Base Path:** `/subscription-plans`

### 1. Get All Active Subscription Plans
```http
GET /subscription-plans/paginate?page=1&limit=10&sortBy=-createdAt
Authorization: Optional (Public endpoint)
Role: public, patient, admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Get all active subscription plans with pagination

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max: 100) |
| `sortBy` | string | `-createdAt` | Sort field (`-` for descending) |

**Auto-Filter:** Only returns plans where `isActive: true`

**Response:**
```json
{
  "code": 200,
  "message": "Subscription plans retrieved successfully",
  "data": {
    "subscriptionPlans": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "subscriptionName": "Individual Plan",
        "subscriptionType": "individual",
        "amount": 10.99,
        "currency": "USD",
        "billingCycle": "monthly",
        "description": "Perfect for individual users",
        "features": [
          "Up to 50 tasks per month",
          "Basic analytics",
          "Email support"
        ],
        "maxUsers": 1,
        "maxChildrenAccount": 0,
        "isActive": true,
        "isPopular": false,
        "createdAt": "2026-01-01T10:00:00.000Z"
      },
      {
        "_id": "507f1f77bcf86cd799439012",
        "subscriptionName": "Group Plan",
        "subscriptionType": "business_level1",
        "amount": 29.99,
        "currency": "USD",
        "billingCycle": "monthly",
        "description": "Perfect for families and teams",
        "features": [
          "Unlimited tasks",
          "Advanced analytics",
          "Priority support",
          "Up to 5 family members"
        ],
        "maxUsers": 5,
        "maxChildrenAccount": 5,
        "isActive": true,
        "isPopular": true,
        "createdAt": "2026-01-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "totalPages": 1
    }
  },
  "success": true
}
```

---

### 2. Get Subscription Plan by ID
```http
GET /subscription-plans/:id
Authorization: Optional
Role: public, patient, admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Get detailed information about a specific subscription plan

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Subscription plan ID |

**Response:**
```json
{
  "code": 200,
  "message": "Subscription plan retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "subscriptionName": "Individual Plan",
    "subscriptionType": "individual",
    "amount": 10.99,
    "currency": "USD",
    "billingCycle": "monthly",
    "description": "Perfect for individual users",
    "features": [
      "Up to 50 tasks per month",
      "Basic analytics",
      "Email support"
    ],
    "maxUsers": 1,
    "maxChildrenAccount": 0,
    "trialPeriodDays": 7,
    "isActive": true,
    "isPopular": false,
    "createdAt": "2026-01-01T10:00:00.000Z",
    "updatedAt": "2026-01-05T14:00:00.000Z"
  },
  "success": true
}
```

---

### 3. Get All Subscription Plans
```http
GET /subscription-plans
Authorization: Optional
Role: public, patient, admin
Rate Limit: 100 requests per minute
```

**Description:** Get all subscription plans (including inactive)

**Response:**
```json
{
  "code": 200,
  "message": "Subscription plans retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "subscriptionName": "Individual Plan",
      "subscriptionType": "individual",
      "amount": 10.99,
      "currency": "USD",
      "isActive": true
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "subscriptionName": "Group Plan",
      "subscriptionType": "business_level1",
      "amount": 29.99,
      "currency": "USD",
      "isActive": true
    }
  ],
  "success": true
}
```

---

### 4. Create Subscription Plan (Admin)
```http
POST /subscription-plans
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Create a new subscription plan (admin only)

**Request Body:**
```json
{
  "subscriptionName": "Business Level 2",
  "subscriptionType": "business_level2",
  "amount": 49.99,
  "currency": "USD",
  "billingCycle": "monthly",
  "description": "For large families and organizations",
  "features": [
    "Unlimited tasks",
    "Premium analytics",
    "24/7 phone support",
    "Up to 10 family members",
    "Custom integrations"
  ],
  "maxUsers": 10,
  "maxChildrenAccount": 10,
  "trialPeriodDays": 14,
  "isActive": true,
  "isPopular": false
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `subscriptionName` | Required, min 3 characters, max 100 characters |
| `subscriptionType` | Required, unique: `individual`, `business_starter`, `business_level1`, `business_level2` |
| `amount` | Required, positive number, max 2 decimal places |
| `currency` | Required, 3-letter ISO currency code |
| `billingCycle` | Required: `monthly`, `yearly`, `lifetime` |
| `features` | Required, array of strings |
| `maxUsers` | Required, positive integer |
| `maxChildrenAccount` | Required, positive integer |

**Response (201 Created):**
```json
{
  "code": 201,
  "message": "Subscription plan created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "subscriptionName": "Business Level 2",
    "subscriptionType": "business_level2",
    "amount": 49.99,
    "currency": "USD",
    "isActive": true,
    "createdAt": "2026-03-10T10:00:00.000Z"
  },
  "success": true
}
```

---

### 5. Update Subscription Plan (Admin)
```http
PUT /subscription-plans/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Update an existing subscription plan (admin only)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Subscription plan ID |

**Request Body:**
```json
{
  "subscriptionName": "Business Level 2 Updated",
  "amount": 39.99,
  "features": [
    "Unlimited tasks",
    "Premium analytics",
    "24/7 support",
    "Up to 10 family members"
  ],
  "isActive": true
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Subscription plan updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "subscriptionName": "Business Level 2 Updated",
    "subscriptionType": "business_level2",
    "amount": 39.99,
    "currency": "USD",
    "isActive": true,
    "updatedAt": "2026-03-10T14:00:00.000Z"
  },
  "success": true
}
```

---

### 6. Delete Subscription Plan (Admin)
```http
DELETE /subscription-plans/delete/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Description:** Permanently delete a subscription plan (admin only)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Subscription plan ID |

**Response:**
```json
{
  "code": 200,
  "message": "Subscription plan deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "isDeleted": true
  },
  "success": true
}
```

---

### 7. Soft Delete Subscription Plan (Admin)
```http
PUT /subscription-plans/softDelete/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Description:** Soft delete a subscription plan (set isDeleted flag)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | Subscription plan ID |

**Response:**
```json
{
  "code": 200,
  "message": "Subscription plan soft deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "isDeleted": true
  },
  "success": true
}
```

---

## 👤 User Subscription Endpoints

**Base Path:** `/user-subscriptions`

### 1. Get My Subscriptions
```http
GET /user-subscriptions/paginate?page=1&limit=6&sortBy=-createdAt
Authorization: Bearer <token>
Role: patient
Rate Limit: 100 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Get user's own subscription history with pagination

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 6 | Items per page |
| `sortBy` | string | `-createdAt` | Sort field |

**Auto-Filter:**
- Returns only user's own subscriptions
- Excludes `processing` status
- Populates subscription plan details

**Response:**
```json
{
  "code": 200,
  "message": "User subscriptions retrieved successfully",
  "data": {
    "userSubscriptions": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "userId": {
          "_id": "507f1f77bcf86cd799439010",
          "name": "John Doe",
          "email": "john@example.com",
          "subscriptionType": "business_level1"
        },
        "subscriptionPlanId": {
          "_id": "507f1f77bcf86cd799439012",
          "subscriptionName": "Group Plan",
          "subscriptionType": "business_level1",
          "amount": 29.99,
          "currency": "USD"
        },
        "status": "active",
        "startDate": "2026-03-01T00:00:00.000Z",
        "endDate": "2026-04-01T00:00:00.000Z",
        "amount": 29.99,
        "currency": "USD",
        "paymentMethod": "stripe",
        "isTrialSubscription": false,
        "createdAt": "2026-03-01T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 6,
      "total": 3,
      "totalPages": 1
    }
  },
  "success": true
}
```

---

### 2. Get User Subscription by ID
```http
GET /user-subscriptions/:id
Authorization: Optional
Role: public, patient, admin
Rate Limit: 100 requests per minute
```

**Description:** Get detailed information about a specific user subscription

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User subscription ID |

**Response:**
```json
{
  "code": 200,
  "message": "User subscription retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "userId": "507f1f77bcf86cd799439010",
    "subscriptionPlanId": "507f1f77bcf86cd799439012",
    "status": "active",
    "startDate": "2026-03-01T00:00:00.000Z",
    "endDate": "2026-04-01T00:00:00.000Z",
    "amount": 29.99,
    "currency": "USD",
    "paymentMethod": "stripe",
    "isTrialSubscription": false,
    "createdAt": "2026-03-01T10:00:00.000Z"
  },
  "success": true
}
```

---

### 3. Get All User Subscriptions (Admin)
```http
GET /user-subscriptions
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Description:** Get all user subscriptions (admin only)

**Response:**
```json
{
  "code": 200,
  "message": "User subscriptions retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439021",
      "userId": "507f1f77bcf86cd799439010",
      "subscriptionPlanId": "507f1f77bcf86cd799439012",
      "status": "active",
      "amount": 29.99
    }
  ],
  "success": true
}
```

---

### 4. Start Free Trial
```http
POST /user-subscriptions/free-trial/start
Authorization: Bearer <token>
Role: patient
Rate Limit: 10 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Start a free trial subscription for the authenticated user

**Request Body:**
```json
{
  "subscriptionPlanId": "507f1f77bcf86cd799439012"
}
```

**Eligibility Rules:**
- User must not have an active subscription
- User must not have used free trial before
- Subscription plan must offer trial period

**Response (201 Created):**
```json
{
  "code": 201,
  "message": "Free trial started successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "userId": "507f1f77bcf86cd799439010",
    "subscriptionPlanId": "507f1f77bcf86cd799439012",
    "status": "trial",
    "startDate": "2026-03-10T00:00:00.000Z",
    "endDate": "2026-03-17T00:00:00.000Z",
    "isTrialSubscription": true,
    "trialDays": 7
  },
  "success": true
}
```

---

### 5. Cancel Subscription
```http
POST /user-subscriptions/cancel
Authorization: Bearer <token>
Role: patient
Rate Limit: 10 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Cancel user's own subscription

**Request Body:**
```json
{
  "subscriptionId": "507f1f77bcf86cd799439021",
  "cancellationReason": "No longer needed"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Subscription cancelled successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "status": "cancelled",
    "cancelledAt": "2026-03-10T14:00:00.000Z",
    "cancellationReason": "No longer needed",
    "accessUntil": "2026-04-01T00:00:00.000Z"
  },
  "success": true
}
```

**Note:** User retains access until the end of the billing period

---

### 6. Cancel Patient's Subscription & Assign Vice Subscription (Admin)
```http
POST /user-subscriptions/cancel-for-patient
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Admin cancels a patient's subscription and assigns vice subscription

**Request Body:**
```json
{
  "personId": "507f1f77bcf86cd799439010",
  "newSubscriptionPlanId": "507f1f77bcf86cd799439011",
  "reason": "Administrative action"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Patient's subscription cancelled and vice subscription assigned successfully",
  "data": {
    "previousSubscription": {
      "_id": "507f1f77bcf86cd799439021",
      "status": "cancelled",
      "cancelledAt": "2026-03-10T14:00:00.000Z"
    },
    "newSubscription": {
      "_id": "507f1f77bcf86cd799439022",
      "subscriptionPlanId": "507f1f77bcf86cd799439011",
      "status": "active",
      "startDate": "2026-03-10T00:00:00.000Z",
      "endDate": "2026-04-10T00:00:00.000Z"
    }
  },
  "success": true
}
```

---

### 7. Update User Subscription (Admin)
```http
PUT /user-subscriptions/update/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Description:** Update a user subscription (admin only)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User subscription ID |

**Request Body:**
```json
{
  "status": "active",
  "endDate": "2026-05-01T00:00:00.000Z"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "User subscription updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "status": "active",
    "endDate": "2026-05-01T00:00:00.000Z",
    "updatedAt": "2026-03-10T14:00:00.000Z"
  },
  "success": true
}
```

---

### 8. Delete User Subscription (Admin)
```http
DELETE /user-subscriptions/delete/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Description:** Permanently delete a user subscription (admin only)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User subscription ID |

**Response:**
```json
{
  "code": 200,
  "message": "User subscription deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "isDeleted": true
  },
  "success": true
}
```

---

### 9. Soft Delete User Subscription (Admin)
```http
PUT /user-subscriptions/softDelete/:id
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 20 requests per minute
```

**Description:** Soft delete a user subscription (set isDeleted flag)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | string | User subscription ID |

**Response:**
```json
{
  "code": 200,
  "message": "User subscription soft deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439021",
    "isDeleted": true
  },
  "success": true
}
```

---

## 🎯 Key Features

### 1. Subscription Plan Types
| Type | Description | Max Users | Max Children |
|------|-------------|-----------|--------------|
| `individual` | Personal use | 1 | 0 |
| `business_starter` | Small teams | 3 | 3 |
| `business_level1` | Families | 5 | 5 |
| `business_level2` | Large organizations | 10 | 10 |

### 2. Subscription Status
| Status | Description |
|--------|-------------|
| `active` | Currently active subscription |
| `trial` | Free trial period |
| `cancelled` | Cancelled by user |
| `expired` | Past end date |
| `processing` | Payment processing |

### 3. Billing Cycles
| Cycle | Description |
|-------|-------------|
| `monthly` | Billed every month |
| `yearly` | Billed annually (save 20%) |
| `lifetime` | One-time payment |

### 4. Free Trial System
- Trial period defined per subscription plan
- One trial per user
- Automatic conversion to paid subscription after trial

### 5. Soft Delete System
- Subscriptions marked as deleted instead of hard deletion
- Data retention for audit trails
- Can be restored if needed

---

## 📊 Database Schema

### SubscriptionPlan Collection
```javascript
{
  _id: ObjectId,
  subscriptionName: String,              // e.g., "Group Plan"
  subscriptionType: String,              // 'individual' | 'business_starter' | 'business_level1' | 'business_level2'
  amount: Number,                        // Price amount
  currency: String,                      // 'USD', 'EUR', etc.
  billingCycle: String,                  // 'monthly' | 'yearly' | 'lifetime'
  description: String,
  features: [String],
  maxUsers: Number,
  maxChildrenAccount: Number,
  trialPeriodDays: Number,
  isActive: Boolean,
  isPopular: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### UserSubscription Collection
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                      // References User
  subscriptionPlanId: ObjectId,          // References SubscriptionPlan
  status: String,                        // 'active' | 'trial' | 'cancelled' | 'expired' | 'processing'
  startDate: Date,
  endDate: Date,
  amount: Number,
  currency: String,
  paymentMethod: String,                 // 'stripe', 'paypal', etc.
  isTrialSubscription: Boolean,
  cancellationReason: String,
  cancelledAt: Date,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "You have already used your free trial",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Invalid subscription plan ID",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "You do not have permission to access this subscription",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Subscription plan not found",
  "success": false
}
```

```json
{
  "code": 404,
  "message": "User subscription not found",
  "success": false
}
```

---

## 🧪 Testing with cURL

### Get All Subscription Plans
```bash
curl -X GET "http://localhost:6733/api/v1/subscription-plans/paginate?page=1&limit=10" \
  -H "Content-Type: application/json"
```

### Start Free Trial
```bash
curl -X POST http://localhost:6733/api/v1/user-subscriptions/free-trial/start \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionPlanId": "507f1f77bcf86cd799439012"
  }'
```

### Get My Subscriptions
```bash
curl -X GET "http://localhost:6733/api/v1/user-subscriptions/paginate?page=1&limit=6" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Cancel Subscription
```bash
curl -X POST http://localhost:6733/api/v1/user-subscriptions/cancel \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "507f1f77bcf86cd799439021",
    "cancellationReason": "No longer needed"
  }'
```

### Create Subscription Plan (Admin)
```bash
curl -X POST http://localhost:6733/api/v1/subscription-plans \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionName": "Business Level 2",
    "subscriptionType": "business_level2",
    "amount": 49.99,
    "currency": "USD",
    "billingCycle": "monthly",
    "description": "For large families",
    "features": ["Unlimited tasks", "Premium support"],
    "maxUsers": 10,
    "maxChildrenAccount": 10,
    "isActive": true
  }'
```

---

## 📝 Notes

1. **Public Access**: Subscription plans can be viewed without authentication
2. **Trial Limit**: One free trial per user lifetime
3. **Cancellation**: Users retain access until end of billing period
4. **Soft Delete**: Subscriptions use `isDeleted` flag instead of hard deletion
5. **Pagination**: Default limit is 6 for user subscriptions, 10 for plans
6. **Currency**: All amounts stored in cents/smallest unit
7. **Auto-Renewal**: Not implemented yet (manual renewal required)

---

## 🚀 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start
```

---

## 📞 Support

For issues or questions:
- Check error messages
- Review server logs
- Contact backend team

---

**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team  
**Status:** ✅ Complete and Production-Ready
