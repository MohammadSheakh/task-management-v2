# Task Management Module - API Documentation

## 📋 Overview

Complete API documentation for the Task Management Module with support for **Individual** and **Group/Collaborative** task management.

**Base URL:** `{{baseUrl}}/v1`
**Last Updated:** 16-03-26
**Version:** 2.1 - Parent Dashboard API Added

**New in v2.1:**
- ✅ Added `GET /tasks/dashboard/children-tasks` endpoint for parent dashboard
- ✅ Status filtering: All | Not Started | In Progress | Completed | Personal Task
- ✅ Includes embedded subtask details and child assignment information

---

## 🏗️ Architecture

### Module Structure
```
src/modules/task.module/
├── task/                    # Parent Task Module
│   ├── task.constant.ts     # Enums and constants
│   ├── task.interface.ts    # TypeScript interfaces
│   ├── task.model.ts        # Mongoose schema & model
│   ├── task.validation.ts   # Zod validation schemas
│   ├── task.service.ts      # Business logic
│   ├── task.controller.ts   # HTTP handlers
│   ├── task.middleware.ts   # Custom middleware
│   └── task.route.ts        # API routes
│
├── subTask/                 # SubTask Module
│   ├── subTask.constant.ts
│   ├── subTask.interface.ts
│   ├── subTask.model.ts
│   ├── subTask.validation.ts
│   ├── subTask.service.ts
│   ├── subTask.controller.ts
│   └── subTask.route.ts
│
└── doc/                     # Documentation
    ├── API_DOCUMENTATION.md
    ├── task-roles-mapping.md
    └── dia/                 # Mermaid diagrams
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
| `child` | Group members, students | Personal tasks + group tasks (with permission) |
| `business` | Group owners, parents, teachers | Full task management |
| `admin` | System administrators | Permanent delete only |

---

## 📚 Task Endpoints

**Base Path:** `/tasks`

### 1. Create Task
```http
POST /tasks
Authorization: Bearer <token>
Role: child, business
Rate Limit: 20 requests per hour
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "title": "Complete Math Homework",
  "description": "Solve algebra, geometry and calculus problems",
  "taskType": "personal",
  "startTime": "2026-01-05T10:30:00.000Z",
  "scheduledTime": "10:30 AM",
  "priority": "high",
  "dueDate": "2026-01-07T23:59:59.000Z"
}
```

**Task Types:**
| Type | Description | Assignment Rules |
|------|-------------|------------------|
| `personal` | For yourself | No assigned users |
| `singleAssignment` | Assigned to one person | Exactly 1 assigned user |
| `collaborative` | Assigned to multiple people | 2+ assigned users |

**Special Permissions:**
- Child users need `canCreateTasks` permission for group/collaborative tasks
- Personal tasks always allowed for all users

**Response (201 Created):**
```json
{
  "code": 201,
  "message": "Task created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Complete Math Homework",
    "status": "pending",
    "taskType": "personal",
    "createdById": "507f1f77bcf86cd799439010",
    "ownerUserId": "507f1f77bcf86cd799439010",
    "completionPercentage": 0
  },
  "success": true
}
```

---

### 2. Get All My Tasks
```http
GET /tasks?status=pending&taskType=personal&priority=high&from=2026-01-01&to=2026-01-31
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter: `pending`, `inProgress`, `completed` |
| `taskType` | string | Filter: `personal`, `singleAssignment`, `collaborative` |
| `priority` | string | Filter: `low`, `medium`, `high` |
| `from` | date | Start date (YYYY-MM-DD) |
| `to` | date | End date (YYYY-MM-DD) |

**Response:**
```json
{
  "code": 200,
  "message": "Tasks retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "title": "Complete Math Homework",
      "description": "Solve algebra problems",
      "status": "pending",
      "priority": "high",
      "taskType": "personal",
      "startTime": "2026-01-05T10:30:00.000Z",
      "totalSubtasks": 3,
      "completedSubtasks": 0,
      "completionPercentage": 0,
      "createdById": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "success": true
}
```

---

