# Analytics Module - API Documentation

## 📋 Overview

Complete API documentation for the Analytics Module with support for **user productivity analytics**, **task performance tracking**, **group analytics**, and **admin platform insights**.

**Base URL:** `{{baseUrl}}/v1`  
**Last Updated:** 10-03-26  
**Version:** 2.0

---

## 🏗️ Architecture

### Module Structure
```
src/modules/analytics.module/
├── userAnalytics/           # User Productivity Analytics
│   ├── userAnalytics.controller.ts
│   ├── userAnalytics.service.ts
│   ├── userAnalytics.interface.ts
│   └── userAnalytics.route.ts
│
├── taskAnalytics/           # Task Performance Analytics
│   ├── taskAnalytics.controller.ts
│   ├── taskAnalytics.service.ts
│   ├── taskAnalytics.interface.ts
│   └── taskAnalytics.route.ts
│
├── groupAnalytics/          # Group Analytics
│   ├── groupAnalytics.controller.ts
│   ├── groupAnalytics.service.ts
│   ├── groupAnalytics.interface.ts
│   └── groupAnalytics.route.ts
│
├── adminAnalytics/          # Admin Platform Analytics
│   ├── adminAnalytics.controller.ts
│   ├── adminAnalytics.service.ts
│   ├── adminAnalytics.interface.ts
│   └── adminAnalytics.route.ts
│
├── analytics.constant.ts    # Shared constants
├── analytics.interface.ts   # Shared interfaces
├── analytics.route.ts       # Main router
└── doc/                     # Documentation
    ├── API_DOCUMENTATION.md
    └── dia/                 # Mermaid diagrams
```

---

## 🔐 Authentication

All endpoints require JWT authentication via Bearer token:

```http
Authorization: Bearer <access_token>
```

### User Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| `child` | Group members, students | Personal analytics only |
| `business` | Group owners, parents, teachers | Group & member analytics |
| `admin` | System administrators | Platform-wide analytics |

---

## 📊 User Analytics Endpoints

**Base Path:** `/analytics/user/my`

### 1. Get User Analytics Overview
```http
GET /analytics/user/my/overview
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Description:** Get complete user analytics overview including today's progress, weekly/monthly stats, streak, and productivity score

**Response:**
```json
{
  "code": 200,
  "message": "User analytics overview retrieved successfully",
  "data": {
    "overview": {
      "totalTasks": 156,
      "completedTasks": 124,
      "completionRate": 79.49,
      "currentStreak": 7,
      "longestStreak": 21,
      "productivityScore": 85
    },
    "today": {
      "totalTasks": 5,
      "completedTasks": 3,
      "progress": "3/5",
      "completionRate": 60
    },
    "thisWeek": {
      "totalTasks": 28,
      "completedTasks": 22,
      "completionRate": 78.57
    },
    "thisMonth": {
      "totalTasks": 156,
      "completedTasks": 124,
      "completionRate": 79.49
    }
  },
  "success": true
}
```

---

### 2. Get Daily Progress
```http
GET /analytics/user/my/daily-progress?date=2026-03-10
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `home-flow.png`

**Description:** Get today's task progress in X/Y completed format with completion rate

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | date | Today | Date in YYYY-MM-DD format |

**Response:**
```json
{
  "code": 200,
  "message": "Daily progress retrieved successfully",
  "data": {
    "date": "2026-03-10T00:00:00.000Z",
    "totalTasks": 5,
    "completedTasks": 3,
    "pendingTasks": 2,
    "progress": "3/5",
    "completionRate": 60,
    "tasks": [
      {
        "_id": "task123",
        "title": "Math Homework",
        "status": "completed",
        "completedAt": "2026-03-10T14:00:00.000Z"
      }
    ]
  },
  "success": true
}
```

---

### 3. Get Weekly Streak
```http
GET /analytics/user/my/weekly-streak
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Get user's streak data including current streak, longest streak, and streak history

**Response:**
```json
{
  "code": 200,
  "message": "Streak data retrieved successfully",
  "data": {
    "currentStreak": 7,
    "longestStreak": 21,
    "streakHistory": [
      {
        "week": "2026-W10",
        "activeDays": 5,
        "completedTasks": 15
      },
      {
        "week": "2026-W09",
        "activeDays": 7,
        "completedTasks": 21
      }
    ],
    "lastActiveDate": "2026-03-10T14:00:00.000Z"
  },
  "success": true
}
```

---

### 4. Get Productivity Score
```http
GET /analytics/user/my/productivity-score
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Get user's productivity score (0-100) with breakdown, trend, and percentile ranking

