# Task Module Documentation V2

**Version:** 2.0 (Family-Based Architecture)  
**Last Updated:** 14-03-26  
**Status:** ✅ Complete - Group Dependencies Removed

---

## 📌 Module Purpose

The Task Module provides comprehensive task management capabilities for a **family-based task management system**. It supports individual tasks and collaborative tasks within family units, managed through `ChildrenBusinessUser` relationships instead of group-based structures.

**Key Features:**
- ✅ Personal task management
- ✅ Single assignment tasks (one family member)
- ✅ Collaborative tasks (multiple family members)
- ✅ Subtask tracking with progress calculation
- ✅ Real-time updates via Socket.io
- ✅ Family activity feed
- ✅ Preferred time calculation (AI-powered scheduling)
- ✅ Daily progress tracking
- ✅ Permission-based task creation (Secondary User system)

---

## 🎯 Responsibilities

### Core Responsibilities
1. **Task CRUD Operations** - Create, read, update, delete tasks
2. **Task Assignment** - Assign tasks to self or family members
3. **Status Management** - Track task lifecycle (pending → inProgress → completed)
4. **Progress Tracking** - Monitor subtask completion and overall progress
5. **Permission Management** - Enforce Secondary User task creation rights
6. **Cache Management** - Redis caching for optimal performance
7. **Real-time Updates** - Broadcast task changes to family members
8. **Activity Recording** - Log family task activities
9. **Preferred Time Calculation** - Analyze user patterns for scheduling suggestions

### Non-Responsibilities
- ❌ User authentication (handled by auth.module)
- ❌ Family relationship management (handled by childrenBusinessUser.module)
- ❌ File uploads (handled by upload.module)
- ❌ Notifications (handled by notification.module, triggered by task events)

---

## 📁 Module Structure

```
task.module/
├── task/
│   ├── task.constant.ts         # Enums, cache config, rate limits
│   ├── task.interface.ts        # TypeScript interfaces
│   ├── task.model.ts            # Mongoose schema, indexes, virtuals
│   ├── task.validation.ts       # Zod validation schemas
│   ├── task.service.ts          # Business logic, cache, activity tracking
│   ├── task.controller.ts       # HTTP request handlers
│   ├── task.middleware.ts       # Permission checks, validation
│   └── task.route.ts            # API route definitions
│
├── subTask/
│   ├── subTask.constant.ts
│   ├── subTask.interface.ts
│   ├── subTask.model.ts
│   ├── subTask.validation.ts
│   ├── subTask.service.ts
│   ├── subTask.controller.ts
│   ├── subTask.middleware.ts
│   └── subTask.route.ts
│
└── doc/
    ├── README.md                    ← This file
    ├── API_DOCUMENTATION.md         ← Complete API reference
    ├── TASK_MODULE_ARCHITECTURE.md  ← Architecture deep dive
    ├── TASK_MODULE_SYSTEM_GUIDE.md  ← System guide
    ├── DIAGRAMS_INDEX.md            ← Diagram index
    │
    ├── dia/                         ← Mermaid diagrams
    │   ├── 01-current-v2/           ← Current V2 diagrams
    │   └── 02-legacy-v1/            ← Legacy V1 diagrams
    │
    └── perf/
        └── task-performance-report-V2-14-03-26.md  ← Performance analysis
```

---

## 🔗 Quick Links

### Documentation
- [API Documentation](./API_DOCUMENTATION.md) - Complete endpoint reference
- [System Architecture](./TASK_MODULE_ARCHITECTURE.md) - Component architecture
- [System Guide](./TASK_MODULE_SYSTEM_GUIDE.md) - Implementation guide
- [Performance Report](./perf/task-performance-report-V2-14-03-26.md) - Performance analysis

