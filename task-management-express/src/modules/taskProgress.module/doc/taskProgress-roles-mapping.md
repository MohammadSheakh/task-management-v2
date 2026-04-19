# TaskProgress Module - Role-Based Access Control Mapping

## Overview

This document defines the role-based access control (RBAC) for all task progress endpoints in the Task Management system. This module tracks each child's independent progress on collaborative tasks.

---

## Module Purpose

The TaskProgress module provides:
- **Per-child progress tracking** on collaborative tasks
- **Subtask completion tracking** for each child
- **Parent dashboard** showing all children's progress
- **Real-time progress updates** with Redis caching
- **Automatic notifications** to parents when tasks are completed

---

## Role Definitions

| Role | Description | Dashboard | Access Level |
|------|-------------|-----------|--------------|
| `business` | Group owners, parents, teachers | Teacher/Parent Dashboard | View all children's progress |
| `child` | Group members, children | Mobile App (Child Interface) | View/update own progress only |
| `admin` | System administrators | Main Admin Dashboard | System-wide oversight |

---

## Route-to-Role Mapping

### Child User Routes (4 routes)

#### 1. Get My Progress
```
GET /task-progress/:taskId/user/:userId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `status-section-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get personal progress on specific task |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "progress123",
    "taskId": "task456",
    "userId": "child789",
    "status": "inProgress",
    "progressPercentage": 50,
    "startedAt": "2026-03-10T09:00:00.000Z",
    "completedAt": null,
    "completedSubtaskIndexes": [0, 1],
    "note": null
  }
}
```

---

#### 2. Update Progress Status
```
PUT /task-progress/:taskId/status
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 30 requests per minute |
| **Description** | Mark task as started or completed |

**Request Body:**
```json
{
  "status": "completed",
  "note": "Finished all exercises!"
}
```

**Status Options:**
- `notStarted` - Task not yet started
- `inProgress` - Task started
- `completed` - Task completed

**Business Logic:**
- Auto-creates progress record if doesn't exist
- Sets `startedAt` timestamp when status changes to `inProgress`
- Sets `completedAt` timestamp when status changes to `completed`
- Sends notification to parent when task completed

---

#### 3. Mark Subtask as Complete
```
PUT /task-progress/:taskId/subtasks/:subtaskIndex/complete
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 30 requests per minute |
| **Description** | Complete a specific subtask |

**Request Body:**
```json
{
  "subtaskIndex": 2
}
```

**Business Logic:**
- Adds subtask index to `completedSubtaskIndexes` array
- Recalculates `progressPercentage` based on completed/total subtasks
- Auto-updates status to `inProgress` if first subtask completed
- Sends notification to parent if all subtasks completed

---

#### 4. Create/Update Progress (Internal)
```
POST /task-progress/:taskId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `system` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `internal` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Auto-create progress when child assigned to task |

**Use Case:**
- Called automatically when collaborative task is created
- Creates progress record for each assigned child
- Initializes with `notStarted` status

---

### Business User Routes (2 routes)

#### 5. Get All Children's Progress on Task
```
GET /task-progress/:taskId/children
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `task-monitoring-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | View all children's progress on a specific task |

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task456",
    "taskTitle": "Family Cleanup",
    "totalSubtasks": 5,
    "childrenProgress": [
      {
        "childId": "child1",
        "childName": "John Doe",
        "status": "completed",
        "startedAt": "2026-03-10T09:00:00.000Z",
        "completedAt": "2026-03-10T14:00:00.000Z",
        "progressPercentage": 100,
        "completedSubtaskCount": 5
      },
      {
        "childId": "child2",
        "childName": "Jane Smith",
        "status": "inProgress",
        "startedAt": "2026-03-10T10:00:00.000Z",
        "completedAt": null,
        "progressPercentage": 60,
        "completedSubtaskCount": 3
      }
    ],
    "summary": {
      "totalChildren": 2,
      "notStarted": 0,
      "inProgress": 1,
      "completed": 1,
      "completionRate": 50,
      "averageProgress": 80
    }
  }
}
```

**Use Case:**
- Parent dashboard showing which children completed/started/not started
- Live activity feed
- Task monitoring view

---

#### 6. Get All Tasks Progress for Child
```
GET /task-progress/child/:childId/tasks
```
| Attribute | Value |
|-----------|-------|
| **Role** | `business` |
| **Auth** | `TRole.business` |
| **Figma** | `task-monitoring-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | View child's overall task performance |

