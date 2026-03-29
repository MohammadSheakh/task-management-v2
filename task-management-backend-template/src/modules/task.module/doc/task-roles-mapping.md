# Task.Module - Role-Based Access Control Mapping

## Overview

This document defines the role-based access control (RBAC) for all task and subTask endpoints in the Task Management system. This module is the core of the task management functionality.

---

## Module Purpose

### Task Module
Manages tasks with multiple types and assignment options:
- **Personal Tasks**: For individual users
- **Single Assignment Tasks**: Assigned to one member
- **Collaborative Tasks**: Assigned to multiple members
- **Group Tasks**: Tasks for group members

### SubTask Module
Manages task breakdown:
- Create subtasks under parent tasks
- Track subtask completion
- Auto-calculate parent task completion

---

## Role Definitions

| Role | Description | Dashboard | Task Access |
|------|-------------|-----------|-------------|
| `business` | Group owners, parents, teachers | Teacher/Parent Dashboard | Full task management, create tasks for children |
| `child` | Group members, children | Mobile App (Child Interface) | Personal tasks, update own tasks |
| `admin` | System administrators | Main Admin Dashboard | Permanent task deletion |

---

## Task Module Routes

### Task Management

#### 1. Create Task
```
POST /tasks/
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png`, `create-task-flow/` |
| **Rate Limit** | 20 requests per hour |
| **Description** | Create personal, single assignment, or collaborative task |

**Task Types:**
- `personal` - For yourself only
- `single_assignment` - Assign to one member
- `collaborative` - Assign to multiple members

**Permission Check:**
- Child users need explicit `canCreateTasks` permission for group/collaborative tasks
- Business users can create all task types

**Request Body:**
```json
{
  "title": "Math Homework",
  "description": "Complete chapter 5 exercises",
  "taskType": "personal",
  "priority": "high",
  "startTime": "2026-03-10T08:00:00.000Z",
  "endTime": "2026-03-10T20:00:00.000Z",
  "groupId": "group123"
}
```

---

#### 2. Get My Tasks
```
GET /tasks/
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `home-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get tasks where user is creator, owner, or assigned |

**Query Parameters:**
- `status` - Filter by status (pending, inProgress, completed)
- `taskType` - Filter by task type
- `priority` - Filter by priority (low, normal, high, urgent)
- `from`, `to` - Date range filter

---

#### 3. Get My Tasks with Pagination
```
GET /tasks/paginate
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `home-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Paginated list of tasks with advanced filtering |

**Query Parameters:**
- `status`, `taskType`, `priority`, `from`, `to` - Filters
- `page`, `limit`, `sortBy` - Pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "task123",
        "title": "Math Homework",
        "status": "pending",
        "priority": "high",
        "taskType": "personal",
        "createdById": {
          "_id": "user456",
          "name": "John Doe",
          "profileImage": "https://..."
        },
        "subtasks": [
          {
            "_id": "sub1",
            "title": "Exercise 1",
            "isCompleted": false
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

---

#### 4. Get Task Statistics
```
GET /tasks/statistics
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `status-section-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get count of tasks by status |

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "inProgress": 3,
    "completed": 12,
    "total": 20,
    "completionRate": 60
  }
}
```

---

#### 5. Get Daily Progress
```
GET /tasks/daily-progress
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `home-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get task completion progress for a specific date |

**Query Parameters:**
- `date` - Date (defaults to today)

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-10",
    "totalTasks": 5,
    "completedTasks": 3,
    "pendingTasks": 2,
    "completionRate": 60,
    "tasks": [
      {
        "_id": "task123",
        "title": "Math Homework",
        "status": "completed",
        "completedAt": "2026-03-10T14:00:00.000Z"
      }
    ]
  }
}
```

---

