# 📬 Global Notification System - Complete Implementation Guide

**Version**: 1.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready  

---

## 🎯 Overview

This guide shows you how to use the **Global Notification Helper** to send notifications from **any module** in your application, just like your old `enqueueWebNotification` function.

### **What You Get**:

- ✅ **Global Helper**: Use from anywhere (Blog, Task, Chat, etc.)
- ✅ **Async Processing**: BullMQ queues (non-blocking)
- ✅ **Real-time Delivery**: Socket.IO integration
- ✅ **Role Broadcasting**: Send to all admins, users, etc.
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Backward Compatible**: Similar to old `enqueueWebNotification`

---

## 🚀 Quick Start (3 Steps)

### **Step 1: Notification Module is Already Initialized** ✅

The notification module automatically initializes the global helper when the app starts:

```typescript
// app.module.ts
import { NotificationModule } from './modules/notification.module/notification.module';

@Module({
  imports: [
    NotificationModule,  // ✅ Auto-initializes global helper
    // ... other modules
  ],
})
export class AppModule {}
```

**On startup, you'll see**:
```
✅ Notification Module initialized - Global helper ready to use
📬 You can now use: import { enqueueNotification } from "./helpers/notification.helper"
```

---

### **Step 2: Import Helper in Any Module**

```typescript
// From ANY service, controller, or module
import { enqueueNotification, broadcastToRole } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';
```

---

### **Step 3: Send Notifications**

```typescript
// Send to specific user
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

// Send to all admins
await broadcastToRole({
  title: 'New Blog for Review',
  senderId: userId,
  receiverRole: 'admin',
  type: NotificationType.SYSTEM,
  message: 'A user published a blog that needs review',
});
```

---

## 📖 Complete Example: Blog Module

### **Scenario**: User publishes a blog → Notify followers + Notify admins

```typescript
// blog.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Blog, BlogDocument } from './blog.schema';
import { enqueueNotification, broadcastToRole } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
  ) {}

  /**
   * Publish blog and notify followers + admins
   */
  async publishBlog(userId: string, blogData: PublishBlogDto) {
    // Step 1: Create blog
    const blog = await this.blogModel.create({
      ...blogData,
      authorId: userId,
      publishedAt: new Date(),
      status: 'published',
    });

    // Step 2: Get all followers of the author
    const followers = await this.followerModel.find({
      followingId: userId,
    }).select('followerId').lean();

    // Step 3: Notify each follower (async, non-blocking)
    const notificationPromises = followers.map(follower =>
      enqueueNotification({
        title: 'New Blog Published',
        senderId: userId,
        receiverId: follower.followerId,
        type: NotificationType.CUSTOM,
        entityType: 'blog',
        entityId: blog._id,
        message: `${blogData.authorName} published: ${blogData.title}`,
        linkFor: 'blog',
        linkId: blog._id,
      })
    );

    // Execute all notifications in parallel
    await Promise.all(notificationPromises);
    console.log(`📬 Notified ${followers.length} followers`);

    // Step 4: Notify all admins for review
    await broadcastToRole({
      title: 'New Blog for Review',
      senderId: userId,
      receiverRole: 'admin',
      type: NotificationType.SYSTEM,
      message: `${blogData.authorName} published a blog: ${blogData.title}`,
    });
    console.log('📢 Notified all admins');

    return blog;
  }
}
```

---

## 🎯 More Real-World Examples

### **Example 1: Task Module - Assign Task**

```typescript
// task.service.ts
import { enqueueNotification } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async assignTask(taskId: string, assigneeId: string, managerId: string) {
  // Update task
  await this.taskModel.findByIdAndUpdate(taskId, {
    assignedTo: assigneeId,
    assignedBy: managerId,
    status: 'assigned',
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

### **Example 2: Task Module - Task Completion**

```typescript
// task.service.ts
import { enqueueNotification } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async completeTask(taskId: string, userId: string) {
  // Get task
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
    message: `${userId} completed: ${task.title}`,
    linkFor: 'task',
    linkId: taskId,
  });

  return true;
}
```

---

### **Example 3: Chat Module - New Message**

```typescript
// chat.service.ts
import { enqueueNotification } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async sendMessage(senderId: string, receiverId: string, messageData: MessageDto) {
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
    message: 'You received a new message',
    linkFor: 'chat',
    linkId: message._id,
  });

  return message;
}
```

---

### **Example 4: Subscription Module - Payment Success**

```typescript
// subscription.service.ts
import { enqueueNotification } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async processPayment(userId: string, paymentData: PaymentDto) {
  // Process payment
  const payment = await this.paymentModel.create({
    ...paymentData,
    userId,
    status: 'success',
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

### **Example 5: System Maintenance - Broadcast to All**

```typescript
// admin.service.ts
import { broadcastToAll } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async scheduleMaintenance(maintenanceData: MaintenanceDto) {
  // Save maintenance schedule
  await this.maintenanceModel.create(maintenanceData);

  // Notify all users
  await broadcastToAll({
    title: 'Scheduled Maintenance',
    senderId: 'system',
    type: NotificationType.SYSTEM,
    message: `System will be down on ${maintenanceData.date} from ${maintenanceData.startTime} to ${maintenanceData.endTime}`,
  });

  return true;
}
```

---

### **Example 6: User Module - Welcome New User**

```typescript
// user.service.ts
import { enqueueNotification } from '../../helpers/notification.helper';
import { NotificationType } from '../modules/notification.module/notification.schema';

async registerUser(userData: RegisterUserDto) {
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

### **Function: enqueueNotification**

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

### **Function: sendNotification**

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

### **Function: broadcastToRole**

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

### **Function: broadcastToAll**

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

// ❌ Bad - Blocking main flow (use only for urgent)
await sendNotification({...});
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

### **4. Handle Failures Gracefully**

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

## 🔍 Debugging

### **Check if Notification Service is Initialized**

```typescript
// In any file
import { setNotificationService } from './helpers/notification.helper';

// Check if initialized
if (!notificationServiceInstance) {
  console.warn('⚠️ Notification service not initialized!');
  console.warn('Check if NotificationModule is imported in AppModule');
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

## 📝 Migration from Old System

### **Old (Express.js)**:

```typescript
// Old enqueueWebNotification
enqueueWebNotification(
  'New Task',           // title
  senderId,            // senderId
  receiverId,          // receiverId
  receiverRole,        // receiverRole
  'task',              // type
  taskId,              // idOfType
  'task',              // linkFor
  taskId               // linkId
);
```

### **New (NestJS)**:

```typescript
// New enqueueNotification
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

**Benefits**:
- ✅ Type-safe (TypeScript)
- ✅ Named parameters (easier to read)
- ✅ Better error handling
- ✅ More flexible (delay, message, etc.)

---

## 🎉 Summary

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

### **Files Created**:

1. ✅ `helpers/notification.helper.ts` - Global helper functions
2. ✅ `helpers/NOTIFICATION-HELPER-GUIDE.md` - Complete guide
3. ✅ `modules/notification.module/notification.module.ts` - Updated with initialization

---

**Created**: 26-03-23  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready  
**Version**: 1.0

---

**Ready to send notifications from anywhere! 🚀**
