# 📝 Chapter 4: Creating Notifications

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Intermediate
**Prerequisites**: Chapters 1-3 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will be able to:
- ✅ Create single notifications programmatically
- ✅ Send bulk notifications (up to 1000 users)
- ✅ Schedule notifications for future delivery
- ✅ Create task assignment notifications
- ✅ Create deadline notifications
- ✅ Use custom notifications with i18n support

---

## 📊 Overview: Ways to Create Notifications

The Notification Module supports **5 creation methods**:

```
┌─────────────────────────────────────────────────────────────┐
│           NOTIFICATION CREATION METHODS                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Single Notification                                     │
│     └─→ Create one notification for one user               │
│     └─→ Use case: Task assigned to specific user           │
│                                                              │
│  2. Bulk Notification                                       │
│     └─→ Send to multiple users (max 1000)                  │
│     └─→ Use case: System announcement to all users         │
│                                                              │
│  3. Scheduled Notification                                  │
│     └─→ Deliver at specific time                           │
│     └─→ Use case: Reminder for tomorrow                    │
│                                                              │
│  4. Task Assignment Notification                            │
│     └─→ Pre-built template for task assignment             │
│     └─→ Use case: Teacher assigns task to student          │
│                                                              │
│  5. Deadline Notification                                   │
│     └─→ Pre-built template for deadline alerts             │
│     └─→ Use case: Task due in 24 hours                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Creating Single Notifications

### **Basic Single Notification**

The most common way to create a notification:

```typescript
import { NotificationService } from './notification.service';

const notificationService = new NotificationService();

// Create a simple notification
const notification = await notificationService.createNotification({
  receiverId: userId,
  senderId: senderUserId,
  title: 'New Task Assigned',
  subTitle: 'You have been assigned a new task',
  type: 'assignment',
  priority: 'normal',
  channels: ['in_app', 'email'],
  linkFor: 'task',
  linkId: taskId,
});

console.log('Notification created:', notification._id);
```

---

### **Notification Data Structure**

```typescript
interface INotification {
  // Who sent it
  senderId?: ObjectId;
  
  // Who receives it
  receiverId?: ObjectId;
  receiverRole?: string;  // For broadcast
  
  // What it says
  title: string | i18n;
  subTitle?: string | i18n;
  
  // Type & Priority
  type: NotificationType;
  priority: NotificationPriority;
  
  // How to deliver
  channels: NotificationChannel[];
  
  // Navigation
  linkFor?: string;
  linkId?: ObjectId;
  
  // Additional data
  data?: object;
  metadata?: object;
  
  // Scheduling
  scheduledFor?: Date;
}
```

---

### **Complete Example with All Fields**

```typescript
const notification = await notificationService.createNotification({
  // Sender (optional for system notifications)
  senderId: new Types.ObjectId('64f5a1b2c3d4e5f6g7h8i9j0'),
  
  // Receiver
  receiverId: new Types.ObjectId('64f5a1b2c3d4e5f6g7h8i9j1'),
  
  // Content (supports i18n)
  title: {
    en: 'Task Completed',
    es: 'Tarea Completada',
    fr: 'Tâche Terminée'
  },
  subTitle: {
    en: 'John completed "Math Homework"',
    es: 'John completó "Tarea de Matemáticas"',
    fr: 'John a terminé "Devoirs de Maths"'
  },
  
  // Classification
  type: NotificationType.TASK,
  priority: NotificationPriority.HIGH,
  
  // Delivery channels
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  
  // Navigation target
  linkFor: 'task',
  linkId: new Types.ObjectId('64f5a1b2c3d4e5f6g7h8i9j2'),
  
  // Additional context
  data: {
    activityType: 'task_completed',
    taskId: '64f5a1b2c3d4e5f6g7h8i9j2',
    taskTitle: 'Math Homework',
    actor: {
      userId: '64f5a1b2c3d4e5f6g7h8i9j0',
      name: 'John'
    }
  },
  
  metadata: {
    source: 'task_management_system',
    version: '2.0'
  }
});
```

---

### **System Notification (No Sender)**

```typescript
// System-wide announcement
const systemNotification = await notificationService.createNotification({
  receiverId: userId,
  title: 'System Maintenance',
  subTitle: 'Scheduled maintenance on March 30, 2:00-4:00 AM',
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.HIGH,
  channels: ['in_app', 'email'],
  data: {
    maintenanceDate: '2026-03-30T02:00:00Z',
    duration: '2 hours'
  }
});
```

---

## 2️⃣ Sending Bulk Notifications

Send the same notification to **up to 1000 users** in a single request.

### **Basic Bulk Notification**

```typescript
const payload = {
  userIds: ['user1', 'user2', 'user3'],  // Max 1000
  senderId: adminUserId,
  title: 'System Update',
  subTitle: 'New features available!',
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.NORMAL,
  channels: ['in_app', 'email'],
};

