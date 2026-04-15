# 📱 API Flow: Admin Dashboard - Super Admin Platform Management

**Role:** `admin` (System Administrator)  
**Figma Reference:** `main-admin-dashboard/`  
**Module:** Admin Analytics, User Management, Subscription Plans  
**Date:** 15-03-26  
**Version:** 1.0 - Complete HTTP Flow  

---

## 🔧 Overview

This flow covers the **Main Admin Dashboard** for system administrators to manage the entire platform.

**Key Features:**
- Platform-wide analytics dashboard
- User management (all roles)
- Subscription plan management
- System settings
- Revenue monitoring

---

## 🎯 User Journey Overview

```
┌─────────────────────────────────────────────────────────────┐
│              ADMIN DASHBOARD FLOW                           │
├─────────────────────────────────────────────────────────────┤
│  1. Login as Admin → Get Admin Token                        │
│  2. Load Dashboard → Platform Overview                      │
│  3. View Analytics → User Growth, Revenue, Tasks            │
│  4. Manage Users → Paginated List, Search, Filter           │
│  5. Manage Subscriptions → Create/Update Plans              │
│  6. Configure Settings → System Configuration               │
│  7. Monitor Activity → Real-Time Platform Stats             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Flow 1: Admin Login

### Screen: Admin Login Page

**Figma:** `main-admin-dashboard/dashboard-section-flow.png`

### Step 1: Login as Admin

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "AdminPass123!"
}
```

**Purpose:** Authenticate as admin and get access token

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "admin001",
      "name": "System Admin",
      "email": "admin@example.com",
      "role": "admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

**Save Token:**
```javascript
localStorage.setItem('adminToken', tokens.accessToken);
```

---

## 📍 Flow 2: Dashboard Initial Load

### Screen: Admin Dashboard Home

**Figma:** `main-admin-dashboard/dashboard-section-flow.png`

### API Calls (Parallel):

#### 2.1 Get Complete Dashboard Overview
```http
GET /v1/analytics/admin/dashboard
Authorization: Bearer {{adminToken}}
```

**Purpose:** Load complete dashboard with all statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 1250,
      "totalGroups": 85,
      "totalTasks": 5420,
      "activeUsersToday": 342,
      "activeUsersThisWeek": 890,
      "activeUsersThisMonth": 1150,
      "dauMauRatio": 0.77
    },
    "userGrowth": {
      "today": 12,
      "thisWeek": 85,
      "thisMonth": 320,
      "growthRate": {
        "daily": 5.2,
        "weekly": 12.8,
        "monthly": 34.5
      },
      "history": [
        {
          "date": "2026-03-01",
          "totalUsers": 930,
          "newUsers": 15
        }
      ]
    },
    "revenue": {
      "mrr": 15420.50,
      "arr": 185046.00,
      "thisMonth": 12850.00,
      "lastMonth": 11200.00,
      "growthRate": 14.7,
      "bySubscriptionType": {
        "individual": {
          "count": 850,
          "revenue": 9340.50
        },
        "group": {
          "count": 85,
          "revenue": 6080.00
        }
      }
    },
    "taskMetrics": {
      "createdToday": 245,
      "completedToday": 198,
      "completionRate": 80.8,
      "averageTasksPerUser": 4.3,
      "byStatus": {
        "pending": 1250,
        "inProgress": 890,
        "completed": 3280
      },
      "byTaskType": {
        "personal": 2150,
        "singleAssignment": 1890,
        "collaborative": 1380
      }
    },
    "engagement": {
      "dau": 342,
      "mau": 1150,
      "dauMauRatio": 0.77,
      "averageSessionDuration": 1245,
      "sessionsPerUser": 3.2,
      "retentionRate": {
        "day1": 85.5,
        "day7": 62.3,
        "day30": 45.8
      }
    },
    "topGroups": [
      {
        "groupId": "grp001",
        "name": "Smith Family",
        "memberCount": 5,
        "tasksCompleted": 142,
        "completionRate": 88.5
      }
    ],
    "recentUsers": [
      {
        "userId": "user001",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "createdAt": "2026-03-14T10:30:00Z"
      }
    ],
    "lastUpdated": "2026-03-15T08:00:00Z"
  }
}
```

---

## 📍 Flow 3: User Management

### Screen: User List & Management

**Figma:** `main-admin-dashboard/user-list-flow.png`

### Step 1: Get All Users (Paginated)

```http
GET /v1/users/paginate?page=1&limit=20&role=user&name=John
Authorization: Bearer {{adminToken}}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `role` (optional): Filter by role: `user`, `business`, `admin`, `subAdmin`
- `name` (optional): Search by name
- `from` (optional): Start date filter (ISO format)
- `to` (optional): End date filter (ISO format)

