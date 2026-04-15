# 💳 API Flow: Subscription Management

**Role:** All Users (for user subscriptions), Admin (for plan management)  
**Figma Reference:** `main-admin-dashboard/subscription-flow.png`, `teacher-parent-dashboard/subscription/`  
**Module:** Subscription Plan, User Subscription  
**Date:** 15-03-26  
**Version:** 1.0 - Complete Flow  

---

## 🎯 User Journeys

### For Admin: Manage Subscription Plans
```
┌─────────────────────────────────────────────────────────────┐
│          ADMIN: SUBSCRIPTION PLAN MANAGEMENT                │
├─────────────────────────────────────────────────────────────┤
│  1. View All Plans → List Plans                             │
│  2. Create Plan → Define Features & Price                   │
│  3. Update Plan → Modify Price/Features                     │
│  4. Delete Plan → Remove Plan                               │
└─────────────────────────────────────────────────────────────┘
```

### For User: Subscribe to Plan
```
┌─────────────────────────────────────────────────────────────┐
│              USER: SUBSCRIPTION PURCHASE                    │
├─────────────────────────────────────────────────────────────┤
│  1. View Available Plans → Compare Features                 │
│  2. Select Plan → Choose Billing Cycle                      │
│  3. Payment → Complete Transaction                          │
│  4. Activate Subscription → Immediate Access                │
│  5. Manage Subscription → View/Cancel                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Flow 1: Admin - View All Plans

```http
GET /v1/subscription-plans/paginate?page=1&limit=20
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "_id": "plan001",
        "subscriptionName": "Individual Plan",
        "subscriptionPrice": 10.99,
        "duration": "monthly",
        "description": "Perfect for individuals",
        "features": [
          "Unlimited tasks",
          "Basic analytics",
          "Email support"
        ],
        "isActive": true
      },
      {
        "_id": "plan002",
        "subscriptionName": "Group Plan",
        "subscriptionPrice": 29.99,
        "duration": "monthly",
        "description": "For teams and families",
        "features": [
          "Up to 5 users",
          "Advanced analytics",
          "Priority support"
        ],
        "isActive": true
      }
    ],
    "total": 2
  }
}
```

---

## 📍 Flow 2: Admin - Create Plan

```http
POST /v1/subscription-plans
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "subscriptionName": "Group Plan",
  "subscriptionPrice": 29.99,
  "duration": "monthly",
  "description": "Premium package for teams",
  "features": [
    "Up to 5 users per group",
    "1 Primary account",
    "Up to 4 Secondary accounts",
    "Task management",
    "Live activity feed",
    "Permission controls"
  ]
}
```

---

## 📍 Flow 3: Admin - Update Plan

```http
PUT /v1/subscription-plans/{{planId}}
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "subscriptionPrice": 24.99,
  "description": "Updated with new features"
}
```

---

## 📍 Flow 4: Admin - Delete Plan

```http
DELETE /v1/subscription-plans/delete/{{planId}}
Authorization: Bearer {{adminToken}}
```

---

## 📍 Flow 5: User - Purchase Subscription

```http
POST /v1/subscription-plans/purchase/{{planId}}
Authorization: Bearer {{userToken}}
Content-Type: application/json

{
  "paymentMethod": "card",
  "billingCycle": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "sub001",
      "planId": "plan002",
      "userId": "user001",
      "status": "active",
      "startDate": "2026-03-15T00:00:00Z",
      "endDate": "2026-04-15T00:00:00Z"
    },
    "paymentIntent": {
      "id": "pi_123456",
      "clientSecret": "pi_123456_secret_abc"
    }
  },
  "message": "Subscription purchased successfully"
}
```

---

## 📍 Flow 6: User - Cancel Subscription

```http
POST /v1/subscription-plans/cancel
Authorization: Bearer {{userToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subscription": {
      "_id": "sub001",
      "status": "cancelled",
      "cancelledAt": "2026-03-15T10:00:00Z",
      "endDate": "2026-04-15T00:00:00Z"  // Access until end of billing period
    }
  },
  "message": "Subscription cancelled successfully"
}
```

---

## 📍 Flow 7: User - Start Free Trial

```http
POST /v1/user-subscriptions/free-trial/start
Authorization: Bearer {{userToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "trial": {
      "startDate": "2026-03-15T00:00:00Z",
      "endDate": "2026-03-22T00:00:00Z",
      "daysRemaining": 7
    }
  },
  "message": "Free trial started successfully"
}
```

---

## 📊 API Endpoint Summary

| Endpoint | Method | Role | Purpose |
|----------|--------|------|---------|
| `/subscription-plans/paginate` | GET | Admin | List plans |
| `/subscription-plans` | POST | Admin | Create plan |
| `/subscription-plans/:id` | PUT | Admin | Update plan |
| `/subscription-plans/delete/:id` | DELETE | Admin | Delete plan |
| `/subscription-plans/purchase/:id` | POST | User | Purchase |
| `/subscription-plans/cancel` | POST | User | Cancel |
| `/user-subscriptions/free-trial/start` | POST | User | Start trial |

---

**Status:** ✅ **COMPLETE**  
**Last Updated:** 15-03-26