const result = await notificationService.sendBulkNotification(payload);

console.log(`Sent ${result.count} notifications`);
```

---

### **Bulk Notification with Validation**

```typescript
interface IBulkNotificationPayload {
  userIds: string[];           // Required, max 1000
  senderId?: string;           // Optional
  title: string | object;      // Required
  subTitle?: string | object;  // Optional
  type: NotificationType;      // Required
  priority?: NotificationPriority;  // Default: normal
  channels?: NotificationChannel[]; // Default: ['in_app']
  linkFor?: string;            // Optional
  linkId?: string;             // Optional
  data?: object;               // Optional
  scheduledFor?: Date;         // Optional
}

// Example with all fields
const payload: IBulkNotificationPayload = {
  userIds: ['user1', 'user2', 'user3'],
  senderId: 'admin123',
  title: 'New Feature Released',
  subTitle: 'Check out the new dashboard analytics',
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.NORMAL,
  channels: ['in_app', 'email'],
  linkFor: 'dashboard',
  linkId: 'dashboard123',
  data: {
    featureName: 'Analytics Dashboard',
    releaseVersion: '2.0'
  }
};

const result = await notificationService.sendBulkNotification(payload);
```

---

### **Broadcast to Role**

Send to **all users with a specific role**:

```typescript
// Send to all teachers
const teacherNotification = await notificationService.createNotification({
  receiverRole: 'teacher',  // Instead of receiverId
  title: 'Teacher Training Session',
  subTitle: 'Mandatory training on April 5th',
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.HIGH,
  channels: ['in_app', 'email'],
  data: {
    eventType: 'training',
    eventDate: '2026-04-05T10:00:00Z'
  }
});
```

---

### **Bulk Notification Limits**

```typescript
export const NOTIFICATION_LIMITS = {
  MAX_BULK_NOTIFICATIONS: 1000,  // Max users per request
  MAX_TITLE_LENGTH: 200,
  MAX_SUBTITLE_LENGTH: 500,
} as const;
```

**Validation Example**:

```typescript
if (userIds.length > NOTIFICATION_LIMITS.MAX_BULK_NOTIFICATIONS) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `Maximum ${NOTIFICATION_LIMITS.MAX_BULK_NOTIFICATIONS} users allowed per bulk notification`
  );
}
```

---

## 3️⃣ Scheduling Notifications

Create notifications that will be **delivered in the future**.

### **Basic Scheduled Notification**

```typescript
const scheduledTime = new Date('2026-03-27T14:00:00Z');

const notification = await notificationService.createNotification(
  {
    receiverId: userId,
    title: 'Meeting Reminder',
    subTitle: 'Team meeting starts in 15 minutes',
    type: NotificationType.REMINDER,
    priority: NotificationPriority.HIGH,
    channels: ['in_app', 'push'],
  },
  scheduledTime  // Schedule for future delivery
);

console.log('Notification scheduled for:', notification.scheduledFor);
```

---

### **Schedule Relative Time**

```typescript
// Schedule for 1 hour from now
const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

await notificationService.createNotification(
  {
    receiverId: userId,
    title: 'Task Reminder',
    subTitle: 'Check your pending tasks',
    type: NotificationType.REMINDER,
    channels: ['in_app'],
  },
  oneHourFromNow
);
```

---

### **Schedule Multiple Reminders**

```typescript
const taskDeadline = new Date('2026-03-28T23:59:59Z');

