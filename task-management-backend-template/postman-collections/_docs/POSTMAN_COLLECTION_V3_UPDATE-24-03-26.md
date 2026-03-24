# ✅ Postman Collection Updated - Secondary User Role v3

**Date:** 24-03-26  
**Status:** ✅ COMPLETE  
**Collection:** `03-Secondary-User-UPDATED-v3.postman_collection.json`

---

## 📋 What's New in v3

Updated the Secondary User Postman collection with **new endpoints** for:
1. Child permission checking
2. Family member retrieval
3. Bulk task creation with subtasks

---

## 🆕 New Sections Added

### **01 - Permission & Family (NEW)**

#### 1. ✅ Get My Permission Status
```
GET {{BASE_URL}}/children-business-users/my-permission
```

**Purpose:** Check if logged-in child has Secondary User permission

**Response:**
```json
{
  "isSecondaryUser": true,
  "parentBusinessUserId": "507f1f77bcf86cd799439011",
  "parentName": "John Doe",
  "permissions": {
    "canCreateTasksForOthers": true,
    "canViewTeamTasks": true,
    "canAssignToTeamMembers": true
  }
}
```

**Use Case:** Before showing task creation UI, check permission level

**Postman Auto-save:**
- Saves `IS_SECONDARY_USER` environment variable
- Saves `PARENT_BUSINESS_USER_ID` environment variable

---

#### 2. ✅ Get My Family Members
```
GET {{BASE_URL}}/children-business-users/my-family-members
```

**Purpose:** Get siblings for "Assign To" dropdown

**Response:**
```json
[
  {
    "_id": "507f191e810c19729de860ea",
    "childUserId": "507f191e810c19729de860ea",
    "name": "Alice Doe",
    "email": "alice@example.com",
    "isSecondaryUser": false,
    "roleType": "Primary"
  }
]
```

**Use Case:** Populate dropdown when creating collaborative tasks

**Postman Auto-save:**
- Saves first family member ID to `FAMILY_MEMBER_1` variable

---

### **02 - Home & Tasks (UPDATED)**

#### ✅ UPDATED - Create Task with Bulk Subtasks

**Before (v2):**
```
POST /tasks → Create task
POST /tasks/:id/subtasks → Add subtask 1
POST /tasks/:id/subtasks → Add subtask 2
POST /tasks/:id/subtasks → Add subtask 3
```

**After (v3):**
```
POST /tasks
{
  "title": "Complete Math Homework",
  "taskType": "singleAssignment",
  "subtasks": [
    {"title": "Read chapter 5", "duration": 30},
    {"title": "Solve exercises 1-5", "duration": 45},
    {"title": "Solve exercises 6-10", "duration": 45},
    {"title": "Review answers", "duration": 15}
  ]
}
```

**Benefits:**
- ✅ Single API call instead of 5
- ✅ Atomic operation (all or nothing)
- ✅ Better performance (bulk insert)
- ✅ Matches Figma UX exactly

---

## 📊 Collection Structure

```
03 - Secondary User Role (Student/Child) - UPDATED v3
├── 00 - Authentication
│   ├── Register Secondary User
│   └── Login as Secondary User
│
├── 01 - Permission & Family (NEW) ⭐
│   ├── ✅ Get My Permission Status
│   └── ✅ Get My Family Members
│
├── 02 - Home & Tasks
│   ├── 01 - Create Personal Task
│   ├── 02 - Create Single Assignment Task
│   ├── 03 - Create Collaborative Task
│   ├── ✅ UPDATED - Create Task with Bulk Subtasks ⭐
│   ├── Get My Tasks (Home Screen)
│   ├── Get Daily Progress
│   ├── Get Task Statistics
│   ├── Get Task Details
│   ├── Update Task Status
│   ├── Update Task
│   └── Delete Task
│
├── 03 - SubTasks (Individual Operations)
│   ├── Add Subtask to Existing Task
│   ├── Get All Subtasks for Task
│   ├── Update Subtask
│   ├── Toggle Subtask Status
│   └── Delete Subtask
│
├── 04 - Task Progress (Real-Time Parent Notifications)
│   ├── Get My Task Progress
│   ├── Update Progress Status
│   ├── Complete Subtask (Real-Time Update)
│   └── Get My All Tasks Progress
│
├── 05 - Profile & Settings
│   ├── Get My Profile
│   ├── Get Support Mode
│   ├── Update Support Mode
│   ├── Get Notification Style
│   └── Update Notification Style
│
├── 06 - Analytics & Charts
│   ├── Get My Completion Trend
│   └── Get My Activity Heatmap
│
└── 07 - Socket.IO Events (Reference)
    └── 📡 Socket.IO Connection Info
```