#### 6. Get Task by ID
```
GET /tasks/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `task-details-with-subTasks.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Task creator, owner, or assigned users only |

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "task123",
    "title": "Math Homework",
    "description": "Complete chapter 5",
    "status": "inProgress",
    "priority": "high",
    "taskType": "personal",
    "createdById": {
      "_id": "user456",
      "name": "John Doe"
    },
    "ownerUserId": {
      "_id": "user789",
      "name": "Jane Smith"
    },
    "assignedUserIds": [],
    "subtasks": [
      {
        "_id": "sub1",
        "title": "Exercise 1",
        "isCompleted": false
      }
    ],
    "completionPercentage": 50
  }
}
```

---

#### 7. Update Task
```
PUT /tasks/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Task creator or owner only |

**Updatable Fields:**
- `title`, `description`, `priority`
- `status`, `startTime`, `endTime`
- `assignedUserIds` (for single/collaborative tasks)

---

#### 8. Update Task Status
```
PUT /tasks/:id/status
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Task creator, owner, or assigned users only |

**Request Body:**
```json
{
  "status": "completed",
  "completedTime": "2026-03-10T14:00:00.000Z"
}
```

**Status Transitions:**
```
pending → inProgress → completed
pending → completed (direct)
completed → inProgress (re-open)
```

---

#### 9. Update Subtask Progress
```
PUT /tasks/:id/subtasks/progress
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Task creator or owner only |

**Request Body:**
```json
{
  "subtasks": [
    {
      "_id": "sub1",
      "title": "Exercise 1",
      "isCompleted": true
    },
    {
      "_id": "sub2",
      "title": "Exercise 2",
      "isCompleted": false
    }
  ]
}
```

**Business Logic:**
- Automatically recalculates `completionPercentage`
- Updates parent task status if all subtasks complete

---

#### 10. Soft Delete Task
```
DELETE /tasks/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Task creator or owner only |

**Business Logic:**
- Sets `isDeleted: true`
- Does not delete subtasks (soft delete)
- Removes from user's task list

---

#### 11. Permanent Delete Task
```
DELETE /tasks/:id/permanent
```
| Attribute | Value |
|-----------|-------|
| **Role** | `admin` |
| **Auth** | `TRole.admin` |
| **Figma** | `dashboard-section-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | System administrators only |

**Business Logic:**
- Permanently removes from database
- Deletes all associated subtasks
- Cannot be undone

---

## SubTask Module Routes

### SubTask Management

#### 1. Create Subtask
```
POST /tasks/:taskId/subtasks/
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Users with access to parent task |

**Request Body:**
```json
{
  "title": "Exercise 1",
  "duration": 30
}
```

---

#### 2. Get Subtasks for Task
```
GET /tasks/:taskId/subtasks/task/:taskId
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `task-details-with-subTasks.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Users with access to parent task |

**Response:**
```json
{
  "success": true,
  "data": {
    "subtasks": [
      {
        "_id": "sub1",
        "title": "Exercise 1",
        "isCompleted": false,
        "duration": 30,
        "createdById": {
          "_id": "user456",
          "name": "John Doe"
        }
      }
    ]
  }
}
```

---

#### 3. Get Subtasks with Pagination
```
GET /tasks/:taskId/subtasks/task/:taskId/paginate
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `task-details-with-subTasks.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Users with access to parent task |

---

#### 4. Get Subtask Statistics
```
GET /tasks/:taskId/subtasks/statistics
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `status-section-flow-01.png` |
| **Rate Limit** | 100 requests per minute |
| **Description** | Get subtask completion statistics |

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 10,
    "completed": 6,
    "pending": 4,
    "completionRate": 60
  }
}
```

---

#### 5. Get Subtask by ID
```
GET /tasks/:taskId/subtasks/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `task-details-with-subTasks.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Users with access to parent task |

---

#### 6. Update Subtask
```
PUT /tasks/:taskId/subtasks/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Subtask creator or task owner only |

**Updatable Fields:**
- `title`, `duration`, `isCompleted`

---