// 24 hours before
const reminder24h = new Date(taskDeadline.getTime() - 24 * 60 * 60 * 1000);
await notificationService.createNotification(
  {
    receiverId: userId,
    title: 'Task Due Tomorrow',
    subTitle: 'Your task is due in 24 hours',
    type: NotificationType.DEADLINE,
    priority: NotificationPriority.HIGH,
    channels: ['in_app', 'email'],
  },
  reminder24h
);

// 1 hour before
const reminder1h = new Date(taskDeadline.getTime() - 60 * 60 * 1000);
await notificationService.createNotification(
  {
    receiverId: userId,
    title: 'Task Due in 1 Hour',
    subTitle: 'Final reminder: Task due soon',
    type: NotificationType.DEADLINE,
    priority: NotificationPriority.URGENT,
    channels: ['in_app', 'push'],
  },
  reminder1h
);
```

---

## 4️⃣ Task Assignment Notifications

**Pre-built helper method** for creating task assignment notifications.

### **Using Helper Method**

```typescript
const notification = await notificationService.createTaskAssignmentNotification(
  taskId,
  assigneeUserId,
  assignedByUserId
);
```

---

### **What It Does Internally**

```typescript
async createTaskAssignmentNotification(
  taskId: string,
  assigneeId: string,
  assignedBy: string
): Promise<INotificationDocument> {
  const task = await Task.findById(taskId);
  const assignee = await User.findById(assigneeId);
  const assigner = await User.findById(assignedBy);

  return this.createNotification({
    receiverId: assigneeId,
    senderId: assignedBy,
    title: 'New Task Assigned',
    subTitle: `${assigner.name} assigned you "${task.title}"`,
    type: NotificationType.ASSIGNMENT,
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    linkFor: 'task',
    linkId: taskId,
    data: {
      taskId: task._id.toString(),
      taskTitle: task.title,
      assignedBy: {
        userId: assigner._id.toString(),
        name: assigner.name
      }
    }
  });
}
```

---

### **Manual Creation (Full Control)**

```typescript
const task = await Task.findById(taskId);
const assigner = await User.findById(assignedBy);

const notification = await notificationService.createNotification({
  receiverId: assigneeUserId,
  senderId: assignedByUserId,
  title: {
    en: 'New Task Assigned',
    es: 'Nueva Tarea Asignada'
  },
  subTitle: {
    en: `${assigner.name} assigned you "${task.title}"`,
    es: `${assigner.name} te asignó "${task.title}"`
  },
  type: NotificationType.ASSIGNMENT,
  priority: NotificationPriority.NORMAL,
  channels: ['in_app', 'email'],
  linkFor: 'task',
  linkId: taskId,
  data: {
    taskId: task._id.toString(),
    taskTitle: task.title,
    taskDescription: task.description,
    dueDate: task.dueDate,
    assignedBy: {
      userId: assigner._id.toString(),
      name: assigner.name,
      role: assigner.role
    }
  }
});
```

---

## 5️⃣ Deadline Notifications

**Pre-built helper method** for deadline alerts.

### **Using Helper Method**

```typescript
// Create deadline reminder (24 hours before)
const notification = await notificationService.createDeadlineNotification(
  taskId,
  userId,
  false  // false = not overdue yet
);
```

---

### **What It Does Internally**

```typescript
async createDeadlineNotification(
  taskId: string,
  userId: string,
  isOverdue: boolean
): Promise<INotificationDocument> {
  const task = await Task.findById(taskId);
  const user = await User.findById(userId);

  const title = isOverdue 
    ? 'Task Overdue' 
    : 'Deadline Approaching';
  
  const subTitle = isOverdue
    ? `The deadline for "${task.title}" has passed`
    : `Your task "${task.title}" is due soon`;

  return this.createNotification({
    receiverId: userId,
    title,
    subTitle,
    type: NotificationType.DEADLINE,
    priority: isOverdue 
      ? NotificationPriority.URGENT 
      : NotificationPriority.HIGH,
    channels: [
      NotificationChannel.IN_APP,
      NotificationChannel.EMAIL,
      ...(isOverdue ? [NotificationChannel.PUSH] : [])
    ],
    linkFor: 'task',
    linkId: taskId,
    data: {
      taskId: task._id.toString(),
      taskTitle: task.title,
      deadline: task.dueDate,
      isOverdue
    }
  });
}
```

---

### **Manual Creation with Custom Timing**

```typescript
const task = await Task.findById(taskId);
const now = new Date();
const timeUntilDeadline = task.dueDate.getTime() - now.getTime();
const hoursUntilDeadline = Math.floor(timeUntilDeadline / (1000 * 60 * 60));

