# Children Business User Module

**Version**: 1.0.0  
**Last Updated**: 09-03-26  
**Status**: ✅ Complete

---

## 🎯 Module Purpose

Manages the parent-child relationship between business users (parents/teachers) and their children accounts. This module ensures:

1. Business users can create children accounts up to their subscription limit
2. Each child is linked to their parent business user via `accountCreatorId`
3. Children are automatically added to the family group
4. One family group per business user (auto-created)

---

## 📋 Responsibilities

- Create child accounts with subscription limit enforcement
- Track parent-child relationships
- Auto-create family groups when needed
- Manage child account status (active/inactive/removed)
- Provide children statistics and counts
- Redis caching for performance

---

## 🏗️ Schema Design

See: [`dia/childrenBusinessUser-schema.mermaid`](./dia/childrenBusinessUser-schema.mermaid)

**Key Relationships**:
- `ChildrenBusinessUser.parentBusinessUserId` → `User._id` (business user)
- `ChildrenBusinessUser.childUserId` → `User._id` (child account)
- `User.accountCreatorId` → `User._id` (who created this account)
- `User.familyGroupId` → `Group._id` (auto-created family)

---

## 🔄 System Flow

See: [`dia/childrenBusinessUser-flow.mermaid`](./dia/childrenBusinessUser-flow.mermaid)

**Flow Summary**:
1. Business user creates child account
2. System checks subscription limit
3. Creates child user with `accountCreatorId = businessUserId`
4. Creates parent-child relationship record
5. Auto-creates or gets family group
6. Adds child to family group
7. Invalidates cache

---

## 📡 API Endpoints

### Create Child Account
```http
POST /children-business-users/children
Authorization: Bearer <token> (Business User)

Request:
{
  "name": "John Child",
  "email": "child@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890"
}

Response (201):
{
  "success": true,
  "message": "Child account created successfully and added to family",
  "data": {
    "childUser": {
      "_id": "...",
      "name": "John Child",
      "email": "child@example.com",
      "accountCreatorId": "..."
    },
    "relationship": {
      "_id": "...",
      "parentBusinessUserId": "...",
      "childUserId": "...",
      "status": "active"
    },
    "familyGroup": {
      "_id": "...",
      "name": "Parent's Family",
      "currentMemberCount": 2,
      "maxMembers": 4
    }
  }
}
```

### Get My Children
```http
GET /children-business-users/my-children?status=active&page=1&limit=10
Authorization: Bearer <token> (Business User)

Response (200):
{
  "success": true,
  "message": "Children retrieved successfully",
  "data": {
    "children": [
      {
        "_id": "...",
        "childUserId": "...",
        "name": "John Child",
        "email": "child@example.com",
        "addedAt": "2026-03-09T10:00:00Z",
        "status": "active"
      }
    ],
    "count": 2
  }
}
```

### Get My Parent (For Children)
```http
GET /children-business-users/my-parent
Authorization: Bearer <token> (Child User)

Response (200):
{
  "success": true,
  "message": "Parent business user retrieved successfully",
  "data": {
    "_id": "...",
    "name": "Parent Name",
    "email": "parent@example.com",
    "subscriptionType": "business_starter"
  }
}
```

### Remove Child from Family
```http
DELETE /children-business-users/children/:childId
Authorization: Bearer <token> (Business User)

Request (optional):
{
  "note": "Removed due to ..."
}

Response (200):
{
  "success": true,
  "message": "Child removed from family successfully"
}
```

### Get Statistics
```http
GET /children-business-users/statistics
Authorization: Bearer <token> (Business User)

Response (200):
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "active": 2,
    "inactive": 0,
    "removed": 1,
    "total": 3,
    "maxAllowed": 4,
    "remaining": 2
  }
}
```

---

## 📊 Subscription Limits

| Subscription Type | Price/Mo | Max Children |
|------------------|----------|--------------|
| business_starter | $29.99   | 4            |
| business_level1  | $49.99   | 40           |
| business_level2  | $79.99   | 999          |

---

## 🔐 Permissions

| Action | Business User | Child User |
|--------|--------------|------------|
| Create child | ✅ Yes | ❌ No |
| View children | ✅ Own children only | ❌ No |
| Remove child | ✅ Yes | ❌ No |
| View parent | ❌ No | ✅ Yes |
| Reactivate child | ✅ Yes | ❌ No |

---

## 🗄️ Database Indexes

```typescript
// Primary query: Get active children of business user
{ parentBusinessUserId: 1, status: 1, isDeleted: 1 }

// Get parent for child
{ childUserId: 1, status: 1, isDeleted: 1 }

// Get children by status
{ status: 1, isDeleted: 1 }
```

---

## 🚀 Redis Caching

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `children:business:<id>:children` | 5 min | Children list |
| `children:business:<id>:count` | 3 min | Children count |
| `children:child:<id>:parent` | 10 min | Parent info |

---

## 📝 Figma References

- **Create Child Flow**: `figma-asset/teacher-parent-dashboard/team-members/create-child-flow.png`
- **Team Members**: `figma-asset/teacher-parent-dashboard/team-members/team-member-flow-01.png`
- **Edit Child**: `figma-asset/teacher-parent-dashboard/team-members/edit-child-flow.png`
- **Dashboard**: `figma-asset/teacher-parent-dashboard/dashboard/dashboard-flow-01.png`

---

## 🔗 Related Modules

- **user.module**: User accounts (business users and children)
- **group.module**: Family groups (auto-created)
- **groupMember.module**: Group membership management
- **subscription.module**: Subscription plans and limits

---

**Last Updated**: 09-03-26
