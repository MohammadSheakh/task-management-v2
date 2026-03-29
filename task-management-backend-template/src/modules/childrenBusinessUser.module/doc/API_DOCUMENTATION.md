# Children Business User Module - API Documentation

## 📋 Overview

Complete API documentation for the Children Business User Module that manages the **parent-child relationship** in family/team groups. This module enables business users (parents/teachers) to create and manage child accounts, and allows children to view their parent/guardian information.

**Base URL:** `{{baseUrl}}/v1`  
**Last Updated:** 10-03-26  
**Version:** 2.0

---

## 🏗️ Architecture

### Module Structure
```
src/modules/childrenBusinessUser.module/
├── childrenBusinessUser.constant.ts   # Constants and rate limits
├── childrenBusinessUser.interface.ts  # TypeScript interfaces
├── childrenBusinessUser.model.ts      # Mongoose schema & model
├── childrenBusinessUser.validation.ts # Zod validation schemas
├── childrenBusinessUser.service.ts    # Business logic
├── childrenBusinessUser.controller.ts # HTTP handlers
├── childrenBusinessUser.route.ts      # API routes
└── doc/                               # Documentation
    ├── API_DOCUMENTATION.md
    └── dia/                           # Mermaid diagrams
```

---

## 🔐 Authentication

All endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <access_token>
```

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `business` | Group owners, parents, teachers | Full management of children accounts |
| `child` | Group members, children/students | View parent information only |

---

## 📚 Children Business User Endpoints

**Base Path:** `/children-business-users`

### 1. Create Child Account
```http
POST /children-business-users/children
Authorization: Bearer <token>
Role: business
Rate Limit: 10 requests per hour
```

**Figma Reference:** `create-child-flow.png`

**Description:** Business user (parent/teacher) creates a child account and adds to family/team

**Request Body:**
```json
{
  "name": "Jane Child",
  "email": "jane@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `name` | Required, min 2 characters, max 50 characters |
| `email` | Required, valid email format, unique |
| `password` | Required, min 8 characters, must contain uppercase, lowercase, and number |
| `phoneNumber` | Optional, valid phone number format |

**Prerequisites:**
- Business user must have active subscription
- Must not have reached subscription limit for children accounts

**Response (201 Created):**
```json
{
  "code": 201,
  "message": "Child account created successfully and added to family",
  "data": {
    "childUser": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Jane Child",
      "email": "jane@example.com",
      "phoneNumber": "+1234567890",
      "accountCreatorId": "507f1f77bcf86cd799439010"
    },
    "relationship": {
      "_id": "507f1f77bcf86cd799439013",
      "parentBusinessUserId": "507f1f77bcf86cd799439010",
      "childUserId": "507f1f77bcf86cd799439012",
      "addedAt": "2026-03-10T10:00:00.000Z",
      "status": "active"
    }
  },
  "success": true
}
```

**Business Logic:**
1. Verifies business user has active subscription
2. Checks subscription plan's `maxChildrenAccount` limit
3. Creates child user account with `role: 'commonUser'`
4. Sets `accountCreatorId` = business user ID
5. Creates relationship record in `ChildrenBusinessUser` collection
6. Invalidates cache for business user's children list

---

### 2. Get All My Children
```http
GET /children-business-users/my-children?page=1&limit=10&status=active
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `team-member-flow-01.png`

**Description:** Get all children accounts with pagination for the authenticated business user

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max: 100) |
| `status` | string | - | Filter: `active`, `inactive`, `removed` |

**Response:**
```json
{
  "code": 200,
  "message": "Children retrieved successfully",
  "data": {
    "children": [
      {
        "_id": "507f1f77bcf86cd799439013",
        "relationshipId": "507f1f77bcf86cd799439013",
        "childUserId": "507f1f77bcf86cd799439012",
        "name": "Jane Child",
        "email": "jane@example.com",
        "phoneNumber": "+1234567890",
        "profileImage": "https://...",
        "accountCreatorId": "507f1f77bcf86cd799439010",
        "addedAt": "2026-03-10T10:00:00.000Z",
        "status": "active",
        "note": null
      },
      {
        "_id": "507f1f77bcf86cd799439014",
        "relationshipId": "507f1f77bcf86cd799439014",
        "childUserId": "507f1f77bcf86cd799439015",
        "name": "John Child",
        "email": "john@example.com",
        "phoneNumber": "+1234567891",
        "profileImage": "https://...",
        "accountCreatorId": "507f1f77bcf86cd799439010",
        "addedAt": "2026-03-09T10:00:00.000Z",
        "status": "active",
        "note": null
      }
    ],
    "count": 2,
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  },
  "success": true
}
```

**Caching:**
- Results cached for 5 minutes
- Cache invalidated on child account creation/removal

---

### 3. Get My Parent Business User
```http
GET /children-business-users/my-parent
Authorization: Bearer <token>
Role: child
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Child user retrieves their parent business user details

**Response:**
```json
{
  "code": 200,
  "message": "Parent business user retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439010",
    "name": "John Parent",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "subscriptionType": "business_level1"
  },
  "success": true
}
```

**Use Case:**
- Child needs to know who their parent/guardian is in the system
- Used in child's profile screen
- Displays parent contact information

---

### 4. Remove Child from Family
```http
DELETE /children-business-users/children/:childId
Authorization: Bearer <token>
Role: business
Rate Limit: 20 requests per hour
```

**Figma Reference:** `edit-child-flow.png`

**Description:** Remove a child account from family (soft delete)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `childId` | string | ID of the child user to remove |

**Request Body (Optional):**
```json
{
  "note": "Removed at parent's request"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Child removed from family successfully",
  "data": null,
  "success": true
}
```

**Business Logic:**
1. Soft delete (doesn't delete user account)
2. Updates relationship status to `REMOVED`
3. Sets `isDeleted: true`
4. Invalidates cache for both business and child users

**Note:** Child user account remains active, only the relationship is removed

---

### 5. Reactivate Child Account
```http
POST /children-business-users/children/:childId/reactivate
Authorization: Bearer <token>
Role: business
Rate Limit: 20 requests per hour
```

**Figma Reference:** `edit-child-flow.png`

**Description:** Reactivate a previously removed child account

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `childId` | string | ID of the child user to reactivate |

**Response:**
```json
{
  "code": 200,
  "message": "Child account reactivated successfully",
  "data": null,
  "success": true
}
```

**Business Logic:**
1. Finds previously removed relationship
2. Sets status back to `ACTIVE`
3. Sets `isDeleted: false`
4. Invalidates cache for both users

**Use Case:**
- Child was accidentally removed
- Child returns after being removed
- Temporary removal (e.g., discipline)

---

### 6. Get Children Statistics
```http
GET /children-business-users/statistics
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get statistics about children accounts (active, inactive, removed)

**Response:**
```json
{
  "code": 200,
  "message": "Statistics retrieved successfully",
  "data": {
    "active": 3,
    "inactive": 1,
    "removed": 0,
    "total": 4,
    "maxAllowed": 5,
    "remaining": 2
  },
  "success": true
}
```

**Statistics Fields:**
| Field | Description |
|-------|-------------|
| `active` | Number of active children accounts |
| `inactive` | Number of inactive children accounts |
| `removed` | Number of removed children accounts |
| `total` | Total number of children accounts |
| `maxAllowed` | Maximum allowed by subscription plan |
| `remaining` | Remaining slots available |

**Use Case:**
- Dashboard overview showing children count
- Check if can add more children
- Monitor family/team size

---

## 🎯 Key Features

### 1. Subscription-Based Limits
- Children accounts limited by subscription plan
- Enforced at API level during creation
- Statistics endpoint shows remaining slots

**Subscription Limits:**
| Plan | Max Children |
|------|--------------|
| Business Starter | 3 |
| Business Level 1 | 5 |
| Business Level 2 | 10 |

### 2. Soft Delete System
- Removed children not permanently deleted
- Can be reactivated if needed
- Data retention for audit trails

### 3. Relationship Tracking
- Separate `ChildrenBusinessUser` collection
- Tracks parent-child relationships
- Status tracking (active, inactive, removed)

### 4. Redis Caching
- Children list cached for 5 minutes
- Parent info cached for 10 minutes
- Automatic cache invalidation on updates

### 5. Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Create Child | 10 | 1 hour |
| Remove/Reactivate | 20 | 1 hour |
| General Operations | 100 | 1 minute |

---

## 📊 Database Schema

### ChildrenBusinessUser Collection
```javascript
{
  _id: ObjectId,
  parentBusinessUserId: ObjectId,    // References User (business role)
  childUserId: ObjectId,             // References User (child role)
  addedAt: Date,
  addedBy: ObjectId,                 // Who added this child
  status: String,                    // 'active' | 'inactive' | 'removed'
  note: String,                      // max 500 characters
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
// Primary query: Get all active children of a business user
{ parentBusinessUserId: 1, status: 1, isDeleted: 1 }

// Get parent business user for a child
{ childUserId: 1, status: 1, isDeleted: 1 }

// Get children by status
{ status: 1, isDeleted: 1 }
```

### User Collection (Child Users)
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,              // Hashed
  phoneNumber: String,
  role: String,                  // 'commonUser'
  accountCreatorId: ObjectId,    // References User (business)
  profileId: ObjectId,           // References UserProfile
  subscriptionType: String,      // 'none' (children don't need subscription)
  isEmailVerified: Boolean,
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
  "message": "You must have an active business subscription to add children accounts",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "You have reached the maximum limit of 5 children accounts for your Business Level 1 subscription. Please upgrade your subscription to add more children.",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Email already exists",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "You do not have permission to access this child's information",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "No active relationship found between this business user and child",
  "success": false
}
```

```json
{
  "code": 404,
  "message": "No parent business user found for this child",
  "success": false
}
```

### 429 Too Many Requests
```json
{
  "code": 429,
  "message": "Too many child account creation attempts, please try again later",
  "success": false,
  "retryAfter": 3600
}
```

---

## 🧪 Testing with cURL

### Create Child Account
```bash
curl -X POST http://localhost:6733/api/v1/children-business-users/children \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Child",
    "email": "jane@example.com",
    "password": "SecurePass123!",
    "phoneNumber": "+1234567890"
  }'
```

### Get All My Children
```bash
curl -X GET "http://localhost:6733/api/v1/children-business-users/my-children?page=1&limit=10" \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN"
```

### Get My Parent (Child User)
```bash
curl -X GET http://localhost:6733/api/v1/children-business-users/my-parent \
  -H "Authorization: Bearer CHILD_USER_TOKEN"
```

### Remove Child from Family
```bash
curl -X DELETE http://localhost:6733/api/v1/children-business-users/children/CHILD_ID \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN"
```

### Reactivate Child Account
```bash
curl -X POST http://localhost:6733/api/v1/children-business-users/children/CHILD_ID/reactivate \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN"
```

### Get Children Statistics
```bash
curl -X GET http://localhost:6733/api/v1/children-business-users/statistics \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN"
```

---

## 📝 Notes

1. **Subscription Required**: Business users need active subscription to create children accounts
2. **Soft Delete**: Children removed from family are not permanently deleted
3. **Account Creator**: Child's `accountCreatorId` field references the business user
4. **Caching**: Children list cached for 5 minutes, parent info for 10 minutes
5. **Rate Limiting**: Create child limited to 10 per hour to prevent abuse
6. **Email Verification**: Child users should verify email after account creation
7. **No Individual Subscription**: Children don't need individual subscriptions (covered by business user)

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
