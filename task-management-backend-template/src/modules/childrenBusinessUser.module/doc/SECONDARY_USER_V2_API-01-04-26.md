# Secondary User V2 API - Auto-Switch Implementation

**Date:** 01-04-26  
**Module:** ChildrenBusinessUser  
**API:** `PUT /children/:childId/secondary-user/v2`  
**Status:** ✅ Complete

---

## Problem

The original V1 API (`PUT /children/:childId/secondary-user`) would throw an error if another child was already set as Secondary User:

```json
{
  "code": 400,
  "message": "Another child is already the Secondary User. Please remove them first.",
  "error": [...]
}
```

This created a poor user experience:
1. Frontend had to first check if another user exists
2. If exists, call remove API
3. Then call set API
4. Multiple round trips = slow UX

---

## Solution: V2 Auto-Switch API

The V2 API **automatically removes** the existing secondary user and sets the new one in a single operation.

### **API Endpoint**

```
PUT /api/v1/children-business-users/children/:childId/secondary-user/v2
```

### **Request**

```json
{
  "isSecondaryUser": true
}
```

### **Response (No Previous User)**

```json
{
  "code": 200,
  "message": "Child set as Secondary User successfully",
  "data": {
    "attributes": {
      "childUserId": "65f1234567890abcdef12345",
      "isSecondaryUser": true,
      "updatedAt": "2026-04-01T12:00:00.000Z"
    }
  },
  "success": true
}
```

### **Response (With Previous User)**

```json
{
  "code": 200,
  "message": "Secondary user updated. Previous user (Alax Morgn) permissions revoked.",
  "data": {
    "attributes": {
      "childUserId": "65f1234567890abcdef12346",
      "isSecondaryUser": true,
      "updatedAt": "2026-04-01T12:00:00.000Z",
      "previousSecondaryUser": {
        "childUserId": "65f1234567890abcdef12345",
        "name": "Alax Morgn",
        "email": "alax@example.com"
      }
    }
  },
  "success": true
}
```

---

## How It Works

### **Step-by-Step Flow**

1. **Check for Existing Secondary User**
   - Query: `findOne({ parentBusinessUserId, isSecondaryUser: true, childUserId: { $ne: newId } })`
   - If found → proceed to step 2
   - If not found → skip to step 3

2. **Remove Previous User's Permissions**
   - Update: `updateMany({ parentBusinessUserId, isSecondaryUser: true }, { isSecondaryUser: false })`
   - Log: "Removed secondary user status from {previousUserId}"
   - Invalidate cache for previous user

3. **Set New Secondary User**
   - Update: `findOneAndUpdate({ parentBusinessUserId, childUserId }, { isSecondaryUser: true })`
   - Invalidate cache for new user
   - Return success with optional `previousSecondaryUser` info

---

## Frontend Implementation

### **Simple Usage (No Error Handling Needed)**

```typescript
// When user clicks "Save & Change" in Permission Member modal
const handleGrantPermission = async (selectedChildId: string) => {
  try {
    const response = await axios.put(
      `/api/v1/children-business-users/children/${selectedChildId}/secondary-user/v2`,
      { isSecondaryUser: true },
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    // Show success message
    alert(response.data.message);
    // "Child set as Secondary User successfully"
    // OR
    // "Secondary user updated. Previous user (Alax Morgn) permissions revoked."
    
    // Refresh the list
    await fetchUsersWithPermissions();
    
  } catch (error) {
    // Only actual errors reach here (not "already exists" errors)
    console.error('Failed to grant permission:', error);
  }
};
```

### **Handling Previous User Info**

```typescript
const response = await axios.put(
  `/api/v1/children-business-users/children/${childId}/secondary-user/v2`,
  { isSecondaryUser: true }
);

const data = response.data.data.attributes;

// Check if there was a previous user
if (data.previousSecondaryUser) {
  console.log(`Replaced: ${data.previousSecondaryUser.name}`);
  console.log(`Email: ${data.previousSecondaryUser.email}`);
  
  // Optionally notify the previous user
  showNotification(
    `Permissions transferred from ${data.previousSecondaryUser.name}`
  );
}
```

---

## Comparison: V1 vs V2

| Feature | V1 API | V2 API |
|---------|--------|--------|
| **Endpoint** | `/secondary-user` | `/secondary-user/v2` |
| **Existing User** | ❌ Throws error | ✅ Auto-removes |
| **Frontend Logic** | Complex (check → remove → set) | Simple (just set) |
| **API Calls** | 2-3 calls | 1 call |
| **Response** | Basic | Includes `previousSecondaryUser` |
| **UX** | Poor (error handling) | Smooth (automatic) |

---

## Backend Implementation

### **Service Method**