#### 7. Toggle Subtask Status
```
PUT /tasks/:taskId/subtasks/:id/toggle-status
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Subtask creator or task owner only |

**Request Body:**
```json
{
  "isCompleted": true
}
```

**Business Logic:**
- Toggles `isCompleted` status
- Auto-updates parent task completion percentage
- Sets `completedAt` timestamp if completing

---

#### 8. Delete Subtask
```
DELETE /tasks/:taskId/subtasks/:id
```
| Attribute | Value |
|-----------|-------|
| **Role** | `child`, `business` |
| **Auth** | `TRole.commonUser` |
| **Figma** | `edit-update-task-flow.png` |
| **Rate Limit** | 100 requests per minute |
| **Access** | Subtask creator or task owner only |

**Business Logic:**
- Deletes subtask permanently
- Recalculates parent task completion percentage

---

## Role Access Matrix

### Task Module

```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ POST   /                            │  ❌   │    ✅    │   ✅  │
│ GET    /                            │  ❌   │    ✅    │   ✅  │
│ GET    /paginate                    │  ❌   │    ✅    │   ✅  │
│ GET    /statistics                  │  ❌   │    ✅    │   ✅  │
│ GET    /daily-progress              │  ❌   │    ✅    │   ✅  │
│ GET    /:id                         │  ❌   │    ✅    │   ✅  │
│ PUT    /:id                         │  ❌   │    ✅    │   ✅  │
│ PUT    /:id/status                  │  ❌   │    ✅    │   ✅  │
│ PUT    /:id/subtasks/progress       │  ❌   │    ✅    │   ✅  │
│ DELETE /:id                         │  ❌   │    ✅    │   ✅  │
│ DELETE /:id/permanent               │  ✅   │    ❌    │   ❌  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

### SubTask Module

