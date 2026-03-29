# Task Progress Module - API Documentation

## 📋 Overview

Complete API documentation for the Task Progress Module that tracks **each child's independent progress** on collaborative tasks. This module enables parents/teachers to monitor individual progress and children to update their own task status.

**Base URL:** `{{baseUrl}}/v1`  
**Last Updated:** 10-03-26  
**Version:** 2.0

---

## 🏗️ Architecture

### Module Structure
```
src/modules/taskProgress.module/
├── taskProgress.constant.ts    # Enums and constants
├── taskProgress.interface.ts   # TypeScript interfaces
├── taskProgress.model.ts       # Mongoose schema & model
├── taskProgress.validation.ts  # Zod validation schemas
├── taskProgress.service.ts     # Business logic
├── taskProgress.controller.ts  # HTTP handlers
├── taskProgress.route.ts       # API routes
└── doc/                        # Documentation
    ├── API_DOCUMENTATION.md
    ├── taskProgress-roles-mapping.md
    └── dia/                    # Mermaid diagrams
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
| `child` | Group members, students | Update own progress, view own data |
| `business` | Group owners, parents, teachers | View all children's progress |
| `admin` | System administrators | Platform-wide oversight |

---

## 📚 Task Progress Endpoints

**Base Path:** `/task-progress`

### 1. Get My Progress on a Task
```http
GET /task-progress/:taskId/user/:userId
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Task assignee only (for child), Parent viewing child's progress (for business)
```

**Figma Reference:** `status-section-flow-01.png`

**Description:** Get personal progress on specific task (status, subtasks completed)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ID of the task |
| `userId` | string | ID of the user (child) |

**Response:**
```json
{
  "code": 200,
  "message": "Progress retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "taskId": "507f1f77bcf86cd799439010",
    "userId": "507f1f77bcf86cd799439012",
    "status": "inProgress",
    "startedAt": "2026-01-05T09:00:00.000Z",
    "completedAt": null,
    "completedSubtaskIndexes": [0, 1],
    "progressPercentage": 50,
    "note": null,
    "createdAt": "2026-01-05T08:00:00.000Z",
    "updatedAt": "2026-01-05T10:00:00.000Z"
  },
  "success": true
}
```

**Progress Status:**
| Status | Description |
|--------|-------------|
| `notStarted` | Child hasn't started the task yet |
| `inProgress` | Child is actively working on the task |
| `completed` | Child has completed all subtasks |

---

### 2. Get All Children's Progress on a Task
```http
GET /task-progress/:taskId/children
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Business user (parent/teacher) only
```

**Figma Reference:** `task-monitoring-flow-01.png`, `task-details-with-subTasks.png`

**Description:** View which children completed/started/not started a task

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ID of the task |

**Response:**
```json
{
  "code": 200,
  "message": "Children progress retrieved successfully",
  "data": {
    "taskId": "507f1f77bcf86cd799439010",
    "taskTitle": "Group Science Project",
    "totalSubtasks": 10,
    "childrenProgress": [
      {
        "childId": "507f1f77bcf86cd799439012",
        "childName": "John Child",
        "status": "completed",
        "startedAt": "2026-01-05T09:00:00.000Z",
        "completedAt": "2026-01-05T14:00:00.000Z",
        "progressPercentage": 100,
        "completedSubtaskCount": 10,
        "totalSubtasks": 10
      },
      {
        "childId": "507f1f77bcf86cd799439013",
        "childName": "Jane Child",
        "status": "inProgress",
        "startedAt": "2026-01-05T10:00:00.000Z",
        "completedAt": null,
        "progressPercentage": 60,
        "completedSubtaskCount": 6,
        "totalSubtasks": 10
      },
      {
        "childId": "507f1f77bcf86cd799439014",
        "childName": "Bob Child",
        "status": "notStarted",
        "startedAt": null,
        "completedAt": null,
        "progressPercentage": 0,
        "completedSubtaskCount": 0,
        "totalSubtasks": 10
      }
    ],
    "summary": {
      "totalChildren": 3,
      "notStarted": 1,
      "inProgress": 1,
      "completed": 1,
      "completionRate": 33,
      "averageProgress": 53
    }
  },
  "success": true
}
```

**Summary Statistics:**
| Field | Description |
|-------|-------------|
| `totalChildren` | Total number of children assigned to task |
| `notStarted` | Count of children who haven't started |
| `inProgress` | Count of children actively working |
| `completed` | Count of children who completed |
| `completionRate` | Percentage of children who completed |
| `averageProgress` | Average progress percentage across all children |

---

### 3. Get All Tasks Progress for a Child
```http
GET /task-progress/child/:childId/tasks?status=inProgress&taskType=collaborative
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Business user (parent/teacher) only
```

**Figma Reference:** `task-monitoring-flow-01.png`, `team-member-flow-01.png`

**Description:** View child's overall task performance across all tasks

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `childId` | string | ID of the child user |

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `notStarted`, `inProgress`, `completed` |
| `taskType` | string | Filter: `personal`, `singleAssignment`, `collaborative` |

**Response:**
```json
{
  "code": 200,
  "message": "Tasks progress retrieved successfully",
  "data": [
    {
      "taskId": "507f1f77bcf86cd799439010",
      "taskTitle": "Group Science Project",
      "taskType": "collaborative",
      "status": "inProgress",
      "progressPercentage": 60,
      "completedSubtaskCount": 6,
      "totalSubtasks": 10,
      "startedAt": "2026-01-05T10:00:00.000Z",
      "completedAt": null
    },
    {
      "taskId": "507f1f77bcf86cd799439011",
      "taskTitle": "Math Homework",
      "taskType": "personal",
      "status": "completed",
      "progressPercentage": 100,
      "completedSubtaskCount": 5,
      "totalSubtasks": 5,
      "startedAt": "2026-01-04T09:00:00.000Z",
      "completedAt": "2026-01-04T16:00:00.000Z"
    },
    {
      "taskId": "507f1f77bcf86cd799439012",
      "taskTitle": "History Essay",
      "taskType": "personal",
      "status": "notStarted",
      "progressPercentage": 0,
      "completedSubtaskCount": 0,
      "totalSubtasks": 3,
      "startedAt": null,
      "completedAt": null
    }
  ],
  "success": true
}
```

---

### 4. Update Progress Status (Start/Complete Task)
```http
PUT /task-progress/:taskId/status
Authorization: Bearer <token>
Role: child
Rate Limit: 30 requests per minute
Access: Child user (task assignee) only
```

**Figma Reference:** `edit-update-task-flow.png`

**Description:** Mark task as started or completed

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ID of the task |

**Request Body:**
```json
{
  "status": "completed",
  "note": "Finished all exercises!"
}
```

**Valid Status Values:**
| Status | Description |
|--------|-------------|
| `notStarted` | Reset task to not started |
| `inProgress` | Mark task as started |
| `completed` | Mark task as completed |

**Response:**
```json
{
  "code": 200,
  "message": "Task completed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "taskId": "507f1f77bcf86cd799439010",
    "userId": "507f1f77bcf86cd799439012",
    "status": "completed",
    "startedAt": "2026-01-05T09:00:00.000Z",
    "completedAt": "2026-01-05T14:00:00.000Z",
    "completedSubtaskIndexes": [0, 1, 2, 3, 4],
    "progressPercentage": 100,
    "note": "Finished all exercises!"
  },
  "success": true
}
```

**Auto-Updates:**
- Sets `startedAt` timestamp when status changes to `inProgress`
- Sets `completedAt` timestamp when status changes to `completed`
- Sends notification to parent when task completed

---

### 5. Mark Subtask as Complete
```http
PUT /task-progress/:taskId/subtasks/:subtaskIndex/complete
Authorization: Bearer <token>
Role: child
Rate Limit: 30 requests per minute
Access: Child user (task assignee) only
```

**Figma Reference:** `edit-update-task-flow.png`

**Description:** Complete a specific subtask and update progress percentage

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ID of the task |
| `subtaskIndex` | number | Index of the subtask (0-based) |

**Request Body:**
```json
{
  "subtaskIndex": 2
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Subtask completed successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "taskId": "507f1f77bcf86cd799439010",
    "userId": "507f1f77bcf86cd799439012",
    "status": "inProgress",
    "startedAt": "2026-01-05T09:00:00.000Z",
    "completedAt": null,
    "completedSubtaskIndexes": [0, 1, 2],
    "progressPercentage": 60,
    "note": null
  },
  "success": true
}
```

**Auto-Updates:**
- Adds subtask index to `completedSubtaskIndexes` array
- Recalculates `progressPercentage` based on completed/total subtasks
- Auto-updates status to `inProgress` if first subtask completed
- Auto-updates status to `completed` if all subtasks completed
- Sends notification to parent if task completed

---

### 6. Create or Update Progress (Internal Use)
```http
POST /task-progress/:taskId
Authorization: Bearer <token>
Role: system (internal use)
Rate Limit: 100 requests per minute
```

**Figma Reference:** Internal system endpoint

**Description:** Auto-create progress when child assigned to collaborative task

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ID of the task |

**Request Body:**
```json
{
  "userId": "507f1f77bcf86cd799439012",
  "status": "notStarted"
}
```

**Response:**
```json
{
  "code": 201,
  "message": "Progress created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "taskId": "507f1f77bcf86cd799439010",
    "userId": "507f1f77bcf86cd799439012",
    "status": "notStarted",
    "startedAt": null,
    "completedAt": null,
    "completedSubtaskIndexes": [],
    "progressPercentage": 0,
    "note": null
  },
  "success": true
}
```

**Use Case:**
- Called automatically when collaborative task is created
- Creates progress record for each assigned child
- Initializes with `notStarted` status

---

## 🎯 Key Features

### 1. Individual Progress Tracking
Each child has independent progress record on collaborative tasks:
- Personal status (`notStarted`, `inProgress`, `completed`)
- Personal subtask completion tracking
- Personal timestamps (`startedAt`, `completedAt`)

### 2. Parent Dashboard Integration
Real-time overview of all children's progress:
- Per-child breakdown
- Summary statistics
- Completion rates
- Average progress

### 3. Automatic Progress Calculation
Progress percentage calculated automatically:
```
progressPercentage = (completedSubtaskIndexes.length / totalSubtasks) * 100
```

**Example:**
- Task has 10 subtasks
- Child completed 6 subtasks
- `progressPercentage = (6 / 10) * 100 = 60%`

### 4. Status Transitions
```
notStarted ─────→ inProgress ─────→ completed
     ↑              ↑
     └──────────────┘
     (can re-open)
