# Task Dashboard V4 API - Enhanced Subtask Handling

## Overview

**Version**: 4.0.0  
**Date**: 2026-03-28  
**Author**: Senior Engineering Team

### What's New in V4?

The V4 endpoint enhances subtask handling for **both collaborative AND singleAssignment tasks**. It builds upon V3 by adding proper subtask completion tracking based on task type.

---

## Key Features

### ✨ V4 Enhancements

| Feature | V3 | V4 |
|---------|----|----|
| Subtasks for collaborative tasks | ❌ | ✅ **NEW** |
| Subtasks for singleAssignment tasks | ❌ | ✅ **NEW** |
| Per-child subtask completion (collaborative) | ❌ | ✅ **NEW** |
| Global subtask completion (singleAssignment) | ❌ | ✅ **NEW** |
| Child progress tracking (collaborative) | ✅ | ✅ |
| Dashboard counts | ✅ | ✅ |

### Subtask Handling by Task Type

#### 1. **COLLABORATIVE Tasks**
Each child has independent subtask completion status via `SubTaskProgress` collection.

```json
{
  "taskType": "collaborative",
  "subtasks": [
    {
      "_id": "sub001",
      "title": "Research planets",
      "order": 1,
      "myCompletion": {
        "isCompleted": true,
        "completedAt": "2026-03-28T15:30:00.000Z",
        "note": "Completed research on Mars and Jupiter"
      }
    }
  ]
}
```

#### 2. **SINGLE ASSIGNMENT Tasks**
Global subtask completion status from the `SubTask` collection.

```json
{
  "taskType": "singleAssignment",
  "subtasks": [
    {
      "_id": "sub001",
      "title": "Exercise 1-10",
      "order": 1,
      "isCompleted": true,
      "completedAt": "2026-03-28T16:00:00.000Z"
    }
  ]
}
```