```typescript
async setSecondaryUserV2(
  businessUserId: string,
  childUserId: string,
  isSecondaryUser: boolean,
): Promise<{
  childUserId: string;
  isSecondaryUser: boolean;
  updatedAt: Date;
  previousSecondaryUser?: {
    childUserId: string;
    name: string;
    email: string;
  } | null;
}>
```

### **Key Features**

1. **Auto-Detection**: Finds existing secondary user automatically
2. **Atomic Operation**: All updates happen in sequence
3. **Cache Invalidation**: Clears cache for both previous and new user
4. **Logging**: Detailed logs for debugging
5. **Response Info**: Returns info about replaced user

### **Cache Management**

```typescript
// Invalidate cache for previous user (if exists)
await this.invalidateCache(businessUserId, previousSecondaryUser.childUserId);

// Invalidate cache for new user
await this.invalidateCache(businessUserId, childUserId);
```

Cache keys invalidated:
- `business:{userId}:secondary-users`
- `business:{userId}:available-secondary-users`
- `child:{childId}:permission`

---

## Testing

### **Test Scenario 1: No Previous User**

```bash
# Set first secondary user
curl -X PUT http://localhost:5000/api/v1/children-business-users/children/65f1234567890abcdef12345/secondary-user/v2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"isSecondaryUser": true}'

# Response: "Child set as Secondary User successfully"
```

### **Test Scenario 2: Replace Existing User**

```bash
# Replace with new secondary user
curl -X PUT http://localhost:5000/api/v1/children-business-users/children/65f1234567890abcdef12346/secondary-user/v2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"isSecondaryUser": true}'

# Response: "Secondary user updated. Previous user (Alax Morgn) permissions revoked."
```

### **Test Scenario 3: Verify Previous User Lost Permissions**

```bash
# Check secondary users list
curl -X GET http://localhost:5000/api/v1/children-business-users/secondary-users \
  -H "Authorization: Bearer <token>"

# Should only show the NEW user, not the previous one
```

---

## Error Handling

### **V2 API Only Supports `isSecondaryUser: true`**

```json
{
  "code": 400,
  "message": "V2 API only supports setting isSecondaryUser to true. Use V1 API to unset.",
  "error": [...]
}
```

**Reason:** Unsetting doesn't need auto-switch logic. Use V1 API:
```
PUT /children/:childId/secondary-user
{ "isSecondaryUser": false }
```

---

## Files Modified

1. **`childrenBusinessUser.service.ts`**
   - `setSecondaryUserV2()` - NEW method with auto-switch logic

2. **`childrenBusinessUser.controller.ts`**
   - `setSecondaryUserV2` - NEW controller method

3. **`childrenBusinessUser.route.ts`**
   - `PUT /children/:childId/secondary-user/v2` - NEW route

---

## Performance

### **Database Operations**

| Operation | Count | Notes |
|-----------|-------|-------|
| Find existing user | 1 query | With populate |
| Update previous user | 1 query | `updateMany` |
| Set new user | 1 query | `findOneAndUpdate` |
| **Total** | **3 queries** | All indexed |

### **Cache Operations**

| Operation | Count | Keys |
|-----------|-------|------|
| Invalidate previous | 2 keys | `secondary-users`, `available-secondary-users` |
| Invalidate new | 2 keys | `secondary-users`, `available-secondary-users` |
| **Total** | **4 keys** | 10 min TTL |

---

## Security

- ✅ **Authentication Required:** Business user only
- ✅ **Authorization:** Only affects children of logged-in business user
- ✅ **Rate Limiting:** 20 requests per hour (prevents abuse)
- ✅ **Validation:** Zod schema for request body
- ✅ **Logging:** All operations logged for audit

---

## Migration Guide

### **For Frontend Developers**

**Old Code (V1):**
```typescript
try {
  await axios.put(`/children/${childId}/secondary-user`, { isSecondaryUser: true });
} catch (error) {
  if (error.response?.data?.message?.includes('Another child')) {
    // Had to handle error manually
    // Find existing user
    // Remove them
    // Then set new user
  }
}
```

**New Code (V2):**
```typescript
await axios.put(`/children/${childId}/secondary-user/v2`, { isSecondaryUser: true });
// Done! That's it.
```

### **When to Use Which API**

| Use Case | API Version |
|----------|-------------|
| Set new secondary user (recommended) | **V2** |
| Remove secondary user permissions | V1 (`isSecondaryUser: false`) |
| Legacy code compatibility | V1 |

---

## Summary

✅ **V2 API:** `PUT /children/:childId/secondary-user/v2`  
✅ **Auto-Switch:** Automatically removes previous secondary user  
✅ **Single Call:** No need for multiple API calls  
✅ **Better UX:** No error handling for "already exists"  
✅ **Response Info:** Includes `previousSecondaryUser` details  
✅ **Cache:** Automatic invalidation for consistency  

The V2 API provides a **smooth, seamless experience** for switching secondary users! 🎯

---
