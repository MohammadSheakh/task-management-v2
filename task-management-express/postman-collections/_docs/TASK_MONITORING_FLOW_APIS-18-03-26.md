# 🎯 **TASK MONITORING FLOW - API MAPPING**

**Date**: 18-03-26  
**Figma File**: `teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png`  
**Module**: Analytics (Task Monitoring)

---

## 📊 **VISUAL SUMMARY**

```
┌─────────────────────────────────────────────────────────────┐
│ Task Monitoring Dashboard                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Summary Cards (4):                                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────┐ │
│  │Not Started   │ │In Progress   │ │My Tasks      │ │Comp│ │
│  │    04        │ │    04        │ │    04        │ │ 04 │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────┘ │
│         ↑                  ↑              ↑            ↑    │
│         └──────────────────┴──────────────┴────────────┘    │
│                    GET /analytics/task-monitoring/summary    │
│                                                             │
│  Task Activity Chart:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Monthly] [Annual] ← Toggle                         │   │
│  │  250 ┤        █ 46%                                │   │
│  │  200 ┤    ████                                     │   │
│  │  150 ┤  ██████                                     │   │
│  │  100 ┤ ████████                                     │   │
│  │   50 ┤██████████                                    │   │
│  │    0 ┼─────────────────────────────────────        │   │
│  │      Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec│   │
│  └─────────────────────────────────────────────────────┘   │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /analytics/task-monitoring/activity/:businessUserId
│                                                             │
│  Team Members Sidebar:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Team Member                                         │   │
│  │ ┌──────────────────────────────────────────────┐   │   │
│  │ │ 👤 Alax Morgn                                │   │   │
│  │ │    2 active tasks                            │   │   │
│  │ ├──────────────────────────────────────────────┤   │   │
│  │ │ 👤 Sam Rivera                                │   │   │
│  │ │    2 active tasks                            │   │   │
│  │ └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /children-business-users/team-members    │        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 **COMPLETE API LIST**

### **3 Main APIs for Task Monitoring Dashboard:**

| # | Screen Element | API Endpoint | Method | Status |
|---|----------------|--------------|--------|--------|
| 1 | **Summary Cards** (4 cards) | `/analytics/task-monitoring/summary/:businessUserId` | GET | ✅ EXISTS |
| 2 | **Activity Chart** (Monthly/Annual) | `/analytics/task-monitoring/activity/:businessUserId` | GET | ✅ EXISTS |
| 3 | **Team Members List** (Sidebar) | `/children-business-users/team-members` | GET | ✅ EXISTS |

---

## 1️⃣ **SUMMARY CARDS API**

### **Endpoint:**
```http
GET /analytics/task-monitoring/summary/:businessUserId
Authorization: Bearer {{accessToken}}
```

### **Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessUserId` | String | Optional | Parent/Teacher user ID (uses logged-in user if not provided) |

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | String | No | `monthly` | Time period: `daily` | `weekly` | `monthly` |

### **Response:**
```json
{
  "success": true,
  "data": {
    "notStartedTasks": 4,
    "inProgressTasks": 4,
    "myTasks": 4,
    "completedTasks": 4,
    "totalTasks": 16,
    "lastUpdated": "2026-03-18T10:00:00.000Z"
  },
  "message": "Task monitoring summary retrieved successfully"
}
```

### **Frontend Display:**
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Not Started     │ │ In Progress     │ │ My Tasks        │ │ Completed       │
│ Tasks           │ │                 │ │                 │ │ Tasks           │
│                 │ │                 │ │                 │ │                 │
│      04         │ │      04         │ │      04         │ │      04         │
│                 │ │                 │ │                 │ │                 │
│ 🔖              │ │ 📝              │ │ 📋              │ │ 👤              │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 2️⃣ **ACTIVITY CHART API**

### **Endpoint:**
```http
GET /analytics/task-monitoring/activity/:businessUserId?period=annual
Authorization: Bearer {{accessToken}}
```

### **Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `businessUserId` | String | Optional | Parent/Teacher user ID |

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `period` | String | No | `monthly` | Chart period: `monthly` (12 months) or `annual` (5 years) |
| `year` | Number | No | Current year | Specific year for data |

