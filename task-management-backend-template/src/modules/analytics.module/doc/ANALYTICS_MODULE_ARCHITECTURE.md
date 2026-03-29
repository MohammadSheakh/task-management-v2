# 📊 Analytics Module - Architecture Documentation

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: 08-03-26

---

## 🎯 Module Overview

The Analytics Module provides comprehensive data analytics for the Task Management System, serving individual users, group owners, and administrators with actionable insights, productivity metrics, and performance tracking.

### Key Features

- ✅ **User Analytics**: Personal productivity, streaks, completion rates
- ✅ **Task Analytics**: Task distribution, completion trends, status tracking
- ✅ **Group Analytics**: Team performance, member statistics, leaderboards
- ✅ **Admin Analytics**: Platform-wide metrics, user growth, revenue
- ✅ **Redis Caching**: High-performance reads (2-15 minute TTL)
- ✅ **Aggregation Pipelines**: Complex MongoDB queries
- ✅ **Pre-computation**: BullMQ scheduled jobs for heavy analytics
- ✅ **Real-time Updates**: Activity feed integration
- ✅ **Trend Analysis**: Historical data tracking
- ✅ **Productivity Scoring**: 0-100 score calculation

---

## 📂 Module Structure

```
analytics.module/
├── doc/
│   ├── dia/                        # 8 Mermaid diagrams
│   │   ├── analytics-schema.mermaid
│   │   ├── analytics-system-architecture.mermaid
│   │   ├── analytics-sequence.mermaid
│   │   ├── analytics-user-flow.mermaid
│   │   ├── analytics-swimlane.mermaid
│   │   ├── analytics-state-machine.mermaid
│   │   ├── analytics-component-architecture.mermaid
│   │   └── analytics-data-flow.mermaid
│   ├── README.md                   # Module documentation
│   ├── ANALYTICS_MODULE_ARCHITECTURE.md  # This file
│   └── perf/
│       └── analytics-module-performance-report.md
│
├── userAnalytics/                  # User-level analytics
│   ├── userAnalytics.interface.ts
│   ├── userAnalytics.constant.ts
│   ├── userAnalytics.service.ts
│   ├── userAnalytics.controller.ts
│   └── userAnalytics.route.ts
│
├── taskAnalytics/                  # Task-level analytics
│   ├── taskAnalytics.interface.ts
│   ├── taskAnalytics.constant.ts
│   ├── taskAnalytics.service.ts
│   ├── taskAnalytics.controller.ts
│   └── taskAnalytics.route.ts
│
├── groupAnalytics/                 # Group-level analytics
│   ├── groupAnalytics.interface.ts
│   ├── groupAnalytics.constant.ts
│   ├── groupAnalytics.service.ts
│   ├── groupAnalytics.controller.ts
│   └── groupAnalytics.route.ts
│
├── adminAnalytics/                 # Admin-level analytics
│   ├── adminAnalytics.interface.ts
│   ├── adminAnalytics.constant.ts
│   ├── adminAnalytics.service.ts
│   ├── adminAnalytics.controller.ts
│   └── adminAnalytics.route.ts
│
├── scheduledAnalytics/             # BullMQ scheduled jobs
│   ├── scheduledAnalytics.service.ts
│   └── scheduledAnalytics.job.ts
│
├── analytics.constant.ts           # Global constants
├── analytics.interface.ts          # Global interfaces
└── analytics.route.ts              # Main route aggregator
```

---

## 🏗️ Architecture Design

### Design Principles

1. **Four-Tier Analytics**
   - User tier: Individual productivity
   - Task tier: Task distribution and trends
   - Group tier: Team performance
   - Admin tier: Platform-wide metrics

2. **Cache-First Strategy**
   - Redis cache-aside pattern
   - Configurable TTLs per data type
   - Automatic cache invalidation

3. **Aggregation Optimization**
   - MongoDB aggregation pipelines
   - Parallel query execution
   - Pre-computed metrics (BullMQ)

