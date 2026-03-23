# 📬 Global Notification Helper - Complete Guide

**Version**: 1.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready  

---

## 🎯 Overview

The **Global Notification Helper** is a utility that allows you to send notifications from **anywhere** in your application, just like the old `enqueueWebNotification` function.

### **Key Features**:

- ✅ Send notifications from any module (Blog, Task, Chat, etc.)
- ✅ Async processing via BullMQ (non-blocking)
- ✅ Real-time delivery via Socket.IO
- ✅ Role-based broadcasting (send to all admins, users, etc.)
- ✅ Broadcast to all users
- ✅ Compatible with old `enqueueWebNotification`

---

## 🚀 Quick Start

### **Step 1: Initialize Notification Service**

In your `main.ts` or `app.module.ts`:

```typescript
// main.ts
import { setNotificationService } from './helpers/notification.helper';
import { NotificationService } from './modules/notification.module/notification.service';

// After creating the app
const app = await NestFactory.create(AppModule);

// Get notification service and set it
const notificationService = app.get(NotificationService);
setNotificationService(notificationService);

await app.listen(3000);
```

---

### **Step 2: Use Anywhere in Your Application**

```typescript
// From any module, service, or controller
import { enqueueNotification, sendNotification, broadcastToRole } from './helpers/notification.helper';
import { NotificationType } from './modules/notification.module/notification.schema';

// Send notification
await enqueueNotification({
  title: 'New Blog Published',
  senderId: userId,
  receiverId: followerId,
  type: NotificationType.CUSTOM,
  entityType: 'blog',
  entityId: blogId,
  message: `${userName} published a new blog`,
  linkFor: 'blog',
  linkId: blogId,
});
```

---

## 📖 Usage Examples

### **Example 1: Blog Module - Notify Followers**

**Scenario**: When a user publishes a blog, notify all their followers

```typescript
// blog.service.ts
import { enqueueNotification } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async publishBlog(userId: string, blogData: BlogData) {
  // Create blog
  const blog = await this.blogModel.create({
    ...blogData,
    authorId: userId,
  });

  // Get all followers
  const followers = await this.followerModel.find({ followingId: userId });

  // Notify each follower
  for (const follower of followers) {
    await enqueueNotification({
      title: 'New Blog Published',
      senderId: userId,
      receiverId: follower.followerId,
      type: NotificationType.CUSTOM,
      entityType: 'blog',
      entityId: blog._id,
      message: `${blogData.authorName} published a new blog: ${blogData.title}`,
      linkFor: 'blog',
      linkId: blog._id,
    });
  }

  return blog;
}
```

---

### **Example 2: Blog Module - Notify Admin for Review**

**Scenario**: When a user publishes a blog, notify all admins for review

```typescript
// blog.service.ts
import { broadcastToRole } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async publishBlog(userId: string, blogData: BlogData) {
  // Create blog
  const blog = await this.blogModel.create({
    ...blogData,
    authorId: userId,
    requiresReview: true,
  });

  // Notify all admins
  await broadcastToRole({
    title: 'New Blog for Review',
    senderId: userId,
    receiverRole: 'admin',
    type: NotificationType.SYSTEM,
    message: `${blogData.authorName} published a blog that needs review: ${blogData.title}`,
  });

  return blog;
}
```

---

### **Example 3: Task Module - Assign Task**

**Scenario**: When a task is assigned to a user

```typescript
// task.service.ts
import { enqueueNotification } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async assignTask(taskId: string, assigneeId: string, managerId: string) {
  // Update task
  await this.taskModel.findByIdAndUpdate(taskId, {
    assignedTo: assigneeId,
    assignedBy: managerId,
  });

  // Notify assignee
  await enqueueNotification({
    title: 'New Task Assigned',
    senderId: managerId,
    receiverId: assigneeId,
    type: NotificationType.ASSIGNMENT,
    entityType: 'task',
    entityId: taskId,
    message: 'You have been assigned a new task',
    linkFor: 'task',
    linkId: taskId,
  });

  return true;
}
```

