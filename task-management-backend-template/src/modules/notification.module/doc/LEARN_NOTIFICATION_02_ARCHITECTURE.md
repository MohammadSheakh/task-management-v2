# 🏗️ Chapter 2: Notification Architecture

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Intermediate
**Prerequisites**: Chapter 1 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ High-level system architecture
- ✅ Module folder structure
- ✅ Database schema design
- ✅ Redis caching layers
- ✅ BullMQ integration
- ✅ Integration with other modules

---

## 📊 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                                  │
│  Flutter App │ Parent Dashboard │ Child App │ Admin Panel      │
└─────────────────────────────────────────────────────────────────┘
                          ↓ HTTPS / WebSocket
┌─────────────────────────────────────────────────────────────────┐
│                    API GATEWAY                                   │
│  Load Balancer │ Rate Limiter │ Authentication │ CORS          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│               NOTIFICATION MODULE                                │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Routes     │→ │  Controllers │→ │   Services   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                          ↓                                      │
│  ┌──────────────────────────────────────────────────┐          │
│  │              Data Layer                           │          │
│  ├──────────────┬──────────────┬──────────────────┤          │
│  │   Redis      │   MongoDB    │   BullMQ         │          │
│  │   (Cache)    │   (Storage)  │   (Queue)        │          │
│  │   TTL: 30s   │   Persistent │   Scheduled      │          │
│  │   TTL: 60s   │   Indexed    │   Async          │          │
│  └──────────────┴──────────────┴──────────────────┘          │
│                          ↓                                      │
│  ┌──────────────────────────────────────────────────┐          │
│  │           External Services                       │          │
│  ├──────────────┬──────────────┬──────────────────┤          │
│  │   Email      │   FCM        │   Twilio         │          │
│  │   (SendGrid) │   (Push)     │   (SMS)          │          │
│  └──────────────┴──────────────┴──────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Module Folder Structure

```
notification.module/
│
├── doc/                                    # Documentation
│   ├── dia/                                # Mermaid diagrams
│   │   ├── notification-schema.mermaid
│   │   ├── notification-system-architecture.mermaid
│   │   ├── notification-sequence.mermaid
│   │   ├── notification-user-flow.mermaid
│   │   ├── notification-swimlane.mermaid
│   │   ├── notification-state-machine.mermaid
│   │   ├── notification-component-architecture.mermaid
│   │   └── notification-data-flow.mermaid
│   ├── README.md                           # Module overview
│   ├── API_DOCUMENTATION.md                # API reference
│   ├── NOTIFICATION_MODULE_SYSTEM_GUIDE-v2.md
│   ├── NOTIFICATION_MODULE_ARCHITECTURE-v2.md
│   ├── notification-member.md              # Schema members
│   ├── taskReminder-member.md              # Reminder members
│   ├── notification-roles-mapping.md       # Role permissions
│   └── perf/
│       └── notification-module-performance-report.md
│
├── notification/                           # Core notifications
│   ├── notification.interface.ts           # TypeScript interfaces
│   ├── notification.constant.ts            # Constants & enums
│   ├── notification.model.ts               # MongoDB schema
│   ├── notification.service.ts             # Business logic
│   ├── notification.controller.ts          # HTTP handlers
│   └── notification.route.ts               # API routes
│
└── taskReminder/                           # Task reminders
    ├── taskReminder.interface.ts           # TypeScript interfaces
    ├── taskReminder.constant.ts            # Constants & enums
    ├── taskReminder.model.ts               # MongoDB schema
    ├── taskReminder.service.ts             # Business logic
    ├── taskReminder.controller.ts          # HTTP handlers
    └── taskReminder.route.ts               # API routes
```

---

## 📊 Database Schema

### **Notification Collection**

