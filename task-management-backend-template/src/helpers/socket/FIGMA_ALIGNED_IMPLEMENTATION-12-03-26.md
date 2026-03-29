# Socket.IO Integration - Figma-Aligned Implementation

**Date**: 12-03-26  
**Status**: ✅ Complete (Refactored)  
**Version**: 2.1.0  

---

## 🎯 Key Refinement

**Previous Approach**: Generic "group" concept with manual join/leave  
**Current Approach**: Family-based rooms auto-joined via `childrenBusinessUser` relationship  

**Why**: After reviewing Figma flows, we confirmed:
- ✅ No explicit "group" membership management
- ✅ Collaborative tasks created by **selecting specific members** (3-4 people)
- ✅ Family structure defined via `childrenBusinessUser.module` (parent → children)
- ✅ Live Activity Feed shows family member activities (dashboard-flow-01.png)

---

## ✅ What Was Changed

### Removed Features
❌ `join-group` event (no manual join needed)  
❌ `leave-group` event (no manual leave needed)  
❌ Generic group room management  

### Added Features
✅ **Auto-join family room** on connection  
✅ **`get-family-activity-feed`** event for Live Activity section  
✅ **Family-based room assignment** via `childrenBusinessUser` lookup  

---

## 🏗️ Updated Architecture

### Room Assignment Logic

```typescript
User Connects
    ↓
Check childrenBusinessUser relationship
    ↓
    ├─→ Is Child? → Join parent's family room
    │   (childUserId matches)
    │
    └─→ Is Business User? → Join own family room
        (parentBusinessUserId matches)
```

### Example Flow

```typescript
// Child user connects
socket.on('connect', () => {
  // Auto-joined to parent's family room
  // Can now receive family activities
});

// Parent user connects  
socket.on('connect', () => {
  // Auto-joined to their own family room
  // Can broadcast activities to all family members
});
```

---

## 📡 Updated Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-task` | `{taskId}` | Join task room |
| `leave-task` | `{taskId}` | Leave task room |
| `get-family-activity-feed` | `{businessUserId, limit?}` | Get family activities |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `task:created` | `TaskData` | New task created |
| `task:status-changed` | `{taskId, oldStatus, newStatus}` | Status changed |
| `group:activity` | `ActivityData` | Family activity (broadcast to all members) |

---

## 🔧 How It Works

### 1. Auto-Join Family Room

**File**: `src/helpers/socket/socketForChatV3.ts`

```typescript
private async autoJoinFamilyRoom(socket: Socket, userId: string, userProfile: IUserProfile): Promise<void> {
  // Check if user is a child
  const childRelationship = await ChildrenBusinessUser.findOne({
    childUserId: userId,
    status: 'active',
  });

  if (childRelationship) {
    // Child → join parent's room
    familyRoomId = childRelationship.parentBusinessUserId.toString();
  } else {
    // Check if user is a business user
    const parentRelationship = await ChildrenBusinessUser.findOne({
      parentBusinessUserId: userId,
      status: 'active',
    });

    if (parentRelationship) {
      // Business user → join own room
      familyRoomId = userId;
    }
  }

  // Auto-join family room
  if (familyRoomId) {
    socket.join(familyRoomId);
  }
}
```

---

### 2. Get Family Activity Feed

**Figma**: `dashboard-flow-01.png` (Live Activity section)

**Client**:
```typescript
socket.emit('get-family-activity-feed', {
  businessUserId: 'parent-id',
  limit: 10
}, (response) => {
  displayActivities(response.data);
});
```

**Server**:
```typescript
socket.on('get-family-activity-feed', async (groupData, callback) => {
  const activities = await this.redisStateManager.getActivityFeed(
    groupData.businessUserId,
    groupData.limit || 10
  );
  callback?.({ success: true, data: activities });
});
```

---

### 3. Broadcast Family Activity

**When**: Task created, completed, or other family events

```typescript
// In task.service.ts
await socketService.broadcastGroupActivity(businessUserId, {
  type: 'task_completed',
  actor: {
    userId: childUserId,
    name: 'John Doe',
  },
  task: {
    taskId: 'task-123',
    title: 'Math Homework',
  },
  timestamp: new Date(),
});

// All family members receive:
socket.on('group:activity', (activity) => {
  // Add to Live Activity feed UI
  addActivity(activity);
});
```