4. **Scalability**
   - Designed for 100K+ users
   - Horizontal scaling ready
   - Read replica support

---

## 📊 Database Schema

### Analytics Data Sources

The analytics module **does not store data** - it **aggregates from existing collections**:

```typescript
// Data Sources:
// 1. Task collection (task.module)
// 2. User collection (user.module)
// 3. Group collection (group.module)
// 4. GroupMember collection (group.module)
// 5. Notification collection (notification.module)
```

### Aggregation Results (Cached in Redis)

```typescript
// User Analytics Cache
{
  userId: ObjectId,
  overview: {
    totalTasks: number,
    completedTasks: number,
    pendingTasks: number,
    inProgressTasks: number,
    completionRate: number,
    currentStreak: number,
    longestStreak: number,
    productivityScore: number
  },
  today: {
    totalTasks: number,
    completedTasks: number,
    progress: "X/Y"
  },
  thisWeek: {
    totalTasks: number,
    completedTasks: number,
    completionRate: number
  },
  thisMonth: {
    totalTasks: number,
    completedTasks: number,
    completionRate: number
  },
  lastUpdated: Date
}

// Group Analytics Cache
{
  groupId: ObjectId,
  groupName: string,
  memberCount: number,
  activeMembersToday: number,
  overview: {
    totalTasks: number,
    completedToday: number,
    completionRate: number,
    averageTasksPerMember: number
  },
  topPerformers: [
    {
      memberId: ObjectId,
      memberName: string,
      tasksCompleted: number,
      streak: number
    }
  ],
  recentActivity: [
    {
      type: 'task_completed' | 'task_created' | ...,
      memberId: ObjectId,
      memberName: string,
      timestamp: Date
    }
  ]
}

// Admin Analytics Cache
{
  overview: {
    totalUsers: number,
    totalGroups: number,
    totalTasks: number,
    activeUsersToday: number,
    dauMauRatio: number
  },
  userGrowth: {
    today: number,
    thisWeek: number,
    thisMonth: number,
    growthRate: {
      daily: number,
      weekly: number,
      monthly: number
    }
  },
  revenue: {
    mrr: number,      // Monthly Recurring Revenue
    arr: number,      // Annual Recurring Revenue
    thisMonth: number,
    growthRate: number
  },
  taskMetrics: {
    createdToday: number,
    completedToday: number,
    completionRate: number,
    averageTasksPerUser: number
  },
  engagement: {
    dau: number,      // Daily Active Users
    mau: number,      // Monthly Active Users
    dauMauRatio: number,
    retentionRate: {
      day1: number,
      day7: number,
      day30: number
    }
  }
}
```

### Redis Cache Keys

```typescript
// User Analytics
analytics:user:{userId}:overview           // TTL: 5 min
analytics:user:{userId}:daily-progress     // TTL: 2 min
analytics:user:{userId}:streak             // TTL: 15 min
analytics:user:{userId}:productivity       // TTL: 10 min

// Task Analytics
analytics:task:overview                    // TTL: 5 min
analytics:task:group:{groupId}:status      // TTL: 5 min
analytics:task:daily-summary:{date}        // TTL: 2 min

// Group Analytics
analytics:group:{groupId}:overview         // TTL: 5 min
analytics:group:{groupId}:members          // TTL: 10 min
analytics:group:{groupId}:leaderboard      // TTL: 15 min
analytics:group:{groupId}:activity         // TTL: 2 min

// Admin Analytics
analytics:admin:dashboard                  // TTL: 10 min
analytics:admin:revenue                    // TTL: 15 min
analytics:admin:user-growth                // TTL: 15 min
```

---

## 🔄 Analytics Processing Flow

### Real-time Analytics Flow

```
┌─────────────┐
│   Request   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Check Cache │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
  Hit     Miss
   │       │
   │       ↓
   │  ┌─────────────┐
   │  │ Aggregate   │
   │  │ from DB     │
   │  └──────┬──────┘
   │         │
   │         ↓
   │  ┌─────────────┐
   │  │ Store in    │
   │  │ Redis       │
   │  └──────┬──────┘
   │         │
   └────────┘
       │
       ↓
┌─────────────┐
│  Return     │
│  Response   │
└─────────────┘
```