```typescript
const notificationSchema = new Schema({
  // ─── Who sent it ───────────────────────────────────────
  senderId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,  // Optional for system notifications
  },

  // ─── Who receives it ───────────────────────────────────
  receiverId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false,  // Optional for broadcast (by role)
  },

  receiverRole: {
    type: String,
    required: false,  // For broadcast to all users with role
  },

  // ─── What it says ──────────────────────────────────────
  title: {
    type: Object,  // Supports i18n: { en: 'Title', es: 'Título' }
    required: true,
  },

  subTitle: {
    type: Object,  // Supports i18n
    required: false,
  },

  // ─── Type & Priority ───────────────────────────────────
  type: {
    type: String,
    enum: ['task', 'group', 'system', 'reminder', 'mention', 'assignment', 'deadline'],
    required: true,
  },

  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },

  // ─── How to deliver ────────────────────────────────────
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    default: ['in_app'],
  }],

  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
  },

  // ─── Navigation ────────────────────────────────────────
  linkFor: {
    type: String,  // e.g., 'task', 'group', 'profile'
    required: false,
  },

  linkId: {
    type: Schema.Types.ObjectId,
    required: false,
  },

  // ─── Reference Tracking ────────────────────────────────
  referenceFor: {
    type: String,  // What this notification references
  },

  referenceId: {
    type: Schema.Types.ObjectId,
  },

  // ─── Additional Data ───────────────────────────────────
  data: {
    type: Object,
    default: {},
  },

  metadata: {
    type: Object,
    default: {},
  },

  // ─── Timestamps ────────────────────────────────────────
  readAt: {
    type: Date,
  },

  deliveredAt: {
    type: Date,
  },

  scheduledFor: {
    type: Date,  // For scheduled delivery
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,  // Adds createdAt, updatedAt
});
```

---

### **Database Indexes**

```typescript
// ─── Primary Query: Get user's notifications ─────────────
notificationSchema.index(
  { receiverId: 1, createdAt: -1, isDeleted: false },
  { name: 'user_notifications_index' }
);

// ─── Unread Count Query ──────────────────────────────────
notificationSchema.index(
  { receiverId: 1, status: 1, isDeleted: false },
  { name: 'unread_count_index' }
);

// ─── Scheduled Notifications ─────────────────────────────
notificationSchema.index(
  { scheduledFor: 1, status: 1, isDeleted: false },
  { name: 'scheduled_notifications_index' }
);

// ─── Text Search ─────────────────────────────────────────
notificationSchema.index(
  { 'title.en': 'text', 'subTitle.en': 'text' },
  { name: 'text_search_index' }
);

// ─── Link-Based Queries ──────────────────────────────────
notificationSchema.index(
  { linkFor: 1, linkId: 1, isDeleted: false },
  { name: 'link_index' }
);

// ─── Cleanup Queries ─────────────────────────────────────
notificationSchema.index(
  { createdAt: 1, isDeleted: false },
  { name: 'cleanup_index' }
);
```

---

### **TaskReminder Collection**

```typescript
const taskReminderSchema = new Schema({
  // ─── Task & User ───────────────────────────────────────
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task ID is required'],
  },

  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
  },

  // ─── Reminder Configuration ────────────────────────────
  reminderTime: {
    type: Date,
    required: [true, 'Reminder time is required'],
  },

  triggerType: {
    type: String,
    enum: ['before_deadline', 'at_deadline', 'after_deadline', 'custom'],
    required: true,
  },

  hoursBefore: {
    type: Number,
    required: false,  // For before_deadline type
  },

  customMessage: {
    type: String,
    maxlength: [500, 'Message cannot exceed 500 characters'],
  },

  // ─── Delivery Channels ─────────────────────────────────
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    default: ['in_app', 'email'],
  }],

  // ─── Status & Tracking ─────────────────────────────────
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'cancelled', 'failed'],
    default: 'scheduled',
  },

  sentAt: {
    type: Date,
  },

  jobId: {
    type: String,  // BullMQ job ID
  },

  isDeleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});
```

---

### **TaskReminder Indexes**

```typescript
// ─── Get reminders for task ──────────────────────────────
taskReminderSchema.index(
  { taskId: 1, reminderTime: -1, isDeleted: false },
  { name: 'task_reminders_index' }
);

// ─── Get user's reminders ────────────────────────────────
taskReminderSchema.index(
  { userId: 1, reminderTime: -1, isDeleted: false },
  { name: 'user_reminders_index' }
);

// ─── Scheduled processing ────────────────────────────────
taskReminderSchema.index(
  { reminderTime: 1, status: 1, isDeleted: false },
  { name: 'scheduled_processing_index' }
);
```