**Purpose:** Get paginated list of users with filtering

**Response:**
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "_id": "user001",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "user",
        "phoneNumber": "+1234567890",
        "profileImage": "https://...",
        "isEmailVerified": true,
        "createdAt": "2026-03-01T10:00:00Z",
        "lastActiveAt": "2026-03-15T08:30:00Z"
      }
    ],
    "totalPages": 63,
    "page": 1,
    "limit": 20,
    "total": 1250
  }
}
```

---

### Step 2: Get User Details

```http
GET /v1/users/{{userId}}
Authorization: Bearer {{adminToken}}
```

**Purpose:** Get detailed information about a specific user

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user001",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "user",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "isEmailVerified": true,
    "subscription": {
      "type": "individual",
      "status": "active",
      "expiresAt": "2026-04-01T00:00:00Z"
    },
    "statistics": {
      "totalTasks": 45,
      "completedTasks": 32,
      "completionRate": 71.1
    },
    "createdAt": "2026-03-01T10:00:00Z",
    "lastActiveAt": "2026-03-15T08:30:00Z"
  }
}
```

---

### Step 3: Send Invitation to Sub-Admin

```http
POST /v1/users/send-invitation-link-to-admin-email
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "email": "subadmin@example.com",
  "name": "New Sub Admin",
  "role": "subAdmin",
  "phoneNumber": "+1234567890",
  "password": "TempPass123!",
  "message": "You are invited to join as sub-admin"
}
```

**Purpose:** Create sub-admin and send invitation email

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Invitation sent successfully",
    "user": {
      "_id": "subadmin001",
      "email": "subadmin@example.com",
      "role": "subAdmin"
    }
  }
}
```

---

### Step 4: Remove Sub-Admin (Soft Delete)

```http
PUT /v1/users/remove-sub-admin/{{userId}}
Authorization: Bearer {{adminToken}}
```

**Purpose:** Remove/deactivate a sub-admin

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Sub-admin removed successfully",
    "user": {
      "_id": "subadmin001",
      "isDeleted": true,
      "deletedAt": "2026-03-15T09:00:00Z"
    }
  }
}
```

---

### Step 5: Soft Delete User

```http
PUT /v1/users/softDelete/{{userId}}
Authorization: Bearer {{adminToken}}
```

**Purpose:** Soft delete a user (can be restored)

**Response:**
```json
{
  "success": true,
  "message": "User soft deleted successfully"
}
```

---

### Step 6: Permanently Delete User

```http
DELETE /v1/users/delete/{{userId}}
Authorization: Bearer {{adminToken}}
```

**Purpose:** Permanently delete a user (cannot be restored)

**Response:**
```json
{
  "success": true,
  "message": "User permanently deleted successfully"
}
```

---

## 📍 Flow 4: Analytics & Charts

### Screen: Dashboard Analytics Section

**Figma:** `main-admin-dashboard/dashboard-section-flow.png`

### API Calls (As Needed):

#### 4.1 Get User Growth Analytics
```http
GET /v1/analytics/admin/user-growth
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "today": 12,
    "thisWeek": 85,
    "thisMonth": 320,
    "growthRate": {
      "daily": 5.2,
      "weekly": 12.8,
      "monthly": 34.5
    },
    "history": [
      {
        "date": "2026-03-01",
        "totalUsers": 930,
        "newUsers": 15
      }
    ]
  }
}
```

---

#### 4.2 Get Revenue Analytics
```http
GET /v1/analytics/admin/revenue
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mrr": 15420.50,
    "arr": 185046.00,
    "thisMonth": 12850.00,
    "lastMonth": 11200.00,
    "growthRate": 14.7,
    "bySubscriptionType": {
      "individual": {
        "count": 850,
        "revenue": 9340.50
      },
      "group": {
        "count": 85,
        "revenue": 6080.00
      }
    },
    "history": [
      {
        "month": "2026-02",
        "revenue": 11200.00,
        "newSubscriptions": 45,
        "churnedSubscriptions": 12
      }
    ]
  }
}
```