```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ POST   /:taskId/subtasks            │  ❌   │    ✅    │   ✅  │
│ GET    /:taskId/subtasks/task/:tid  │  ❌   │    ✅    │   ✅  │
│ GET    /:taskId/subtasks/paginate   │  ❌   │    ✅    │   ✅  │
│ GET    /:taskId/subtasks/statistics │  ❌   │    ✅    │   ✅  │
│ GET    /:taskId/subtasks/:id        │  ❌   │    ✅    │   ✅  │
│ PUT    /:taskId/subtasks/:id        │  ❌   │    ✅    │   ✅  │
│ PUT    /:taskId/subtasks/:id/toggle │  ❌   │    ✅    │   ✅  │
│ DELETE /:taskId/subtasks/:id        │  ❌   │    ✅    │   ✅  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

---

## Permission System

### Child User Task Creation

Child users (secondary users) have restricted task creation capabilities:

| Task Type | Permission Required | Figma Reference |
|-----------|---------------------|-----------------|
| `personal` | None (always allowed) | `without-permission-task-create-for-only-self-interface.png` |
| `single_assignment` | `canCreateTasks` | `add-task-flow-for-permission-account-interface.png` |
| `collaborative` | `canCreateTasks` | `add-task-flow-for-permission-account-interface.png` |
| `group` | `canCreateTasks` | `add-task-flow-for-permission-account-interface.png` |

**Permission Granting:**
- Business users (group owners) grant `canCreateTasks` permission via GroupMember module
- Permission is stored in `GroupMember.permissions.canCreateTasks`
- Checked via `GroupMember.canCreateTasks(groupId, userId)` method

---

## Data Models

### Task Collection

```typescript
{
  _id: ObjectId,
  createdById: ObjectId,              // Who created the task
  ownerUserId: ObjectId,              // Task owner (for personal tasks)
  assignedUserIds: [ObjectId],        // Assigned users (for single/collaborative)
  groupId: ObjectId,                  // Optional group association
  title: String,
  description: String,
  taskType: 'personal' | 'single_assignment' | 'collaborative',
  status: 'pending' | 'inProgress' | 'completed',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  startTime: Date,
  endTime: Date,
  completedTime: Date,
  subtasks: [{
    _id: ObjectId,
    title: String,
    isCompleted: Boolean,
    duration: Number,
    completedAt: Date,
    order: Number
  }],
  completionPercentage: Number,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### SubTask Collection

```typescript
{
  _id: ObjectId,
  taskId: ObjectId,                   // Parent task reference
  createdById: ObjectId,              // Who created the subtask
  assignedToUserId: ObjectId,         // Who it's assigned to
  title: String,
  description: String,
  isCompleted: Boolean,
  duration: Number,                   // Estimated minutes
  completedAt: Date,
  order: Number,                      // Display order
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Security Considerations

### 1. Task Access Control
- Users can only view tasks they created, own, or are assigned to
- Middleware `verifyTaskAccess` checks before every read operation
- Collaborative tasks visible to all assigned users

### 2. Task Ownership
- Only creator/owner can update or delete tasks
- Middleware `verifyTaskOwnership` validates ownership
- Assigned users can only update status (not delete)

### 3. Permission-Based Creation
- Child users need `canCreateTasks` permission for group tasks
- Checked via `GroupMember.canCreateTasks()` method
- Prevents unauthorized task creation

### 4. Rate Limiting
| Operation | Limit | Window |
|-----------|-------|--------|
| Create task | 20 | 1 hour |
| General operations | 100 | 1 minute |
| Permanent delete | 100 | 1 minute |

### 5. Status Transition Validation
- Middleware `validateStatusTransition` ensures valid transitions
- Prevents invalid status changes (e.g., completed → pending)
- Enforces business logic for task workflow

---

## Figma Asset References

All role assignments are based on:

```
/figma-asset/
├── teacher-parent-dashboard/
│   ├── dashboard/
│   │   └── dashboard-flow-01.png
│   └── task-monitoring/
│       └── create-task-flow/
│           ├── create-task.png
│           ├── single-assignment.png
│           ├── collaborative-task.png
│           └── personal-task.png
└── app-user/
    └── group-children-user/
        ├── home-flow.png
        ├── edit-update-task-flow.png
        ├── status-section-flow-01.png
        ├── status-section-flow-02.png
        ├── add-task-flow-for-permission-account-interface.png
        ├── profile-permission-account-interface.png
        ├── profile-without-permission-interface.png
        └── without-permission-task-create-for-only-self-interface.png
```

---

## API Examples

### Create Personal Task
**Request:**
```http
POST /api/v1/tasks/
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "title": "Math Homework",
  "description": "Complete chapter 5 exercises",
  "taskType": "personal",
  "priority": "high",
  "startTime": "2026-03-10T08:00:00.000Z",
  "endTime": "2026-03-10T20:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "task123",
    "title": "Math Homework",
    "taskType": "personal",
    "status": "pending",
    "priority": "high",
    "createdById": "user456",
    "ownerUserId": "user456",
    "completionPercentage": 0
  }
}
```

### Create Collaborative Task (Business User)
**Request:**
```http
POST /api/v1/tasks/
Authorization: Bearer <business_user_token>
Content-Type: application/json

{
  "title": "Family Cleanup",
  "description": "Clean the garage together",
  "taskType": "collaborative",
  "priority": "normal",
  "assignedUserIds": ["child1", "child2"],
  "groupId": "group123",
  "startTime": "2026-03-11T09:00:00.000Z",
  "endTime": "2026-03-11T17:00:00.000Z"
}
```

### Add Subtask
**Request:**
```http
POST /api/v1/tasks/task123/subtasks/
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "title": "Exercise 1-5",
  "duration": 30
}
```

### Toggle Subtask Status
**Request:**
```http
PUT /api/v1/tasks/task123/subtasks/sub456/toggle-status
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "isCompleted": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subtask marked as completed",
  "data": {
    "_id": "sub456",
    "title": "Exercise 1-5",
    "isCompleted": true,
    "completedAt": "2026-03-10T14:30:00.000Z",
    "parentTaskCompletion": 50
  }
}
```

---

**Version:** 1.0.0  
**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team