---

## 🔴 Redis Caching Layers

### **Cache Strategy**

```typescript
┌─────────────────────────────────────────────────────────────┐
│                    REDIS CACHING LAYERS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Unread Count (30s TTL)                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key: notification:user:{userId}:unread-count       │    │
│  │ Value: 5 (integer)                                 │    │
│  │ TTL: 30 seconds                                    │    │
│  │ Hit Rate: ~95%                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 2: Notification List (60s TTL)                       │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key: notification:user:{userId}:notifications      │    │
│  │ Value: { docs: [...], totalPages: 5, page: 1 }    │    │
│  │ TTL: 60 seconds                                    │    │
│  │ Hit Rate: ~90%                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 3: Activity Feed (30s TTL)                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key: notification:dashboard:activity-feed:{id}:10  │    │
│  │ Value: [{ actor, task, timestamp, message }, ...] │    │
│  │ TTL: 30 seconds                                    │    │
│  │ Hit Rate: ~93%                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 4: Single Notification (3600s TTL)                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key: notification:{notificationId}                 │    │
│  │ Value: { _id, title, subTitle, status, ... }      │    │
│  │ TTL: 3600 seconds (1 hour)                         │    │
│  │ Hit Rate: ~85%                                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Cache Operations**

```typescript
class NotificationService {
  // ─── Cache Key Generator ─────────────────────────────────
  private getCacheKey(
    type: 'unread' | 'notifications' | 'notification',
    userId?: string,
    notificationId?: string
  ): string {
    const prefix = 'notification';
    
    if (type === 'unread' && userId) {
      return `${prefix}:user:${userId}:unread-count`;
    }
    
    if (type === 'notifications' && userId) {
      return `${prefix}:user:${userId}:notifications`;
    }
    
    if (type === 'notification' && notificationId) {
      return `${prefix}:${notificationId}`;
    }
    
    return `${prefix}:unknown`;
  }

  // ─── Get from Cache ──────────────────────────────────────
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error:', error);
      return null;
    }
  }

  // ─── Set in Cache ────────────────────────────────────────
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error:', error);
    }
  }

  // ─── Invalidate Cache ────────────────────────────────────
  private async invalidateCache(
    userId: string,
    notificationId?: string
  ): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('unread', userId),
        this.getCacheKey('notifications', userId),
      ];

      if (notificationId) {
        keysToDelete.push(
          this.getCacheKey('notification', undefined, notificationId)
        );
      }

      await redisClient.del(keysToDelete);
    } catch (error) {
      errorLogger.error('Redis DELETE error:', error);
    }
  }
}
```

---

### **Cache Flow Example**

```typescript
// ─── Get Unread Count (with caching) ───────────────────────
async getUnreadCount(userId: string): Promise<number> {
  const cacheKey = `notification:user:${userId}:unread-count`;

  // Step 1: Try cache first (5ms)
  const cachedCount = await redisClient.get(cacheKey);
  if (cachedCount !== null) {
    logger.debug(`Cache hit for unread count: ${userId}`);
    return parseInt(cachedCount);
  }

  // Step 2: Cache miss - query database (50ms)
  logger.debug(`Cache miss for unread count: ${userId}`);
  const count = await Notification.countDocuments({
    receiverId: new Types.ObjectId(userId),
    status: { $ne: 'read' },
    isDeleted: false,
  });

  // Step 3: Cache the result (30s TTL)
  await redisClient.setEx(cacheKey, 30, count.toString());
  logger.debug(`Cached unread count: ${count} for ${userId}`);

  // Step 4: Return data
  return count;
}

