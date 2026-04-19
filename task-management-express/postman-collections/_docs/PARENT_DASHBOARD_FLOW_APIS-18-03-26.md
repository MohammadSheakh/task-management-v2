# 🎯 **PARENT DASHBOARD FLOW - API MAPPING**

**Date**: 18-03-26  
**Figma File**: `teacher-parent-dashboard/dashboard/dashboard-flow-01.png`  
**Module**: Analytics + Task + Notification

---

## 📊 **VISUAL SUMMARY**

```
┌─────────────────────────────────────────────────────────────┐
│ Parent Dashboard                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Team Overview (Child Progress Comparison):                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ Alex Morgn   │ │ Jamie Chen   │ │ Sam Rivera   │       │
│  │ Total: 12    │ │ Total: 12    │ │ Total: 05    │       │
│  │ Pending: 10  │ │ Pending: 12  │ │ Pending: 04  │       │
│  │ Completed: 02│ │ Completed: 12│ │ Completed: 01│       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /analytics/charts/child-progress/:businessUserId  │
│                                                             │
│  Task Management (Get Tasks by Status):                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [All(6)] [Not Started(1)] [In Progress(2)] ...      │   │
│  │                                                     │   │
│  │ Complete Math Homework                    Not Started│   │
│  │ Complete Math Homework                    In Progress│   │
│  └─────────────────────────────────────────────────────┘   │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /tasks/dashboard/children-tasks?status=all        │
│                                                             │
│  Live Activity (Notification Feed):                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Live Activity                          (04)         │   │
│  │ ┌──────────────────────────────────────────────┐   │   │
│  │ │ Alax Morgn                                   │   │   │
│  │ │ Jamie Chen completed "Complete math homework"│   │   │
│  │ │ 2 minutes ago                                │   │   │
│  │ ├──────────────────────────────────────────────┤   │   │
│  │ │ Alax Morgn                                   │   │   │
│  │ │ Jamie Chen completed "Complete math homework"│   │   │
│  │ │ 2 minutes ago                                │   │   │
│  │ └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /notifications/dashboard/activity-feed          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 **COMPLETE API LIST**

### **3 Main APIs for Parent Dashboard:**

| # | Screen Element | API Endpoint | Method | Status |
|---|----------------|--------------|--------|--------|
| 1 | **Child Progress Comparison** (Team Overview Cards) | `/analytics/charts/child-progress/:businessUserId` | GET | ✅ EXISTS |
| 2 | **Get Tasks by Status** (Task Management List) | `/tasks/dashboard/children-tasks?status=all&taskType=children` | GET | ✅ EXISTS |
| 3 | **Live Activity Feed** (Real-time Updates) | `/notifications/dashboard/activity-feed` | GET | ✅ EXISTS |

---

## 1️⃣ **CHILD PROGRESS COMPARISON API**

### **Endpoint:**
```http
GET /analytics/charts/child-progress/:businessUserId
Authorization: Bearer {{accessToken}}
```

### **Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessUserId` | String | Optional | Parent/Teacher user ID (uses logged-in user if not provided) |

### **Response:**
```json
{
  "success": true,
  "data": {
    "children": [
      {
        "childUserId": "child001",
        "name": "Alex Morgn",
        "profileImage": "https://...",
        "totalTasks": 12,
        "pendingTasks": 10,
        "inProgressTasks": 0,
        "completedTasks": 2,
        "completionPercentage": 16.7,
        "isSecondaryUser": true
      },
      {
        "childUserId": "child002",
        "name": "Jamie Chen",
        "profileImage": "https://...",
        "totalTasks": 12,
        "pendingTasks": 0,
        "inProgressTasks": 0,
        "completedTasks": 12,
        "completionPercentage": 100,
        "isSecondaryUser": false
      },
      {
        "childUserId": "child003",
        "name": "Sam Rivera",
        "profileImage": "https://...",
        "totalTasks": 5,
        "pendingTasks": 4,
        "inProgressTasks": 0,
        "completedTasks": 1,
        "completionPercentage": 20,
        "isSecondaryUser": false
      }
    ],
    "chartData": {
      "labels": ["Alex Morgn", "Jamie Chen", "Sam Rivera", "Riley Park", "Casey Lin"],
      "datasets": [{
        "label": "Completion Rate (%)",
        "data": [16.7, 100, 20, 20, 20],
        "backgroundColor": "rgba(59, 130, 246, 0.5)",
        "borderColor": "#3B82F6",
        "borderWidth": 1
      }]
    }
  },
  "message": "Child progress comparison retrieved successfully"
}
```