**Response:**
```json
{
  "code": 200,
  "message": "Productivity score retrieved successfully",
  "data": {
    "score": 85,
    "breakdown": {
      "taskCompletion": 90,
      "consistency": 80,
      "efficiency": 85
    },
    "trend": {
      "direction": "up",
      "change": 5,
      "previousScore": 80
    },
    "percentile": 75,
    "level": "Excellent",
    "tips": [
      "Great job maintaining consistency!",
      "Try to complete tasks earlier in the day"
    ]
  },
  "success": true
}
```

**Productivity Levels:**
| Score Range | Level |
|-------------|-------|
| 90-100 | Outstanding |
| 80-89 | Excellent |
| 70-79 | Good |
| 60-69 | Average |
| 0-59 | Needs Improvement |

---

### 5. Get Completion Rate
```http
GET /analytics/user/my/completion-rate?range=30d
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `profile-permission-account-interface.png`

**Description:** Get user's completion rate analytics including overall rate, by time range, and trend

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `30d` | Time range: `7d`, `30d`, `90d`, `1y` |

**Response:**
```json
{
  "code": 200,
  "message": "Completion rate retrieved successfully",
  "data": {
    "overall": {
      "rate": 79.49,
      "totalTasks": 156,
      "completedTasks": 124
    },
    "byTimeRange": {
      "today": {
        "rate": 60,
        "totalTasks": 5,
        "completedTasks": 3
      },
      "thisWeek": {
        "rate": 78.57,
        "totalTasks": 28,
        "completedTasks": 22
      },
      "thisMonth": {
        "rate": 79.49,
        "totalTasks": 156,
        "completedTasks": 124
      }
    },
    "trend": {
      "direction": "up",
      "change": 2.5,
      "previousRate": 77
    }
  },
  "success": true
}
```

---

### 6. Get Task Statistics
```http
GET /analytics/user/my/task-statistics
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `status-section-flow-01.png`

**Description:** Get user's task statistics by status, priority, and task type

**Response:**
```json
{
  "code": 200,
  "message": "Task statistics retrieved successfully",
  "data": {
    "byStatus": {
      "pending": 12,
      "inProgress": 8,
      "completed": 124,
      "overdue": 3
    },
    "byPriority": {
      "low": 45,
      "medium": 67,
      "high": 32,
      "urgent": 12
    },
    "byTaskType": {
      "personal": 89,
      "singleAssignment": 34,
      "collaborative": 33
    },
    "totalTasks": 156,
    "completionRate": 79.49
  },
  "success": true
}
```

---

### 7. Get Trend Analytics
```http
GET /analytics/user/my/trend?period=monthly
Authorization: Bearer <token>
Role: child, business, individual
Rate Limit: 100 requests per minute
```

**Figma Reference:** `history_screen.dart`

**Description:** Get user's trend analytics with daily/weekly/monthly data

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `monthly` | Period: `daily`, `weekly`, `monthly` |

**Response (Monthly Period):**
```json
{
  "code": 200,
  "message": "Trend analytics retrieved successfully",
  "data": {
    "period": "monthly",
    "data": [
      {
        "month": "2026-01",
        "totalTasks": 45,
        "completedTasks": 38,
        "completionRate": 84.44,
        "averageProductivity": 82
      },
      {
        "month": "2025-12",
        "totalTasks": 52,
        "completedTasks": 41,
        "completionRate": 78.85,
        "averageProductivity": 79
      },
      {
        "month": "2025-11",
        "totalTasks": 59,
        "completedTasks": 45,
        "completionRate": 76.27,
        "averageProductivity": 77
      }
    ],
    "trend": {
      "direction": "up",
      "averageChange": 3.5
    }
  },
  "success": true
}
```

---

## 📈 Task Analytics Endpoints

