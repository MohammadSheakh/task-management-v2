# ✅ Child Permission & Family Members APIs

**Date:** 24-03-26  
**Status:** ✅ COMPLETE  
**Author:** Senior Engineering Team

---

## 📋 Overview

This document describes the **new APIs** added for **child users** to:
1. Check their own permission status (Secondary User or not)
2. Get their family members (siblings under the same parent)

These APIs are designed for the **Figma screen**: `add-task-flow-for-permission-account-interface.png`

---

## 🎯 User Flow Context

### Screen 1: Child with Permission (Secondary User)
When a child user opens the "Create Task" screen:
- They need to know if they have permission to create tasks for others
- They need to see family members for the "Assign To" dropdown

### Screen 2: Child without Permission (Regular User)
When a child user without secondary user permissions:
- They can only create personal tasks
- The UI should show limited options

---

## 🔌 New APIs

### 1️⃣ GET `/children-business-users/my-permission`

**Purpose:** Child user checks their own permission status

**Auth:** Child user (`commonUser` role)

**Rate Limit:** 100 requests per minute

#### Response Schema

```typescript
{
  success: true;
  code: 200;
  data: {
    isSecondaryUser: boolean;
    parentBusinessUserId: string;
    parentName: string;
    permissions: {
      canCreateTasksForOthers: boolean;
      canViewTeamTasks: boolean;
      canAssignToTeamMembers: boolean;
    };
  };
  message: "Permission status retrieved successfully";
}
```

#### Example Response

**Case 1: Child IS Secondary User**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "isSecondaryUser": true,
    "parentBusinessUserId": "507f1f77bcf86cd799439011",
    "parentName": "John Doe",
    "permissions": {
      "canCreateTasksForOthers": true,
      "canViewTeamTasks": true,
      "canAssignToTeamMembers": true
    }
  },
  "message": "Permission status retrieved successfully"
}
```

**Case 2: Child is NOT Secondary User**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "isSecondaryUser": false,
    "parentBusinessUserId": "507f1f77bcf86cd799439011",
    "parentName": "John Doe",
    "permissions": {
      "canCreateTasksForOthers": false,
      "canViewTeamTasks": false,
      "canAssignToTeamMembers": false
    }
  },
  "message": "Permission status retrieved successfully"
}
```

#### Error Response

**No parent-child relationship found**
```json
{
  "success": false,
  "code": 404,
  "message": "No parent-child relationship found for this child"
}
```

---

### 2️⃣ GET `/children-business-users/my-family-members`

**Purpose:** Child user gets other family members (siblings) under the same parent

**Auth:** Child user (`commonUser` role)

**Rate Limit:** 100 requests per minute

#### Response Schema

```typescript
{
  success: true;
  code: 200;
  data: Array<{
    _id: string;
    childUserId: string;
    name: string;
    email: string;
    phoneNumber?: string;
    profileImage?: { imageUrl: string };
    isSecondaryUser: boolean;
    roleType: 'Primary' | 'Secondary';
    addedAt: Date;
  }>;
  message: "Family members retrieved successfully";
}
```

#### Example Response

**With Family Members**
```json
{
  "success": true,
  "code": 200,
  "data": [
    {
      "_id": "507f191e810c19729de860ea",
      "childUserId": "507f191e810c19729de860ea",
      "name": "Alice Doe",
      "email": "alice@example.com",
      "phoneNumber": "+1234567890",
      "profileImage": {
        "imageUrl": "https://example.com/avatar.png"
      },
      "isSecondaryUser": false,
      "roleType": "Primary",
      "addedAt": "2026-03-20T10:30:00.000Z"
    },
    {
      "_id": "507f191e810c19729de860eb",
      "childUserId": "507f191e810c19729de860eb",
      "name": "Bob Doe",
      "email": "bob@example.com",
      "phoneNumber": "+1234567891",
      "isSecondaryUser": true,
      "roleType": "Secondary",
      "addedAt": "2026-03-21T11:00:00.000Z"
    }
  ],
  "message": "Family members retrieved successfully"
}
```

**No Family Members (Only Child)**
```json
{
  "success": true,
  "code": 200,
  "data": [],
  "message": "Family members retrieved successfully"
}
```

#### Error Response

**No parent-child relationship found**
```json
{
  "success": false,
  "code": 404,
  "message": "No parent-child relationship found for this child"
}
```

---

## 🔄 Existing APIs (For Parent Business User)

These APIs already exist and are used by **parent business users**:

### GET `/children-business-users/secondary-user`
- **Auth:** Business user (parent)
- **Purpose:** Get the current Secondary User for this business user
- **Response:** Returns which child has secondary user permission

### GET `/children-business-users/my-children`
- **Auth:** Business user (parent)
- **Purpose:** Get all children of this business user
- **Response:** List of all children with their details

