# Children Business User Module - Role-Based Access Control Mapping

## Overview

This document defines the role-based access control (RBAC) for all children business user endpoints in the Task Management system. This module manages the parent-child relationship in family/team groups.

---

## Module Purpose

The Children Business User module manages:
- **Parent (Business User)**: Teachers, parents, group owners who manage family/team members
- **Child**: Group members, children who are part of a family/team

This is a **relationship module** that connects business users with their child accounts.

---

## Role Definitions

| Role | Description | Dashboard | Access Level |
|------|-------------|-----------|--------------|
| `business` | Group owners, parents, teachers | Teacher/Parent Dashboard | Full management of children |
| `child` | Group members, children | Mobile App (Child Interface) | View parent info only |
| `admin` | System administrators | Main Admin Dashboard | Platform-wide oversight |

---

## Route-to-Role Mapping

### 1. Create Child Account
```
POST /children-business-users/children
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `teacher-parent-dashboard/team-members/create-child-flow.png` |
| **Rate Limit** | 10 requests per hour |
| **Description** | Business user creates a child account and adds to family |
| **Subscription Required** | Active business subscription |

**Business Logic:**
- Verifies business user has active subscription
- Checks subscription plan's `maxChildrenAccount` limit
- Creates child user with `role: 'commonUser'`
- Sets `accountCreatorId = businessUserId`
- Creates relationship record in `ChildrenBusinessUser` collection

---

### 2. Get All My Children
```
GET /children-business-users/my-children
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `teacher-parent-dashboard/team-members/team-member-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get all children accounts with pagination |
| **Cached** | Yes - 5 minutes TTL |

**Response Includes:**
- Child user details (name, email, phone, profile image)
- Relationship status (active, inactive, removed)
- Added date
- Pagination metadata

---

### 3. Get My Parent Business User
```
GET /children-business-users/my-parent
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `app-user/group-children-user/profile-permission-account-interface.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Child user retrieves their parent business user details |
| **Cached** | Yes - 10 minutes TTL |

**Response Includes:**
- Parent's name, email, phone
- Parent's profile image
- Parent's subscription type

**Use Case:** Child needs to know who their parent/guardian is in the system

---

### 4. Remove Child from Family
```
DELETE /children-business-users/children/:childId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `teacher-parent-dashboard/team-members/edit-child-flow.png` |
| **Rate Limit** | 20 requests per hour |
| **Description** | Soft delete - remove child from family |
| **Effect** | Sets `status: 'removed'`, `isDeleted: true` |

