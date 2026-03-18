# 🎯 **STATUS SECTION FLOWS - API MAPPING**

**Date**: 18-03-26  
**Figma Files**:
1. `status-section-flow-01.png` (Pending & In Progress Tasks)
2. `status-section-flow-02.png` (Completed Tasks & Date Filter)

---

## 📊 **SCREEN 1: Status Section Flow 01**

### **APIs Required & Available:**

| Screen Element | API Endpoint | Status |
|----------------|--------------|--------|
| **Get All Status Tabs** | `GET /tasks/statistics` | ✅ EXISTS |
| **Get Pending Tasks** | `GET /tasks?status=pending` | ✅ EXISTS |
| **Get In Progress Tasks** | `GET /tasks?status=inProgress` | ✅ EXISTS |
| **Get Completed Tasks** | `GET /tasks?status=completed` | ✅ EXISTS |
| **Get Task Details** | `GET /tasks/:id` | ✅ EXISTS |
| **Update Task Status** | `PUT /tasks/:id/status` | ✅ EXISTS |
| **Toggle SubTask** | `PUT /tasks/subtask/:id/toggle-status` | ✅ EXISTS |
| **Edit Task** | `PUT /tasks/:id` | ✅ EXISTS |
| **Delete Task** | `DELETE /tasks/:id` | ✅ EXISTS |

---

### **1. Get Status Statistics (Top Tabs)**

```http
GET /tasks/statistics
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 12,
    "pending": 4,
    "inProgress": 3,
    "completed": 5
  },
  "message": "Task statistics retrieved successfully"
}
```

**Frontend Display:**
```
Pending (4)  |  In Progress (3)  |  Completed (5)
```

---

### **2. Get Tasks by Status (Tab Content)**

#### **A. Get Pending Tasks**
```http
GET /tasks?status=pending
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "task001",
      "title": "Complete Math Homework",
      "status": "pending",
      "scheduledTime": "10:30 AM",
      "startTime": "2026-01-05T10:30:00.000Z",
      "taskType": "personal",
      "totalSubtasks": 5,
      "completedSubtasks": 0,
      "completionPercentage": 0,
      "assignedBy": {
        "_id": "user123",
        "name": "Mr. Tom Alax",
        "profileImage": "https://..."
      }
    },
    {
      "_id": "task002",
      "title": "UI/UX design",
      "status": "pending",
      "scheduledTime": "10:30 AM",
      "totalSubtasks": 5,
      "completedSubtasks": 0,
      "completionPercentage": 0,
      "assignedBy": {
        "_id": "user123",
        "name": "Mr. Tom Alax",
        "profileImage": "https://..."
      }
    }
  ]
}
```

#### **B. Get In Progress Tasks**
```http
GET /tasks?status=inProgress
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "task003",
      "title": "Complete Math Homework",
      "status": "inProgress",
      "scheduledTime": "10:30 AM",
      "totalSubtasks": 5,
      "completedSubtasks": 2,
      "completionPercentage": 30,
      "assignedBy": {
        "_id": "user123",
        "name": "Mr. Tom Alax",
        "profileImage": "https://..."
      }
    }
  ]
}
```

---

### **3. Get Task Details (On Tap)**

```http
GET /tasks/:taskId
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task001",
    "title": "Complete Math Homework",
    "description": "Finish exercises 1-10 from chapter 5",
    "status": "pending",
    "createdAt": "2026-01-05T09:50:00.000Z",
    "startTime": "2026-01-05T10:30:00.000Z",
    "taskType": "personal",
    "priority": "high",
    "totalSubtasks": 5,
    "completedSubtasks": 0,
    "completionPercentage": 0,
    "createdById": {
      "_id": "user123",
      "name": "Mr. Tom Alax",
      "email": "tom@example.com",
      "profileImage": "https://..."
    },
    "subtasks": [
      {
        "_subTaskId": "sub001",
        "title": "Call with design team",
        "isCompleted": false,
        "order": 1
      },
      {
        "_subTaskId": "sub002",
        "title": "Client meeting 10 min",
        "isCompleted": false,
        "order": 2
      },
      {
        "_subTaskId": "sub003",
        "title": "Project planning 30 min",
        "isCompleted": false,
        "order": 3
      },
      {
        "_subTaskId": "sub004",
        "title": "Code review 45 min",
        "isCompleted": false,
        "order": 4
      },
      {
        "_subTaskId": "sub005",
        "title": "Team discuss 20 min",
        "isCompleted": false,
        "order": 5
      }
    ]
  }
}
```

---

### **4. Update Task Status (Complete Button)**

```http
PUT /tasks/:taskId/status
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "status": "completed"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task001",
    "title": "Complete Math Homework",
    "status": "completed",
    "completedTime": "2026-01-05T14:30:00.000Z"
  },
  "message": "Task status updated successfully"
}
```

---

### **5. Toggle SubTask Status**

```http
PUT /tasks/subtask/:subtaskId/toggle-status
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "isCompleted": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_subTaskId": "sub001",
    "title": "Call with design team",
    "isCompleted": true,
    "completedAt": "2026-01-05T11:00:00.000Z",
    "order": 1
  },
  "message": "Subtask status updated successfully"
}
```

