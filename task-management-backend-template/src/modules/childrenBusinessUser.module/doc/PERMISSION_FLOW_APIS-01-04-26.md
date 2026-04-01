# Permission Flow APIs - Implementation Complete

**Date:** 01-04-26  
**Module:** ChildrenBusinessUser  
**Figma Reference:** `permission-flow.png`, `permission-flow-02.png`  
**Status:** ✅ Complete

---

## Overview

These APIs enable the **Permissions Access** feature in the Settings page, allowing business users (parents/teachers) to:
1. View all children who have secondary user permissions
2. Select/deselect children to grant/revoke permissions
3. Manage who can create and assign tasks

---

## Figma Screenshots

### 1. Permission Flow (permission-flow.png)
**Screen:** Settings → Permissions Access

**Features:**
- Toggle: "Allow Secondary users to create tasks"
- List of users with active permissions
- "Manage Permission" button

### 2. Permission Flow 02 (permission-flow-02.png)
**Screen:** Permission Member Modal

**Features:**
- List of available children (not yet secondary users)
- Radio button selection
- "Save & Change" button

---

## APIs Implemented

### **API 1: Get All Secondary Users**
```
GET /api/v1/children-business-users/secondary-users
```

**Purpose:** Get all children who HAVE secondary user permissions (for permission-flow.png)

**Auth:** Business user (Parent/Teacher)

**Response:**
```json
{
  "code": 200,
  "message": "Secondary users retrieved successfully",
  "data": {
    "attributes": [
      {
        "childUserId": "65f1234567890abcdef12345",
        "name": "Alax Morgn",
        "email": "alax@example.com",
        "profileImage": "https://...",
        "role": "commonUser",
        "status": "ACTIVE",
        "addedAt": "2026-03-15T10:30:00.000Z"
      }
    ]
  },
  "success": true
}
```

**Use Case:**
- Display list of users who can create tasks
- Show in "Permissions access" page
- Display users with "Active" permission badge

---

### **API 2: Get Available Secondary Users**
```
GET /api/v1/children-business-users/available-secondary-users
```

**Purpose:** Get all children who DON'T HAVE secondary user permissions (for permission-flow-02.png modal)

**Auth:** Business user (Parent/Teacher)

**Response:**
```json
{
  "code": 200,
  "message": "Available secondary users retrieved successfully",
  "data": {
    "attributes": [
      {
        "childUserId": "65f1234567890abcdef12346",
        "name": "Sam Rivera",
        "email": "sam@example.com",
        "profileImage": "https://...",
        "role": "commonUser",
        "status": "ACTIVE",
        "addedAt": "2026-03-15T10:30:00.000Z"
      }
    ]
  },
  "success": true
}
```

**Use Case:**
- Display in "Permission Member" modal
- Show children available to grant permissions
- Enable selection for granting permissions

---

## Existing Related APIs

### **Get Current Secondary User**
```
GET /api/v1/children-business-users/secondary-user
```
Returns the single current secondary user (legacy - only one was allowed)

### **Set/Unset Secondary User**
```
PUT /api/v1/children-business-users/children/:childId/secondary-user
```
Body: `{ isSecondaryUser: true }`

---

## Frontend Implementation Guide

### **Screen 1: Permissions Access Page**

```typescript
// Fetch users with permissions
const fetchUsersWithPermissions = async () => {
  const response = await axios.get(
    '/api/v1/children-business-users/secondary-users',
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  
  return response.data.data.attributes; // Array of users
};

// Display in UI
const users = await fetchUsersWithPermissions();
users.forEach(user => {
  // Display user card with:
  // - Profile image
  // - Name
  // - "Active" badge
  // - "Remove User" button
});
```

### **Screen 2: Permission Member Modal**

```typescript
// Fetch available users
const fetchAvailableUsers = async () => {
  const response = await axios.get(
    '/api/v1/children-business-users/available-secondary-users',
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  
  return response.data.data.attributes; // Array of users
};

// Display in modal
const availableUsers = await fetchAvailableUsers();
availableUsers.forEach(user => {
  // Display radio button list:
  // - Profile image
  // - Name
  // - "Secondary User" label
});

// Handle selection
const handleSavePermission = async (selectedUserId: string) => {
  await axios.put(
    `/api/v1/children-business-users/children/${selectedUserId}/secondary-user`,
    { isSecondaryUser: true },
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  
  // Refresh the list
  await fetchUsersWithPermissions();
};
```

