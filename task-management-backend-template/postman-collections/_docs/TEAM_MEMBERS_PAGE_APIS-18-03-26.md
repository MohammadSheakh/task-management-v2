# 🎯 **TEAM MEMBERS PAGE - API MAPPING**

**Date**: 18-03-26  
**Figma File**: `teacher-parent-dashboard/team-members/team-member-flow-01.png`  
**Module**: ChildrenBusinessUser

---

## 📊 **VISUAL SUMMARY**

```
┌─────────────────────────────────────────────────────────────┐
│ Team Members Dashboard                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Statistics Cards (4):                                      │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────┐ │
│  │Team Size     │ │Total Tasks   │ │Active Tasks  │ │Comp│ │
│  │    04        │ │    04        │ │    04        │ │ 04 │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └────┘ │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /children-business-users/team-members/statistics  │
│                                                             │
│  Team Members Table:                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ No | User Name | Email | Phone | Gender | Role | % │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 01 | 👤 Email  | Total | 65656 | Male   | Pri | █ 0%│   │
│  │ 02 | 👤 Sam    | Supp  | 65656 | Male   | Sec | █ 0%│   │
│  │ 03 | 👤 Sam    | Total | 65656 | Male   | Sec | █ 0%│   │
│  │ 04 | 👤 Casey  | Total | 65656 | Male   | Sec | █ 0%│   │
│  │ 05 | 👤 Jamie  | Total | 65656 | Female | Sec | █ 0%│   │
│  └─────────────────────────────────────────────────────┘   │
│         ↑                                                   │
│         └──────────────────────────────────────────┐        │
│       GET /children-business-users/team-members/list        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 **COMPLETE API LIST**

### **2 Main APIs for Team Members Page:**

| # | Screen Element | API Endpoint | Method | Status |
|---|----------------|--------------|--------|--------|
| 1 | **Statistics Cards** (Team Size, Total Tasks, Active Tasks, Completed Tasks) | `/children-business-users/team-members/statistics` | GET | ✅ EXISTS |
| 2 | **Team Members List** (Table with Progress %) | `/children-business-users/team-members/list` | GET | ✅ EXISTS |

---

## 1️⃣ **TEAM MEMBERS STATISTICS API**

### **Endpoint:**
```http
GET /children-business-users/team-members/statistics
Authorization: Bearer {{accessToken}}
```

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `businessUserId` | String | Optional | Logged-in user | Parent/Teacher user ID |

### **Response:**
```json
{
  "success": true,
  "data": {
    "teamSize": 4,
    "totalTasks": 51,
    "activeTasks": 43,
    "completedTasks": 8,
    "breakdown": {
      "pendingTasks": 35,
      "inProgressTasks": 8,
      "notStartedTasks": 12
    },
    "lastUpdated": "2026-03-18T10:00:00.000Z"
  },
  "message": "Team members statistics retrieved successfully"
}
```

### **Frontend Display:**
```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Team Size       │ │ Total Tasks     │ │ Active Tasks    │ │ Completed Tasks │
│                 │ │                 │ │                 │ │                 │
│      04         │ │      51         │ │      43         │ │       08        │
│                 │ │                 │ │                 │ │                 │
│ 👥              │ │ 📝              │ │ 📋              │ │ ✅              │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### **Field Descriptions:**
| Field | Description | Calculation |
|-------|-------------|-------------|
| `teamSize` | Total children count | Count of all children in family |
| `totalTasks` | All tasks | Sum of all tasks across all children |
| `activeTasks` | Active tasks | Pending + In Progress tasks |
| `completedTasks` | Completed tasks | All completed tasks |
| `pendingTasks` | Not started | Tasks with status = 'pending' |
| `inProgressTasks` | In progress | Tasks with status = 'inProgress' |

---

## 2️⃣ **TEAM MEMBERS LIST API**

