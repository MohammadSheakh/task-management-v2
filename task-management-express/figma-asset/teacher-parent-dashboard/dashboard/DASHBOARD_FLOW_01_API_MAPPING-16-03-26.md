# 📱 Dashboard Flow 01 - Team Overview Screen APIs

**Figma File:** `figma-asset/teacher-parent-dashboard/dashboard/dashboard-flow-01.png`  
**Screen Title:** Team Overview - Dashboard Home  
**Role:** `business` (Parent / Teacher / Primary Account)  
**Date:** 16-03-26  

---

##  SCREEN OVERVIEW

This is the **main dashboard** screen showing:
- Team members overview (5 children with task statistics)
- Task management section (filtered task list)
- Live activity feed (real-time updates)
- Notifications panel
- Permissions section

---

## 📊 SCREEN SECTIONS → APIs

### **Section 1: Header - User Profile & Search**

**UI Elements:**
- Search bar ("Search name")
- Notification bell icon
- User profile (Bashar Islam - Primary account)

**APIs:**

#### 1.1 Get User Profile
```http
GET /v1/users/profile
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part1-v4` → `01 - User Profile` → `Get My Profile`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user001",
    "name": "Bashar Islam",
    "email": "bashar@example.com",
    "role": "business",
    "profileImage": "https://...",
    "isSecondaryUser": false
  }
}
```

#### 1.2 Get Notifications Count
```http
GET /v1/notifications?limit=5&isRead=false
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `02 - Notifications` → `Get My Notifications`

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [],
    "unreadCount": 0
  },
  "message": "Notifications retrieved successfully"
}
```

---

### **Section 2: Team Overview Cards**

**UI Elements:**
- Total 05 Members count
- 5 child cards with:
  - Profile image
  - Name (Alex Morgan, Jamie Chen, Sam Rivera, Riley Park, Casey Lin)
  - Badge (Primary account / Secondary)
  - Total Task count
  - Pending Task count
  - Completed Task count

**APIs:**

#### 2.1 Get All Children/Students
```http
GET /v1/children-business-users/my-children?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `04 - Children Management` → `Get My Children`

