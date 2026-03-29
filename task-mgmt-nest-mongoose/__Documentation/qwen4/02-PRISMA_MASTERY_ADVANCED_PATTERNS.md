# 📘 PRISMA MASTERY WITH NESTJS & EXPRESS.JS
## Volume 2: Advanced Patterns & Performance Tuning

**Production-Ready Database Architecture for Enterprise Applications**

---

## 📖 TABLE OF CONTENTS

1. [Advanced Caching Strategies](#1-advanced-caching-strategies)
2. [Query Performance Monitoring](#2-query-performance-monitoring)
3. [Database Indexing Strategies](#3-database-indexing-strategies)
4. [Complex Reporting & Analytics](#4-complex-reporting--analytics)
5. [Multi-Tenancy Patterns](#5-multi-tenancy-patterns)
6. [Audit Logging & Change Tracking](#6-audit-logging--change-tracking)
7. [Database Partitioning & Sharding](#7-database-partitioning--sharding)
8. [Real-time Data with Triggers](#8-real-time-data-with-triggers)
9. [Advanced Error Handling](#9-advanced-error-handling)
10. [Production Deployment Checklist](#10-production-deployment-checklist)

---

## 1. ADVANCED CACHING STRATEGIES

### 1.1 Multi-Layer Caching Architecture

```typescript
// ─────────────────────────────────────────────────────────────
// Architecture: 3-Tier Caching
// ─────────────────────────────────────────────────────────────
/*
┌─────────────────────────────────────────────────────────┐
│                  REQUEST LAYER                          │
│            (Redis - Hot Cache: 5min)                   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                 APPLICATION LAYER                       │
│          (In-Memory - Warm Cache: 1hr)                 │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│                  DATABASE LAYER                         │
│         (PostgreSQL - Cold Storage)                     │
└─────────────────────────────────────────────────────────┘
*/

// ─────────────────────────────────────────────────────────────
// Pattern 1: Cache-Aside Pattern with Redis
// ─────────────────────────────────────────────────────────────
import { Redis } from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

class CacheService {
  private redis: Redis;
  private defaultTTL = 300; // 5 minutes

  constructor() {
    this.redis = redis;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const timeout = ttl || this.defaultTTL;
      await this.redis.setex(key, timeout, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // Cache with automatic invalidation
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached) {
      console.log(`Cache hit: ${key}`);
      return cached;
    }

    // Cache miss - fetch from database
    console.log(`Cache miss: ${key}`);
    const data = await fetchFn();

    // Store in cache
    await this.set(key, data, ttl);

    return data;
  }

  // Pattern-based invalidation
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
      console.log(`Invalidated ${keys.length} keys matching ${pattern}`);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Pattern 2: Query Result Caching with Invalidation
// ─────────────────────────────────────────────────────────────
class TaskCacheService {
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
  }

  // Cache key generator
  private getTaskCacheKey(taskId: string): string {
    return `task:${taskId}`;
  }

  private getUserTasksCacheKey(userId: string, page: number): string {
    return `user:${userId}:tasks:page:${page}`;
  }

  // Get task with caching
  async getTask(taskId: string) {
    return this.cache.getOrSet(
      this.getTaskCacheKey(taskId),
      async () => {
        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: {
            createdBy: {
              select: {
                id: true,
                email: true,
                profile: true,
              },
            },
            assignedUsers: {
              select: {
                id: true,
                email: true,
              },
            },
            _count: {
              select: {
                subtasks: true,
              },
            },
          },
        });

        if (!task) {
          throw new NotFoundException('Task not found');
        }

        return task;
      },
      300 // 5 minutes
    );
  }

  // Invalidate task cache on update
  async invalidateTaskCache(taskId: string): Promise<void> {
    await this.cache.del(this.getTaskCacheKey(taskId));
    
    // Also invalidate related list caches
    await this.cache.invalidatePattern(`user:*:tasks:page:*`);
  }

  // Update task with cache invalidation
  async updateTask(taskId: string, data: any) {
    const updated = await prisma.task.update({
      where: { id: taskId },
      data,
    });

    // Invalidate cache
    await this.invalidateTaskCache(taskId);

    return updated;
  }
}

// ─────────────────────────────────────────────────────────────
// Pattern 3: Write-Through Caching
// ─────────────────────────────────────────────────────────────
async function createTaskWithCache(userId: string, taskData: any) {
  // 1. Create in database
  const task = await prisma.task.create({
    data: {
      ...taskData,
      createdById: userId,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  // 2. Write to cache
  const cacheService = new CacheService();
  await cacheService.set(
    `task:${task.id}`,
    task,
    600 // 10 minutes
  );

  // 3. Invalidate list cache
  await cacheService.invalidatePattern(`user:${userId}:tasks:*`);

  return task;
}

// ─────────────────────────────────────────────────────────────
// Pattern 4: Cache Stampede Prevention (Locking)
// ─────────────────────────────────────────────────────────────
async function getTaskWithLockPrevention(taskId: string) {
  const cache = new CacheService();
  const cacheKey = `task:${taskId}`;
  const lockKey = `${cacheKey}:lock`;

  // Try cache first
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  // Try to acquire lock
  const lock = await redis.set(lockKey, '1', 'NX', 'EX', 10);
  
  if (!lock) {
    // Another request is fetching - wait and retry
    await new Promise(resolve => setTimeout(resolve, 100));
    return getTaskWithLockPrevention(taskId);
  }

  try {
    // Double-check cache (another request might have populated it)
    const cachedRetry = await cache.get(cacheKey);
    if (cachedRetry) return cachedRetry;

    // Fetch from database
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    // Cache the result
    await cache.set(cacheKey, task, 300);

    return task;
  } finally {
    // Release lock
    await redis.del(lockKey);
  }
}
```

### 1.2 Query Result Caching with TTL Strategies

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Tiered TTL Based on Data Volatility
// ─────────────────────────────────────────────────────────────
interface CacheTTLConfig {
  task: number;           // 5 minutes - frequently updated
  user: number;           // 30 minutes - moderately updated
  settings: number;       // 1 hour - rarely updated
  analytics: number;      // 1 hour - expensive queries
  list: number;           // 2 minutes - pagination caches
}

const TTL_CONFIG: CacheTTLConfig = {
  task: 300,
  user: 1800,
  settings: 3600,
  analytics: 3600,
  list: 120,
};

class TieredCacheService {
  private cache: CacheService;

  async getTaskWithTieredCache(taskId: string) {
    return this.cache.getOrSet(
      `task:${taskId}`,
      async () => {
        return prisma.task.findUnique({
          where: { id: taskId },
          include: {
            subtasks: {
              where: { deletedAt: null },
            },
          },
        });
      },
      TTL_CONFIG.task
    );
  }

  async getUserProfileWithTieredCache(userId: string) {
    return this.cache.getOrSet(
      `user:${userId}:profile`,
      async () => {
        return prisma.userProfile.findUnique({
          where: { userId },
        });
      },
      TTL_CONFIG.user
    );
  }

  async getAnalyticsWithTieredCache(userId: string, startDate: Date, endDate: Date) {
    const cacheKey = `analytics:${userId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Expensive analytics query
        return prisma.$queryRaw`
          SELECT 
            status,
            COUNT(*) as count,
            AVG(EXTRACT(EPOCH FROM ("completedAt" - "startTime"))) as avg_duration
          FROM tasks
          WHERE "createdById" = ${userId}
            AND "completedAt" >= ${startDate}
            AND "completedAt" <= ${endDate}
          GROUP BY status
        `;
      },
      TTL_CONFIG.analytics
    );
  }
}
```

---

## 2. QUERY PERFORMANCE MONITORING

### 2.1 Query Performance Middleware

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Query Performance Monitoring Middleware
// ─────────────────────────────────────────────────────────────
import { Prisma } from '@prisma/client';

class QueryMonitor {
  private slowQueryThreshold = 1000; // 1 second
  private queryLog: Array<{
    query: string;
    duration: number;
    timestamp: Date;
  }> = [];

  // Prisma middleware
  createMiddleware() {
    return async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<any>
    ) => {
      const before = Date.now();
      
      try {
        const result = await next(params);
        const after = Date.now();
        const duration = after - before;

        // Log slow queries
        if (duration > this.slowQueryThreshold) {
          console.warn(
            `⚠️ SLOW QUERY: ${params.model}.${params.action} took ${duration}ms`
          );
          
          this.queryLog.push({
            query: `${params.model}.${params.action}`,
            duration,
            timestamp: new Date(),
          });
        }

        return result;
      } catch (error) {
        const after = Date.now();
        console.error(
          `❌ QUERY ERROR: ${params.model}.${params.action} failed after ${after - before}ms`,
          error
        );
        throw error;
      }
    };
  }

  // Get slow query report
  getSlowQueryReport(limit: number = 10) {
    return this.queryLog
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  // Clear log
  clearLog() {
    this.queryLog = [];
  }
}

// Usage in Prisma Service
const prisma = new PrismaClient();
const monitor = new QueryMonitor();

prisma.$use(monitor.createMiddleware());
```

### 2.2 Database Performance Metrics

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Database Health Check
// ─────────────────────────────────────────────────────────────
async function getDatabaseHealthMetrics() {
  const [
    connectionCount,
    tableSizes,
    indexUsage,
    slowQueries,
  ] = await Promise.all([
    // Active connections
    prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `,

    // Table sizes
    prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 10
    `,

    // Index usage statistics
    prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes
      WHERE schemaname = 'public'
      ORDER BY idx_scan DESC
      LIMIT 20
    `,

    // Slow queries from pg_stat_statements
    prisma.$queryRaw`
      SELECT 
        query,
        calls,
        mean_exec_time,
        total_exec_time,
        rows
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      ORDER BY mean_exec_time DESC
      LIMIT 10
    `,
  ]);

  return {
    connections: connectionCount,
    tableSizes,
    indexUsage,
    slowQueries,
    timestamp: new Date(),
  };
}

// ─────────────────────────────────────────────────────────────
// Pattern: Query Execution Plan Analysis
// ─────────────────────────────────────────────────────────────
async function analyzeQueryExecution(query: string, params: any[]) {
  const explain = await prisma.$queryRawUnsafe(
    `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`,
    ...params
  );

  return explain;
}

// Example usage
async function optimizeTaskQuery(userId: string) {
  const query = `
    SELECT * FROM tasks
    WHERE "createdById" = $1
      AND status = 'IN_PROGRESS'
    ORDER BY priority DESC, "createdAt" DESC
  `;

  const executionPlan = await analyzeQueryExecution(query, [userId]);
  
  console.log('Execution Plan:', JSON.stringify(executionPlan, null, 2));
  
  // Look for:
  // - Seq Scan (bad) → needs index
  // - Index Scan (good)
  // - High cost estimates → optimize query
}
```

---

## 3. DATABASE INDEXING STRATEGIES

### 3.1 Advanced Index Patterns

```prisma
// schema.prisma

model Task {
  id        String   @id @default(uuid())
  title     String
  status    TaskStatus
  priority  Priority
  taskType  TaskType
  
  createdById String
  ownerId     String?
  
  startTime DateTime?
  dueDate   DateTime?
  
  // ───────────────────────────────────────────────────────────
  // COMPOSITE INDEXES
  // ───────────────────────────────────────────────────────────
  
  // Index for common filter combination
  @@index([createdById, status, priority])
  
  // Index for date range queries
  @@index([startTime, dueDate])
  
  // Partial index for active tasks only (saves space)
  @@index([status]) where: "(\"deletedAt\" IS NULL)"
  
  // Index for sorting
  @@index([priority, createdAt])
  
  // ───────────────────────────────────────────────────────────
  // EXPRESSION INDEXES (via raw SQL migration)
  // ───────────────────────────────────────────────────────────
  
  // For case-insensitive search
  // CREATE INDEX "Task_title_lower_idx" ON "Task" (LOWER(title));
  
  // For date extraction
  // CREATE INDEX "Task_startDate_month_idx" ON "Task" (DATE_TRUNC('month', "startTime"));
  
  @@map("tasks")
}

// ─────────────────────────────────────────────────────────────
// COVERING INDEX (includes all needed columns)
// ─────────────────────────────────────────────────────────────
/*
CREATE INDEX "Task_dashboard_covering_idx" ON "Task" (
  "createdById",
  "status",
  "priority" DESC,
  "createdAt" DESC
) INCLUDE (title, "startTime", "dueDate");

-- This allows index-only scans for dashboard queries
*/
```

### 3.2 Index Usage Analysis

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Find Missing Indexes
// ─────────────────────────────────────────────────────────────
async function findMissingIndexes() {
  const missingIndexes = await prisma.$queryRaw`
    SELECT 
      schemaname,
      tablename,
      attname,
      n_distinct,
      correlation
    FROM pg_stats
    WHERE schemaname = 'public'
      AND n_distinct > 100
      AND correlation < 0.5
    ORDER BY n_distinct DESC
    LIMIT 20
  `;

  return missingIndexes;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Find Unused Indexes
// ─────────────────────────────────────────────────────────────
async function findUnusedIndexes() {
  const unused = await prisma.$queryRaw`
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelid)) as size
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND indexname NOT LIKE '%_pkey'
    ORDER BY pg_relation_size(indexrelid) DESC
  `;

  return unused;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Index Creation Script
// ─────────────────────────────────────────────────────────────
async function createIndexConcurrently(indexName: string, query: string) {
  // CONCURRENTLY doesn't lock table during creation
  await prisma.$executeRawUnsafe(
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} ${query}`
  );
}

// Example: Create index for task dashboard
async function createTaskDashboardIndex() {
  await createIndexConcurrently(
    '"Task_dashboard_idx"',
    'ON "Task" ("createdById", "status", "priority" DESC, "createdAt" DESC)'
  );
}
```

---

## 4. COMPLEX REPORTING & ANALYTICS

### 4.1 Materialized Views for Analytics

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Create Materialized View
// ─────────────────────────────────────────────────────────────
async function createTaskAnalyticsMaterializedView() {
  await prisma.$executeRaw`
    CREATE MATERIALIZED VIEW IF NOT EXISTS task_analytics_mv AS
    SELECT 
      DATE_TRUNC('day', "createdAt") as date,
      status,
      priority,
      "taskType",
      COUNT(*) as task_count,
      COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed_count,
      AVG(EXTRACT(EPOCH FROM ("completedAt" - "startTime"))) / 3600 as avg_completion_hours
    FROM tasks
    WHERE "deletedAt" IS NULL
    GROUP BY 
      DATE_TRUNC('day', "createdAt"),
      status,
      priority,
      "taskType"
    WITH DATA;

    -- Create index on materialized view
    CREATE UNIQUE INDEX IF NOT EXISTS task_analytics_mv_idx 
    ON task_analytics_mv (date, status, priority);
  `;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Refresh Materialized View
// ─────────────────────────────────────────────────────────────
async function refreshTaskAnalytics() {
  // CONCURRENTLY allows reads during refresh
  await prisma.$executeRaw`
    REFRESH MATERIALIZED VIEW CONCURRENTLY task_analytics_mv
  `;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Query Materialized View
// ─────────────────────────────────────────────────────────────
async function getTaskAnalytics(startDate: Date, endDate: Date) {
  const analytics = await prisma.$queryRaw`
    SELECT 
      date,
      status,
      priority,
      task_count,
      completed_count,
      avg_completion_hours
    FROM task_analytics_mv
    WHERE date >= ${startDate}
      AND date <= ${endDate}
    ORDER BY date DESC, status, priority
  `;

  return analytics;
}
```

### 4.2 Advanced Reporting Queries

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Cohort Analysis
// ─────────────────────────────────────────────────────────────
async function getUserCohortAnalysis() {
  const cohortData = await prisma.$queryRaw`
    WITH user_cohorts AS (
      SELECT 
        u.id as user_id,
        DATE_TRUNC('month', u."createdAt") as cohort_month,
        t.id as task_id,
        t.status,
        DATE_TRUNC('month', t."createdAt") as task_month
      FROM users u
      LEFT JOIN tasks t ON u.id = t."createdById"
      WHERE u."deletedAt" IS NULL
    ),
    cohort_sizes AS (
      SELECT 
        cohort_month,
        COUNT(DISTINCT user_id) as user_count
      FROM user_cohorts
      GROUP BY cohort_month
    ),
    cohort_activity AS (
      SELECT 
        cohort_month,
        task_month,
        EXTRACT(MONTH FROM AGE(task_month, cohort_month)) as months_since_signup,
        COUNT(DISTINCT user_id) as active_users
      FROM user_cohorts
      WHERE task_month IS NOT NULL
      GROUP BY cohort_month, task_month
    )
    SELECT 
      ca.cohort_month,
      cs.user_count as cohort_size,
      ca.months_since_signup,
      ca.active_users,
      ROUND(ca.active_users::numeric / cs.user_count * 100, 2) as retention_rate
    FROM cohort_activity ca
    JOIN cohort_sizes cs ON ca.cohort_month = cs.cohort_month
    ORDER BY ca.cohort_month, ca.months_since_signup
  `;

  return cohortData;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Funnel Analysis
// ─────────────────────────────────────────────────────────────
async function getTaskCompletionFunnel(userId: string) {
  const funnel = await prisma.$queryRaw`
    WITH task_funnel AS (
      SELECT 
        COUNT(*) as total_created,
        COUNT(*) FILTER (WHERE status != 'PENDING') as started,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') as completed,
        COUNT(*) FILTER (WHERE status = 'CANCELLED') as cancelled
      FROM tasks
      WHERE "createdById" = ${userId}
        AND "deletedAt" IS NULL
    )
    SELECT 
      total_created,
      started,
      ROUND(started::numeric / NULLIF(total_created, 0) * 100, 2) as start_rate,
      completed,
      ROUND(completed::numeric / NULLIF(total_created, 0) * 100, 2) as completion_rate,
      cancelled,
      ROUND(cancelled::numeric / NULLIF(total_created, 0) * 100, 2) as cancellation_rate
    FROM task_funnel
  `;

  return funnel;
}
```

---

## 5. MULTI-TENANCY PATTERNS

### 5.1 Row-Level Security (RLS)

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Schema-based Multi-Tenancy
// ─────────────────────────────────────────────────────────────
// In schema.prisma:

model Organization {
  id        String   @id @default(uuid())
  name      String
  tasks     Task[]
  users     User[]
  
  @@map("organizations")
}

model User {
  id             String       @id @default(uuid())
  email          String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  tasks          Task[]
  
  @@index([organizationId])
  @@map("users")
}

model Task {
  id             String       @id @default(uuid())
  title          String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  createdById    String
  createdBy      User         @relation(fields: [createdById], references: [id])
  
  @@index([organizationId, createdById])
  @@map("tasks")
}

// ─────────────────────────────────────────────────────────────
// Pattern: Automatic Organization Filtering
// ─────────────────────────────────────────────────────────────
class MultiTenantService {
  private organizationId: string;

  constructor(organizationId: string) {
    this.organizationId = organizationId;
  }

  // All queries automatically filtered by organization
  async getTasks(filters: any) {
    return prisma.task.findMany({
      where: {
        ...filters,
        organizationId: this.organizationId, // Always filtered
        deletedAt: null,
      },
    });
  }

  async createTask(data: any) {
    return prisma.task.create({
      data: {
        ...data,
        organizationId: this.organizationId, // Always set
      },
    });
  }

  // Cross-organization queries require explicit permission
  async getSharedTasks() {
    return prisma.task.findMany({
      where: {
        organizationId: this.organizationId,
        isShared: true,
        deletedAt: null,
      },
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Pattern: Database-Level RLS (PostgreSQL 10+)
// ─────────────────────────────────────────────────────────────
async function enableRowLevelSecurity() {
  await prisma.$executeRaw`
    -- Enable RLS on tasks table
    ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

    -- Create policy for organization isolation
    CREATE POLICY organization_isolation ON "Task"
      FOR ALL
      USING ("organizationId" = current_setting('app.current_organization')::uuid);

    -- Set organization context in application
    -- SET LOCAL app.current_organization = 'org-uuid-here';
  `;
}

// Usage in middleware
async function setOrganizationContext(organizationId: string) {
  await prisma.$executeRaw`
    SET LOCAL app.current_organization = ${organizationId}
  `;
}
```

---

## 6. AUDIT LOGGING & CHANGE TRACKING

### 6.1 Automatic Audit Trail

```prisma
// schema.prisma

model AuditLog {
  id        String   @id @default(uuid())
  entity    String   // 'Task', 'User', etc.
  entityId  String
  action    String   // 'CREATE', 'UPDATE', 'DELETE'
  userId    String
  changes   Json     // Before/after values
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  
  @@index([entity, entityId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Automatic Audit Logging Middleware
// ─────────────────────────────────────────────────────────────
prisma.$use(async (params, next) => {
  const before = Date.now();
  
  // Execute the query
  const result = await next(params);
  
  const after = Date.now();
  
  // Log write operations
  if (['create', 'update', 'delete'].includes(params.action)) {
    await prisma.auditLog.create({
      data: {
        entity: params.model,
        entityId: result.id || params.args.where?.id,
        action: params.action.toUpperCase(),
        userId: params.args.data?.createdById || 'system', // Get from context
        changes: {
          before: params.args.where || null,
          after: params.args.data || result,
          duration: after - before,
        },
      },
    });
  }
  
  return result;
});

// ─────────────────────────────────────────────────────────────
// Pattern: Get Entity Change History
// ─────────────────────────────────────────────────────────────
async function getEntityAuditHistory(entity: string, entityId: string) {
  const history = await prisma.auditLog.findMany({
    where: {
      entity,
      entityId,
    },
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          email: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  return history;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Compare Versions
// ─────────────────────────────────────────────────────────────
async function getTaskVersionComparison(
  taskId: string,
  fromAuditId: string,
  toAuditId: string
) {
  const [from, to] = await Promise.all([
    prisma.auditLog.findUnique({
      where: { id: fromAuditId },
    }),
    prisma.auditLog.findUnique({
      where: { id: toAuditId },
    }),
  ]);

  // Calculate differences
  const changes = {
    added: [],
    removed: [],
    modified: [],
  };

  const before = from.changes.after as any;
  const after = to.changes.after as any;

  for (const key in after) {
    if (!(key in before)) {
      changes.added.push(key);
    } else if (before[key] !== after[key]) {
      changes.modified.push({
        field: key,
        from: before[key],
        to: after[key],
      });
    }
  }

  for (const key in before) {
    if (!(key in after)) {
      changes.removed.push(key);
    }
  }

  return changes;
}
```

---

## 7. DATABASE PARTITIONING & SHARDING

### 7.1 Time-Based Partitioning

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Manual Partition Creation
// ─────────────────────────────────────────────────────────────
async function createMonthlyPartition(tableName: string, year: number, month: number) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);
  
  const partitionName = `${tableName}_${year}_${month.toString().padStart(2, '0')}`;
  
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "${partitionName}"
    PARTITION OF "${tableName}"
    FOR VALUES FROM ('${startDate.toISOString()}') TO ('${endDate.toISOString()}')
  `);

  // Create indexes on partition
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "${partitionName}_status_idx"
    ON "${partitionName}" (status)
    WHERE "deletedAt" IS NULL
  `);
}

// ─────────────────────────────────────────────────────────────
// Pattern: Automatic Partition Management
// ─────────────────────────────────────────────────────────────
async function ensurePartitionsExist(tableName: string, monthsAhead: number = 3) {
  const now = new Date();
  
  for (let i = 0; i < monthsAhead; i++) {
    const futureDate = new Date(now);
    futureDate.setMonth(futureDate.getMonth() + i);
    
    const year = futureDate.getFullYear();
    const month = futureDate.getMonth() + 1;
    
    await createMonthlyPartition(tableName, year, month);
  }
}

// Run this monthly via cron job
async function monthlyPartitionMaintenance() {
  await ensurePartitionsExist('AuditLog', 6);
  await ensurePartitionsExist('Task', 3);
}
```

---

## 8. REAL-TIME DATA WITH TRIGGERS

### 8.1 Database Triggers for Real-time Updates

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Task Status Change Trigger
// ─────────────────────────────────────────────────────────────
async function createTaskStatusTrigger() {
  await prisma.$executeRaw`
    CREATE OR REPLACE FUNCTION notify_task_status_change()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        PERFORM pg_notify(
          'task_status_changes',
          json_build_object(
            'taskId', NEW.id,
            'oldStatus', OLD.status,
            'newStatus', NEW.status,
            'changedAt', NEW."updatedAt"
          )::text
        );
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS task_status_change_trigger ON "Task";
    
    CREATE TRIGGER task_status_change_trigger
      AFTER UPDATE ON "Task"
      FOR EACH ROW
      EXECUTE FUNCTION notify_task_status_change();
  `;
}

// ─────────────────────────────────────────────────────────────
// Pattern: Listen for Changes (Application Side)
// ─────────────────────────────────────────────────────────────
import { Client } from 'pg';

class RealTimeService {
  private client: Client;

  async connect() {
    this.client = new Client({
      connectionString: process.env.DATABASE_URL,
    });
    
    await this.client.connect();
    
    // Listen for notifications
    await this.client.query('LISTEN task_status_changes');
    
    this.client.on('notification', (msg) => {
      const payload = JSON.parse(msg.payload);
      console.log('Task status changed:', payload);
      
      // Emit via WebSocket, Socket.IO, etc.
      this.emitToSubscribers(payload);
    });
  }

  private emitToSubscribers(payload: any) {
    // Implement WebSocket emission
  }
}
```

---

## 9. ADVANCED ERROR HANDLING

### 9.1 Database Error Classification

```typescript
// ─────────────────────────────────────────────────────────────
// Pattern: Prisma Error Handler
// ─────────────────────────────────────────────────────────────
import { Prisma } from '@prisma/client';

class DatabaseErrorHandler {
  handleError(error: any): never {
    // Prisma known error codes
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': // Unique constraint violation
          throw new ConflictException(
            `Record already exists: ${error.meta?.target}`
          );
        
        case 'P2025': // Record not found
          throw new NotFoundException('Record not found');
        
        case 'P2003': // Foreign key constraint
          throw new BadRequestException(
            `Related record not found: ${error.meta?.field_name}`
          );
        
        case 'P2014': // Relation violation
          throw new BadRequestException('Invalid relation');
        
        case 'P2024': // Connection timeout
          throw new ServiceUnavailableException('Database connection timeout');
        
        default:
          console.error('Unknown Prisma error:', error);
          throw new InternalServerErrorException('Database error');
      }
    }

    // Connection errors
    if (error.code === 'ECONNREFUSED') {
      throw new ServiceUnavailableException('Database unavailable');
    }

    // Generic error
    console.error('Database error:', error);
    throw new InternalServerErrorException('Database operation failed');
  }
}

// Usage
async function safeCreateTask(data: any) {
  try {
    return await prisma.task.create({ data });
  } catch (error) {
    const handler = new DatabaseErrorHandler();
    return handler.handleError(error);
  }
}
```

---

## 10. PRODUCTION DEPLOYMENT CHECKLIST

### 10.1 Pre-Deployment Checklist

```markdown
## Database Schema
- [ ] All models have `@@index` for common queries
- [ ] Soft delete fields (`deletedAt`) added to all models
- [ ] Timestamps (`createdAt`, `updatedAt`) on all models
- [ ] Foreign keys have proper `onDelete` actions
- [ ] Unique constraints for business keys

## Migrations
- [ ] All migrations tested in staging
- [ ] Rollback plan documented
- [ ] Backup created before deployment
- [ ] Migration script reviewed

## Performance
- [ ] Slow query monitoring enabled
- [ ] Connection pool configured
- [ ] Caching strategy implemented
- [ ] Index usage analyzed

## Security
- [ ] SQL injection prevention verified
- [ ] RLS policies enabled (if using)
- [ ] Audit logging configured
- [ ] Database user has minimal privileges

## Monitoring
- [ ] Query performance dashboard setup
- [ ] Alert thresholds configured
- [ ] Error tracking enabled
- [ ] Health check endpoint created
```

### 10.2 Deployment Script

```typescript
// scripts/deploy-database.ts
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function deploy() {
  console.log('🚀 Starting database deployment...');

  try {
    // 1. Create backup
    console.log('📦 Creating backup...');
    execSync('pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > backup.sql');

    // 2. Run migrations
    console.log('🔄 Running migrations...');
    execSync('npx prisma migrate deploy');

    // 3. Seed reference data
    console.log('🌱 Seeding reference data...');
    execSync('npx prisma db seed');

    // 4. Create indexes
    console.log('📊 Creating indexes...');
    await createTaskDashboardIndex();
    await createAuditLogIndexes();

    // 5. Validate deployment
    console.log('✅ Validating deployment...');
    const taskCount = await prisma.task.count();
    console.log(`✓ Task count: ${taskCount}`);

    console.log('🎉 Deployment successful!');

  } catch (error) {
    console.error('❌ Deployment failed:', error);
    console.log('🔄 Rolling back...');
    // execSync('psql -h $DB_HOST -U $DB_USER $DB_NAME < backup.sql');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deploy();
```

---

## 📚 CONTINUING EDUCATION

This is **Volume 2** of the Prisma Mastery series. Continue with:

- **Volume 1**: Foundations & Critical Query Patterns ✅
- **Volume 3**: Microservices & Database Sharding (Coming Soon)
- **Volume 4**: Real-time Queries & Subscriptions (Coming Soon)
- **Volume 5**: Testing & Debugging Database Operations (Coming Soon)

---

**🎯 Key Takeaways from Volume 2:**

1. ✅ Implement multi-layer caching (Redis + In-Memory)
2. ✅ Monitor query performance continuously
3. ✅ Use appropriate indexes for query patterns
4. ✅ Implement materialized views for complex analytics
5. ✅ Enable row-level security for multi-tenancy
6. ✅ Maintain audit trails for all changes
7. ✅ Partition large tables for performance
8. ✅ Use database triggers for real-time updates
9. ✅ Handle database errors gracefully
10. ✅ Follow production deployment checklist

---

**Next Steps:**
- Set up query monitoring in your application
- Implement caching for frequently accessed data
- Review and optimize existing indexes
- Create audit logging for critical entities
- Plan partitioning strategy for growing tables

**Remember**: Performance is not an afterthought. Design for scale from day one, monitor continuously, and optimize based on real usage patterns.