---

## 🎯 Use Case: Collaborative Task Creation

### Figma Flow
1. Parent selects 3-4 family members
2. Creates collaborative task
3. Task assigned to selected members
4. All family members see activity in Live Feed

### Implementation

```typescript
// Backend: Create collaborative task
async createCollaborativeTask(
  businessUserId: string,
  selectedMemberIds: string[],
  taskData: any
) {
  const task = await Task.create({
    ...taskData,
    taskType: 'collaborative',
    assignedUserIds: selectedMemberIds,
    groupId: businessUserId, // Family group
  });

  // 1. Emit to task room (assigned members only)
  await socketService.emitToTask(task._id.toString(), 'task:created', {
    taskId: task._id.toString(),
    assignedUserIds: selectedMemberIds,
  });

  // 2. Broadcast to family room (ALL family members)
  await socketService.broadcastGroupActivity(businessUserId, {
    type: 'task_created',
    actor: { userId: businessUserId, name: 'Parent' },
    task: { taskId: task._id.toString(), title: task.title },
    timestamp: new Date(),
  });
}
```

---

## 📊 Family Room vs Task Room

| Feature | Family Room | Task Room |
|---------|-------------|-----------|
| **Join Method** | Auto-joined on connect | Manual `join-task` |
| **Membership** | Based on `childrenBusinessUser` | Based on task assignment |
| **Purpose** | Family-wide activities | Specific task collaboration |
| **Leave Method** | Auto-leave on disconnect | Manual `leave-task` |
| **Broadcast To** | All family members | Task assignees only |

---

## 🧪 Testing Scenarios

### Scenario 1: Child Connects

```typescript
// Child logs in
const socket = io({ auth: { token: childToken } });

// Automatically joined to parent's family room
socket.on('connect', () => {
  // Can receive family activities
  socket.on('group:activity', (activity) => {
    console.log('Family activity:', activity);
  });
});
```

### Scenario 2: Parent Creates Task

```typescript
// Parent creates task for 2 children
await createCollaborativeTask(parentId, [child1Id, child2Id], taskData);

// Result:
// - Task room created with child1, child2
// - Family broadcast sent to ALL family members
// - Assigned children get task-specific update
// - Other family members see activity in Live Feed
```

### Scenario 3: Live Activity Feed

```typescript
// Parent dashboard: Live Activity section
socket.emit('get-family-activity-feed', {
  businessUserId: parentId,
  limit: 10
}, (response) => {
  // Display in dashboard-flow-01.png
  response.data.forEach(activity => {
    addActivityToUI(activity);
  });
});
```

---

## 📝 Files Modified (Refactored)

1. ✅ `src/helpers/socket/socketForChatV3.ts`
   - Removed: `join-group`, `leave-group` events
   - Added: `get-family-activity-feed` event
   - Added: `autoJoinFamilyRoom()` method
   - Updated: Connection handler with auto-join logic

2. ✅ `src/helpers/socket/SOCKET_IO_INTEGRATION.md`
   - Updated: Event reference (removed join/leave group)
   - Updated: Usage examples (family-based)
   - Updated: Room strategy section

3. ✅ `src/helpers/socket/IMPLEMENTATION_SUMMARY-12-03-26.md`
   - Created: This refined summary

---

## 🎯 Alignment with Figma

| Figma Screen | Feature | Implementation |
|--------------|---------|----------------|
| `dashboard-flow-01.png` | Live Activity | ✅ `get-family-activity-feed` + auto-join |
| `team-members/` | Family members | ✅ `childrenBusinessUser` relationship |
| `add-task-flow-for-permission-account-interface.png` | Create task | ✅ Task room + family broadcast |
| `edit-update-task-flow.png` | Update task | ✅ `task:status-changed` event |

---

## ✅ Summary

**What Changed**:
- ❌ Removed generic "group" concept
- ✅ Added family-based auto-join rooms
- ✅ Aligned with `childrenBusinessUser` module
- ✅ Matched Figma flows exactly

**Impact**:
- Simpler UX (no manual join/leave)
- Matches actual family structure
- Live Activity feed works automatically
- Collaborative tasks properly scoped

**Status**: ✅ **Production Ready & Figma-Aligned**

---

**Last Updated**: 12-03-26  
**Author**: Senior Engineering Team