let priority = NotificationPriority.NORMAL;
let channels: NotificationChannel[] = ['in_app'];

if (hoursUntilDeadline <= 1) {
  priority = NotificationPriority.URGENT;
  channels = ['in_app', 'email', 'push'];
} else if (hoursUntilDeadline <= 24) {
  priority = NotificationPriority.HIGH;
  channels = ['in_app', 'email'];
}

const notification = await notificationService.createNotification({
  receiverId: userId,
  title: hoursUntilDeadline <= 1 
    ? 'Task Due Now!' 
    : `Task Due in ${hoursUntilDeadline} Hours`,
  subTitle: `"${task.title}" is ${hoursUntilDeadline <= 1 ? 'due' : 'approaching'} deadline`,
  type: NotificationType.DEADLINE,
  priority,
  channels,
  linkFor: 'task',
  linkId: taskId,
  data: {
    taskId: task._id.toString(),
    taskTitle: task.title,
    deadline: task.dueDate,
    hoursRemaining: hoursUntilDeadline
  }
});
```

---

## 6️⃣ Custom Notifications with i18n

Support for **internationalization (i18n)** in notifications.

### **i18n Title and Subtitle**

```typescript
const notification = await notificationService.createNotification({
  receiverId: userId,
  
  // i18n title
  title: {
    en: 'Welcome to Task Management!',
    es: '¡Bienvenido a la Gestión de Tareas!',
    fr: 'Bienvenue dans la Gestion des Tâches!',
    de: 'Willkommen beim Aufgabenmanagement!',
    ar: 'مرحبًا بك في إدارة المهام!'
  },
  
  // i18n subtitle
  subTitle: {
    en: 'Get started by creating your first task',
    es: 'Comienza creando tu primera tarea',
    fr: 'Commencez par créer votre première tâche',
    de: 'Beginnen Sie mit der Erstellung Ihrer ersten Aufgabe',
    ar: 'ابدأ بإنشاء مهمتك الأولى'
  },
  
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.NORMAL,
  channels: ['in_app'],
});
```

---

### **User Language Preference**

```typescript
// Get user's preferred language
const user = await User.findById(userId);
const userLanguage = user.preferences?.language || 'en';

// Create notification with i18n
const notification = await notificationService.createNotification({
  receiverId: userId,
  title: {
    en: 'Task Completed',
    es: 'Tarea Completada',
    fr: 'Tâche Terminée'
  },
  subTitle: {
    en: 'Great job!',
    es: '¡Buen trabajo!',
    fr: 'Beau travail!'
  },
  type: NotificationType.TASK,
  channels: ['in_app']
});

// Frontend can display based on user's language
const displayTitle = typeof notification.title === 'object'
  ? notification.title[userLanguage] || notification.title.en
  : notification.title;
```

---

### **Helper Function for i18n**

```typescript
function createI18nText(
  translations: Record<string, string>
): Record<string, string> {
  return {
    en: translations.en || '',
    es: translations.es || '',
    fr: translations.fr || '',
    de: translations.de || '',
    ar: translations.ar || '',
    // Add more languages as needed
  };
}

// Usage
const notification = await notificationService.createNotification({
  receiverId: userId,
  title: createI18nText({
    en: 'New Message',
    es: 'Nuevo Mensaje',
    fr: 'Nouveau Message'
  }),
  subTitle: createI18nText({
    en: 'You have a new message from John',
    es: 'Tienes un nuevo mensaje de John',
    fr: 'Vous avez un nouveau message de John'
  }),
  type: NotificationType.CUSTOM,
  channels: ['in_app']
});
```

---

## 🧪 Testing Notification Creation

### **Test 1: Create Single Notification**

```bash
# First, create via API (if endpoint exists)
curl -X POST http://localhost:5000/notifications \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "user123",
    "title": "Test Notification",
    "subTitle": "This is a test",
    "type": "system",
    "priority": "normal",
    "channels": ["in_app"]
  }'
