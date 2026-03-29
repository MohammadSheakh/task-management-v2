# 📋 Task Module - Architecture Documentation (v2.0)

**Version**: 2.0 - Updated with Socket.IO Real-Time Integration  
**Status**: ✅ Production Ready  
**Last Updated**: 12-03-26  

---

## 🎯 Module Overview (v2.0)

The Task Module is the **core module** of the Task Management System, providing comprehensive task management capabilities for individual users, groups, and teams with **real-time Socket.IO integration** for instant updates and family activity broadcasting.

### Key Features (v2.0)

- ✅ **Task Types**: Personal, Single Assignment, Collaborative
- ✅ **Subtask Management**: Hierarchical task breakdown
- ✅ **Status Tracking**: Pending → In Progress → Completed
- ✅ **Priority Levels**: Low, Medium, High
- ✅ **Daily Limits**: Prevent task overload (max 50/day)
- ✅ **Group Integration**: Team task management
- ✅ **Activity Tracking**: Real-time activity feed
- ✅ **Redis Caching**: High-performance reads
- ✅ **Soft Delete**: Audit trail preservation
- ✅ **Socket.IO Real-Time** ⭐ NEW! - Instant task updates
- ✅ **Family Broadcasting** ⭐ NEW! - Real-time parent notifications
- ✅ **TaskProgress Integration** ⭐ NEW! - Per-child progress tracking

---

## 📂 Module Structure (v2.0)

```
task.module/
├── doc/
│   ├── dia/                        # 12 Mermaid diagrams (v2.0)
│   │   ├── task-schema-v2.mermaid
│   │   ├── task-system-architecture-v2.mermaid
│   │   ├── task-sequence-v2.mermaid
│   │   ├── task-user-flow-v2.mermaid
│   │   ├── task-swimlane-v2.mermaid
│   │   ├── task-state-machine-v2.mermaid
│   │   ├── task-component-architecture-v2.mermaid
│   │   ├── task-data-flow-v2.mermaid
│   │   ├── task-deployment-v2.mermaid
│   │   └── ... (3 more)
│   ├── API_DOCUMENTATION.md        # Complete API reference
│   ├── DIAGRAMS_INDEX.md           # Diagram index
│   ├── TASK_MODULE_ARCHITECTURE-v2.md  # This file
│   ├── TASK_MODULE_SYSTEM_GUIDE-v2.md  # ⭐ NEW!
│   └── perf/
│       └── task-module-performance-report.md
│
├── task/                           # Core task management
│   ├── task.interface.ts           # TypeScript interfaces
│   ├── task.constant.ts            # Constants & config
│   ├── task.model.ts               # Mongoose schema
│   ├── task.service.ts             # Business logic + Socket.IO ⭐
│   ├── task.controller.ts          # HTTP handlers
│   ├── task.route.ts               # API routes
│   ├── task.validation.ts          # Zod schemas
│   └── task.middleware.ts          # Custom middleware
│
├── subTask/                        # Subtask management
│   ├── subtask.interface.ts
│   ├── subtask.constant.ts
│   ├── subtask.model.ts
│   ├── subtask.service.ts
│   ├── subtask.controller.ts
│   ├── subtask.route.ts
│   └── subtask.validation.ts
│
└── masterSystemPromptV0.md         # Historical context
```

---

## 🏗️ Architecture Design (v2.0)

### Design Principles

1. **SOLID Principles**
   - Single Responsibility: Each service has one concern
   - Open/Closed: Extendable without modification
   - Liskov Substitution: Interface implementations are substitutable
   - Interface Segregation: Small, focused interfaces
   - Dependency Injection: All dependencies injected

2. **Generic Patterns**
   - Extends `GenericService` for CRUD operations
   - Extends `GenericController` for HTTP handling
   - Reusable middleware components

3. **Real-Time First** ⭐ NEW!
   - Socket.IO for instant updates
   - Family activity broadcasting
   - Real-time parent notifications
   - Task progress tracking

