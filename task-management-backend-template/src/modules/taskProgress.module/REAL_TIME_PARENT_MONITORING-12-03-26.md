# Real-Time Parent Task Monitoring - Complete Guide

**Date**: 12-03-26  
**Status**: ✅ Complete  
**Version**: 1.0.0  

---

## 🎯 Overview

Complete real-time task monitoring system where **parents receive instant updates** when their children:
- ✅ Start a task
- ✅ Complete a subtask
- ✅ Complete a task
- ✅ Make progress on collaborative tasks

**Figma Reference**: `dashboard-flow-01.png` (Task Monitoring section)

---

## 🏗️ Architecture

### Components

```
Child Action (Flutter App)
    ↓
taskProgress.service.ts
    ├─→ Update progress in DB
    ├─→ Emit Socket.IO event to parent
    └─→ Broadcast to family room (Live Activity)
    ↓
Parent Dashboard (Real-Time Update)
```

### Socket.IO Events

| Event | Trigger | Recipient |
|-------|---------|-----------|
| `task-progress:started` | Child starts task | Parent |
| `task-progress:subtask-completed` | Child completes subtask | Parent |
| `task-progress:completed` | Child completes task | Parent |
| `group:activity` | Any family activity | All family members |

---

## 📡 Socket Events Reference

### Parent Listens For

```typescript
// 1. Child started task
socket.on('task-progress:started', (data) => {
  // data = {
  //   taskId: '...',
  //   taskTitle: 'Clean Room',
  //   childId: 'child123',
  //   childName: 'John',
  //   status: 'inProgress',
  //   timestamp: new Date(),
  //   message: 'John started working on "Clean Room"'
  // }
  
  updateTaskProgress(data);
});

// 2. Child completed subtask
socket.on('task-progress:subtask-completed', (data) => {
  // data = {
  //   taskId: '...',
  //   taskTitle: 'Clean Room',
  //   subtaskIndex: 0,
  //   subtaskTitle: 'Pick up toys',
  //   childId: 'child123',
  //   childName: 'John',
  //   progressPercentage: 33.33,
  //   message: 'John completed "Pick up toys" (33.33% done)'
  // }
  
  updateSubtaskProgress(data);
});

// 3. Child completed task
socket.on('task-progress:completed', (data) => {
  // data = {
  //   taskId: '...',
  //   taskTitle: 'Clean Room',
  //   childId: 'child123',
  //   childName: 'John',
  //   status: 'completed',
  //   timestamp: new Date(),
  //   message: 'John completed "Clean Room"'
  // }
  
  markTaskComplete(data);
});

// 4. Family activity (Live Activity Feed)
socket.on('group:activity', (activity) => {
  // activity = {
  //   type: 'task_completed' | 'task_started',
  //   actor: { userId, name, profileImage },
  //   task: { taskId, title },
  //   timestamp: new Date()
  // }
  
  addToLiveActivityFeed(activity);
});
```

---

## 🔧 Backend Implementation

### 1. Child Starts Task

**Endpoint**: `PUT /task-progress/:taskId/status`

**Request**:
```json
{
  "userId": "child123",
  "status": "inProgress"
}
```

**Backend** (`taskProgress.service.ts`):
```typescript
async updateProgressStatus(taskId, userId, status) {
  const progress = await TaskProgress.findOneAndUpdate(
    { taskId, userId },
    { status, startedAt: new Date() }
  );

  // Emit to parent
  await this.emitProgressUpdateToParent(
    taskId, userId, status, oldStatus
  );
}
```

**Socket.IO Emission**:
```typescript
await socketService.emitToTaskUsers([parentId], 'task-progress:started', {
  taskId,
  taskTitle: task.title,
  childId: userId,
  childName: child.name,
  status: 'inProgress',
  timestamp: new Date(),
  message: `${child.name} started working on "${task.title}"`
});
```

---

### 2. Child Completes Subtask

**Endpoint**: `PUT /task-progress/:taskId/subtasks/:subtaskIndex/complete`

**Request**:
```json
{
  "userId": "child123"
}
```

**Backend**:
```typescript
async completeSubtask(taskId, subtaskIndex, userId) {
  const progress = await TaskProgress.findOne({ taskId, userId });
  
  progress.completedSubtaskIndexes.push(subtaskIndex);
  progress.updateProgressPercentage(totalSubtasks);
  
  await progress.save();
  
  // Emit to parent
  await this.emitSubtaskCompletionToParent(
    taskId, userId, subtaskIndex, progress.progressPercentage
  );
}
```

