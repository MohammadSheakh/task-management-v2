# Task History API Documentation

## Overview
Get all completed tasks within a date range for individual users. This endpoint provides a comprehensive task history view with subtask progress and completion details.

## Endpoint Details

### Route
```
GET /tasks/history
```

### Figma Reference
- **File**: `figma-asset/app-user/individual-user/task-history-filter-by-date-range.png`
- **Screen**: Task History with Date Range Filter
- **Role**: Individual User / Child / Business

### Authentication
- **Required**: Yes
- **Roles**: `commonUser` (individual, child, business)
- **Rate Limit**: 100 requests per minute per userId

## Query Parameters

| Parameter | Type   | Required | Default        | Description                                      |
|-----------|--------|----------|----------------|--------------------------------------------------|
| from      | string | No       | 30 days ago    | Start date in YYYY-MM-DD format                 |
| to        | string | No       | Today          | End date in YYYY-MM-DD format                   |
| page      | number | No       | 1              | Page number                                     |
| limit     | number | No       | 20             | Items per page (max: 100)                       |
| sortBy    | string | No       | -completedTime | Sort field (prefix with - for descending)       |

## Response Format

### Success Response (200 OK)

```json
{
  "code": 200,
  "data": {
    "results": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "title": "Complete Math Homework",
        "description": "Finish chapter 5 exercises",
        "taskType": "personal",
        "priority": "high",
        "status": "completed",
        "startTime": "2026-04-05T09:50:00.000Z",
        "completedTime": "2026-04-05T10:30:00.000Z",
        "createdAt": "2026-04-05T09:50:00.000Z",
        "createdBy": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "John Doe",
          "profileImage": "https://example.com/image.jpg"
        },
        "subtaskProgress": {
          "total": 5,
          "completed": 5,
          "percentage": 100,
          "display": "5/5"
        },
        "subtasks": [
          {
            "_id": "507f1f77bcf86cd799439013",
            "title": "Exercise 1",
            "isCompleted": true,
            "order": 1,
            "duration": 10,
            "completedAt": "2026-04-05T10:00:00.000Z"
          }
        ]
      }
    ],
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalResults": 95
  },
  "message": "Task history retrieved successfully",
  "success": true
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid date format for from date",
  "success": false
}
```

#### 401 Unauthorized
```json
{
  "code": 401,
  "message": "User not authenticated",
  "success": false
}
```

#### 429 Too Many Requests
```json
{
  "code": 429,
  "message": "Too many requests, please try again later",
  "success": false
}
```

## Usage Examples

### Example 1: Get task history for last 7 days
```
GET /tasks/history?from=2026-04-03&to=2026-04-10
```

### Example 2: Get task history with pagination
```
GET /tasks/history?from=2026-04-01&to=2026-04-30&page=2&limit=10
```

### Example 3: Get all task history (default: last 30 days)
```
GET /tasks/history
```

### Example 4: Sort by completion time ascending
```
GET /tasks/history?sortBy=completedTime
```

## Features

### 1. Date Range Filtering
- Automatically defaults to last 30 days if no date range provided
- `from` date: Inclusive start date (beginning of day)
- `to` date: Inclusive end date (end of day)
- Accepts ISO 8601 date format or YYYY-MM-DD

### 2. Subtask Progress Tracking
- Shows total subtasks count
- Shows completed subtasks count
- Calculates completion percentage
- Provides display format (e.g., "5/5") for UI

### 3. Task Details
- Task title and description
- Task type (personal, singleAssignment, collaborative)
- Priority level
- Status (always "completed" for this endpoint)
- Start time and completion time
- Creator information

### 4. Pagination Support
- Uses aggregation pagination for performance
- Supports custom page size
- Returns total count and page metadata

### 5. Caching Strategy
- **Cache Key Pattern**: `task:history:{userId}:{from}:{to}:{page}`
- **TTL**: 2 minutes (120 seconds)
- **Invalidation**: Triggered on task creation, update, deletion, and completion

## Performance Considerations

### Database Indexing
Ensure the following indexes exist on the Task model:

```javascript
// Compound index for task history queries
{
  status: 1,
  completedTime: -1,
  isDeleted: 1
}

// Index for user task lookup
{
  ownerUserId: 1,
  isDeleted: 1
}

{
  assignedUserIds: 1,
  isDeleted: 1
}
```

### Query Optimization
- Uses MongoDB aggregation pipeline for efficient data retrieval
- Leverages `$lookup` with pipeline for subtask joining
- Uses `.lean()` equivalent through aggregation
- Only retrieves necessary fields through `$project`

### Caching Benefits
- Reduces database load for repeated requests
- 2-minute TTL balances freshness and performance
- Pattern-based invalidation ensures cache consistency

## Business Logic

### Default Date Range
If no date range is specified:
- **End Date**: Current date/time
- **Start Date**: 30 days before end date
- **Time Handling**: 
  - Start date set to 00:00:00.000 (beginning of day)
  - End date set to 23:59:59.999 (end of day)

### Task Filtering
Only includes tasks where:
1. Task status is "completed"
2. Task is not deleted (isDeleted: false)
3. User is either:
   - Owner of the task (ownerUserId)
   - Assigned to the task (assignedUserIds)

### Subtask Calculation
For each task:
- Counts total subtasks from SubTask collection
- Counts completed subtasks (isCompleted: true)
- Calculates percentage: (completed / total) × 100
- If no subtasks exist, percentage defaults to 100%

## Security Considerations

### Input Validation
- Date format validation using Zod schema
- Prevents NoSQL injection through query validation
- Whitelisted query parameters only

### Access Control
- User can only view their own task history
- Tasks are filtered by ownerUserId or assignedUserIds
- Middleware: `auth(TRole.commonUser)`

### Rate Limiting
- 100 requests per minute per userId
- Redis-backed sliding window algorithm
- Returns 429 status when limit exceeded

## Testing Guidelines

### Test Cases

1. **Date Range Validation**
   - Valid date range (from < to)
   - Invalid date format
   - Missing date range (should use defaults)
   - Future dates

2. **Pagination**
   - First page
   - Middle page
   - Last page
   - Out of bounds page
   - Custom limit sizes

3. **Access Control**
   - Authenticated user accessing own tasks
   - Unauthenticated user (should fail)
   - User accessing another user's tasks (should filter)

4. **Caching**
   - First request (cache miss)
   - Second request (cache hit)
   - Cache invalidation after task update
   - Cache expiration after TTL

5. **Performance**
   - Large date range (1 year)
   - Small date range (1 day)
   - High pagination (page 100)
   - Concurrent requests

## Related Endpoints

- `GET /tasks` - Get all tasks with filtering
- `GET /tasks/paginate` - Get paginated tasks
- `GET /tasks/daily-progress` - Get daily task progress
- `GET /tasks/:id` - Get task details by ID
- `PUT /tasks/:id/status/v4` - Update task status

## Version History

| Version | Date       | Changes                          | Author              |
|---------|------------|----------------------------------|---------------------|
| 1.0.0   | 2026-04-10 | Initial implementation           | Senior Engineering  |

## Implementation Notes

### Files Modified
1. `task.service.ts` - Added `getTaskHistory` method
2. `task.controller.ts` - Added `getTaskHistory` handler
3. `task.route.ts` - Added `/history` route
4. `task.validation.ts` - Added `taskHistoryQueryValidationSchema`
5. `task.constant.ts` - Updated cache invalidation patterns

### Dependencies
- PaginationService for aggregation pagination
- Redis for caching
- Zod for validation
- Mongoose for database queries

## Future Enhancements

1. **Filtering by Task Type**: Allow filtering by personal/singleAssignment/collaborative
2. **Filtering by Priority**: Allow filtering by low/medium/high priority
3. **Export Functionality**: Add CSV/PDF export for task history
4. **Statistics Endpoint**: Add task completion statistics for date range
5. **Advanced Search**: Full-text search on task titles and descriptions

---
04-04-26