**Response:**
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "_id": "rel001",
        "childUserId": "child001",
        "childName": "Alex Morgan",
        "email": "alex@example.com",
        "profileImage": "https://...",
        "isSecondaryUser": false,
        "status": "active"
      },
      {
        "_id": "rel002",
        "childUserId": "child002",
        "childName": "Jamie Chen",
        "email": "jamie@example.com",
        "profileImage": "https://...",
        "isSecondaryUser": true,
        "status": "active"
      },
      {
        "_id": "rel003",
        "childUserId": "child003",
        "childName": "Sam Rivera",
        "email": "sam@example.com",
        "profileImage": "https://...",
        "isSecondaryUser": true,
        "status": "active"
      },
      {
        "_id": "rel004",
        "childUserId": "child004",
        "childName": "Riley Park",
        "email": "riley@example.com",
        "profileImage": "https://...",
        "isSecondaryUser": true,
        "status": "active"
      },
      {
        "_id": "rel005",
        "childUserId": "child005",
        "childName": "Casey Lin",
        "email": "casey@example.com",
        "profileImage": "https://...",
        "isSecondaryUser": true,
        "status": "active"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

#### 2.2 Get Task Statistics for Each Child
```http
GET /v1/children-business-users/:childId/tasks/statistics
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `04 - Children Management` → `Get Child Task Statistics`

**Response (for each child):**
```json
{
  "success": true,
  "data": {
    "childId": "child001",
    "childName": "Alex Morgan",
    "totalTasks": 12,
    "pendingTasks": 10,
    "inProgressTasks": 0,
    "completedTasks": 2,
    "completionRate": 16.7
  }
}
```

**Note:** Call this endpoint 5 times (once for each child) OR use aggregated endpoint:

#### 2.3 Get All Children Task Statistics (Aggregated) ⭐ RECOMMENDED
```http
GET /v1/analytics/charts/child-progress/:businessUserId
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `03 - Analytics Charts` → `Get Child Progress Comparison`

**Response:**
```json
{
  "success": true,
  "message": "Child progress comparison with full statistics retrieved successfully",
  "data": {
    "chart": {
      "labels": ["Jamie Chen", "Alex Morgan", "Sam Rivera", "Riley Park", "Casey Lin"],
      "datasets": [{
        "label": "Completion Rate (%)",
        "data": [100, 16.7, 20, 20, 20],
        "color": "#8B5CF6"
      }]
    },
    "children": [
      {
        "childId": "child002",
        "childName": "Jamie Chen",
        "profileImage": "https://...",
        "email": "jamie@example.com",
        "isSecondaryUser": true,
        "totalTasks": 12,
        "pendingTasks": 0,
        "inProgressTasks": 0,
        "completedTasks": 12,
        "completionRate": 100
      },
      {
        "childId": "child001",
        "childName": "Alex Morgan",
        "profileImage": "https://...",
        "email": "alex@example.com",
        "isSecondaryUser": false,
        "totalTasks": 12,
        "pendingTasks": 10,
        "inProgressTasks": 0,
        "completedTasks": 2,
        "completionRate": 16.7
      },
      {
        "childId": "child003",
        "childName": "Sam Rivera",
        "profileImage": "https://...",
        "email": "sam@example.com",
        "isSecondaryUser": true,
        "totalTasks": 5,
        "pendingTasks": 4,
        "inProgressTasks": 0,
        "completedTasks": 1,
        "completionRate": 20
      },
      {
        "childId": "child004",
        "childName": "Riley Park",
        "profileImage": "https://...",
        "email": "riley@example.com",
        "isSecondaryUser": true,
        "totalTasks": 10,
        "pendingTasks": 8,
        "inProgressTasks": 0,
        "completedTasks": 2,
        "completionRate": 20
      },
      {
        "childId": "child005",
        "childName": "Casey Lin",
        "profileImage": "https://...",
        "email": "casey@example.com",
        "isSecondaryUser": true,
        "totalTasks": 10,
        "pendingTasks": 8,
        "inProgressTasks": 0,
        "completedTasks": 2,
        "completionRate": 20
      }
    ],
    "totalMembers": 5
  }
}
```

**Usage for Team Overview Cards:**
```javascript
// Display total members
document.getElementById('total-members').textContent = `Total ${data.totalMembers} Member`;

// Render each child card
data.children.forEach(child => {
  renderChildCard({
    profileImage: child.profileImage,
    name: child.childName,
    badge: child.isSecondaryUser ? 'Secondary' : 'Primary account',
    totalTasks: child.totalTasks,
    pendingTasks: child.pendingTasks,
    completedTasks: child.completedTasks
  });
});
```

---

### **Section 3: Task Management**

**UI Elements:**
- Section title: "Task Management"
- Subtitle: "Create and assign tasks to family members"
- Filter tabs: All (6) | Not Started (1) | In Progress (2) | Completed (2) | Personal Task (0)
- Task cards with:
  - Task title ("Complete Math Homework")
  - Status badge (Not Started / In Progress)
  - Task start date & time
  - Task description
  - Assigned by (Mr. Tom Alax - Secondary User)
  - Start button

**APIs:**

#### 3.1 Get All Tasks with Pagination
```http
GET /v1/tasks/paginate?page=1&limit=20&sortBy=-startTime
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part1-v4` → `02 - Task Management` → `Get My Tasks (Paginated)`

**Response:**
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
        "priority": "high",
        "taskType": "singleAssignment",
        "scheduledTime": "08:30 AM",
        "startTime": "2026-12-10T08:30:00.000Z",
        "dueDate": "2026-12-10T23:59:59.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 0,
        "completionPercentage": 0,
        "createdById": {
          "_id": "user002",
          "name": "Mr. Tom Alax",
          "email": "tom@example.com",
          "profileImage": "https://..."
        },
        "ownerUserId": {
          "_id": "user001",
          "name": "Bashar Islam",
          "email": "bashar@example.com"
        },
        "assignedUserIds": [
          {
            "_id": "child001",
            "name": "Alex Morgan",
            "email": "alex@example.com",
            "profileImage": "https://..."
          }
        ]
      },
      {
        "_id": "task002",
        "title": "Complete Math Homework",
        "description": "Finish exercises 1-10 from chapter 5",
        "status": "inProgress",
        "priority": "medium",
        "taskType": "singleAssignment",
        "scheduledTime": "08:30 AM",
        "startTime": "2026-12-10T08:30:00.000Z",
        "dueDate": "2026-12-10T23:59:59.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 1,
        "completionPercentage": 33,
        "createdById": {
          "_id": "user002",
          "name": "Mr. Tom Alax",
          "email": "tom@example.com"
        },
        "assignedUserIds": [
          {
            "_id": "child002",
            "name": "Jamie Chen",
            "email": "jamie@example.com"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "totalPages": 1
    }
  }
}
```

#### 3.2 Get Tasks by Status (Filtered)
```http
GET /v1/tasks/paginate?page=1&limit=20&status=pending
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part1-v4` → `02 - Task Management` → `Get My Tasks (Paginated)`

**Query Parameters:**
- `status=pending` → Not Started tasks
- `status=inProgress` → In Progress tasks
- `status=completed` → Completed tasks
- `taskType=personal` → Personal tasks

**Response:** (Same structure as 3.1, filtered by status)

---

### **Section 4: Live Activity Feed**

**UI Elements:**
- Section title: "Live Activity"
- Subtitle: "Real-time updates from family"
- Count: (04) activities
- Activity items:
  - User profile image
  - Name (Alax Morgn)
  - Activity text ("Jamie Chen completed 'Complete math homework'")
  - Time ago ("2 minutes ago")

**APIs:**

#### 4.1 Get Recent Activity Feed
```http
GET /v1/analytics/activity-feed?limit=10
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `03 - Analytics Charts` (or create new endpoint)

