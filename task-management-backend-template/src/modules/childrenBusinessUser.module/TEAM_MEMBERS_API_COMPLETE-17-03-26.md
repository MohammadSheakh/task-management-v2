# ✅ Team Members API - IMPLEMENTATION COMPLETE

**Date**: 17-03-26  
**Figma Reference**: `teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png`  
**Endpoint**: `GET /v1/children-business-users/team-members`  
**Status**: ✅ **COMPLETE**

---

## 🎯 **What Was Implemented**

### **NEW Endpoint for Team Member Sidebar**

```http
GET /v1/children-business-users/team-members
Authorization: Bearer {{accessToken}}
```

**Purpose**: Get all children with their active task counts for the Team Member sidebar

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "rel_123",
      "childUserId": "child_456",
      "name": "Alex Morgan",
      "email": "alex@example.com",
      "profileImage": {
        "imageUrl": "/uploads/users/alex.png"
      },
      "activeTaskCount": 2,
      "isSecondaryUser": true
    },
    {
      "_id": "rel_124",
      "childUserId": "child_789",
      "name": "Sam Rivera",
      "email": "sam@example.com",
      "profileImage": {
        "imageUrl": "/uploads/users/sam.png"
      },
      "activeTaskCount": 2,
      "isSecondaryUser": false
    }
  ],
  "message": "Team members with active task counts retrieved successfully"
}
```

---

## 📊 **Figma Alignment**

### **Team Member Sidebar** (task-monitoring-flow-01.png)

```
Team Member
┌─────────────────────────┐
│ 👤 Alax Morgn           │
│    2 active tasks       │
│    [Secondary User]     │
├─────────────────────────┤
│ 👤 Sam Rivera           │
│    2 active tasks       │
├─────────────────────────┤
│ 👤 Alax Morgn           │
│    2 active tasks       │
└─────────────────────────┘
```

**API Response Maps To**:
- `name` → Display name
- `profileImage.imageUrl` → Avatar image
- `activeTaskCount` → "X active tasks"
- `isSecondaryUser` → Show "Secondary User" badge

---

## 📁 **Files Modified**

### **1. Service Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.service.ts`

**New Method**: `getChildrenWithActiveTaskCounts(businessUserId)` - Lines 267-338

**Features**:
- ✅ Redis caching (3 minutes TTL)
- ✅ Aggregation pipeline for task counting
- ✅ Secondary User detection
- ✅ Handles edge cases (no children)

**Logic**:
```typescript
// 1. Get all active children
const childrenRelations = await this.model.find({
  parentBusinessUserId: businessUserId,
  status: 'active',
});

// 2. Get active task counts (pending + inProgress)
const taskCounts = await Task.aggregate([
  {
    $match: {
      assignedUserIds: { $in: childUserIds },
      status: { $in: ['pending', 'inProgress'] },
    },
  },
  { $unwind: '$assignedUserIds' },
  { $group: { _id: '$assignedUserIds', activeTaskCount: { $sum: 1 } } },
]);

// 3. Check Secondary User status
const secondaryUserIds = await this.model.find({
  parentBusinessUserId: businessUserId,
  isSecondaryUser: true,
}).distinct('childUserId');

// 4. Combine data
return childrenRelations.map(rel => ({
  ...childUser,
  activeTaskCount: taskCountMap.get(childUserId) || 0,
  isSecondaryUser: secondaryUserIds.includes(childUserId),
}));
```

---

### **2. Controller Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.controller.ts`

**New Method**: `getChildrenWithActiveTaskCounts(req, res)` - Lines 356-388

**Features**:
- ✅ Generic controller pattern
- ✅ Authentication check
- ✅ Proper error handling

---

### **3. Routes Layer**
**File**: `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`

**New Route**: `GET /team-members` - Lines 131-142

**Features**:
- ✅ Authentication required (business role)
- ✅ Rate limiting (100 req/min)
- ✅ Comprehensive documentation block

---

## 🔍 **Key Differences from `/my-children`**

| Feature | `/my-children` | `/team-members` |
|---------|----------------|-----------------|
| **Purpose** | General children list | Team Member sidebar |
| **Task Counts** | ❌ No | ✅ Yes (activeTaskCount) |
| **Secondary User** | ❌ No | ✅ Yes (isSecondaryUser) |
| **Pagination** | ✅ Yes | ❌ No (all at once) |
| **Cache TTL** | 5 minutes | 3 minutes |
| **Response Size** | Large (full details) | Small (sidebar optimized) |

