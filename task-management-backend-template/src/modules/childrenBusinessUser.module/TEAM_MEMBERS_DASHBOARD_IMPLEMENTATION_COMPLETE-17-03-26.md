# ✅ Team Members Dashboard APIs - IMPLEMENTATION COMPLETE

**Date**: 17-03-26  
**Figma Reference**: `teacher-parent-dashboard/team-members/team-member-flow-01.png`  
**Status**: ✅ **COMPLETE**

---

## 🎯 **What Was Implemented**

### **3 NEW API Endpoints for Team Members Dashboard**

1. **`GET /v1/children-business-users/team-members`**
   - Team Member sidebar (already implemented)
   - Returns: Children with active task counts
   
2. **`GET /v1/children-business-users/team-members/statistics`** ⭐ NEW
   - Top 4 statistics cards
   - Returns: Team Size, Total Tasks, Active Tasks, Completed Tasks
   
3. **`GET /v1/children-business-users/team-members/list`** ⭐ NEW
   - Paginated table with task progress
   - Returns: Children details + task progress percentage

---

## 📊 **API Specifications**

### **Endpoint 1: Team Members Statistics** ⭐ NEW

```http
GET /v1/children-business-users/team-members/statistics
Authorization: Bearer {{accessToken}}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "teamSize": 4,
    "totalTasks": 48,
    "activeTasks": 24,
    "completedTasks": 24
  },
  "message": "Team members statistics retrieved successfully"
}
```

**Logic**:
- `teamSize`: Count of active children
- `totalTasks`: Count of all tasks assigned to children
- `activeTasks`: Count of tasks with status `pending` OR `inProgress`
- `completedTasks`: Count of tasks with status `completed`

---

### **Endpoint 2: Team Members List with Task Progress** ⭐ NEW

