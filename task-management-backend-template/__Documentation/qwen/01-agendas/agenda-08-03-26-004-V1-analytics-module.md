# 📊 Analytics Module - Implementation Plan

**Date**: 08-03-26
**Version**: V1
**Type**: Module Implementation Agenda
**Location**: `__Documentation/qwen/`

---

## 🎯 Objective

Create a comprehensive **analytics.module** for the Task Management System that provides:
- **User Analytics** - Individual productivity, streaks, completion rates
- **Task Analytics** - Task completion trends, status distribution, activity charts
- **Group Analytics** - Team performance, member statistics, leaderboards
- **Admin Analytics** - Platform-wide metrics, user growth, revenue, engagement

All analytics must be designed for **100K+ users, 10M+ tasks** with:
- Redis caching (5-15 minute TTL)
- BullMQ pre-computation for heavy aggregations
- Sub-200ms response times for cached data

---

## 📂 Module Structure

```
analytics.module/
├── doc/
│   ├── dia/
│   │   ├── analytics-schema.mermaid
│   │   ├── analytics-system-architecture.mermaid
│   │   ├── analytics-data-flow.mermaid
│   │   ├── analytics-user-flow.mermaid
│   │   ├── analytics-sequence.mermaid
│   │   ├── analytics-swimlane.mermaid
│   │   ├── analytics-state-machine.mermaid
│   │   └── analytics-component-architecture.mermaid
│   ├── README.md
│   └── perf/
│       └── analytics-module-performance-report.md
│
├── userAnalytics/
│   ├── userAnalytics.interface.ts
│   ├── userAnalytics.constant.ts
│   ├── userAnalytics.service.ts
│   ├── userAnalytics.controller.ts
│   └── userAnalytics.route.ts
│
├── taskAnalytics/
│   ├── taskAnalytics.interface.ts
│   ├── taskAnalytics.constant.ts
│   ├── taskAnalytics.service.ts
│   ├── taskAnalytics.controller.ts
│   └── taskAnalytics.route.ts
│
├── groupAnalytics/
│   ├── groupAnalytics.interface.ts
│   ├── groupAnalytics.constant.ts
│   ├── groupAnalytics.service.ts
│   ├── groupAnalytics.controller.ts
│   └── groupAnalytics.route.ts
│
├── adminAnalytics/
│   ├── adminAnalytics.interface.ts
│   ├── adminAnalytics.constant.ts
│   ├── adminAnalytics.service.ts
│   ├── adminAnalytics.controller.ts
│   └── adminAnalytics.route.ts
│
├── scheduledAnalytics/
│   ├── scheduledAnalytics.service.ts
│   └── scheduledAnalytics.job.ts
│
└── analytics.middleware.ts
```

---

## 🔍 Figma Requirements Analysis

### 1. Main Admin Dashboard

**Screens**: `figma-asset/main-admin-dashboard/`
- `dashboard-section-flow.png` - Analytics dashboard
- `user-list-flow.png` - User management
- `subscription-flow.png` - Subscription plans

**Required Metrics**:
```
✅ User Statistics:
  - Total users (Individual vs Business)
  - User growth chart (weekly/monthly)
  - Active users (DAU/MAU)
  - User ratio charts

✅ Revenue Metrics:
  - Monthly income
  - Revenue by subscription type
  - MRR (Monthly Recurring Revenue)
  - Churn rate

✅ Platform Metrics:
  - Total tasks created
  - Task completion rate
  - Average tasks per user
  - Group adoption rate
```

---

### 2. Teacher/Parent Dashboard

**Screens**: `figma-asset/teacher-parent-dashboard/`
- `dashboard-flow-01.png to 07.png` - Team overview
- `task-monitoring-flow-01.png` - Task tracking
- `all-task-of-a-member-flow.png` - Member tasks

**Required Metrics**:
```
✅ Team Overview:
  - Total team members
  - Active members today
  - Tasks completed today (X/Y format)
  - Live activity feed

✅ Task Monitoring:
  - Tasks by status (Not Started, In Progress, Completed)
  - Completion rate chart (weekly)
  - Member productivity comparison
  - Overdue tasks count

✅ Member Analytics:
  - Individual member task history
  - Member streak (consecutive days)
  - Average completion time
  - Best performing member
```