---

### **Example 4: Task Module - Task Completion Notification**

**Scenario**: When a user completes a task, notify the task creator

```typescript
// task.service.ts
import { enqueueNotification } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async completeTask(taskId: string, userId: string) {
  // Get task details
  const task = await this.taskModel.findById(taskId);

  // Update task
  await this.taskModel.findByIdAndUpdate(taskId, {
    status: 'completed',
    completedAt: new Date(),
    completedBy: userId,
  });

  // Notify task creator
  await enqueueNotification({
    title: 'Task Completed',
    senderId: userId,
    receiverId: task.createdBy,
    type: NotificationType.TASK,
    entityType: 'task',
    entityId: taskId,
    message: `${userId} completed the task: ${task.title}`,
    linkFor: 'task',
    linkId: taskId,
  });

  return true;
}
```

---

### **Example 5: Chat Module - New Message**

**Scenario**: When a user receives a new message

```typescript
// chat.service.ts
import { enqueueNotification } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async sendMessage(senderId: string, receiverId: string, messageData: MessageData) {
  // Create message
  const message = await this.messageModel.create({
    ...messageData,
    senderId,
    receiverId,
  });

  // Notify receiver
  await enqueueNotification({
    title: 'New Message',
    senderId,
    receiverId,
    type: NotificationType.CUSTOM,
    entityType: 'message',
    entityId: message._id,
    message: `You received a new message from ${senderId}`,
    linkFor: 'chat',
    linkId: message._id,
  });

  return message;
}
```

---

### **Example 6: System Maintenance - Broadcast to All Users**

**Scenario**: Notify all users about scheduled maintenance

```typescript
// admin.service.ts
import { broadcastToAll } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async scheduleMaintenance(maintenanceData: MaintenanceData) {
  // Save maintenance schedule
  await this.maintenanceModel.create(maintenanceData);

  // Notify all users
  await broadcastToAll({
    title: 'Scheduled Maintenance',
    senderId: 'system',
    type: NotificationType.SYSTEM,
    message: `System will be down for maintenance on ${maintenanceData.date} from ${maintenanceData.startTime} to ${maintenanceData.endTime}`,
  });

  return true;
}
```

---

### **Example 7: Subscription Module - Payment Success**

**Scenario**: Notify user when payment is successful

```typescript
// subscription.service.ts
import { enqueueNotification } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async processPayment(userId: string, paymentData: PaymentData) {
  // Process payment
  const payment = await this.paymentModel.create({
    ...paymentData,
    userId,
  });

  // Notify user
  await enqueueNotification({
    title: 'Payment Successful',
    senderId: 'system',
    receiverId: userId,
    type: NotificationType.SYSTEM,
    entityType: 'payment',
    entityId: payment._id,
    message: `Your payment of $${paymentData.amount} was successful`,
    linkFor: 'subscription',
    linkId: payment._id,
  });

  return payment;
}
```

---

### **Example 8: User Module - Welcome New User**

**Scenario**: Send welcome notification when user registers

```typescript
// user.service.ts
import { enqueueNotification } from '../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async registerUser(userData: UserData) {
  // Create user
  const user = await this.userModel.create(userData);

  // Send welcome notification
  await enqueueNotification({
    title: 'Welcome to Task Management!',
    senderId: 'system',
    receiverId: user._id,
    type: NotificationType.SYSTEM,
    entityType: 'user',
    entityId: user._id,
    message: 'Get started by creating your first task',
    linkFor: 'tasks',
  });

  return user;
}
```

---

## 📊 API Reference

### **enqueueNotification**

Send notification asynchronously via BullMQ

