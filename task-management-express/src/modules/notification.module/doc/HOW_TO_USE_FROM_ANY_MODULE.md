# 📬 How to Use Notification Module from Any Module

**Version**: 1.0  
**Date**: 26-03-23  
**Purpose**: Teach how to use notification.module from any new module (Blog, Chat, etc.)  

---

## 🎯 Your Question

> "I have `enqueueWebNotification` that I can call from anywhere to send notifications.  
> You created `notification.module` that is more robust.  
> **How do I use it from any new module?** (e.g., Blog module to notify admin + followers)"

---

## 📊 Comparison: Old vs New

### **Old Way: `enqueueWebNotification`** ✅

```typescript
// Import from services folder
import { enqueueWebNotification } from '../../../services/notification.service';

// Use from anywhere (e.g., blog.service.ts)
await enqueueWebNotification(
  'New Blog Published',    // title
  userId,                  // senderId
  followerId,              // receiverId
  null,                    // receiverRole (null for specific user)
  'custom' as TNotificationType,  // type
  blogId,                  // idOfType (ObjectId)
  'blog',                  // linkFor
  blogId                   // linkId
);
```

**Pros**:
- ✅ Simple function call
- ✅ Can use from anywhere
- ✅ Async via BullMQ

**Cons**:
- ❌ Limited functionality (only enqueue)
- ❌ No caching
- ❌ No read/unread tracking
- ❌ No bulk sending
- ❌ No activity feed

---

### **New Way: `notification.module`** ✅

```typescript
// Import notification service
import { NotificationService } from '../../../modules/notification.module/notification/notification.service';

// Create instance (or inject via DI in controllers)
const notificationService = new NotificationService();

// Use from anywhere (e.g., blog.service.ts)
await notificationService.createNotification({
  receiverId: new Types.ObjectId(followerId),
  senderId: new Types.ObjectId(userId),
  title: 'New Blog Published',
  subTitle: `${userName} published a new blog`,
  type: 'custom',
  priority: 'normal',
  channels: ['in_app'],
  linkFor: 'blog',
  linkId: new Types.ObjectId(blogId),
  referenceFor: 'blog',
  referenceId: new Types.ObjectId(blogId),
  data: {
    blogId: blogId.toString(),
    blogTitle: blogData.title,
    activityType: 'blog_published',
  }
});
```

**Pros**:
- ✅ **More robust** (full notification system)
- ✅ **Redis caching** (fast unread counts)
- ✅ **Read/unread tracking**
- ✅ **Bulk sending** (send to multiple users)
- ✅ **Activity feed** (live activity tracking)
- ✅ **Multi-channel** (in-app, email, push, SMS)
- ✅ **Scheduled notifications** (reminders)
- ✅ **Priority levels** (low, normal, high, urgent)

**Cons**:
- ⚠️ Slightly more code (but more powerful)

---

## 🚀 Complete Example: Blog Module

### **Scenario**: User publishes blog → Notify followers + Notify admins

```typescript
// ========== blog.service.ts ==========
import { NotificationService } from '../../../modules/notification.module/notification/notification.service';
import { NotificationPriority, NotificationChannel } from '../../../modules/notification.module/notification/notification.constant';
import { Types } from 'mongoose';

export class BlogService {
  private notificationService = new NotificationService();

  /**
   * Publish blog and notify followers + admins
   */
  async publishBlog(userId: string, blogData: any) {
    // Step 1: Create blog
    const blog = await this.blogModel.create({
      ...blogData,
      authorId: userId,
      publishedAt: new Date(),
    });

    // Step 2: Get all followers of the author
    const followers = await this.followerModel.find({
      followingId: userId,
    }).select('followerId').lean();

    // Step 3: Notify each follower using notification.module
    const notificationPromises = followers.map(follower =>
      this.notificationService.createNotification({
        receiverId: new Types.ObjectId(follower.followerId),
        senderId: new Types.ObjectId(userId),
        title: 'New Blog Published',
        subTitle: `${blogData.authorName} published: ${blogData.title}`,
        type: 'custom',
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_APP],
        linkFor: 'blog',
        linkId: blog._id,
        referenceFor: 'blog',
        referenceId: blog._id,
        data: {
          blogId: blog._id.toString(),
          blogTitle: blogData.title,
          activityType: 'blog_published',
        }
      })
    );

    // Execute all notifications in parallel
    await Promise.all(notificationPromises);
    console.log(`📬 Notified ${followers.length} followers`);

    // Step 4: Notify all admins for review
    await this.notificationService.createNotification({
      receiverRole: 'admin',  // 👈 Send to all admins
      senderId: new Types.ObjectId(userId),
      title: 'New Blog for Review',
      subTitle: `${blogData.authorName} published a blog that needs review`,
      type: 'system',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'blog',
      linkId: blog._id,
      referenceFor: 'blog',
      referenceId: blog._id,
      data: {
        blogId: blog._id.toString(),
        requiresReview: true,
      }
    });
    console.log('📢 Notified all admins');

    return blog;
  }
}
```