**Business Logic:**
- Soft delete (doesn't delete user account)
- Updates relationship status to `REMOVED`
- Optional note can be added
- Invalidates cache

---

### 5. Reactivate Child Account
```
POST /children-business-users/children/:childId/reactivate
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `teacher-parent-dashboard/team-members/edit-child-flow.png` |
| **Rate Limit** | 20 requests per hour |
| **Description** | Reactivate a previously removed child account |
| **Effect** | Sets `status: 'active'`, `isDeleted: false` |

**Business Logic:**
- Restores previously removed relationship
- Child regains access to family features
- Invalidates cache

---

### 6. Get Children Statistics
```
GET /children-business-users/statistics
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `teacher-parent-dashboard/dashboard/dashboard-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get statistics about children accounts |

**Response Includes:**
```json
{
  "active": 3,
  "inactive": 1,
  "removed": 0,
  "total": 4,
  "maxAllowed": 5,
  "remaining": 2
}
```

**Use Case:** Dashboard overview showing how many children slots are used/available

---

## Role Access Matrix

```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ POST   /children                    │  ❌   │    ✅    │   ❌  │
│ GET    /my-children                 │  ❌   │    ✅    │   ❌  │
│ GET    /my-parent                   │  ❌   │    ❌    │   ✅  │
│ DELETE /children/:childId           │  ❌   │    ✅    │   ❌  │
│ POST   /children/:childId/reactivate│  ❌   │    ✅    │   ❌  │
│ GET    /statistics                  │  ❌   │    ✅    │   ❌  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

---

## Data Model

### ChildrenBusinessUser Collection

```typescript
{
  _id: ObjectId,
  parentBusinessUserId: ObjectId,  // References User (business role)
  childUserId: ObjectId,           // References User (child role)
  addedAt: Date,
  addedBy: ObjectId,               // Who added this child
  status: 'active' | 'inactive' | 'removed',
  note: String,                    // Optional note (e.g., removal reason)
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```typescript
// Primary query: Get all active children of a business user
{ parentBusinessUserId: 1, status: 1, isDeleted: 1 }

// Get parent for a child
{ childUserId: 1, status: 1, isDeleted: 1 }

// Get children by status
{ status: 1, isDeleted: 1 }
```

---

## Implementation Details

### Authentication Flow

**Business User Routes:**
```typescript
router.post('/children',
  auth(TRole.business),        // ✅ Only business role
  createChildLimiter,
  validateRequest(schema),
  controller.createChild
);
```

**Child User Routes:**
```typescript
router.get('/my-parent',
  auth(TRole.commonUser),      // ✅ Child has commonUser role
  childrenLimiter,
  controller.getParentBusinessUser
);
```

### Subscription Enforcement

Business users must have:
- Active subscription (`UserSubscription.status === 'active'`)
- Business subscription type (`business_starter`, `business_level1`, `business_level2`)
- Available slots (`currentChildrenCount < plan.maxChildrenAccount`)

### Caching Strategy

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `children:business:<id>:children` | 5 min | Children list |
| `children:business:<id>:count` | 3 min | Children count |
| `children:child:<id>:parent` | 10 min | Parent info for child |

**Cache Invalidation:**
- Create child → Invalidate business user's children list & count
- Remove child → Invalidate both business and child caches
- Reactivate child → Invalidate both caches

---

## Security Considerations

### 1. Role Isolation
- Business users can only manage their own children
- Child users can only view their own parent info
- No horizontal privilege escalation possible

### 2. Subscription Limits
- Enforced at database level before creating child
- Prevents bypassing subscription tiers
- Returns clear error messages for upgrades

### 3. Soft Delete Pattern
- Child user account is NOT deleted
- Only relationship is marked as removed
- Allows reactivation without data loss

### 4. Rate Limiting
- Create: 10/hour (prevents mass account creation)
- General: 100/minute (standard API limit)
- Remove/Reactivate: 20/hour (prevents abuse)

---

## Figma Asset References

All role assignments are based on the Figma designs located in:

```
/figma-asset/
├── teacher-parent-dashboard/
│   ├── team-members/
│   │   ├── create-child-flow.png
│   │   ├── edit-child-flow.png
│   │   └── team-member-flow-01.png
│   └── dashboard/
│       └── dashboard-flow-01.png
└── app-user/
    └── group-children-user/
        └── profile-permission-account-interface.png
```

---

## API Examples

### Create Child Account
**Request:**
```http
POST /api/v1/children-business-users/children
Authorization: Bearer <business_user_token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Child account created successfully and added to family",
  "data": {
    "childUser": {
      "_id": "child123",
      "name": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890",
      "accountCreatorId": "business456"
    },
    "relationship": {
      "_id": "rel789",
      "parentBusinessUserId": "business456",
      "childUserId": "child123",
      "addedAt": "2026-03-10T10:00:00.000Z",
      "status": "active"
    }
  }
}
```

### Get My Children
**Request:**
```http
GET /api/v1/children-business-users/my-children?page=1&limit=10
Authorization: Bearer <business_user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Children retrieved successfully",
  "data": {
    "children": [
      {
        "_id": "rel789",
        "relationshipId": "rel789",
        "childUserId": "child123",
        "name": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890",
        "profileImage": "https://...",
        "accountCreatorId": "business456",
        "addedAt": "2026-03-10T10:00:00.000Z",
        "status": "active",
        "note": null
      }
    ],
    "count": 1
  }
}
```

### Get My Parent (Child View)
**Request:**
```http
GET /api/v1/children-business-users/my-parent
Authorization: Bearer <child_user_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Parent business user retrieved successfully",
  "data": {
    "_id": "business456",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phoneNumber": "+1234567890",
    "profileImage": "https://...",
    "subscriptionType": "business_level1"
  }
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 10-03-26 | Initial role-based access control implementation |

---

**Version:** 1.0.0  
**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team
