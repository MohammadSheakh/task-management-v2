# 📬 Chapter 3: Notification Types & Priorities

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Beginner
**Prerequisites**: Chapter 1 (Overview), Chapter 2 (Architecture)

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ All notification types and their use cases
- ✅ Priority levels and when to use each
- ✅ Channel selection strategy
- ✅ Activity types for live feed
- ✅ How to choose the right type and priority
- ✅ Real-world examples for each type

---

## 📊 Notification Types Overview

The system supports **8 notification types**:

```typescript
enum NotificationType {
  TASK = 'task',           // Task-related activities
  GROUP = 'group',         // Group-related activities
  SYSTEM = 'system',       // System announcements
  REMINDER = 'reminder',   // Task reminders
  MENTION = 'mention',     // When mentioned
  ASSIGNMENT = 'assignment', // Task assigned
  DEADLINE = 'deadline',   // Deadline alerts
  CUSTOM = 'custom',       // Custom notifications
}
```

---

## 🔔 Type 1: Task Notifications

### **Purpose**: Notify users about task-related activities

### **Use Cases**:
- Task created
- Task started
- Task updated
- Task completed
- Task deleted
- Subtask completed

### **Example**:

```json
{
  "type": "task",
  "priority": "normal",
  "title": "Task Completed",
  "subTitle": "John completed 'Math Homework'",
  "data": {
    "activityType": "task_completed",
    "taskId": "task123",
    "taskTitle": "Math Homework",
    "actor": {
      "userId": "user123",
      "name": "John"
    }
  },
  "linkFor": "task",
  "linkId": "task123",
  "channels": ["in_app"]
}
```

### **When to Use**:
- ✅ Any task activity
- ✅ Show in live activity feed
- ✅ Notify group members

### **Priority Guide**:
- `low`: Task created/updated
- `normal`: Task started, subtask completed
- `high`: Task completed
- `urgent`: Task deleted (critical)

---

## 👥 Type 2: Group Notifications

### **Purpose**: Notify users about group-related activities

### **Use Cases**:
- Member joined group
- Member left group
- Comment added
- Attachment added
- Group settings changed

### **Example**:

```json
{
  "type": "group",
  "priority": "normal",
  "title": "New Member Joined",
  "subTitle": "Sarah joined the group",
  "data": {
    "activityType": "member_joined",
    "groupId": "group123",
    "actor": {
      "userId": "user456",
      "name": "Sarah"
    }
  },
  "linkFor": "group",
  "linkId": "group123",
  "channels": ["in_app"]
}
```

### **When to Use**:
- ✅ Group membership changes
- ✅ Group activities
- ✅ Group notifications

### **Priority Guide**:
- `low`: Comment added, attachment added
- `normal`: Member joined/left
- `high`: Group settings changed
- `urgent`: Group deleted

---

## 🖥️ Type 3: System Notifications

### **Purpose**: System-wide announcements and alerts

### **Use Cases**:
- System maintenance
- Policy updates
- Security alerts
- Announcements
- Feature updates

### **Example**:

```json
{
  "type": "system",
  "priority": "high",
  "title": "Scheduled Maintenance",
  "subTitle": "System will be down on March 30, 2:00-4:00 AM",
  "data": {
    "maintenanceDate": "2026-03-30T02:00:00Z",
    "duration": "2 hours"
  },
  "channels": ["in_app", "email"]
}
```

### **When to Use**:
- ✅ System-wide announcements
- ✅ Important updates
- ✅ Security notifications

### **Priority Guide**:
- `low`: Feature updates
- `normal`: Policy updates
- `high`: Scheduled maintenance
- `urgent`: Security alerts, outages

---

## ⏰ Type 4: Reminder Notifications

### **Purpose**: Task reminders and scheduled alerts

### **Use Cases**:
- Before deadline (24h, 1h)
- At deadline
- After deadline (overdue)
- Custom reminders

### **Example**:

```json
{
  "type": "reminder",
  "priority": "high",
  "title": "Task Reminder",
  "subTitle": "Your task is due in 24 hours",
  "data": {
    "taskId": "task123",
    "taskTitle": "Math Homework",
    "reminderType": "before_deadline",
    "hoursBefore": 24
  },
  "linkFor": "task",
  "linkId": "task123",
  "channels": ["in_app", "email"],
  "scheduledFor": "2026-03-27T14:00:00Z"
}
```