### Pre-computation Flow (BullMQ)

```
┌─────────────┐
│ Cron Trigger│
│ (Midnight)  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ BullMQ Job  │
│ Scheduled   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Aggregate   │
│ All Users   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Pre-compute │
│ Metrics     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Store in    │
│ Redis/DB    │
└─────────────┘
```

---

## 🎯 Key Components

### 1. User Analytics Service

**File**: `userAnalytics/userAnalytics.service.ts`

**Responsibilities**:
- User productivity metrics
- Streak calculation
- Productivity score (0-100)
- Daily/weekly/monthly progress
- Redis caching

**Key Methods**:
```typescript
class UserAnalyticsService {
  // Get complete user overview
  async getUserOverview(userId: Types.ObjectId): Promise<IUserOverviewAnalytics>
  
  // Get today's progress
  async getDailyProgress(userId: Types.ObjectId): Promise<IDailyProgress>
  
  // Get streak data
  async getStreak(userId: Types.ObjectId): Promise<IStreakData>
  
  // Get productivity score
  async getProductivityScore(userId: Types.ObjectId): Promise<IProductivityScore>
  
  // Get completion rate
  async getCompletionRate(userId: Types.ObjectId, range?: TAnalyticsTimeRange): Promise<ICompletionRateAnalytics>
  
  // Get task statistics
  async getTaskStatistics(userId: Types.ObjectId): Promise<ITaskStatistics>
  
  // Get trend analytics
  async getTrendAnalytics(userId: Types.ObjectId, range: TAnalyticsTimeRange): Promise<ITrendAnalytics>
}
```

**Productivity Score Calculation**:
```typescript
// 4-component weighted score (0-100)
const productivityScore = {
  completionRate: 40%,   // Task completion percentage
  streak: 20%,           // Current streak (max 20 points)
  tasksCompleted: 25%,   // Total tasks completed
  onTimeCompletion: 15%  // On-time completion rate
};

// Score = (completionRate * 0.4) + (streak * 0.2) + 
//         (tasksCompleted * 0.25) + (onTime * 0.15)
```

---

### 2. Task Analytics Service

**File**: `taskAnalytics/taskAnalytics.service.ts`

**Responsibilities**:
- Platform-wide task metrics
- Status distribution
- Completion trends
- Group task analytics
- Daily summaries

**Key Methods**:
```typescript
class TaskAnalyticsService {
  // Get platform overview
  async getOverview(): Promise<ITaskOverviewAnalytics>
  
  // Get status distribution
  async getStatusDistribution(filters?: any): Promise<IStatusDistribution>
  
  // Get completion trend
  async getCompletionTrend(range: TAnalyticsTimeRange): Promise<ICompletionTrendPoint[]>
  
  // Get daily summary
  async getDailySummary(date?: Date): Promise<IDailyTaskSummary>
  
  // Get group task analytics
  async getGroupTaskAnalytics(groupId: Types.ObjectId): Promise<IGroupTaskAnalytics>
}
```

---

### 3. Group Analytics Service

**File**: `groupAnalytics/groupAnalytics.service.ts`

**Responsibilities**:
- Group performance metrics
- Member statistics
- Leaderboards
- Activity feeds
- Member comparisons

**Key Methods**:
```typescript
class GroupAnalyticsService {
  // Get group overview
  async getGroupOverview(groupId: Types.ObjectId): Promise<IGroupOverviewAnalytics>
  
  // Get member statistics
  async getMemberStats(groupId: Types.ObjectId): Promise<IMemberStats[]>
  
  // Get leaderboard
  async getLeaderboard(groupId: Types.ObjectId, limit?: number): Promise<ILeaderboardEntry[]>
  
  // Get performance metrics
  async getPerformanceMetrics(groupId: Types.ObjectId, period?: 'week' | 'month' | 'all'): Promise<IGroupPerformanceMetrics>
  
  // Get activity feed
  async getActivityFeed(groupId: Types.ObjectId, limit?: number): Promise<IGroupActivity[]>
}
```

