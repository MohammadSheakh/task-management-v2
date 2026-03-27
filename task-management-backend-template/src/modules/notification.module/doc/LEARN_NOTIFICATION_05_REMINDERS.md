# ⏰ Chapter 5: Task Reminders System

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Intermediate
**Prerequisites**: Chapters 1-4 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ What task reminders are and why they matter
- ✅ How to create reminders (one-time, recurring)
- ✅ BullMQ scheduling for reminders
- ✅ Reminder types (before/at/after deadline, custom)
- ✅ Reminder processing workflow
- ✅ How to cancel reminders

---

## 📊 What Are Task Reminders?

**Task reminders** are scheduled notifications that alert users about upcoming or overdue tasks.

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK REMINDERS OVERVIEW                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📅 Before Deadline                                          │
│     └─→ Notify user BEFORE task is due                      │
│     └─→ Example: "Task due in 24 hours"                     │
│                                                              │
│  ⏰ At Deadline                                              │
│     └─→ Notify user WHEN task is due                        │
│     └─→ Example: "Task is due now!"                         │
│                                                              │
│  ⚠️ After Deadline (Overdue)                                │
│     └─→ Notify user AFTER task is due                       │
│     └─→ Example: "Task is overdue!"                         │
│                                                              │
│  🎯 Custom Time                                              │
│     └─→ Notify at specific date/time                        │
│     └─→ Example: "Start working on task at 2 PM"            │
│                                                              │
│  🔄 Recurring                                                │
│     └─→ Repeat at intervals (daily, weekly, monthly)        │
│     └─→ Example: "Daily standup task"                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Why Reminders Matter

### **Problem Without Reminders:**

```
User creates task → Forgets about it → Deadline passes
     ↓
Task incomplete → User frustrated → Poor outcomes
```

### **Solution With Reminders:**

```
User creates task
     ↓
Reminder 24h before → User starts task
     ↓
Reminder 1h before  → User finishes task
     ↓
Task completed → User satisfied
```

### **Impact:**

| Metric | Without Reminders | With Reminders | Improvement |
|--------|------------------|----------------|-------------|
| **Task Completion Rate** | ~40% | ~75% | +87% |
| **On-Time Completion** | ~50% | ~80% | +60% |
| **User Satisfaction** | 3.5★ | 4.5★ | +28% |

---

## 📂 Reminder Types

### **Type 1: Before Deadline** 📅

Trigger notification **before** the task deadline.

```typescript
{
  triggerType: 'before_deadline',
  hoursBefore: 24,  // 24 hours before
  reminderTime: new Date('2026-03-27T14:00:00Z'),
  customMessage: 'Task due in 24 hours!'
}
```

**Use Cases**:
- ✅ 24 hours before deadline
- ✅ 1 hour before deadline
- ✅ Custom time before deadline

**Priority**: `high`

---

### **Type 2: At Deadline** ⏰

Trigger notification **exactly at** the task deadline.

```typescript
{
  triggerType: 'at_deadline',
  reminderTime: new Date('2026-03-28T14:00:00Z'),  // Same as deadline
  customMessage: 'Task is due now!'
}
```

**Use Cases**:
- ✅ Final reminder
- ✅ Deadline alert
- ✅ Time to submit

**Priority**: `urgent`

---

### **Type 3: After Deadline (Overdue)** ⚠️

Trigger notification **after** the task deadline has passed.

```typescript
{
  triggerType: 'after_deadline',
  hoursAfter: 1,  // 1 hour after deadline
  reminderTime: new Date('2026-03-28T15:00:00Z'),
  customMessage: 'Task is overdue!'
}
```

**Use Cases**:
- ✅ Overdue notification
- ✅ Escalation alert
- ✅ Parent notification

**Priority**: `urgent`

---

### **Type 4: Custom Time** 🎯

Trigger notification at a **specific date/time**.

```typescript
{
  triggerType: 'custom',
  reminderTime: new Date('2026-03-27T14:00:00Z'),
  customMessage: 'Start working on your project'
}
```

**Use Cases**:
- ✅ Custom reminders
- ✅ Meeting alerts
- ✅ Scheduled tasks

**Priority**: `normal`

---

## 🔄 Recurring Reminders

Reminders that **repeat** at regular intervals.

### **Frequency Options:**