---

## 📖 Step-by-Step Guide

### **Step 1: Import NotificationService**

```typescript
import { NotificationService } from '../../../modules/notification.module/notification/notification.service';
```

**Path explanation**:
- `../../../` - Go up 3 folders (from your module to root)
- `modules/notification.module/notification/` - notification.module folder
- `notification.service` - The service file

---

### **Step 2: Create Instance**

```typescript
// In your service class
export class BlogService {
  private notificationService = new NotificationService();
  
  // ... your methods
}
```

**Or in controllers** (if using dependency injection):
```typescript
constructor(private notificationService: NotificationService) {}
```

---

### **Step 3: Call createNotification**

```typescript
await this.notificationService.createNotification({
  // Who receives it
  receiverId: new Types.ObjectId(followerId),  // Specific user
  // OR
  receiverRole: 'admin',  // All users with this role
  
  // Who sent it
  senderId: new Types.ObjectId(userId),
  
  // What it says
  title: 'New Blog Published',
  subTitle: `${userName} published: ${blogData.title}`,
  
  // Type & Priority
  type: 'custom',  // or 'task', 'system', 'reminder', etc.
  priority: NotificationPriority.NORMAL,
  
  // How to deliver
  channels: [NotificationChannel.IN_APP],
  
  // Link for navigation
  linkFor: 'blog',
  linkId: new Types.ObjectId(blogId),
  
  // Reference tracking
  referenceFor: 'blog',
  referenceId: new Types.ObjectId(blogId),
  
  // Additional data
  data: {
    blogId: blogId.toString(),
    blogTitle: blogData.title,
  }
});
```

---

## 🎯 More Examples

### **Example 1: Notify Single User**

```typescript
// Notify blog author when someone comments
await this.notificationService.createNotification({
  receiverId: new Types.ObjectId(blogAuthorId),
  senderId: new Types.ObjectId(commenterId),
  title: 'New Comment on Your Blog',
  subTitle: `${commenterName} commented on "${blogTitle}"`,
  type: 'custom',
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP],
  linkFor: 'blog',
  linkId: new Types.ObjectId(blogId),
  data: {
    commentId: commentId.toString(),
    blogId: blogId.toString(),
  }
});
```

---

### **Example 2: Notify Multiple Users (Bulk)**

```typescript
// Notify all followers at once
await this.notificationService.sendBulkNotification({
  userIds: followerIds,  // Array of follower IDs
  title: 'New Blog Published',
  subTitle: `${userName} published a new blog`,
  type: 'custom',
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP],
  linkFor: 'blog',
  linkId: new Types.ObjectId(blogId),
  data: {
    blogId: blogId.toString(),
  }
});
```

---

### **Example 3: Notify Role (All Admins)**

```typescript
// Notify all admins
await this.notificationService.createNotification({
  receiverRole: 'admin',  // 👈 Sends to all admins
  senderId: new Types.ObjectId(userId),
  title: 'Blog Reported',
  subTitle: `A blog has been reported by ${reporterName}`,
  type: 'system',
  priority: NotificationPriority.HIGH,
  channels: [NotificationChannel.IN_APP],
  linkFor: 'blog',
  linkId: new Types.ObjectId(blogId),
  data: {
    blogId: blogId.toString(),
    reportReason: 'inappropriate',
  }
});
```

---

### **Example 4: Scheduled Notification**

```typescript
// Send reminder in 24 hours
const reminderTime = new Date(Date.now() + 24 * 60 * 60 * 1000);

await this.notificationService.createNotification(
  {
    receiverId: new Types.ObjectId(userId),
    title: 'Blog Draft Reminder',
    subTitle: 'You have a draft blog that needs to be published',
    type: 'reminder',
    priority: NotificationPriority.NORMAL,
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    linkFor: 'blog',
    linkId: new Types.ObjectId(draftBlogId),
  },
  reminderTime  // 👈 Schedule for later
);
```

---

## 🔧 Notification Types

```typescript
// Available types from notification.constant.ts
type: 'task'         // Task-related
type: 'group'        // Group-related
type: 'system'       // System announcements
type: 'reminder'     // Reminders
type: 'mention'      // User mentions
type: 'assignment'   // Task assignments
type: 'deadline'     // Deadline alerts
type: 'custom'       // Custom (use for blogs, chat, etc.)
```

---

## 🎯 Priority Levels

```typescript
// Available priorities
priority: NotificationPriority.LOW      // Informational
priority: NotificationPriority.NORMAL   // Standard notifications
priority: NotificationPriority.HIGH     // Important
priority: NotificationPriority.URGENT   // Critical
```

---

## 📡 Delivery Channels

