# Task Dashboard V3 API - Collaborative Progress Enhancement

## Overview

**Version**: 3.0.0  
**Date**: 2026-03-28  
**Author**: Senior Engineering Team

### What's New in V3?

The V3 endpoint enhances the parent dashboard experience by adding **individual child progress tracking** for **collaborative tasks**. When a parent views collaborative tasks, they can now see exactly how each child is progressing on shared assignments.

---

## API Endpoint

```
GET /api/v1/tasks/dashboard/children-tasks/v3
```

### Comparison: V2 vs V3

| Feature | V2 | V3 |
|---------|----|----|
| Basic task info | ✅ | ✅ |
| Assigned children | ✅ | ✅ |
| **Individual child progress** | ❌ | ✅ **NEW** |
| Progress status per child | ❌ | ✅ |
| Progress percentage per child | ❌ | ✅ |
| Started/completed timestamps | ❌ | ✅ |
| Completed subtask count | ❌ | ✅ |

---

## Request Parameters

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `status` | string | `'all'` | Filter by status: `'all'`, `'pending'`, `'inProgress'`, `'completed'` |
| `taskType` | string | `'children'` | Filter by type: `'children'`, `'personal'` |
| `page` | number | `1` | Page number for pagination |
| `limit` | number | `20` | Items per page |
| `sortBy` | string | `'-startTime'` | Sort field (prefix with `-` for descending) |
| `from` | string | - | Start date filter (ISO format) |
| `to` | string | - | End date filter (ISO format) |

### Authorization

- **Role**: Business (Parent/Teacher) only
- **Rate Limit**: 100 requests per minute

---

## Response Structure

### Success Response (200 OK)

```json
{
  "success": true,
  "code": 200,
  "data": {
    "tasks": [
      {
        "_id": "task_001",
        "title": "Group Science Project",
        "description": "Work together on the solar system model",
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
            "_id": "sub_001",
            "title": "Research planets",
            "isCompleted": true,
            "order": 1
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
        "_id": "task_002",
        "title": "Math Homework",
        "description": "Complete exercises 1-20",
        "status": "pending",
        "priority": "medium",
        "taskType": "singleAssignment",
        "scheduledTime": "04:00 PM",
        "startTime": "2026-03-28T16:00:00.000Z",
        "dueDate": "2026-03-30T23:59:59.000Z",
        "totalSubtasks": 0,
        "completedSubtasks": 0,
        "completionPercentage": 0,
        "subtasks": [],
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
  "message": "Children tasks with progress retrieved successfully for dashboard"
}
```

---

## Key Features

### 1. **Collaborative Task Enhancement** ✨

For tasks with `taskType: "collaborative"`, each child in the `assignedTo` array now includes a `progress` object:

```typescript
progress: {
  status: "notStarted" | "inProgress" | "completed",
  progressPercentage: number,      // 0-100
  startedAt: Date | null,
  completedAt: Date | null,
  completedSubtaskCount: number
}
```

### 2. **Non-Collaborative Tasks Unchanged**

For `personal` and `singleAssignment` tasks, the `assignedTo` array remains unchanged (no `progress` field):

```json
{
  "assignedTo": [
    {
      "_id": "child_001",
      "name": "Alex Morgan",
      "email": "alex@example.com",
      "profileImage": "https://..."
    }
  ]
}
```

### 3. **Dashboard Counts**

The response includes aggregated counts for dashboard filter badges:

```json
"counts": {
  "total": 6,                    // Total tasks (children + personal)
  "byStatus": {                  // Status breakdown for children's tasks
    "pending": 1,
    "inProgress": 3,
    "completed": 2
  },
  "personal": 0                  // Count of parent's personal tasks
}
```

---

## Use Cases

### 1. Parent Dashboard - View All Tasks

```javascript
// Get all children's tasks with progress tracking
const { data } = await api.get('/tasks/dashboard/children-tasks/v3?status=all');

// Display task list with individual child progress for collaborative tasks
data.tasks.forEach(task => {
  if (task.taskType === 'collaborative') {
    task.assignedTo.forEach(child => {
      console.log(`${child.name} is ${child.progress.status}`);
      console.log(`Progress: ${child.progress.progressPercentage}%`);
    });
  }
});
```

### 2. Filter by Status

```javascript
// Get only in-progress collaborative tasks
const inProgressTasks = await api.get(
  '/tasks/dashboard/children-tasks/v3?status=inProgress'
);
```