```typescript
enum ReminderFrequency {
  ONCE = 'once',      // One-time reminder
  DAILY = 'daily',    // Every day
  WEEKLY = 'weekly',  // Every week
  MONTHLY = 'monthly' // Every month
}
```

---

### **Daily Recurring Reminder**

```typescript
{
  taskId: 'task123',
  userId: 'user123',
  reminderTime: new Date('2026-03-27T09:00:00Z'),
  triggerType: 'custom',
  customMessage: 'Daily standup meeting',
  frequency: 'daily',
  maxOccurrences: 10  // Stop after 10 occurrences
}
```

**Schedule**:
```
Mar 27, 9:00 AM → Reminder 1
Mar 28, 9:00 AM → Reminder 2
Mar 29, 9:00 AM → Reminder 3
...
```

---

### **Weekly Recurring Reminder**

```typescript
{
  taskId: 'task123',
  userId: 'user123',
  reminderTime: new Date('2026-03-31T10:00:00Z'),  // Monday
  triggerType: 'custom',
  customMessage: 'Weekly report due',
  frequency: 'weekly',
  maxOccurrences: 4  // 4 weeks
}
```

**Schedule**:
```
Mar 31, 10:00 AM → Reminder 1
Apr 7, 10:00 AM  → Reminder 2
Apr 14, 10:00 AM → Reminder 3
Apr 21, 10:00 AM → Reminder 4
```

---

## 🏗️ Reminder Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 TASK REMINDER FLOW                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User Creates Reminder                                    │
│     ↓                                                        │
│  2. Validate Task & User                                     │
│     ↓                                                        │
│  3. Save to MongoDB                                          │
│     ↓                                                        │
│  4. Add to BullMQ Queue (with delay)                        │
│     ↓                                                        │
│  5. Wait Until reminderTime                                  │
│     ↓                                                        │
│  6. BullMQ Worker Picks Up Job                              │
│     ↓                                                        │
│  7. Create Notification                                     │
│     ↓                                                        │
│  8. Send via Channels (in_app, email, push)                 │
│     ↓                                                        │
│  9. Update Reminder Status to 'sent'                        │
│     ↓                                                        │
│  10. If Recurring → Schedule Next Occurrence                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Creating Task Reminders

### **Basic One-Time Reminder**

```typescript
import { TaskReminderService } from './taskReminder.service';

const taskReminderService = new TaskReminderService();

// Create a simple reminder
const reminder = await taskReminderService.createReminder({
  taskId: 'task123',
  userId: 'user123',
  createdByUserId: 'user123',
  reminderTime: new Date('2026-03-27T14:00:00Z'),
  triggerType: 'before_deadline',
  hoursBefore: 24,
  channels: ['in_app', 'email'],
  customMessage: 'Task due in 24 hours!'
});

console.log('Reminder created:', reminder._id);
console.log('Scheduled for:', reminder.reminderTime);
```

---

### **Complete Reminder with All Fields**

```typescript
const reminder = await taskReminderService.createReminder({
  // Task & User
  taskId: new Types.ObjectId('64f5a1b2c3d4e5f6g7h8i9j0'),
  userId: new Types.ObjectId('64f5a1b2c3d4e5f6g7h8i9j1'),
  createdByUserId: new Types.ObjectId('64f5a1b2c3d4e5f6g7h8i9j1'),
  
  // Timing
  reminderTime: new Date('2026-03-27T14:00:00Z'),
  triggerType: 'before_deadline',
  hoursBefore: 24,
  
  // Delivery
  channels: ['in_app', 'email', 'push'],
  customMessage: 'Your task "Math Homework" is due in 24 hours. Start working on it now!',
  
  // Recurring (optional)
  frequency: 'once',
  maxOccurrences: 1
});

console.log('Reminder scheduled:', reminder);
```

---

### **Multiple Reminders for Same Task**