```

---

### **Test 2: Create Bulk Notification**

```bash
curl -X POST http://localhost:5000/notifications/bulk \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2", "user3"],
    "title": "Bulk Test",
    "subTitle": "Testing bulk notifications",
    "type": "system",
    "priority": "normal",
    "channels": ["in_app"]
  }'
```

---

### **Test 3: Verify in MongoDB**

```bash
# Connect to MongoDB
mongosh

# Find your notifications
db.notifications.find({
  receiverId: ObjectId("your-user-id")
}).sort({ createdAt: -1 }).limit(5)

# Check bulk notification
db.notifications.find({
  title: "Bulk Test"
})
```

---

### **Test 4: Verify in Redis**

```bash
# Connect to Redis
redis-cli

# Check if cache was updated
GET notification:user:your-user-id:unread-count

# Check notification list cache
GET notification:user:your-user-id:notifications
```

---

### **Test 5: Check BullMQ Queue**

```typescript
// In your application code or worker
const jobCounts = await notificationQueue.getJobCounts();
console.log('Queue status:', jobCounts);
// { waiting: 2, active: 1, completed: 100, failed: 0 }
```

---

## 📊 Creation Method Comparison

| Method | Max Users | Async | Use Case |
|--------|-----------|-------|----------|
| **Single** | 1 | ✅ Yes | Task assignment, mentions |
| **Bulk** | 1000 | ✅ Yes | Announcements, broadcasts |
| **Scheduled** | 1 | ✅ Yes | Reminders, future alerts |
| **Task Assignment** | 1 | ✅ Yes | Assigning tasks |
| **Deadline** | 1 | ✅ Yes | Deadline alerts |
| **Custom i18n** | 1 | ✅ Yes | International users |

---

## 🔍 Common Issues & Solutions

### **Issue 1: Notification Not Created**

**Problem**: `createNotification()` throws error

**Solution**:
```typescript
try {
  const notification = await notificationService.createNotification(data);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.message);
  } else {
    console.error('Database Error:', error);
  }
}
```

---

### **Issue 2: Bulk Notification Fails**

**Problem**: Too many users (>1000)

**Solution**:
```typescript
// Split into batches
const batchSize = 1000;
const batches = [];

for (let i = 0; i < userIds.length; i += batchSize) {
  batches.push(userIds.slice(i, i + batchSize));
}

// Send each batch
for (const batch of batches) {
  await notificationService.sendBulkNotification({
    ...payload,
    userIds: batch
  });
}
```

---

### **Issue 3: Scheduled Notification Not Delivered**

**Problem**: Notification stays in "pending" status

**Solution**:
1. Check BullMQ worker is running
2. Verify Redis connection
3. Check job queue status

```typescript
const jobs = await notificationQueue.getJobs(['delayed', 'waiting']);
console.log('Pending jobs:', jobs.length);

// Check specific job
const job = await notificationQueue.getJob(jobId);
console.log('Job status:', job?.failedReason);
```

---

### **Issue 4: i18n Not Working**

**Problem**: Only English text appears

**Solution**:
```typescript
// Ensure all language keys are present
const title = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  // Add fallback
  default: 'English'
};

// Frontend: Handle missing translations
const displayTitle = title[userLanguage] || title.en || title.default;
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Single Notification**: Create one notification for one user
2. ✅ **Bulk Notification**: Send to up to 1000 users
3. ✅ **Scheduled Notification**: Deliver at future time
4. ✅ **Task Assignment**: Pre-built helper method
5. ✅ **Deadline Notification**: Pre-built helper method
6. ✅ **Custom i18n**: Multi-language support

### **Quick Reference:**

```typescript
// Single notification
await notificationService.createNotification({ receiverId, title, type });

// Bulk notification
await notificationService.sendBulkNotification({ userIds, title, type });

// Scheduled notification
await notificationService.createNotification(data, scheduledTime);

// Task assignment
await notificationService.createTaskAssignmentNotification(taskId, assigneeId, assignedBy);

// Deadline notification
await notificationService.createDeadlineNotification(taskId, userId, isOverdue);
```

### **Next Chapter:**

→ [Chapter 5: Task Reminders System](./LEARN_NOTIFICATION_05_REMINDERS.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