```typescript
// Available channels
channels: [NotificationChannel.IN_APP]   // In-app notification
channels: [NotificationChannel.EMAIL]    // Email
channels: [NotificationChannel.PUSH]     // Push notification
channels: [NotificationChannel.SMS]      // SMS

// Multiple channels
channels: [
  NotificationChannel.IN_APP,
  NotificationChannel.EMAIL
]
```

---

## 🧪 Complete Blog Module Example

```typescript
// ========== blog.service.ts ==========
import { NotificationService } from '../../../modules/notification.module/notification/notification.service';
import { NotificationPriority, NotificationChannel } from '../../../modules/notification.module/notification/notification.constant';
import { Types } from 'mongoose';

export class BlogService {
  private notificationService = new NotificationService();

  /**
   * Publish blog and notify everyone
   */
  async publishBlog(userId: string, blogData: any) {
    // 1. Create blog
    const blog = await this.blogModel.create({
      title: blogData.title,
      content: blogData.content,
      authorId: userId,
      publishedAt: new Date(),
      status: 'published',
    });

    // 2. Get author info
    const author = await this.userModel.findById(userId);

    // 3. Get all followers
    const followers = await this.followerModel.find({
      followingId: userId,
    }).select('followerId').lean();

    // 4. Notify followers
    if (followers.length > 0) {
      await this.notificationService.sendBulkNotification({
        userIds: followers.map(f => f.followerId.toString()),
        title: 'New Blog Published',
        subTitle: `${author.name} published: ${blogData.title}`,
        type: 'custom',
        priority: NotificationPriority.NORMAL,
        channels: [NotificationChannel.IN_APP],
        linkFor: 'blog',
        linkId: blog._id,
        data: {
          blogId: blog._id.toString(),
          blogTitle: blogData.title,
          authorId: userId,
        }
      });
      console.log(`📬 Notified ${followers.length} followers`);
    }

    // 5. Notify admins for review
    await this.notificationService.createNotification({
      receiverRole: 'admin',
      senderId: new Types.ObjectId(userId),
      title: 'New Blog Published',
      subTitle: `${author.name} published a blog: ${blogData.title}`,
      type: 'system',
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'blog',
      linkId: blog._id,
      referenceFor: 'blog',
      referenceId: blog._id,
      data: {
        blogId: blog._id.toString(),
        authorName: author.name,
      }
    });
    console.log('📢 Notified all admins');

    // 6. Record activity (for activity feed)
    await this.notificationService.recordGroupActivity(
      'global',  // groupId (or use specific group)
      userId,
      'blog_published' as any,
      {
        taskId: blog._id.toString(),
        taskTitle: blogData.title,
      }
    );

    return blog;
  }

  /**
   * Delete blog and notify author
   */
  async deleteBlog(blogId: string, deletedBy: string) {
    // 1. Get blog
    const blog = await this.blogModel.findById(blogId);

    // 2. Delete blog
    await this.blogModel.findByIdAndDelete(blogId);

    // 3. Notify author
    await this.notificationService.createNotification({
      receiverId: blog.authorId,
      senderId: new Types.ObjectId(deletedBy),
      title: 'Blog Deleted',
      subTitle: `Your blog "${blog.title}" has been deleted`,
      type: 'system',
      priority: NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'blogs',
      data: {
        blogId: blog._id.toString(),
        blogTitle: blog.title,
        deletedBy: deletedBy,
      }
    });
    console.log('📬 Author notified about blog deletion');

    return true;
  }
}
```

---

## 📝 Summary

### **How to Use notification.module from Any Module**:

1. **Import** `NotificationService`
2. **Create instance**: `new NotificationService()`
3. **Call** `createNotification({...})`
4. **Provide** receiver, title, type, link, etc.

### **Comparison**:

| Feature | `enqueueWebNotification` | `notification.module` |
|---------|-------------------------|----------------------|
| **Send to user** | ✅ Yes | ✅ Yes |
| **Send to role** | ✅ Yes | ✅ Yes |
| **Bulk send** | ❌ No | ✅ Yes |
| **Caching** | ❌ No | ✅ Yes (Redis) |
| **Read/Unread** | ❌ No | ✅ Yes |
| **Activity Feed** | ❌ No | ✅ Yes |
| **Scheduled** | ❌ No | ✅ Yes |
| **Multi-channel** | ❌ No | ✅ Yes (4 channels) |
| **Priority** | ❌ No | ✅ Yes (4 levels) |

### **Recommendation**:

- ✅ Use `notification.module` for **new modules** (Blog, Chat, etc.)
- ✅ More robust and feature-rich
- ✅ Better performance (caching)
- ✅ Better user experience (read/unread, activity feed)

---

**Created**: 26-03-23  
**Author**: Qwen Code Assistant  
**Status**: ✅ Educational Guide  
**Version**: 1.0

---

**Ready to use notification.module from any module! 🚀**