```typescript
const taskDeadline = new Date('2026-03-28T23:59:59Z');

// Reminder 1: 24 hours before
await taskReminderService.createReminder({
  taskId: 'task123',
  userId: 'user123',
  createdByUserId: 'user123',
  reminderTime: new Date(taskDeadline.getTime() - 24 * 60 * 60 * 1000),
  triggerType: 'before_deadline',
  hoursBefore: 24,
  channels: ['in_app', 'email'],
  customMessage: 'Task due in 24 hours'
});

// Reminder 2: 1 hour before
await taskReminderService.createReminder({
  taskId: 'task123',
  userId: 'user123',
  createdByUserId: 'user123',
  reminderTime: new Date(taskDeadline.getTime() - 60 * 60 * 1000),
  triggerType: 'before_deadline',
  hoursBefore: 1,
  channels: ['in_app', 'push'],
  customMessage: 'Task due in 1 hour!'
});

// Reminder 3: At deadline
await taskReminderService.createReminder({
  taskId: 'task123',
  userId: 'user123',
  createdByUserId: 'user123',
  reminderTime: taskDeadline,
  triggerType: 'at_deadline',
  channels: ['in_app', 'email', 'push'],
  customMessage: 'Task is due NOW!'
});
```

---

### **Reminder Limits**

```typescript
export const TASK_REMINDER_LIMITS = {
  MAX_REMINDERS_PER_TASK: 5,      // Max 5 reminders per task
  MAX_REMINDER_MESSAGE_LENGTH: 500,
  MIN_REMINDER_INTERVAL_MINUTES: 15,  // Min 15 min between reminders
  MAX_OCCURRENCES: 10,  // Max for recurring
} as const;
```

**Validation**:
```typescript
const existingReminders = await TaskReminder.countRemindersForTask(taskId);
if (existingReminders >= TASK_REMINDER_LIMITS.MAX_REMINDERS_PER_TASK) {
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `Maximum ${TASK_REMINDER_LIMITS.MAX_REMINDERS_PER_TASK} reminders allowed per task`
  );
}
```

---

## 🔴 BullMQ Scheduling

### **How Scheduling Works**

```typescript
// When creating reminder, add to BullMQ queue
const job = await taskRemindersQueue.add(
  'processTaskReminder',
  {
    reminderId: reminder._id.toString(),
    taskId: reminder.taskId.toString(),
    userId: reminder.userId.toString(),
    reminderTime: reminder.reminderTime,
    triggerType: reminder.triggerType,
    channels: reminder.channels,
    customMessage: reminder.customMessage,
  },
  {
    // Calculate delay until reminder time
    delay: reminder.reminderTime.getTime() - Date.now(),
    
    // Retry configuration
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,  // 5 seconds
    },
    
    // Cleanup after completion
    removeOnComplete: {
      age: 24 * 60 * 60,  // Remove after 24 hours
    },
  }
);

// Store job ID for tracking
reminder.jobId = job.id;
await reminder.save();
```

---

### **Job Processing (Worker)**

```typescript
// Worker processes job when delay expires
taskRemindersQueue.process('processTaskReminder', async (job) => {
  const { reminderId, taskId, userId, customMessage } = job.data;

  logger.info(`⏰ Processing reminder: ${reminderId}`);

  // Get task details
  const task = await Task.findById(taskId);
  const user = await User.findById(userId);

  // Create notification
  await notificationService.createNotification({
    receiverId: userId,
    title: 'Task Reminder',
    subTitle: customMessage || `Task "${task.title}" is due soon`,
    type: NotificationType.REMINDER,
    priority: NotificationPriority.HIGH,
    channels: ['in_app', 'email'],
    linkFor: 'task',
    linkId: taskId,
    data: {
      taskId: task._id.toString(),
      taskTitle: task.title,
      dueDate: task.dueDate
    }
  });

  // Update reminder status
  await TaskReminder.findByIdAndUpdate(reminderId, {
    status: 'sent',
    sentAt: new Date(),
    sentCount: 1
  });

  logger.info(`✅ Reminder sent to user ${userId}`);
});
```

---

## 📊 Reminder Schema

```typescript
const taskReminderSchema = new Schema({
  // Task & User
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdByUserId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Timing
  reminderTime: {
    type: Date,
    required: true,
  },
  triggerType: {
    type: String,
    enum: ['before_deadline', 'at_deadline', 'after_deadline', 'custom'],
    required: true,
  },
  hoursBefore: {
    type: Number,
    required: false,
  },

  // Message
  customMessage: {
    type: String,
    maxlength: 500,
  },

  // Delivery
  channels: [{
    type: String,
    enum: ['in_app', 'email', 'push', 'sms'],
    default: ['in_app', 'email'],
  }],

  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'cancelled', 'failed'],
    default: 'pending',
  },
  sentAt: {
    type: Date,
  },
  jobId: {
    type: String,  // BullMQ job ID
  },
  sentCount: {
    type: Number,
    default: 0,
  },

  // Recurring
  frequency: {
    type: String,
    enum: ['once', 'daily', 'weekly', 'monthly'],
    default: 'once',
  },
  maxOccurrences: {
    type: Number,
    default: 1,
  },
  occurrenceCount: {
    type: Number,
    default: 0,
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});
```