**Side Effect:**
- Parent task `completedSubtasks` increases
- Parent task `completionPercentage` recalculates

---

### **6. Edit Task (3 Dot Menu)**

```http
PUT /tasks/:taskId
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "title": "Updated Task Title",
  "description": "Updated description",
  "priority": "high",
  "scheduledTime": "11:00 AM"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task001",
    "title": "Updated Task Title",
    "description": "Updated description",
    "priority": "high",
    "scheduledTime": "11:00 AM"
  },
  "message": "Task updated successfully"
}
```

---

### **7. Delete Task (3 Dot Menu)**

```http
DELETE /tasks/:taskId
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "message": "Task deleted successfully",
  "data": null
}
```

---

## 📊 **SCREEN 2: Status Section Flow 02**

### **APIs Required & Available:**

| Screen Element | API Endpoint | Status |
|----------------|--------------|--------|
| **Get Completed Tasks** | `GET /tasks?status=completed` | ✅ EXISTS |
| **Get Task Details** | `GET /tasks/:id` | ✅ EXISTS |
| **Get Tasks by Date Range** | `GET /tasks?from=2026-01-01&to=2026-01-31` | ✅ EXISTS |
| **Get Daily Progress** | `GET /tasks/daily-progress?date=2026-01-15` | ✅ EXISTS |
| **Get Task Statistics** | `GET /tasks/statistics` | ✅ EXISTS |

---

### **1. Get Completed Tasks**

```http
GET /tasks?status=completed
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "task004",
      "title": "Complete Math Homework",
      "status": "completed",
      "scheduledTime": "10:30 AM",
      "totalSubtasks": 5,
      "completedSubtasks": 5,
      "completionPercentage": 100,
      "completedTime": "2026-01-05T16:00:00.000Z",
      "assignedBy": {
        "_id": "user123",
        "name": "Mr. Tom Alax",
        "profileImage": "https://..."
      }
    },
    {
      "_id": "task005",
      "title": "Complete Math Homework",
      "status": "completed",
      "scheduledTime": "10:30 AM",
      "totalSubtasks": 5,
      "completedSubtasks": 5,
      "completionPercentage": 100,
      "completedTime": "2026-01-05T15:30:00.000Z",
      "assignedBy": {
        "_id": "user123",
        "name": "Mr. Tom Alax",
        "profileImage": "https://..."
      }
    }
  ]
}
```

---

### **2. Get Task Details (Completed)**

```http
GET /tasks/:taskId
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task004",
    "title": "Complete Math Homework",
    "description": "Finish exercises 1-10",
    "status": "completed",
    "createdAt": "2026-01-05T09:50:00.000Z",
    "startTime": "2026-01-05T10:30:00.000Z",
    "completedTime": "2026-01-05T16:00:00.000Z",
    "taskType": "personal",
    "totalSubtasks": 5,
    "completedSubtasks": 5,
    "completionPercentage": 100,
    "createdById": {
      "_id": "user123",
      "name": "Mr. Tom Alax",
      "email": "tom@example.com",
      "profileImage": "https://..."
    },
    "subtasks": [
      {
        "_subTaskId": "sub001",
        "title": "Call with design team",
        "isCompleted": true,
        "completedAt": "2026-01-05T11:00:00.000Z",
        "order": 1
      },
      {
        "_subTaskId": "sub002",
        "title": "Client meeting 10 min",
        "isCompleted": true,
        "completedAt": "2026-01-05T11:15:00.000Z",
        "order": 2
      },
      {
        "_subTaskId": "sub003",
        "title": "Project planning 30 min",
        "isCompleted": true,
        "completedAt": "2026-01-05T12:00:00.000Z",
        "order": 3
      },
      {
        "_subTaskId": "sub004",
        "title": "Code review 45 min",
        "isCompleted": true,
        "completedAt": "2026-01-05T14:00:00.000Z",
        "order": 4
      },
      {
        "_subTaskId": "sub005",
        "title": "Team discuss 20 min",
        "isCompleted": true,
        "completedAt": "2026-01-05T16:00:00.000Z",
        "order": 5
      }
    ]
  }
}
```

---

### **3. Get Tasks by Date Range (Calendar Filter)**

```http
GET /tasks?from=2026-01-01&to=2026-01-31&status=completed
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "task004",
      "title": "Complete Math Homework",
      "status": "completed",
      "startTime": "2026-01-05T10:30:00.000Z",
      "completedTime": "2026-01-05T16:00:00.000Z",
      "totalSubtasks": 5,
      "completedSubtasks": 5,
      "completionPercentage": 100
    },
    {
      "_id": "task005",
      "title": "UI/UX Design",
      "status": "completed",
      "startTime": "2026-01-10T09:00:00.000Z",
      "completedTime": "2026-01-10T17:00:00.000Z",
      "totalSubtasks": 3,
      "completedSubtasks": 3,
      "completionPercentage": 100
    }
  ]
}
```

---

### **4. Get Daily Progress (Specific Date)**

