# Collaborative Task Response Enhancement — Proposal

**Date:** 27-03-26  
**Issue:** GET /tasks/:taskId returns global status for collaborative tasks  
**Solution:** Include personal progress (myProgress, myCompletion) for collaborative tasks  

---

## 🎯 **Problem**

### **Current Response (❌ Confusing for Collaborative):**

```json
GET /tasks/task123

{
  "_id": "task123",
  "taskType": "collaborative",
  "status": "inProgress",  // ← Global status (all children)
  "subtasks": [
    {
      "_id": "sub1",
      "title": "Research topic",
      "isCompleted": true  // ← Which child completed this?
    },
    {
      "_id": "sub2",
      "title": "Create slides",
      "isCompleted": false  // ← Not completed by anyone? Or not by me?
    }
  ]
}
```

**Problem:** Child doesn't know:
- ❌ What is MY progress on this task?
- ❌ Which subtasks have I completed?
- ❌ Which subtasks are still pending for me?

---

## ✅ **Proposed Enhancement**

### **Enhanced Response (✅ Clear for Collaborative):**

```json
GET /tasks/task123

{
  "_id": "task123",
  "taskType": "collaborative",
  "status": "inProgress",  // ← Global status (still useful)
  
  "myProgress": {  // ← NEW! My personal progress
    "status": "completed",
    "progressPercentage": 100,
    "completedAt": "2026-03-27T10:00:00Z",
    "startedAt": "2026-03-27T09:00:00Z",
    "completedSubtaskCount": 5
  },
  
  "subtasks": [
    {
      "_id": "sub1",
      "title": "Research topic",
      "order": 1,
      "duration": 30,
      
      "myCompletion": {  // ← NEW! My completion status
        "isCompleted": true,
        "completedAt": "2026-03-27T09:30:00Z"
      }
    },
    {
      "_id": "sub2",
      "title": "Create slides",
      "order": 2,
      "duration": 60,
      
      "myCompletion": {  // ← NEW! My completion status
        "isCompleted": false,
        "completedAt": null
      }
    }
  ]
}
```

**Benefits:**
- ✅ Child sees their OWN progress clearly
- ✅ No confusion about which subtasks they completed
- ✅ Global status still available for reference
- ✅ Works for both collaborative AND personal tasks

---

## 🔧 **Implementation**

### **File:** `task.module/task/task.controller.ts`

### **Method:** `getTaskById()`

### **Changes:**

```typescript
getTaskById = async (req: Request, res: Response) => {
  const taskId = req.params.id;
  const userId = req.user?.userId;

  // ... existing code ...

  // 🆕 NEW: For collaborative tasks, get personal progress
  let myProgress = null;
  let subtaskCompletionMap = new Map();

  if (result.taskType === 'collaborative') {
    // Get my TaskProgress
    const { TaskProgress } = await import('../../taskProgress.module/taskProgress.model');
    const taskProgress = await TaskProgress.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    }).lean();

    if (taskProgress) {
      myProgress = {
        status: taskProgress.status,
        progressPercentage: taskProgress.progressPercentage,
        completedAt: taskProgress.completedAt,
        startedAt: taskProgress.startedAt,
        completedSubtaskCount: taskProgress.completedSubtaskIndexes?.length || 0,
      };
    }

    // Get my SubTaskProgress for all subtasks
    const { SubTaskProgress } = await import('./subTaskProgress/subTaskProgress.model');
    const subtaskProgressRecords = await SubTaskProgress.find({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    }).lean();

    // Create map for quick lookup
    subtaskProgressRecords.forEach(record => {
      subtaskCompletionMap.set(record.subtaskId.toString(), {
        isCompleted: record.isCompleted,
        completedAt: record.completedAt,
      });
    });
  }

  // Format subtasks with progress information
  const formattedSubtasks = (result.subtasks || []).map(
    (subtask: any, index: number) => {
      const subtaskObj = {
        _id: subtask._id,
        title: subtask.title,
        order: subtask.order || index + 1,
        duration: subtask.duration || null,
      };

      // 🆕 NEW: For collaborative tasks, add my completion status
      if (result.taskType === 'collaborative') {
        const myCompletion = subtaskCompletionMap.get(subtask._id.toString());
        subtaskObj.myCompletion = myCompletion || {
          isCompleted: false,
          completedAt: null,
        };
      } else {
        // For personal/single-assignment tasks, use global isCompleted
        subtaskObj.isCompleted = subtask.isCompleted || false;
        subtaskObj.completedAt = subtask.completedAt || null;
      }

      return subtaskObj;
    },
  );

  // Build response
  const responseData = {
    ...result.toObject(),
    subtasks: formattedSubtasks,
  };

  // 🆕 NEW: Add myProgress for collaborative tasks
  if (result.taskType === 'collaborative' && myProgress) {
    responseData.myProgress = myProgress;
  }

  sendResponse(res, {
    code: StatusCodes.OK,
    data: responseData,
    message: 'Task retrieved successfully',
    success: true,
  });
};
```

---

## 📊 **Response Comparison**

### **Personal Task:**
```json
{
  "taskType": "personal",
  "status": "completed",
  "subtasks": [
    {
      "_id": "sub1",
      "isCompleted": true,  // ← Global (only one user)
      "completedAt": "2026-03-27T10:00:00Z"
    }
  ]
}
```

### **Single Assignment Task:**
```json
{
  "taskType": "singleAssignment",
  "status": "completed",
  "subtasks": [
    {
      "_id": "sub1",
      "isCompleted": true,  // ← Global (only one assignee)
      "completedAt": "2026-03-27T10:00:00Z"
    }
  ]
}
```

### **Collaborative Task:**
```json
{
  "taskType": "collaborative",
  "status": "inProgress",  // ← Global (may differ from my progress)
  "myProgress": {  // ← NEW! Personal progress
    "status": "completed",
    "progressPercentage": 100
  },
  "subtasks": [
    {
      "_id": "sub1",
      "myCompletion": {  // ← NEW! Personal completion
        "isCompleted": true,
        "completedAt": "2026-03-27T10:00:00Z"
      }
    }
  ]
}
```

---

## 🧪 **Testing Scenarios**

### **Test 1: Child Views Collaborative Task**
```bash
GET /tasks/task123
Authorization: Bearer <child1_token>

Expected:
- Global task status (inProgress)
- myProgress object with personal status
- Each subtask has myCompletion object
```

### **Test 2: Child Views Personal Task**
```bash
GET /tasks/task123
Authorization: Bearer <child1_token>

Expected:
- Global task status (completed)
- No myProgress object (not needed)
- Each subtask has isCompleted (global = personal)
```

### **Test 3: Child Hasn't Started Collaborative Task**
```bash
GET /tasks/task123
Authorization: Bearer <child1_token>

Expected:
- myProgress: null (hasn't started yet)
- Each subtask myCompletion: { isCompleted: false, completedAt: null }
```

---

## ✅ **Benefits**

### **For Children:**
- ✅ Clear visibility of personal progress
- ✅ No confusion about which subtasks they completed
- ✅ Can see global status for team coordination

### **For Flutter App:**
- ✅ Single API call gets all needed data
- ✅ No need for separate progress queries
- ✅ Consistent response structure

### **For System:**
- ✅ Backward compatible (personal tasks unchanged)
- ✅ Uses existing collections (TaskProgress, SubTaskProgress)
- ✅ No additional database queries for personal tasks

---

## 🚀 **Implementation Priority**

**Priority:** 🔴 **HIGH** - Should be implemented before production

**Reason:** Without this, children viewing collaborative tasks will see confusing/incorrect information about their own progress.

---

**Status:** 📝 **READY FOR IMPLEMENTATION**

---
-27-03-26