### **Endpoint:**
```http
GET /children-business-users/team-members/list?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

### **Query Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Number | No | 1 | Page number for pagination |
| `limit` | Number | No | 10 | Items per page |
| `sortBy` | String | No | `-addedAt` | Sort field (prefix - for descending) |
| `search` | String | No | - | Search by name or email |

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
          "name": "Alex Morgn",
          "email": "alex@example.com",
          "phoneNumber": "65656522",
          "gender": "male",
          "role": "child",
          "profileImage": "https://..."
        },
        "relationship": "son",
        "isSecondaryUser": true,
        "roleType": "Primary",
        "status": "active",
        "taskProgress": {
          "totalTasks": 12,
          "pendingTasks": 10,
          "inProgressTasks": 0,
          "completedTasks": 2,
          "progressPercentage": 16.7,
          "activeTasks": 10
        },
        "addedAt": "2026-01-15T10:00:00.000Z"
      },
      {
        "_id": "child002",
        "userId": {
          "_id": "user002",
          "name": "Sam Rivera",
          "email": "sam@example.com",
          "phoneNumber": "65656522",
          "gender": "male",
          "role": "child",
          "profileImage": "https://..."
        },
        "relationship": "daughter",
        "isSecondaryUser": false,
        "roleType": "Secondary",
        "status": "active",
        "taskProgress": {
          "totalTasks": 5,
          "pendingTasks": 4,
          "inProgressTasks": 0,
          "completedTasks": 1,
          "progressPercentage": 20,
          "activeTasks": 4
        },
        "addedAt": "2026-02-10T10:00:00.000Z"
      },
      {
        "_id": "child003",
        "userId": {
          "_id": "user003",
          "name": "Casey Lin",
          "email": "casey@example.com",
          "phoneNumber": "65656522",
          "gender": "male",
          "role": "child",
          "profileImage": "https://..."
        },
        "relationship": "son",
        "isSecondaryUser": false,
        "roleType": "Secondary",
        "status": "active",
        "taskProgress": {
          "totalTasks": 10,
          "pendingTasks": 8,
          "inProgressTasks": 0,
          "completedTasks": 2,
          "progressPercentage": 20,
          "activeTasks": 8
        },
        "addedAt": "2026-02-15T10:00:00.000Z"
      },
      {
        "_id": "child004",
        "userId": {
          "_id": "user004",
          "name": "Jamie Chen",
          "email": "jamie@example.com",
          "phoneNumber": "65656522",
          "gender": "female",
          "role": "child",
          "profileImage": "https://..."
        },
        "relationship": "daughter",
        "isSecondaryUser": false,
        "roleType": "Secondary",
        "status": "active",
        "taskProgress": {
          "totalTasks": 12,
          "pendingTasks": 0,
          "inProgressTasks": 0,
          "completedTasks": 12,
          "progressPercentage": 100,
          "activeTasks": 0
        },
        "addedAt": "2026-01-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 4,
      "totalPages": 1
    }
  },
  "message": "Team members list with task progress retrieved successfully"
}
```

### **Frontend Display:**
```
Team Members
┌────┬────────────┬───────────────┬───────────┬────────┬──────────┬─────────────┬────────┐
│ No │ User Name  │ Email         │ Phone     │ Gender │ Role     │ Tasks Prog  │ Action │
├────┼────────────┼───────────────┼───────────┼────────┼──────────┼─────────────┼────────┤
│ 01 │ 👤 Email   │ Total Task    │ 65656522  │ Male   │ Primary  │ ████ 0%     │ ⚙ ✏ 🗑 │
├────┼────────────┼───────────────┼───────────┼────────┼──────────┼─────────────┼────────┤
│ 02 │ 👤 Sam     │ Suppot@...    │ 65656522  │ Male   │ Secondary│ ████ 0%     │ ⚙ ✏ 🗑 │
├────┼────────────┼───────────────┼───────────┼────────┼──────────┼─────────────┼────────┤
│ 03 │ 👤 Sam     │ Total Task    │ 65656522  │ Male   │ Secondary│ ████ 0%     │ ⚙ ✏ 🗑 │
├────┼────────────┼───────────────┼───────────┼────────┼──────────┼─────────────┼────────┤
│ 04 │ 👤 Casey   │ Total Task    │ 65656522  │ Male   │ Secondary│ ████ 0%     │ ⚙ ✏ 🗑 │
├────┼────────────┼───────────────┼───────────┼────────┼──────────┼─────────────┼────────┤
│ 05 │ 👤 Jamie   │ Total Task    │ 65656522  │ Female │ Secondary│ ████ 0%     │ ⚙ ✏ 🗑 │
└────┴────────────┴───────────────┴───────────┴────────┴──────────┴─────────────┴────────┘
```

### **Table Columns Mapping:**

| Table Column | API Field | Example |
|--------------|-----------|---------|
| No | Index | 01, 02, 03... |
| User Name | `userId.name` + `userId.profileImage` | "Alex Morgn" |
| Email | `userId.email` | "alex@example.com" |
| Phone Number | `userId.phoneNumber` | "65656522" |
| Gender | `userId.gender` | "Male" |
| Role Type | `roleType` (from `isSecondaryUser`) | "Primary" or "Secondary" |
| Tasks Progress | `taskProgress.progressPercentage` | 0% - 100% with progress bar |
| Action | Frontend buttons | Info, Edit, Delete |

---

## 🧪 **COMPLETE TESTING FLOW**

### **Step 1: Get Team Statistics**
```bash
# Get team statistics
GET /children-business-users/team-members/statistics
Authorization: Bearer {{accessToken}}

→ Should return:
{
  teamSize: 4,
  totalTasks: 51,
  activeTasks: 43,
  completedTasks: 8
}
```