---

### 4. Admin Analytics Service

**File**: `adminAnalytics/adminAnalytics.service.ts`

**Responsibilities**:
- Platform-wide metrics
- User growth tracking
- Revenue analytics
- Engagement metrics
- Cohort analysis

**Key Methods**:
```typescript
class AdminAnalyticsService {
  // Get complete dashboard
  async getDashboardOverview(): Promise<IAdminDashboardAnalytics>
  
  // Get user growth
  async getUserGrowth(range?: TAnalyticsTimeRange): Promise<IUserGrowthAnalytics>
  
  // Get revenue analytics
  async getRevenueAnalytics(): Promise<IRevenueAnalytics>
  
  // Get task metrics
  async getTaskMetrics(): Promise<IPlatformTaskMetrics>
  
  // Get engagement metrics
  async getEngagementMetrics(): Promise<IUserEngagementMetrics>
}
```

---

## 🔐 Security Features

### 1. Authentication

- ✅ JWT authentication required for all endpoints
- ✅ Role-based access control
  - User analytics: Common role
  - Group analytics: Group member
  - Admin analytics: Admin role only

### 2. Authorization

```typescript
// User can only see their own analytics
GET /analytics/user/my/overview  // ✅ Allowed
GET /analytics/user/:userId/overview  // ❌ Forbidden (unless admin)

// Group members can see group analytics
GET /analytics/group/:groupId/overview  // ✅ If member
GET /analytics/group/:groupId/overview  // ❌ If not member

// Admin-only endpoints
GET /analytics/admin/dashboard  // ✅ Admin only
```

### 3. Data Aggregation Security

```typescript
// Never expose raw user data
// ✅ Good: Aggregated metrics
{
  totalUsers: 125847,
  activeUsersToday: 45621
}

// ❌ Bad: Individual user data in admin analytics
```

---

## 📈 Performance Optimization

### 1. Redis Caching Strategy

```typescript
// Cache-aside pattern
async getUserOverview(userId: Types.ObjectId) {
  const cacheKey = `analytics:user:${userId}:overview`;
  
  // 1. Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // 2. Cache miss - aggregate from DB
  const analytics = await this.aggregateUserAnalytics(userId);
  
  // 3. Write to cache
  await redisClient.setEx(cacheKey, 300, JSON.stringify(analytics));
  
  // 4. Return data
  return analytics;
}
```

**Cache TTLs**:
```typescript
// Short TTL for frequently changing data
daily-progress: 2 min
activity-feed: 2 min

// Medium TTL for stable data
overview: 5 min
status-distribution: 5 min

// Long TTL for historical data
streak: 15 min
leaderboard: 15 min
revenue: 15 min
```

### 2. Aggregation Pipeline Optimization

```typescript
// ✅ Good: Efficient aggregation
const stats = await Task.aggregate([
  {
    $match: {
      ownerUserId: userId,
      startTime: { $gte: startDate, $lte: endDate },
      isDeleted: false
    }
  },
  {
    $group: {
      _id: '$status',
      count: { $sum: 1 }
    }
  }
]);

// Use indexes
// Use projection
// Limit results
```

### 3. Parallel Query Execution

```typescript
// ✅ Good: Parallel execution
const [todayStats, weekStats, monthStats, allTimeStats] = await Promise.all([
  this.getTaskStatsForPeriod(userId, todayStart, todayEnd),
  this.getTaskStatsForPeriod(userId, weekStart, weekEnd),
  this.getTaskStatsForPeriod(userId, monthStart, monthEnd),
  this.getTaskStatsForPeriod(userId, new Date(0), now)
]);

// 4x faster than sequential
```

### 4. Pre-computation (BullMQ)