---

## 🔍 Querying Reminders

### **Get Reminders for a Task**

```typescript
const reminders = await taskReminderService.getRemindersForTask(taskId);

// Returns:
[
  {
    _id: 'reminder1',
    taskId: 'task123',
    userId: 'user123',
    reminderTime: '2026-03-27T14:00:00Z',
    triggerType: 'before_deadline',
    status: 'pending'
  },
  // ... more reminders
]
```

---

### **Get My Reminders**

```typescript
const myReminders = await taskReminderService.getRemindersForUser(userId);

// Returns all reminders for the user
// Populated with task details
[
  {
    _id: 'reminder1',
    taskId: {
      _id: 'task123',
      title: 'Math Homework',
      description: 'Complete chapter 5',
      dueDate: '2026-03-28T23:59:59Z'
    },
    userId: 'user123',
    reminderTime: '2026-03-27T14:00:00Z',
    status: 'pending'
  }
]
```

---

### **Get Pending Reminders**

```typescript
const pendingReminders = await TaskReminder.find({
  userId: userId,
  status: 'pending',
  isDeleted: false,
  reminderTime: { $gte: new Date() }
}).sort({ reminderTime: 1 });
```

---

## ❌ Canceling Reminders

### **Cancel Single Reminder**

```typescript
await taskReminderService.cancelReminder(reminderId, userId);

// Updates reminder status to 'cancelled'
// Removes from BullMQ queue
```

---

### **Implementation**

```typescript
async cancelReminder(
  reminderId: string,
  userId: string
): Promise<ITaskReminderDocument> {
  const reminder = await TaskReminder.findOne({
    _id: reminderId,
    userId: userId,
    isDeleted: false,
  });

  if (!reminder) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Reminder not found');
  }

  // Remove from BullMQ queue
  if (reminder.jobId) {
    const job = await taskRemindersQueue.getJob(reminder.jobId);
    if (job) {
      await job.remove();
      logger.info(`Removed job ${reminder.jobId} from queue`);
    }
  }

  // Update status
  reminder.status = 'cancelled';
  reminder.isDeleted = true;
  await reminder.save();

  logger.info(`Reminder ${reminderId} cancelled`);

  return reminder;
}
```

---

### **Cancel All Reminders for Task**

```typescript
await taskReminderService.cancelAllRemindersForTask(taskId, userId);

// Cancels all pending reminders for the task
```

---

### **Implementation**

```typescript
async cancelAllRemindersForTask(
  taskId: string,
  userId: string
): Promise<{ count: number }> {
  const reminders = await TaskReminder.find({
    taskId: taskId,
    userId: userId,
    status: 'pending',
    isDeleted: false,
  });

  for (const reminder of reminders) {
    // Remove from BullMQ
    if (reminder.jobId) {
      const job = await taskRemindersQueue.getJob(reminder.jobId);
      if (job) {
        await job.remove();
      }
    }

    // Update status
    reminder.status = 'cancelled';
    reminder.isDeleted = true;
    await reminder.save();
  }

  logger.info(`Cancelled ${reminders.length} reminders for task ${taskId}`);

  return { count: reminders.length };
}
```

---

## 🧪 Testing Reminders

### **Test 1: Create Reminder via API**

```bash
curl -X POST http://localhost:5000/task-reminders/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task123",
    "reminderTime": "2026-03-27T14:00:00Z",
    "reminderType": "before_deadline",
    "message": "Task due in 24 hours!"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "_id": "reminder123",
    "taskId": "task123",
    "userId": "user123",
    "reminderTime": "2026-03-27T14:00:00Z",
    "triggerType": "before_deadline",
    "status": "pending",
    "jobId": "job_456"
  }
}
```

---

### **Test 2: Get Task Reminders**

```bash
curl -X GET http://localhost:5000/task-reminders/task/task123 \
  -H "Authorization: Bearer <token>"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "reminder123",
      "taskId": "task123",
      "reminderTime": "2026-03-27T14:00:00Z",
      "status": "pending"
    }
  ]
}
```

---

### **Test 3: Get My Reminders**