### **When to Use**:
- ✅ Deadline reminders
- ✅ Scheduled notifications
- ✅ Time-sensitive alerts

### **Priority Guide**:
- `normal`: Custom reminders
- `high`: Before deadline (24h, 1h)
- `urgent`: At deadline, overdue

---

## 📝 Type 5: Mention Notifications

### **Purpose**: When user is mentioned in comments/tasks

### **Use Cases**:
- Mentioned in comment
- Mentioned in task description
- Tagged in discussion

### **Example**:

```json
{
  "type": "mention",
  "priority": "normal",
  "title": "You were mentioned",
  "subTitle": "John mentioned you in a comment",
  "data": {
    "taskId": "task123",
    "commentId": "comment456",
    "actor": {
      "userId": "user123",
      "name": "John"
    }
  },
  "linkFor": "task",
  "linkId": "task123",
  "channels": ["in_app", "push"]
}
```

### **When to Use**:
- ✅ User mentions
- ✅ Tags
- ✅ Direct references

### **Priority Guide**:
- `normal`: Standard mentions
- `high`: Multiple mentions
- `urgent`: Mass mentions (spam protection)

---

## 📋 Type 6: Assignment Notifications

### **Purpose**: When user is assigned to a task

### **Use Cases**:
- Task assigned to user
- User removed from task
- Assignment changed

### **Example**:

```json
{
  "type": "assignment",
  "priority": "normal",
  "title": "New Task Assigned",
  "subTitle": "You have been assigned a new task",
  "data": {
    "taskId": "task123",
    "taskTitle": "Math Homework",
    "assignedBy": {
      "userId": "user789",
      "name": "Teacher"
    }
  },
  "linkFor": "task",
  "linkId": "task123",
  "channels": ["in_app", "email"]
}
```

### **When to Use**:
- ✅ New task assignments
- ✅ Assignment changes
- ✅ Task delegation

### **Priority Guide**:
- `normal`: Standard assignment
- `high`: Urgent assignment
- `urgent`: Last-minute assignment

---

## ⚠️ Type 7: Deadline Notifications

### **Purpose**: Deadline-related alerts

### **Use Cases**:
- Deadline approaching
- Deadline reached
- Deadline passed (overdue)

### **Example**:

```json
{
  "type": "deadline",
  "priority": "urgent",
  "title": "Task Overdue",
  "subTitle": "The deadline for 'Math Homework' has passed",
  "data": {
    "taskId": "task123",
    "taskTitle": "Math Homework",
    "deadline": "2026-03-26T23:59:59Z",
    "isOverdue": true
  },
  "linkFor": "task",
  "linkId": "task123",
  "channels": ["in_app", "email", "push"]
}
```

### **When to Use**:
- ✅ Deadline alerts
- ✅ Overdue notifications
- ✅ Time-critical tasks

### **Priority Guide**:
- `high`: Deadline approaching (24h)
- `urgent`: Deadline reached, overdue

---

## 🎨 Type 8: Custom Notifications

### **Purpose**: Custom notifications for special cases

### **Use Cases**:
- Third-party integrations
- Custom workflows
- Special events

### **Example**:

```json
{
  "type": "custom",
  "priority": "normal",
  "title": "Achievement Unlocked",
  "subTitle": "You completed 10 tasks this week!",
  "data": {
    "achievementType": "weekly_warrior",
    "count": 10
  },
  "channels": ["in_app"]
}
```

### **When to Use**:
- ✅ Custom events
- ✅ Achievements
- ✅ Special notifications

### **Priority Guide**:
- Define based on use case

---

## 🎯 Priority Levels Explained

### **Priority 1: Low** 🔵

**Use For**:
- Informational updates
- Non-urgent notifications
- Background activities

**Examples**:
- Task created (not urgent)
- Comment added
- Attachment added
- Feature updates

**Delivery**:
- In-app only
- No push/email
- Batch with other low priority

---

### **Priority 2: Normal** 🟢

**Use For**:
- Standard notifications
- Regular updates
- Expected activities

**Examples**:
- Task assigned
- Member joined
- Task started
- Standard mentions

**Delivery**:
- In-app (default)
- Email (optional)
- Standard delivery speed

---