```typescript
// Scheduled jobs for heavy analytics
// Runs daily at midnight
{
  name: 'daily-analytics-job',
  schedule: '0 0 * * *',
  handler: async () => {
    // Pre-compute yesterday's analytics
    // Calculate user streaks
    // Update completion rates
  }
}

// Runs hourly
{
  name: 'hourly-aggregation-job',
  schedule: '0 * * * *',
  handler: async () => {
    // Aggregate hourly activity
    // Update trending data
  }
}
```

---

## 📊 API Endpoints Summary

### User Analytics (7 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/user/my/overview` | ✅ | Complete user analytics |
| GET | `/analytics/user/my/daily-progress` | ✅ | Today's progress |
| GET | `/analytics/user/my/weekly-streak` | ✅ | Streak data |
| GET | `/analytics/user/my/productivity-score` | ✅ | Productivity score |
| GET | `/analytics/user/my/completion-rate` | ✅ | Completion rate |
| GET | `/analytics/user/my/task-statistics` | ✅ | Task statistics |
| GET | `/analytics/user/my/trend` | ✅ | Trend analytics |

### Task Analytics (4 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/task/overview` | ✅ | Platform overview |
| GET | `/analytics/task/status-distribution` | ✅ | Status distribution |
| GET | `/analytics/task/group/:groupId` | ✅ | Group task analytics |
| GET | `/analytics/task/daily-summary` | ✅ | Daily summary |

### Group Analytics (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/group/:groupId/overview` | ✅ | Group overview |
| GET | `/analytics/group/:groupId/members` | ✅ | Member statistics |
| GET | `/analytics/group/:groupId/leaderboard` | ✅ | Leaderboard |
| GET | `/analytics/group/:groupId/performance` | ✅ | Performance metrics |
| GET | `/analytics/group/:groupId/activity` | ✅ | Activity feed |

### Admin Analytics (5 endpoints)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/admin/dashboard` | ✅ | Complete dashboard |
| GET | `/analytics/admin/user-growth` | ✅ | User growth |
| GET | `/analytics/admin/revenue` | ✅ | Revenue analytics |
| GET | `/analytics/admin/task-metrics` | ✅ | Task metrics |
| GET | `/analytics/admin/engagement` | ✅ | Engagement metrics |

**Total**: 21 analytics endpoints

---

## 🔗 External Dependencies

### Internal Modules

- ✅ **task.module** - Task data source
- ✅ **user.module** - User data source
- ✅ **group.module** - Group and member data
- ✅ **notification.module** - Activity feed data
- ✅ **payment.module** - Revenue data

### External Services

- ✅ **MongoDB** - Data aggregation
- ✅ **Redis** - Caching layer
- ✅ **BullMQ** - Scheduled pre-computation

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('UserAnalyticsService', () => {
  describe('getUserOverview', () => {
    it('should return cached data if available', async () => {
      // Test cache hit
    });
    
    it('should aggregate from DB on cache miss', async () => {
      // Test cache miss
    });
    
    it('should calculate productivity score correctly', async () => {
      // Test score calculation
    });
  });
});
```

### Integration Tests

```typescript
describe('Analytics API', () => {
  describe('GET /analytics/user/my/overview', () => {
    it('should return 200 with user analytics', async () => {
      // Test endpoint
    });
  });
  
  describe('GET /analytics/admin/dashboard', () => {
    it('should require admin role', async () => {
      // Test authorization
    });
  });
});
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)

- [ ] Advanced cohort analysis
- [ ] Predictive analytics (ML-based)
- [ ] Custom dashboard builder
- [ ] Export analytics (CSV/PDF)
- [ ] Real-time WebSocket updates

### Phase 3 (Future)

- [ ] AI-powered insights
- [ ] Anomaly detection
- [ ] Comparative analytics (vs. similar users)
- [ ] Advanced forecasting

---

## 📝 Related Documentation

- [README](./README.md)
- [Performance Report](./perf/analytics-module-performance-report.md)
- [Diagrams](./dia/)
- [System Guide](./ANALYTICS_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready
