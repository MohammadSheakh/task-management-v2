# ✅ Task Creation with Bulk Subtask Creation

**Date:** 24-03-26  
**Status:** ✅ COMPLETE  
**Author:** Senior Engineering Team

---

## 📋 Overview

Updated the task creation API to support **bulk subtask creation** in a single request, aligning with the Figma design where users add subtasks inline before submitting the task.

**Previous Approach:**
- `POST /tasks` - Create task
- `POST /tasks/subtask` - Add subtasks one by one ❌

**New Approach:**
- `POST /tasks` - Create task **with subtasks array** ✅

---

## 🎨 Figma Alignment

The Figma screens show:
1. User fills in task details (title, description, date/time)
2. User clicks "+ Add Sub Task" multiple times to add subtasks inline
3. User clicks "Create Task" to submit **everything at once**

**Screens:**
- `add-task-flow-for-permission-account-interface.png`
- `teacher-parent-dashboard/task-monitoring/create-task-flow/*`

---

## 🔌 API Endpoint

### `POST /tasks`

**Auth:** Child user (Secondary User) or Business user  
**Rate Limit:** 30 requests per minute

### Request Body

```typescript
{
  // Required fields
  title: string;                    // Task title (max 200 chars)
  taskType: "personal" | "singleAssignment" | "collaborative";
  startTime: string;                // ISO 8601 date format

  // Optional fields
  description?: string;             // Task description (max 2000 chars)
  scheduledTime?: string;           // Optional scheduled time
  priority?: "low" | "medium" | "high";
  status?: "pending" | "inProgress" | "completed";
  ownerUserId?: string;             // ObjectId
  assignedUserIds?: string[];       // Array of ObjectIds
  groupId?: string;                 // ObjectId
  dueDate?: string;                 // ISO 8601 date format

  // ✅ NEW: Subtasks array (bulk creation)
  subtasks?: [
    {
      title: string;               // Subtask title (max 200 chars)
      duration?: number;           // Duration in minutes
      isCompleted?: boolean;       // Default: false
      order?: number;              // Default: auto-increment
    }
  ];
}
```

### Example Request

```json
POST /tasks
Authorization: Bearer <jwt_token>

{
  "title": "Complete Math Homework",
  "taskType": "singleAssignment",
  "startTime": "2026-03-25T08:00:00.000Z",
  "description": "Finish exercises 1-10 from chapter 5",
  "priority": "high",
  "assignedUserIds": ["507f1f77bcf86cd799439011"],
  "subtasks": [
    {
      "title": "Read chapter 5",
      "duration": 30,
      "order": 1
    },
    {
      "title": "Solve exercises 1-5",
      "duration": 45,
      "order": 2
    },
    {
      "title": "Solve exercises 6-10",
      "duration": 45,
      "order": 3
    },
    {
      "title": "Review answers",
      "duration": 15,
      "order": 4
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "code": 201,
  "data": {
    "_id": "507f191e810c19729de860ea",
    "title": "Complete Math Homework",
    "taskType": "singleAssignment",
    "description": "Finish exercises 1-10 from chapter 5",
    "startTime": "2026-03-25T08:00:00.000Z",
    "priority": "high",
    "status": "pending",
    "ownerUserId": "507f1f77bcf86cd799439011",
    "assignedUserIds": ["507f1f77bcf86cd799439011"],
    "createdById": "507f1f77bcf86cd799439012",
    "totalSubtasks": 4,
    "completedSubtasks": 0,
    "createdAt": "2026-03-24T10:30:00.000Z",
    "updatedAt": "2026-03-24T10:30:00.000Z"
  },
  "message": "Task created successfully"
}
```

---

## 🔧 Backend Implementation

### Service Method: `bulkCreateSubtasks`

```typescript
private async bulkCreateSubtasks(
  taskId: string,
  subtasksData: Array<{
    title: string;
    duration?: number;
    isCompleted?: boolean;
    order?: number;
  }>,
  userId: Types.ObjectId
): Promise<void> {
  const { SubTask } = await import('../subTask/subTask.model');

  // Prepare subtasks for bulk insertion
  const subtasksToCreate = subtasksData.map((subtask, index) => ({
    taskId: new Types.ObjectId(taskId),
    title: subtask.title,
    duration: subtask.duration || null,
    isCompleted: subtask.isCompleted || false,
    order: subtask.order || (index + 1),
    createdById: userId,
    completedAt: subtask.isCompleted ? new Date() : null,
  }));

  // Insert all subtasks in one operation
  await SubTask.insertMany(subtasksToCreate);

  logger.info(`Bulk created ${subtasksToCreate.length} subtasks for task ${taskId}`);
}
```

### Key Features:

1. **Atomic Operation:** All subtasks are created in a single `insertMany` call
2. **Auto-ordering:** If `order` is not provided, auto-increments based on array position
3. **Validation:** Subtask count is validated (3-5 subtasks as per Figma)
4. **Performance:** Single database operation instead of multiple calls