### **Frontend Display:**
```
Team Overview                              Total 05 Member
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Alex Morgn 👑   │ │ Jamie Chen      │ │ Sam Rivera      │
│ Primary account │ │ Secondary       │ │ Secondary       │
│                 │ │                 │ │                 │
│ Total Task: 12  │ │ Total Task: 12  │ │ Total Task: 05  │
│ Pending Task: 10│ │ Pending Task: 12│ │ Pending Task: 04│
│ Completed Task: 02│ │ Completed Task: 12│ │ Completed Task: 01│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2️⃣ **GET TASKS BY STATUS API**

### **Endpoint:**
```http
GET /tasks/dashboard/children-tasks?status=all&taskType=children
Authorization: Bearer {{accessToken}}
```

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `status` | String | No | `all` | Filter by status: `all` | `pending` | `inProgress` | `completed` |
| `taskType` | String | No | `children` | Filter by type: `children` | `personal` |
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 20 | Items per page |
| `sortBy` | String | No | `-startTime` | Sort field |

### **Response:**
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "_id": "task001",
        "title": "Complete Math Homework",
        "description": "Finish exercises 1-10 from chapter 5",
        "status": "pending",
        "taskType": "singleAssignment",
        "scheduledTime": "08:30 AM",
        "startTime": "2026-12-10T08:30:00.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 0,
        "completionPercentage": 0,
        "assignedTo": {
          "_id": "child001",
          "name": "Alex Morgn",
          "email": "alex@example.com",
          "profileImage": "https://..."
        },
        "createdById": {
          "_id": "user123",
          "name": "Mr. Tom Alax",
          "profileImage": "https://..."
        },
        "assignedUserIds": ["child001"]
      },
      {
        "_id": "task002",
        "title": "Complete Math Homework",
        "description": "Finish exercises 1-10",
        "status": "inProgress",
        "taskType": "collaborative",
        "scheduledTime": "08:30 AM",
        "startTime": "2026-12-10T08:30:00.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 1,
        "completionPercentage": 33,
        "assignedTo": {
          "_id": "child001",
          "name": "Alex Morgn",
          "email": "alex@example.com",
          "profileImage": "https://..."
        },
        "createdById": {
          "_id": "user123",
          "name": "Mr. Tom Alax",
          "profileImage": "https://..."
        },
        "assignedUserIds": ["child001", "child002"]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "totalPages": 1
    },
    "filters": {
      "status": "all",
      "taskType": "children"
    }
  },
  "message": "Children tasks retrieved successfully for dashboard"
}
```