### 3. Get Tasks with Pagination
```http
GET /tasks/paginate?page=1&limit=10&sortBy=-startTime
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `limit` | number | 10 | Items per page (max: 100) |
| `sortBy` | string | `-startTime` | Sort field (`-` for descending) |
| `status` | string | - | Filter by status |
| `taskType` | string | - | Filter by type |
| `priority` | string | - | Filter by priority |
| `from` | date | - | Start date |
| `to` | date | - | End date |

**Response:**
```json
{
  "code": 200,
  "message": "Tasks retrieved successfully with pagination",
  "data": {
    "tasks": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  },
  "success": true
}
```

---

### 4. Get Task Statistics
```http
GET /tasks/statistics
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `status-section-flow-01.png`

**Response:**
```json
{
  "code": 200,
  "message": "Task statistics retrieved successfully",
  "data": {
    "total": 15,
    "pending": 5,
    "inProgress": 3,
    "completed": 7,
    "completionRate": 47
  },
  "success": true
}
```

---

### 5. Get Daily Progress
```http
GET /tasks/daily-progress?date=2026-01-05
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | date | Today | Date in YYYY-MM-DD format |

**Response:**
```json
{
  "code": 200,
  "message": "Daily progress retrieved successfully",
  "data": {
    "date": "2026-01-05T00:00:00.000Z",
    "totalTasks": 5,
    "completedTasks": 3,
    "pendingTasks": 2,
    "completionRate": 60,
    "tasks": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Math Homework",
        "status": "completed",
        "completedAt": "2026-01-05T14:00:00.000Z"
      }
    ]
  },
  "success": true
}
```

---

### 6. Get Task by ID
```http
GET /tasks/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Task creator, owner, or assigned users only
```

**Figma Reference:** `task-details-with-subTasks.png`

**Response:**
```json
{
  "code": 200,
  "message": "Task retrieved successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Complete Math Homework",
    "description": "Solve algebra problems",
    "status": "inProgress",
    "priority": "high",
    "taskType": "personal",
    "totalSubtasks": 6,
    "completedSubtasks": 2,
    "completionPercentage": 33,
    "startTime": "2026-01-05T10:30:00.000Z",
    "dueDate": "2026-01-07T23:59:59.000Z",
    "createdById": {
      "_id": "507f1f77bcf86cd799439010",
      "name": "John Doe",
      "email": "john@example.com",
      "profileImage": "https://..."
    },
    "ownerUserId": {
      "_id": "507f1f77bcf86cd799439010",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "assignedUserIds": [],
    "subtasks": [
      {
        "_id": "sub1",
        "title": "Exercise 1",
        "isCompleted": false,
        "duration": "30 min"
      }
    ]
  },
  "success": true
}
```

---

### 7. Update Task
```http
PUT /tasks/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Task creator or owner only
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "title": "Updated Task Title",
  "description": "Updated description",
  "priority": "medium",
  "dueDate": "2026-01-10T23:59:59.000Z"
}
```

**Updatable Fields:**
- `title`, `description`, `priority`
- `scheduledTime`, `dueDate`
- `assignedUserIds` (for single/collaborative tasks)

---

### 8. Update Task Status
```http
PUT /tasks/:id/status
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Task creator, owner, or assigned users only
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "status": "completed",
  "completedTime": "2026-01-07T10:50:00.000Z"
}
```

**Valid Status Transitions:**
```
pending ─────→ inProgress ─────→ completed
   ↑              ↑
   └──────────────┘
   (can re-open)
```

| From | To |
|------|-----|
| `pending` | `inProgress`, `completed` |
| `inProgress` | `completed`, `pending` |
| `completed` | `inProgress`, `pending` (re-open) |

---

### 9. Update Subtask Progress
```http
PUT /tasks/:id/subtasks/progress
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Task creator or owner only
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "subtasks": [
    {
      "title": "Call with team",
      "isCompleted": false
    },
    {
      "title": "Client meeting",
      "isCompleted": true,
      "duration": "10 min"
    },
    {
      "title": "Team discuss",
      "isCompleted": true,
      "duration": "20 min"
    }
  ]
}
```

**Auto-Updates:**
- Parent task's `totalSubtasks`
- Parent task's `completedSubtasks`
- Parent task's `completionPercentage`
- Parent task's `status` (if all subtasks completed)

---

### 10. Delete Task (Soft Delete)
```http
DELETE /tasks/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Task creator or owner only
```

**Figma Reference:** `edit-update-task-flow.png`

**Response:**
```json
{
  "code": 200,
  "message": "Task deleted successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "isDeleted": true
  },
  "success": true
}
```

---

### 11. Permanently Delete Task (Admin Only)
```http
DELETE /tasks/:id/permanent
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

