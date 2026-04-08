# 📬 Notification System - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Notification Model Structure](#notification-model-structure)
4. [Notification Types & Enums](#notification-types--enums)
5. [Use Cases - Where & When Notifications Are Created](#use-cases---where--when-notifications-are-created)
6. [Notification Delivery System](#notification-delivery-system)
7. [API Endpoints](#api-endpoints)
8. [How to Create Notifications in New Modules](#how-to-create-notifications-in-new-modules)
9. [Best Practices](#best-practices)

---

## Overview

The notification system is a **centralized, scalable system** built to handle all notification needs across the entire backend. It supports:

- ✅ **Multiple delivery channels**: In-app, Email, Push, SMS
- ✅ **Real-time delivery** via Socket.IO
- ✅ **Async processing** via BullMQ queues
- ✅ **Scheduled notifications** (reminders, deadlines)
- ✅ **Role-based broadcasting** (notify all admins, all users, etc.)
- ✅ **Redis caching** for performance
- ✅ **i18n support** for multi-language notifications
- ✅ **Soft deletes** with automatic cleanup

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MODULES                               │
│  Task │ Payment │ User │ Subscription │ Progress │ etc. │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ calls
                   ▼
┌─────────────────────────────────────────────────────────┐
│           NotificationService                           │
│  ┌───────────────────────────────────────────────────┐  │
│  │  createNotification() - Main entry point          │  │
│  │  createTaskReminder() - Scheduled reminders       │  │
│  │  createTaskAssignment() - Task assignments        │  │
│  │  createDeadlineNotification() - Deadline alerts    │  │
│  │  sendBulkNotification() - Bulk sends              │  │
│  └───────────────────────────────────────────────────┘  │
└────────┬────────────────────────────┬───────────────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐        ┌──────────────────┐
│   BullMQ Queue   │        │   Redis Cache    │
│  (Async Send)    │        │  (Unread count,  │
│                  │        │   recent notifs) │
└────────┬─────────┘        └──────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│        Delivery Channels                 │
│  ┌──────────┐ ┌──────┐ ┌────┐ ┌──────┐  │
│  │ In-App   │ │Email │ │Push│ │ SMS  │  │
│  └────┬─────┘ └──┬───┘ └─┬──┘ └──┬───┘  │
│       │           │        │        │      │
│       ▼           │        │        │      │
│  Socket.IO ───────┘        │        │      │
│  (Real-time)               ▼        ▼      │
│                     Email   Push    SMS     │
│                     SMTP    FCM     Twilio  │
└────────────────────────────────────────────┘
```

---

## Notification Model Structure

**File:** `src/modules/notification.module/notification/notification.model.ts`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `senderId` | `ObjectId` (ref: User) | No | Who sent the notification (optional for system/broadcast) |
| `receiverId` | `ObjectId` (ref: User) | No | Target user ID |
| `receiverRole` | `String` | No | Role-based targeting (e.g., `"admin"`, `"business"`) |
| `title` | `Mixed` (string or i18n object) | **Yes** | Notification title |
| `subTitle` | `Mixed` (string or i18n object) | No | Body/description text |
| `type` | `NotificationType` enum | **Yes** | Category of notification |
| `priority` | `NotificationPriority` enum | No | Urgency level (default: `normal`) |
| `channels` | `NotificationChannel[]` | No | Delivery channels (default: `['in_app']`) |
| `status` | `NotificationStatus` enum | No | Delivery status (default: `pending`) |
| `linkFor` | `String` | No | Navigation target (e.g., `"task"`, `"subscription"`) |
| `linkId` | `ObjectId` | No | Entity ID to navigate to |
| `referenceFor` | `String` | No | Source entity type for tracking |
| `referenceId` | `ObjectId` | No | Source entity ID |
| `data` | `Object` | No | Additional payload data |
| `metadata` | `Object` | No | Extensibility metadata |
| `readAt` | `Date` | No | When the notification was read |
| `deliveredAt` | `Date` | No | When the notification was delivered |
| `scheduledFor` | `Date` | No | Scheduled delivery time (for reminders) |
| `isDeleted` | `Boolean` | No | Soft delete flag (default: `false`) |

### Indexes (Optimized for 100K+ Scale)
- `{ receiverId: 1, createdAt: -1, isDeleted: 1 }` - Primary user notifications
- `{ receiverId: 1, status: 1, isDeleted: 1, createdAt: -1 }` - Unread notifications
- `{ scheduledFor: 1, status: 1, isDeleted: 1 }` - Scheduled notifications
- `{ receiverId: 1, type: 1, createdAt: -1 }` - Filter by type
- `{ receiverRole: 1, status: 1, isDeleted: 1 }` - Broadcast to role

---

## Notification Types & Enums

**File:** `src/modules/notification.module/notification/notification.constant.ts`

### NotificationType
| Type | Description | Use Case |
|------|-------------|----------|
| `task` | Task-related activities | Task created, updated, deleted |
| `payment` | Subscription/payment events | Purchase, renewal, cancellation |
| `reminder` | Task reminders | Scheduled task reminders |
| `assignment` | Task assignments | User assigned to a task |
| `deadline` | Deadline notifications | Task due soon, overdue |
| `family` | Family/children activities | Child task completed, started |
| `system` | System-level notifications | System announcements, maintenance |
| `mention` | User mentions | User mentioned in comments |
| `custom` | Custom notifications | Any other custom notifications |

### NotificationPriority
- `low` - Informational, no action needed
- `normal` - Standard priority (default)
- `high` - Important, needs attention
- `urgent` - Critical, immediate action required

### NotificationChannel
- `in_app` - In-app notification (stored in DB + Socket.IO real-time)
- `email` - Email delivery via SMTP
- `push` - Push notification via FCM (Firebase Cloud Messaging)
- `sms` - SMS delivery via Twilio or similar

### NotificationStatus
- `pending` - Created but not yet sent
- `sent` - Sent to delivery channel
- `delivered` - Successfully delivered to user
- `read` - User has read the notification
- `failed` - Delivery failed

---

## Use Cases - Where & When Notifications Are Created

### 🎯 1. **PAYMENT & SUBSCRIPTION EVENTS** (RevenueCat Webhooks)

#### 1.1 Initial Purchase (Subscription Activated)
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleInitialPurchase.ts:145`
- **Trigger:** User makes their first subscription purchase
- **Recipient:** The purchasing user (`receiverId: user._id`)
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP`, `EMAIL`
- **Title:** "Subscription Activated"
- **Subtitle:** "Your Individual subscription has been activated successfully!"
- **Data:**
  ```json
  {
    "subscriptionId": "...",
    "eventType": "initial_purchase"
  }
  ```
- **linkFor:** `"subscription"`
- **linkId:** `newUserSubscription._id`

#### 1.2 Subscription Renewal
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleRenewal.ts:96`
- **Trigger:** Subscription auto-renews (monthly/yearly)
- **Recipient:** The subscribed user
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP`, `EMAIL`
- **Title:** "Subscription Renewed"
- **Data:**
  ```json
  {
    "subscriptionId": "...",
    "eventType": "renewal",
    "nextBillingDate": "2026-05-08T00:00:00.000Z"
  }
  ```

#### 1.3 Subscription Cancellation (User)
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleCancellation.ts:85`
- **Trigger:** User cancels their subscription
- **Recipient:** The cancelling user
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP`, `EMAIL`
- **Title:** "Subscription Cancelled"
- **Subtitle:** "Your subscription has been cancelled. You'll continue to have access until {expirationDate}."
- **Data:**
  ```json
  {
    "subscriptionId": "...",
    "eventType": "cancellation",
    "accessUntil": "2026-05-08T00:00:00.000Z"
  }
  ```

#### 1.4 Subscription Cancellation (Admin Alert)
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleCancellation.ts:105`
- **Trigger:** User cancels their subscription
- **Recipient:** All admins (`receiverRole: 'admin'`)
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP` only
- **Title:** "User Subscription Cancelled"
- **Subtitle:** "{userEmail} has cancelled their subscription."
- **Data:**
  ```json
  {
    "userId": "...",
    "userEmail": "user@example.com",
    "subscriptionId": "...",
    "eventType": "cancellation"
  }
  ```

#### 1.5 Billing Issue (Payment Failed)
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleBillingIssue.ts:69`
- **Trigger:** Payment failure / billing issue from RevenueCat
- **Recipient:** The affected user
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `HIGH`
- **Channels:** `IN_APP`, `EMAIL`
- **Title:** "Payment Issue"
- **Subtitle:** "We couldn't process your subscription payment. Please update your payment method."
- **Data:**
  ```json
  {
    "subscriptionId": "...",
    "eventType": "billing_issue"
  }
  ```

#### 1.6 Subscription Expiration
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleExpiration.ts:79`
- **Trigger:** Subscription expires (after cancellation or failed payment)
- **Recipient:** The affected user
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `HIGH`
- **Channels:** `IN_APP`, `EMAIL`
- **Title:** "Subscription Expired"
- **Subtitle:** "Your subscription has expired. Upgrade to continue enjoying premium features."
- **Data:**
  ```json
  {
    "subscriptionId": "...",
    "eventType": "expiration"
  }
  ```

#### 1.7 Refund Processed (User)
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleRefund.ts:110`
- **Trigger:** Refund is processed for a subscription
- **Recipient:** The refunded user
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `HIGH`
- **Channels:** `IN_APP`, `EMAIL`
- **Title:** "Refund Processed"
- **Subtitle:** "Your refund has been processed. Your subscription access has been {revoked/maintained}."
- **Data:**
  ```json
  {
    "subscriptionId": "...",
    "eventType": "refund",
    "accessStatus": "revoked" | "maintained"
  }
  ```

#### 1.8 Refund Processed (Admin Alert)
- **File:** `src/modules/payment.module/revenueCatWebhook/handlers/handleRefund.ts:130`
- **Trigger:** Refund is processed for a subscription
- **Recipient:** All admins (`receiverRole: 'admin'`)
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `HIGH`
- **Channels:** `IN_APP` only
- **Title:** "Refund Processed"
- **Data:**
  ```json
  {
    "userId": "...",
    "userEmail": "user@example.com",
    "orderId": "...",
    "paymentTransactionId": "...",
    "eventType": "refund"
  }
  ```

#### 1.9 Manual Subscription Cancellation (Admin Alert)
- **File:** `src/modules/subscription.module/subscriptionPlan/subscriptionPlan.controller.ts:228`
- **Trigger:** User manually cancels subscription via API endpoint
- **Recipient:** All admins (`receiverRole: 'admin'`)
- **Type:** `NotificationType.PAYMENT`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP` only
- **Title:** "Subscription Cancelled"
- **Data:**
  ```json
  {
    "userId": "...",
    "userEmail": "user@example.com",
    "subscriptionId": "...",
    "subscriptionPlanId": "..."
  }
  ```

---

### 🎯 2. **TASK-RELATED EVENTS**

#### 2.1 Collaborative Task Created (Child Activity)
- **File:** `src/modules/task.module/task/task.service.ts:263`
- **Trigger:** Parent/teacher creates a collaborative task and assigns it to children
- **Recipient:** Each assigned child user (`receiverId: childUserId`)
- **Type:** `NotificationType.TASK`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP` only
- **Activity Types:**
  - `TASK_CREATED` - New task assigned
  - `TASK_STARTED` - Child started the task
  - `TASK_COMPLETED` - Child completed the task
  - `TASK_UPDATED` - Task was modified
  - `TASK_DELETED` - Task was deleted
  - `SUBTASK_COMPLETED` - Subtask completed
  - `TASK_ASSIGNED` - Task assigned to child
- **Data:**
  ```json
  {
    "businessUserId": "...",
    "taskId": "...",
    "taskTitle": "Math Homework",
    "activityType": "TASK_CREATED"
  }
  ```
- **Purpose:** Appears in parent/teacher dashboard's **Live Activity Feed**

#### 2.2 Task Progress Update (Parent Notification)
- **File:** `src/modules/taskProgress.module/taskProgress.service.ts:646`
- **Trigger:** Child completes or starts a collaborative task
- **Recipient:** The parent/teacher (task creator)
- **Type:** `NotificationType.FAMILY`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP`, `PUSH`
- **Title:** Dynamic - "{Child Name} completed the task: {Task Title}"
- **Data:**
  ```json
  {
    "taskId": "...",
    "childUserId": "...",
    "childName": "John",
    "taskTitle": "Math Homework",
    "eventType": "task_completed"
  }
  ```
- **linkFor:** `"task"`
- **linkId:** `taskId`

#### 2.3 Task Assignment Notification
- **File:** `src/modules/notification.module/notification/notification.service.ts:462`
- **Method:** `createTaskAssignmentNotification()`
- **Trigger:** User is assigned to a task (helper method)
- **Recipient:** The assigned user
- **Type:** `NotificationType.ASSIGNMENT`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP`
- **Title:** "New Task Assigned"
- **Subtitle:** "You have been assigned a new task: {taskTitle}"
- **linkFor:** `"task"`
- **linkId:** `taskId`

#### 2.4 Task Deadline Notification
- **File:** `src/modules/notification.module/notification/notification.service.ts:494`
- **Method:** `createDeadlineNotification()`
- **Trigger:** Task deadline is approaching or overdue (helper method)
- **Recipient:** Task owner or assigned user
- **Type:** `NotificationType.DEADLINE`
- **Priority:** `HIGH` (if overdue), `NORMAL` (if approaching)
- **Channels:** `IN_APP`, `EMAIL` (if overdue)
- **Title:** Dynamic - "Task Due Soon" or "Task Overdue"
- **linkFor:** `"task"`
- **linkId:** `taskId`

---

### 🎯 3. **TASK REMINDERS** (Scheduled via BullMQ Cron)

#### 3.1 Scheduled Task Reminder
- **File:** `src/modules/notification.module/taskReminder/taskReminder.service.ts:231`
- **Trigger:** Scheduled task reminder fires (via BullMQ cron job)
- **Recipient:** The user who set the reminder (`receiverId: reminder.userId`)
- **Type:** `NotificationType.REMINDER`
- **Priority:** `HIGH`
- **Channels:** Configurable (from reminder's `channels` field)
- **Title:** Dynamic based on trigger type:
  - "Task Reminder: Deadline Approaching"
  - "Task Due Now"
  - "Task Overdue"
- **Subtitle:** Task-specific message
- **linkFor:** `"task"`
- **linkId:** `reminder.taskId`
- **Data:**
  ```json
  {
    "taskId": "...",
    "reminderType": "deadline_approaching" | "due_now" | "overdue",
    "reminderTime": "2026-04-08T10:00:00.000Z"
  }
  ```
- **scheduledFor:** Set to reminder time (BullMQ delays delivery)

---

### 🎯 4. **USER & SYSTEM EVENTS**

#### 4.1 Test Notification (Debug Endpoint)
- **File:** `src/modules/user.module/user/user.controller.ts:97`
- **Trigger:** User sends a test notification to admin (test/debug endpoint)
- **Recipient:** All admins (`receiverRole: 'admin'`)
- **Type:** `NotificationType.SYSTEM`
- **Priority:** `NORMAL`
- **Channels:** `IN_APP` only
- **Title:** "Test Notification"
- **Subtitle:** "Test notification from user {id} ({userName})"
- **Purpose:** Testing/debugging notification system

---

## Notification Delivery System

### 1. **BullMQ Queue** (Async Processing)
- **Queue Name:** `notificationQueue-e-learning`
- **Job Name:** `sendNotification`
- **Retry Config:** 3 attempts with exponential backoff (5000ms delay)
- **Features:**
  - Scheduled delivery via `delay` option
  - Automatic retry on failure
  - Dead letter queue for failed notifications

**Example:**
```typescript
// Queue a notification with 10-minute delay
await queueManager.queueNotification({
  queueName: 'notificationQueue-e-learning',
  jobName: 'sendNotification',
  data: { notificationId: '...' },
  delay: 10 * 60 * 1000, // 10 minutes
});
```

### 2. **Redis Caching** (Performance Optimization)
| Cache Type | TTL | Purpose |
|------------|-----|---------|
| Unread Count | 30 seconds | Quick badge count for UI |
| Recent Notifications | 60 seconds | Recent notification list |
| Activity Feed | 30 seconds | Parent dashboard live feed |

**Cache invalidation on:**
- Mark as read
- Mark all as read
- Delete notification
- Create new notification

### 3. **Socket.IO** (Real-time Delivery)
- **Event Names:**
  - `notification::{userId}` - User-specific notifications
  - `notification::{role}` - Role-based notifications (e.g., `notification::admin`)
- **Payload:** Full notification object
- **Frontend listens:** On these channels for instant pop-up notifications

### 4. **Delivery Channels**

#### In-App (`IN_APP`)
- Stored in MongoDB
- Emitted via Socket.IO for real-time
- Appears in notification bell/dropdown
- User can mark as read, delete, etc.

#### Email (`EMAIL`)
- Sent via SMTP (configured in `EMAIL_CONFIG`)
- Uses email templates (HTML)
- For important notifications only (payment, urgent tasks)

#### Push (`PUSH`)
- Sent via Firebase Cloud Messaging (FCM)
- Requires user's device token
- Mobile/desktop push notifications

#### SMS (`SMS`)
- Sent via Twilio or similar service
- For urgent/critical notifications only
- Requires user's phone number

---

## API Endpoints

**Base Route:** `/api/v1/notifications`

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/my` | `commonUser` | Get user's notifications (paginated, filterable) |
| `GET` | `/unread-count` | `commonUser` | Get unread notification count |
| `POST` | `/:id/read` | `commonUser` | Mark single notification as read |
| `POST` | `/read-all` | `commonUser` | Mark all notifications as read |
| `DELETE` | `/:id` | `commonUser` | Delete a notification |
| `POST` | `/bulk` | `admin` | Send bulk notifications (max 1000) |
| `POST` | `/schedule-reminder` | `commonUser` | Schedule a task reminder |
| `GET` | `/dashboard/activity-feed` | `business` | Get live activity feed (parent/teacher dashboard) |

### Query Parameters for `GET /my`
```
?status=pending|sent|delivered|read    // Filter by status
?type=task|payment|reminder|system     // Filter by type
&priority=low|normal|high|urgent       // Filter by priority
&page=1                                // Page number
&limit=20                              // Items per page
&sortBy=-createdAt                     // Sort field
```

---

## How to Create Notifications in New Modules

### Method 1: Using `createNotification()` (Recommended)

```typescript
import { NotificationService } from '../../notification.module/notification/notification.service';
import { NotificationType, NotificationPriority, NotificationChannel } from '../../ notification.module/notification/notification.constant';

const notificationService = new NotificationService();

// Create a notification
await notificationService.createNotification({
  senderId: userId,                    // Who sent it (optional for system)
  receiverId: targetUserId,            // User to notify (OR use receiverRole)
  // receiverRole: 'admin',            // OR notify all users with this role
  title: 'New Task Assigned',          // Title (required)
  subTitle: 'You have a new task: Math Homework',  // Optional
  type: NotificationType.TASK,         // Category
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  linkFor: 'task',                     // Navigation target
  linkId: taskId,                      // Entity ID to link to
  referenceFor: 'task',                // Source entity type
  referenceId: taskId,                 // Source entity ID
  data: {                              // Additional payload
    taskId: taskId.toString(),
    eventType: 'task_assigned',
  },
  metadata: {                          // Optional metadata
    module: 'task',
    action: 'create',
  },
});
```

### Method 2: Using Helper Methods

```typescript
// Task assignment notification
await notificationService.createTaskAssignmentNotification(
  taskId,
  assignedUserId,
  taskTitle,
  senderUserId
);

// Deadline notification
await notificationService.createDeadlineNotification(
  taskId,
  taskOwnerId,
  taskTitle,
  dueDate,
  'upcoming' // or 'overdue'
);
```

### Method 3: Bulk Notifications (Admin Only)

```typescript
const notificationData = {
  title: 'System Maintenance',
  subTitle: 'The system will be down for maintenance at 2 AM',
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.HIGH,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
};

// Send to specific users
await notificationService.sendBulkNotification(
  [userId1, userId2, userId3],
  notificationData
);

// Broadcast to role
await notificationService.createNotification({
  receiverRole: 'admin',
  title: 'New User Registered',
  subTitle: `${userName} just joined the platform`,
  type: NotificationType.SYSTEM,
  channels: [NotificationChannel.IN_APP],
});
```

### Method 4: Scheduled Notifications (Reminders)

```typescript
import { TaskReminderService } from '../../notification.module/taskReminder/taskReminder.service';

const reminderService = new TaskReminderService();

// Create a reminder that fires at a specific time
await reminderService.createReminder({
  userId: targetUserId,
  taskId: taskId,
  reminderTime: new Date('2026-04-08T10:00:00.000Z'),
  triggerType: 'deadline_approaching',
  channels: ['in_app', 'push'],
  message: 'Your task "Math Homework" is due tomorrow!',
});
```

---

## Best Practices

### ✅ DO

1. **Always use NotificationType enum** - Don't hardcode strings
   ```typescript
   type: NotificationType.TASK  // ✅
   type: 'task'                 // ❌
   ```

2. **Use appropriate priority** - Don't mark everything as urgent
   - `urgent` - System outages, security breaches
   - `high` - Payment issues, overdue tasks
   - `normal` - Regular updates, assignments
   - `low` - Informational updates

3. **Include linkFor and linkId** - Helps frontend navigate to the entity
   ```typescript
   linkFor: 'task',
   linkId: taskId
   ```

4. **Use receiverId OR receiverRole** - Not both (unless intentional)
   ```typescript
   receiverId: userId      // Specific user
   receiverRole: 'admin'   // All admins
   ```

5. **Add meaningful data payload** - Helps frontend display context
   ```typescript
   data: {
     taskId: taskId.toString(),
     eventType: 'task_completed',
     childName: 'John',
   }
   ```

6. **Use i18n for multi-language apps**
   ```typescript
   title: {
     en: 'Task Completed',
     es: 'Tarea Completada',
     fr: 'Tâche Terminée',
   }
   ```

### ❌ DON'T

1. **Don't spam users** - Limit notification frequency
2. **Don't use createNotification for logging** - Use logger instead
3. **Don't send sensitive data** - No passwords, tokens, etc.
4. **Don't forget error handling** - Wrap in try-catch
5. **Don't mix sync/async** - Use BullMQ for non-critical notifications

### Performance Tips

1. **Use BullMQ for non-critical notifications**
   ```typescript
   // Async (preferred for most cases)
   await notificationService.createNotification({ ... });
   // Automatically queued via BullMQ
   ```

2. **Cache strategically** - System already caches unread count & recent notifications

3. **Batch operations** - Use `sendBulkNotification()` for multiple users

4. **Clean up old notifications** - System auto-deletes:
   - Read notifications after 30 days
   - Unread notifications after 90 days

---

## Configuration

**File:** `src/config/index.ts`

```env
# Notification Queue
NOTIFICATION_QUEUE_CONCURRENCY=10        # Max concurrent jobs
NOTIFICATION_QUEUE_RETRY_ATTEMPTS=3      # Retry attempts
NOTIFICATION_QUEUE_BACKOFF_DELAY=5000    # Initial backoff (ms)

# Email (for EMAIL channel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password

# Push Notifications (for PUSH channel)
FCM_PROJECT_ID=your-firebase-project-id
FCM_PRIVATE_KEY=your-firebase-private-key

# SMS (for SMS channel)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+1234567890

# Cleanup
NOTIFICATION_RETENTION_READ=30           # Days to keep read notifications
NOTIFICATION_RETENTION_UNREAD=90         # Days to keep unread notifications
NOTIFICATION_CLEANUP_CRON=0 2 * * *      # Daily at 2 AM
```

---

## Monitoring & Debugging

### Check Notification Status
```typescript
// Get notification by ID
const notification = await Notification.findById(notificationId);

// Check delivery status
console.log(notification.status); // 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

// Check delivery channels
console.log(notification.channels); // ['in_app', 'email']

// Check timestamps
console.log(notification.createdAt);    // When created
console.log(notification.deliveredAt);  // When delivered
console.log(notification.readAt);       // When read
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Notification not appearing | Wrong receiverId/receiverRole | Double-check user ID or role |
| Socket not emitting | Frontend not listening to correct channel | Check `notification::{userId}` listener |
| Email not sent | SMTP not configured | Check email config in `.env` |
| BullMQ job failing | Queue worker error | Check worker logs, retry manually |
| Cache not updating | Redis connection issue | Check Redis connection, clear cache |

---

## File Structure

```
src/modules/notification.module/
├── notification/
│   ├── notification.controller.ts       # HTTP endpoints
│   ├── notification.model.ts            # Mongoose schema
│   ├── notification.service.ts          # Main service
│   ├── notification.route.ts            # Routes
│   ├── notification.interface.ts        # TypeScript interfaces
│   └── notification.constant.ts         # Enums & constants
├── taskReminder/
│   ├── taskReminder.model.ts            # Reminder schema
│   ├── taskReminder.service.ts          # Reminder service
│   └── taskReminder.cron.ts             # Cron job for reminders
└── doc/
    ├── HOW_TO_USE_FROM_ANY_MODULE.md    # Integration guide
    ├── LEARN_NOTIFICATION_*系列.md      # Detailed learning series
    └── ...                              # Additional docs
```

---

## Support & Resources

- **Integration Guide:** `src/modules/notification.module/doc/HOW_TO_USE_FROM_ANY_MODULE.md`
- **Master Guide:** `src/modules/notification.module/doc/LEARN_NOTIFICATION_COMPLETE_SERIES.md`
- **Architecture:** `src/modules/notification.module/doc/LEARN_NOTIFICATION_02_ARCHITECTURE_DEEP_DIVE.md`
- **BullMQ Setup:** `src/modules/notification.module/doc/BULLMQ_QUEUE_ARCHITECTURE.md`

---

**Document Version:** 1.0.0  
**Last Updated:** April 8, 2026  
**Maintained By:** Senior Engineering Team