### **Frontend Display:**
```
Task Management
Create and assign tasks to family members

[All(6)] [Not Started(1)] [In Progress(2)] [Completed(2)] [Personal Task(0)]

┌─────────────────────────────────────────────────────────────┐
│ Complete Math Homework                         Not Started  │
│                                                             │
│ Task Start Date & Time:              12/10/2026 - 08:30 AM │
│                                                             │
│ Finish exercises 1-10 from chapter 5...                    │
│                                                             │
│ Sub-Tasks (03)                                             │
│ 1. Call with design team                                   │
│ 2. Review project milestones                               │
│ 3. Update client on progress                               │
│                                                             │
│ Assigned By: Mr. Tom Alax [Secondary User]                 │
│                                                [Start]      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ **LIVE ACTIVITY FEED API**

### **Endpoint:**
```http
GET /notifications/dashboard/activity-feed
Authorization: Bearer {{accessToken}}
```

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `limit` | Number | No | 10 | Number of activities to return |

### **Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "_id": "notif001",
        "type": "task_completed",
        "title": "Task Completed",
        "message": "Jamie Chen completed \"Complete math homework\"",
        "actor": {
          "_id": "child002",
          "name": "Jamie Chen",
          "profileImage": "https://..."
        },
        "task": {
          "_id": "task001",
          "title": "Complete math homework"
        },
        "timestamp": "2026-03-18T10:05:00.000Z",
        "timeAgo": "5 min ago",
        "isRead": false
      },
      {
        "_id": "notif002",
        "type": "task_completed",
        "title": "Task Completed",
        "message": "Jamie Chen completed \"Complete math homework\"",
        "actor": {
          "_id": "child002",
          "name": "Jamie Chen",
          "profileImage": "https://..."
        },
        "task": {
          "_id": "task001",
          "title": "Complete math homework"
        },
        "timestamp": "2026-03-18T10:03:00.000Z",
        "timeAgo": "2 minutes ago",
        "isRead": false
      },
      {
        "_id": "notif003",
        "type": "task_started",
        "title": "Task Started",
        "message": "Alex Morgn started \"UI/UX Design\"",
        "actor": {
          "_id": "child001",
          "name": "Alex Morgn",
          "profileImage": "https://..."
        },
        "task": {
          "_id": "task002",
          "title": "UI/UX Design"
        },
        "timestamp": "2026-03-18T09:30:00.000Z",
        "timeAgo": "35 min ago",
        "isRead": true
      }
    ],
    "totalCount": 4,
    "unreadCount": 2
  },
  "message": "Live activity feed retrieved successfully"
}
```

### **Frontend Display:**
```
Live Activity                               (04)
┌─────────────────────────────────────────┐
│ Alax Morgn                              │
│ Jamie Chen completed "Complete math     │
│ homework"                               │
│ 2 minutes ago                           │
├─────────────────────────────────────────┤
│ Alax Morgn                              │
│ Jamie Chen completed "Complete math     │
│ homework"                               │
│ 2 minutes ago                           │
├─────────────────────────────────────────┤
│ Alax Morgn                              │
│ Jamie Chen completed "Complete math     │
│ homework"                               │
│ 5 min ago                               │
├─────────────────────────────────────────┤
│ Alax Morgn                              │
│ Jamie Chen completed "Complete math     │
│ homework"                               │
│ 5 min ago                               │
└─────────────────────────────────────────┘
```

---

## 🧪 **COMPLETE TESTING FLOW**

### **Step 1: Get Child Progress Comparison**
```bash
# Get child progress data
GET /analytics/charts/child-progress/business123
Authorization: Bearer {{accessToken}}

→ Should return:
{
  children: [
    { name: "Alex Morgn", totalTasks: 12, completedTasks: 2, ... },
    { name: "Jamie Chen", totalTasks: 12, completedTasks: 12, ... },
    ...
  ]
}
```

### **Step 2: Get Tasks by Status**
```bash
# Get all children tasks
GET /tasks/dashboard/children-tasks?status=all&taskType=children
Authorization: Bearer {{accessToken}}

→ Should return paginated task list

# Filter by status
GET /tasks/dashboard/children-tasks?status=pending&taskType=children
Authorization: Bearer {{accessToken}}

→ Should return only pending tasks
```

### **Step 3: Get Live Activity Feed**
```bash
# Get activity feed
GET /notifications/dashboard/activity-feed?limit=10
Authorization: Bearer {{accessToken}}

→ Should return list of recent activities
```

### **Step 4: Load Complete Dashboard**
```javascript
// Frontend code example
const loadParentDashboard = async () => {
  const [progress, tasks, activity] = await Promise.all([
    api.get('/analytics/charts/child-progress/business123'),
    api.get('/tasks/dashboard/children-tasks?status=all&taskType=children'),
    api.get('/notifications/dashboard/activity-feed?limit=10')
  ]);

  // Update UI
  setChildProgress(progress.data.data);
  setTasks(tasks.data.data);
  setActivityFeed(activity.data.data);
};
```

---

## 📁 **BACKEND FILES**

### **Routes:**