**Alternative (using TaskProgress):**
```http
GET /v1/task-progress/recent-activities?limit=10
Authorization: Bearer {{accessToken}}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "_id": "activity001",
        "type": "task_completed",
        "childId": "child002",
        "childName": "Jamie Chen",
        "taskId": "task001",
        "taskTitle": "Complete Math Homework",
        "action": "completed",
        "timestamp": "2026-03-16T10:28:00.000Z",
        "timeAgo": "2 minutes ago"
      },
      {
        "_id": "activity002",
        "type": "task_completed",
        "childId": "child002",
        "childName": "Jamie Chen",
        "taskId": "task001",
        "taskTitle": "Complete Math Homework",
        "action": "completed",
        "timestamp": "2026-03-16T10:28:00.000Z",
        "timeAgo": "2 minutes ago"
      },
      {
        "_id": "activity003",
        "type": "subtask_completed",
        "childId": "child001",
        "childName": "Alax Morgn",
        "taskId": "task002",
        "taskTitle": "Science Project",
        "subtaskTitle": "Research phase",
        "action": "completed subtask",
        "timestamp": "2026-03-16T10:25:00.000Z",
        "timeAgo": "5 minutes ago"
      }
    ],
    "total": 4
  }
}
```

#### 4.2 Real-Time Updates (Socket.IO) ⭐ RECOMMENDED

**For live activity updates, use Socket.IO:**

```javascript
// Connect to Socket.IO
const socket = io('http://localhost:5000', {
  auth: { token: accessToken }
});

// Join dashboard room
socket.emit('join:dashboard', { userId: currentUserId });

// Listen for activity updates
socket.on('activity:new', (data) => {
  console.log('New activity:', data);
  // Add to activity feed
  addActivityToFeed({
    childName: data.childName,
    action: data.action,
    taskTitle: data.taskTitle,
    timeAgo: 'Just now'
  });
});

// Listen for task completion
socket.on('task:completed', (data) => {
  console.log('Task completed:', data);
  showNotification(`${data.childName} completed "${data.taskTitle}"`);
});

// Listen for subtask completion
socket.on('subtask:completed', (data) => {
  console.log('Subtask completed:', data);
  addActivityToFeed({
    childName: data.childName,
    action: 'completed subtask',
    taskTitle: data.subtaskTitle,
    timeAgo: 'Just now'
  });
});
```