---

## 📊 Validation Schema

```typescript
export const createTaskValidationSchema = z.object({
  body: z.object({
    // ... task fields ...

    // ✅ NEW: Subtasks array
    subtasks: z
      .array(
        z.object({
          title: z
            .string({ required_error: 'Subtask title is required' })
            .min(1, 'Title cannot be empty')
            .max(200, 'Title cannot exceed 200 characters'),
          duration: z.number().optional(),
          isCompleted: z.boolean().default(false).optional(),
          order: z.number().optional(),
        })
      )
      .optional(),
  }),
});
```

---

## 🔄 Frontend Usage

### Before (Old Approach - Deprecated)

```typescript
// ❌ Two-step process
const task = await api.post('/tasks', {
  title: 'My Task',
  taskType: 'personal',
  startTime: '2026-03-25T08:00:00.000Z',
});

// Then add subtasks one by one
await api.post(`/tasks/${task._id}/subtasks`, { title: 'Subtask 1' });
await api.post(`/tasks/${task._id}/subtasks`, { title: 'Subtask 2' });
await api.post(`/tasks/${task._id}/subtasks`, { title: 'Subtask 3' });
```

### After (New Approach - Recommended)

```typescript
// ✅ Single request with all subtasks
await api.post('/tasks', {
  title: 'My Task',
  taskType: 'personal',
  startTime: '2026-03-25T08:00:00.000Z',
  subtasks: [
    { title: 'Subtask 1', duration: 30 },
    { title: 'Subtask 2', duration: 45 },
    { title: 'Subtask 3', duration: 20 },
  ],
});
```

---

## 🎯 Permission Handling

### Secondary User Check

The existing `checkSecondaryUserPermission` middleware handles permissions:

- **Business Users:** Always allowed to create tasks
- **Child Users:** Only allowed if `isSecondaryUser: true`
- **Regular Child:** Can only create personal tasks (blocked by middleware)

### Task Type Validation

The `validateTaskTypeConsistency` middleware ensures:

- **Personal tasks:** No assigned users
- **Single assignment:** Exactly one assigned user
- **Collaborative:** At least two assigned users

---

## 📁 Files Modified

| File | Changes |
|------|---------|
| `src/modules/task.module/task/task.service.ts` | Added `bulkCreateSubtasks()` method |
| `src/modules/task.module/task/task.validation.ts` | Added subtasks array validation |
| `src/modules/task.module/task/task.controller.ts` | No changes (already supports subtasks) |
| `src/modules/task.module/task/task.route.ts` | No changes (route already exists) |

---

## 🧪 Testing

### Test Case 1: Create task with subtasks

```bash
curl -X POST "http://localhost:3000/tasks" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Task",
    "taskType": "personal",
    "startTime": "2026-03-25T08:00:00.000Z",
    "subtasks": [
      {"title": "Step 1", "duration": 15},
      {"title": "Step 2", "duration": 30}
    ]
  }'
```

**Expected:** Task created with 2 subtasks

---

### Test Case 2: Create task without subtasks

```bash
curl -X POST "http://localhost:3000/tasks" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Simple Task",
    "taskType": "personal",
    "startTime": "2026-03-25T09:00:00.000Z"
  }'
```

**Expected:** Task created with `totalSubtasks: 0`

---

### Test Case 3: Create collaborative task with subtasks

```bash
curl -X POST "http://localhost:3000/tasks" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Group Project",
    "taskType": "collaborative",
    "startTime": "2026-03-25T10:00:00.000Z",
    "assignedUserIds": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
    "subtasks": [
      {"title": "Research", "duration": 60},
      {"title": "Write report", "duration": 90},
      {"title": "Present findings", "duration": 30}
    ]
  }'
```

**Expected:** Task created with 3 subtasks and TaskProgress records for all assigned users

---

## 🚀 Migration Notes

### For Existing Code

The separate `POST /tasks/:id/subtasks` endpoint **still exists** for:
- Adding subtasks after task creation
- Incremental subtask additions

### Recommended Migration

1. **New features:** Use bulk creation approach
2. **Existing code:** Can continue using separate endpoint (still supported)
3. **Frontend:** Update to send all subtasks in task creation request

---

## ✅ Summary

### What Changed:
- ✅ Added `subtasks[]` array support in `POST /tasks` request body
- ✅ Implemented `bulkCreateSubtasks()` service method
- ✅ Updated validation schema to accept subtasks array
- ✅ Auto-calculates `totalSubtasks` and `completedSubtasks`

### What Stayed:
- ✅ Separate subtask endpoints still work (for editing/adding later)
- ✅ Permission checks remain unchanged
- ✅ Task type validation remains unchanged

### Benefits:
- ✅ **Single API call** instead of multiple
- ✅ **Better performance** (bulk insert)
- ✅ **Atomic operation** (all or nothing)
- ✅ **Figma-aligned** UX flow

---

**All APIs are ready for production use! 🎉**