### 3. Parent's Personal Tasks

```javascript
// Get parent's personal tasks (no progress tracking needed)
const personalTasks = await api.get(
  '/tasks/dashboard/children-tasks/v3?taskType=personal'
);
```

---

## Implementation Details

### Service Method

```typescript
async getChildrenTasksForDashboardV3(
  businessUserId: Types.ObjectId,
  filters: any,
  options: any,
)
```

### Key Steps

1. **Get Children**: Fetch all active children for the business user
2. **Build Query**: Construct query based on `taskType` filter
3. **Fetch Tasks**: Get paginated tasks with population
4. **Fetch Progress**: For collaborative tasks only, fetch `TaskProgress` records
5. **Map Progress**: Associate each child's progress with their assignedTo entry
6. **Calculate Counts**: Aggregate status counts for dashboard badges
7. **Cache Response**: Store in Redis for 2 minutes

### Performance Optimization

- **Single Query**: All TaskProgress records fetched in one query
- **Map Structure**: Uses `Map<string, Map<string, Progress>>` for O(1) lookups
- **Redis Caching**: 120-second TTL for dashboard data
- **Selective Enhancement**: Only collaborative tasks are enhanced (minimal overhead)

---

## Files Modified

### 1. Service Layer
**File**: `src/modules/task.module/task/task.service.ts`

- Added `getChildrenTasksForDashboardV3()` method (lines 1096-1520)
- Comprehensive JSDoc documentation
- TaskProgress integration for collaborative tasks

### 2. Controller Layer
**File**: `src/modules/task.module/task/task.controller.ts`

- Added `getChildrenTasksForDashboardV3()` method (lines 647-695)
- Request validation and response formatting

### 3. Route Layer
**File**: `src/modules/task.module/task/task.route.ts`

- Added route: `/dashboard/children-tasks/v3` (lines 89-119)
- Middleware stack: auth, rate limiting, query validation

---

## Testing

### Manual Testing Checklist

- [ ] Collaborative tasks show `progress` for each child
- [ ] Single assignment tasks do NOT show `progress` field
- [ ] Personal tasks do NOT show `progress` field
- [ ] Progress status matches TaskProgress collection
- [ ] Progress percentage is accurate (0-100)
- [ ] Timestamps (startedAt, completedAt) are correct
- [ ] completedSubtaskCount matches actual completed subtasks
- [ ] Pagination works correctly
- [ ] Status filtering works (all, pending, inProgress, completed)
- [ ] TaskType filtering works (children, personal)
- [ ] Counts are accurate in response
- [ ] Redis caching is working (check Redis logs)

### Example Test Query

```bash
curl -X GET "http://localhost:3000/api/v1/tasks/dashboard/children-tasks/v3?status=all&taskType=children&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Backward Compatibility

### V1, V2, V3 Coexistence

All three versions coexist without conflicts:

| Endpoint | Version | Status |
|----------|---------|--------|
| `/tasks/dashboard/children-tasks` | V1 | ✅ Active (uses V2 internally) |
| `/tasks/dashboard/children-tasks/v3` | V3 | ✅ **NEW** |

**Note**: The current V1 endpoint internally calls V2. V3 is a separate endpoint.

### Migration Path

Frontend can gradually adopt V3:

1. **Phase 1**: Use V3 only for collaborative task views
2. **Phase 2**: Migrate entire dashboard to V3
3. **Phase 3**: Deprecate V1/V2 (future)

---

## Future Enhancements

### Potential V4 Features

- [ ] Real-time progress updates via Socket.IO
- [ ] Subtask-level progress per child
- [ ] Time spent tracking per child
- [ ] Comments/notes from each child
- [ ] Progress history timeline
- [ ] Comparative analytics between children

---

## Support

For questions or issues, please refer to:
- API Documentation: `ADMIN_DASHBOARD_COMPLETE_APIS-24-03-26.md`
- Postman Collection: `01-user-common/01-User-Common-Part1-v4-CORRECTED.postman_collection.json`
- Figma Designs: `dashboard-flow-01.png`, `dashboard-flow-02.png`

---

**Version History**:
- **v3.0.0** (2026-03-28): Initial release with collaborative progress tracking
- **v2.0.0** (Previous): Enhanced counts and dashboard features
- **v1.0.0** (Original): Basic children's tasks endpoint