### Diagrams
- [Schema Diagram](./dia/task-schema-V2-14-03-26.mermaid) - Data model
- [System Architecture](./dia/task-system-architecture-V2-14-03-26.mermaid) - High-level architecture
- [User Flow](./dia/task-user-flow-V2-14-03-26.mermaid) - User journey
- [Sequence Diagram](./dia/task-sequence-V2-14-03-26.mermaid) - Request/response flow
- [State Machine](./dia/task-state-machine-V2-14-03-26.mermaid) - Status transitions
- [Component Architecture](./dia/task-component-architecture-V2-14-03-26.mermaid) - Internal structure
- [Data Flow](./dia/task-data-flow-V2-14-03-26.mermaid) - Data transformation

---

## 🚀 API Endpoints Summary

### Task Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/tasks` | Create task | Business, Secondary User |
| GET | `/tasks` | Get my tasks (filtered) | All users |
| GET | `/tasks/paginate` | Get paginated tasks | All users |
| GET | `/tasks/statistics` | Get task statistics | All users |
| GET | `/tasks/daily-progress` | Get daily progress | All users |
| GET | `/tasks/suggest-preferred-time` | Get time suggestion | All users |
| GET | `/tasks/:id` | Get task by ID | Task members |
| PUT | `/tasks/:id` | Update task | Creator/Owner |
| PUT | `/tasks/:id/status` | Update task status | Task members |
| PUT | `/tasks/:id/subtasks/progress` | Update subtask progress | Creator/Owner |
| DELETE | `/tasks/:id` | Soft delete task | Creator/Owner |
| DELETE | `/tasks/:id/permanent` | Permanently delete | Admin only |

### SubTask Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/tasks/:id/subtasks` | Add subtask | Task creator/owner |
| GET | `/tasks/:id/subtasks` | Get all subtasks | Task members |
| GET | `/tasks/:id/subtasks/:subtaskId` | Get subtask | Task members |
| PUT | `/tasks/:id/subtasks/:subtaskId` | Update subtask | Task creator/owner |
| POST | `/tasks/:id/subtasks/:subtaskId/toggle` | Toggle subtask | Task members |
| DELETE | `/tasks/:id/subtasks/:subtaskId` | Delete subtask | Task creator/owner |

---

## 📊 System Flow

### Task Creation Flow
```
User Request → Route → Middleware (Auth, Permission) → Controller
  → Service → Validate Daily Limit → Create Task
  → Record Family Activity → Invalidate Cache → Emit Real-time Event
  → Return Response
```

### Task Retrieval Flow (Cached)
```
User Request → Route → Middleware (Auth) → Controller → Service
  → Check Redis Cache → Cache Hit → Return Cached Data
```

### Task Retrieval Flow (Cache Miss)
```
User Request → Route → Middleware (Auth) → Controller → Service
  → Check Redis Cache → Cache Miss → Query MongoDB (with indexes)
  → Cache Results → Return Data
```

### Status Update Flow
```
User Request → Route → Middleware (Access Check, Status Validation)
  → Controller → Service → Update Task → Record Activity
  → Invalidate Cache → Queue Preferred Time Calculation
  → Emit Real-time Event → Return Response
```

---

## 🎯 Key Design Decisions

### V2 Changes (Family-Based Architecture)

**Removed:**
- ❌ `groupId` field from Task schema
- ❌ Group module dependencies
- ❌ `recordGroupActivity()` calls
- ❌ `broadcastGroupActivity()` calls

**Added:**
- ✅ Family-based activity tracking via `recordFamilyActivity()`
- ✅ Family member broadcasting via `broadcastToFamilyMembers()`
- ✅ ChildrenBusinessUser relationship for permissions
- ✅ Secondary User permission system

**Why:**
- Simplified schema (no group abstraction needed)
- Direct family relationships (better performance)
- Aligned with Figma design (family/team structure)
- Reduced join complexity

---

## 🔐 Permission System

### Task Creation Permissions

| User Role | Can Create Personal | Can Create Single Assignment | Can Create Collaborative |
|-----------|-------------------|---------------------------|-------------------------|
| **Business** | ✅ Always | ✅ Always | ✅ Always |
| **Secondary User** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Regular Child** | ✅ Yes (self only) | ❌ No | ❌ No |

### Task Access Permissions