// ─── Mark as Read (with cache invalidation) ────────────────
async markAsRead(notificationId: string, userId: string) {
  // Step 1: Update database
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    {
      status: 'read',
      readAt: new Date(),
    },
    { new: true }
  );

  // Step 2: Invalidate cache
  await this.invalidateCache(userId, notificationId);
  logger.debug(`Cache invalidated for user: ${userId}`);

  // Step 3: Return updated notification
  return notification;
}
```

---

## 🟡 BullMQ Integration

### **Queue Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    BULLMQ QUEUES                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Queue 1: notifications-queue                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Process in-app notifications              │    │
│  │ Concurrency: 10 jobs                               │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 50ms                               │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Queue 2: notification-emails-queue                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Send email notifications                  │    │
│  │ Concurrency: 5 jobs                                │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 2s                                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Queue 3: notification-push-queue                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Send push notifications                   │    │
│  │ Concurrency: 10 jobs                               │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 500ms                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Queue 4: task-reminders-queue                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Purpose: Process scheduled reminders               │    │
│  │ Concurrency: 5 jobs                                │    │
│  │ Retry: 3 attempts, exponential backoff             │    │
│  │ Avg Processing: 100ms                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### **Queue Configuration**

```typescript
// ─── Queue Constants ───────────────────────────────────────
export const QUEUE_CONFIG = {
  NOTIFICATION_QUEUE_NAME: 'notifications-queue',
  REMINDER_QUEUE_NAME: 'task-reminders-queue',
  EMAIL_QUEUE_NAME: 'notification-emails-queue',
  PUSH_QUEUE_NAME: 'notification-push-queue',
  
  JOB_ATTEMPTS: 3,
  BACKOFF_DELAY: 5000,  // 5 seconds
  DEFAULT_SCHEDULE_DELAY: 60000,  // 1 minute
} as const;

// ─── Queue Initialization ──────────────────────────────────
import { Queue, Worker } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

// Create queues
const notificationQueue = new Queue(
  QUEUE_CONFIG.NOTIFICATION_QUEUE_NAME,
  { connection }
);

const emailQueue = new Queue(
  QUEUE_CONFIG.EMAIL_QUEUE_NAME,
  { connection }
);

// Create workers
const notificationWorker = new Worker(
  QUEUE_CONFIG.NOTIFICATION_QUEUE_NAME,
  async (job) => {
    const { notificationId } = job.data;
    await processNotification(notificationId);
  },
  {
    connection,
    concurrency: 10,
  }
);

const emailWorker = new Worker(
  QUEUE_CONFIG.EMAIL_QUEUE_NAME,
  async (job) => {
    const { notificationId } = job.data;
    await sendEmailNotification(notificationId);
  },
  {
    connection,
    concurrency: 5,
  }
);
```

---

### **Adding Jobs to Queue**

```typescript
// ─── Queue Notification for Async Processing ───────────────
private async queueNotification(
  notification: INotificationDocument
): Promise<void> {
  try {
    await notificationQueue.add(
      'sendNotification',
      {
        notificationId: notification._id.toString(),
        receiverId: notification.receiverId?.toString(),
        receiverRole: notification.receiverRole,
        channels: notification.channels,
        priority: notification.priority,
        title: notification.title,
        subTitle: notification.subTitle,
        type: notification.type,
      },
      {
        attempts: QUEUE_CONFIG.JOB_ATTEMPTS,
        backoff: {
          type: 'exponential',
          delay: QUEUE_CONFIG.BACKOFF_DELAY,
        },
        delay: notification.scheduledFor
          ? notification.scheduledFor.getTime() - Date.now()
          : 0,
      }
    );
    
    logger.info(
      `📧 Notification queued for ${notification.receiverId || notification.receiverRole}`
    );
  } catch (error) {
    errorLogger.error('Failed to queue notification:', error);
    // Don't throw - notification is still valid
  }
}
```

---

### **Processing Jobs**

```typescript
// ─── Worker Processing ─────────────────────────────────────
notificationWorker.process('sendNotification', async (job) => {
  const {
    notificationId,
    channels,
    priority,
    title,
    subTitle,
  } = job.data;

  logger.info(`📧 Processing notification: ${notificationId}`);

  // Process each channel
  for (const channel of channels) {
    try {
      switch (channel) {
        case 'in_app':
          // Already stored in MongoDB
          logger.debug(`✅ In-app notification ready`);
          break;

        case 'email':
          await sendEmail({
            to: await getUserEmail(job.data.receiverId),
            subject: title,
            body: subTitle,
          });
          logger.debug(`✅ Email sent`);
          break;

        case 'push':
          await sendPush({
            userId: job.data.receiverId,
            title,
            body: subTitle,
            priority,
          });
          logger.debug(`✅ Push sent`);
          break;

        case 'sms':
          if (priority === 'urgent') {
            await sendSMS({
              userId: job.data.receiverId,
              message: `${title}: ${subTitle}`,
            });
            logger.debug(`✅ SMS sent`);
          }
          break;
      }
    } catch (error) {
      errorLogger.error(`Failed to send via ${channel}:`, error);
      // Continue with other channels
    }
  }

  // Update notification status
  await Notification.findByIdAndUpdate(notificationId, {
    status: 'delivered',
    deliveredAt: new Date(),
  });

  logger.info(`✅ Notification ${notificationId} delivered successfully`);
});
```

---

## 🔗 Integration Points

### **With Task Module**

```typescript
// ─── Task Assignment Triggers Notification ─────────────────
async assignTask(taskId: string, assigneeId: string, assignedBy: string) {
  // Assign task
  await Task.findByIdAndUpdate(taskId, {
    assignedTo: assigneeId,
    assignedBy,
  });

  // Create notification
  await notificationService.createTaskAssignmentNotification(
    taskId,
    assigneeId,
    assignedBy
  );
}

// ─── Task Completion Triggers Notification ─────────────────
async completeTask(taskId: string, userId: string) {
  // Update task
  await Task.findByIdAndUpdate(taskId, {
    status: 'completed',
    completedAt: new Date(),
  });

  // Get task creator
  const task = await Task.findById(taskId);
  
  // Notify task creator
  await notificationService.createNotification({
    receiverId: task.createdBy,
    senderId: userId,
    title: 'Task Completed',
    subTitle: `${userName} completed the task`,
    type: 'task',
    channels: ['in_app'],
    linkFor: 'task',
    linkId: taskId,
  });

  // Record group activity
  await notificationService.recordGroupActivity(
    task.groupId,
    userId,
    'task_completed',
    {
      taskId: task._id.toString(),
      taskTitle: task.title,
    }
  );
}
```

---

### **With User Module**

```typescript
// ─── User Registration ─────────────────────────────────────
async createUser(userData, userProfileId) {
  const user = await User.create(userData);

  // Send welcome notification
  await notificationService.createNotification({
    receiverId: user._id,
    title: 'Welcome to Task Management!',
    subTitle: 'Get started by creating your first task',
    type: 'system',
    channels: ['in_app'],
    linkFor: 'tasks',
  });

  return user;
}
```

---

### **With Group Module**

```typescript
// ─── Member Joins Group ────────────────────────────────────
async joinGroup(groupId: string, userId: string) {
  // Add member
  await Group.findByIdAndUpdate(groupId, {
    $push: { members: userId },
  });

  // Notify all existing members
  const group = await Group.findById(groupId);
  
  for (const memberId of group.members) {
    await notificationService.createNotification({
      receiverId: memberId,
      senderId: userId,
      title: 'New Member Joined',
      subTitle: `${userName} joined the group`,
      type: 'group',
      channels: ['in_app'],
      linkFor: 'group',
      linkId: groupId,
    });
  }

  // Record activity
  await notificationService.recordGroupActivity(
    groupId,
    userId,
    'member_joined'
  );
}
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Architecture**: 3-tier (Routes → Controllers → Services)
2. ✅ **Database**: MongoDB with strategic indexes
3. ✅ **Caching**: 4-layer Redis strategy
4. ✅ **Queues**: 4 BullMQ queues for async processing
5. ✅ **Integration**: Task, User, Group modules
6. ✅ **Schema**: Notification + TaskReminder collections
7. ✅ **Indexes**: 6 indexes for performance
8. ✅ **Cache Keys**: Standardized naming convention

### **Key Files:**

| File | Purpose |
|------|---------|
| `notification.model.ts` | MongoDB schema + indexes |
| `notification.service.ts` | Business logic + caching |
| `notification.constant.ts` | Queue config + TTLs |
| `bullmq.ts` | Queue initialization |

### **Next Chapter:**

→ [Chapter 3: Notification Types & Priorities](./LEARN_NOTIFICATION_03_TYPES.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