---

## 🎯 **Active Task Count Logic**

**Active Tasks** = `pending` + `inProgress` tasks

```typescript
// Count tasks where:
// 1. User is assigned (assignedUserIds includes childUserId)
// 2. Status is pending OR inProgress
// 3. Not deleted

Task.aggregate([
  {
    $match: {
      assignedUserIds: { $in: childUserIds },
      status: { $in: ['pending', 'inProgress'] },
      isDeleted: false,
    },
  },
  { $unwind: '$assignedUserIds' },
  {
    $group: {
      _id: '$assignedUserIds',
      activeTaskCount: { $sum: 1 },
    },
  },
]);
```

---

## 📝 **Frontend Usage**

### **React Component Example**

```javascript
// TeamMemberSidebar.jsx
const TeamMemberSidebar = ({ businessUserId }) => {
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      const response = await fetch(
        '/v1/children-business-users/team-members',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setTeamMembers(data.data);
    };

    fetchTeamMembers();
  }, [businessUserId]);

  return (
    <div className="team-member-sidebar">
      <h3>Team Member</h3>
      {teamMembers.map(member => (
        <div key={member.childUserId} className="team-member-card">
          <div className="member-header">
            <img 
              src={member.profileImage?.imageUrl || '/default-avatar.png'} 
              alt={member.name}
              className="member-avatar"
            />
            <div className="member-info">
              <span className="member-name">{member.name}</span>
              {member.isSecondaryUser && (
                <Badge>Secondary User</Badge>
              )}
            </div>
          </div>
          <div className="member-stats">
            <span className="active-tasks">
              {member.activeTaskCount} active tasks
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
```

---

## 🧪 **Testing**

### **Test Case 1: Get Team Members**
```bash
curl -X GET "http://localhost:6733/v1/children-business-users/team-members" \
  -H "Authorization: Bearer {{businessUserToken}}"
```

**Expected**: Returns array of children with activeTaskCount

### **Test Case 2: No Children**
```bash
curl -X GET "http://localhost:6733/v1/children-business-users/team-members" \
  -H "Authorization: Bearer {{businessUserToken}}"
```

**Expected**: Returns empty array `[]`

### **Test Case 3: Child with No Tasks**
```json
{
  "childUserId": "child_123",
  "name": "Test Child",
  "activeTaskCount": 0,  // ✅ Should be 0
  "isSecondaryUser": false
}
```

---

## 🔧 **Performance Optimization**

### **Redis Caching**
```typescript
// Cache key: analytics:task-monitoring:team-members:{businessUserId}
// TTL: 3 minutes (180 seconds)
const cacheKey = this.getCacheKey('team-members', businessUserId);
await this.setInCache(cacheKey, result, 180);
```

### **Database Indexes** (Already exist)
```typescript
// childrenBusinessUser.model.ts
childrenBusinessUserSchema.index({ parentBusinessUserId: 1, status: 1 });
childrenBusinessUserSchema.index({ parentBusinessUserId: 1, isSecondaryUser: 1 });

// task.model.ts
taskSchema.index({ assignedUserIds: 1, status: 1 });
```

### **Aggregation Optimization**
- Uses `$unwind` on `assignedUserIds` array
- Groups by user ID for efficient counting
- Single query for all children's task counts

---

## 📚 **Related Endpoints**

| Endpoint | Purpose | Used In |
|----------|---------|---------|
| `GET /team-members` | Team sidebar with task counts | Task Monitoring page |
| `GET /my-children` | Full children list | Team Members management |
| `GET /statistics` | Children count stats | Dashboard overview |
| `POST /children` | Create child account | Add child flow |

---

## ✅ **Summary**

- ✅ **NEW endpoint** `/team-members` created
- ✅ **Does NOT modify** existing `/my-children` endpoint
- ✅ **Includes** active task counts (pending + inProgress)
- ✅ **Includes** Secondary User status
- ✅ **Optimized** for sidebar display (lightweight)
- ✅ **Cached** with Redis (3 minutes)
- ✅ **Aligned** with Figma task-monitoring-flow-01.png

---

**Status**: ✅ **COMPLETE**  
**Next**: Test endpoint and update Postman collection

---
-17-03-26
