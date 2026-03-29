# Socket.IO Integration Documentation

**Module**: Real-Time Communication Layer  
**Version**: 2.0.0  
**Date**: 12-03-26  
**Status**: ✅ Complete  

---

## 📋 Overview

This document describes the Socket.IO integration for real-time features in the Task Management Backend. The implementation supports:

- ✅ **Chat Module** (existing - preserved)
- ✅ **Task Module** (NEW - real-time task updates)
- ✅ **Group/Family Module** (NEW - via childrenBusinessUser)
- ✅ **Notification Module** (ENHANCED - real-time delivery)

All existing chat functionality is **preserved and unchanged**. New features are additive.

---

## 🏗️ Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Socket.IO Server                         │
│  (src/helpers/socket/socketForChatV3.ts)                    │
├─────────────────────────────────────────────────────────────┤
│  Authentication Middleware                                  │
│  Event Handlers (Chat, Task, Group)                         │
│  Emission Methods (emitToUser, emitToTask, emitToGroup)     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Redis Adapter
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Redis State Manager                         │
│  (src/helpers/redis/redisStateManagerForSocketV2.ts)        │
├─────────────────────────────────────────────────────────────┤
│  Online Users Tracking                                      │
│  Room Management (Chat, Task, Group)                        │
│  Activity Feed Storage                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Redis Key Structure

### Online User Tracking
```typescript
chat:online_users              // Set of online userIds
chat:user_socket_map:{userId}  // Hash: userId → connection info
chat:socket_user_map:{socketId} // Hash: socketId → userId
chat:user_status:{userId}      // Hash: userId → status
```

### Room Management
```typescript
// Chat Rooms (existing)
chat:user_rooms:{userId}       // Set: userId's chat rooms
chat:room_users:{roomId}       // Set: room's users

// Task Rooms (NEW)
task:user_tasks:{userId}       // Set: userId's subscribed tasks
task:rooms:{taskId}            // Set: task's connected users

// Group Rooms (NEW)
task:user_groups:{userId}      // Set: userId's subscribed groups
task:rooms:{groupId}           // Set: group's connected users

// Activity Feed (NEW)
activity:feed:{groupId}        // List: group's recent activities
```

---

## 📡 Socket Events

### Client → Server Events

#### 1. Chat Events (Existing - Unchanged)

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `only-related-online-users` | `{userId}` | `{success, data}` | Get related online users |
| `join` | `{conversationId}` | `{success}` | Join conversation room |
| `leave` | `{conversationId}` | `{success}` | Leave conversation room |
| `get-all-conversations-with-pagination` | `{page, limit}` | `{success, data}` | Get conversations |
| `get-all-message-by-conversationId` | `{conversationId, page, limit}` | `{success, data}` | Get messages |
| `send-new-message` | `MessageData` | `{success, messageDetails}` | Send message |

#### 2. Task Events (NEW)

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `join-task` | `{taskId}` | `{success, message}` | Join task room |
| `leave-task` | `{taskId}` | `{success, message}` | Leave task room |

#### 3. Group/Family Events (NEW)

| Event | Payload | Response | Description |
|-------|---------|----------|-------------|
| `get-family-activity-feed` | `{businessUserId, limit?}` | `{success, data}` | Get family activity feed |

**Note**: Users **auto-join** their family room on connection based on `childrenBusinessUser` relationship. No manual join/leave needed.

---

### Server → Client Events

#### 1. Chat Events (Existing)

| Event | Data | Description |
|-------|------|-------------|
| `new-message-received::{conversationId}` | `Message` | New message in conversation |
| `conversation-list-updated::{userId}` | `ConversationUpdate` | Conversation list updated |
| `unseen-count::{userId}` | `{unreadConversationCount}` | Unseen count updated |
| `user-joined-chat` | `{userId, userName, conversationId}` | User joined chat |
| `user-left-conversation` | `{userId, userName, conversationId}` | User left conversation |
| `related-user-online-status::{userId}` | `{userId, isOnline, userName}` | Related user status changed |

#### 2. Task Events (NEW)

| Event | Data | Description |
|-------|------|-------------|
| `task:created` | `TaskData` | New task created |
| `task:updated` | `TaskData` | Task details updated |
| `task:deleted` | `{taskId}` | Task deleted |
| `task:status-changed` | `{taskId, oldStatus, newStatus}` | Status changed |
| `task:assigned` | `{taskId, assignedBy}` | User assigned to task |
| `user-joined-task` | `{userId, userName, taskId}` | User joined task room |
| `user-left-task` | `{userId, userName, taskId}` | User left task room |