**Socket.IO Events Documentation:**
- See: `flow/_flows-by-role/parent-teacher/07-parent-dashboard-realtime-v2.md`

---

### **Section 5: Notifications Panel**

**UI Elements:**
- Notification drawer (right side)
- Header: "Notification"
- Empty state: "There's no notifications" (illustration)
- Notification list items:
  - Sender profile image
  - Sender name (Alax tom)
  - Notification text ("Complete math homework")
  - Time ago ("5 min ago")
- "View all Notifications" button

**APIs:**

#### 5.1 Get Unread Notifications
```http
GET /v1/notifications?limit=5&isRead=false
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `02 - Notifications` → `Get My Notifications`

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [],
    "unreadCount": 0,
    "pagination": {
      "page": 1,
      "limit": 5,
      "total": 0,
      "totalPages": 0
    }
  },
  "message": "Notifications retrieved successfully"
}
```

#### 5.2 Get All Notifications (for "View all")
```http
GET /v1/notifications?limit=20&page=1
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `02 - Notifications` → `Get My Notifications`

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "_id": "notif001",
        "title": "Task Assignment",
        "message": "Complete math homework",
        "senderId": {
          "_id": "user002",
          "name": "Alax tom",
          "profileImage": "https://..."
        },
        "receiverId": "user001",
        "type": "task_assigned",
        "isRead": false,
        "createdAt": "2026-03-16T10:25:00.000Z",
        "timeAgo": "5 min ago"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

---

### **Section 6: Left Sidebar - Team Member Quick List**

**UI Elements:**
- Section title: "Team Member"
- List of team members:
  - Profile image
  - Name (Alax Morgn, Sam Rivera, etc.)
  - Active tasks count ("2 active tasks")

**APIs:**

#### 6.1 Get Children with Active Task Count
```http
GET /v1/children-business-users/my-children?page=1&limit=20
Authorization: Bearer {{accessToken}}
```

**Then for each child, get active tasks:**
```http
GET /v1/tasks?assignedUserId=:childId&status=inProgress&status=pending
Authorization: Bearer {{accessToken}}
```

**Combined Response (after processing):**
```json
{
  "children": [
    {
      "childId": "child001",
      "childName": "Alax Morgn",
      "profileImage": "https://...",
      "activeTasks": 2
    },
    {
      "childId": "child002",
      "childName": "Sam Rivera",
      "profileImage": "https://...",
      "activeTasks": 2
    }
  ]
}
```

---

### **Section 7: Permissions Section**

**UI Elements:**
- Section title: "Permissions"
- Subtitle: "Allow Secondary users to create tasks"

**APIs:**

#### 7.1 Get Secondary User Permissions
```http
GET /v1/children-business-users/permissions
Authorization: Bearer {{accessToken}}
```

**Postman Location:** `01-User-Common-Part2-Charts-Progress` → `04 - Children Management` (or create new endpoint)

**Response:**
```json
{
  "success": true,
  "data": {
    "allowSecondaryUserTaskCreation": true,
    "allowSecondaryUserEditTasks": true,
    "allowSecondaryUserDeleteTasks": false,
    "requireApprovalForTaskCreation": false
  }
}
```

---

## 📋 COMPLETE API CALL SEQUENCE

### **Initial Dashboard Load (Parallel Calls):**

```javascript
// 1. Get User Profile
GET /v1/users/profile

// 2. Get All Children
GET /v1/children-business-users/my-children?page=1&limit=10

// 3. Get Children Task Statistics (Aggregated)
GET /v1/analytics/charts/child-progress-comparison

