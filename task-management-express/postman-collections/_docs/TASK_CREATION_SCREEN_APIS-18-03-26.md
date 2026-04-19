# 🎯 **TASK CREATION SCREENS - API MAPPING**

**Date**: 18-03-26  
**Figma Files**:
1. `add-task-flow-for-permission-account-interface.png` (With Permission)
2. `without-permission-task-create-for-only-self-interface.png` (Without Permission)

---

## 📊 **SCREEN 1: With Permission (Secondary User)**

### **APIs Required & Available:**

| Screen Element | API Endpoint | Status |
|----------------|--------------|--------|
| **Check if user has permission** | `GET /children-business-users/secondary-user` | ✅ EXISTS |
| **Create Personal Task** | `POST /tasks` (taskType: personal) | ✅ EXISTS |
| **Create Single Assignment** | `POST /tasks` (taskType: singleAssignment) | ✅ EXISTS |
| **Create Collaborative Task** | `POST /tasks` (taskType: collaborative) | ✅ EXISTS |
| **Add SubTask** | `POST /tasks/subtask/` | ✅ EXISTS |
| **Get team members to assign** | `GET /children-business-users/my-children` | ✅ EXISTS |

---

### **1. Check Permission (On Screen Load)**

```http
GET /children-business-users/secondary-user
Authorization: Bearer {{accessToken}}
```

**Response (Has Permission):**
```json
{
  "success": true,
  "data": {
    "childUserId": "user123",
    "isSecondaryUser": true,
    "businessUserId": "business456",
    "grantedAt": "2026-03-15T10:00:00.000Z"
  },
  "message": "Secondary user retrieved successfully"
}
```

**Response (No Permission):**
```json
{
  "success": true,
  "data": {
    "childUserId": null,
    "isSecondaryUser": false
  },
  "message": "No secondary user found"
}
```

---

### **2. Get Team Members (For "Assign To" Dropdown)**

```http
GET /children-business-users/my-children?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "_id": "child001",
        "userId": {
          "_id": "user001",
          "name": "Alax Morgn",
          "email": "alax@example.com",
          "profileImage": "https://..."
        },
        "relationship": "son",
        "isSecondaryUser": true,
        "status": "active"
      },
      {
        "_id": "child002",
        "userId": {
          "_id": "user002",
          "name": "Jamie Chen",
          "email": "jamie@example.com",
          "profileImage": "https://..."
        },
        "relationship": "daughter",
        "isSecondaryUser": false,
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  }
}
```

---

### **3. Create Task (All 3 Types)**

#### **A. Personal Task**
```http
POST /tasks
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Complete Math Homework",
  "description": "Finish exercises 1-10",
  "taskType": "personal",
  "startTime": "2026-12-10T08:30:00.000Z",
  "priority": "high"
}
```

#### **B. Single Assignment**
```http
POST /tasks
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Complete Math Homework",
  "description": "Finish exercises 1-10",
  "taskType": "singleAssignment",
  "ownerUserId": "{{userId}}",
  "assignedUserIds": ["{{assignedUserId}}"],
  "startTime": "2026-12-10T08:30:00.000Z",
  "priority": "medium"
}
```

#### **C. Collaborative Task**
```http
POST /tasks
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "UI/UX Design",
  "description": "Design new interface",
  "taskType": "collaborative",
  "assignedUserIds": ["{{userId1}}", "{{userId2}}"],
  "startTime": "2026-12-10T08:30:00.000Z",
  "priority": "high"
}
```

---

### **4. Add SubTask**

```http
POST /tasks/subtask/
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "taskId": "{{taskId}}",
  "title": "Client meeting 10 min",
  "order": 1
}
```

---

## 📊 **SCREEN 2: Without Permission (Regular Child)**

### **APIs Required & Available:**

| Screen Element | API Endpoint | Status |
|----------------|--------------|--------|
| **Check if user has permission** | `GET /children-business-users/secondary-user` | ✅ EXISTS |
| **Create Personal Task ONLY** | `POST /tasks` (taskType: personal) | ✅ EXISTS |
| **Add SubTask** | `POST /tasks/subtask/` | ✅ EXISTS |

---

### **1. Check Permission (On Screen Load)**

```http
GET /children-business-users/secondary-user
Authorization: Bearer {{accessToken}}
```

**Response (No Permission):**
```json
{
  "success": true,
  "data": {
    "childUserId": null,
    "isSecondaryUser": false
  },
  "message": "No secondary user found"
}
```