**Socket.IO Emission**:
```typescript
await socketService.emitToTaskUsers([parentId], 'task-progress:subtask-completed', {
  taskId,
  taskTitle: task.title,
  subtaskIndex,
  subtaskTitle: task.subtasks[subtaskIndex].title,
  childId: userId,
  childName: child.name,
  progressPercentage: 33.33,
  message: `${child.name} completed "${subtaskTitle}" (${progressPercentage}% done)`
});
```

---

### 3. Child Completes Task

**Endpoint**: `PUT /task-progress/:taskId/status`

**Request**:
```json
{
  "userId": "child123",
  "status": "completed"
}
```

**Backend**:
```typescript
async updateProgressStatus(taskId, userId, 'completed') {
  const progress = await TaskProgress.findOneAndUpdate(
    { taskId, userId },
    { status: 'completed', completedAt: new Date() }
  );
  
  // Send notification
  await this.notifyParentOnTaskCompletion(taskId, userId);
  
  // Emit to parent
  await this.emitProgressUpdateToParent(taskId, userId, 'completed', oldStatus);
  
  // Broadcast to family room
  await socketService.broadcastGroupActivity(parentId, {
    type: 'task_completed',
    actor: { userId, name: child.name },
    task: { taskId, title: task.title },
    timestamp: new Date()
  });
}
```

---

## 🎯 Complete Flow Example

### Scenario: Parent Creates Collaborative Task

**Step 1**: Parent creates task for 2 children

```typescript
POST /tasks
{
  "taskType": "collaborative",
  "title": "Clean the house",
  "assignedUserIds": ["child1", "child2"],
  "subtasks": [
    { "title": "Living room" },
    { "title": "Kitchen" },
    { "title": "Bedrooms" }
  ]
}
```

**Result**:
- Task created
- TaskProgress records auto-created for both children
- Parent dashboard shows task with 0% progress

---

**Step 2**: Child1 starts task

```typescript
PUT /task-progress/:taskId/status
{
  "userId": "child1",
  "status": "inProgress"
}
```

**Parent receives** (real-time):
```typescript
socket.on('task-progress:started', {
  taskId: 'task123',
  taskTitle: 'Clean the house',
  childId: 'child1',
  childName: 'John',
  message: 'John started working on "Clean the house"'
});
```

**Dashboard updates**:
- Child1 status: NOT_STARTED → IN_PROGRESS
- Progress bar shows: Child1: 0% (started)

---

**Step 3**: Child1 completes subtask 1 (Living room)

```typescript
PUT /task-progress/:taskId/subtasks/0/complete
{
  "userId": "child1"
}
```

**Parent receives**:
```typescript
socket.on('task-progress:subtask-completed', {
  taskId: 'task123',
  subtaskTitle: 'Living room',
  childName: 'John',
  progressPercentage: 33.33,
  message: 'John completed "Living room" (33.33% done)'
});
```

**Dashboard updates**:
- Child1 progress: 0% → 33.33%
- Subtask 1 checked ✅
- Live Activity Feed: "John completed Living room"

---

**Step 4**: Child1 completes all subtasks

```typescript
PUT /task-progress/:taskId/subtasks/2/complete
{
  "userId": "child1"
}
```

**Parent receives**:
```typescript
// 1. Subtask completion
socket.on('task-progress:subtask-completed', {
  progressPercentage: 100,
  message: 'John completed "Bedrooms" (100% done)'
});

// 2. Task completion (few ms later)
socket.on('task-progress:completed', {
  childName: 'John',
  taskTitle: 'Clean the house',
  message: 'John completed "Clean the house"'
});

// 3. Family activity broadcast
socket.on('group:activity', {
  type: 'task_completed',
  actor: { name: 'John' },
  task: { title: 'Clean the house' }
});
```

**Dashboard updates**:
- Child1 status: IN_PROGRESS → COMPLETED ✅
- Task progress: 33% → 50% (1 of 2 children completed)
- Live Activity Feed: "John completed Clean the house"
- Notification toast: "🎉 John completed the task!"

---

**Step 5**: Child2 starts and completes (similar flow)

**Final State**:
- Both children: COMPLETED ✅
- Task progress: 100%
- Completion rate: 100%

---

## 📊 Parent Dashboard UI Updates

### Real-Time Sections to Update

#### 1. Task Monitoring Overview

```typescript
// Before
{
  taskTitle: 'Clean the house',
  childrenProgress: [
    { name: 'John', status: 'notStarted', progress: 0% },
    { name: 'Jane', status: 'notStarted', progress: 0% }
  ],
  summary: { completed: 0, inProgress: 0, notStarted: 2 }
}

// After Child1 starts
{
  taskTitle: 'Clean the house',
  childrenProgress: [
    { name: 'John', status: 'inProgress', progress: 0% },
    { name: 'Jane', status: 'notStarted', progress: 0% }
  ],
  summary: { completed: 0, inProgress: 1, notStarted: 1 }
}
```

---