### **Step 2: Get Team Members List**
```bash
# Get team members list
GET /children-business-users/team-members/list?page=1&limit=10
Authorization: Bearer {{accessToken}}

→ Should return paginated list with task progress

# Search by name
GET /children-business-users/team-members/list?search=Alex
Authorization: Bearer {{accessToken}}

→ Should return only matching results

# Sort by name
GET /children-business-users/team-members/list?sortBy=name
Authorization: Bearer {{accessToken}}

→ Should return sorted list
```

### **Step 3: Load Complete Page**
```javascript
// Frontend code example
const loadTeamMembersPage = async () => {
  const [statistics, teamMembers] = await Promise.all([
    api.get('/children-business-users/team-members/statistics'),
    api.get('/children-business-users/team-members/list?page=1&limit=10')
  ]);

  // Update UI
  setStats(statistics.data.data);
  setTeamMembers(teamMembers.data.data.teamMembers);
};
```

---

## 📁 **BACKEND FILES**

### **Routes:**

**Children Business User Routes**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`
  - `GET /children-business-users/team-members` (line 139)
  - `GET /children-business-users/team-members/statistics` (line 153)
  - `GET /children-business-users/team-members/list` (line 170)

### **Controllers:**

**Children Business User Controller**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`
  - `getChildrenWithActiveTaskCounts()` (line 362)
  - `getTeamMembersStatistics()` (line 396)
  - `getTeamMembersList()` (line 433)

### **Services:**

**Children Business User Service**
- `src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts`
  - `getChildrenWithActiveTaskCounts()` (line 368)
  - `getTeamMembersStatistics()` (line 475)
  - `getTeamMembersListWithTaskProgress()` (line 563)

---

## ✅ **STATUS**

| Feature | API Exists? | Tested? | Production Ready? |
|---------|-------------|---------|-------------------|
| Team Statistics (4 cards) | ✅ | ✅ | ✅ |
| Team Members List | ✅ | ✅ | ✅ |
| Task Progress Percentage | ✅ | ✅ | ✅ |
| Pagination | ✅ | ✅ | ✅ |
| Search by Name | ✅ | ✅ | ✅ |
| Sorting | ✅ | ✅ | ✅ |

**Both APIs for Team Members page are IMPLEMENTED and READY!** 🎉

---

## 🎨 **FRONTEND INTEGRATION GUIDE**

### **React Component Example:**

```javascript
import React, { useEffect, useState } from 'react';
import api from '../api';

const TeamMembersPage = () => {
  const [stats, setStats] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeamMembers();
  }, []);

  const loadTeamMembers = async () => {
    try {
      setLoading(true);
      const [statsRes, membersRes] = await Promise.all([
        api.get('/children-business-users/team-members/statistics'),
        api.get('/children-business-users/team-members/list?page=1&limit=10')
      ]);

      setStats(statsRes.data.data);
      setTeamMembers(membersRes.data.data.teamMembers);
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="team-members-page">
      {/* Statistics Cards */}
      <div className="stats-grid">
        <StatCard
          title="Team Size"
          value={stats.teamSize}
          icon="👥"
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          icon="📝"
        />
        <StatCard
          title="Active Tasks"
          value={stats.activeTasks}
          icon="📋"
        />
        <StatCard
          title="Completed Tasks"
          value={stats.completedTasks}
          icon="✅"
        />
      </div>

      {/* Team Members Table */}
      <div className="team-table">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>User Name</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Gender</th>
              <th>Role Type</th>
              <th>Tasks Progress</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member, index) => (
              <TeamMemberRow
                key={member._id}
                index={index + 1}
                member={member}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Team Member Row Component
const TeamMemberRow = ({ index, member }) => {
  const { userId, roleType, taskProgress } = member;

  return (
    <tr>
      <td>{String(index).padStart(2, '0')}</td>
      <td>
        <div className="user-info">
          <img src={userId.profileImage} alt={userId.name} />
          <span>{userId.name}</span>
        </div>
      </td>
      <td>{userId.email}</td>
      <td>{userId.phoneNumber}</td>
      <td>{userId.gender}</td>
      <td>
        <span className={`role-badge ${roleType.toLowerCase()}`}>
          {roleType}
        </span>
      </td>
      <td>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${taskProgress.progressPercentage}%` }}
          />
          <span>{Math.round(taskProgress.progressPercentage)}%</span>
        </div>
      </td>
      <td>
        <ActionButtonGroup memberId={member._id} />
      </td>
    </tr>
  );
};
```

---

**Date**: 18-03-26  
**Status**: ✅ **COMPLETE**  
**Total APIs**: 2 (All Production Ready)

---