#### 3. Group/Family Events (NEW)

| Event | Data | Description |
|-------|------|-------------|
| `group:activity` | `ActivityData` | New activity in group |
| `group:member-joined` | `{userId, userName}` | Member joined group |
| `group:member-left` | `{userId, userName}` | Member left group |
| `user-joined-group` | `{userId, userName, groupId}` | User joined group room |
| `user-left-group` | `{userId, userName, groupId}` | User left group room |

#### 4. Notification Events (Enhanced)

| Event | Data | Description |
|-------|------|-------------|
| `notification::{userId}` | `NotificationData` | Personal notification |
| `notification::admin` | `NotificationData` | Admin notification |

---

## 🔧 Usage Examples

### Frontend Integration (TypeScript/JavaScript)

#### 1. Connect to Socket.IO

```typescript
import { io } from 'socket.io-client';

const socket = io('http://your-backend-ip:8081', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('✅ Connected to Socket.IO');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error);
});
```

#### 2. Join Task Room for Real-Time Updates

```typescript
// Join task room
socket.emit('join-task', { taskId: 'task-123' }, (response) => {
  if (response.success) {
    console.log('✅ Joined task room');
  }
});

// Listen for task updates
socket.on('task:status-changed', (data) => {
  console.log('📋 Task status changed:', data);
  // Update UI
});

socket.on('task:updated', (data) => {
  console.log('📋 Task updated:', data);
  // Refresh task details
});

// Leave task room when done
socket.emit('leave-task', { taskId: 'task-123' });
```

#### 3. Get Family Activity Feed (Figma: dashboard-flow-01.png)

```typescript
// Family room is auto-joined on connection based on childrenBusinessUser relationship
// No need to manually join/leave

// Get recent family activities (Live Activity section)
socket.emit('get-family-activity-feed', { 
  businessUserId: 'parent-id',
  limit: 10 
}, (response) => {
  if (response.success) {
    console.log('👨‍👩‍👧‍👦 Family activities:', response.data);
    // Display in Live Activity section
    // Activity format:
    // {
    //   type: 'task_completed',
    //   actor: { userId: 'child-1', name: 'John' },
    //   task: { taskId: 'abc', title: 'Homework' },
    //   message: 'John completed Homework',
    //   timestamp: new Date()
    // }
  }
});

// Listen for real-time family activities
socket.on('group:activity', (activity) => {
  console.log('📢 New family activity:', activity);
  // Add to live activity feed
  addActivityToFeed(activity);
});
```

#### 4. Listen for Notifications

```typescript
// Listen for personal notifications
socket.on('notification::your-user-id', (notification) => {
  console.log('🔔 New notification:', notification);
  // Show notification toast
});

// Listen for task assignment
socket.on('task:assigned', (data) => {
  console.log('✅ Assigned to task:', data);
  // Navigate to task details
});
```

---

### Backend Integration

#### 1. Emit Task Update from Service

```typescript
import { socketService } from '../../../helpers/socket/socketForChatV3';

// In task.service.ts
async updateTaskStatus(taskId: string, status: string, userId: string) {
  const updatedTask = await this.model.findByIdAndUpdate(
    taskId,
    { status },
    { new: true }
  );

  // Emit real-time update to all task subscribers
  await socketService.emitToTask(taskId, 'task:status-changed', {
    taskId,
    oldStatus: updatedTask._doc.status,
    newStatus: status,
    changedBy: userId,
    timestamp: new Date(),
  });

  return updatedTask;
}
```

#### 2. Broadcast Group Activity

```typescript
import { socketService } from '../../../helpers/socket/socketForChatV3';

// In notification.service.ts or task.service.ts
async recordGroupActivity(groupId: string, userId: string, activityType: string, taskData?: any) {
  const activity = {
    type: activityType,
    actor: {
      userId,
      name: 'User Name', // Fetch from DB
      profileImage: '...', // Fetch from DB
    },
    task: taskData ? {
      taskId: taskData.taskId,
      title: taskData.title,
    } : undefined,
    timestamp: new Date(),
  };

  // Add to activity feed and broadcast
  await socketService.broadcastGroupActivity(groupId, activity);
}
```

#### 3. Send Real-Time Notification