---

### 3. App User (Mobile)

**Screens**: `figma-asset/app-user/group-children-user/`
- `home-flow.png` - Home screen with daily progress
- `status-section-flow-01.png` - Task status view
- `profile-permission-account-interface.png` - Profile stats

**Required Metrics**:
```
✅ Home Screen:
  - Daily progress (1/5 completed)
  - Weekly streak
  - Tasks pending today
  - Quick stats

✅ Status Section:
  - Pending tasks count
  - In Progress tasks count
  - Completed tasks count
  - Total tasks

✅ Profile Stats:
  - Total tasks completed
  - Current streak
  - Completion rate (%)
  - Average tasks per day
```

---

## 📊 Analytics Endpoints Design

### 1. User Analytics Endpoints

```typescript
// Individual User Analytics
GET /analytics/user/my/overview           // Get my complete analytics overview
GET /analytics/user/my/daily-progress     // Get today's progress (X/Y completed)
GET /analytics/user/my/weekly-streak      // Get current streak + history
GET /analytics/user/my/completion-rate    // Get completion rate with trend
GET /analytics/user/my/productivity-score // Get productivity score (0-100)

// Member Analytics (for Group Owners)
GET /analytics/user/:userId/overview      // Get member's overview (permission-based)
GET /analytics/user/:userId/tasks         // Get user's task statistics
GET /analytics/user/:userId/activity      // Get user's activity timeline
```

**Response Example** (`GET /analytics/user/my/overview`):
```json
{
  "success": true,
  "code": 200,
  "data": {
    "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
    "overview": {
      "totalTasks": 156,
      "completedTasks": 124,
      "pendingTasks": 18,
      "inProgressTasks": 14,
      "completionRate": 79.49,
      "currentStreak": 7,
      "longestStreak": 21,
      "productivityScore": 85
    },
    "today": {
      "totalTasks": 5,
      "completedTasks": 3,
      "pendingTasks": 2,
      "progress": "3/5"
    },
    "thisWeek": {
      "totalTasks": 28,
      "completedTasks": 22,
      "completionRate": 78.57
    },
    "thisMonth": {
      "totalTasks": 112,
      "completedTasks": 89,
      "completionRate": 79.46
    }
  },
  "message": "User analytics retrieved successfully",
  "cached": true,
  "cacheAge": "2m 15s"
}
```

---

### 2. Task Analytics Endpoints

```typescript
// Task Analytics (General)
GET /analytics/task/overview              // Overall task statistics
GET /analytics/task/status-distribution   // Tasks by status (pie chart data)
GET /analytics/task/completion-trend      // Completion trend over time
GET /analytics/task/daily-summary         // Today's task summary

// Task Analytics (Group/Team)
GET /analytics/task/group/:groupId/overview      // Group task overview
GET /analytics/task/group/:groupId/status        // Status distribution for group
GET /analytics/task/group/:groupId/members       // Task stats per member
GET /analytics/task/group/:groupId/completion    // Completion rate chart

// Advanced Analytics
GET /analytics/task/advanced/predictions    // Predict completion probability
GET /analytics/task/advanced/bottlenecks    // Identify bottlenecks
```

**Response Example** (`GET /analytics/task/group/:groupId/status`):
```json
{
  "success": true,
  "code": 200,
  "data": {
    "groupId": "grp_abc123",
    "groupName": "Smith Family",
    "totalTasks": 47,
    "statusDistribution": {
      "notStarted": { "count": 8, "percentage": 17.02 },
      "inProgress": { "count": 15, "percentage": 31.91 },
      "completed": { "count": 24, "percentage": 51.06 }
    },
    "byPriority": {
      "low": { "count": 12, "percentage": 25.53 },
      "medium": { "count": 23, "percentage": 48.94 },
      "high": { "count": 12, "percentage": 25.53 }
    },
    "byTaskType": {
      "personal": { "count": 18, "percentage": 38.30 },
      "singleAssignment": { "count": 15, "percentage": 31.91 },
      "collaborative": { "count": 14, "percentage": 29.79 }
    },
    "overdueTasks": 3,
    "dueToday": 5
  },
  "message": "Task status distribution retrieved successfully",
  "cached": true,
  "cacheAge": "1m 30s"
}
```