**1. Chart Aggregation Routes**
- `src/modules/analytics.module/chartAggregation/chartAggregation.route.ts`
  - `GET /analytics/charts/child-progress/:businessUserId` (line 105)

**2. Task Routes**
- `src/modules/task.module/task/task.route.ts`
  - `GET /tasks/dashboard/children-tasks` (line 53)

**3. Notification Routes**
- `src/modules/notification.module/notification/notification.route.ts`
  - `GET /notifications/dashboard/activity-feed` (line 232)

### **Controllers:**

**1. Chart Aggregation Controller**
- `src/modules/analytics.module/chartAggregation/chartAggregation.controller.ts`
  - `getChildProgressComparison()` (line 112)

**2. Task Controller**
- `src/modules/task.module/task/task.controller.ts`
  - `getChildrenTasksForDashboard()` (line 484)

**3. Notification Controller**
- `src/modules/notification.module/notification/notification.controller.ts`
  - `getLiveActivityFeedForParentDashboard()` (line 609)

### **Services:**

**1. Chart Aggregation Service**
- `src/modules/analytics.module/chartAggregation/chartAggregation.service.ts`
  - `getChildProgressComparison()` (line 89)

**2. Task Service**
- `src/modules/task.module/task/task.service.ts`
  - `getChildrenTasksForDashboard()` (line 746)

**3. Notification Service**
- `src/modules/notification.module/notification/notification.service.ts`
  - `getLiveActivityFeedForParentDashboard()` (line 609)

---

## ✅ **STATUS**

| Feature | API Exists? | Tested? | Production Ready? |
|---------|-------------|---------|-------------------|
| Child Progress Comparison | ✅ | ✅ | ✅ |
| Get Tasks by Status (All) | ✅ | ✅ | ✅ |
| Get Tasks by Status (Pending) | ✅ | ✅ | ✅ |
| Get Tasks by Status (In Progress) | ✅ | ✅ | ✅ |
| Get Tasks by Status (Completed) | ✅ | ✅ | ✅ |
| Live Activity Feed | ✅ | ✅ | ✅ |

**All 3 APIs for Parent Dashboard are IMPLEMENTED and READY!** 🎉

---

## 🎨 **FRONTEND INTEGRATION GUIDE**

### **React Component Example:**

```javascript
import React, { useEffect, useState } from 'react';
import api from '../api';

const ParentDashboard = () => {
  const [childProgress, setChildProgress] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadDashboard();
  }, [statusFilter]);

  const loadDashboard = async () => {
    try {
      const [progressRes, tasksRes, activityRes] = await Promise.all([
        api.get('/analytics/charts/child-progress/business123'),
        api.get(`/tasks/dashboard/children-tasks?status=${statusFilter}&taskType=children`),
        api.get('/notifications/dashboard/activity-feed?limit=10')
      ]);

      setChildProgress(progressRes.data.data);
      setTasks(tasksRes.data.data.tasks);
      setActivityFeed(activityRes.data.data.activities);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  return (
    <div className="dashboard">
      {/* Team Overview - Child Progress */}
      <div className="team-overview">
        <h2>Team Overview</h2>
        {childProgress?.children.map(child => (
          <ChildCard
            key={child.childUserId}
            name={child.name}
            totalTasks={child.totalTasks}
            pendingTasks={child.pendingTasks}
            completedTasks={child.completedTasks}
            isSecondaryUser={child.isSecondaryUser}
          />
        ))}
      </div>

      {/* Task Management */}
      <div className="task-management">
        <h2>Task Management</h2>
        <StatusTabs
          selected={statusFilter}
          onChange={setStatusFilter}
        />
        {tasks.map(task => (
          <TaskCard
            key={task._id}
            task={task}
          />
        ))}
      </div>

      {/* Live Activity Feed */}
      <div className="live-activity">
        <h2>Live Activity ({activityFeed.length})</h2>
        {activityFeed.map(activity => (
          <ActivityItem
            key={activity._id}
            activity={activity}
          />
        ))}
      </div>
    </div>
  );
};
```

---

**Date**: 18-03-26  
**Status**: ✅ **COMPLETE**  
**Total APIs**: 3 (All Production Ready)

---