**Base Path:** `/analytics`

### 1. Get Platform Task Overview (Admin)
```http
GET /analytics/task/overview
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

**Description:** Get platform-wide task overview with total tasks, completion rates, and platform-wide metrics

**Response:**
```json
{
  "code": 200,
  "message": "Platform task overview retrieved successfully",
  "data": {
    "totalTasks": 8947562,
    "completedTasks": 7123456,
    "inProgressTasks": 1234567,
    "pendingTasks": 589539,
    "overallCompletionRate": 79.61,
    "tasksCreatedToday": 12453,
    "tasksCompletedToday": 9876,
    "averageCompletionTime": "4.5 hours",
    "topPerformingGroups": [
      {
        "groupId": "grp123",
        "name": "Smith Family",
        "completionRate": 95.5
      }
    ]
  },
  "success": true
}
```

---

### 2. Get Task Status Distribution (Admin)
```http
GET /analytics/task/status-distribution
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

**Description:** Get task status distribution across the platform

**Response:**
```json
{
  "code": 200,
  "message": "Task status distribution retrieved successfully",
  "data": {
    "distribution": {
      "pending": {
        "count": 589539,
        "percentage": 6.59
      },
      "inProgress": {
        "count": 1234567,
        "percentage": 13.80
      },
      "completed": {
        "count": 7123456,
        "percentage": 79.61
      }
    },
    "totalTasks": 8947562,
    "overdueTasks": 45678,
    "averageCompletionTime": "4.5 hours"
  },
  "success": true
}
```

---

### 3. Get Group Task Analytics (Business)
```http
GET /analytics/task/group/:groupId
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get task metrics for specific group (owner/admin view)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `groupId` | string | ID of the group |

**Response:**
```json
{
  "code": 200,
  "message": "Group task analytics retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "totalTasks": 156,
    "completedTasks": 124,
    "inProgressTasks": 20,
    "pendingTasks": 12,
    "completionRate": 79.49,
    "averageCompletionTime": "3.2 hours",
    "tasksByMember": [
      {
        "userId": "user123",
        "name": "John Child",
        "totalTasks": 45,
        "completedTasks": 38,
        "completionRate": 84.44
      }
    ],
    "recentActivity": [
      {
        "type": "task_completed",
        "userId": "user123",
        "taskId": "task456",
        "timestamp": "2026-03-10T14:00:00.000Z"
      }
    ]
  },
  "success": true
}
```

---

### 4. Get Daily Task Summary (Admin)
```http
GET /analytics/task/daily-summary?date=2026-03-10
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

**Description:** Get daily task creation/completion summary

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `date` | date | Today | Date in YYYY-MM-DD format |

**Response:**
```json
{
  "code": 200,
  "message": "Daily task summary retrieved successfully",
  "data": {
    "date": "2026-03-10T00:00:00.000Z",
    "created": {
      "total": 12453,
      "byHour": [
        { "hour": 0, "count": 234 },
        { "hour": 1, "count": 189 },
        ...
      ]
    },
    "completed": {
      "total": 9876,
      "byHour": [
        { "hour": 0, "count": 156 },
        { "hour": 1, "count": 123 },
        ...
      ]
    },
    "netChange": 2577,
    "completionRate": 79.31
  },
  "success": true
}
```

---

### 5. Get Collaborative Task Progress (Business)
```http
GET /analytics/task/:taskId/collaborative-progress
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `task-details-with-subTasks.png`

**Description:** Get collaborative task progress showing which children/team members completed/started/not started tasks

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | ID of the collaborative task |

**Response:**
```json
{
  "code": 200,
  "message": "Collaborative task progress retrieved successfully",
  "data": {
    "taskId": "task123",
    "taskTitle": "Group Science Project",
    "totalAssignees": 5,
    "progress": {
      "completed": 2,
      "inProgress": 2,
      "notStarted": 1
    },
    "members": [
      {
        "userId": "user123",
        "name": "John Child",
        "status": "completed",
        "completedAt": "2026-03-10T14:00:00.000Z",
        "progressPercentage": 100
      },
      {
        "userId": "user124",
        "name": "Jane Child",
        "status": "inProgress",
        "startedAt": "2026-03-10T10:00:00.000Z",
        "progressPercentage": 60
      },
      {
        "userId": "user125",
        "name": "Bob Child",
        "status": "notStarted",
        "progressPercentage": 0
      }
    ],
    "overallCompletionRate": 60
  },
  "success": true
}
```

---

### 6. Get Child Performance (Business)
```http
GET /analytics/child/:childId/performance?range=30d
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `team-member-flow-01.png`