---

### 3. Group Analytics Endpoints

```typescript
// Group Analytics (Team Overview)
GET /analytics/group/my/overview          // Get my group's overview
GET /analytics/group/my/members           // Member statistics
GET /analytics/group/my/activity          // Live activity feed (aggregated)
GET /analytics/group/my/leaderboard       // Member leaderboard (by tasks completed)

// Group Analytics (Detailed)
GET /analytics/group/:groupId/overview    // Complete group analytics
GET /analytics/group/:groupId/performance // Performance metrics
GET /analytics/group/:groupId/trends      // Weekly/monthly trends
GET /analytics/group/:groupId/comparison  // Compare with other groups (anonymized)
```

**Response Example** (`GET /analytics/group/my/overview`):
```json
{
  "success": true,
  "code": 200,
  "data": {
    "groupId": "grp_abc123",
    "groupName": "Smith Family",
    "memberCount": 5,
    "activeMembersToday": 3,
    "overview": {
      "totalTasks": 47,
      "completedToday": 8,
      "pendingToday": 5,
      "completionRate": 51.06,
      "averageTasksPerMember": 9.4
    },
    "topPerformers": [
      {
        "userId": "user_001",
        "name": "John Doe",
        "tasksCompleted": 18,
        "streak": 12
      },
      {
        "userId": "user_002",
        "name": "Jane Smith",
        "tasksCompleted": 15,
        "streak": 8
      }
    ],
    "recentActivity": [
      {
        "type": "task_completed",
        "userId": "user_001",
        "userName": "John Doe",
        "taskTitle": "Finish homework",
        "timestamp": "2026-03-07T14:30:00Z"
      }
    ]
  },
  "message": "Group analytics retrieved successfully",
  "cached": true,
  "cacheAge": "3m 45s"
}
```

---

### 4. Admin Analytics Endpoints

```typescript
// Admin Dashboard Analytics
GET /analytics/admin/dashboard            // Complete dashboard overview
GET /analytics/admin/user-growth          // User growth chart
GET /analytics/admin/revenue              // Revenue analytics
GET /analytics/admin/task-metrics         // Platform-wide task metrics
GET /analytics/admin/engagement           // User engagement metrics

// Advanced Admin Analytics
GET /analytics/admin/cohort-analysis      // Cohort retention analysis
GET /analytics/admin/churn-analysis       // Churn rate analysis
GET /analytics/admin/forecast             // Predictive analytics
GET /analytics/admin/export               // Export analytics (CSV/PDF via BullMQ)
```

**Response Example** (`GET /analytics/admin/dashboard`):
```json
{
  "success": true,
  "code": 200,
  "data": {
    "overview": {
      "totalUsers": 125847,
      "totalGroups": 18453,
      "totalTasks": 8947562,
      "activeUsersToday": 45621,
      "activeUsersThisWeek": 89453,
      "activeUsersThisMonth": 112584
    },
    "userGrowth": {
      "today": 234,
      "thisWeek": 1847,
      "thisMonth": 7453,
      "growthRate": {
        "daily": 0.19,
        "weekly": 1.49,
        "monthly": 6.29
      }
    },
    "revenue": {
      "mrr": 1247850.50,
      "arr": 14974206.00,
      "thisMonth": 124580.75,
      "lastMonth": 118945.25,
      "growthRate": 4.74
    },
    "taskMetrics": {
      "createdToday": 45621,
      "completedToday": 38947,
      "completionRate": 85.37,
      "averageTasksPerUser": 71.08
    },
    "engagement": {
      "dau": 45621,
      "mau": 112584,
      "dauMauRatio": 40.52,
      "averageSessionDuration": "12m 35s",
      "retentionRate": {
        "day1": 78.5,
        "day7": 52.3,
        "day30": 38.7
      }
    },
    "topGroups": [
      {
        "groupId": "grp_001",
        "name": "Power Users Group",
        "memberCount": 5,
        "tasksCompleted": 1247
      }
    ]
  },
  "message": "Admin dashboard analytics retrieved successfully",
  "cached": true,
  "cacheAge": "4m 12s"
}
```