4. **Scalability**
   - Designed for 100K+ users, 10M+ tasks
   - Redis caching (2-5 minute TTL)
   - **Socket.IO state caching (1 min TTL)** ⭐ NEW!
   - MongoDB compound indexes
   - Horizontal scaling ready

---

## 📊 Database Schema (v2.0)

### Task Collection

```typescript
interface ITask {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  taskType: 'personal' | 'singleAssignment' | 'collaborative';
  status: 'pending' | 'inProgress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  createdById: Types.ObjectId;
  ownerUserId: Types.ObjectId;
  assignedUserIds: Types.ObjectId[];
  startTime: Date;
  dueDate?: Date;
  completedTime?: Date;
  totalSubtasks: number;
  completedSubtasks: number;
  completionPercentage: number;  // ⭐ NEW! Auto-calculated
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Indexes

```typescript
// Primary query: Get user's tasks
taskSchema.index({ ownerUserId: 1, status: 1, isDeleted: 1, startTime: -1 });

// Assigned tasks
taskSchema.index({ assignedUserIds: 1, status: 1, isDeleted: 1 });

// Collaborative tasks
taskSchema.index({ taskType: 1, assignedUserIds: 1, isDeleted: 1 });

// Daily tasks
taskSchema.index({ ownerUserId: 1, startTime: 1, isDeleted: 1 });

// Text search
taskSchema.index({ title: 'text', description: 'text' });
```

---

## 🔄 Real-Time Integration (v2.0) ⭐ NEW!

### Socket.IO Task Updates

```typescript
// Real-time task creation
async createTask(data: ITaskCreateDTO, userId: Types.ObjectId) {
  const task = await Task.create({
    ...data,
    createdById: userId,
    ownerUserId: userId
  });

  // Broadcast to family room
  await socketService.broadcastGroupActivity(data.groupId, {
    type: 'task_created',
    actor: { userId, name: userName },
    task: { taskId: task._id, title: task.title },
    timestamp: new Date()
  });

  return task;
}
```

### Family Activity Broadcasting

```typescript
// Broadcast task completion to family
async completeTask(taskId: string, userId: string) {
  const task = await Task.findByIdAndUpdate(taskId, {
    status: 'completed',
    completedTime: new Date()
  });

  // Broadcast to family room
  await socketService.broadcastGroupActivity(familyId, {
    type: 'task_completed',
    actor: { userId, name: userName },
    task: { taskId, title: task.title },
    timestamp: new Date()
  });

  return task;
}
```

### Redis Cache Keys (v2.0)

```typescript
// Task caches
task:detail:{taskId}              // TTL: 5 min
task:list:{userId}:{filters}      // TTL: 2 min
task:statistics:{userId}          // TTL: 5 min
task:daily-progress:{userId}:{date}  // TTL: 2 min

// Socket.IO state ⭐ NEW!
socket:task:{taskId}:subscribers  // TTL: 1 min
socket:family:{familyId}:activity // TTL: 2 min
```

---

## 🎯 Key Components (v2.0)

### 1. Task Service

**File**: `task.service.ts`

**Responsibilities**:
- Task CRUD operations
- Real-time Socket.IO broadcasting ⭐ NEW!
- Redis caching
- Daily limit enforcement
- Task statistics

**Key Methods**:
```typescript
class TaskService {
  // Create task
  async createTask(
    data: ITaskCreateDTO,
    userId: Types.ObjectId
  ): Promise<ITask>

  // Get user's tasks
  async getUserTasks(
    userId: Types.ObjectId,
    filters: ITaskFilters
  ): Promise<ITask[]>

  // Update task status
  async updateTaskStatus(
    taskId: string,
    status: TTaskStatus,
    userId: Types.ObjectId
  ): Promise<ITask>

  // Get task statistics
  async getTaskStatistics(
    userId: Types.ObjectId
  ): Promise<ITaskStatistics>