**Description:** Get child's performance analytics including task metrics and trends

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `childId` | string | ID of the child user |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `30d` | Time range: `7d`, `30d`, `90d`, `1y` |

**Response:**
```json
{
  "code": 200,
  "message": "Child performance retrieved successfully",
  "data": {
    "childId": "user123",
    "childName": "John Child",
    "range": "30d",
    "overview": {
      "totalTasks": 45,
      "completedTasks": 38,
      "completionRate": 84.44,
      "averageProductivity": 82,
      "currentStreak": 7,
      "longestStreak": 15
    },
    "byStatus": {
      "pending": 3,
      "inProgress": 4,
      "completed": 38
    },
    "byPriority": {
      "low": 12,
      "medium": 20,
      "high": 10,
      "urgent": 3
    },
    "trend": {
      "direction": "up",
      "change": 5.2,
      "previousCompletionRate": 79.24
    }
  },
  "success": true
}
```

---

### 7. Get Parent Dashboard Overview (Business)
```http
GET /analytics/parent/my-children/overview
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get all children's/team members' performance overview

**Response:**
```json
{
  "code": 200,
  "message": "Parent dashboard overview retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "totalChildren": 4,
    "children": [
      {
        "userId": "user123",
        "name": "John Child",
        "totalTasks": 45,
        "completedTasks": 38,
        "completionRate": 84.44,
        "currentStreak": 7,
        "productivityScore": 85,
        "status": "excellent"
      },
      {
        "userId": "user124",
        "name": "Jane Child",
        "totalTasks": 42,
        "completedTasks": 32,
        "completionRate": 76.19,
        "currentStreak": 3,
        "productivityScore": 72,
        "status": "good"
      }
    ],
    "groupAverage": {
      "completionRate": 80.32,
      "productivityScore": 78.5,
      "averageStreak": 5
    }
  },
  "success": true
}
```

---

## 📊 Group Analytics Endpoints

**Base Path:** `/analytics/group/:groupId`

### 1. Get Group Overview
```http
GET /analytics/group/:groupId/overview
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get group overview with summary, task completion rates, and member activity overview

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `groupId` | string | ID of the group |

**Response:**
```json
{
  "code": 200,
  "message": "Group overview retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "totalMembers": 4,
    "totalTasks": 156,
    "completedTasks": 124,
    "completionRate": 79.49,
    "activeMembers": 3,
    "averageProductivity": 78.5,
    "groupStreak": 12,
    "recentActivity": [
      {
        "type": "task_completed",
        "userId": "user123",
        "userName": "John Child",
        "taskId": "task456",
        "timestamp": "2026-03-10T14:00:00.000Z"
      }
    ]
  },
  "success": true
}
```

---

### 2. Get Member Statistics
```http
GET /analytics/group/:groupId/members
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `team-member-flow-01.png`

**Description:** Get individual member stats, task counts, and completion rates

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `groupId` | string | ID of the group |

**Response:**
```json
{
  "code": 200,
  "message": "Member statistics retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "members": [
      {
        "userId": "user123",
        "name": "John Child",
        "totalTasks": 45,
        "completedTasks": 38,
        "completionRate": 84.44,
        "inProgressTasks": 4,
        "pendingTasks": 3,
        "productivityScore": 85
      },
      {
        "userId": "user124",
        "name": "Jane Child",
        "totalTasks": 42,
        "completedTasks": 32,
        "completionRate": 76.19,
        "inProgressTasks": 6,
        "pendingTasks": 4,
        "productivityScore": 72
      }
    ],
    "groupAverage": {
      "completionRate": 80.32,
      "productivityScore": 78.5
    }
  },
  "success": true
}
```

---

### 3. Get Group Leaderboard
```http
GET /analytics/group/:groupId/leaderboard?period=weekly
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get ranked list of members by productivity/completion

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `groupId` | string | ID of the group |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `weekly` | Period: `daily`, `weekly`, `monthly`, `allTime` |