---

### 12. Get Children Tasks For Dashboard (Parent/Teacher Only)
```http
GET /tasks/dashboard/children-tasks
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
```

**Figma Reference:** 
- `teacher-parent-dashboard/dashboard/dashboard-flow-01.png`
- `teacher-parent-dashboard/dashboard/dashboard-flow-02.png`

**Description:**
Dedicated endpoint for parent dashboard to fetch all children's tasks with status filtering. 
Supports filtering by status tabs: All | Not Started | In Progress | Completed | Personal Task

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `'all'` | Filter by status: `'all'`, `'pending'`, `'inProgress'`, `'completed'` |
| `taskType` | string | `'children'` | Filter by ownership: `'children'` (children's tasks) or `'personal'` (parent's own tasks) |
| `page` | number | `1` | Page number for pagination |
| `limit` | number | `20` | Items per page |
| `sortBy` | string | `'-startTime'` | Sort field (prefix with `-` for descending) |
| `from` | date | - | Filter tasks from this date (ISO format) |
| `to` | date | - | Filter tasks until this date (ISO format) |

**Request Example:**
```http
GET /tasks/dashboard/children-tasks?status=all&taskType=children&page=1&limit=20&sortBy=-startTime
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "task001",
        "title": "Complete Math Homework",
        "description": "Finish exercises 1-10 from chapter 5",
        "status": "pending",
        "priority": "high",
        "taskType": "singleAssignment",
        "scheduledTime": "08:30 AM",
        "startTime": "2026-12-10T08:30:00.000Z",
        "dueDate": "2026-12-10T23:59:59.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 0,
        "completionPercentage": 0,
        "subtasks": [
          {
            "_id": "subtask001",
            "title": "Call with design team",
            "isCompleted": false,
            "order": 1
          },
          {
            "_id": "subtask002",
            "title": "Review project milestones",
            "isCompleted": true,
            "order": 2
          },
          {
            "_id": "subtask003",
            "title": "Update client on progress",
            "isCompleted": false,
            "order": 3
          }
        ],
        "assignedTo": {
          "_id": "child001",
          "name": "Alex Morgan",
          "email": "alex@example.com",
          "profileImage": "https://example.com/images/alex.jpg"
        },
        "createdById": {
          "_id": "user002",
          "name": "Mr. Tom Alax",
          "email": "tom@example.com",
          "profileImage": "https://example.com/images/tom.jpg"
        },
        "ownerUserId": {
          "_id": "child001",
          "name": "Alex Morgan",
          "email": "alex@example.com"
        },
        "assignedUserIds": [
          {
            "_id": "child001",
            "name": "Alex Morgan",
            "email": "alex@example.com",
            "profileImage": "https://example.com/images/alex.jpg"
          }
        ]
      },
      {
        "_id": "task002",
        "title": "Science Project",
        "description": "Build a working model of a volcano",
        "status": "inProgress",
        "priority": "medium",
        "taskType": "singleAssignment",
        "scheduledTime": "02:00 PM",
        "startTime": "2026-12-10T14:00:00.000Z",
        "dueDate": "2026-12-15T23:59:59.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 2,
        "completionPercentage": 67,
        "subtasks": [
          {
            "_id": "subtask004",
            "title": "Research volcano structure",
            "isCompleted": true,
            "order": 1
          },
          {
            "_id": "subtask005",
            "title": "Build model base",
            "isCompleted": true,
            "order": 2
          },
          {
            "_id": "subtask006",
            "title": "Paint and decorate",
            "isCompleted": false,
            "order": 3
          }
        ],
        "assignedTo": {
          "_id": "child002",
          "name": "Jamie Chen",
          "email": "jamie@example.com",
          "profileImage": "https://example.com/images/jamie.jpg"
        },
        "createdById": {
          "_id": "user001",
          "name": "Bashar Islam",
          "email": "bashar@example.com",
          "profileImage": "https://example.com/images/bashar.jpg"
        },
        "ownerUserId": {
          "_id": "child002",
          "name": "Jamie Chen",
          "email": "jamie@example.com"
        },
        "assignedUserIds": [
          {
            "_id": "child002",
            "name": "Jamie Chen",
            "email": "jamie@example.com",
            "profileImage": "https://example.com/images/jamie.jpg"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "totalPages": 1
    },
    "filters": {
      "status": "all",
      "taskType": "children"
    }
  },
  "message": "Children tasks retrieved successfully for dashboard"
}
```