// 4. Get All Tasks (Paginated)
GET /v1/tasks/paginate?page=1&limit=20&sortBy=-startTime

// 5. Get Unread Notifications
GET /v1/notifications?limit=5&isRead=false

// 6. Get Recent Activity Feed
GET /v1/analytics/activity-feed?limit=10
```

### **After Initial Load:**

```javascript
// 7. Connect to Socket.IO for real-time updates
socket.emit('join:dashboard', { userId: currentUserId });

// 8. Listen for events
socket.on('activity:new', handleNewActivity);
socket.on('task:completed', handleTaskCompleted);
socket.on('subtask:completed', handleSubtaskCompleted);
socket.on('child:online', handleChildOnline);
socket.on('child:offline', handleChildOffline);
```

---

## 📊 API SUMMARY TABLE

| # | Section | Endpoint | Method | Postman Collection | Priority |
|---|---------|----------|--------|-------------------|----------|
| 1 | Header | `/v1/users/profile` | GET | `01-User-Common-Part1-v4` → `01 - User Profile` | 🔴 High |
| 2 | Header | `/v1/notifications?limit=5&isRead=false` | GET | `01-User-Common-Part2-Charts-Progress` → `02 - Notifications` | 🔴 High |
| 3 | Team Overview | `/v1/children-business-users/my-children` | GET | `01-User-Common-Part2-Charts-Progress` → `04 - Children Management` | 🔴 High |
| 4 | Team Overview | `/v1/analytics/charts/child-progress-comparison` | GET | `01-User-Common-Part2-Charts-Progress` → `03 - Analytics Charts` | 🔴 High |
| 5 | Task Management | `/v1/tasks/paginate?page=1&limit=20` | GET | `01-User-Common-Part1-v4` → `02 - Task Management` | 🔴 High |
| 6 | Live Activity | `/v1/analytics/activity-feed` | GET | Create new endpoint | 🟡 Medium |
| 7 | Notifications | `/v1/notifications?limit=20` | GET | `01-User-Common-Part2-Charts-Progress` → `02 - Notifications` | 🟡 Medium |
| 8 | Permissions | `/v1/children-business-users/permissions` | GET | Create new endpoint | 🟢 Low |
| 9 | Real-Time | Socket.IO Events | WebSocket | `flow/.../07-parent-dashboard-realtime-v2.md` | 🔴 High |

---

## 🎯 TESTING IN POSTMAN

### **Step 1: Import Collections**
```
✅ 00-public-auth/00-Public-Auth.postman_collection.json
✅ 01-user-common/01-User-Common-Part1-v4-CORRECTED.postman_collection.json
✅ 01-user-common/01-User-Common-Part2-Charts-Progress.postman_collection.json
```

### **Step 2: Authenticate**
```
1. Open "00-Public-Auth" collection
2. Run "Login" as business user
3. Access token auto-saved
```

### **Step 3: Test Dashboard APIs**
```
1. Open "01-User-Common-Part1-v4" collection
   - Run: Get My Profile
   - Run: Get My Tasks (Paginated)

2. Open "01-User-Common-Part2-Charts-Progress" collection
   - Run: Get My Children
   - Run: Get Child Progress Comparison
   - Run: Get My Notifications
```

---

## ✅ STATUS

| Component | Status |
|-----------|--------|
| **User Profile API** | ✅ Complete |
| **Children List API** | ✅ Complete |
| **Task Statistics API** | ✅ Complete |
| **Task List API** | ✅ Complete |
| **Notifications API** | ✅ Complete |
| **Activity Feed API** | ⚠️ Create new endpoint |
| **Permissions API** | ⚠️ Create new endpoint |
| **Socket.IO Integration** | ✅ Complete (v2.0) |

---

**Document Created:** 16-03-26  
**Figma Screen:** `dashboard-flow-01.png`  
**Total APIs Required:** 9 endpoints  
**Ready for Development:** ✅ **YES**