**Frontend Action:**
```javascript
if (!response.data.isSecondaryUser) {
  // Show ONLY Personal Task option
  setShowCollaborativeTask(false);
  setShowSingleAssignment(false);
  setShowPersonalTask(true);
}
```

---

### **2. Create Personal Task**

```http
POST /tasks
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Complete Math Homework",
  "description": "Finish exercises 1-10",
  "taskType": "personal",
  "startTime": "2026-12-10T08:30:00.000Z",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task123",
    "title": "Complete Math Homework",
    "taskType": "personal",
    "status": "pending",
    "totalSubtasks": 0,
    "completedSubtasks": 0
  },
  "message": "Task created successfully"
}
```

---

### **3. Add SubTask**

```http
POST /tasks/subtask/
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "taskId": "{{taskId}}",
  "title": "Client meeting 10 min",
  "order": 1
}
```

---

## 🔐 **PERMISSION GRANTING FLOW**

### **Parent Grants Permission (Dashboard Screen)**

**Figma**: `dashboard-flow-03.png` (Permissions section)

```http
PUT /children-business-users/children/:childId/secondary-user
Authorization: Bearer {{accessToken}} (Business user only)
Content-Type: application/json

{
  "isSecondaryUser": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Child set as Secondary User successfully",
  "data": {
    "_id": "child123",
    "userId": "user456",
    "businessUserId": "business789",
    "isSecondaryUser": true,
    "status": "active"
  }
}
```

---

## 📝 **COMPLETE API LIST**

### **For Screen 1 (With Permission):**

1. ✅ `GET /children-business-users/secondary-user` - Check permission
2. ✅ `GET /children-business-users/my-children` - Get team members
3. ✅ `POST /tasks` - Create task (all 3 types)
4. ✅ `POST /tasks/subtask/` - Add subtask
5. ✅ `PUT /children-business-users/children/:id/secondary-user` - Grant permission

### **For Screen 2 (Without Permission):**

1. ✅ `GET /children-business-users/secondary-user` - Check permission
2. ✅ `POST /tasks` - Create personal task only
3. ✅ `POST /tasks/subtask/` - Add subtask

---

## 🧪 **TESTING FLOW**

### **Test Screen 1 (With Permission):**

```bash
# 1. Check permission
GET /children-business-users/secondary-user
→ Should return isSecondaryUser: true

# 2. Get team members
GET /children-business-users/my-children
→ Should return list of children

# 3. Create collaborative task
POST /tasks
{
  "taskType": "collaborative",
  "assignedUserIds": ["user1", "user2"],
  ...
}
→ Should succeed

# 4. Add subtasks
POST /tasks/subtask/
{
  "taskId": "{{taskId}}",
  "title": "Client meeting",
  "order": 1
}
→ Should succeed
```

### **Test Screen 2 (Without Permission):**

```bash
# 1. Check permission
GET /children-business-users/secondary-user
→ Should return isSecondaryUser: false

# 2. Try to create collaborative task
POST /tasks
{
  "taskType": "collaborative",
  ...
}
→ Should FAIL with 403 Forbidden

# 3. Create personal task
POST /tasks
{
  "taskType": "personal",
  ...
}
→ Should succeed
```

---

## 📁 **BACKEND FILES**

### **Routes:**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`
  - `GET /secondary-user` (line 128)
  - `PUT /children/:childId/secondary-user` (line 115)
  - `GET /my-children` (line 36)

- `src/modules/task.module/task/task.route.ts`
  - `POST /tasks` (line 69)
  - `POST /tasks/subtask/` (SubTaskRoute)

### **Controllers:**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`
  - `getSecondaryUser()` (line 332)
  - `setSecondaryUser()` (line 294)
  - `getMyChildren()` (line 98)

- `src/modules/task.module/task/task.controller.ts`
  - `create()` (line 58)

### **Middleware:**
- `src/modules/task.module/task/task.middleware.ts`
  - `checkSecondaryUserPermission()` (line 114)

---

## ✅ **STATUS**

| Feature | API Exists? | Tested? | Production Ready? |
|---------|-------------|---------|-------------------|
| Check Permission | ✅ | ✅ | ✅ |
| Grant Permission | ✅ | ✅ | ✅ |
| Get Team Members | ✅ | ✅ | ✅ |
| Create Personal Task | ✅ | ✅ | ✅ |
| Create Single Assignment | ✅ | ✅ | ✅ |
| Create Collaborative Task | ✅ | ✅ | ✅ |
| Add SubTask | ✅ | ✅ | ✅ |

**All APIs for both screens are IMPLEMENTED and READY!** 🎉

---

**Date**: 18-03-26  
**Status**: ✅ **COMPLETE**

---