```

**Automatic Transitions:**
- `notStarted` → `inProgress` when first subtask completed
- `inProgress` → `completed` when all subtasks completed
- `completed` → `inProgress` if task re-opened

### 5. Parent Notifications
System automatically notifies parents when:
- Child starts a task
- Child completes a task
- Child completes all subtasks

### 6. Redis Caching
Frequently accessed data cached for performance:
- Individual progress: 5 min TTL
- Children's progress summary: 3 min TTL
- Child's tasks progress: 3 min TTL

---

## 📊 Database Schema

### TaskProgress Collection
```javascript
{
  _id: ObjectId,
  taskId: ObjectId,                    // References Task
  userId: ObjectId,                    // References User (child)
  status: String,                      // 'notStarted' | 'inProgress' | 'completed'
  startedAt: Date,                     // When child started working
  completedAt: Date,                   // When child completed task
  completedSubtaskIndexes: [Number],   // Array of completed subtask indexes
  progressPercentage: Number,          // 0-100, auto-calculated
  note: String,                        // max 500
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes
```javascript
// Primary query: Get progress for specific task and user
{ taskId: 1, userId: 1, isDeleted: 1 }  // Unique

// Get all children's progress for a task
{ taskId: 1, status: 1, isDeleted: 1 }

// Get all tasks progress for a child
{ userId: 1, status: 1, isDeleted: 1 }

// Get progress by status
{ userId: 1, status: 1, isDeleted: 1 }
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Status is required",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Task not found",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "You do not have permission to update this progress",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Progress record not found",
  "success": false
}
```

```json
{
  "code": 404,
  "message": "Task not found",
  "success": false
}
```

---

## 🧪 Testing with cURL

### Get My Progress
```bash
curl -X GET "http://localhost:6733/api/v1/task-progress/TASK_ID/user/USER_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get All Children's Progress
```bash
curl -X GET "http://localhost:6733/api/v1/task-progress/TASK_ID/children" \
  -H "Authorization: Bearer PARENT_TOKEN"
```

### Get Child's Tasks Progress
```bash
curl -X GET "http://localhost:6733/api/v1/task-progress/child/CHILD_ID/tasks" \
  -H "Authorization: Bearer PARENT_TOKEN"
```

### Update Progress Status
```bash
curl -X PUT "http://localhost:6733/api/v1/task-progress/TASK_ID/status" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed",
    "note": "Finished all exercises!"
  }'
```

### Mark Subtask as Complete
```bash
curl -X PUT "http://localhost:6733/api/v1/task-progress/TASK_ID/subtasks/2/complete" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subtaskIndex": 2
  }'
```

---

## 📝 Notes

1. **Individual Tracking**: Each child has separate progress record on collaborative tasks
2. **Auto-Calculation**: Progress percentage calculated automatically based on subtasks
3. **Soft Delete**: Progress records use `isDeleted` flag instead of hard deletion
4. **Rate Limiting**: Update endpoints limited to 30 requests per minute to prevent spam
5. **Caching**: Frequently accessed progress data cached with Redis (3-5 min TTL)
6. **Notifications**: Parents automatically notified on task completion
7. **Timestamps**: `startedAt` and `completedAt` auto-set based on status changes

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
