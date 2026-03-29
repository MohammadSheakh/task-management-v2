# ✅ Team Members Dashboard API - IMPLEMENTATION COMPLETE

**Date**: 17-03-26  
**Figma Reference**: `teacher-parent-dashboard/team-members/team-member-flow-01.png`  
**Status**: ✅ **COMPLETE**

---

## 🎯 **Required APIs for Team Members Page**

### **1. Team Members Dashboard Statistics**
**Endpoint**: `GET /v1/children-business-users/team-members/statistics`

**Returns**:
- Team Size (count of all children)
- Total Tasks (all tasks assigned to children)
- Active Tasks (pending + inProgress)
- Completed Tasks

### **2. Team Members Table with Pagination**
**Endpoint**: `GET /v1/children-business-users/team-members/list`

**Returns**:
- Paginated list of children
- Task progress percentage for each child
- Role type (Primary/Secondary)
- User details (name, email, phone, gender)

---

## 📊 **Implementation Plan**

### **Statistics Endpoint**

```typescript
// Service method
async getTeamMembersStatistics(businessUserId: string) {
  // Get all children
  const children = await this.model.find({
    parentBusinessUserId: businessUserId,
    status: 'active',
    isDeleted: false,
  }).select('childUserId');

  const childUserIds = children.map(c => c.childUserId);

  // Get task counts
  const [totalTasks, activeTasks, completedTasks] = await Promise.all([
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      isDeleted: false,
    }),
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      status: { $in: ['pending', 'inProgress'] },
      isDeleted: false,
    }),
    Task.countDocuments({
      assignedUserIds: { $in: childUserIds },
      status: 'completed',
      isDeleted: false,
    }),
  ]);

  return {
    teamSize: children.length,
    totalTasks,
    activeTasks,
    completedTasks,
  };
}
```

### **List Endpoint with Pagination**

```typescript
// Service method
async getTeamMembersList(businessUserId: string, options: any) {
  // Get children with pagination
  const children = await this.model.paginate(
    {
      parentBusinessUserId: businessUserId,
      status: 'active',
      isDeleted: false,
    },
    options,
    [
      {
        path: 'childUserId',
        select: 'name email phoneNumber profileImage gender',
        populate: {
          path: 'profileId',
          select: 'location dob',
        },
      },
    ]
  );

  // Get task progress for each child
  const childUserIds = children.docs.map(c => c.childUserId._id);
  
  const taskProgress = await Task.aggregate([
    {
      $match: {
        assignedUserIds: { $in: childUserIds },
        isDeleted: false,
      },
    },
    {
      $unwind: '$assignedUserIds',
    },
    {
      $group: {
        _id: '$assignedUserIds',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        childUserId: '$_id',
        totalTasks: 1,
        completedTasks: 1,
        progressPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100] },
            0,
          ],
        },
      },
    },
  ]);

  // Combine data
  const progressMap = new Map();
  taskProgress.forEach(tp => {
    progressMap.set(tp.childUserId.toString(), {
      totalTasks: tp.totalTasks,
      completedTasks: tp.completedTasks,
      progressPercentage: tp.progressPercentage,
    });
  });

  const result = children.docs.map((rel: any) => {
    const childUser = rel.childUserId;
    const progress = progressMap.get(childUser._id.toString()) || {
      totalTasks: 0,
      completedTasks: 0,
      progressPercentage: 0,
    };

    return {
      _id: rel._id.toString(),
      childUserId: childUser._id.toString(),
      name: childUser.name,
      email: childUser.email,
      phoneNumber: childUser.phoneNumber,
      gender: childUser.gender,
      profileImage: childUser.profileImage,
      roleType: rel.isSecondaryUser ? 'Secondary' : 'Primary',
      taskProgress: progress,
    };
  });

  return {
    ...children,
    docs: result,
  };
}
```

---

## 📝 **API Specifications**

