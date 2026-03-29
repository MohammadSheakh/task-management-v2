# 🔍 Activity Log Feature Analysis

**Date**: 08-03-26  
**Scope**: Activity tracking across all modules  
**Status**: ✅ **MOSTLY COMPLETE** - Minor enhancements needed

---

## 🎯 Executive Summary

After thorough analysis, I found that **activity tracking ALREADY EXISTS** in `notification.module` with the `getLiveActivityFeed()` and `recordGroupActivity()` methods.

**However**, there are **5 missing activity types** that should be added for complete coverage.

---

## ✅ What's Already Implemented

### Current Activity Types (5 types)

| Activity Type          | Implemented | Endpoint                | Usage                         |
| ---------------------- | ----------- | ----------------------- | ----------------------------- |
| ✅ `task_completed`    | ✅ Yes      | notification.service.ts | When user completes task      |
| ✅ `task_started`      | ✅ Yes      | notification.service.ts | When user starts task         |
| ✅ `subtask_completed` | ✅ Yes      | notification.service.ts | When subtask is completed     |
| ✅ `member_joined`     | ✅ Yes      | notification.service.ts | When new member joins group   |
| ✅ `task_assigned`     | ✅ Yes      | notification.service.ts | When task is assigned to user |

### Existing Methods

```typescript
// notification.service.ts
async getLiveActivityFeed(groupId: string, limit: number = 10)
async recordGroupActivity(groupId, userId, activityType, taskData?)
```

### Existing Endpoint

```typescript
// notification.route.ts
GET /notifications/activity-feed/:groupId
```

---

## 🔴 Missing Activity Types (5 types)

### Priority 1: Task-Related Activities

| Activity Type         | Priority  | Why Needed                   | Figma Reference             |
| --------------------- | --------- | ---------------------------- | --------------------------- |
| ❌ `task_created`     | 🔴 HIGH   | Track when tasks are created | dashboard-flow-01.png       |
| ❌ `task_updated`     | 🔴 HIGH   | Track task edits/updates     | task-monitoring-flow-01.png |
| ❌ `task_deleted`     | 🟡 MEDIUM | Track task deletions (audit) | -                           |
| ❌ `comment_added`    | 🟡 MEDIUM | Track comments on tasks      | (if comments exist)         |
| ❌ `attachment_added` | 🟢 LOW    | Track file uploads           | -                           |

---

## 🛠️ Recommended Enhancements

### Enhancement 1: Add Missing Activity Types

**Update**: `notification.service.ts`

```typescript
// Add to activityType union
type TActivityType =
  | 'task_completed'
  | 'task_started'
  | 'subtask_completed'
  | 'member_joined'
  | 'task_assigned'
  | 'task_created' // ✨ NEW
  | 'task_updated' // ✨ NEW
  | 'task_deleted' // ✨ NEW
  | 'comment_added' // ✨ NEW
  | 'attachment_added'; // ✨ NEW
```

**Update**: `recordGroupActivity()` method

```typescript
async recordGroupActivity(
  groupId: string,
  userId: string,
  activityType: TActivityType,  // Updated type
  taskData?: {
    taskId: string;
    taskTitle: string;
  }
) {
  // Implementation already exists - just expand activityType
}
```

---

### Enhancement 2: Integrate Activity Tracking in Task Operations

**Where to Call `recordGroupActivity()`**:

#### In task.service.ts

```typescript
// 1. When creating a task
async createTask(data: Partial<ITask>, userId: Types.ObjectId) {
  const task = await this.model.create(data);

  // ✨ NEW: Record activity if group task
  if (data.groupId) {
    await notificationService.recordGroupActivity(
      data.groupId.toString(),
      userId.toString(),
      'task_created',
      { taskId: task._id.toString(), taskTitle: task.title }
    );
  }

  return task;
}

// 2. When updating a task
async updateById(id: string, data: Partial<ITask>) {
  const updatedTask = await this.model.findByIdAndUpdate(id, data, { new: true });

  // ✨ NEW: Record activity if group task
  if (updatedTask.groupId) {
    await notificationService.recordGroupActivity(
      updatedTask.groupId.toString(),
      (updatedTask as any).updatedBy,
      'task_updated',
      { taskId: id, taskTitle: updatedTask.title }
    );
  }

  return updatedTask;
}

// 3. When deleting a task
async deleteById(id: string) {
  const task = await this.model.findById(id);

  await this.model.findByIdAndUpdate(id, { isDeleted: true });

  // ✨ NEW: Record activity if group task
  if (task && task.groupId) {
    await notificationService.recordGroupActivity(
      task.groupId.toString(),
      (task as any).deletedBy,
      'task_deleted',
      { taskId: id, taskTitle: task.title }
    );
  }
}
```

---

### Enhancement 3: Add Activity Log Filtering

**Update**: `notification.route.ts`

```typescript
/*-─────────────────────────────────
|  User | Notification | Get live activity feed with filtering
|  @figmaIndex dashboard-flow-01.png
|  @desc Get activities with type/date filtering
└──────────────────────────────────*/
router
  .route('/activity-feed/:groupId')
  .get(auth(TRole.common), controller.getLiveActivityFeed);

// ✨ NEW: Add filtering options
router
  .route('/activity-feed/:groupId/filtered')
  .get(
    auth(TRole.common),
    validateFiltersForQuery(['type', 'from', 'to', 'limit']),
    controller.getFilteredActivityFeed,
  );
```

**New Controller Method**:

```typescript
// notification.controller.ts
getFilteredActivityFeed = catchAsync(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { type, from, to, limit = 20 } = req.query;

  const result = await this.notificationService.getFilteredActivityFeed(
    groupId,
    { type, from, to, limit },
  );

  sendResponse(res, {
    code: StatusCodes.OK,
    data: result,
    message: 'Filtered activity feed retrieved successfully',
    success: true,
  });
});
```

---

### Enhancement 4: Add User Activity Timeline

**New Endpoint**: Track individual user's activity history

```typescript
// notification.route.ts
/*-─────────────────────────────────
|  Admin | User | Get user's activity timeline
|  @desc Get all activities by a specific user
└──────────────────────────────────*/
router
  .route('/activity-log/user/:userId')
  .get(auth(TRole.admin), controller.getUserActivityLog);
```

**Service Method**:

```typescript
// notification.service.ts
async getUserActivityLog(userId: string, options: {
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const query: any = {
    receiverId: new Types.ObjectId(userId),
    isDeleted: false,
  };

  if (options.from || options.to) {
    query.createdAt = {};
    if (options.from) query.createdAt.$gte = options.from;
    if (options.to) query.createdAt.$lte = options.to;
  }

  const activities = await this.model.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .lean();

  return activities;
}
```

---

### Enhancement 5: Add Activity Log Export

**New Endpoint**: Export activity logs (CSV/PDF)

```typescript
// notification.route.ts
/*-─────────────────────────────────
|  Admin | Export activity logs (CSV)
|  @desc Export group/user activity logs
└──────────────────────────────────*/
router
  .route('/activity-log/export')
  .post(
    auth(TRole.admin),
    validateRequest(validation.exportActivityLogSchema),
    controller.exportActivityLog,
  );
```

**BullMQ Integration**:

```typescript
// Queue heavy export job
await notificationQueue.add(
  'exportActivityLog',
  {
    groupId,
    userId,
    format: 'csv',
    from,
    to,
  },
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
);
```

---

## 📊 Activity Tracking Coverage

### Current Coverage

| Module                  | Activity Tracking    | Status      |
| ----------------------- | -------------------- | ----------- |
| **task.module**         | ❌ Not integrated    | 🔴 Missing  |
| **group.module**        | ✅ member_joined     | ✅ Complete |
| **notification.module** | ✅ 5 activity types  | ✅ Complete |
| **analytics.module**    | ✅ getActivityFeed() | ✅ Complete |

### After Enhancements

| Module                  | Activity Tracking               | Status      |
| ----------------------- | ------------------------------- | ----------- |
| **task.module**         | ✅ task_created/updated/deleted | ✅ Complete |
| **group.module**        | ✅ member_joined/left           | ✅ Complete |
| **notification.module** | ✅ 10 activity types            | ✅ Complete |
| **analytics.module**    | ✅ getActivityFeed()            | ✅ Complete |

---

## 🎯 Implementation Priority

### Phase 1: Critical (Today)

1. ✅ Add `task_created` activity type
2. ✅ Add `task_updated` activity type
3. ✅ Add `task_deleted` activity type
4. ✅ Integrate in task.service.ts

**Effort**: 1-2 hours  
**Impact**: High - Complete task tracking

---

### Phase 2: Nice-to-Have (Optional)

1. ⏳ Add `comment_added` activity type (if comments exist)
2. ⏳ Add `attachment_added` activity type
3. ⏳ Add activity filtering endpoint
4. ⏳ Add user activity timeline
5. ⏳ Add activity log export

**Effort**: 2-3 days  
**Impact**: Medium - Advanced features

---

## ✅ My Recommendation

### **Do Phase 1 Only** (1-2 hours)

**Why**:

- ✅ Completes core activity tracking
- ✅ Minimal code changes
- ✅ High impact for admins/group owners
- ✅ Aligns with Figma requirements

**Skip Phase 2** because:

- ❌ Comments may not exist in your app
- ❌ Attachments can be tracked separately
- ❌ Filtering/export are "nice-to-have"
- ❌ Can be added later based on user feedback

---

## 🚀 **Decision**

**Would you like me to**:

1. **Implement Phase 1** (add 3 activity types + integration) - 1-2 hours ✅
2. **Implement everything** (Phase 1 + Phase 2) - 2-3 days
3. **Skip enhancements** - Current activity tracking is sufficient

**What's your preference?** 🎯

---

**Analysis Completed**: 08-03-26  
**Analyst**: Qwen Code Assistant  
**Status**: Awaiting your decision
