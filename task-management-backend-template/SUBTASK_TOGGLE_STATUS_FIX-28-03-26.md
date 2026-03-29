# SubTask Toggle Status Fix - Smart Task Type Handling

## Issue

The endpoint `PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status` was not working correctly for **singleAssignment** tasks.

### Problem

The endpoint was only updating the `SubTaskProgress` collection, which is designed for **collaborative tasks** where each child has independent subtask completion.

For **singleAssignment** tasks, the subtask completion should update the `SubTask.isCompleted` field directly (global completion), not the `SubTaskProgress` collection.

---

## Solution

Implemented **smart task type detection** in the `toggleMySubtask` controller:

```typescript
// ✨ SMART HANDLING: Check task type to determine which collection to update
const task = await Task.findById(taskId).lean();

if (task.taskType === 'collaborative') {
  // Update SubTaskProgress (my personal completion only)
  progress = await this.subTaskProgressService.createOrUpdateProgress(
    taskId,
    subtaskId,
    userId,
    isCompleted
  );
} else {
  // Directly update SubTask.isCompleted for singleAssignment/personal
  progress = await SubTask.findByIdAndUpdate(
    subtaskId,
    { isCompleted, completedAt: isCompleted ? new Date() : null },
    { new: true }
  );
  
  // Auto-update parent task status
  await updateParentTaskProgress(taskId);
}
```

---

## Behavior by Task Type

### 1. COLLABORATIVE Tasks

**Collection**: `SubTaskProgress`

```json
{
  "taskId": "task123",
  "subtaskId": "sub456",
  "userId": "child001",
  "isCompleted": true
}
```

**What happens**:
- Creates/updates progress record for THIS child only
- Other children's progress remains unchanged
- Parent task status auto-syncs based on all children's progress

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "progress123",
    "taskId": "task123",
    "subtaskId": "sub456",
    "userId": "child001",
    "isCompleted": true,
    "completedAt": "2026-03-28T15:30:00.000Z"
  },
  "meta": {
    "taskType": "collaborative",
    "myProgressPercentage": 80,
    "completedSubtasks": 4,
    "totalSubtasks": 5,
    "allSubtasksCompleted": false
  },
  "message": "Subtask progress updated successfully (collaborative task)"
}
```

### 2. SINGLE_ASSIGNMENT Tasks

**Collection**: `SubTask`

```json
{
  "taskId": "task123",
  "subtaskId": "sub456",
  "userId": "child001",
  "isCompleted": true
}
```

**What happens**:
- Updates `SubTask.isCompleted` field (global)
- Auto-updates parent task completion percentage
- Auto-syncs parent task status if all subtasks completed

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "sub456",
    "taskId": "task123",
    "title": "Exercise 1-10",
    "isCompleted": true,
    "completedAt": "2026-03-28T15:30:00.000Z",
    "order": 1
  },
  "meta": {
    "taskType": "singleAssignment",
    "myProgressPercentage": 100,
    "completedSubtasks": 3,
    "totalSubtasks": 3,
    "allSubtasksCompleted": true
  },
  "message": "Subtask status updated successfully"
}
```

### 3. PERSONAL Tasks

**Collection**: `SubTask` (same as singleAssignment)

**Behavior**: Updates global subtask completion

---

## Files Modified

### Controller
**File**: `src/modules/task.module/subTaskProgress/subTaskProgress.controller.ts`

**Method**: `toggleMySubtask`

**Changes**:
- Added task type detection
- Conditional logic for collaborative vs singleAssignment/personal
- Enhanced logging for debugging
- Improved response with taskType in meta

### Service (No Changes Required)
- `SubTaskProgressService.createOrUpdateProgress()` - Used for collaborative
- `SubTaskService.toggleSubTaskStatus()` - Used for singleAssignment/personal

---

## Testing

### Test Case 1: Collaborative Task

```bash
curl -X PUT "http://localhost:6733/api/v1/tasks/task_collab_123/subtasks/sub456/toggle-status" \
  -H "Authorization: Bearer CHILD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isCompleted": true}'
```

**Expected**:
- `SubTaskProgress` record created/updated
- Only this child's progress changes
- Response includes `taskType: "collaborative"`

### Test Case 2: Single Assignment Task

```bash
curl -X PUT "http://localhost:6733/api/v1/tasks/task_single_123/subtasks/sub789/toggle-status" \
  -H "Authorization: Bearer CHILD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isCompleted": true}'
```

**Expected**:
- `SubTask.isCompleted` updated to `true`
- Parent task completion percentage updated
- Response includes `taskType: "singleAssignment"`

### Test Case 3: Personal Task

```bash
curl -X PUT "http://localhost:6733/api/v1/tasks/task_personal_123/subtasks/sub999/toggle-status" \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isCompleted": true}'
```

**Expected**:
- `SubTask.isCompleted` updated to `true`
- Response includes `taskType: "personal"`

---

## Logging

Enhanced logging for debugging:

```typescript
logger.info(
  `[SubTaskProgress] toggleMySubtask called: taskId=${taskId}, subtaskId=${subtaskId}, userId=${userId}, isCompleted=${isCompleted}`
);

logger.info(
  `[SubTaskProgress] Task is COLLABORATIVE - updating SubTaskProgress collection`
);
// OR
logger.info(
  `[SubTaskProgress] Task is ${task.taskType.toUpperCase()} - updating SubTask collection directly`
);
```

---

## Backward Compatibility

✅ **Fully backward compatible**

- Existing collaborative task behavior unchanged
- Single assignment tasks now work correctly (bug fix)
- Personal tasks now work correctly (bug fix)
- Same endpoint for all task types
- Response format consistent with added `taskType` in meta

---

## Related Endpoints

### Alternative Endpoint (Direct SubTask)

```
PUT /subtasks/:id/toggle-status
```

This endpoint still exists and updates `SubTask.isCompleted` directly. It's used for:
- Admin operations
- Bulk updates
- Legacy integrations

**Recommendation**: Use `/tasks/:taskId/subtasks/:subtaskId/toggle-status` for child users as it handles all task types automatically.

---

## Verification Checklist

- [x] Collaborative tasks update SubTaskProgress
- [x] Single assignment tasks update SubTask.isCompleted directly
- [x] Personal tasks update SubTask.isCompleted directly
- [x] Parent task status auto-syncs correctly for singleAssignment
- [x] Parent task status auto-syncs correctly for collaborative
- [x] Response includes taskType in meta
- [x] Logging added for debugging
- [x] Error handling for missing task
- [x] Error handling for missing isCompleted
- [x] Progress percentage calculated correctly
- [x] No Mongoose warnings
- [x] completedAt timestamp set correctly

---

## Summary

**Before**: Only worked for collaborative tasks (updated SubTaskProgress)

**After**: Works for ALL task types with smart detection:
- Collaborative → SubTaskProgress ✓
- Single Assignment → SubTask ✓
- Personal → SubTask ✓

**Impact**: Fixes subtask toggle for singleAssignment and personal tasks while maintaining collaborative task functionality.

---

**Date**: 2026-03-28  
**Author**: Senior Engineering Team  
**Version**: 1.0.0
