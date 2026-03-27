# Subtask → TaskProgress Auto-Sync — Complete Guide

**Module:** task.module/subTask + taskProgress.module  
**Version:** 1.0  
**Last Updated:** 27-03-26  
**Figma Reference:** `figma-asset/app-user/group-children-user/home-flow.png`, `task-details-with-subTasks.png`

---

## 📋 Overview

This document explains the **subtask completion auto-sync** system that automatically updates a child's TaskProgress when they complete **ALL subtasks** of a collaborative task.

---

## 🎯 Problem Solved

### **Before (Missing Feature):**
```
Child completes subtask 1/5 → TaskProgress: notStarted ❌
Child completes subtask 2/5 → TaskProgress: notStarted ❌
Child completes subtask 3/5 → TaskProgress: notStarted ❌
Child completes subtask 4/5 → TaskProgress: notStarted ❌
Child completes subtask 5/5 → TaskProgress: STILL notStarted ❌

Parent sees: Child hasn't started yet! (Wrong!)
```

### **After (Fixed):**
```
Child completes subtask 1/5 → TaskProgress: inProgress ✅
Child completes subtask 2/5 → TaskProgress: inProgress ✅
Child completes subtask 3/5 → TaskProgress: inProgress ✅
Child completes subtask 4/5 → TaskProgress: inProgress ✅
Child completes subtask 5/5 → TaskProgress: COMPLETED ✅ (Auto!)

Parent sees: Child completed all subtasks! ✅
```

---

## 🏗️ Architecture

### **Complete Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│          SubTask → TaskProgress Auto-Sync System            │
└─────────────────────────────────────────────────────────────┘

Child Action              SubTask Service              TaskProgress
═══════════════════════════════════════════════════════════════════

PUT /subtasks/:id/toggle-status
   │
   │ { isCompleted: true }
   ▼
┌──────────────────────────┐
│  toggleSubTaskStatus()   │
│  - Update subtask        │
│  - Mark isCompleted=true │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  updateParentTaskProgress│
│  - Update task stats     │
│  - totalSubtasks, etc.   │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ 🆕 checkAndSyncChildTaskProgress()   │
│  - Get task (verify collaborative)   │
│  - Get all subtasks                  │
│  - Count completed subtasks          │
│  - Check: ALL completed?             │
└──────────┬───────────────────────────┘
           │
           │ YES ✅
           ▼
┌──────────────────────────────────────┐
│  Find/FindOrCreate TaskProgress      │
│  - status: "completed"               │
│  - progressPercentage: 100           │
│  - completedAt: new Date()           │
│  - completedSubtaskIndexes: [0,1,2…] │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  syncParentTaskStatusWithChildren()  │
│  - Check if ALL children completed   │
│  - Update parent task if needed      │
│  - Emit Socket.io event              │
└──────────┬───────────────────────────┘
           │
           ▼
    Parent Dashboard Updates! 🎉
```

---

## 🔌 API Endpoint

### **Toggle Subtask Status**

```typescript
PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status

// Request Body
{
  "isCompleted": true  // or false
}