---

#### 4.3 Get Task Metrics
```http
GET /v1/analytics/admin/task-metrics
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "createdToday": 245,
    "completedToday": 198,
    "completionRate": 80.8,
    "averageTasksPerUser": 4.3,
    "byStatus": {
      "pending": 1250,
      "inProgress": 890,
      "completed": 3280
    },
    "byTaskType": {
      "personal": 2150,
      "singleAssignment": 1890,
      "collaborative": 1380
    },
    "trend": {
      "direction": "increasing",
      "percentageChange": 12.5,
      "period": "day"
    }
  }
}
```

---

#### 4.4 Get Engagement Metrics
```http
GET /v1/analytics/admin/engagement
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "dau": 342,
    "mau": 1150,
    "dauMauRatio": 0.77,
    "averageSessionDuration": 1245,
    "sessionsPerUser": 3.2,
    "retentionRate": {
      "day1": 85.5,
      "day7": 62.3,
      "day30": 45.8
    }
  }
}
```

---

#### 4.5 Get User Ratio Chart Data
```http
GET /v1/analytics/admin/user-ratio?type=monthly
Authorization: Bearer {{adminToken}}
```

**Query Parameters:**
- `type` (optional): `daily` | `weekly` | `monthly` | `yearly` (default: monthly)

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "monthly",
    "data": [
      {
        "period": "Sep 2025",
        "totalUsers": 930,
        "activeUsers": 715,
        "newUsers": 85,
        "inactiveUsers": 215,
        "activityRate": 76.9
      }
    ],
    "summary": {
      "totalUsers": 5580,
      "averageActiveUsers": 715.5,
      "averageActivityRate": 76.9,
      "trend": "increasing",
      "percentageChange": 12.5
    }
  }
}
```

---

## 📍 Flow 5: Subscription Plan Management

### Screen: Subscription Management

**Figma:** `main-admin-dashboard/subscription-flow.png`

### Step 1: Get All Subscription Plans

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
        "isActive": true,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "total": 2
  }
}
```

---

### Step 2: Create Subscription Plan

```http
POST /v1/subscription-plans
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "subscriptionName": "Group Plan",
  "subscriptionPrice": 29.99,
  "duration": "monthly",
  "description": "Premium monthly package for teams and families",
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

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "plan002",
    "subscriptionName": "Group Plan",
    "subscriptionPrice": 29.99,
    "duration": "monthly",
    "isActive": true
  },
  "message": "Subscription plan created successfully"
}
```

---

### Step 3: Update Subscription Plan

```http
PUT /v1/subscription-plans/{{planId}}
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "subscriptionPrice": 24.99,
  "description": "Updated description with new features"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "plan002",
    "subscriptionPrice": 24.99,
    "description": "Updated description with new features"
  },
  "message": "Subscription plan updated successfully"
}
```

---

### Step 4: Delete Subscription Plan

```http
DELETE /v1/subscription-plans/delete/{{planId}}
Authorization: Bearer {{adminToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription plan deleted successfully"
}
```

---

## 📍 Flow 6: System Settings

### Screen: System Settings

**Figma:** `main-admin-dashboard/dashboard-section-flow.png`

### Step 1: Get System Settings

```http
GET /v1/settings?type=system
Authorization: Bearer {{adminToken}}
```

**Query Parameters:**
- `type` (optional): `system`, `email`, `notification`, etc.

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "system",
    "dailyTaskLimit": 10,
    "maxGroupSize": 10,
    "enableNotifications": true,
    "maintenanceMode": false,
    "updatedAt": "2026-03-01T00:00:00Z"
  }
}
```

---

### Step 2: Update System Settings

```http
POST /v1/settings
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "type": "system",
  "dailyTaskLimit": 15,
  "maxGroupSize": 15,
  "enableNotifications": true,
  "maintenanceMode": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "system",
    "dailyTaskLimit": 15,
    "maxGroupSize": 15
  },
  "message": "Settings updated successfully"
}
```

---

## 📍 Flow 7: Admin Notifications

### Screen: Send Bulk Notification

**Figma:** `main-admin-dashboard/dashboard-section-flow.png`

### Step 1: Send Bulk Notification

```http
POST /v1/notifications/bulk
Authorization: Bearer {{adminToken}}
Content-Type: application/json

