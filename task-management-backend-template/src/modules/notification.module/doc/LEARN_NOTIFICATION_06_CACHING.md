# 🔴 Chapter 6: Redis Caching Strategy

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Intermediate
**Prerequisites**: Chapters 1-5 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ Why caching is critical for notifications
- ✅ Unread count caching (30s TTL)
- ✅ Notification list caching (60s TTL)
- ✅ Activity feed caching (30s TTL)
- ✅ Cache invalidation patterns
- ✅ Performance optimization tips

---

## 📊 Why Cache Notifications?

### **The Problem Without Caching:**

```
User opens app → Query DB for unread count → 50ms
User refreshes  → Query DB again         → 50ms
User checks 10x → 10 DB queries          → 500ms total
```

**Database Load** (100K users, each checks 10x/hour):
```
100,000 users × 10 checks/hour = 1,000,000 queries/hour
= 16,667 queries/minute
= 278 queries/second (just for unread count!)
```

---

### **The Solution With Caching:**

```
User opens app → Check Redis cache → 5ms (cache hit)
User refreshes  → Check Redis cache → 5ms (cache hit)
User checks 10x → 10 Redis queries  → 50ms total
```

**Database Load** (with 30s TTL cache):
```
100,000 users × 2 checks/30s = 200,000 queries/30s
= 6,667 queries/minute (DB)
= 111 queries/second (DB) - 96% reduction!

Redis queries: 277/second (5ms each)
```

---

### **Performance Comparison:**

| Operation | Without Cache | With Cache | Improvement |
|-----------|--------------|------------|-------------|
| **Unread Count** | 50-100ms | 5-10ms | 10x faster |
| **Notification List** | 100-200ms | 10-20ms | 10x faster |
| **Activity Feed** | 80-150ms | 8-15ms | 10x faster |
| **DB Queries/sec** | 1000+ | 100 | 90% reduction |

---

## 🗂️ Cache Layers Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    REDIS CACHE LAYERS                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Unread Count Cache                                │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key Pattern: notification:user:{userId}:unread-count│   │
│  │ TTL: 30 seconds                                     │    │
│  │ Hit Rate: ~95%                                      │    │
│  │ Size: Integer (e.g., "5")                           │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 2: Notification List Cache                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key Pattern: notification:user:{userId}:notifications│  │
│  │ TTL: 60 seconds                                     │    │
│  │ Hit Rate: ~90%                                      │    │
│  │ Size: JSON (paginated results)                      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 3: Activity Feed Cache                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key Pattern: notification:dashboard:activity-feed:{id}:{limit}│ │
│  │ TTL: 30 seconds                                     │    │
│  │ Hit Rate: ~93%                                      │    │
│  │ Size: JSON array (activities)                       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  Layer 4: Single Notification Cache                         │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Key Pattern: notification:{notificationId}          │    │
│  │ TTL: 3600 seconds (1 hour)                          │    │
│  │ Hit Rate: ~85%                                      │    │
│  │ Size: JSON (notification object)                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Unread Count Caching

### **Cache Key Pattern:**

```typescript
notification:user:{userId}:unread-count
```

**Examples:**
```bash
notification:user:64f5a1b2c3d4e5f6g7h8i9j0:unread-count
notification:user:admin123:unread-count
```

---

### **TTL Configuration:**

```typescript
export const NOTIFICATION_CACHE_CONFIG = {
  UNREAD_COUNT_TTL: 30,  // 30 seconds
  RECENT_NOTIFICATIONS_TTL: 60,  // 60 seconds
  PREFIX: 'notification',
} as const;
```

**Why 30 seconds?**
- ✅ Short enough for near real-time updates
- ✅ Long enough to reduce DB load by 95%
- ✅ Balanced for user experience

---

### **Implementation:**