```typescript
async enqueueNotification({
  title: string,              // Notification title
  senderId: string,           // User ID who sent
  receiverId?: string,        // User ID to receive (optional for role-based)
  receiverRole?: string,      // Role to send to (optional)
  type: NotificationType,     // Notification type
  entityType: string,         // Entity type (task, blog, etc.)
  entityId: string,           // Entity ID
  message?: string,           // Optional message
  linkFor?: string,           // Link target (task, blog, etc.)
  linkId?: string,            // Link target ID
  delay?: number,             // Delay in ms (optional)
}): Promise<void>
```

**Use Cases**:
- ✅ Non-urgent notifications
- ✅ Bulk notifications
- ✅ Scheduled notifications
- ✅ When you don't want to block main flow

---

### **sendNotification**

Send notification synchronously (immediate)

```typescript
async sendNotification({
  title: string,
  senderId: string,
  receiverId: string,       // Required (specific user)
  type: NotificationType,
  entityType: string,
  entityId: string,
  message?: string,
  linkFor?: string,
  linkId?: string,
}): Promise<void>
```

**Use Cases**:
- ✅ Urgent notifications
- ✅ Real-time notifications
- ✅ When you need immediate delivery

---

### **broadcastToRole**

Broadcast notification to all users with specific role

```typescript
async broadcastToRole({
  title: string,
  senderId: string,
  receiverRole: string,     // Role (admin, user, mentor, etc.)
  type: NotificationType,
  message?: string,
}): Promise<void>
```

**Use Cases**:
- ✅ Notify all admins
- ✅ Notify all users
- ✅ Role-based announcements

---

### **broadcastToAll**

Broadcast notification to all users in the system

```typescript
async broadcastToAll({
  title: string,
  senderId: string,
  type: NotificationType,
  message?: string,
}): Promise<void>
```

**Use Cases**:
- ✅ System-wide announcements
- ✅ Maintenance notifications
- ✅ Emergency alerts

---

## 🔧 Notification Types

```typescript
enum NotificationType {
  TASK = 'task',              // Task-related
  GROUP = 'group',            // Group-related
  SYSTEM = 'system',          // System announcements
  REMINDER = 'reminder',      // Reminders
  MENTION = 'mention',        // User mentions
  ASSIGNMENT = 'assignment',  // Task assignments
  DEADLINE = 'deadline',      // Deadline alerts
  CUSTOM = 'custom',          // Custom notifications
}
```

---

## 🎯 Best Practices

### **1. Use enqueueNotification for Most Cases**

```typescript
// ✅ Good - Non-blocking
await enqueueNotification({
  title: 'New Task',
  senderId: userId,
  receiverId: assigneeId,
  type: NotificationType.ASSIGNMENT,
  entityType: 'task',
  entityId: taskId,
});

// ❌ Bad - Blocking main flow
await sendNotification({...});  // Only use for urgent notifications
```

---

### **2. Always Provide entityType and entityId**

```typescript
// ✅ Good - Easy to track and link
await enqueueNotification({
  title: 'New Task',
  entityType: 'task',
  entityId: taskId,
  linkFor: 'task',
  linkId: taskId,
});

// ❌ Bad - Hard to track
await enqueueNotification({
  title: 'New Task',
  // Missing entityType, entityId, linkFor, linkId
});
```

---

### **3. Use receiverRole for Admin Notifications**

```typescript
// ✅ Good - Send to all admins
await broadcastToRole({
  title: 'System Alert',
  receiverRole: 'admin',
  type: NotificationType.SYSTEM,
});

// ❌ Bad - Send to specific admin ID
await enqueueNotification({
  title: 'System Alert',
  receiverId: 'admin123',  // What if there are multiple admins?
});
```

---

### **4. Handle Notification Failures Gracefully**

```typescript
// ✅ Good - Don't break main flow
try {
  await enqueueNotification({...});
} catch (error) {
  console.error('Notification failed:', error);
  // Continue with main logic
}

// ❌ Bad - Break main flow
await enqueueNotification({...});  // Throws error if fails
```

---

### **5. Use Appropriate Notification Type**

