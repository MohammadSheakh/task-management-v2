# ✅ Get Task Details API - With Subtasks & Progress

**Date**: 17-03-26  
**Figma Reference**: `app-user/group-children-user/home-flow.png` (Task Details screen)  
**Status**: ✅ **COMPLETE**

---

## 📊 **API Specification**

### **GET /v1/tasks/:id**

**Purpose**: Get detailed task information including subtasks with progress

**Authentication**: Required (commonUser role - child/business)

**Access Control**: Only task creator, owner, or assigned users can view

---

## 📝 **Request**

```http
GET /v1/tasks/:taskId
Authorization: Bearer {{accessToken}}
```

**Path Parameters**:
- `taskId`: Task ID (ObjectId)

---

## 📤 **Response**

```json
{
  "success": true,
  "data": {
    "_id": "task_67d8f1234abcd56789012345",
    "title": "Complete Math Homework",
    "description": "Finish exercises 1-10 from chapter 5",
    "status": "pending",
    "priority": "high",
    "taskType": "singleAssignment",
    "scheduledTime": "10:30 AM",
    "startTime": "2026-03-17T10:30:00.000Z",
    "dueDate": "2026-03-17T23:59:59.000Z",
    
    // Task assignment details
    "createdById": {
      "_id": "parent_123",
      "name": "Mr. Tom Alax",
      "email": "tom@example.com",
      "profileImage": { "imageUrl": "/uploads/users/tom.png" }
    },
    "ownerUserId": null,
    "assignedUserIds": [
      {
        "_id": "child_456",
        "name": "Alex Morgan",
        "email": "alex@example.com",
        "profileImage": { "imageUrl": "/uploads/users/alex.png" }
      }
    ],
    
    // Subtasks with progress ⭐
    "subtasks": [
      {
        "_id": "subtask_001",
        "title": "Call with design team",
        "isCompleted": false,
        "order": 1,
        "duration": null,
        "completedAt": null
      },
      {
        "_id": "subtask_002",
        "title": "Client meeting 10 min",
        "isCompleted": false,
        "order": 2,
        "duration": null,
        "completedAt": null
      },
      {
        "_id": "subtask_003",
        "title": "Project planning 30 min",
        "isCompleted": true,
        "order": 3,
        "duration": null,
        "completedAt": "2026-03-17T11:00:00.000Z"
      }
    ],
    
    // Subtask Progress Summary ⭐
    "subtaskProgress": {
      "total": 5,
      "completed": 2,
      "percentage": 40
    },
    
    // Legacy fields for backward compatibility
    "totalSubtasks": 5,
    "completedSubtasks": 2,
    "progressPercentage": 40,
    
    "createdAt": "2026-03-17T09:50:00.000Z",
    "updatedAt": "2026-03-17T11:00:00.000Z"
  },
  "message": "Task retrieved successfully"
}
```

---

## 🎯 **Figma Alignment**

### **Task Details Screen** (home-flow.png)

```
┌─────────────────────────────────────┐
│ Status: [Pending]                   │
│                                     │
│ Created: January 5 at 9:50 AM       │
│ Task start Time: January 5 at       │
│ 10:30 AM                            │
│ Assigned by: Mr. Tom Alax           │
│                                     │
│ ─────────────────────────────────   │
│ Task Title                          │
│ UI/UX Design                        │
│                                     │
│ Description                         │
│ This call is scheduled to align...  │
│                                     │
│ ─────────────────────────────────   │
│ Subtask Progress          2/5 (40%) │
│ ████░░░░░░░░░░░░░░░░░░░░░          │
│                                     │
│ Subtask item (05)                   │
│ ○ Call with design team             │
│ ○ Client meeting 10 min             │
│ ● Project planning 30 min ✓         │
│ ○ Code review 45 min                │
│ ○ Design review 45 min              │
│                                     │
│ [        Start        ]             │
└─────────────────────────────────────┘
```

**API Response Maps To**:
- `status` → Status badge
- `startTime` → "Task start Time"
- `createdById.name` → "Assigned by"
- `title` → Task Title
- `description` → Description
- `subtasks` → Subtask item list
- `subtaskProgress.percentage` → Progress bar
- `subtaskProgress.total` → "Subtask item (05)"

---

## 🔧 **Implementation Details**

### **Controller**: `task.controller.ts`

**Method**: `getTaskById(req, res)`

**Key Features**:
1. ✅ **Access Control**: Verifies user is creator, owner, or assigned
2. ✅ **Population**: Populates createdById, ownerUserId, assignedUserIds
3. ✅ **Subtasks**: Returns embedded subtasks array
4. ✅ **Progress Calculation**: Calculates subtask progress percentage
5. ✅ **Formatted Response**: Structured for easy frontend consumption