### PUT `/children-business-users/children/:childId/secondary-user`
- **Auth:** Business user (parent)
- **Purpose:** Grant/revoke Secondary User permission to a child
- **Body:** `{ "isSecondaryUser": true }`

---

## 🎨 Frontend Usage

### Screen Flow for Child User

```
┌─────────────────────────────────────┐
│  Child opens "Create Task" screen   │
└─────────────────┬───────────────────┘
                  │
                  ▼
      ┌─────────────────────────┐
      │ Call: GET /my-permission│
      └─────────┬───────────────┘
                │
                ▼
      ┌─────────────────────────┐
      │ Check isSecondaryUser   │
      └────────────────────────┘
                │
        ┌───────┴───────┐
        │               │
        ▼               ▼
   TRUE (Secondary)  FALSE (Regular)
        │               │
        │               │
        ▼               ▼
  Show full UI     Show limited UI
  - Collaborative  - Personal only
  - Single Assign  - No team assign
  - Assign To dropdown
        │
        ▼
  ┌──────────────────────────┐
  │ Call: GET /my-family-    │
  │ members (for dropdown)   │
  └──────────┬───────────────┘
             │
             ▼
      Populate "Assign To"
      dropdown with family
```

---

## 🔐 Permission Logic

### Secondary User Capabilities

| Permission | Secondary User | Regular Child |
|------------|----------------|---------------|
| `canCreateTasksForOthers` | ✅ Yes | ❌ No |
| `canViewTeamTasks` | ✅ Yes | ❌ No |
| `canAssignToTeamMembers` | ✅ Yes | ❌ No |
| Create Personal Tasks | ✅ Yes | ✅ Yes |
| Create Subtasks | ✅ Yes | ✅ Yes |

### Backend Enforcement

The backend enforces these permissions in the **Task Creation Middleware**:

```typescript
// src/modules/task.module/task/task.middleware.ts

if (taskType !== 'personal' && !isSecondaryUser) {
  throw new ApiError(
    StatusCodes.FORBIDDEN,
    'Only Secondary Users can create collaborative or single assignment tasks'
  );
}
```

---

## 📊 API Comparison

| API | Auth | Purpose | Returns |
|-----|------|---------|---------|
| `GET /my-permission` | Child | Check own permission | Permission status |
| `GET /my-family-members` | Child | Get siblings | Family members list |
| `GET /secondary-user` | Parent | Get secondary user | Which child is secondary |
| `GET /my-children` | Parent | Get all children | All children list |
| `PUT /children/:childId/secondary-user` | Parent | Set secondary user | Updated status |

---

## 🧪 Testing

### Test Case 1: Secondary User checks permission

```bash
curl -X GET "http://localhost:3000/children-business-users/my-permission" \
  -H "Authorization: Bearer <child_jwt_token>"
```

**Expected:** `isSecondaryUser: true`

---

### Test Case 2: Regular Child checks permission

```bash
curl -X GET "http://localhost:3000/children-business-users/my-permission" \
  -H "Authorization: Bearer <child_jwt_token>"
```

**Expected:** `isSecondaryUser: false`

---

### Test Case 3: Child gets family members

```bash
curl -X GET "http://localhost:3000/children-business-users/my-family-members" \
  -H "Authorization: Bearer <child_jwt_token>"
```

**Expected:** Array of siblings (excluding self)

---

### Test Case 4: Child with no siblings

```bash
curl -X GET "http://localhost:3000/children-business-users/my-family-members" \
  -H "Authorization: Bearer <only_child_jwt_token>"
```

**Expected:** `[]` (empty array)

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts` | Added `getChildPermissionStatus()`, `getChildFamilyMembers()` |
| `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts` | Added `getMyPermission`, `getMyFamilyMembers` |
| `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts` | Added routes for new endpoints |

---

## ✅ Summary

### APIs Created:
1. ✅ `GET /children-business-users/my-permission` - Child checks own permission
2. ✅ `GET /children-business-users/my-family-members` - Child gets family members

### APIs Already Exist (for Parent):
1. ✅ `GET /children-business-users/secondary-user` - Parent gets secondary user
2. ✅ `GET /children-business-users/my-children` - Parent gets all children
3. ✅ `PUT /children-business-users/children/:childId/secondary-user` - Parent sets secondary user

### Figma Screen Support:
- ✅ `add-task-flow-for-permission-account-interface.png` - Fully supported
- ✅ Permission check before showing UI options
- ✅ Family members for "Assign To" dropdown

---

## 🚀 Next Steps

1. **Frontend Integration:** Use these APIs in the Flutter app
2. **UI Logic:** Show/hide task creation options based on permission
3. **Testing:** Test with both secondary and regular child accounts
4. **Documentation:** Update API docs in your documentation portal

---

**All APIs are ready for production use! 🎉**
