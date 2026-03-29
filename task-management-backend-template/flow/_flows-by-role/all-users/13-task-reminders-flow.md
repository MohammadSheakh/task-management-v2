# 💳 API Flow: Task Reminders

**Role:** All Users (Common, Business)  
**Figma Reference:** `app-user/group-children-user/edit-update-task-flow.png`  
**Module:** Task Reminder (Notification Module)  
**Date:** 15-03-26  
**Version:** 1.0 - Complete Flow  

---

## 🎯 User Journey Overview

```
┌─────────────────────────────────────────────────────────────┐
│              TASK REMINDER FLOW                             │
├─────────────────────────────────────────────────────────────┤
│  1. View Task → Task Details Screen                         │
│  2. Add Reminder → Set Reminder Time                        │
│  3. Choose Type → Before/At/After Deadline or Custom        │
│  4. Set Frequency → Once/Daily/Weekly/Monthly               │
│  5. Select Channels → In-App/Email/Push/SMS                 │
│  6. Receive Reminder → Notification Arrives                 │
│  7. Manage Reminders → View/Cancel                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Flow 1: Create Task Reminder

### Screen: Task Details → Add Reminder

**Figma:** `app-user/group-children-user/edit-update-task-flow.png`

### Step 1: Create Reminder

```http
POST /v1/task-reminders/
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "taskId": "task123",
  "reminderTime": "2026-03-20T08:00:00Z",
  "triggerType": "before_deadline",
  "frequency": "once",
  "customMessage": "Don't forget to complete this task!",
  "channels": ["in_app", "push"]
}
```

**Request Body:**
- `taskId` (required): ID of the task
- `reminderTime` (required): ISO 8601 datetime
- `triggerType` (optional): 
  - `before_deadline` - Before task deadline
  - `at_deadline` - At task deadline
  - `after_deadline` - After task deadline
  - `custom_time` - Custom specified time
  - `recurring` - Recurring reminder
- `frequency` (optional):
  - `once` - One-time reminder
  - `daily` - Daily reminder
  - `weekly` - Weekly reminder
  - `monthly` - Monthly reminder
- `customMessage` (optional): Custom message (max 500 chars)
- `channels` (optional): Notification channels
  - `in_app` - In-app notification
  - `email` - Email notification
  - `push` - Push notification
  - `sms` - SMS notification

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "reminder001",
    "taskId": "task123",
    "userId": "user001",
    "reminderTime": "2026-03-20T08:00:00Z",
    "triggerType": "before_deadline",
    "frequency": "once",
    "customMessage": "Don't forget to complete this task!",
    "channels": ["in_app", "push"],
    "status": "pending",
    "createdAt": "2026-03-15T10:00:00Z"
  },
  "message": "Reminder created successfully"
}
```

---

## 📍 Flow 2: Get Reminders for Task

### Screen: Task Details → View All Reminders

**Figma:** `app-user/group-children-user/edit-update-task-flow.png`

### Step 1: Get Task Reminders

```http
GET /v1/task-reminders/task/{{taskId}}?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `sortBy` (optional): Sort field (default: -createdAt)

**Response:**
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "_id": "reminder001",
        "taskId": "task123",
        "reminderTime": "2026-03-20T08:00:00Z",
        "triggerType": "before_deadline",
        "frequency": "once",
        "customMessage": "Don't forget to complete this task!",
        "channels": ["in_app", "push"],
        "status": "pending",
        "createdAt": "2026-03-15T10:00:00Z"
      },
      {
        "_id": "reminder002",
        "taskId": "task123",
        "reminderTime": "2026-03-20T20:00:00Z",
        "triggerType": "at_deadline",
        "frequency": "once",
        "channels": ["email"],
        "status": "pending",
        "createdAt": "2026-03-15T10:05:00Z"
      }
    ],
    "totalPages": 1,
    "page": 1,
    "limit": 10,
    "total": 2
  }
}
```

---

## 📍 Flow 3: Get My Reminders

### Screen: Home → Reminder Notifications / Reminder List

**Figma:** `app-user/group-children-user/home-flow.png`

### Step 1: Get All My Reminders

```http
GET /v1/task-reminders/my?status=pending&frequency=once&page=1&limit=20
Authorization: Bearer {{accessToken}}
```

**Query Parameters:**
- `status` (optional): Filter by status
  - `pending` - Pending reminders
  - `sent` - Sent reminders
  - `cancelled` - Cancelled reminders
- `frequency` (optional): Filter by frequency
  - `once`, `daily`, `weekly`, `monthly`
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "_id": "reminder001",
        "taskId": "task123",
        "taskTitle": "Complete Math Homework",
        "reminderTime": "2026-03-20T08:00:00Z",
        "triggerType": "before_deadline",
        "frequency": "once",
        "channels": ["in_app", "push"],
        "status": "pending",
        "timeUntilReminder": "5 days"
      }
    ],
    "totalPages": 1,
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## 📍 Flow 4: Cancel Reminder

### Screen: Reminder Details → Cancel

### Step 1: Cancel Single Reminder

```http
DELETE /v1/task-reminders/{{reminderId}}
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "reminder001",
    "status": "cancelled",
    "cancelledAt": "2026-03-15T11:00:00Z"
  },
  "message": "Reminder cancelled successfully"
}
```

---

## 📍 Flow 5: Cancel All Reminders for Task

### Screen: Task Details → Cancel All Reminders

**Figma:** `app-user/group-children-user/edit-update-task-flow.png`

### Step 1: Cancel All Task Reminders

```http
POST /v1/task-reminders/task/{{taskId}}/cancel-all
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task123",
    "cancelledCount": 3,
    "message": "All reminders for this task have been cancelled"
  },
  "message": "All reminders cancelled successfully"
}
```

---

## 📊 API Endpoint Summary

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/task-reminders/` | POST | Create reminder | 10/min |
| `/task-reminders/task/:id` | GET | Get task reminders | 100/min |
| `/task-reminders/my` | GET | Get my reminders | 100/min |
| `/task-reminders/:id` | DELETE | Cancel reminder | 100/min |
| `/task-reminders/task/:id/cancel-all` | POST | Cancel all | 100/min |

---

## 🔔 Reminder Trigger Types

### Before Deadline
```json
{
  "triggerType": "before_deadline",
  "reminderTime": "2026-03-20T08:00:00Z",  // 8 AM on deadline day
  "customMessage": "Task due today!"
}
```

### At Deadline
```json
{
  "triggerType": "at_deadline",
  "reminderTime": "2026-03-20T23:59:00Z",  // Deadline time
  "customMessage": "Task deadline is now!"
}
```

### Custom Time
```json
{
  "triggerType": "custom_time",
  "reminderTime": "2026-03-18T10:00:00Z",  // Custom time
  "customMessage": "Time to work on this task"
}
```

### Recurring
```json
{
  "triggerType": "recurring",
  "reminderTime": "2026-03-16T09:00:00Z",
  "frequency": "daily",
  "customMessage": "Daily task reminder"
}
```

---

**Status:** ✅ **COMPLETE**  
**Last Updated:** 15-03-26