---

## Backend Implementation Details

### **Service Layer**

#### `getAllSecondaryUsers(businessUserId: string)`
- **Cache:** `business:{userId}:secondary-users` (10 min TTL)
- **Query:** `find({ isSecondaryUser: true, status: 'ACTIVE' })`
- **Populate:** childUserId (name, email, profileImage, role)
- **Returns:** Array of children with permissions

#### `getAvailableSecondaryUsers(businessUserId: string)`
- **Cache:** `business:{userId}:available-secondary-users` (10 min TTL)
- **Query:** `find({ isSecondaryUser: false OR null, status: 'ACTIVE' })`
- **Populate:** childUserId (name, email, profileImage, role)
- **Returns:** Array of children available to grant permissions

### **Cache Invalidation**

Cache is automatically invalidated when:
- Child account is created
- Child account is removed
- Secondary user status changes
- Business user subscription changes

---

## Testing

### **Test API 1: Get Secondary Users**

```bash
# 1. Login as business user
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@example.com","password":"password123"}'

# 2. Get secondary users
curl -X GET http://localhost:5000/api/v1/children-business-users/secondary-users \
  -H "Authorization: Bearer <access-token>"
```

### **Test API 2: Get Available Secondary Users**

```bash
# Get available users
curl -X GET http://localhost:5000/api/v1/children-business-users/available-secondary-users \
  -H "Authorization: Bearer <access-token>"
```

---

## Database Schema

### **ChildrenBusinessUser Model**

```typescript
{
  parentBusinessUserId: ObjectId,     // Reference to User (business)
  childUserId: ObjectId,              // Reference to User (child)
  isSecondaryUser: Boolean,           // true = has permissions
  status: 'ACTIVE' | 'INACTIVE',      // Account status
  isDeleted: Boolean,
  addedAt: Date,
  removedAt: Date | null
}
```

### **Indexes**

```typescript
{
  parentBusinessUserId: 1,
  isSecondaryUser: 1,
  status: 1,
  isDeleted: 1
}
```

---

## Security Considerations

1. **Authentication Required:** Only business users can access
2. **Authorization:** Returns only children belonging to the logged-in business user
3. **Rate Limiting:** 30 requests per minute (prevents abuse)
4. **Redis Caching:** Reduces database load

---

## Performance

### **Query Optimization**

- Uses `.lean()` for read-only queries (2-3x memory reduction)
- Selects only required fields
- Populates user data in single query
- Cached for 10 minutes

### **Scalability**

- Redis caching prevents repeated DB queries
- Aggregation pipeline for complex queries
- Horizontal scaling ready (stateless)

---

## Files Modified

1. **`childrenBusinessUser.service.ts`**
   - `getAllSecondaryUsers()` - NEW
   - `getAvailableSecondaryUsers()` - NEW

2. **`childrenBusinessUser.controller.ts`**
   - `getAllSecondaryUsers` - NEW
   - `getAvailableSecondaryUsers` - NEW

3. **`childrenBusinessUser.route.ts`**
   - `GET /secondary-users` - NEW
   - `GET /available-secondary-users` - NEW

---

## Related Documentation

- `../doc/README-V4-30-03-26.md` - Module overview
- `../doc/dia/` - Architecture diagrams
- `../../user.module/doc/` - User management
- `../../task.module/doc/` - Task permissions

---

## Future Enhancements

1. **Multiple Secondary Users:** Currently supports multiple (updated from single)
2. **Permission Levels:** Add granular permissions (view-only, create, edit, delete)
3. **Permission History:** Track who granted/revoked permissions when
4. **Bulk Operations:** Select/deselect multiple users at once

---

## Summary

✅ **API 1:** `GET /secondary-users` - Returns users WITH permissions  
✅ **API 2:** `GET /available-secondary-users` - Returns users WITHOUT permissions  
✅ **Cache:** Redis caching for both endpoints  
✅ **Auth:** Business user only  
✅ **Response:** Standard `sendResponse` format  

The permission flow is now fully implemented and ready for frontend integration! 🎯

---