**Frontend Usage Examples:**
```javascript
// Get all children's tasks (All tab)
const allTasks = await api.get('/tasks/dashboard/children-tasks?status=all');

// Get Not Started tasks (Not Started tab)
const notStartedTasks = await api.get('/tasks/dashboard/children-tasks?status=pending');

// Get In Progress tasks (In Progress tab)
const inProgressTasks = await api.get('/tasks/dashboard/children-tasks?status=inProgress');

// Get Completed tasks (Completed tab)
const completedTasks = await api.get('/tasks/dashboard/children-tasks?status=completed');

// Get parent's personal tasks (Personal Task tab)
const personalTasks = await api.get('/tasks/dashboard/children-tasks?taskType=personal');
```

**Authorization:**
- **Role:** `business` (Parent/Teacher) only
- **Permission:** Must have active children in the system

**Notes:**
- Returns tasks assigned to all active children of the business user
- Includes embedded subtask details for each task
- Shows completion percentage calculated from subtasks
- Response includes `assignedTo` field showing which child the task is assigned to
- Personal task filter returns parent's own tasks (taskType: personal)
- Cached for 2 minutes for performance

---

## 📚 SubTask Endpoints

**Base Path:** `/subtasks`

### 1. Create SubTask
```http
POST /subtasks
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Users with access to parent task
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "taskId": "507f1f77bcf86cd799439011",
  "title": "Call with team",
  "description": "Discuss project requirements",
  "duration": "30 min",
  "assignedToUserId": "507f1f77bcf86cd799439010"
}
```

**Response:**
```json
{
  "code": 201,
  "message": "Subtask created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "taskId": "507f1f77bcf86cd799439011",
    "title": "Call with team",
    "duration": "30 min",
    "isCompleted": false,
    "order": 1,
    "createdById": "507f1f77bcf86cd799439010"
  },
  "success": true
}
```

---

### 2. Get All SubTasks for a Task
```http
GET /subtasks/task/:taskId?isCompleted=false
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Users with access to parent task
```

**Figma Reference:** `task-details-with-subTasks.png`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `isCompleted` | boolean | Filter by completion status |
| `page` | number | Page number |
| `limit` | number | Items per page |

**Response:**
```json
{
  "code": 200,
  "message": "Subtasks retrieved successfully",
  "data": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "taskId": "507f1f77bcf86cd799439011",
      "title": "Call with team",
      "duration": "30 min",
      "isCompleted": false,
      "order": 1,
      "createdById": {
        "_id": "507f1f77bcf86cd799439010",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ],
  "success": true
}
```

---

### 3. Get SubTasks with Pagination
```http
GET /subtasks/task/:taskId/paginate?page=1&limit=10
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `task-details-with-subTasks.png`

---

### 4. Get SubTask Statistics
```http
GET /subtasks/statistics
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

**Figma Reference:** `status-section-flow-01.png`

**Response:**
```json
{
  "code": 200,
  "message": "Subtask statistics retrieved successfully",
  "data": {
    "total": 10,
    "completed": 6,
    "pending": 4,
    "completionRate": 60
  },
  "success": true
}
```

---

### 5. Get SubTask by ID
```http
GET /subtasks/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Users with access to parent task
```

**Figma Reference:** `task-details-with-subTasks.png`

---

### 6. Update SubTask
```http
PUT /subtasks/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Subtask creator or task owner only
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "duration": "45 min"
}
```

---

### 7. Toggle SubTask Status
```http
PUT /subtasks/:id/toggle-status
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Subtask creator or task owner only
```

**Figma Reference:** `edit-update-task-flow.png`

**Request Body:**
```json
{
  "isCompleted": true
}
```

**Auto-Updates:**
- Parent task's completion statistics
- Parent task's `completionPercentage`

---

### 8. Delete SubTask
```http
DELETE /subtasks/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Access: Subtask creator or task owner only
```

**Figma Reference:** `edit-update-task-flow.png`

---

## 🎯 Key Features