---

## 🗄️ Redis Caching Strategy

### Cache Key Naming Convention

```typescript
// User Analytics
analytics:user:{userId}:overview           // TTL: 5 minutes
analytics:user:{userId}:daily-progress     // TTL: 2 minutes
analytics:user:{userId}:streak             // TTL: 15 minutes
analytics:user:{userId}:productivity       // TTL: 10 minutes

// Task Analytics
analytics:task:overview                    // TTL: 5 minutes
analytics:task:group:{groupId}:status      // TTL: 5 minutes
analytics:task:group:{groupId}:members     // TTL: 10 minutes

// Group Analytics
analytics:group:{groupId}:overview         // TTL: 5 minutes
analytics:group:{groupId}:leaderboard      // TTL: 15 minutes
analytics:group:{groupId}:activity         // TTL: 2 minutes

// Admin Analytics
analytics:admin:dashboard                  // TTL: 10 minutes
analytics:admin:revenue                    // TTL: 15 minutes
analytics:admin:user-growth                // TTL: 15 minutes
```

### Cache Invalidation Rules

```typescript
// Invalidate on task creation
await invalidateCache([
  `analytics:user:${userId}:overview`,
  `analytics:user:${userId}:daily-progress`,
  `analytics:task:overview`,
  `analytics:group:${groupId}:overview`
]);

// Invalidate on task completion
await invalidateCache([
  `analytics:user:${userId}:overview`,
  `analytics:user:${userId}:streak`,
  `analytics:user:${userId}:productivity`,
  `analytics:task:group:${groupId}:status`,
  `analytics:group:${groupId}:leaderboard`
]);

// Invalidate on group member change
await invalidateCache([
  `analytics:group:${groupId}:overview`,
  `analytics:group:${groupId}:members`,
  `analytics:task:group:${groupId}:members`
]);
```

---

## 📅 BullMQ Scheduled Jobs

### Job Configuration

```typescript
// analytics-jobs-queue
export const analyticsQueue = new Queue('analytics-jobs', {
  connection: redisClient.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});
```

### Scheduled Jobs

```typescript
// 1. Daily Analytics Pre-computation (runs at 00:00 UTC)
{
  name: 'daily-analytics-job',
  schedule: '0 0 * * *',  // Cron: midnight daily
  handler: async () => {
    // Pre-compute yesterday's analytics
    // Calculate user streaks
    // Update completion rates
    // Generate daily reports
  }
}

// 2. Hourly Aggregation (runs at :00 every hour)
{
  name: 'hourly-aggregation-job',
  schedule: '0 * * * *',  // Cron: every hour
  handler: async () => {
    // Aggregate hourly activity
    // Update trending tasks
    // Calculate active users
    // Refresh leaderboards
  }
}

// 3. Weekly Summary (runs Monday 00:00 UTC)
{
  name: 'weekly-summary-job',
  schedule: '0 0 * * 1',  // Cron: Monday midnight
  handler: async () => {
    // Generate weekly summaries for all users
    // Calculate weekly streaks
    // Update weekly completion rates
    // Send weekly email reports via BullMQ
  }
}

// 4. Admin Metrics Refresh (runs every 15 minutes)
{
  name: 'admin-metrics-job',
  schedule: '*/15 * * * *',  // Cron: every 15 minutes
  handler: async () => {
    // Refresh admin dashboard metrics
    // Update revenue calculations
    // Recalculate user growth
    // Cache platform-wide statistics
  }
}
```

---

## 📐 Database Indexes for Analytics

### Task Collection Indexes

```typescript
// For user task queries
taskSchema.index({ ownerUserId: 1, status: 1, startTime: -1 });
taskSchema.index({ assignedUserIds: 1, status: 1, startTime: -1 });
taskSchema.index({ createdById: 1, startTime: -1 });

// For group task queries
taskSchema.index({ groupId: 1, status: 1 });
taskSchema.index({ groupId: 1, createdById: 1 });

// For date-based aggregations
taskSchema.index({ startTime: -1, status: 1 });
taskSchema.index({ completedTime: -1 });

// For status distribution
taskSchema.index({ status: 1, isDeleted: 1 });

// Compound indexes for analytics queries
taskSchema.index({ ownerUserId: 1, status: 1, completedTime: -1 });
taskSchema.index({ groupId: 1, status: 1, assignedUserIds: 1 });
```