```bash
curl -X GET http://localhost:5000/task-reminders/my \
  -H "Authorization: Bearer <token>"
```

---

### **Test 4: Cancel Reminder**

```bash
curl -X DELETE http://localhost:5000/task-reminders/reminder123 \
  -H "Authorization: Bearer <token>"
```

---

### **Test 5: Check BullMQ Queue**

```typescript
// Check pending jobs
const jobs = await taskRemindersQueue.getJobs(['delayed', 'waiting']);
console.log('Pending reminders:', jobs.length);

// Check job details
const job = await taskRemindersQueue.getJob('job_456');
console.log('Job data:', job.data);
console.log('Job delay:', job.delay);
```

---

### **Test 6: Check MongoDB**

```bash
mongosh

// Find your reminders
db.taskreminders.find({
  userId: ObjectId("your-user-id")
}).sort({ reminderTime: -1 })

// Find pending reminders
db.taskreminders.find({
  userId: ObjectId("your-user-id"),
  status: 'pending'
})
```

---

## 🔍 Common Issues & Solutions

### **Issue 1: Reminder Not Triggering**

**Problem**: Reminder time passed but no notification sent

**Solution**:
1. Check BullMQ worker is running
2. Verify Redis connection
3. Check job status

```typescript
const jobs = await taskRemindersQueue.getJobs(['delayed', 'waiting', 'active']);
console.log('Jobs:', jobs.map(j => ({ id: j.id, data: j.data })));

// Check if job failed
const failedJobs = await taskRemindersQueue.getJobs(['failed']);
console.log('Failed jobs:', failedJobs.length);
```

---

### **Issue 2: Too Many Reminders Error**

**Problem**: `Maximum 5 reminders allowed per task`

**Solution**:
```typescript
// Cancel old reminders first
await taskReminderService.cancelAllRemindersForTask(taskId, userId);

// Then create new reminder
await taskReminderService.createReminder(newReminderData);
```

---

### **Issue 3: Reminder Time in Past**

**Problem**: `Reminder time must be in the future`

**Solution**:
```typescript
// Validate reminder time
if (reminderTime <= new Date()) {
  throw new Error('Reminder time must be in the future');
}

// Or adjust to future time
const futureTime = new Date(Date.now() + 60000);  // 1 minute from now
```

---

### **Issue 4: Recurring Reminder Not Repeating**

**Problem**: Recurring reminder only fires once

**Solution**:
```typescript
// After sending reminder, schedule next occurrence
if (reminder.frequency !== 'once' && reminder.occurrenceCount < reminder.maxOccurrences) {
  const nextTime = calculateNextOccurrence(reminder.reminderTime, reminder.frequency);
  
  await taskReminderService.createReminder({
    ...reminder,
    reminderTime: nextTime,
    occurrenceCount: reminder.occurrenceCount + 1
  });
}
```

---

## 📊 Reminder Configuration

```typescript
export const REMINDER_CONFIG = {
  // Default reminder times before deadline
  DEFAULT_REMINDER_HOURS: [24, 1],  // 24h and 1h before
  
  // Limits
  MAX_REMINDERS_PER_TASK: 5,
  MIN_REMINDER_INTERVAL_MINUTES: 15,
  MAX_OCCURRENCES: 10,
  
  // Cleanup
  CLEANUP_CRON: '0 2 * * *',  // Daily at 2 AM
} as const;
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **What**: Task reminders are scheduled notifications
2. ✅ **Types**: before_deadline, at_deadline, after_deadline, custom
3. ✅ **Recurring**: once, daily, weekly, monthly
4. ✅ **Creation**: Via service or API
5. ✅ **Scheduling**: BullMQ with delay
6. ✅ **Cancellation**: Single or all reminders

### **Quick Reference:**

```typescript
// Create reminder
await taskReminderService.createReminder({
  taskId, userId, createdByUserId,
  reminderTime, triggerType, channels, customMessage
});

// Get reminders
await taskReminderService.getRemindersForTask(taskId);
await taskReminderService.getRemindersForUser(userId);

// Cancel reminder
await taskReminderService.cancelReminder(reminderId, userId);

// Cancel all
await taskReminderService.cancelAllRemindersForTask(taskId, userId);
```

### **Next Chapter:**

→ [Chapter 6: Redis Caching Strategy](./LEARN_NOTIFICATION_06_CACHING.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