**Query Parameters:**
- `status` - Filter by status (notStarted, inProgress, completed)
- `taskType` - Filter by task type

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "taskId": "task123",
      "taskTitle": "Math Homework",
      "taskType": "personal",
      "status": "completed",
      "progressPercentage": 100,
      "completedSubtaskCount": 5,
      "totalSubtasks": 5,
      "startedAt": "2026-03-10T08:00:00.000Z",
      "completedAt": "2026-03-10T16:00:00.000Z"
    },
    {
      "taskId": "task456",
      "taskTitle": "Family Cleanup",
      "taskType": "collaborative",
      "status": "inProgress",
      "progressPercentage": 60,
      "completedSubtaskCount": 3,
      "totalSubtasks": 5,
      "startedAt": "2026-03-10T09:00:00.000Z",
      "completedAt": null
    }
  ]
}
```

**Use Case:**
- Team member details view
- Child performance tracking
- Task completion history

---

## Role Access Matrix

```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ GET    /:taskId/user/:userId        │  ❌   │    ❌    │   ✅  │
│ GET    /:taskId/children            │  ❌   │    ✅    │   ❌  │
│ GET    /child/:childId/tasks        │  ❌   │    ✅    │   ❌  │
│ PUT    /:taskId/status              │  ❌   │    ❌    │   ✅  │
│ PUT    /:taskId/subtasks/:idx       │  ❌   │    ❌    │   ✅  │
│ POST   /:taskId                     │  ❌   │    ❌    │   ✅  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

**Note:** 
- Child routes use `TRole.commonUser` (accessible by child, business, individual)
- Business routes use `TRole.business` (business/parent only)
- Internal POST route is called by system during task creation

---

## Data Model

### TaskProgress Collection

```typescript
{
  _id: ObjectId,
  taskId: ObjectId,                    // Reference to Task
  userId: ObjectId,                    // Reference to Child User
  status: 'notStarted' | 'inProgress' | 'completed',
  progressPercentage: Number,          // 0-100 based on subtasks
  completedSubtaskIndexes: [Number],   // Array of completed subtask indexes
  startedAt: Date,                     // When child started task
  completedAt: Date,                   // When child completed task
  note: String,                        // Optional note from child
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Indexes

```typescript
// Primary query: Get progress for task and user
{ taskId: 1, userId: 1, isDeleted: 1 }

// Get all children's progress for a task
{ taskId: 1, isDeleted: 1 }

// Get all tasks progress for a child
{ userId: 1, isDeleted: 1 }

// Get progress by status
{ userId: 1, status: 1, isDeleted: 1 }
```

---

## Caching Strategy

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `taskProgress:task:<id>:user:<id>` | 5 min | Individual progress |
| `taskProgress:task:<id>:children` | 3 min | All children's progress |
| `taskProgress:user:<id>:tasks` | 3 min | User's tasks progress |
| `taskProgress:task:<id>:summary` | 2 min | Task summary |

**Cache Invalidation:**
- Update progress → Invalidate individual progress cache
- Complete subtask → Invalidate all related caches
- Task completion → Invalidate summary cache, send notification

---

## Progress Calculation

### Progress Percentage Formula

```
progressPercentage = (completedSubtaskCount / totalSubtasks) * 100
```

**Example:**
- Task has 5 subtasks
- Child completed 3 subtasks
- `progressPercentage = (3 / 5) * 100 = 60%`

### Status Transitions

```
notStarted ──────→ inProgress ──────→ completed
     ↑                   ↑
     │                   │
     └───────────────────┘
     (can re-open)