---

## 🔧 Environment Variables

The collection uses these environment variables:

| Variable | Description | Set By |
|----------|-------------|--------|
| `BASE_URL` | API base URL | Manual |
| `SECONDARY_USER_TOKEN` | JWT token | Login request |
| `TASK_ID` | Current task ID | Create task request |
| `SUBTASK_ID` | Current subtask ID | Add subtask request |
| `CHILD_USER_ID` | Child user ID | Manual |
| `PARENT_BUSINESS_USER_ID` | Parent business user ID | Permission API |
| `IS_SECONDARY_USER` | Permission flag | Permission API |
| `FAMILY_MEMBER_1` | First family member ID | Family members API |

---

## 🧪 Testing Workflow

### **Scenario 1: Secondary User Creates Task with Subtasks**

1. **Login** → Auto-saves token
2. **Get My Permission Status** → Confirms secondary user
3. **Get My Family Members** → Gets list of siblings
4. **Create Task with Bulk Subtasks** → Creates task + subtasks together
5. **Get Task Details** → Verify subtasks were created

### **Scenario 2: Regular Child (No Permission)**

1. **Login** → Regular child account
2. **Get My Permission Status** → Returns `isSecondaryUser: false`
3. **Create Personal Task** → Only personal tasks allowed
4. **Create Collaborative Task** → Should fail (403 Forbidden)

---

## 📝 Request Examples

### Create Task with Bulk Subtasks

```json
POST {{BASE_URL}}/tasks
Authorization: Bearer {{SECONDARY_USER_TOKEN}}

{
  "title": "Complete Math Homework",
  "description": "Finish exercises 1-10 from chapter 5",
  "taskType": "singleAssignment",
  "priority": "high",
  "startTime": "2026-03-25T08:00:00.000Z",
  "scheduledTime": "8:00 AM",
  "assignedUserIds": ["{{FAMILY_MEMBER_1}}"],
  "subtasks": [
    {
      "title": "Read chapter 5",
      "duration": 30,
      "order": 1
    },
    {
      "title": "Solve exercises 1-5",
      "duration": 45,
      "order": 2
    },
    {
      "title": "Solve exercises 6-10",
      "duration": 45,
      "order": 3
    },
    {
      "title": "Review answers",
      "duration": 15,
      "order": 4
    }
  ]
}
```

---

## 🎯 Figma Alignment

The updated collection aligns with:

**Figma Screens:**
- `add-task-flow-for-permission-account-interface.png`
- `personal-task.png`
- `single-assignment.png`
- `collaborative-task.png`

**UX Flow:**
1. User opens task creation screen
2. App checks permission (`GET /my-permission`)
3. If Secondary User → Show full UI
4. If Regular Child → Show limited UI
5. User adds subtasks inline
6. User clicks "Create Task" → Single API call with everything

---

## 📁 Files

| File | Location |
|------|----------|
| Postman Collection | `postman-collections/03-secondary-user/03-Secondary-User-UPDATED-v3.postman_collection.json` |
| Documentation | `postman-collections/_docs/POSTMAN_COLLECTION_V3_UPDATE-24-03-26.md` |

---

## ✅ Summary

### What Changed:
- ✅ Added "01 - Permission & Family" section with 2 new endpoints
- ✅ Updated task creation with bulk subtask example
- ✅ Added auto-save scripts for environment variables
- ✅ Improved descriptions with Figma references
- ✅ Version bumped to 3.0.0

### What Stayed:
- ✅ All existing endpoints still work
- ✅ Subtask individual operations section retained
- ✅ Socket.IO reference documentation
- ✅ Real-time parent notifications

### Benefits:
- ✅ Test complete user flows in Postman
- ✅ Verify permission-based UI logic
- ✅ Test bulk subtask creation
- ✅ Better documentation for frontend team

---

**Collection ready for testing! **