**Progress Calculation**:
```typescript
const totalSubtasks = formattedSubtasks.length;
const completedSubtasks = formattedSubtasks.filter(st => st.isCompleted).length;
const subtaskProgressPercentage = totalSubtasks > 0
  ? Math.round((completedSubtasks / totalSubtasks) * 100)
  : 0;
```

---

## 📱 **Frontend Usage**

### **React/Flutter Component**

```javascript
// TaskDetailsScreen.jsx
const TaskDetailsScreen = ({ taskId }) => {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTask = async () => {
      const response = await fetch(`/v1/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setTask(data.data);
      setLoading(false);
    };

    fetchTask();
  }, [taskId]);

  if (loading) return <Loading />;

  return (
    <div className="task-details">
      {/* Status */}
      <Badge status={task.status}>{task.status}</Badge>

      {/* Metadata */}
      <div className="metadata">
        <p>Created: {formatDate(task.createdAt)}</p>
        <p>Start Time: {formatTime(task.startTime)}</p>
        {task.createdById && (
          <p>Assigned by: {task.createdById.name}</p>
        )}
      </div>

      {/* Task Details */}
      <h2>{task.title}</h2>
      <p>{task.description}</p>

      {/* Subtask Progress */}
      <div className="subtask-progress">
        <div className="header">
          <span>Subtask Progress</span>
          <span>{task.subtaskProgress.completed}/{task.subtaskProgress.total}</span>
        </div>
        <ProgressBar 
          value={task.subtaskProgress.percentage}
        />
      </div>

      {/* Subtask List */}
      <div className="subtask-list">
        <h4>Subtask item ({task.subtasks.length})</h4>
        {task.subtasks.map((subtask, index) => (
          <div key={subtask._id} className="subtask-item">
            <input
              type="checkbox"
              checked={subtask.isCompleted}
              onChange={() => toggleSubtask(subtask._id)}
            />
            <span>{subtask.title}</span>
            {subtask.duration && (
              <span className="duration">{subtask.duration}</span>
            )}
          </div>
        ))}
      </div>

      {/* Action Button */}
      <Button 
        onClick={() => startTask(taskId)}
        disabled={task.status === 'completed'}
      >
        {task.status === 'pending' ? 'Start' : 
         task.status === 'inProgress' ? 'Continue' : 'Completed'}
      </Button>
    </div>
  );
};
```

---

## 🧪 **Testing**

### **Test Case 1: Get Task with Subtasks**
```bash
curl http://localhost:6733/v1/tasks/:taskId \
  -H "Authorization: Bearer {{childUserToken}}"
```

**Expected**:
- ✅ Task details returned
- ✅ Subtasks array populated
- ✅ subtaskProgress calculated correctly
- ✅ createdById, assignedUserIds populated

### **Test Case 2: Task with No Subtasks**
```json
{
  "subtasks": [],
  "subtaskProgress": {
    "total": 0,
    "completed": 0,
    "percentage": 0
  }
}
```

### **Test Case 3: Task with All Subtasks Completed**
```json
{
  "subtasks": [
    { "isCompleted": true },
    { "isCompleted": true },
    { "isCompleted": true }
  ],
  "subtaskProgress": {
    "total": 3,
    "completed": 3,
    "percentage": 100
  }
}
```

### **Test Case 4: Access Control**
```bash
# User NOT assigned to task
curl http://localhost:6733/v1/tasks/:taskId \
  -H "Authorization: Bearer {{otherUserToken}}"
```

**Expected**: `403 Forbidden - You do not have access to this task`

---

## ✅ **Summary**

| Feature | Status | Details |
|---------|--------|---------|
| **Task Details** | ✅ Complete | All task fields returned |
| **Subtasks List** | ✅ Complete | Embedded subtasks array |
| **Subtask Progress** | ✅ Complete | total/completed/percentage |
| **Access Control** | ✅ Complete | Creator/Owner/Assigned only |
| **Population** | ✅ Complete | createdById, ownerUserId, assignedUserIds |
| **Figma Aligned** | ✅ Complete | Matches home-flow.png |

---

## 📚 **Related Endpoints**

| Endpoint | Purpose |
|----------|---------|
| `GET /tasks/:id` | Get task details with subtasks |
| `PUT /tasks/:id/status` | Update task status (Start/Complete) |
| `PUT /tasks/:id/subtasks/:subtaskId/toggle` | Toggle subtask completion |
| `GET /tasks/daily-progress` | Get daily progress with subtasks |

---

**Status**: ✅ **COMPLETE**  
**The API now returns task details with full subtask progress information!** 🎉

---
-17-03-26