**Response:**
```json
{
  "code": 200,
  "message": "Group leaderboard retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "period": "weekly",
    "leaderboard": [
      {
        "rank": 1,
        "userId": "user123",
        "name": "John Child",
        "completedTasks": 15,
        "productivityScore": 92,
        "streak": 7,
        "change": 0
      },
      {
        "rank": 2,
        "userId": "user124",
        "name": "Jane Child",
        "completedTasks": 12,
        "productivityScore": 85,
        "streak": 5,
        "change": 1
      },
      {
        "rank": 3,
        "userId": "user125",
        "name": "Bob Child",
        "completedTasks": 10,
        "productivityScore": 78,
        "streak": 3,
        "change": -1
      }
    ]
  },
  "success": true
}
```

---

### 4. Get Performance Metrics
```http
GET /analytics/group/:groupId/performance?range=30d
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get group-level performance KPIs and trends

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `groupId` | string | ID of the group |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `range` | string | `30d` | Time range: `7d`, `30d`, `90d`, `1y` |

**Response:**
```json
{
  "code": 200,
  "message": "Performance metrics retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "range": "30d",
    "kpis": {
      "completionRate": 79.49,
      "averageProductivity": 78.5,
      "activeMembers": 3,
      "totalTasks": 156,
      "averageCompletionTime": "3.2 hours"
    },
    "trends": {
      "completionRate": {
        "direction": "up",
        "change": 2.5
      },
      "productivity": {
        "direction": "up",
        "change": 3.2
      },
      "engagement": {
        "direction": "stable",
        "change": 0.5
      }
    }
  },
  "success": true
}
```

---

### 5. Get Activity Feed
```http
GET /analytics/group/:groupId/activity?limit=20
Authorization: Bearer <token>
Role: business
Rate Limit: 100 requests per minute
Access: Group owner/admin only
```

**Figma Reference:** `dashboard-flow-01.png`

**Description:** Get real-time feed of member task completions and activities

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `groupId` | string | ID of the group |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | 20 | Number of activities to return (max: 50) |

**Response:**
```json
{
  "code": 200,
  "message": "Activity feed retrieved successfully",
  "data": {
    "groupId": "grp123",
    "groupName": "Smith Family",
    "activities": [
      {
        "_id": "activity123",
        "type": "task_completed",
        "message": "John completed Math Homework",
        "userId": {
          "_id": "user123",
          "name": "John Child",
          "profileImage": "https://..."
        },
        "taskId": "task456",
        "taskTitle": "Math Homework",
        "timestamp": "2026-03-10T14:00:00.000Z"
      },
      {
        "_id": "activity124",
        "type": "task_started",
        "message": "Jane started Science Project",
        "userId": {
          "_id": "user124",
          "name": "Jane Child",
          "profileImage": "https://..."
        },
        "taskId": "task789",
        "taskTitle": "Science Project",
        "timestamp": "2026-03-10T13:00:00.000Z"
      }
    ]
  },
  "success": true
}
```

**Activity Types:**
| Type | Description |
|------|-------------|
| `task_created` | Task was created |
| `task_started` | User started working on task |
| `task_updated` | Task was updated |
| `task_completed` | User completed task |
| `subtask_completed` | Subtask was completed |
| `member_joined` | New member joined group |
| `member_left` | Member left group |

---

## 👨‍💼 Admin Analytics Endpoints

**Base Path:** `/analytics/admin`

### 1. Get Admin Dashboard Overview
```http
GET /analytics/admin/dashboard
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

**Description:** Get complete admin dashboard overview with platform-wide stats, user growth, revenue, and task metrics