```typescript
// ✅ Good - Clear categorization
await enqueueNotification({
  title: 'New Task Assigned',
  type: NotificationType.ASSIGNMENT,  // Clear type
  entityType: 'task',
});

// ❌ Bad - Unclear type
await enqueueNotification({
  title: 'New Task Assigned',
  type: NotificationType.CUSTOM,  // Should use ASSIGNMENT
});
```

---

## 🧪 Testing

### **Test 1: Send Notification to User**

```typescript
// blog.service.spec.ts
import { enqueueNotification } from '../helpers/notification.helper';

describe('Blog Service', () => {
  it('should notify followers when blog is published', async () => {
    const userId = 'user123';
    const blogId = 'blog456';
    const followerId = 'follower789';

    // Mock notification
    jest.spyOn(require('../helpers/notification.helper'), 'enqueueNotification')
      .mockResolvedValue();

    // Publish blog
    await blogService.publish(userId, { title: 'My Blog' });

    // Verify notification was sent
    expect(enqueueNotification).toHaveBeenCalledWith({
      title: 'New Blog Published',
      senderId: userId,
      receiverId: followerId,
      type: expect.anything(),
      entityType: 'blog',
      entityId: blogId,
    });
  });
});
```

---

### **Test 2: Broadcast to Admins**

```typescript
// admin.service.spec.ts
import { broadcastToRole } from '../helpers/notification.helper';

describe('Admin Service', () => {
  it('should notify all admins for review', async () => {
    // Mock broadcast
    jest.spyOn(require('../helpers/notification.helper'), 'broadcastToRole')
      .mockResolvedValue();

    // Submit for review
    await adminService.submitForReview('blog123');

    // Verify broadcast
    expect(broadcastToRole).toHaveBeenCalledWith({
      title: 'New Blog for Review',
      receiverRole: 'admin',
      type: expect.anything(),
    });
  });
});
```

---

## 🔍 Debugging

### **Check if Notification Service is Initialized**

```typescript
// In any file
import { setNotificationService } from './helpers/notification.helper';

// Check if initialized
if (!notificationServiceInstance) {
  console.warn('⚠️ Notification service not initialized!');
  console.warn('Call setNotificationService() in main.ts');
}
```

---

### **Check BullMQ Queue**

```typescript
// Check queue status
const queueStatus = await notificationQueue.getJobCounts();
console.log('Queue status:', queueStatus);
// { waiting: 5, active: 2, completed: 100, failed: 1 }
```

---

### **Check Redis Cache**

```bash
# Connect to Redis
redis-cli

# Check unread count
GET notification:unread:userId123

# Check TTL
TTL notification:unread:userId123
```

---

## 📝 Summary

### **What You Can Do**:

✅ Send notifications from **any module** (Blog, Task, Chat, etc.)  
✅ Send to **specific users** or **roles**  
✅ **Async** processing (non-blocking)  
✅ **Real-time** delivery via Socket.IO  
✅ **Broadcast** to multiple users  
✅ **Schedule** notifications with delay  
✅ **Track** notifications by entityType/entityId  

### **Key Functions**:

| Function | Use For | Async |
|----------|---------|-------|
| **enqueueNotification** | Most notifications | ✅ Yes |
| **sendNotification** | Urgent notifications | ❌ No |
| **broadcastToRole** | Role-based broadcasts | ✅ Yes |
| **broadcastToAll** | System-wide broadcasts | ✅ Yes |

### **Migration from Old System**:

```typescript
// OLD: enqueueWebNotification
enqueueWebNotification(
  'New Task',
  senderId,
  receiverId,
  receiverRole,
  'task',
  taskId,
  'task',
  taskId
);

// NEW: enqueueNotification
await enqueueNotification({
  title: 'New Task',
  senderId,
  receiverId,
  receiverRole,
  type: NotificationType.TASK,
  entityType: 'task',
  entityId: taskId,
  linkFor: 'task',
  linkId: taskId,
});
```

---

**Created**: 26-03-23  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready  
**Version**: 1.0

---

**Ready to send notifications from anywhere! 🚀**