{
  "title": "System Maintenance",
  "subTitle": "Scheduled maintenance on Sunday",
  "type": "system",
  "priority": "high",
  "channels": ["in_app", "email"],
  "receiverRole": "user"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "notif001",
    "recipientCount": 1250,
    "channels": ["in_app", "email"]
  },
  "message": "Bulk notification sent successfully"
}
```

---

## 🎯 Complete Admin Journey Example

```javascript
// 1. Login
const loginResponse = await fetch('/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'AdminPass123!'
  })
});
const { tokens } = await loginResponse.json();

// 2. Load Dashboard
const dashboard = await fetch('/v1/analytics/admin/dashboard', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
});

// 3. Load Users
const users = await fetch('/v1/users/paginate?page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
});

// 4. Load Analytics Charts
const [userGrowth, revenue, taskMetrics] = await Promise.all([
  fetch('/v1/analytics/admin/user-growth', {
    headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
  }),
  fetch('/v1/analytics/admin/revenue', {
    headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
  }),
  fetch('/v1/analytics/admin/task-metrics', {
    headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
  })
]);

// 5. Create Subscription Plan
const newPlan = await fetch('/v1/subscription-plans', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${tokens.accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    subscriptionName: 'Group Plan',
    subscriptionPrice: 29.99,
    duration: 'monthly'
  })
});
```

---

## 📊 API Endpoint Summary

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/auth/login` | POST | Admin login | 5/15min |
| `/analytics/admin/dashboard` | GET | Complete dashboard | 100/min |
| `/analytics/admin/user-growth` | GET | User growth stats | 100/min |
| `/analytics/admin/revenue` | GET | Revenue analytics | 100/min |
| `/analytics/admin/task-metrics` | GET | Task statistics | 100/min |
| `/analytics/admin/engagement` | GET | Engagement metrics | 100/min |
| `/analytics/admin/user-ratio` | GET | User ratio charts | 100/min |
| `/users/paginate` | GET | User list | 100/min |
| `/users/:id` | GET | User details | 100/min |
| `/users/send-invitation-link-to-admin-email` | POST | Invite sub-admin | 20/hour |
| `/users/remove-sub-admin/:id` | PUT | Remove sub-admin | 20/hour |
| `/users/softDelete/:id` | PUT | Soft delete user | 20/hour |
| `/users/delete/:id` | DELETE | Permanent delete | 20/hour |
| `/subscription-plans/paginate` | GET | Get plans | 100/min |
| `/subscription-plans` | POST | Create plan | 20/hour |
| `/subscription-plans/:id` | PUT | Update plan | 20/hour |
| `/subscription-plans/delete/:id` | DELETE | Delete plan | 20/hour |
| `/settings` | GET | Get settings | 100/min |
| `/settings` | POST | Update settings | 20/hour |
| `/notifications/bulk` | POST | Send bulk notification | 10/hour |

---

## 🔐 Authentication & Authorization

**Role Required:** `admin`

**Token Type:** JWT Access Token

**Rate Limits:**
- Auth endpoints: 5 attempts per 15 minutes
- Admin endpoints: 200 requests per minute per userId
- Sensitive operations (delete): 20 requests per hour

---

## 📝 Error Handling

### Common Error Responses

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized: Invalid or expired token"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Forbidden: Admin role required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**429 Too Many Requests:**
```json
{
  "success": false,
  "message": "Too many requests, please try again later",
  "retryAfter": 300
}
```

---

## ✅ Status

**Flow Documentation:** ✅ **COMPLETE**  
**Backend Implementation:** ✅ **COMPLETE**  
**Postman Collection:** ✅ **ALIGNED** (01-Super-Admin.postman_collection.json v2)  
**Figma Alignment:** ✅ **VERIFIED**  

---

**Last Updated:** 15-03-26  
**Version:** 1.0  
**Maintained By:** Backend Engineering Team