  // Get daily progress
  async getDailyProgress(
    userId: Types.ObjectId,
    date?: Date
  ): Promise<IDailyProgress>

  // ⭐ NEW: Real-time broadcasting
  async broadcastTaskUpdate(
    taskId: string,
    event: string,
    data: any
  ): Promise<void>
}
```

---

### 2. SubTask Service

**File**: `subtask.service.ts`

**Responsibilities**:
- Subtask CRUD operations
- Subtask progress tracking
- Auto-update parent task completion
- Real-time notifications ⭐ NEW!

**Key Methods**:
```typescript
class SubTaskService {
  // Create subtask
  async createSubtask(
    taskId: string,
    data: ISubTaskCreateDTO
  ): Promise<ISubTask>

  // Toggle subtask status
  async toggleSubtaskStatus(
    subtaskId: string
  ): Promise<ISubTask>

  // Update all subtasks
  async updateSubtaskProgress(
    taskId: string,
    subtasks: ISubTaskUpdateDTO[]
  ): Promise<ITask>
}
```

---

## 🔐 Security Features (v2.0)

### 1. Authentication

- ✅ JWT authentication required for all endpoints
- ✅ Role-based access control
  - Common role: View own tasks
  - Business role: Manage family tasks
  - Admin role: Platform-wide oversight

### 2. Authorization

```typescript
// Users can only see their own tasks
GET /tasks/my  // ✅ Own tasks
GET /tasks/:id  // ❌ Others' tasks (unless assigned)

// Family task management
POST /tasks  // ✅ Business user or Secondary User
GET /tasks/family/:familyId  // ✅ Family member
```

### 3. Data Privacy

```typescript
// ✅ Good: Aggregated task data
{
  totalTasks: 156,
  completedTasks: 124,
  completionRate: 79.49
}

// ❌ Bad: Exposing task details in analytics
{
  tasks: [
    { title: "Private task", ... }  // Never expose!
  ]
}
```

---

## 📈 Performance Optimization (v2.0)

### 1. Redis Caching Strategy

```typescript
// Cache-aside pattern
async getTaskStatistics(userId: Types.ObjectId) {
  const cacheKey = `task:statistics:${userId}`;
  
  // 1. Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);  // ~5ms
  }
  
  // 2. Cache miss - aggregate from DB
  const stats = await this.aggregateStatistics(userId);  // ~50ms
  
  // 3. Write to cache (5 min TTL)
  await redisClient.setEx(cacheKey, 300, JSON.stringify(stats));
  
  // 4. Return data
  return stats;
}
```

**Cache TTLs (v2.0)**:
```typescript
// Task caches
task:detail: 5 min
task:list: 2 min
task:statistics: 5 min
task:daily-progress: 2 min

