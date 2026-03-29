# ✅ Postman Collection - Create Task Endpoints Updated

**Date**: 17-03-26  
**Type**: Postman Collection Update  
**Files Updated**: 2 collections

---

## 📦 Updated Collections

### **1. 01-User-Common-Part1-v4-CORRECTED.postman_collection.json**

**Location**: `postman-collections/01-user-common/`

**Section**: "02 - Task Management"

**Added 3 New Requests**:

#### ✅ **01 - Create Personal Task**
```http
POST /v1/tasks
Authorization: Bearer {{accessToken}}

{
  "title": "My Personal Task",
  "description": "Task for myself only",
  "taskType": "personal",
  "priority": "medium",
  "startTime": "2026-03-17T10:00:00.000Z",
  "scheduledTime": "10:00 AM"
}
```

**Figma Reference**: `personal-task.png`

---

#### ✅ **02 - Create Single Assignment Task**
```http
POST /v1/tasks
Authorization: Bearer {{accessToken}}

{
  "title": "Math Homework",
  "description": "Complete chapter 5 exercises",
  "taskType": "singleAssignment",
  "priority": "high",
  "startTime": "2026-03-17T14:00:00.000Z",
  "scheduledTime": "2:00 PM",
  "assignedUserIds": [":childUserId"]
}
```

**Figma Reference**: `single-assignment.png`

**Auto-Saves**: `taskId` to environment for subsequent requests

---

#### ✅ **03 - Create Collaborative Task**
```http
POST /v1/tasks
Authorization: Bearer {{accessToken}}

{
  "title": "Family Room Cleanup",
  "description": "Clean the living room together",
  "taskType": "collaborative",
  "priority": "medium",
  "startTime": "2026-03-17T16:00:00.000Z",
  "scheduledTime": "4:00 PM",
  "assignedUserIds": [
    ":childUserId1",
    ":childUserId2",
    ":childUserId3"
  ]
}
```

**Figma Reference**: `collaborative-task.png`

**Auto-Saves**: `taskId` to environment

**Note**: Replace `:childUserId1`, `:childUserId2`, etc. with actual user IDs from:
```http
GET /v1/children-business-users/my-children
```

---

### **2. 03-Secondary-User-UPDATED-v2.postman_collection.json**

**Location**: `postman-collections/03-secondary-user/`

**Section**: "01 - Home & Tasks"

**Added 3 New Requests** (Same as above, but for Secondary User role):

#### ✅ **01 - Create Personal Task**
- For secondary users (children/students)
- Must have Secondary User permission
- Max 5 personal tasks per day

#### ✅ **02 - Create Single Assignment Task**
- Assign to exactly 1 person
- No daily limit
- Requires Secondary User permission

#### ✅ **03 - Create Collaborative Task**
- Assign to 2+ family members
- Real-time Socket.IO notifications
- Requires Secondary User permission

---

## 📊 Complete Endpoint Coverage

| Collection | Personal | Single Assignment | Collaborative | Total |
|------------|----------|-------------------|---------------|-------|
| **01-User-Common-Part1-v4** | ✅ Added | ✅ Added | ✅ Added | 3 |
| **03-Secondary-User-v2** | ✅ Added | ✅ Added | ✅ Added | 3 |
| **Total** | **2** | **2** | **2** | **6 new requests** |

---

## 🎯 How to Use

### **Step 1: Import Updated Collections**
1. Open Postman
2. Click **Import**
3. Select the updated `.postman_collection.json` files
4. Collections will be updated automatically

### **Step 2: Set Environment Variables**
Required variables:
- `accessToken` or `SECONDARY_USER_TOKEN` - Your JWT token
- `childUserId` - User ID for assignment (get from `/children-business-users/my-children`)
- `taskId` - Auto-saved after creating a task

### **Step 3: Test Task Creation**

#### **Test Personal Task**:
1. Open: "01 - Create Personal Task"
2. Click **Send**
3. Verify response contains `taskType: "personal"`
4. `taskId` auto-saved to environment

#### **Test Single Assignment Task**:
1. Open: "02 - Create Single Assignment Task"
2. Replace `:childUserId` with actual user ID
3. Click **Send**
4. Verify response contains `taskType: "singleAssignment"` and 1 assigned user

#### **Test Collaborative Task**:
1. Open: "03 - Create Collaborative Task"
2. Replace `:childUserId1`, `:childUserId2` with actual user IDs
3. Click **Send**
4. Verify response contains `taskType: "collaborative"` and 2+ assigned users

---

## 🔍 Validation Rules (Backend)

All three task types go through these validations:

### **1. Permission Check**
```typescript
checkSecondaryUserPermission
```
- Business users: Always allowed
- Child users: Must be Secondary User

### **2. Task Type Consistency**
```typescript
validateTaskTypeConsistency
```
- **Personal**: NO `assignedUserIds` allowed
- **Single Assignment**: Exactly 1 user in `assignedUserIds`
- **Collaborative**: 2+ users in `assignedUserIds`

### **3. Daily Limit** (Personal tasks only)
```typescript
checkDailyTaskLimit
```
- Max 5 personal tasks per day per user
- No limit for single assignment or collaborative

---

## 📝 Request Body Format

### **Personal Task**
```json
{
  "taskType": "personal",
  "title": "string",
  "description": "string",
  "priority": "low|medium|high",
  "startTime": "ISO date",
  "scheduledTime": "HH:mm AM/PM"
}
```

### **Single Assignment Task**
```json
{
  "taskType": "singleAssignment",
  "title": "string",
  "description": "string",
  "priority": "low|medium|high",
  "startTime": "ISO date",
  "scheduledTime": "HH:mm AM/PM",
  "assignedUserIds": ["user_id_here"]
}
```

### **Collaborative Task**
```json
{
  "taskType": "collaborative",
  "title": "string",
  "description": "string",
  "priority": "low|medium|high",
  "startTime": "ISO date",
  "scheduledTime": "HH:mm AM/PM",
  "assignedUserIds": ["user_id_1", "user_id_2"]
}
```

---

## 🎨 Figma Alignment

All three endpoints align with these Figma screens:

| Endpoint | Figma Screen | Location |
|----------|--------------|----------|
| **Create Personal** | `personal-task.png` | `figma-asset/teacher-parent-dashboard/task-monitoring/create-task-flow/` |
| **Create Single Assignment** | `single-assignment.png` | Same folder |
| **Create Collaborative** | `collaborative-task.png` | Same folder |

---

## ✅ What Was Fixed

### **Before**:
- ❌ Only personal task example existed
- ❌ No single assignment example
- ❌ No collaborative task example
- ❌ Secondary User collection missing Create Task entirely

### **After**:
- ✅ All 3 task types documented with examples
- ✅ Both collections updated (User Common + Secondary User)
- ✅ Figma references added
- ✅ Validation rules documented
- ✅ Auto-save taskId for workflow testing
- ✅ Proper variable placeholders (`:childUserId`)

---

## 📚 Related Documentation

- **API Verification Report**: `__Documentation/qwen/05-summaries-indexes/TASK_MONITORING_APIS_VERIFICATION_REPORT-17-03-26.md`
- **Backend Routes**: `src/modules/task.module/task/task.route.ts`
- **Middleware**: `src/modules/task.module/task/task.middleware.ts`
- **Service**: `src/modules/task.module/task/task.service.ts`

---

**Status**: ✅ **COMPLETE**  
**Next**: Test all 6 new requests in Postman

---
-17-03-26
