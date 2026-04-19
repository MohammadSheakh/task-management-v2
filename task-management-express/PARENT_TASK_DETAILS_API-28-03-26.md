# Parent Task Details API Implementation

## Overview

Created dedicated API endpoint for parent dashboard task details screens based on Figma designs:
- `task-details-of-a-task.png` (single assignment)
- `task-details-of-collaborative-tasks.png` (collaborative)

## New Endpoint

```
GET /api/v1/tasks/:id/parent-details
```

## Implementation Status

### ✅ Step 1: Service Method (COMPLETED)

**File**: `src/modules/task.module/task/task.service.ts`

**Method**: `getTaskDetailsForParent(taskId, businessUserId)`

**Features**:
- ✅ Complete task information
- ✅ For COLLABORATIVE: Shows all children with individual progress
- ✅ For SINGLE_ASSIGNMENT: Shows assigned child
- ✅ Subtasks with completion status (different per task type)
- ✅ Creator and owner information
- ✅ Access validation (parent can only see their children's tasks)
- ✅ Redis caching (5 min TTL)

### ⏳ Step 2: Controller Method (TODO)

Add to `src/modules/task.module/task/task.controller.ts`:

```typescript
/**
 * Get task details for parent dashboard
 * GET /tasks/:id/parent-details
 */
getTaskDetailsForParent = async (req: Request, res: Response) => {
  const taskId = req.params.id;
  const businessUserId = req.user?.userId;

  if (!businessUserId) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }

  const result = await this.taskService.getTaskDetailsForParent(
    taskId,
    new Types.ObjectId(businessUserId)
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Task details retrieved successfully for parent dashboard',
    success: true,
  });
};
```

### ⏳ Step 3: Route (TODO)

Add to `src/modules/task.module/task/task.route.ts`:

```typescript
/*-─────────────────────────────────
|  Business (Parent/Teacher) | Task | task-details-of-a-task.png | Get task details for parent
|  @desc Get complete task details optimized for parent dashboard
|  @desc For COLLABORATIVE: Shows all children with individual progress
|  @desc For SINGLE_ASSIGNMENT: Shows assigned child with progress
|  @auth Business users only (Parent/Teacher)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/:id/parent-details')
  .get(
    auth(TRole.business),
    taskLimiter,
    controller.getTaskDetailsForParent,
  );
```

## Response Structure

### For COLLABORATIVE Tasks

```json
{
  "success": true,
  "data": {
    "taskId": "69c64ed7f9b1aea705e0ad7e",
    "title": "Complete Math Homework",
    "description": "Finish exercises 1-10 from chapter 5",
    "taskType": "collaborative",
    "status": "inProgress",
    "priority": "high",
    "scheduledTime": "09:50 AM",
    "startTime": "2026-01-05T09:50:00.000Z",
    "dueDate": "2026-01-10T23:59:59.000Z",
    "createdAt": "2026-01-05T09:50:00.000Z",
    "assignedTo": [
      {
        "child": {
          "_id": "child1",
          "name": "Alax Morgn",
          "email": "alax@example.com",
          "profileImage": "https://..."
        },
        "progress": {
          "status": "inProgress",
          "progressPercentage": 60,
          "startedAt": "2026-01-05T10:00:00.000Z",
          "completedAt": null,
          "completedSubtaskCount": 2
        }
      },
      {
        "child": {
          "_id": "child2",
          "name": "Sam Rivera",
          "email": "sam@example.com",
          "profileImage": "https://..."
        },
        "progress": {
          "status": "notStarted",
          "progressPercentage": 0,
          "startedAt": null,
          "completedAt": null,
          "completedSubtaskCount": 0
        }
      },
      {
        "child": {
          "_id": "child3",
          "name": "Jamie Chen",
          "email": "jamie@example.com",
          "profileImage": "https://..."
        },
        "progress": {
          "status": "completed",
          "progressPercentage": 100,
          "startedAt": "2026-01-05T11:00:00.000Z",
          "completedAt": "2026-01-06T15:00:00.000Z",
          "completedSubtaskCount": 3
        }
      }
    ],
    "subtasks": [
      {
        "_id": "sub1",
        "title": "Call with design team",
        "order": 1,
        "duration": null,
        "childrenCompletion": [
          {
            "childId": "child1",
            "childName": "Alax Morgn",
            "isCompleted": true,
            "completedAt": "2026-01-05T10:30:00.000Z",
            "note": null
          },
          {
            "childId": "child2",
            "childName": "Sam Rivera",
            "isCompleted": false,
            "completedAt": null,
            "note": null
          },
          {
            "childId": "child3",
            "childName": "Jamie Chen",
            "isCompleted": true,
            "completedAt": "2026-01-05T12:00:00.000Z",
            "note": null
          }
        ]
      }
    ],
    "subtaskProgress": {
      "total": 3,
      "completed": 0,
      "percentage": 0
    },
    "createdBy": {
      "_id": "parent1",
      "name": "Bashar Islam",
      "email": "bashar@example.com",
      "profileImage": "https://..."
    },
    "owner": null
  }
}
```

### For SINGLE_ASSIGNMENT Tasks

```json
{
  "success": true,
  "data": {
    "taskId": "69c64ed7f9b1aea705e0ad7f",
    "title": "Complete Math Homework",
    "taskType": "singleAssignment",
    "status": "inProgress",
    "assignedTo": [
      {
        "child": {
          "_id": "child1",
          "name": "Alax Morgn",
          "email": "alax@example.com",
          "profileImage": "https://..."
        }
        // No progress field for singleAssignment
      }
    ],
    "subtasks": [
      {
        "_id": "sub1",
        "title": "Exercise 1-10",
        "order": 1,
        "isCompleted": true,
        "completedAt": "2026-01-05T10:30:00.000Z"
      }
    ],
    "subtaskProgress": {
      "total": 3,
      "completed": 1,
      "percentage": 33
    }
  }
}
```

## Figma Requirements Mapping

### task-details-of-a-task.png (Single Assignment)

| UI Element | API Field | Status |
|------------|-----------|--------|
| Child name/avatar | `assignedTo[0].child.name` | ✅ |
| Task Created | `createdAt` | ✅ |
| Task Start Date & Time | `startTime` | ✅ |
| Status | `status` | ✅ |
| Subtask Progress | `subtaskProgress.percentage` | ✅ |
| Task Type | `taskType` | ✅ |
| Task Title | `title` | ✅ |
| Task Description | `description` | ✅ |
| Sub-Tasks List | `subtasks[]` | ✅ |

### task-details-of-collaborative-tasks.png (Collaborative)

| UI Element | API Field | Status |
|------------|-----------|--------|
| Assigned all (children) | `assignedTo[]` | ✅ |
| Each child's status | `assignedTo[].progress.status` | ✅ |
| Task Created | `createdAt` | ✅ |
| Task Start Date & Time | `startTime` | ✅ |
| Status | `status` | ✅ |
| Subtask Progress | `subtaskProgress.percentage` | ✅ |
| Task Title | `title` | ✅ |
| Task Description | `description` | ✅ |
| Sub-Tasks List | `subtasks[]` | ✅ |
| Per-child completion | `subtasks[].childrenCompletion[]` | ✅ |

## Testing

### Test Collaborative Task

```bash
curl -X GET "http://localhost:6733/api/v1/tasks/69c64ed7f9b1aea705e0ad7e/parent-details" \
  -H "Authorization: Bearer PARENT_JWT_TOKEN"
```

### Test Single Assignment Task

```bash
curl -X GET "http://localhost:6733/api/v1/tasks/69c64ed7f9b1aea705e0ad7f/parent-details" \
  -H "Authorization: Bearer PARENT_JWT_TOKEN"
```

## Next Steps

1. ✅ Service method created
2. ⏳ Add controller method
3. ⏳ Add route
4. ⏳ Test with Postman
5. ⏳ Update frontend to use new endpoint

## Files to Modify

1. `src/modules/task.module/task/task.controller.ts` - Add controller method
2. `src/modules/task.module/task/task.route.ts` - Add route
3. Frontend: Update task details screen to call `/tasks/:id/parent-details`

---

**Date**: 2026-03-28  
**Status**: Service Complete, Controller & Route Pending  
**Priority**: High (Parent Dashboard)