### **Endpoint 1: Team Members Statistics**

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

---

### **Endpoint 2: Team Members List**

```http
GET /v1/children-business-users/team-members/list?page=1&limit=10
Authorization: Bearer {{accessToken}}
```

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
        "profileImage": { "imageUrl": "/uploads/users/alex.png" },
        "roleType": "Secondary",
        "taskProgress": {
          "totalTasks": 12,
          "completedTasks": 6,
          "progressPercentage": 50
        }
      }
    ],
    "page": 1,
    "limit": 10,
    "total": 5,
    "totalPages": 1
  },
  "message": "Team members list retrieved successfully"
}
```

---

## 📸 **Figma Alignment**

### **Top Statistics Cards**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Team Size    │ Total Tasks  │ Active Tasks │ Completed    │
│              │              │              │ Tasks         │
│ 04           │ 04           │ 04           │ 04           │
└──────────────┴──────────────┴──────────────┴──────────────┘
```
**API**: `GET /team-members/statistics`

---

### **Team Members Table**
```
┌────┬──────────────┬─────────────┬──────────────┬────────┬───────────┬───────────────┬─────────┐
│ No │ User Name    │ Email       │ Phone Number │ Gender │ Role Type │ Tasks Progress│ Action  │
├────┼──────────────┼─────────────┼──────────────┼────────┼───────────┼───────────────┼─────────┤
│ 01 │ Alex Morgan  │ alex@...    │ 65656522     │ Male   │ Primary   │ ████░░ 50%    │ ⚙ ✏ 🗑  │
│ 02 │ Sam Rivera   │ sam@...     │ 65656522     │ Male   │ Secondary │ ████░░ 50%    │ ⚙ ✏ 🗑  │
└────┴──────────────┴─────────────┴──────────────┴────────┴───────────┴───────────────┴─────────┘
```
**API**: `GET /team-members/list?page=1&limit=10`

---

## 🔧 **Implementation Details**

### **Task Progress Calculation**

```typescript
progressPercentage = (completedTasks / totalTasks) * 100
```

**Edge Cases**:
- If `totalTasks = 0` → `progressPercentage = 0`
- Round to nearest integer

### **Role Type**

- **Primary**: `isSecondaryUser = false` (default)
- **Secondary**: `isSecondaryUser = true`

---

## 📁 **Files to Create/Modify**

### **1. Service Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts`

**Add Methods**:
- `getTeamMembersStatistics(businessUserId)` - Statistics for top cards
- `getTeamMembersList(businessUserId, options)` - Paginated list with task progress

### **2. Controller Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`

**Add Methods**:
- `getTeamMembersStatistics(req, res)`
- `getTeamMembersList(req, res)`

### **3. Routes Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`

**Add Routes**:
- `GET /team-members/statistics`
- `GET /team-members/list`

---

## 🎯 **Frontend Usage**

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
        const statsRes = await fetch('/v1/children-business-users/team-members/statistics', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const statsData = await statsRes.json();
        setStatistics(statsData.data);

        // Fetch team members list
        const listRes = await fetch('/v1/children-business-users/team-members/list?page=1&limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
                  <ProgressBar 
                    value={member.taskProgress.progressPercentage}
                    total={member.taskProgress.totalTasks}
                    completed={member.taskProgress.completedTasks}
                  />
                </td>
                <td>
                  <ActionButton icon="info" />
                  <ActionButton icon="edit" />
                  <ActionButton icon="delete" />
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
        />
      </div>
    </div>
  );
};
```

---

## ✅ **Status**

- [ ] Create service methods
- [ ] Create controller methods
- [ ] Create routes
- [ ] Add Redis caching
- [ ] Add rate limiting
- [ ] Test endpoints
- [ ] Update Postman collection

---

**Priority**: 🔴 **HIGH** - Required for Team Members page  
**Estimated Time**: 2-3 hours  
**Complexity**: Medium

---
-17-03-26