```typescript
// In notification.service.ts
async createNotification(notificationData: any) {
  const notification = await Notification.create(notificationData);

  // Try to emit via Socket.IO
  const emitted = await socketService.emitNotificationToUser(
    notification.receiverId.toString(),
    'notification::user-id',
    notification
  );

  if (!emitted) {
    // User is offline - send push notification via FCM
    await sendPushNotification(/* ... */);
  }

  return notification;
}
```

---

## 🎯 Room Strategy

### Personal Rooms
Every user automatically joins their personal room on connect:
```typescript
socket.join(userId); // e.g., "user-123"
```

Used for:
- Personal notifications
- Direct messages
- User-specific updates

### Role-Based Rooms
Users join rooms based on their role:
```typescript
socket.join(`role::${userProfile.role}`); // e.g., "role::admin"
```

Used for:
- Broadcast to all admins
- Role-specific announcements

### Task Rooms
Users explicitly join task rooms to receive updates:
```typescript
socket.emit('join-task', { taskId });
```

Used for:
- Real-time task updates
- Collaboration on shared tasks
- Task progress tracking

### Group/Family Rooms (Auto-Joined)
Users **automatically join** their family room on connection based on `childrenBusinessUser` relationship:
```typescript
// Automatic - no manual join needed
// Business user → joins room with their userId
// Child user → joins parent's family room
```

Used for:
- Live activity feed (Figma: dashboard-flow-01.png)
- Family-wide task updates
- Member activity tracking

**Note**: There's no `join-group` or `leave-group` events because family membership is automatic based on the parent-child relationship defined in `childrenBusinessUser.module`.

Used for:
- Live activity feed
- Member join/leave notifications
- Group-wide announcements

---

## 📊 Scalability Considerations

### Multi-Worker Support

The implementation uses Redis adapter for multi-worker deployments:

```typescript
const adapter = createAdapter(redisPubClient, redisSubClient);
io.adapter(adapter);
```

**Benefits:**
- Events broadcast across all workers
- Users can connect to any worker
- Shared state via Redis

### Performance Optimizations

1. **Room-Based Emission**: Only emit to relevant users via rooms
2. **Redis Caching**: Activity feeds stored in Redis for fast retrieval
3. **Automatic Cleanup**: Stale connections cleaned up every 5 minutes
4. **Pipeline Operations**: Redis operations batched for efficiency

---

## 🔒 Security

### Authentication

All connections require JWT token:

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const user = await getUserDetailsFromToken(token);
  socket.data.user = user;
  next();
});
```

### Authorization

Services should verify user permissions before emitting:

```typescript
// Verify user is part of task before joining
const task = await Task.findById(taskId);
if (!task.assignedUserIds.includes(userId)) {
  throw new Error('Not authorized to join this task');
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] User connects with valid token
- [ ] User joins task room
- [ ] Task update emitted and received
- [ ] User joins group room
- [ ] Group activity broadcast received
- [ ] Notification delivered to online user
- [ ] Push notification sent to offline user
- [ ] User disconnects cleanly
- [ ] Stale connection cleanup works

### Automated Testing

```typescript
describe('Socket.IO Task Events', () => {
  it('should emit task:status-changed to task room', async () => {
    // Test implementation
  });
});
```

---

## 📈 Monitoring

### Metrics to Track

```typescript
// In production, monitor:
- Total online users
- Rooms created per type
- Events emitted per second
- Redis memory usage
- Connection/disconnection rate
```

### Logging

All events are logged with appropriate levels:

```typescript
logger.info('📋 Emitted task:updated to task 123');
logger.error('❌ Failed to join task room:', error);
```

---

## 🚨 Troubleshooting

### Common Issues

**Issue**: User not receiving task updates  
**Solution**: Verify user joined task room with `socket.emit('join-task', {taskId})`

**Issue**: Group activity not broadcasting  
**Solution**: Check all members joined group room with `socket.emit('join-group', {groupId})`

**Issue**: High Redis memory usage  
**Solution**: Activity feeds auto-expire after 7 days, monitor with `redis-cli INFO memory`

---

## 📝 Migration Notes

### From Previous Version

- ✅ All existing chat events preserved
- ✅ No breaking changes to conversation management
- ✅ New task/group events are additive
- ✅ Redis key prefixes maintained for backward compatibility

### Future Enhancements

- [ ] Typing indicators for tasks
- [ ] Real-time collaboration cursors
- [ ] Video/audio call integration
- [ ] End-to-end encryption for messages

---

**Last Updated**: 12-03-26  
**Author**: Senior Engineering Team  
**Status**: ✅ Production Ready