| Action | Creator | Owner | Assigned User |
|--------|---------|-------|---------------|
| View Task | ✅ | ✅ | ✅ |
| Update Task | ✅ | ✅ | ❌ |
| Update Status | ✅ | ✅ | ✅ |
| Delete Task | ✅ | ✅ | ❌ |

---

## 📈 Performance Targets

### Scale Goals
- **Concurrent Users:** 100,000+
- **Total Tasks:** 10,000,000+
- **API Response Time (reads):** < 200ms (p95)
- **API Response Time (writes):** < 500ms (p95)
- **Cache Hit Rate:** > 80%

### Caching Strategy
- **Task List:** 2 minutes TTL
- **Task Detail:** 5 minutes TTL
- **Statistics:** 5 minutes TTL
- **Daily Progress:** 2 minutes TTL

### Rate Limiting
- **Task Creation:** 20 requests/hour per user
- **General Operations:** 100 requests/minute per user

---

## 🛠️ Development Guidelines

### Before Creating a Task
- [ ] Check Secondary User permission (for non-business users)
- [ ] Validate daily task limit (max 5 personal tasks/day)
- [ ] Validate task type consistency (personal vs collaborative)
- [ ] Set appropriate assignedUserIds based on taskType

### Before Updating a Task
- [ ] Verify task access (user is creator, owner, or assigned)
- [ ] Verify task ownership (for modifications)
- [ ] Validate status transition (pending → inProgress → completed)
- [ ] Invalidate related cache keys

### Query Optimization
- [ ] Always use `.lean()` for read-only queries
- [ ] Include `isDeleted: false` in all queries
- [ ] Use appropriate indexes (ownerUserId, status, startTime)
- [ ] Apply pagination for list endpoints

---

## 📝 API Examples

### Create Personal Task
```bash
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Morning Exercise",
  "description": "30-minute workout",
  "taskType": "personal",
  "startTime": "2026-03-14T07:00:00Z",
  "scheduledTime": "07:00 AM",
  "priority": "medium"
}
```

### Create Collaborative Task
```bash
POST /api/v1/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Clean Living Room",
  "description": "Family cleaning task",
  "taskType": "collaborative",
  "assignedUserIds": ["userId1", "userId2"],
  "startTime": "2026-03-14T10:00:00Z",
  "priority": "high"
}
```

### Get Tasks with Pagination
```bash
GET /api/v1/tasks/paginate?page=1&limit=10&status=pending&sortBy=-startTime
Authorization: Bearer <token>
```

### Update Task Status
```bash
PUT /api/v1/tasks/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "completedTime": "2026-03-14T11:30:00Z"
}
```

---

## 🔍 Troubleshooting

### Common Issues

**Issue:** "Only Secondary Users can create tasks"
- **Cause:** Child user without Secondary User permission trying to create tasks for others
- **Solution:** Grant Secondary User status via ChildrenBusinessUser model

**Issue:** "Daily task limit reached"
- **Cause:** User already created 5 personal tasks for the day
- **Solution:** Wait until next day or reduce existing tasks

**Issue:** "Invalid status transition"
- **Cause:** Trying to change completed task status
- **Solution:** Completed tasks cannot be changed (terminal state)

**Issue:** "You do not have access to this task"
- **Cause:** User is not creator, owner, or assigned to the task
- **Solution:** Ensure task is assigned to the user or created by them

---

## 📚 References

### Figma Screenshots
- `app-user/group-children-user/home-flow.png`
- `app-user/group-children-user/add-task-flow-for-permission-account-interface.png`
- `app-user/group-children-user/status-section-flow-01.png`
- `teacher-parent-dashboard/dashboard/dashboard-flow-01.png`
- `teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png`
- `teacher-parent-dashboard/team-members/team-member-flow-01.png`

### Related Modules
- `childrenBusinessUser.module` - Family relationship management
- `notification.module` - Activity tracking and notifications
- `user.module` - User profiles and preferred time
- `auth.module` - Authentication and authorization

---

**Created:** 14-03-26  
**Last Updated:** 14-03-26  
**Version:** 2.0 (Family-Based Architecture)