```http
GET /tasks/daily-progress?date=2026-01-15
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-01-15",
    "total": 5,
    "completed": 3,
    "pending": 1,
    "inProgress": 1,
    "progressPercentage": 60,
    "tasks": [
      {
        "_id": "task001",
        "title": "Complete Math Homework",
        "status": "completed",
        "startTime": "2026-01-15T10:30:00.000Z",
        "taskType": "personal",
        "subtasks": [
          { "title": "Exercise 1-5", "isCompleted": true },
          { "title": "Exercise 6-10", "isCompleted": true }
        ]
      }
    ]
  }
}
```

---

## 📝 **COMPLETE API LIST**

### **For Screen 1 (Pending & In Progress):**

1. ✅ `GET /tasks/statistics` - Get status counts for tabs
2. ✅ `GET /tasks?status=pending` - Get pending tasks
3. ✅ `GET /tasks?status=inProgress` - Get in progress tasks
4. ✅ `GET /tasks/:id` - Get task details
5. ✅ `PUT /tasks/:id/status` - Update task status (Complete button)
6. ✅ `PUT /tasks/subtask/:id/toggle-status` - Toggle subtask
7. ✅ `PUT /tasks/:id` - Edit task (3 dot menu)
8. ✅ `DELETE /tasks/:id` - Delete task (3 dot menu)

### **For Screen 2 (Completed & Date Filter):**

1. ✅ `GET /tasks?status=completed` - Get completed tasks
2. ✅ `GET /tasks/:id` - Get task details
3. ✅ `GET /tasks?from=YYYY-MM-DD&to=YYYY-MM-DD` - Filter by date range
4. ✅ `GET /tasks/daily-progress?date=YYYY-MM-DD` - Get daily progress
5. ✅ `GET /tasks/statistics` - Get overall statistics

---

## 🧪 **TESTING FLOW**

### **Test Screen 1 (Status Flow 01):**

```bash
# 1. Get statistics for tabs
GET /tasks/statistics
→ Should return: { pending: 4, inProgress: 3, completed: 5 }

# 2. Get pending tasks
GET /tasks?status=pending
→ Should return 4 pending tasks

# 3. Get task details
GET /tasks/task001
→ Should return task with subtasks

# 4. Complete task
PUT /tasks/task001/status
{ "status": "completed" }
→ Should update status

# 5. Toggle subtask
PUT /tasks/subtask/sub001/toggle-status
{ "isCompleted": true }
→ Should update subtask and parent task progress
```

### **Test Screen 2 (Status Flow 02):**

```bash
# 1. Get completed tasks
GET /tasks?status=completed
→ Should return 5 completed tasks

# 2. Filter by date range
GET /tasks?status=completed&from=2026-01-01&to=2026-01-31
→ Should return completed tasks in January

# 3. Get daily progress
GET /tasks/daily-progress?date=2026-01-15
→ Should return progress for that date
```

---

## 📁 **BACKEND FILES**

### **Routes:**
- `src/modules/task.module/task/task.route.ts`
  - `GET /tasks/statistics` (line 120)
  - `GET /tasks?status=pending` (line 84)
  - `GET /tasks/paginate` (line 96)
  - `GET /tasks/daily-progress` (line 129)
  - `GET /tasks/:id` (line 143)
  - `PUT /tasks/:id/status` (line 177)
  - `PUT /tasks/:id` (line 161)
  - `DELETE /tasks/:id` (line 193)

- `src/modules/task.module/subTask/subTask.route.ts`
  - `PUT /tasks/subtask/:id/toggle-status` (line 119)

### **Controllers:**
- `src/modules/task.module/task/task.controller.ts`
  - `getMyTasks()` (line 64)
  - `getStatistics()` (line 116)
  - `getDailyProgress()` (line 137)
  - `getTaskById()` (line 231)
  - `updateStatus()` (line 158)
  - `updateById()` (line 143)
  - `softDeleteById()` (line 177)

### **Services:**
- `src/modules/task.module/task/task.service.ts`
  - `getTasksByUserId()` (line 28)
  - `getTaskStatistics()` (line 107)
  - `getDailyProgress()` (line 52)
  - `updateTaskStatus()` (line 138)

---

## ✅ **STATUS**

| Feature | API Exists? | Tested? | Production Ready? |
|---------|-------------|---------|-------------------|
| Get Statistics | ✅ | ✅ | ✅ |
| Get Pending Tasks | ✅ | ✅ | ✅ |
| Get In Progress Tasks | ✅ | ✅ | ✅ |
| Get Completed Tasks | ✅ | ✅ | ✅ |
| Get Task Details | ✅ | ✅ | ✅ |
| Update Task Status | ✅ | ✅ | ✅ |
| Toggle SubTask | ✅ | ✅ | ✅ |
| Edit Task | ✅ | ✅ | ✅ |
| Delete Task | ✅ | ✅ | ✅ |
| Filter by Date Range | ✅ | ✅ | ✅ |
| Get Daily Progress | ✅ | ✅ | ✅ |

**All APIs for both screens are IMPLEMENTED and READY!** 🎉

---

**Date**: 18-03-26  
**Status**: ✅ **COMPLETE**

---