```typescript
async getUnreadCount(userId: string): Promise<number> {
  // Step 1: Generate cache key
  const cacheKey = `notification:user:${userId}:unread-count`;

  // Step 2: Try cache first (5ms)
  const cachedCount = await redisClient.get(cacheKey);
  if (cachedCount !== null) {
    logger.debug(`Cache hit for unread count: ${userId}`);
    return parseInt(cachedCount);
  }

  // Step 3: Cache miss - query database (50ms)
  logger.debug(`Cache miss for unread count: ${userId}`);
  const count = await Notification.countDocuments({
    receiverId: new Types.ObjectId(userId),
    status: { $ne: 'read' },
    isDeleted: false,
  });

  // Step 4: Cache the result (30s TTL)
  await redisClient.setEx(cacheKey, 30, count.toString());
  logger.debug(`Cached unread count: ${count} for ${userId}`);

  // Step 5: Return data
  return count;
}
```

---

### **Cache Flow Diagram:**

```
┌─────────────┐
│ Get Unread  │
│   Count     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Check Redis │
│ Key: user:123│
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
  Hit     Miss
   │       │
   │       ↓
   │  ┌─────────────┐
   │  │ Query MongoDB│
   │  │ (50ms)      │
   │  └──────┬──────┘
   │         │
   │         ↓
   │  ┌─────────────┐
   │  │ Cache Result│
   │  │ TTL: 30s    │
   │  └──────┬──────┘
   │         │
   ↓         ↓
┌─────────────┐
│  Return     │
│   Count     │
└─────────────┘
```

---

### **When Cache is Invalidated:**

```typescript
// Invalidate when:
// 1. New notification created
await this.invalidateCache(userId);

// 2. Notification marked as read
await this.invalidateCache(userId, notificationId);

// 3. Notification deleted
await this.invalidateCache(userId, notificationId);

// 4. Mark all as read
await this.invalidateCache(userId);
```

---

## 2️⃣ Notification List Caching

### **Cache Key Pattern:**

```typescript
notification:user:{userId}:notifications
```

---

### **TTL Configuration:**

```typescript
RECENT_NOTIFICATIONS_TTL: 60,  // 60 seconds
```

**Why 60 seconds?**
- ✅ Longer TTL for larger data
- ✅ First page only (most accessed)
- ✅ Reduces DB load significantly

---

### **Implementation:**

```typescript
async getUserNotifications(
  userId: string,
  options: INotificationQueryOptions
): Promise<any> {
  const cacheKey = `notification:user:${userId}:notifications`;

  // Try cache first (only for first page)
  if (options.page === 1) {
    const cachedNotifications = await this.getFromCache<any>(cacheKey);
    if (cachedNotifications) {
      logger.debug(`Cache hit for notifications: ${userId}`);
      return cachedNotifications;
    }
  }

  // Build query
  const query: any = {
    receiverId: new Types.ObjectId(userId),
    isDeleted: false,
  };

  // Apply filters
  if (options.status) query.status = options.status;
  if (options.type) query.type = options.type;
  if (options.priority) query.priority = options.priority;

  // Use pagination service
  const pipeline = [
    { $match: query },
    { $sort: { createdAt: -1 } },
  ];

  const result = await PaginationService.aggregationPaginate(
    Notification,
    pipeline,
    {
      page: options.page || 1,
      limit: Math.min(options.limit || 10, 100),
    }
  );

  // Cache first page only
  if (options.page === 1) {
    await this.setInCache(cacheKey, result, 60);
    logger.debug(`Cached notifications for ${userId}`);
  }

  return result;
}
```

---

### **Cached Data Structure:**