### **Response (Monthly Period):**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "year": 2026,
    "chartData": {
      "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      "datasets": [{
        "label": "Tasks Created",
        "data": [130, 170, 220, 170, 115, 170, 90, 115, 150, 190, 95, 140],
        "backgroundColor": "rgba(59, 130, 246, 0.5)",
        "borderColor": "#3B82F6",
        "borderWidth": 1
      }]
    },
    "statistics": {
      "totalTasks": 1755,
      "averagePerPeriod": 146,
      "peakPeriod": "Mar",
      "peakValue": 220,
      "growthPercentage": 12.5
    }
  },
  "message": "Task activity chart data retrieved successfully"
}
```

### **Response (Annual Period):**
```json
{
  "success": true,
  "data": {
    "period": "annual",
    "year": 2026,
    "chartData": {
      "labels": ["2022", "2023", "2024", "2025", "2026"],
      "datasets": [{
        "label": "Tasks Created",
        "data": [500, 800, 1200, 1600, 1755],
        "backgroundColor": "rgba(59, 130, 246, 0.5)",
        "borderColor": "#3B82F6",
        "borderWidth": 1
      }]
    },
    "statistics": {
      "totalTasks": 5855,
      "averagePerPeriod": 1171,
      "peakPeriod": "2026",
      "peakValue": 1755,
      "growthPercentage": 9.7
    }
  },
  "message": "Task activity chart data retrieved successfully"
}
```

### **Frontend Display:**
```
Task Activity                               [Monthly] [Annual]

 250 ┤                              █ 46%
     │                          ████
 200 ┤                      ██████
     │                  ████████
 150 ┤              ████████████
     │          ████████████████
 100 ┤      ████████████████████
     │  ████████████████████████
  50 ┤██████████████████████████
     └─────────────────────────────────────
       Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec
```

---

## 3️⃣ **TEAM MEMBERS API**

### **Endpoint:**
```http
GET /children-business-users/team-members
Authorization: Bearer {{accessToken}}
```

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Items per page |
| `sortBy` | String | No | `-addedAt` | Sort field |

### **Response:**
```json
{
  "success": true,
  "data": {
    "teamMembers": [
      {
        "_id": "child001",
        "userId": {
          "_id": "user001",
          "name": "Alax Morgn",
          "email": "alax@example.com",
          "profileImage": "https://..."
        },
        "relationship": "son",
        "isSecondaryUser": true,
        "status": "active",
        "activeTaskCount": 2,
        "addedAt": "2026-01-15T10:00:00.000Z"
      },
      {
        "_id": "child002",
        "userId": {
          "_id": "user002",
          "name": "Sam Rivera",
          "email": "sam@example.com",
          "profileImage": "https://..."
        },
        "relationship": "daughter",
        "isSecondaryUser": false,
        "status": "active",
        "activeTaskCount": 2,
        "addedAt": "2026-02-10T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "totalPages": 1
    }
  },
  "message": "Team members with active task counts retrieved successfully"
}
```

### **Frontend Display:**
```
Team Member
┌─────────────────────────────────────────┐
│ 👤 Alax Morgn                           │
│    2 active tasks                       │
│    [Task Manager badge if isSecondaryUser]
├─────────────────────────────────────────┤
│ 👤 Sam Rivera                           │
│    2 active tasks                       │
├─────────────────────────────────────────┤
│ 👤 Alax Morgn                           │
│    2 active tasks                       │
├─────────────────────────────────────────┤
│ 👤 Alax Morgn                           │
│    2 active tasks                       │
├─────────────────────────────────────────┤
│ 👤 Alax Morgn                           │
│    2 active tasks                       │
└─────────────────────────────────────────┘
```

---

## 🧪 **COMPLETE TESTING FLOW**

### **Step 1: Get Summary Cards**
```bash
# Get task monitoring summary
GET /analytics/task-monitoring/summary/business123
Authorization: Bearer {{accessToken}}

→ Should return:
{
  notStartedTasks: 4,
  inProgressTasks: 4,
  myTasks: 4,
  completedTasks: 4
}
```

### **Step 2: Get Activity Chart Data**
```bash
# Get monthly activity
GET /analytics/task-monitoring/activity/business123?period=monthly
Authorization: Bearer {{accessToken}}

→ Should return 12 months of data

# Get annual activity
GET /analytics/task-monitoring/activity/business123?period=annual
Authorization: Bearer {{accessToken}}

→ Should return 5 years of data
```

### **Step 3: Get Team Members**
```bash
# Get team members list
GET /children-business-users/team-members
Authorization: Bearer {{accessToken}}

→ Should return list of children with activeTaskCount
```

### **Step 4: Load Complete Dashboard**
```javascript
// Frontend code example
const loadTaskMonitoringDashboard = async () => {
  const [summary, activity, teamMembers] = await Promise.all([
    api.get('/analytics/task-monitoring/summary/business123'),
    api.get('/analytics/task-monitoring/activity/business123?period=monthly'),
    api.get('/children-business-users/team-members')
  ]);
  
  // Update UI
  setSummaryCards(summary.data.data);
  setChartData(activity.data.data.chartData);
  setTeamMembers(teamMembers.data.data.teamMembers);
};
```

---

## 📁 **BACKEND FILES**

### **Routes:**

**1. Task Monitoring Routes**
- `src/modules/analytics.module/taskMonitoring/taskMonitoring.route.ts`
  - `GET /analytics/task-monitoring/summary/:businessUserId` (line 48)
  - `GET /analytics/task-monitoring/activity/:businessUserId` (line 75)

**2. Children Business User Routes**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`
  - `GET /children-business-users/team-members` (line 139)
  - `GET /children-business-users/team-members/statistics` (line 153)
  - `GET /children-business-users/team-members/list` (line 170)

### **Controllers:**

**1. Task Monitoring Controller**
- `src/modules/analytics.module/taskMonitoring/taskMonitoring.controller.ts`
  - `getTaskMonitoringSummary()` (line 28)
  - `getTaskActivityChart()` (line 56)

**2. Children Business User Controller**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`
  - `getChildrenWithActiveTaskCounts()` (line 362)
  - `getTeamMembersStatistics()` (line 396)
  - `getTeamMembersList()` (line 424)

### **Services:**

**1. Task Monitoring Service**
- `src/modules/analytics.module/taskMonitoring/taskMonitoring.service.ts`
  - `getTaskMonitoringSummary()` (line 25)
  - `getTaskActivityChart()` (line 68)

**2. Children Business User Service**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts`
  - `getChildrenWithActiveTaskCounts()` (line 368)
  - `getTeamMembersStatistics()` (line 475)
  - `getTeamMembersListWithTaskProgress()` (line 563)

---

## 📊 **DATA FLOW DIAGRAM**

```
┌─────────────┐
│   Parent    │
│  Dashboard  │
│   (UI)      │
└──────┬──────┘
       │
       │ On Load
       ▼
┌─────────────────────────────────────────────────────────┐
│                 Parallel API Calls                       │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. GET /analytics/task-monitoring/summary        │  │
│  │    → Summary Cards (4 cards)                     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 2. GET /analytics/task-monitoring/activity       │  │
│  │    → Bar Chart (Monthly/Annual)                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 3. GET /children-business-users/team-members     │  │
│  │    → Sidebar List                                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
       │
       │ All responses received
       ▼
┌─────────────┐
│  Render     │
│  Dashboard  │
└─────────────┘
```

---

## ✅ **STATUS**

| Feature | API Exists? | Tested? | Production Ready? |
|---------|-------------|---------|-------------------|
| Summary Cards | ✅ | ✅ | ✅ |
| Activity Chart (Monthly) | ✅ | ✅ | ✅ |
| Activity Chart (Annual) | ✅ | ✅ | ✅ |
| Team Members List | ✅ | ✅ | ✅ |
| Team Members Statistics | ✅ | ✅ | ✅ |
| Team Members List with Pagination | ✅ | ✅ | ✅ |

**All 3 APIs for Task Monitoring Dashboard are IMPLEMENTED and READY!** 🎉

---

## 🎨 **FRONTEND INTEGRATION GUIDE**

### **React Component Example:**

```javascript
import React, { useEffect, useState } from 'react';
import api from '../api';

const TaskMonitoringDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    loadDashboard();
  }, [period]);

  const loadDashboard = async () => {
    try {
      const [summaryRes, activityRes, teamRes] = await Promise.all([
        api.get('/analytics/task-monitoring/summary/business123'),
        api.get(`/analytics/task-monitoring/activity/business123?period=${period}`),
        api.get('/children-business-users/team-members')
      ]);

      setSummary(summaryRes.data.data);
      setChartData(activityRes.data.data);
      setTeamMembers(teamRes.data.data.teamMembers);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  return (
    <div className="dashboard">
      {/* Summary Cards */}
      <div className="summary-cards">
        <SummaryCard title="Not Started" value={summary?.notStartedTasks} />
        <SummaryCard title="In Progress" value={summary?.inProgressTasks} />
        <SummaryCard title="My Tasks" value={summary?.myTasks} />
        <SummaryCard title="Completed" value={summary?.completedTasks} />
      </div>

      {/* Activity Chart */}
      <div className="activity-chart">
        <button onClick={() => setPeriod('monthly')}>Monthly</button>
        <button onClick={() => setPeriod('annual')}>Annual</button>
        <BarChart data={chartData?.chartData} />
      </div>

      {/* Team Members Sidebar */}
      <div className="team-members">
        {teamMembers.map(member => (
          <TeamMemberCard
            key={member._id}
            name={member.userId.name}
            activeTasks={member.activeTaskCount}
            isSecondaryUser={member.isSecondaryUser}
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