### 1. Daily Task Limit (5 Tasks Max)
- Personal tasks limited to 5 per day per user
- Enforced by `checkDailyTaskLimit` middleware
- Returns 400 error if limit exceeded

```json
{
  "code": 400,
  "message": "Daily task limit reached. You already have 5 tasks scheduled for this day (max: 5)",
  "success": false
}
```

### 2. Task Type Validation
| Type | Assigned Users | Validation |
|------|---------------|------------|
| `personal` | None | Cannot have assigned users |
| `singleAssignment` | Exactly 1 | Must have exactly 1 assigned user |
| `collaborative` | 2+ | Must have 2+ assigned users |

### 3. Permission-Based Task Creation
**Child Users:**
- ✅ Personal tasks (always allowed)
- ⚠️ Group/Collaborative tasks (need `canCreateTasks` permission)

**Business Users:**
- ✅ All task types (always allowed)

### 4. Access Control
- Users can only access tasks they created, own, or are assigned to
- Verified by `verifyTaskAccess` middleware
- Only creators/owners can modify/delete tasks

### 5. Automatic Progress Tracking
- Subtask completion auto-updates parent task
- `completionPercentage` calculated automatically
- Task auto-completes when all subtasks done

---

## 📊 Database Schema

### Task Collection
```javascript
{
  _id: ObjectId,
  createdById: ObjectId,           // References User
  ownerUserId: ObjectId,           // References User
  taskType: String,                // 'personal' | 'singleAssignment' | 'collaborative'
  assignedUserIds: [ObjectId],     // References User
  groupId: ObjectId,               // References Group
  title: String,                   // max 200
  description: String,             // max 2000
  scheduledTime: String,
  priority: String,                // 'low' | 'medium' | 'high'
  status: String,                  // 'pending' | 'inProgress' | 'completed'
  totalSubtasks: Number,
  completedSubtasks: Number,
  completionPercentage: Number,
  startTime: Date,
  completedTime: Date,
  dueDate: Date,
  subtasks: [{
    _id: ObjectId,
    title: String,
    isCompleted: Boolean,
    duration: String,
    completedAt: Date,
    order: Number
  }],
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### SubTask Collection
```javascript
{
  _id: ObjectId,
  taskId: ObjectId,                // References Task
  createdById: ObjectId,           // References User
  assignedToUserId: ObjectId,      // References User
  title: String,                   // max 200
  description: String,             // max 1000
  duration: String,
  isCompleted: Boolean,
  completedAt: Date,
  order: Number,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Daily task limit reached. You already have 5 tasks scheduled for this day (max: 5)",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Task type 'personal' cannot have assigned users",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "You do not have permission to access this task",
  "success": false
}
```

```json
{
  "code": 403,
  "message": "You do not have permission to create tasks for this group. Please contact the group owner to request access.",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Task not found",
  "success": false
}
```

---

## 🧪 Testing with cURL

### Create a Personal Task
```bash
curl -X POST http://localhost:6733/api/v1/tasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Complete Math Homework",
    "description": "Solve algebra problems",
    "taskType": "personal",
    "startTime": "2026-01-05T10:30:00.000Z",
    "priority": "high"
  }'
```

### Get All Pending Tasks
```bash
curl -X GET "http://localhost:6733/api/v1/tasks?status=pending" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Create a SubTask
```bash
curl -X POST http://localhost:6733/api/v1/subtasks \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "507f1f77bcf86cd799439011",
    "title": "Call with team",
    "duration": "30 min"
  }'
```

### Toggle SubTask Status
```bash
curl -X PUT http://localhost:6733/api/v1/subtasks/SUBTASK_ID/toggle-status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isCompleted": true
  }'
```

---

## 📝 Notes

1. **Timezone Handling**: All dates stored in UTC. Frontend handles timezone conversion.
2. **Soft Delete**: Tasks/subtasks use `isDeleted` flag instead of hard deletion.
3. **Pagination**: Default limit is 10, max is 100.
4. **Sorting**: Use `-` prefix for descending order (e.g., `-startTime`).
5. **Population**: Related user fields auto-populated in list views.
6. **Rate Limiting**: All endpoints have rate limiting configured.
7. **Caching**: Frequently accessed data cached with Redis (5 min TTL for details, 2 min for lists).

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