**Response:**
```json
{
  "code": 200,
  "message": "Admin dashboard overview retrieved successfully",
  "data": {
    "overview": {
      "totalUsers": 125847,
      "totalGroups": 18453,
      "totalTasks": 8947562,
      "activeUsersToday": 45621,
      "dauMauRatio": 40.52
    },
    "userGrowth": {
      "today": 234,
      "thisWeek": 1847,
      "thisMonth": 7453,
      "growthRate": {
        "daily": 0.19,
        "weekly": 1.49,
        "monthly": 6.29
      }
    },
    "revenue": {
      "mrr": 1247850.50,
      "arr": 14974206.00,
      "thisMonth": 124580.75,
      "growthRate": 4.74
    },
    "tasks": {
      "total": 8947562,
      "completedToday": 9876,
      "completionRate": 79.61
    }
  },
  "success": true
}
```

---

### 2. Get User Growth Analytics
```http
GET /analytics/admin/user-growth?period=monthly
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `user-list-flow.png`

**Description:** Get user growth analytics with new user trends, active users, churn rate, and subscription stats

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `period` | string | `monthly` | Period: `daily`, `weekly`, `monthly` |

**Response:**
```json
{
  "code": 200,
  "message": "User growth analytics retrieved successfully",
  "data": {
    "period": "monthly",
    "newUsers": {
      "total": 7453,
      "trend": "up",
      "change": 12.5
    },
    "activeUsers": {
      "dau": 45621,
      "wau": 89456,
      "mau": 125847,
      "dauMauRatio": 40.52
    },
    "churnRate": {
      "rate": 2.3,
      "churnedUsers": 2894,
      "trend": "down"
    },
    "subscriptions": {
      "active": 45678,
      "trial": 1234,
      "expired": 567,
      "conversionRate": 36.29
    },
    "trend": [
      {
        "month": "2026-01",
        "newUsers": 7453,
        "activeUsers": 125847,
        "churnRate": 2.3
      },
      {
        "month": "2025-12",
        "newUsers": 6892,
        "activeUsers": 118234,
        "churnRate": 2.5
      }
    ]
  },
  "success": true
}
```

---

### 3. Get Revenue Analytics
```http
GET /analytics/admin/revenue
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `subscription-flow.png`

**Description:** Get revenue analytics with MRR, ARR, subscription tiers, and revenue trends

**Response:**
```json
{
  "code": 200,
  "message": "Revenue analytics retrieved successfully",
  "data": {
    "mrr": 1247850.50,
    "arr": 14974206.00,
    "thisMonth": {
      "revenue": 124580.75,
      "growthRate": 4.74,
      "newSubscriptions": 1234,
      "upgrades": 456,
      "downgrades": 123,
      "cancellations": 234
    },
    "byTier": [
      {
        "tier": "Individual",
        "price": 10.99,
        "subscribers": 23456,
        "revenue": 257771.44,
        "percentage": 20.66
      },
      {
        "tier": "Group Plan",
        "price": 29.99,
        "subscribers": 22222,
        "revenue": 666437.78,
        "percentage": 53.41
      }
    ],
    "trend": [
      {
        "month": "2026-01",
        "mrr": 1247850.50,
        "arr": 14974206.00
      },
      {
        "month": "2025-12",
        "mrr": 1191234.25,
        "arr": 14294811.00
      }
    ]
  },
  "success": true
}
```

---