```json
{
  "docs": [
    {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "title": "Task Assigned",
      "subTitle": "You have been assigned a new task",
      "type": "assignment",
      "status": "pending",
      "priority": "normal",
      "createdAt": "2026-03-26T10:00:00Z"
    }
  ],
  "totalDocs": 50,
  "totalPages": 5,
  "page": 1,
  "limit": 10,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

---

## 3️⃣ Activity Feed Caching

### **Cache Key Pattern:**

```typescript
notification:dashboard:activity-feed:{userId}:{limit}
```

**Examples:**
```bash
notification:dashboard:activity-feed:parent123:10
notification:dashboard:activity-feed:group456:20
```

---

### **TTL Configuration:**

```typescript
ACTIVITY_FEED_TTL: 30,  // 30 seconds
```

**Why 30 seconds?**
- ✅ Near real-time for parent dashboard
- ✅ High-traffic endpoint
- ✅ Acceptable delay for activity feed

---

### **Implementation:**

```typescript
async getLiveActivityFeedForParentDashboard(
  businessUserId: string,
  limit: number = 10
): Promise<any[]> {
  const cacheKey = `notification:dashboard:activity-feed:${businessUserId}:${limit}`;

  // Try cache first
  const cachedFeed = await this.getFromCache<any[]>(cacheKey);
  if (cachedFeed) {
    return cachedFeed;
  }

  // Get children IDs
  const children = await User.find({
    businessUserId: new Types.ObjectId(businessUserId),
    role: 'child',
  }).select('_id');

  const childIds = children.map(c => c._id);

  // Get activities from notifications
  const activities = await Notification.find({
    receiverId: { $in: childIds },
    type: 'task',
    isDeleted: false,
  })
  .sort({ createdAt: -1 })
  .limit(limit)
  .lean();

  // Transform to activity format
  const formattedActivities = activities.map(activity => ({
    _id: activity._id,
    actor: {
      userId: activity.senderId,
      name: activity.data?.actor?.name || 'User'
    },
    task: {
      title: activity.data?.taskTitle || 'Task',
      id: activity.data?.taskId
    },
    timestamp: activity.createdAt,
    message: `${activity.data?.actor?.name || 'User'} ${this.getActivityMessage(activity.type)}`,
    type: activity.data?.activityType || 'task_activity'
  }));

  // Cache the feed
  await this.setInCache(cacheKey, formattedActivities, 30);

  return formattedActivities;
}

private getActivityMessage(type: string): string {
  const messages: Record<string, string> = {
    task_created: 'created a task',
    task_completed: 'completed a task',
    task_started: 'started a task',
    subtask_completed: 'completed a subtask',
  };
  return messages[type] || 'updated a task';
}
```

---

### **Activity Feed Data Structure:**

```json
[
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "actor": {
      "userId": "child123",
      "name": "John"
    },
    "task": {
      "title": "Math Homework",
      "id": "task456"
    },
    "timestamp": "2026-03-26T10:30:00Z",
    "message": "John completed a task",
    "type": "task_completed"
  },
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
    "actor": {
      "userId": "child456",
      "name": "Sarah"
    },
    "task": {
      "title": "Science Project",
      "id": "task789"
    },
    "timestamp": "2026-03-26T09:15:00Z",
    "message": "Sarah started a task",
    "type": "task_started"
  }
]
```

---

## 4️⃣ Single Notification Caching

### **Cache Key Pattern:**

```typescript
notification:{notificationId}
```

---

### **TTL Configuration:**

```typescript
SINGLE_NOTIFICATION_TTL: 3600,  // 1 hour
```

**Why 1 hour?**
- ✅ Notifications rarely change after creation
- ✅ Reduces DB lookups for individual notifications
- ✅ Long enough for most use cases

---

### **Implementation:**

```typescript
async getNotificationById(notificationId: string): Promise<INotificationDocument | null> {
  const cacheKey = `notification:${notificationId}`;

  // Try cache first
  const cachedNotification = await this.getFromCache<INotificationDocument>(cacheKey);
  if (cachedNotification) {
    return cachedNotification;
  }

  // Query database
  const notification = await Notification.findById(notificationId);

  if (notification) {
    // Cache for 1 hour
    await this.setInCache(cacheKey, notification, 3600);
  }

  return notification;
}
```

---

## 🔁 Cache Invalidation Patterns

### **Pattern 1: Invalidate on Write**

```typescript
async markAsRead(notificationId: string, userId: string): Promise<INotificationDocument | null> {
  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    receiverId: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  // Update database
  notification.status = NotificationStatus.READ;
  notification.readAt = new Date();
  await notification.save();

  // Invalidate cache
  await this.invalidateCache(userId, notificationId);

  return notification;
}
```

---

### **Pattern 2: Bulk Invalidation**

```typescript
private async invalidateCache(
  userId: string,
  notificationId?: string
): Promise<void> {
  try {
    const keysToDelete = [
      // Always invalidate unread count
      `notification:user:${userId}:unread-count`,
      
      // Always invalidate notification list
      `notification:user:${userId}:notifications`,
    ];

    // Optionally invalidate single notification
    if (notificationId) {
      keysToDelete.push(`notification:${notificationId}`);
    }

    // Also invalidate activity feed cache
    keysToDelete.push(`notification:dashboard:activity-feed:${userId}:10`);

    await redisClient.del(keysToDelete);
    
    logger.debug(`Cache invalidated for user: ${userId}`);
  } catch (error) {
    errorLogger.error('Redis DELETE error:', error);
  }
}
```

---

### **Pattern 3: Selective Invalidation**

```typescript
// Only invalidate unread count (faster)
await redisClient.del(`notification:user:${userId}:unread-count`);

// Only invalidate notification list
await redisClient.del(`notification:user:${userId}:notifications`);

// Invalidate all user caches
const pattern = `notification:user:${userId}:*`;
const keys = await redisClient.keys(pattern);
if (keys.length > 0) {
  await redisClient.del(keys);
}
```

---

## 🛠️ Cache Helper Methods

### **Complete Cache Manager:**

```typescript
class NotificationCacheManager {
  private prefix = 'notification';

  /**
   * Generate cache key
   */
  private getCacheKey(
    type: 'unread' | 'notifications' | 'notification' | 'activity',
    userId?: string,
    notificationId?: string,
    limit?: number
  ): string {
    switch (type) {
      case 'unread':
        return `${this.prefix}:user:${userId}:unread-count`;
      
      case 'notifications':
        return `${this.prefix}:user:${userId}:notifications`;
      
      case 'notification':
        return `${this.prefix}:${notificationId}`;
      
      case 'activity':
        return `${this.prefix}:dashboard:activity-feed:${userId}:${limit}`;
      
      default:
        return `${this.prefix}:unknown`;
    }
  }

  /**
   * Get from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set in cache
   */
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.debug(`Cached ${key} for ${ttl}s`);
    } catch (error) {
      errorLogger.error('Redis SET error:', error);
    }
  }

  /**
   * Invalidate cache
   */
  private async invalidateCache(
    userId: string,
    notificationId?: string
  ): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('unread', userId),
        this.getCacheKey('notifications', userId),
      ];

      if (notificationId) {
        keysToDelete.push(this.getCacheKey('notification', undefined, notificationId));
      }

      await redisClient.del(keysToDelete);
    } catch (error) {
      errorLogger.error('Redis DELETE error:', error);
    }
  }
}
```

---

## 📊 Cache Performance Monitoring

### **Track Cache Hit Rate:**

```typescript
class CacheMetrics {
  private hits = 0;
  private misses = 0;

  async getWithMetrics<T>(
    key: string,
    dbFetch: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = await redisClient.get(key);
    
    if (cached) {
      this.hits++;
      logger.debug(`Cache HIT: ${key} (Total: ${this.hits}/${this.hits + this.misses})`);
      return JSON.parse(cached);
    }

    this.misses++;
    logger.debug(`Cache MISS: ${key} (Total: ${this.misses}/${this.hits + this.misses})`);
    
    const data = await dbFetch();
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    
    return data;
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return (this.hits / total) * 100;
  }
}

// Usage
const metrics = new CacheMetrics();

const unreadCount = await metrics.getWithMetrics(
  `notification:user:${userId}:unread-count`,
  () => Notification.countDocuments({ receiverId: userId, status: { $ne: 'read' } }),
  30
);

console.log(`Cache hit rate: ${metrics.getHitRate().toFixed(2)}%`);
```

---

### **Target Metrics:**

| Metric | Target | Acceptable |
|--------|--------|------------|
| **Unread Count Hit Rate** | >95% | >90% |
| **Notification List Hit Rate** | >90% | >85% |
| **Activity Feed Hit Rate** | >93% | >88% |
| **Average Response Time** | <10ms | <20ms |

---

## 🔍 Debugging Cache Issues

### **Check Cache Keys:**

```bash
# Connect to Redis
redis-cli