### **Priority 3: High** 🟡

**Use For**:
- Important notifications
- Time-sensitive updates
- Action required

**Examples**:
- Task completed (show in feed)
- Deadline approaching (24h)
- Group settings changed
- Urgent assignment

**Delivery**:
- In-app + Email
- Faster delivery
- Prominent display

---

### **Priority 4: Urgent** 🔴

**Use For**:
- Critical notifications
- Immediate action required
- Security alerts

**Examples**:
- Task overdue
- Deadline reached
- Security breach
- System outage

**Delivery**:
- In-app + Email + Push + SMS
- Immediate delivery
- Maximum visibility
- Bypass quiet hours

---

## 📡 Channel Selection Strategy

### **Channel 1: In-App** 📱

**Best For**:
- All notifications
- Real-time updates
- Interactive notifications

**When to Use**:
- ✅ User is online
- ✅ Non-urgent updates
- ✅ Activity feed items

**Cost**: Free
**Delivery**: Instant (<100ms)

---

### **Channel 2: Email** 📧

**Best For**:
- Important notifications
- Summaries
- Users who are offline

**When to Use**:
- ✅ High/urgent priority
- ✅ Scheduled reminders
- ✅ Daily/weekly digests

**Cost**: ~$0.001 per email
**Delivery**: 1-5 seconds

---

### **Channel 3: Push** 📳

**Best For**:
- Time-sensitive notifications
- Mobile users
- Re-engagement

**When to Use**:
- ✅ Urgent notifications
- ✅ Mentions
- ✅ Assignments
- ✅ Deadlines

**Cost**: Free (FCM)
**Delivery**: <1 second

---

### **Channel 4: SMS** 📞

**Best For**:
- Critical alerts only
- Emergency notifications
- Users without internet

**When to Use**:
- ✅ Urgent priority only
- ✅ Security alerts
- ✅ Critical deadlines

**Cost**: ~$0.0075 per SMS
**Delivery**: <10 seconds

---

## 🎯 Channel Selection Matrix

| Type | Low | Normal | High | Urgent |
|------|-----|--------|------|--------|
| **Task** | In-app | In-app | In-app + Email | In-app + Email + Push |
| **Group** | In-app | In-app | In-app + Email | In-app + Email |
| **System** | Email | Email | Email + Push | Email + Push + SMS |
| **Reminder** | - | Email | Email + Push | Email + Push + SMS |
| **Mention** | - | In-app | In-app + Push | In-app + Push + SMS |
| **Assignment** | - | In-app + Email | In-app + Email + Push | All channels |
| **Deadline** | - | Email | Email + Push | All channels |
| **Custom** | In-app | In-app | In-app + Email | Based on use case |

---

## 🧪 Testing Different Types

### **Test Task Notification**:

```bash
curl -X POST http://localhost:5000/notifications/bulk \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user123"],
    "title": "Task Completed",
    "subTitle": "John completed Math Homework",
    "type": "task",
    "priority": "high",
    "channels": ["in_app"],
    "data": {
      "activityType": "task_completed",
      "taskId": "task123"
    }
  }'
```

---

### **Test Reminder**:

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

---

## 📝 Summary

### **What We Learned:**

1. ✅ **8 Notification Types**: task, group, system, reminder, mention, assignment, deadline, custom
2. ✅ **4 Priority Levels**: low, normal, high, urgent
3. ✅ **4 Delivery Channels**: in_app, email, push, sms
4. ✅ **Channel Selection Matrix**: When to use which channel
5. ✅ **Activity Types**: 10 different activity types for live feed
6. ✅ **Real-world Examples**: Examples for each type

### **Quick Reference:**

| Type | Use For | Priority | Channels |
|------|---------|----------|----------|
| **task** | Task activities | normal-high | in_app |
| **group** | Group activities | normal | in_app |
| **system** | Announcements | high-urgent | email+push |
| **reminder** | Reminders | high-urgent | email+push |
| **mention** | User mentions | normal-high | in_app+push |
| **assignment** | Task assignments | normal-high | in_app+email |
| **deadline** | Deadline alerts | high-urgent | all channels |
| **custom** | Custom events | varies | varies |

### **Next Chapter:**

→ [Chapter 4: Creating Notifications](./LEARN_NOTIFICATION_04_CREATING.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