### 4. Get Platform Task Metrics
```http
GET /analytics/admin/task-metrics
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

**Description:** Get platform task metrics with total tasks, completion rates, and average task duration

**Response:**
```json
{
  "code": 200,
  "message": "Platform task metrics retrieved successfully",
  "data": {
    "totalTasks": 8947562,
    "byStatus": {
      "pending": 589539,
      "inProgress": 1234567,
      "completed": 7123456
    },
    "overallCompletionRate": 79.61,
    "averageCompletionTime": "4.5 hours",
    "tasksCreatedToday": 12453,
    "tasksCompletedToday": 9876,
    "overdueTasks": 45678,
    "byType": {
      "personal": 5678901,
      "singleAssignment": 2345678,
      "collaborative": 922983
    },
    "trend": {
      "direction": "up",
      "change": 5.2
    }
  },
  "success": true
}
```

---

### 5. Get User Engagement Metrics
```http
GET /analytics/admin/engagement
Authorization: Bearer <admin_token>
Role: admin
Rate Limit: 100 requests per minute
```

**Figma Reference:** `dashboard-section-flow.png`

**Description:** Get user engagement metrics with DAU/MAU, session duration, feature usage, and retention

**Response:**
```json
{
  "code": 200,
  "message": "User engagement metrics retrieved successfully",
  "data": {
    "dau": 45621,
    "mau": 125847,
    "dauMauRatio": 40.52,
    "sessionDuration": {
      "average": "15.3 minutes",
      "median": "12.5 minutes"
    },
    "featureUsage": {
      "taskCreation": 78.5,
      "taskCompletion": 82.3,
      "groupManagement": 45.6,
      "analytics": 34.2
    },
    "retention": {
      "day1": 85.2,
      "day7": 65.4,
      "day30": 45.8
    },
    "activeUsersByRole": {
      "child": 89456,
      "business": 32456,
      "admin": 3935
    }
  },
  "success": true
}
```

---

## 🎯 Key Features

### 1. User Productivity Tracking
- Personal analytics dashboard
- Streak tracking and gamification
- Productivity scoring (0-100)
- Completion rate analytics

### 2. Group Performance Monitoring
- Member-wise breakdown
- Group leaderboard
- Real-time activity feed
- Collaborative task progress

### 3. Parent Dashboard
- Multi-child overview
- Individual child performance
- Task completion tracking
- Productivity trends

### 4. Admin Platform Insights
- User growth analytics
- Revenue tracking (MRR/ARR)
- Platform-wide task metrics
- User engagement metrics

### 5. Redis Caching
- Analytics data cached for performance
- Cache TTL varies by endpoint (1-5 minutes)
- Automatic cache invalidation on data updates

---

## 📊 Database Schema

### Analytics Collections (Aggregated Data)

```javascript
// User Analytics (aggregated daily)
{
  _id: ObjectId,
  userId: ObjectId,
  date: Date,
  totalTasks: Number,
  completedTasks: Number,
  productivityScore: Number,
  streak: Number,
  createdAt: Date
}

// Group Analytics (aggregated daily)
{
  _id: ObjectId,
  groupId: ObjectId,
  date: Date,
  totalTasks: Number,
  completedTasks: Number,
  activeMembers: Number,
  averageProductivity: Number,
  createdAt: Date
}

// Platform Analytics (aggregated daily)
{
  _id: ObjectId,
  date: Date,
  totalUsers: Number,
  newUsers: Number,
  totalTasks: Number,
  completedTasks: Number,
  revenue: Number,
  createdAt: Date
}
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid date format",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "You do not have permission to access this analytics data",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Group not found",
  "success": false
}
```

```json
{
  "code": 404,
  "message": "User not found",
  "success": false
}
```

---

## 🧪 Testing with cURL

### Get User Overview
```bash
curl -X GET http://localhost:6733/api/v1/analytics/user/my/overview \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Productivity Score
```bash
curl -X GET http://localhost:6733/api/v1/analytics/user/my/productivity-score \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Group Overview (Business User)
```bash
curl -X GET http://localhost:6733/api/v1/analytics/group/GROUP_ID/overview \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN"
```

### Get Group Leaderboard
```bash
curl -X GET "http://localhost:6733/api/v1/analytics/group/GROUP_ID/leaderboard?period=weekly" \
  -H "Authorization: Bearer BUSINESS_USER_TOKEN"
```

### Get Admin Dashboard (Admin Only)
```bash
curl -X GET http://localhost:6733/api/v1/analytics/admin/dashboard \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### Get Revenue Analytics (Admin Only)
```bash
curl -X GET http://localhost:6733/api/v1/analytics/admin/revenue \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 📝 Notes

1. **Caching**: Analytics data is cached for 1-5 minutes depending on endpoint
2. **Aggregation**: Most analytics are pre-aggregated daily for performance
3. **Access Control**: Users can only access their own analytics or their group's analytics
4. **Real-time Data**: Activity feeds are real-time, other metrics may have slight delay
5. **Timezones**: All dates are in UTC, frontend should handle timezone conversion
6. **Rate Limiting**: All endpoints have rate limiting configured (100 req/min)

---

## 🚀 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start
```

---

## 📞 Support

For issues or questions:
- Check error messages
- Review server logs
- Contact backend team

---

**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team  
**Status:** ✅ Complete and Production-Ready