```http
GET /v1/children-business-users/team-members/list?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

**Query Parameters**:
- `page`: Number (default: 1)
- `limit`: Number (default: 10)
- `sortBy`: String (default: `-addedAt`)

**Response**:
```json
{
  "success": true,
  "data": {
    "docs": [
      {
        "_id": "rel_123",
        "childUserId": "child_456",
        "name": "Alex Morgan",
        "email": "alex@example.com",
        "phoneNumber": "1234567890",
        "gender": "Male",
        "profileImage": {
          "imageUrl": "/uploads/users/alex.png"
        },
        "location": "New York",
        "dob": "2010-05-15",
        "roleType": "Secondary",
        "taskProgress": {
          "totalTasks": 12,
          "completedTasks": 6,
          "pendingTasks": 4,
          "inProgressTasks": 2,
          "progressPercentage": 50
        },
        "addedAt": "2026-01-15T10:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  },
  "message": "Team members list with task progress retrieved successfully"
}
```

**Task Progress Calculation**:
```typescript
progressPercentage = (completedTasks / totalTasks) * 100
// If totalTasks = 0, progressPercentage = 0
// Rounded to nearest integer
```

---

## 📸 **Figma Alignment**

### **Top Statistics Cards** (team-member-flow-01.png)

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Team Size    │ Total Tasks  │ Active Tasks │ Completed    │
│              │              │              │ Tasks         │
│              │              │              │               │
│ 04           │ 04           │ 04           │ 04           │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**API**: `GET /v1/children-business-users/team-members/statistics`

**Frontend Mapping**:
- `teamSize` → Team Size card
- `totalTasks` → Total Tasks card
- `activeTasks` → Active Tasks card
- `completedTasks` → Completed Tasks card

---

### **Team Members Table** (team-member-flow-01.png)

```
┌────┬──────────────┬─────────────┬──────────────┬────────┬───────────┬───────────────┬─────────┐
│ No │ User Name    │ Email       │ Phone Number │ Gender │ Role Type │ Tasks Progress│ Action  │
├────┼──────────────┼─────────────┼──────────────┼────────┼───────────┼───────────────┼─────────┤
│ 01 │ Alex Morgan  │ alex@...    │ 65656522     │ Male   │ Secondary │ ████░░ 50%    │ ⚙ ✏ 🗑  │
│    │              │             │              │        │           │ 12 tasks      │         │
├────┼──────────────┼─────────────┼──────────────┼────────┼───────────┼───────────────┼─────────┤
│ 02 │ Sam Rivera   │ sam@...     │ 65656522     │ Male   │ Primary   │ ████░░ 50%    │ ⚙ ✏ 🗑  │
│    │              │             │              │        │           │ 12 tasks      │         │
└────┴──────────────┴─────────────┴──────────────┴────────┴───────────┴───────────────┴─────────┘
```

**API**: `GET /v1/children-business-users/team-members/list?page=1&limit=10`

**Frontend Mapping**:
- `name` → User Name column
- `email` → Email column
- `phoneNumber` → Phone Number column
- `gender` → Gender column
- `roleType` → Role Type badge (Primary/Secondary)
- `taskProgress.progressPercentage` → Progress bar percentage
- `taskProgress.totalTasks` → "X tasks" label
- `taskProgress.completedTasks` → Completed count for progress bar

---

## 📁 **Files Modified**

### **1. Service Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts`

**New Methods**:
- `getTeamMembersStatistics(businessUserId)` - Lines 437-514
  - Redis caching (5 minutes)
  - Parallel task count queries
  - Returns: teamSize, totalTasks, activeTasks, completedTasks

- `getTeamMembersListWithTaskProgress(businessUserId, options)` - Lines 516-720
  - Redis caching (3 minutes)
  - MongoDB aggregation for task progress
  - Pagination support
  - Returns: Paginated list with taskProgress for each child

**Task Progress Aggregation**:
```typescript
Task.aggregate([
  { $match: { assignedUserIds: { $in: childUserIds }, isDeleted: false } },
  { $unwind: '$assignedUserIds' },
  {
    $group: {
      _id: '$assignedUserIds',
      totalTasks: { $sum: 1 },
      completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
      pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
      inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'inProgress'] }, 1, 0] } },
    }
  },
  {
    $project: {
      progressPercentage: {
        $round: [
          { $multiply: [{ $cond: [{ $eq: ['$totalTasks', 0] }, 0, { $divide: ['$completedTasks', '$totalTasks'] }] }, 100] },
          0
        ]
      }
    }
  }
]);
```

---

### **2. Controller Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`

**New Methods**:
- `getTeamMembersStatistics(req, res)` - Lines 395-421
- `getTeamMembersList(req, res)` - Lines 423-470

**Features**:
- ✅ Generic controller pattern
- ✅ Authentication check
- ✅ Query parameter parsing (page, limit, sortBy)
- ✅ Proper error handling

---

### **3. Routes Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`

**New Routes**:
- `GET /team-members/statistics` - Lines 131-145
- `GET /team-members/list` - Lines 147-173

**Features**:
- ✅ Authentication required (business role)
- ✅ Rate limiting (100 req/min)
- ✅ Comprehensive documentation blocks
- ✅ Query parameter support for list endpoint

---

## 🔧 **Technical Implementation Details**

### **Redis Caching Strategy**

```typescript
// Statistics: 5 minutes TTL
const cacheKey = this.getCacheKey('team-statistics', businessUserId);
await this.setInCache(cacheKey, result, 300);

// List: 3 minutes TTL (includes pagination key)
const cacheKey = this.getCacheKey(
  'team-list',
  businessUserId,
  `page-${page}-limit-${limit}`
);
await this.setInCache(cacheKey, result, 180);
```

### **Task Progress Calculation**

**Edge Cases Handled**:
1. **No tasks**: `progressPercentage = 0`
2. **All completed**: `progressPercentage = 100`
3. **Partial completion**: `progressPercentage = (completed / total) * 100`
4. **Rounding**: Rounded to nearest integer using `$round`

### **Database Indexes** (Already exist)

```typescript
// childrenBusinessUser.model.ts
childrenBusinessUserSchema.index({ parentBusinessUserId: 1, status: 1 });
childrenBusinessUserSchema.index({ parentBusinessUserId: 1, isSecondaryUser: 1 });

// task.model.ts
taskSchema.index({ assignedUserIds: 1, status: 1, isDeleted: 1 });
```

---

## 📝 **Postman Collection Update**

### **Add to**: `01-User-Common-Part2-Charts-Progress.postman_collection.json`

**Section**: "04 - Children Business User"

#### **Request 1: Team Members Statistics**
```json
{
  "name": "01 - Team Members Statistics",
  "request": {
    "method": "GET",
    "header": [],
    "url": {
      "raw": "{{baseUrl}}/v1/children-business-users/team-members/statistics",
      "host": ["{{baseUrl}}"],
      "path": ["v1", "children-business-users", "team-members", "statistics"]
    },
    "description": "Get team members statistics for dashboard\n\n**Returns**:\n- Team Size (count of children)\n- Total Tasks (all tasks)\n- Active Tasks (pending + inProgress)\n- Completed Tasks\n\n**Figma**: team-member-flow-01.png (Top cards)"
  }
}
```

#### **Request 2: Team Members List**
```json
{
  "name": "02 - Team Members List",
  "request": {
    "method": "GET",
    "header": [],
    "url": {
      "raw": "{{baseUrl}}/v1/children-business-users/team-members/list?page=1&limit=10",
      "host": ["{{baseUrl}}"],
      "path": ["v1", "children-business-users", "team-members", "list"],
      "query": [
        {
          "key": "page",
          "value": "1"
        },
        {
          "key": "limit",
          "value": "10"
        }
      ]
    },
    "description": "Get paginated list of children with task progress\n\n**Returns**:\n- Children details (name, email, phone, gender)\n- Role Type (Primary/Secondary)\n- Task Progress (total, completed, percentage)\n- Pagination metadata\n\n**Figma**: team-member-flow-01.png (Table)"
  }
}
```

#### **Request 3: Team Members (Sidebar)**
```json
{
  "name": "03 - Team Members (Sidebar)",
  "request": {
    "method": "GET",
    "header": [],
    "url": {
      "raw": "{{baseUrl}}/v1/children-business-users/team-members",
      "host": ["{{baseUrl}}"],
      "path": ["v1", "children-business-users", "team-members"]
    },
    "description": "Get team members with active task counts for sidebar\n\n**Returns**:\n- Array of children with activeTaskCount\n- Secondary User status\n\n**Figma**: task-monitoring-flow-01.png (Sidebar)"
  }
}
```

---

## 🧪 **Testing**

### **Test Case 1: Get Statistics**
```bash
curl -X GET "http://localhost:6733/v1/children-business-users/team-members/statistics" \
  -H "Authorization: Bearer {{businessUserToken}}"
```

**Expected**: Returns 4 statistics (teamSize, totalTasks, activeTasks, completedTasks)

### **Test Case 2: Get List with Pagination**
```bash
curl -X GET "http://localhost:6733/v1/children-business-users/team-members/list?page=1&limit=5" \
  -H "Authorization: Bearer {{businessUserToken}}"
```

**Expected**: Returns paginated list with taskProgress for each child

### **Test Case 3: Child with No Tasks**
```json
{
  "name": "Test Child",
  "taskProgress": {
    "totalTasks": 0,
    "completedTasks": 0,
    "pendingTasks": 0,
    "inProgressTasks": 0,
    "progressPercentage": 0  // ✅ Should be 0
  }
}
```

### **Test Case 4: Child with 100% Progress**
```json
{
  "name": "Perfect Student",
  "taskProgress": {
    "totalTasks": 10,
    "completedTasks": 10,
    "pendingTasks": 0,
    "inProgressTasks": 0,
    "progressPercentage": 100  // ✅ Should be 100
  }
}
```

---

## 🎯 **Frontend Usage Example**

### **React Component**

```javascript
// TeamMembersPage.jsx
const TeamMembersPage = () => {
  const [statistics, setStatistics] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch statistics
        const statsRes = await fetch(
          '/v1/children-business-users/team-members/statistics',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const statsData = await statsRes.json();
        setStatistics(statsData.data);

        // Fetch team members list
        const listRes = await fetch(
          '/v1/children-business-users/team-members/list?page=1&limit=10',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const listData = await listRes.json();
        setTeamMembers(listData.data);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <Loading />;

  return (
    <div className="team-members-page">
      {/* Top Statistics Cards */}
      <div className="statistics-cards">
        <StatCard 
          icon="team"
          label="Team Size"
          value={statistics.teamSize}
        />
        <StatCard 
          icon="tasks"
          label="Total Tasks"
          value={statistics.totalTasks}
        />
        <StatCard 
          icon="active"
          label="Active Tasks"
          value={statistics.activeTasks}
        />
        <StatCard 
          icon="completed"
          label="Completed Tasks"
          value={statistics.completedTasks}
        />
      </div>

      {/* Team Members Table */}
      <div className="team-members-table">
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
            {teamMembers.docs.map((member, index) => (
              <tr key={member.childUserId}>
                <td>{String(index + 1).padStart(2, '0')}</td>
                <td>
                  <Avatar src={member.profileImage?.imageUrl} />
                  {member.name}
                </td>
                <td>{member.email}</td>
                <td>{member.phoneNumber}</td>
                <td>{member.gender}</td>
                <td>
                  <Badge type={member.roleType}>
                    {member.roleType}
                  </Badge>
                </td>
                <td>
                  <div className="task-progress">
                    <ProgressBar 
                      value={member.taskProgress.progressPercentage}
                    />
                    <span className="progress-text">
                      {member.taskProgress.progressPercentage}%
                    </span>
                    <span className="task-count">
                      ({member.taskProgress.completedTasks}/{member.taskProgress.totalTasks} tasks)
                    </span>
                  </div>
                </td>
                <td>
                  <ActionButton icon="info" onClick={() => viewDetails(member)} />
                  <ActionButton icon="edit" onClick={() => editMember(member)} />
                  <ActionButton icon="delete" onClick={() => deleteMember(member)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <Pagination
          page={teamMembers.page}
          limit={teamMembers.limit}
          total={teamMembers.total}
          totalPages={teamMembers.totalPages}
          onPageChange={(newPage) => fetchPage(newPage)}
        />
      </div>
    </div>
  );
};
```

---

## ✅ **Summary**

| Feature | Status | Details |
|---------|--------|---------|
| **Statistics API** | ✅ Complete | Team Size, Total Tasks, Active Tasks, Completed Tasks |
| **List API** | ✅ Complete | Paginated with task progress |
| **Task Progress** | ✅ Complete | totalTasks, completedTasks, progressPercentage |
| **Redis Caching** | ✅ Complete | 5min (stats), 3min (list) |
| **Pagination** | ✅ Complete | page, limit, sortBy |
| **Role Type** | ✅ Complete | Primary/Secondary detection |
| **Postman** | ⏳ Pending | Add 3 new requests |

---

## 📚 **Related Endpoints**

| Endpoint | Purpose | Used In |
|----------|---------|---------|
| `GET /team-members` | Sidebar with active counts | Task Monitoring sidebar |
| `GET /team-members/statistics` | Dashboard statistics | Team Members page (top cards) |
| `GET /team-members/list` | Paginated table | Team Members page (table) |
| `GET /my-children` | General children list | Children management page |

---

**Status**: ✅ **COMPLETE**  
**Next**: Import Postman collection and test endpoints

---
-17-03-26