// Socket.IO state ⭐ NEW!
socket:task:subscribers: 1 min
socket:family:activity: 2 min
```

### 2. Cache Invalidation (v2.0)

```typescript
// Invalidate on task changes
async updateTaskStatus(taskId: string, status: string, userId: string) {
  // Update task
  await Task.findByIdAndUpdate(taskId, { status });
  
  // Invalidate caches
  await redisClient.del([
    `task:detail:${taskId}`,
    `task:list:${userId}`,
    `task:statistics:${userId}`
  ]);
  
  // Broadcast via Socket.IO
  await socketService.broadcastGroupActivity(familyId, {
    type: 'task_status_changed',
    actor: { userId },
    task: { taskId, status },
    timestamp: new Date()
  });
}
```

---

## 📊 API Endpoints Summary (v2.0)

### Task Management (9 endpoints)

| Method | Endpoint | Auth | Description | Real-Time |
|--------|----------|------|-------------|-----------|
| POST | `/tasks/` | ✅ | Create task | ✅ Broadcast |
| GET | `/tasks/` | ✅ | Get my tasks | ❌ |
| GET | `/tasks/paginate` | ✅ | Paginated tasks | ❌ |
| GET | `/tasks/statistics` | ✅ | Get statistics | ❌ |
| GET | `/tasks/daily-progress` | ✅ | Daily progress | ❌ |
| GET | `/tasks/:id` | ✅ | Get task by ID | ❌ |
| PUT | `/tasks/:id` | ✅ | Update task | ✅ Broadcast |
| PUT | `/tasks/:id/status` | ✅ | Update status | ✅ Broadcast |
| DELETE | `/tasks/:id` | ✅ | Delete task | ✅ Broadcast |

### SubTask Management (6 endpoints)

| Method | Endpoint | Auth | Description | Real-Time |
|--------|----------|------|-------------|-----------|
| POST | `/subtasks/` | ✅ | Create subtask | ✅ Broadcast |
| GET | `/subtasks/task/:taskId` | ✅ | Get subtasks | ❌ |
| GET | `/subtasks/:id` | ✅ | Get subtask by ID | ❌ |
| PUT | `/subtasks/:id` | ✅ | Update subtask | ✅ Broadcast |
| PUT | `/subtasks/:id/toggle-status` | ✅ | Toggle status | ✅ Broadcast |
| DELETE | `/subtasks/:id` | ✅ | Delete subtask | ✅ Broadcast |

**Total**: 15 endpoints

---

## 🔗 External Dependencies (v2.0)

### Internal Modules

- ✅ **user.module** - User data source
- ✅ **childrenBusinessUser.module** - Family relationships
- ✅ **taskProgress.module** - Per-child progress tracking
- ✅ **notification.module** - Activity feed integration
- ✅ **Socket.IO service** - Real-time broadcasting ⭐ NEW!

### External Services

- ✅ **MongoDB** - Primary database
- ✅ **Redis** - Caching layer
- ✅ **Socket.IO** - Real-time layer ⭐ NEW!

---

## 🧪 Testing Strategy (v2.0)

### Unit Tests

```typescript
describe('TaskService', () => {
  describe('createTask', () => {
    it('should create task successfully', async () => {
      // Test successful creation
    });

    it('should broadcast via Socket.IO', async () => {
      // Test real-time broadcast
    });

    it('should enforce daily limit', async () => {
      // Test limit enforcement
    });
  });

  describe('broadcastTaskUpdate', () => {
    it('should broadcast to family room', async () => {
      // Test family broadcasting
    });

    it('should invalidate caches', async () => {
      // Test cache invalidation
    });
  });
});
```

### Integration Tests

```typescript
describe('Task API (v2.0)', () => {
  describe('POST /tasks/', () => {
    it('should return 201 with task data', async () => {
      // Test endpoint
    });

    it('should broadcast via Socket.IO', async () => {
      // Test real-time broadcast
    });
  });

  describe('PUT /tasks/:id/status', () => {
    it('should broadcast status change', async () => {
      // Test real-time broadcast
    });
  });
});
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)

- [ ] Task templates
- [ ] Recurring tasks
- [ ] Task dependencies
- [ ] Advanced task search
- [ ] Real-time collaboration editing

### Phase 3 (Future)

- [ ] AI-powered task suggestions
- [ ] Smart task scheduling
- [ ] Task priority auto-adjustment
- [ ] Cross-task analytics

---

## 📝 Related Documentation (v2.0)

- [API Documentation](./API_DOCUMENTATION.md)
- [Performance Report](./perf/task-module-performance-report.md)
- [Diagrams (v2.0)](./dia/) ⭐ UPDATED
- [System Guide](./TASK_MODULE_SYSTEM_GUIDE-v2.md) ⭐ NEW!
- [Socket.IO Integration](../../helpers/socket/SOCKET_IO_INTEGRATION.md) ⭐ NEW!
- [TaskProgress Module](../taskProgress.module/doc/) ⭐ NEW!

---

**Document Generated**: 08-03-26  
**Updated**: 12-03-26 (v2.0)  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready (v2.0)
