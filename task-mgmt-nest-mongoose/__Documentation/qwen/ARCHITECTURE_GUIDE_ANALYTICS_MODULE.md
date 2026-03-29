# 🏗️ ANALYTICS MODULE - COMPREHENSIVE ARCHITECTURE GUIDE

**Version**: 1.0.0 (NestJS)  
**Last Updated**: 26-03-29  
**Level**: Senior/Mastery  
**Estimated Study Time**: 1.5 hours

---

## 📋 **TABLE OF CONTENTS**

1. [Module Overview](#1-module-overview)
2. [Analytics Architecture](#2-analytics-architecture)
3. [Module Structure](#3-module-structure)
4. [Admin Analytics](#4-admin-analytics)
5. [Task Analytics](#5-task-analytics)
6. [User Analytics](#6-user-analytics)
7. [Chart Aggregation](#7-chart-aggregation)
8. [Caching Strategy](#8-caching-strategy)
9. [Aggregation Pipelines](#9-aggregation-pipelines)
10. [Performance Optimization](#10-performance-optimization)

---

## 1. **MODULE OVERVIEW**

### **1.1 Purpose & Scope**

The Analytics module provides **platform-wide analytics and reporting**:
- **Admin Dashboard**: Platform overview, user growth, revenue metrics
- **Task Analytics**: Task completion trends, status distribution
- **User Analytics**: User engagement, productivity metrics
- **Chart Data**: Pre-aggregated data for visualizations

### **1.2 Key Design Principles**

1. **Read-Only**: Analytics queries don't modify data
2. **Aggregation-Heavy**: MongoDB aggregation pipelines
3. **Cached Results**: Expensive queries cached
4. **Time-Range Based**: Most queries filtered by date
5. **Approximate OK**: Some metrics can be eventually consistent

### **1.3 Module Statistics**

| Metric | Value |
|--------|-------|
| **Total Files** | 15 files |
| **Lines of Code** | ~1,200 lines |
| **API Endpoints** | 11 endpoints |
| **Aggregation Pipelines** | 15+ pipelines |
| **Cache TTL** | 5-15 minutes |

---

## 2. **ANALYTICS ARCHITECTURE**

### **2.1 High-Level Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   Web    │  │   iOS    │  │ Android  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
└───────┼─────────────┼─────────────┼─────────────────────────┘
        │             │             │
        │ HTTP        │ HTTP        │ HTTP
        │             │             │
┌───────▼─────────────▼─────────────▼─────────────────────────┐
│                  NestJS Backend                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Analytics Module                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │   Admin     │  │    Task     │  │    User     │   │   │
│  │  │ Analytics   │  │  Analytics  │  │  Analytics  │   │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │   │
│  │         │                │                │           │   │
│  │         └────────────────┼────────────────┘           │   │
│  │                          │                            │   │
│  │         ┌────────────────▼────────────────┐           │   │
│  │         │    Chart Aggregation Service    │           │   │
│  │         └────────────────┬────────────────┘           │   │
│  └──────────────────────────┼────────────────────────────┘   │
└─────────────────────────────┼─────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐   ┌────────▼────────┐   ┌───────▼───────┐
│   MongoDB     │   │   Redis Cache   │   │  Pre-computed │
│ Aggregation   │   │   (5-15 min)    │   │   Collections │
└───────────────┘   └─────────────────┘   └───────────────┘
```

---

## 3. **MODULE STRUCTURE**

```
src/modules/analytics.module/
├── analytics.module.ts                       # Parent module
├── analytics.constants.ts                    # Cache config, time ranges
├── adminAnalytics/
│   ├── adminAnalytics.module.ts
│   ├── adminAnalytics.service.ts             # Admin dashboard metrics
│   ├── adminAnalytics.controller.ts          # 3 endpoints
│   └── dto/
│       └── admin-analytics.dto.ts
├── taskAnalytics/
│   ├── taskAnalytics.module.ts
│   ├── taskAnalytics.service.ts              # Task metrics
│   ├── taskAnalytics.controller.ts           # 3 endpoints
│   └── dto/
│       └── task-analytics.dto.ts
├── userAnalytics/
│   ├── userAnalytics.module.ts
│   ├── userAnalytics.service.ts              # User metrics
│   ├── userAnalytics.controller.ts           # 3 endpoints
│   └── dto/
│       └── user-analytics.dto.ts
└── chartAggregation/
    ├── chartAggregation.module.ts
    ├── chartAggregation.service.ts           # Chart data
    ├── chartAggregation.controller.ts        # 2 endpoints
    └── dto/
        └── chart-aggregation.dto.ts
```

---

## 4. **ADMIN ANALYTICS**

### **4.1 Dashboard Overview**

```typescript
@Injectable()
export class AdminAnalyticsService {
  async getDashboardOverview(): Promise<AdminDashboardAnalytics> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    // Get platform totals
    const [totalUsers, totalTasks] = await Promise.all([
      this.userModel.countDocuments({ isDeleted: false }),
      this.taskModel.countDocuments({ isDeleted: false }),
    ]);

    // Get user count by role
    const usersByRole = await this.userModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    // Get today's new users
    const todayNewUsers = await this.userModel.countDocuments({
      createdAt: { $gte: todayStart },
      isDeleted: false,
    });

    // Get this week's new users
    const weekNewUsers = await this.userModel.countDocuments({
      createdAt: { $gte: weekStart },
      isDeleted: false,
    });

    return {
      totalUsers,
      totalTasks,
      usersByRole: this.mapRoleCounts(usersByRole),
      newUsers: {
        today: todayNewUsers,
        thisWeek: weekNewUsers,
        thisMonth: await this.getNewUsersThisMonth(),
      },
      lastUpdated: new Date(),
    };
  }

  /**
   * Get user growth analytics (monthly chart data)
   */
  async getUserGrowthAnalytics(): Promise<UserGrowthAnalytics> {
    const now = new Date();
    const yearStart = startOfMonth(now);

    const monthlyUsers = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: yearStart },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      monthlyGrowth: monthlyUsers.map((m: any) => ({
        month: monthNames[m._id - 1],
        count: m.count,
      })),
      totalGrowth: monthlyUsers.reduce((sum: number, m: any) => sum + m.count, 0),
    };
  }

  /**
   * Get task metrics (status and type distribution)
   */
  async getTaskMetrics(): Promise<TaskMetrics> {
    const statusDistribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const typeDistribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$taskType', count: { $sum: 1 } } },
    ]);

    return {
      byStatus: this.mapDistribution(statusDistribution),
      byType: this.mapDistribution(typeDistribution),
    };
  }
}
```

### **4.2 API Endpoints**

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/analytics/admin/dashboard` | ✅ | Admin | Dashboard overview |
| `GET` | `/analytics/admin/user-growth` | ✅ | Admin | User growth chart |
| `GET` | `/analytics/admin/task-metrics` | ✅ | Admin | Task metrics |

---

## 5. **TASK ANALYTICS**

### **5.1 Task Overview**

```typescript
@Injectable()
export class TaskAnalyticsService {
  async getOverview(): Promise<TaskOverviewAnalytics> {
    const now = new Date();
    const todayStart = startOfDay(now);

    const [totalTasks, todayTasks] = await Promise.all([
      this.taskModel.countDocuments({ isDeleted: false }),
      this.taskModel.countDocuments({
        startTime: { $gte: todayStart },
        isDeleted: false,
      }),
    ]);

    const statusDistribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      totalTasks,
      todayTasks,
      byStatus: this.mapDistribution(statusDistribution),
    };
  }

  /**
   * Get completion trend (last N days)
   */
  async getCompletionTrend(days: number = 7): Promise<CompletionTrend> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const trend = await this.taskModel.aggregate([
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      trend: trend.map((t: any) => ({
        date: t._id,
        count: t.count,
      })),
      period: `${days} days`,
    };
  }
}
```

### **5.2 API Endpoints**

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/analytics/tasks/overview` | ✅ | Admin | Task overview |
| `GET` | `/analytics/tasks/completion-trend` | ✅ | Admin | Completion trend |
| `GET` | `/analytics/tasks/status-distribution` | ✅ | Admin | Status distribution chart |

---

## 6. **USER ANALYTICS**

### **6.1 User Overview**

```typescript
@Injectable()
export class UserAnalyticsService {
  async getUserOverview(userId: string): Promise<UserOverviewAnalytics> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);

    const [totalTasks, completedTasks, todayTasks] = await Promise.all([
      this.taskModel.countDocuments({
        ownerUserId: new Types.ObjectId(userId),
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        ownerUserId: new Types.ObjectId(userId),
        status: 'completed',
        isDeleted: false,
      }),
      this.taskModel.countDocuments({
        ownerUserId: new Types.ObjectId(userId),
        startTime: { $gte: todayStart },
        isDeleted: false,
      }),
    ]);

    return {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      todayTasks,
      completionRate: totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0,
    };
  }

  /**
   * Get productivity analytics (daily activity)
   */
  async getProductivity(userId: string, days: number = 7): Promise<ProductivityAnalytics> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const tasksByDay = await this.taskModel.aggregate([
      {
        $match: {
          ownerUserId: new Types.ObjectId(userId),
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      dailyActivity: tasksByDay.map((d: any) => ({
        date: d._id,
        created: d.count,
        completed: d.completed,
      })),
      totalCreated: tasksByDay.reduce((sum, d) => sum + d.count, 0),
      totalCompleted: tasksByDay.reduce((sum, d) => sum + d.completed, 0),
    };
  }
}
```

### **6.3 API Endpoints**

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/analytics/users/:userId/overview` | ✅ | Admin | User overview |
| `GET` | `/analytics/users/:userId/productivity` | ✅ | Admin | Productivity chart |
| `GET` | `/analytics/users/:userId/completion-rate` | ✅ | Admin | Completion rate trend |

---

## 7. **CHART AGGREGATION**

### **7.1 Chart Data Service**

```typescript
@Injectable()
export class ChartAggregationService {
  /**
   * Get status distribution pie chart data
   */
  async getStatusDistributionChart(): Promise<ChartDataset> {
    const distribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      labels: distribution.map((d: any) => d._id),
      data: distribution.map((d: any) => d.count),
    };
  }

  /**
   * Get daily task creation bar chart data
   */
  async getDailyTaskChart(days: number = 30): Promise<ChartDataset> {
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const dailyData = await this.taskModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      labels: dailyData.map((d: any) => d._id),
      created: dailyData.map((d: any) => d.count),
      completed: dailyData.map((d: any) => d.completed),
    };
  }

  /**
   * Get monthly task summary line chart data
   */
  async getMonthlyTaskChart(months: number = 12): Promise<ChartDataset> {
    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    const monthlyData = await this.taskModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      labels: monthlyData.map((m: any) => monthNames[m._id - 1]),
      created: monthlyData.map((m: any) => m.count),
      completed: monthlyData.map((m: any) => m.completed),
    };
  }
}
```

### **7.2 API Endpoints**

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/analytics/charts/status-distribution` | ✅ | Admin | Status pie chart |
| `GET` | `/analytics/charts/daily-tasks` | ✅ | Admin | Daily tasks bar chart |
| `GET` | `/analytics/charts/monthly-tasks` | ✅ | Admin | Monthly tasks line chart |

---

## 8. **CACHING STRATEGY**

### **8.1 Cache Configuration**

```typescript
const CACHE_KEYS = {
  admin: {
    dashboard: () => 'analytics:admin:dashboard',
    userGrowth: () => 'analytics:admin:user-growth',
    taskMetrics: () => 'analytics:admin:task-metrics',
  },
  task: {
    overview: () => 'analytics:task:overview',
    completionTrend: (days: number) => `analytics:task:completion-trend:${days}`,
  },
  user: {
    overview: (userId: string) => `analytics:user:${userId}:overview`,
    productivity: (userId: string, days: number) => `analytics:user:${userId}:productivity:${days}`,
  },
  chart: {
    statusDistribution: () => 'analytics:chart:status-distribution',
    dailyTasks: (days: number) => `analytics:chart:daily-tasks:${days}`,
    monthlyTasks: (months: number) => `analytics:chart:monthly-tasks:${months}`,
  },
};

const CACHE_TTL = {
  ADMIN_DASHBOARD: 600,      // 10 minutes
  ADMIN_USER_GROWTH: 900,    // 15 minutes
  TASK_OVERVIEW: 300,        // 5 minutes
  TASK_TREND: 600,           // 10 minutes
  USER_OVERVIEW: 300,        // 5 minutes
  USER_PRODUCTIVITY: 600,    // 10 minutes
  CHART_DATA: 900,           // 15 minutes
};
```

### **8.2 Cache Implementation**

```typescript
async getDashboardOverview(): Promise<AdminDashboardAnalytics> {
  const cacheKey = CACHE_KEYS.admin.dashboard();

  const cached = await this.cacheManager.get<AdminDashboardAnalytics>(cacheKey);
  if (cached) {
    return cached;
  }

  // Expensive aggregation...
  const result = await this.calculateDashboardOverview();

  await this.cacheManager.set(cacheKey, result, CACHE_TTL.ADMIN_DASHBOARD);

  return result;
}
```

---

## 9. **AGGREGATION PIPELINES**

### **9.1 Complex Pipeline Example**

```typescript
// User engagement analytics with multiple stages
async getUserEngagement(userId: string): Promise<UserEngagement> {
  const pipeline = [
    {
      $match: {
        ownerUserId: new Types.ObjectId(userId),
        isDeleted: false,
      },
    },
    {
      $facet: {
        totalTasks: [{ $count: 'count' }],
        completedTasks: [
          { $match: { status: 'completed' } },
          { $count: 'count' },
        ],
        avgCompletionTime: [
          { $match: { status: 'completed', completedAt: { $exists: true } } },
          {
            $addFields: {
              completionTime: {
                $subtract: ['$completedAt', '$startTime'],
              },
            },
          },
          { $group: { _id: null, avg: { $avg: '$completionTime' } } },
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } },
        ],
        byType: [
          { $group: { _id: '$taskType', count: { $sum: 1 } } },
        ],
      },
    },
  ];

  const [result] = await this.taskModel.aggregate(pipeline);

  return {
    totalTasks: result.totalTasks[0]?.count || 0,
    completedTasks: result.completedTasks[0]?.count || 0,
    avgCompletionTime: result.avgCompletionTime[0]?.avg || 0,
    byPriority: this.mapDistribution(result.byPriority),
    byType: this.mapDistribution(result.byType),
  };
}
```

---

## 10. **PERFORMANCE OPTIMIZATION**

### **10.1 Optimization Techniques**

1. **Indexes**: All query fields indexed
2. **Projection**: Only select needed fields
3. **Limit**: Always limit results
4. **Caching**: Aggressive caching
5. **Pre-computation**: Store aggregated data
6. **Pagination**: Cursor-based pagination

### **10.2 Index Strategy**

```typescript
// Task collection indexes for analytics
TaskSchema.index({ ownerUserId: 1, status: 1, isDeleted: 1 });
TaskSchema.index({ createdAt: -1, isDeleted: 1 });
TaskSchema.index({ completedAt: -1, isDeleted: 1 });
TaskSchema.index({ status: 1, isDeleted: 1 });
TaskSchema.index({ taskType: 1, isDeleted: 1 });
TaskSchema.index({ priority: 1, isDeleted: 1 });
```

---

## 📚 **KEY TAKEAWAYS**

1. **Read-Only** - Analytics queries don't modify data
2. **Aggregation-Heavy** - MongoDB aggregation pipelines
3. **Cached Results** - 5-15 minute TTL
4. **Time-Range Based** - Most queries filtered by date
5. **Approximate OK** - Some metrics eventually consistent
6. **Chart Ready** - Data formatted for chart libraries

---

**Next Module**: TaskProgress Module (final module guide)

---
-26-03-29