#### 3. **PERSONAL Tasks**
No subtasks shown (parent's personal tasks).

---

## API Endpoint

```
GET /api/v1/tasks/dashboard/children-tasks/v4
```

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `'all'` | Filter: `'all'`, `'pending'`, `'inProgress'`, `'completed'` |
| `taskType` | string | `'children'` | Filter: `'children'`, `'personal'` |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page |
| `sortBy` | string | `'-startTime'` | Sort field |
| `from` | string | - | Start date (ISO format) |
| `to` | string | - | End date (ISO format) |

### Authorization

- **Role**: Business (Parent/Teacher) only
- **Rate Limit**: 100 requests per minute

---

## Response Structure

### Complete Example

```json
{
  "success": true,
  "code": 200,
  "data": {
    "tasks": [
      {
        "_id": "task_collab_001",
        "title": "Group Science Project",
        "description": "Work together on solar system model",
        "status": "inProgress",
        "priority": "high",
        "taskType": "collaborative",
        "scheduledTime": "02:00 PM",
        "startTime": "2026-03-28T14:00:00.000Z",
        "dueDate": "2026-04-05T23:59:59.000Z",
        "totalSubtasks": 5,
        "completedSubtasks": 3,
        "completionPercentage": 60,
        "subtasks": [
          {
            "_id": "sub001",
            "title": "Research planets",
            "order": 1,
            "duration": null,
            "myCompletion": {
              "isCompleted": true,
              "completedAt": "2026-03-28T15:30:00.000Z",
              "note": null
            }
          },
          {
            "_id": "sub002",
            "title": "Create presentation",
            "order": 2,
            "duration": null,
            "myCompletion": {
              "isCompleted": false,
              "completedAt": null,
              "note": null
            }
          }
        ],
        "assignedTo": [
          {
            "_id": "child_001",
            "name": "Alex Morgan",
            "email": "alex@example.com",
            "profileImage": "https://example.com/alex.jpg",
            "progress": {
              "status": "inProgress",
              "progressPercentage": 80,
              "startedAt": "2026-03-28T15:30:00.000Z",
              "completedAt": null,
              "completedSubtaskCount": 4
            }
          },
          {
            "_id": "child_002",
            "name": "Sam Morgan",
            "email": "sam@example.com",
            "profileImage": "https://example.com/sam.jpg",
            "progress": {
              "status": "inProgress",
              "progressPercentage": 40,
              "startedAt": "2026-03-29T10:00:00.000Z",
              "completedAt": null,
              "completedSubtaskCount": 2
            }
          }
        ],
        "createdBy": {
          "_id": "parent_001",
          "name": "Parent Name",
          "email": "parent@example.com",
          "profileImage": "https://example.com/parent.jpg"
        },
        "owner": null
      },
      {
        "_id": "task_single_001",
        "title": "Math Homework",
        "description": "Complete exercises 1-20",
        "status": "pending",
        "priority": "medium",
        "taskType": "singleAssignment",
        "scheduledTime": "04:00 PM",
        "startTime": "2026-03-28T16:00:00.000Z",
        "dueDate": "2026-03-30T23:59:59.000Z",
        "totalSubtasks": 3,
        "completedSubtasks": 1,
        "completionPercentage": 33,
        "subtasks": [
          {
            "_id": "sub101",
            "title": "Exercise 1-10",
            "order": 1,
            "duration": null,
            "isCompleted": true,
            "completedAt": "2026-03-28T17:00:00.000Z"
          },
          {
            "_id": "sub102",
            "title": "Exercise 11-15",
            "order": 2,
            "duration": null,
            "isCompleted": false,
            "completedAt": null
          },
          {
            "_id": "sub103",
            "title": "Exercise 16-20",
            "order": 3,
            "duration": null,
            "isCompleted": false,
            "completedAt": null
          }
        ],
        "assignedTo": [
          {
            "_id": "child_001",
            "name": "Alex Morgan",
            "email": "alex@example.com",
            "profileImage": "https://example.com/alex.jpg"
          }
        ],
        "createdBy": {
          "_id": "parent_001",
          "name": "Parent Name",
          "email": "parent@example.com",
          "profileImage": "https://example.com/parent.jpg"
        },
        "owner": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 6,
      "totalPages": 1
    },
    "filters": {
      "status": "all",
      "taskType": "children"
    },
    "counts": {
      "total": 6,
      "byStatus": {
        "pending": 1,
        "inProgress": 3,
        "completed": 2
      },
      "personal": 0
    }
  },
  "message": "Children tasks with subtask progress retrieved successfully for dashboard"
}
```

---

## Subtask Structure Comparison

### Collaborative Task Subtask

```typescript
{
  _id: string;
  title: string;
  order: number;
  duration: number | null;
  myCompletion: {
    isCompleted: boolean;
    completedAt: Date | null;
    note: string | null;
  };
}
```

**Why `myCompletion`?**  
In collaborative tasks, each child completes subtasks independently. Child A completing "Research planets" doesn't mean Child B has completed it. The `SubTaskProgress` collection tracks individual completion.

### Single Assignment Task Subtask

```typescript
{
  _id: string;
  title: string;
  order: number;
  duration: number | null;
  isCompleted: boolean;
  completedAt: Date | null;
}
```

**Why `isCompleted`?**  
In single assignment tasks, there's only one child assigned. The global `SubTask.isCompleted` field is sufficient.

---

## Use Cases

### 1. Display Collaborative Task with Subtasks

```javascript
// Get tasks with enhanced subtask handling
const { data } = await api.get('/tasks/dashboard/children-tasks/v4');

data.tasks.forEach(task => {
  if (task.taskType === 'collaborative') {
    console.log(`Collaborative: ${task.title}`);
    
    // Show subtasks with my completion status
    task.subtasks.forEach(subtask => {
      console.log(`- ${subtask.title}: ${subtask.myCompletion.isCompleted ? '✓' : '○'}`);
    });
    
    // Show each child's overall progress
    task.assignedTo.forEach(child => {
      console.log(`${child.name}: ${child.progress.progressPercentage}% done`);
    });
  }
});
```

### 2. Display Single Assignment Task with Subtasks

```javascript
data.tasks.forEach(task => {
  if (task.taskType === 'singleAssignment') {
    console.log(`Single Assignment: ${task.title}`);
    
    // Show subtasks with global completion status
    task.subtasks.forEach(subtask => {
      console.log(`- ${subtask.title}: ${subtask.isCompleted ? '✓' : '○'}`);
    });
  }
});
```

### 3. Filter by Task Type

```javascript
// Get only collaborative tasks with subtasks
const collaborativeTasks = await api.get(
  '/tasks/dashboard/children-tasks/v4?taskType=children&status=all'
);

// Get only single assignment tasks
const singleAssignmentTasks = await api.get(
  '/tasks/dashboard/children-tasks/v4?taskType=children&status=all'
);
// Then filter client-side: tasks.filter(t => t.taskType === 'singleAssignment')
```

---

## Implementation Details

### Service Method

```typescript
async getChildrenTasksForDashboardV4(
  businessUserId: Types.ObjectId,
  filters: any,
  options: any,
)
```

### Key Steps

1. **Get Children**: Fetch all active children for the business user
2. **Build Query**: Construct query based on `taskType` filter
3. **Fetch Tasks**: Get paginated tasks with population
4. **Fetch SubTasks**: Get all subtasks for retrieved tasks (V4 NEW)
5. **Fetch SubTaskProgress**: For collaborative tasks, get per-child subtask completion (V4 NEW)
6. **Fetch TaskProgress**: For collaborative tasks, get child-level progress (V3)
7. **Format Subtasks**: Apply task-type-specific subtask formatting (V4 NEW)
8. **Calculate Counts**: Aggregate status counts for dashboard badges
9. **Cache Response**: Store in Redis for 2 minutes

### Performance Optimization

- **Single SubTask Query**: All subtasks fetched in one query
- **Single SubTaskProgress Query**: All progress records in one query
- **Map Structure**: Uses nested `Map` for O(1) lookups
- **Redis Caching**: 120-second TTL
- **Selective Enhancement**: Only collaborative tasks get SubTaskProgress (minimal overhead)

---

## Files Modified

### 1. Service Layer
**File**: `src/modules/task.module/task/task.service.ts`

- Added `getChildrenTasksForDashboardV4()` method
- SubTask integration for all task types
- SubTaskProgress integration for collaborative tasks
- TaskProgress integration (from V3)

### 2. Controller Layer
**File**: `src/modules/task.module/task/task.controller.ts`

- Added `getChildrenTasksForDashboardV4()` method
- Request validation and response formatting

### 3. Route Layer
**File**: `src/modules/task.module/task/task.route.ts`

- Added route: `/dashboard/children-tasks/v4`
- Middleware stack: auth, rate limiting, query validation

---

## Version Comparison

### V1 → V2 → V3 → V4 Evolution

| Version | Key Feature |
|---------|-------------|
| V1 | Basic task list with assigned children |
| V2 | Enhanced dashboard counts |
| V3 | Child progress tracking for collaborative tasks |
| **V4** | **Enhanced subtask handling for all task types** |

---

## Testing

### Manual Testing Checklist

- [ ] Collaborative tasks show `myCompletion` for each subtask
- [ ] Single assignment tasks show `isCompleted` for each subtask
- [ ] Personal tasks work correctly (no subtasks)
- [ ] SubTaskProgress data is accurate for collaborative tasks
- [ ] Global SubTask data is accurate for singleAssignment tasks
- [ ] Child progress tracking works (V3 feature still present)
- [ ] Pagination works correctly
- [ ] Status filtering works
- [ ] TaskType filtering works
- [ ] Counts are accurate
- [ ] Redis caching is working

### Example Test Query

```bash
curl -X GET "http://localhost:6733/api/v1/tasks/dashboard/children-tasks/v4?status=all&taskType=children&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Backward Compatibility

All versions coexist:

| Endpoint | Version | Status |
|----------|---------|--------|
| `/tasks/dashboard/children-tasks` | V1 (calls V2 internally) | ✅ Active |
| `/tasks/dashboard/children-tasks/v3` | V3 | ✅ Active |
| `/tasks/dashboard/children-tasks/v4` | V4 | ✅ **NEW** |

---

## Future Enhancements

### Potential V5 Features

- [ ] Real-time subtask completion updates via Socket.IO
- [ ] Subtask assignment to specific children in collaborative tasks
- [ ] Subtask comments/discussion per child
- [ ] Time tracking per subtask per child
- [ ] Subtask dependencies in collaborative tasks
- [ ] File attachments per subtask per child

---

## Support

For questions or issues, please refer to:
- API Documentation: `TASK_DASHBOARD_V3_APIS-28-03-26.md`
- Postman Collection: `01-user-common/01-User-Common-Part1-v4-CORRECTED.postman_collection.json`
- Figma Designs: `dashboard-flow-01.png`, `dashboard-flow-02.png`

---

**Version History**:
- **v4.0.0** (2026-03-28): Enhanced subtask handling for collaborative and singleAssignment tasks
- **v3.0.0** (2026-03-28): Child progress tracking for collaborative tasks
- **v2.0.0** (Previous): Enhanced dashboard counts
- **v1.0.0** (Original): Basic children's tasks endpoint