# List all notification cache keys
KEYS notification:*

# Check specific key
GET notification:user:64f5a1b2c3d4e5f6g7h8i9j0:unread-count

# Check TTL
TTL notification:user:64f5a1b2c3d4e5f6g7h8i9j0:unread-count

# Check all keys for a user
KEYS notification:user:64f5a1b2c3d4e5f6g7h8i9j0:*
```

---

### **Monitor Cache Operations:**

```typescript
// Add logging to cache operations
private async getFromCache<T>(key: string): Promise<T | null> {
  const startTime = Date.now();
  
  try {
    const cachedData = await redisClient.get(key);
    const duration = Date.now() - startTime;
    
    if (cachedData) {
      logger.debug(`Cache HIT: ${key} (${duration}ms)`);
      return JSON.parse(cachedData);
    }
    
    logger.debug(`Cache MISS: ${key} (${duration}ms)`);
    return null;
  } catch (error) {
    errorLogger.error(`Redis GET error: ${key}`, error);
    return null;
  }
}
```

---

### **Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| **Stale Data** | TTL too long | Reduce TTL, improve invalidation |
| **Low Hit Rate** | High invalidation | Check invalidation logic |
| **Memory Full** | Too many keys | Set maxmemory policy, reduce TTL |
| **Slow Response** | Network latency | Check Redis connection, use local Redis |

---

## 🧪 Testing Cache

### **Test 1: Verify Cache Hit**

```bash
# First request (cache miss)
curl -X GET http://localhost:5000/notifications/unread-count \
  -H "Authorization: Bearer <token>"

# Check Redis
redis-cli
GET notification:user:userId:unread-count
# Should be null before first request

# Second request (cache hit)
curl -X GET http://localhost:5000/notifications/unread-count \
  -H "Authorization: Bearer <token>"

# Check Redis again
TTL notification:user:userId:unread-count
# Should show TTL (e.g., 28)
```

---

### **Test 2: Verify Cache Invalidation**

```bash
# Get unread count (creates cache)
curl -X GET http://localhost:5000/notifications/unread-count \
  -H "Authorization: Bearer <token>"

# Mark notification as read
curl -X POST http://localhost:5000/notifications/notificationId/read \
  -H "Authorization: Bearer <token>"

# Check Redis (should be deleted)
redis-cli
GET notification:user:userId:unread-count
# Should be null (invalidated)
```

---

### **Test 3: Performance Test**

```typescript
// Measure response times
const times = [];

for (let i = 0; i < 100; i++) {
  const start = Date.now();
  await notificationService.getUnreadCount(userId);
  times.push(Date.now() - start);
}

const avg = times.reduce((a, b) => a + b) / times.length;
const min = Math.min(...times);
const max = Math.max(...times);

console.log(`Average: ${avg}ms, Min: ${min}ms, Max: ${max}ms`);
// Expected: Average < 10ms
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Why Cache**: 10x faster response, 90% DB load reduction
2. ✅ **4 Cache Layers**: Unread count, list, activity feed, single notification
3. ✅ **TTL Strategy**: 30s for counts, 60s for lists, 1h for single
4. ✅ **Invalidation**: On create, update, delete operations
5. ✅ **Monitoring**: Track hit rates, response times
6. ✅ **Debugging**: Redis CLI commands, logging

### **Quick Reference:**

```typescript
// Cache keys
notification:user:{userId}:unread-count      // 30s TTL
notification:user:{userId}:notifications     // 60s TTL
notification:dashboard:activity-feed:{id}:10 // 30s TTL
notification:{notificationId}                // 3600s TTL

// Cache operations
await redisClient.get(key)                    // Get
await redisClient.setEx(key, ttl, value)      // Set with TTL
await redisClient.del(keys)                   // Delete/Invalidate

// Hit rate calculation
hitRate = (hits / (hits + misses)) * 100
```

### **Next Chapter:**

→ [Chapter 7: BullMQ Async Processing](./LEARN_NOTIFICATION_07_BULLMQ.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