```

**Automatic Transitions:**
- `notStarted` → `inProgress` when first subtask completed
- `inProgress` → `completed` when all subtasks completed
- `completed` → `inProgress` if task re-opened

---

## Security Considerations

### 1. Child Isolation
- Children can only view/update their own progress
- Cannot view other children's progress
- Middleware validates `userId` matches authenticated user

### 2. Parent Access
- Business users can view all children's progress
- Cannot update children's progress directly
- Read-only access for monitoring

### 3. Rate Limiting
| Operation | Limit | Window | Reason |
|-----------|-------|--------|--------|
| Update progress | 30 | 1 minute | Prevents spam updates |
| General operations | 100 | 1 minute | Standard API limit |

### 4. Notification System
- Parent notified when child completes task
- Notification sent via `NotificationService`
- Async processing to prevent blocking

---

## Figma Asset References

All role assignments are based on:

```
/figma-asset/
├── teacher-parent-dashboard/
│   └── task-monitoring/
│       ├── task-monitoring-flow-01.png    → Parent monitoring view
│       └── create-task-flow/
│           └── collaborative-task.png     → Task assignment
└── app-user/
    └── group-children-user/
        ├── status-section-flow-01.png     → Child progress view
        └── edit-update-task-flow.png      → Update progress
```

---

## API Examples

### Child: Update Task Status
**Request:**
```http
PUT /api/v1/task-progress/task123/status
Authorization: Bearer <child_user_token>
Content-Type: application/json

{
  "status": "completed",
  "note": "Finished all exercises!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task completed successfully",
  "data": {
    "_id": "progress456",
    "taskId": "task123",
    "userId": "child789",
    "status": "completed",
    "progressPercentage": 100,
    "startedAt": "2026-03-10T09:00:00.000Z",
    "completedAt": "2026-03-10T16:00:00.000Z",
    "completedSubtaskIndexes": [0, 1, 2, 3, 4],
    "note": "Finished all exercises!"
  }
}
```

### Child: Complete Subtask
**Request:**
```http
PUT /api/v1/task-progress/task123/subtasks/2/complete
Authorization: Bearer <child_user_token>
Content-Type: application/json

{
  "subtaskIndex": 2
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subtask completed successfully",
  "data": {
    "_id": "progress456",
    "taskId": "task123",
    "userId": "child789",
    "status": "inProgress",
    "progressPercentage": 60,
    "completedSubtaskIndexes": [0, 1, 2],
    "startedAt": "2026-03-10T09:00:00.000Z"
  }
}
```

### Business: Get All Children's Progress
**Request:**
```http
GET /api/v1/task-progress/task123/children
Authorization: Bearer <business_user_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task123",
    "taskTitle": "Family Cleanup",
    "totalSubtasks": 5,
    "childrenProgress": [
      {
        "childId": "child1",
        "childName": "John Doe",
        "status": "completed",
        "progressPercentage": 100,
        "completedSubtaskCount": 5
      },
      {
        "childId": "child2",
        "childName": "Jane Smith",
        "status": "inProgress",
        "progressPercentage": 60,
        "completedSubtaskCount": 3
      }
    ],
    "summary": {
      "totalChildren": 2,
      "notStarted": 0,
      "inProgress": 1,
      "completed": 1,
      "completionRate": 50,
      "averageProgress": 80
    }
  }
}
```

### Business: Get Child's Task Performance
**Request:**
```http
GET /api/v1/task-progress/child/child789/tasks?status=completed
Authorization: Bearer <business_user_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "taskId": "task123",
      "taskTitle": "Math Homework",
      "taskType": "personal",
      "status": "completed",
      "progressPercentage": 100,
      "completedSubtaskCount": 5,
      "totalSubtasks": 5,
      "completedAt": "2026-03-10T16:00:00.000Z"
    },
    {
      "taskId": "task456",
      "taskTitle": "Science Project",
      "taskType": "collaborative",
      "status": "completed",
      "progressPercentage": 100,
      "completedSubtaskCount": 8,
      "totalSubtasks": 8,
      "completedAt": "2026-03-09T18:00:00.000Z"
    }
  ]
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 10-03-26 | Initial role-based access control implementation |

---

**Version:** 1.0.0  
**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team