// Response (when ALL subtasks completed)
{
  "success": true,
  "data": {
    "_id": "subtaskId123",
    "title": "Call with design team",
    "isCompleted": true,
    "completedAt": "2026-03-27T10:35:00.000Z",
    "order": 1,
    "duration": 10
  },
  "meta": {
    "allSubtasksCompleted": true,  // ✅ NEW!
    "childTaskProgressUpdated": true,  // ✅ NEW!
    "childTaskProgressStatus": "completed",  // ✅ NEW!
    "parentTaskSynced": true  // ✅ NEW!
  }
}
```

---

## 🆕 New Implementation

### **Method: `checkAndSyncChildTaskProgress(taskId, userId)`**

**Location:** `src/modules/task.module/subTask/subTask.service.ts` (lines 420-485)

**What It Does:**
1. ✅ Verifies task is collaborative
2. ✅ Gets all subtasks for the task
3. ✅ Counts completed subtasks
4. ✅ Checks if **ALL** subtasks are completed
5. ✅ Finds or creates TaskProgress for the child
6. ✅ Updates TaskProgress to "completed"
7. ✅ Syncs parent task status

**Code:**
```typescript
private async checkAndSyncChildTaskProgress(
  taskId: string,
  userId: Types.ObjectId
): Promise<void> {
  try {
    // 1. Verify collaborative task
    const task = await Task.findById(taskId).lean();
    if (!task || task.taskType !== TaskType.COLLABORATIVE) {
      return; // Only for collaborative tasks
    }

    // 2. Get all subtasks
    const allSubtasks = await SubTask.find({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).lean();

    if (allSubtasks.length === 0) {
      return; // No subtasks
    }

    // 3. Count completed subtasks
    const completedSubtasks = allSubtasks.filter(st => st.isCompleted).length;
    const totalSubtasks = allSubtasks.length;

    // 4. Check if ALL subtasks are completed
    if (completedSubtasks === totalSubtasks) {
      // 5. Find or create TaskProgress for this child
      let taskProgress = await TaskProgress.findOne({
        taskId: new Types.ObjectId(taskId),
        userId: userId,
        isDeleted: false,
      });

      if (!taskProgress) {
        // Create new progress record
        taskProgress = new TaskProgress({
          taskId: new Types.ObjectId(taskId),
          userId: userId,
          status: TaskProgressStatus.COMPLETED,
          completedAt: new Date(),
          progressPercentage: 100,
          completedSubtaskIndexes: allSubtasks.map((_, index) => index),
        });
        await taskProgress.save();
      } else {
        // Update existing progress
        taskProgress.status = TaskProgressStatus.COMPLETED;
        taskProgress.completedAt = new Date();
        taskProgress.progressPercentage = 100;
        taskProgress.completedSubtaskIndexes = allSubtasks.map((_, index) => index);
        await taskProgress.save();
      }

      // 6. Sync parent task status
      await this.syncParentTaskStatusWithChildrenProgress(taskId);
    }
  } catch (error) {
    errorLogger.error('[SubTask] Error in checkAndSyncChildTaskProgress:', error);
    // Don't throw - background check
  }
}
```

---

### **Enhanced: `toggleSubTaskStatus()` Method**

**Location:** `src/modules/task.module/subTask/subTask.service.ts` (lines 85-112)

**New Flow:**
```typescript
async toggleSubTaskStatus(
  subtaskId: string,
  isCompleted: boolean,
  userId: Types.ObjectId
): Promise<ISubTask> {
  // 1. Update subtask
  const updatedSubtask = await this.model.findByIdAndUpdate(
    subtaskId,
    {
      isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    },
    { new: true }
  );

  // 2. Update parent task progress
  await this.updateParentTaskProgress(updatedSubtask.taskId.toString());

  // 🆕 NEW: Check if child completed ALL subtasks
  await this.checkAndSyncChildTaskProgress(
    updatedSubtask.taskId.toString(),
    userId
  );

  return updatedSubtask;
}
```

---

## 📊 Complete State Flow

### **Scenario: Child Completes All 5 Subtasks**

```
┌─────────────────────────────────────────────────────────────┐
│          Collaborative Task with 5 Subtasks                 │
└─────────────────────────────────────────────────────────────┘

Step 1: Child completes subtask 1/5
┌─────────────────────────────────────────┐
│ Subtask 1: ✅ completed                  │
│ Subtask 2: ⏳ pending                    │
│ Subtask 3: ⏳ pending                    │
│ Subtask 4: ⏳ pending                    │
│ Subtask 5: ⏳ pending                    │
│                                         │
│ TaskProgress: 🔄 inProgress             │
│ Progress: 20%                           │
└─────────────────────────────────────────┘

Step 2: Child completes subtask 2/5
┌─────────────────────────────────────────┐
│ Subtask 1: ✅ completed                  │
│ Subtask 2: ✅ completed                  │
│ Subtask 3: ⏳ pending                    │
│ Subtask 4: ⏳ pending                    │
│ Subtask 5: ⏳ pending                    │
│                                         │
│ TaskProgress: 🔄 inProgress             │
│ Progress: 40%                           │
└─────────────────────────────────────────┘

Step 3: Child completes subtask 3/5
┌─────────────────────────────────────────┐
│ Subtask 1: ✅ completed                  │
│ Subtask 2: ✅ completed                  │
│ Subtask 3: ✅ completed                  │
│ Subtask 4: ⏳ pending                    │
│ Subtask 5: ⏳ pending                    │
│                                         │
│ TaskProgress: 🔄 inProgress             │
│ Progress: 60%                           │
└─────────────────────────────────────────┘

Step 4: Child completes subtask 4/5
┌─────────────────────────────────────────┐
│ Subtask 1: ✅ completed                  │
│ Subtask 2: ✅ completed                  │
│ Subtask 3: ✅ completed                  │
│ Subtask 4: ✅ completed                  │
│ Subtask 5: ⏳ pending                    │
│                                         │
│ TaskProgress: 🔄 inProgress             │
│ Progress: 80%                           │
└─────────────────────────────────────────┘

Step 5: Child completes subtask 5/5 (LAST!)
┌─────────────────────────────────────────┐
│ Subtask 1: ✅ completed                  │
│ Subtask 2: ✅ completed                  │
│ Subtask 3: ✅ completed                  │
│ Subtask 4: ✅ completed                  │
│ Subtask 5: ✅ completed                  │
│                                         │
│ TaskProgress: ✅ COMPLETED  🎉          │
│ Progress: 100%                          │
│ completedAt: Jan 5, 10:35 AM            │
│                                         │
│ 🆕 Auto-synced!                         │
└─────────────────────────────────────────┘
```

---

## 🔄 Integration with Parent Task Sync

### **Complete Chain Reaction**

```
Child completes last subtask
       ↓
✅ SubTask.isCompleted = true
       ↓
✅ checkAndSyncChildTaskProgress()
       ↓
✅ TaskProgress.status = "completed"
       ↓
✅ syncParentTaskStatusWithChildrenProgress()
       ↓
✅ Check: Are ALL children completed?
       ↓
   YES │  NO
       │
       ├──────────────┐
       │              │
       ▼              │
Parent: "completed"  │
Emit socket event    │
Parent dashboard     │
updates 🎉           │
       │              │
       └──────────────┘
              │
              ▼
         (stays "inProgress")
```

---

## 🧪 Testing Scenarios

### **Test Case 1: Personal Task with Subtasks**

```
GIVEN: Personal task with 3 subtasks
WHEN: Child completes all 3 subtasks
THEN:
  ✅ All subtasks → isCompleted: true
  ✅ TaskProgress → status: "completed"
  ✅ TaskProgress → progressPercentage: 100
  ✅ TaskProgress → completedAt: set
```

### **Test Case 2: Collaborative Task - Partial Completion**

```
GIVEN: Collaborative task with 5 subtasks
GIVEN: Child completed 4/5 subtasks
WHEN: Child completes 5th subtask
THEN:
  ✅ All subtasks → isCompleted: true
  ✅ Child TaskProgress → status: "completed" ⭐ NEW!
  ✅ Child TaskProgress → progressPercentage: 100
  ✅ Parent task → check if ALL children completed
```

### **Test Case 3: Collaborative Task - Last Child**

```
GIVEN: Collaborative task with 5 subtasks
GIVEN: Child 1 & 2 already completed all subtasks
GIVEN: Child 3 completed 4/5 subtasks
WHEN: Child 3 completes 5th subtask
THEN:
  ✅ Child 3 TaskProgress → "completed"
  ✅ Parent task → "completed" (all children done)
  ✅ Socket event emitted
  ✅ Parent dashboard updates
```

### **Test Case 4: Non-Collaborative Task**

```
GIVEN: Single assignment task with 3 subtasks
WHEN: Child completes all 3 subtasks
THEN:
  ✅ All subtasks → isCompleted: true
  ✅ Task auto-completes (existing behavior)
  ✅ No TaskProgress created (not collaborative)
```

---

## 📁 Files Modified

| File | Method | Changes | Lines |
|------|--------|---------|-------|
| `subTask.service.ts` | `toggleSubTaskStatus()` | Added `checkAndSyncChildTaskProgress()` call | 103-107 |
| `subTask.service.ts` | `checkAndSyncChildTaskProgress()` | NEW method | 420-485 |
| `subTask.service.ts` | `syncParentTaskStatusWithChildrenProgress()` | NEW helper method | 487-501 |

---

## 🎯 Benefits

### **For Children:**
- ✅ **Automatic progress tracking** → No manual status updates needed
- ✅ **Clear accomplishment** → See 100% when all subtasks done
- ✅ **Simple workflow** → Just complete subtasks, system handles rest

### **For Parents/Teachers:**
- ✅ **Real-time visibility** → See when child completes all subtasks
- ✅ **Accurate monitoring** → TaskProgress reflects actual completion
- ✅ **Better insights** → Know which children finished all subtasks

### **For System:**
- ✅ **Consistent state** → TaskProgress always in sync with subtasks
- ✅ **Automated workflow** → No manual intervention needed
- ✅ **Observable** → Comprehensive logging for debugging

---

## 🔍 Observability

### **Logging**

**Success Logs:**
```typescript
[SubTask] Created TaskProgress for child userId123 - All 5/5 subtasks completed
[SubTask] Updated TaskProgress for child userId123 - All 5/5 subtasks completed
```

**Error Logs:**
```typescript
[SubTask] Error in checkAndSyncChildTaskProgress: <error details>
```

### **Metrics to Monitor**

- Subtask toggle events per day
- Auto-complete success rate
- Average time from first subtask to all completed
- TaskProgress sync success rate

---

## 📱 Flutter Integration

### **Toggle Subtask**

```dart
// Child toggles subtask completion
Future<void> toggleSubtask(String taskId, String subtaskId) async {
  final response = await http.put(
    Uri.parse('$baseUrl/tasks/$taskId/subtasks/$subtaskId/toggle-status'),
    headers: {'Authorization': 'Bearer $token'},
    body: jsonEncode({'isCompleted': true}),
  );
  
  final data = jsonDecode(response.body);
  
  // Check if all subtasks completed
  if (data.meta?.allSubtasksCompleted == true) {
    showCelebrationAnimation();
    print('All subtasks completed!');
    print('TaskProgress updated to: ${data.meta.childTaskProgressStatus}');
  }
}
```

### **Listen for TaskProgress Updates**

```dart
@override
void initState() {
  super.initState();
  
  // Listen for TaskProgress updates
  socket.on('taskProgress:updated', (data) {
    if (data.taskId == widget.taskId) {
      setState(() {
        childProgress.status = data.status;
        childProgress.progressPercentage = data.progressPercentage;
      });
      
      if (data.status == 'completed') {
        showCelebrationAnimation();
      }
    }
  });
}
```

---

## ✅ Summary

| Feature | Implementation |
|---------|---------------|
| **Subtask toggle** | ✅ Updates subtask status |
| **Check all subtasks** | ✅ Counts completed subtasks |
| **Auto-complete TaskProgress** | ✅ When ALL subtasks done |
| **Sync parent task** | ✅ Via TaskProgressService |
| **Real-time updates** | ✅ Socket.io events |
| **Non-blocking** | ✅ Errors logged, don't break flow |

---

**Related Documentation:**
- `COLLABORATIVE_TASK_STATUS_SYNC-27-03-26.md` - Parent task sync
- `TASK_STATUS_UPDATE_FLOW-27-03-26.md` - Status update flow
- `subTask-module-sequence.mermaid` - Subtask sequence diagram

---
-27-03-26