#### 2. Live Activity Feed

```typescript
// Figma: dashboard-flow-01.png (Live Activity section)

// Activity stream:
[
  {
    type: 'task_started',
    actor: { name: 'John' },
    task: { title: 'Clean the house' },
    timestamp: '10:30 AM',
    message: 'John started working on "Clean the house"'
  },
  {
    type: 'subtask_completed',
    actor: { name: 'John' },
    task: { title: 'Clean the house' },
    subtask: 'Living room',
    timestamp: '10:35 AM',
    message: 'John completed "Living room"'
  },
  {
    type: 'task_completed',
    actor: { name: 'John' },
    task: { title: 'Clean the house' },
    timestamp: '11:00 AM',
    message: 'John completed "Clean the house"'
  }
]
```

---

#### 3. Task Details View

```typescript
// Shows individual child progress

Child 1: John
├─ Status: COMPLETED ✅
├─ Progress: 100%
├─ Started: 10:30 AM
├─ Completed: 11:00 AM
└─ Subtasks:
    ├─ ✅ Living room (10:35 AM)
    ├─ ✅ Kitchen (10:50 AM)
    └─ ✅ Bedrooms (11:00 AM)

Child 2: Jane
├─ Status: IN_PROGRESS ⏳
├─ Progress: 66%
├─ Started: 11:00 AM
└─ Subtasks:
    ├─ ✅ Living room (11:05 AM)
    ├─ ✅ Kitchen (11:15 AM)
    └─ ⬜ Bedrooms (pending)
```

---

## 🧪 Testing Guide

### Backend Testing

```typescript
// 1. Test progress update emission
describe('TaskProgress Socket.IO Integration', () => {
  it('should emit task-progress:started to parent', async () => {
    const mockSocketService = jest.spyOn(socketService, 'emitToTaskUsers');
    
    await taskProgressService.updateProgressStatus(
      taskId,
      childId,
      TaskProgressStatus.IN_PROGRESS
    );
    
    expect(mockSocketService).toHaveBeenCalledWith(
      [parentId],
      'task-progress:started',
      expect.objectContaining({
        taskId,
        childId,
        status: 'inProgress'
      })
    );
  });
  
  it('should broadcast to family room on task completion', async () => {
    const mockBroadcast = jest.spyOn(socketService, 'broadcastGroupActivity');
    
    await taskProgressService.updateProgressStatus(
      taskId,
      childId,
      TaskProgressStatus.COMPLETED
    );
    
    expect(mockBroadcast).toHaveBeenCalledWith(
      parentId,
      expect.objectContaining({
        type: 'task_completed'
      })
    );
  });
});
```

---

### Frontend Testing (Manual)

**Setup**:
1. Parent logged in on dashboard
2. Child logged in on mobile app
3. Both connected to Socket.IO

**Test Cases**:

1. **Child starts task**
   - ✅ Parent dashboard updates in real-time
   - ✅ Live Activity Feed shows update
   - ✅ No notification (only status change)

2. **Child completes subtask**
   - ✅ Parent dashboard shows subtask checked
   - ✅ Progress percentage updates
   - ✅ Live Activity Feed shows subtask completion

3. **Child completes task**
   - ✅ Parent dashboard marks task complete
   - ✅ Notification toast appears
   - ✅ Live Activity Feed shows completion
   - ✅ Family room broadcast received

---

## 📝 Files Modified

1. ✅ `src/modules/taskProgress.module/taskProgress.service.ts`
   - Added Socket.IO integration
   - Added `emitProgressUpdateToParent()` method
   - Added `emitSubtaskCompletionToParent()` method

2. ✅ `src/helpers/socket/socketForChatV3.ts`
   - Auto-join family room on connection
   - Family-based broadcasting

3. ✅ `src/modules/task.module/task/task.service.ts`
   - Task creation broadcasting
   - Task status change broadcasting

---

## 🎯 Summary

**What Parent Receives in Real-Time**:

| Child Action | Socket Event | Dashboard Update |
|--------------|--------------|------------------|
| Starts task | `task-progress:started` | Status: NOT_STARTED → IN_PROGRESS |
| Completes subtask | `task-progress:subtask-completed` | Subtask ✅, Progress % updated |
| Completes task | `task-progress:completed` | Status: IN_PROGRESS → COMPLETED ✅ |
| Any activity | `group:activity` | Live Activity Feed updated |

**Benefits**:
- ✅ Real-time visibility into child's progress
- ✅ No page refresh needed
- ✅ Live Activity Feed keeps parent informed
- ✅ Notifications for important milestones
- ✅ Family-wide awareness for collaborative tasks

---

**Last Updated**: 12-03-26  
**Status**: ✅ Production Ready  
**Figma Aligned**: ✅ dashboard-flow-01.png
