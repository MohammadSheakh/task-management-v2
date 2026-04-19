# 🔴 Redis Caching Implementation Guide

**Version**: 1.0.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Cache Strategy](#cache-strategy)
3. [Cache Key Patterns](#cache-key-patterns)
4. [Implementation Steps](#implementation-steps)
5. [Cache Operations](#cache-operations)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Redis caching is **critical** for achieving high performance in the Task Management System. This guide covers:

- ✅ Cache-aside pattern implementation
- ✅ Cache key naming conventions
- ✅ TTL strategies
- ✅ Cache invalidation patterns
- ✅ Performance optimization

### Why Cache?

| Operation | Without Cache | With Cache | Improvement |
|-----------|--------------|------------|-------------|
| Get User Tasks | 50-100ms | 5-10ms | **10x faster** |
| Get Unread Count | 50ms | 5ms | **10x faster** |
| Get Activity Feed | 80-150ms | 8-15ms | **10x faster** |

---

## 🏗️ Cache Strategy

### Cache-Aside Pattern (Lazy Loading)

```typescript
async getData(id: string) {
  // Step 1: Try cache first
  const cached = await redisClient.get(`data:${id}`);
  if (cached) {
    return JSON.parse(cached);  // Cache hit (5ms)
  }

  // Step 2: Cache miss - query database (50ms)
  const data = await database.find(id);

  // Step 3: Cache the result
  await redisClient.setEx(`data:${id}`, 300, JSON.stringify(data));

  // Step 4: Return data
  return data;
}
```

**Flow**:
```
Request → Check Cache → Hit? → Return
              ↓
             Miss?
              ↓
         Query Database
              ↓
         Cache Result
              ↓
           Return
```

---

## 🔑 Cache Key Patterns

### Standard Format

```
{module}:{type}:{identifier}:{optional-detail}
```

### Examples by Module

#### Auth Module
```typescript
// Session caching
session:{userId}:{fcmToken}

// Token blacklist
blacklist:{refreshToken}

// OTP storage
otp:verification:{email}
otp:reset-password:{email}
```

#### Task Module
```typescript
// Single task
task:detail:{taskId}

// Task list
task:user:{userId}:list
task:user:{userId}:list:pending

// Task statistics
task:user:{userId}:statistics

// Daily tasks
task:user:{userId}:daily:{date}
```

#### User Module
```typescript
// User profile
user:profile:{userId}

// User settings
user:settings:{userId}
```

#### ChildrenBusinessUser Module
```typescript
// Children list
children:business:{businessUserId}:children

// Children count
children:business:{businessUserId}:count

// Parent info
children:child:{childUserId}:parent
```

#### Notification Module
```typescript
// Unread count
notification:user:{userId}:unread-count

// Notification list
notification:user:{userId}:notifications

// Activity feed
notification:dashboard:activity-feed:{userId}:{limit}
```

---

## 🚀 Implementation Steps

### Step 1: Define Cache Configuration

**File**: `[moduleName].constant.ts`

```typescript
export const [MODULE_NAME]_CACHE_CONFIG = {
  /**
   * Cache TTL for single item (seconds)
   */
  DETAIL_TTL: 300, // 5 minutes

  /**
   * Cache TTL for list (seconds)
   */
  LIST_TTL: 60, // 1 minute

  /**
   * Cache TTL for count (seconds)
   */
  COUNT_TTL: 30, // 30 seconds

  /**
   * Cache key prefix
   */
  PREFIX: '[moduleName]',

  /**
   * Cache invalidation patterns
   */
  INVALIDATION_PATTERNS: {
    USER_LIST: ['[moduleName]:user:*:list'],
    DETAIL: ['[moduleName]:detail:*'],
  },
} as const;
```

---

### Step 2: Create Cache Helper Methods

**File**: `[moduleName].service.ts`

```typescript
export class [ModuleName]Service {
  /**
   * Cache Key Generator
   */
  private getCacheKey(
    type: 'detail' | 'list' | 'count' | 'statistics',
    id?: string,
    userId?: string,
  ): string {
    const prefix = [MODULE_NAME]_CACHE_CONFIG.PREFIX;

    if (type === 'detail' && id) {
      return `${prefix}:detail:${id}`;
    }
    if (type === 'list' && userId) {
      return `${prefix}:user:${userId}:list`;
    }
    if (type === 'count' && userId) {
      return `${prefix}:user:${userId}:count`;
    }
    if (type === 'statistics' && userId) {
      return `${prefix}:user:${userId}:statistics`;
    }
    return `${prefix}:unknown`;
  }

  /**
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cachedData) as T;
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set in Cache
   */
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.debug(`Cached ${key} for ${ttl}s`);
    } catch (error) {
      errorLogger.error('Redis SET error:', error);
    }
  }

  /**
   * Invalidate Cache
   */
  private async invalidateCache(
    userId: string,
    [moduleName]Id?: string,
  ): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('list', undefined, userId),
        this.getCacheKey('count', undefined, userId),
      ];

      if ([moduleName]Id) {
        keysToDelete.push(this.getCacheKey('detail', [moduleName]Id));
        keysToDelete.push(this.getCacheKey('statistics', undefined, userId));
      }

      await redisClient.del(keysToDelete);
      logger.info(`Invalidated ${keysToDelete.length} cache keys`);
    } catch (error) {
      errorLogger.error('Redis DELETE error:', error);
    }
  }
}
```

---

### Step 3: Implement Caching in Service Methods

#### Example: Get with Caching

```typescript
async getTaskById(id: string): Promise<ITask | null> {
  const cacheKey = this.getCacheKey('detail', id);

  // Try cache first (5ms)
  const cached = await this.getFromCache<ITask>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - query database (50ms)
  const task = await this.model.findById(id);

  if (task) {
    // Cache the result (5 minutes TTL)
    await this.setInCache(cacheKey, task, [MODULE_NAME]_CACHE_CONFIG.DETAIL_TTL);
  }

  return task;
}
```

#### Example: List with Caching

```typescript
async getUserTasks(
  userId: Types.ObjectId,
  options: ITaskQueryOptions,
): Promise<ITask[]> {
  const cacheKey = this.getCacheKey('list', undefined, userId.toString());

  // Try cache first (only for first page)
  if (options.page === 1) {
    const cached = await this.getFromCache<ITask[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // Query database
  const tasks = await this.model.find({
    ownerUserId: userId,
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .limit(options.limit || 10);

  // Cache first page only
  if (options.page === 1) {
    await this.setInCache(cacheKey, tasks, [MODULE_NAME]_CACHE_CONFIG.LIST_TTL);
  }

  return tasks;
}
```

#### Example: Create with Cache Invalidation

```typescript
async createTask(
  data: Partial<ITask>,
  userId: Types.ObjectId,
): Promise<ITask> {
  // Create task
  const task = await this.model.create({
    ...data,
    createdById: userId,
  });

  // Invalidate cache
  await this.invalidateCache(userId.toString(), task._id.toString());

  return task;
}
```

#### Example: Update with Cache Invalidation

```typescript
async updateTask(
  id: string,
  userId: string,
  data: Partial<ITask>,
): Promise<ITask | null> {
  const task = await this.model.findByIdAndUpdate(id, data, { new: true });

  if (task) {
    // Invalidate cache
    await this.invalidateCache(userId, id);
  }

  return task;
}
```

---

## 🔁 Cache Operations

### Read Operations

```typescript
// Get single value
const value = await redisClient.get('key');

// Get multiple values
const values = await redisClient.mGet(['key1', 'key2', 'key3']);

// Check if key exists
const exists = await redisClient.exists('key');

// Get TTL
const ttl = await redisClient.ttl('key');
```

### Write Operations

```typescript
// Set with TTL (seconds)
await redisClient.setEx('key', 300, JSON.stringify(data));

// Set without TTL
await redisClient.set('key', JSON.stringify(data));

// Set multiple keys
await redisClient.mSet([
  ['key1', 'value1'],
  ['key2', 'value2'],
]);
```

### Delete Operations

```typescript
// Delete single key
await redisClient.del('key');

// Delete multiple keys
await redisClient.del(['key1', 'key2', 'key3']);

// Delete by pattern
const keys = await redisClient.keys('pattern:*');
if (keys.length > 0) {
  await redisClient.del(keys);
}
```

---

## 🏆 Best Practices

### 1. Use Appropriate TTLs

```typescript
// ✅ GOOD: Different TTLs for different data
const CACHE_CONFIG = {
  DETAIL_TTL: 300,    // 5 minutes - single items
  LIST_TTL: 60,       // 1 minute - lists
  COUNT_TTL: 30,      // 30 seconds - counts
  STATS_TTL: 120,     // 2 minutes - statistics
};

// ❌ BAD: Same TTL for everything
const CACHE_TTL = 300; // For all data
```

### 2. Invalidate on Write

```typescript
// ✅ GOOD: Invalidate after create/update/delete
async createTask(data, userId) {
  const task = await this.model.create(data);
  await this.invalidateCache(userId, task._id);
  return task;
}

// ❌ BAD: No invalidation
async createTask(data, userId) {
  return await this.model.create(data);
}
```

### 3. Cache Only First Page

```typescript
// ✅ GOOD: Cache first page only
async getTasks(userId, options) {
  if (options.page === 1) {
    // Cache
  }
  // Query database
}

// ❌ BAD: Cache all pages
async getTasks(userId, options) {
  // Cache everything
}
```

### 4. Use Pattern-Based Invalidation

```typescript
// ✅ GOOD: Invalidate all related keys
async invalidateCache(userId, taskId) {
  const patterns = [
    `task:detail:${taskId}`,
    `task:user:${userId}:list`,
    `task:user:${userId}:count`,
  ];
  
  for (const pattern of patterns) {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
}
```

### 5. Handle Cache Failures Gracefully

```typescript
// ✅ GOOD: Fallback to database
async getFromCache(key) {
  try {
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    errorLogger.error('Redis error:', error);
    return null; // Fallback to database
  }
}
```

---

## 📊 Common Patterns

### Pattern 1: Cache-Aside (Most Common)

```typescript
async getData(id) {
  const cached = await redisClient.get(`data:${id}`);
  if (cached) return JSON.parse(cached);
  
  const data = await database.find(id);
  await redisClient.setEx(`data:${id}`, 300, JSON.stringify(data));
  return data;
}
```

### Pattern 2: Write-Through

```typescript
async updateData(id, data) {
  // Update database
  const updated = await database.update(id, data);
  
  // Update cache
  await redisClient.setEx(`data:${id}`, 300, JSON.stringify(updated));
  
  return updated;
}
```

### Pattern 3: Cache Invalidation

```typescript
async deleteData(id, userId) {
  // Delete from database
  await database.delete(id);
  
  // Invalidate cache
  await redisClient.del(`data:${id}`);
  await redisClient.del(`user:${userId}:list`);
}
```

### Pattern 4: Bulk Operations

```typescript
async getMultipleData(ids) {
  const cacheKeys = ids.map(id => `data:${id}`);
  
  // Try cache first
  const cached = await redisClient.mGet(cacheKeys);
  
  // Filter out nulls
  const misses = ids.filter((_, i) => !cached[i]);
  
  // Query database for misses
  const dbResults = await database.findByIds(misses);
  
  // Cache misses
  for (const item of dbResults) {
    await redisClient.setEx(`data:${item._id}`, 300, JSON.stringify(item));
  }
  
  return [...cached.filter(Boolean), ...dbResults];
}
```

---

## 🔧 Troubleshooting

### Issue 1: Cache Not Invalidating

**Problem**: Old data still appearing

**Solution**:
```typescript
// Check what keys exist
const keys = await redisClient.keys('task:*');
console.log('Existing keys:', keys);

// Manually invalidate
await redisClient.del('task:detail:taskId123');

// Add logging
logger.info(`Invalidating keys: ${keysToDelete}`);
```

### Issue 2: Cache Miss Rate Too High

**Problem**: Cache hit rate < 50%

**Solution**:
```typescript
// Monitor hit rate
let hits = 0;
let misses = 0;

async getFromCache(key) {
  const cached = await redisClient.get(key);
  if (cached) {
    hits++;
    return JSON.parse(cached);
  }
  misses++;
  logger.info(`Hit rate: ${hits / (hits + misses) * 100}%`);
  return null;
}

// Increase TTL
await redisClient.setEx(key, 600, JSON.stringify(data)); // 10 minutes
```

### Issue 3: Memory Full

**Problem**: Redis out of memory

**Solution**:
```typescript
// Set maxmemory policy
// In redis.conf:
maxmemory 2gb
maxmemory-policy allkeys-lru

// Or delete old keys
const keys = await redisClient.keys('old-pattern:*');
await redisClient.del(keys);
```

---

**Created**: 26-03-23  
**Author**: Senior Engineering Team  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