### User Collection Indexes

```typescript
// For user analytics
userSchema.index({ createdAt: -1, role: 1 });
userSchema.index({ lastActiveAt: -1 });
userSchema.index({ subscriptionType: 1, isActive: 1 });
```

### Group Collection Indexes

```typescript
// For group analytics
groupSchema.index({ createdAt: -1, isActive: 1 });
groupSchema.index({ memberCount: -1 });
```

---

## 🏗️ Architecture Patterns

### 1. Cache-Aside Pattern

```typescript
async getUserAnalytics(userId: string) {
  const cacheKey = `analytics:user:${userId}:overview`;
  
  // 1. Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Cache miss - query database
  const analytics = await this.aggregateUserAnalytics(userId);
  
  // 3. Write to cache
  await redisClient.setEx(
    cacheKey,
    ANALYTICS_CACHE_TTL.USER_OVERVIEW, // 5 minutes
    JSON.stringify(analytics)
  );
  
  // 4. Return data
  return analytics;
}
```

### 2. Pre-computation Pattern

```typescript
// BullMQ job runs nightly
async precomputeDailyAnalytics() {
  const yesterday = subDays(new Date(), 1);
  
  // Aggregate all user analytics for yesterday
  const userStats = await Task.aggregate([
    {
      $match: {
        completedTime: {
          $gte: startOfDay(yesterday),
          $lt: endOfDay(yesterday)
        }
      }
    },
    {
      $group: {
        _id: '$ownerUserId',
        completedTasks: { $sum: 1 },
        totalTasks: { $sum: 1 }
      }
    }
  ]);
  
  // Store pre-computed stats
  for (const stat of userStats) {
    await UserAnalyticsModel.updateOne(
      { userId: stat._id, date: yesterday },
      {
        $set: {
          completedTasks: stat.completedTasks,
          completionRate: (stat.completedTasks / stat.totalTasks) * 100
        }
      },
      { upsert: true }
    );
  }
}
```

### 3. Real-time + Cached Hybrid

```typescript
async getGroupActivityFeed(groupId: string) {
  // Get cached activity (2 minute TTL)
  const cached = await redisClient.get(
    `analytics:group:${groupId}:activity`
  );
  
  if (cached) {
    return { data: JSON.parse(cached), cached: true };
  }
  
  // Query recent activity from database
  const activity = await Notification.aggregate([
    {
      $match: {
        'metadata.groupId': new Types.ObjectId(groupId),
        createdAt: { $gte: subHours(new Date(), 24) }
      }
    },
    { $sort: { createdAt: -1 } },
    { $limit: 50 }
  ]);
  
  // Cache for 2 minutes
  await redisClient.setEx(
    `analytics:group:${groupId}:activity`,
    120,
    JSON.stringify(activity)
  );
  
  return { data: activity, cached: false };
}
```

---

## 📊 Performance Targets

| Endpoint Type | Target Response Time | Cache Hit Rate |
|---------------|---------------------|----------------|
| User Overview | < 50ms (cached) / < 200ms (miss) | > 90% |
| Task Status Distribution | < 30ms (cached) / < 150ms (miss) | > 85% |
| Group Leaderboard | < 40ms (cached) / < 180ms (miss) | > 80% |
| Admin Dashboard | < 100ms (cached) / < 500ms (miss) | > 95% |
| Activity Feed | < 20ms (cached) / < 100ms (miss) | > 95% |

---

## 📝 Implementation Checklist

### Phase 1: Core Setup (Day 1)

- [ ] Create `analytics.module/` folder structure
- [ ] Create interfaces and constants for all sub-modules
- [ ] Set up Redis cache configuration
- [ ] Set up BullMQ analytics queue
- [ ] Create base analytics service with caching helper

### Phase 2: User Analytics (Day 1-2)

- [ ] Implement `userAnalytics.service.ts` with aggregation pipelines
- [ ] Implement `userAnalytics.controller.ts`
- [ ] Implement `userAnalytics.route.ts` with documentation
- [ ] Add Redis caching for user analytics
- [ ] Test all user analytics endpoints

### Phase 3: Task Analytics (Day 2-3)

- [ ] Implement `taskAnalytics.service.ts` with aggregation pipelines
- [ ] Implement `taskAnalytics.controller.ts`
- [ ] Implement `taskAnalytics.route.ts` with documentation
- [ ] Add Redis caching for task analytics
- [ ] Test all task analytics endpoints

### Phase 4: Group Analytics (Day 3-4)

- [ ] Implement `groupAnalytics.service.ts` with aggregation pipelines
- [ ] Implement `groupAnalytics.controller.ts`
- [ ] Implement `groupAnalytics.route.ts` with documentation
- [ ] Add Redis caching for group analytics
- [ ] Test all group analytics endpoints

### Phase 5: Admin Analytics (Day 4-5)

- [ ] Implement `adminAnalytics.service.ts` with aggregation pipelines
- [ ] Implement `adminAnalytics.controller.ts`
- [ ] Implement `adminAnalytics.route.ts` with documentation
- [ ] Add Redis caching for admin analytics
- [ ] Test all admin analytics endpoints

### Phase 6: BullMQ Jobs (Day 5)

- [ ] Create `scheduledAnalytics.job.ts`
- [ ] Implement daily analytics job
- [ ] Implement hourly aggregation job
- [ ] Implement weekly summary job
- [ ] Implement admin metrics refresh job
- [ ] Register jobs in server startup

### Phase 7: Documentation (Day 6)

- [ ] Create README.md with module overview
- [ ] Create 8 Mermaid diagrams in `doc/dia/`
- [ ] Create performance report in `doc/perf/`
- [ ] Add API examples to all route files
- [ ] Update global documentation

### Phase 8: Testing & Optimization (Day 6-7)

- [ ] Load test all analytics endpoints
- [ ] Verify cache hit rates (> 80% target)
- [ ] Optimize slow aggregation pipelines
- [ ] Test BullMQ job execution
- [ ] Create Postman collection
- [ ] Performance verification report

---

## 🔗 Dependencies

### Internal Dependencies
- `task.module` - Task data for analytics
- `group.module` - Group and member data
- `notification.module` - Activity feed data
- `user.module` - User profile data

### External Dependencies
- Redis (already configured)
- BullMQ (already configured)
- MongoDB Aggregation Pipeline

---

## 🎯 Success Criteria

| Criteria | Target | Measurement |
|----------|--------|-------------|
| **Response Time** | < 200ms (cached) | P95 latency |
| **Cache Hit Rate** | > 80% | Redis metrics |
| **API Coverage** | 100% | All Figma screens supported |
| **Documentation** | Complete | 8 diagrams + README + perf report |
| **Code Quality** | Senior Level | SOLID principles, generic patterns |
| **Scalability** | 100K+ users | Load test verified |

---

## 📚 Files to Create

### Total Count: **35 files**

```
analytics.module/                     (1 folder)
├── doc/
│   ├── dia/                          (8 mermaid files)
│   ├── README.md                     (1 file)
│   └── perf/                         (1 file)
├── userAnalytics/                    (5 files)
├── taskAnalytics/                    (5 files)
├── groupAnalytics/                   (5 files)
├── adminAnalytics/                   (5 files)
├── scheduledAnalytics/               (2 files)
└── analytics.middleware.ts           (1 file)
```

---

## 🚀 Next Steps

1. ✅ Review this agenda and confirm structure
2. ⏳ Create `analytics.module` folder structure
3. ⏳ Implement all sub-modules following the pattern
4. ⏳ Create comprehensive documentation
5. ⏳ Test and optimize performance
6. ⏳ Create Postman collection

---

**Document Generated**: 07-03-26
**Status**: Ready for Implementation
**Estimated Time**: 6-7 days
**Priority**: 🔴 HIGH (Blocks Flutter/Website dashboard integration)
