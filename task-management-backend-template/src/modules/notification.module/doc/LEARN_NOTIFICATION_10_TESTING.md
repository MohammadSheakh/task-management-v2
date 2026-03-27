# 🧪 Chapter 10: Testing & Debugging

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Advanced
**Prerequisites**: Chapters 1-9 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will be able to:
- ✅ Manual testing checklist
- ✅ API testing with curl
- ✅ Redis debugging (keys, TTLs)
- ✅ MongoDB debugging (queries, indexes)
- ✅ BullMQ monitoring (queue depth, jobs)
- ✅ Common issues and solutions
- ✅ Performance monitoring

---

## 📊 Testing Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 NOTIFICATION TESTING                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📋 Manual Testing                                           │
│     • API endpoint testing                                  │
│     • User flow testing                                     │
│     • Integration testing                                   │
│                                                              │
│  🔧 Redis Debugging                                          │
│     • Cache key inspection                                  │
│     • TTL verification                                      │
│     • Cache invalidation testing                            │
│                                                              │
│  📦 MongoDB Debugging                                        │
│     • Query testing                                         │
│     • Index verification                                    │
│     • Performance profiling                                 │
│                                                              │
│  🟡 BullMQ Monitoring                                        │
│     • Queue depth monitoring                                │
│     • Job status tracking                                   │
│     • Worker health checks                                  │
│                                                              │
│  📈 Performance Monitoring                                   │
│     • Response time tracking                                │
│     • Cache hit rate                                        │
│     • Error rate monitoring                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Manual Testing Checklist

### **Notification Creation:**

```
☐ Create single notification
☐ Create bulk notification (10 users)
☐ Create bulk notification (1000 users - limit test)
☐ Create scheduled notification
☐ Create task assignment notification
☐ Create deadline notification
☐ Create system notification
☐ Create notification with i18n
```

---

### **Notification Retrieval:**

```
☐ Get my notifications (page 1)
☐ Get my notifications (page 2, pagination)
☐ Get unread count
☐ Filter by status (unread, read)
☐ Filter by type (task, group, system)
☐ Filter by priority (low, normal, high, urgent)
☐ Sort by date (newest, oldest)
☐ Sort by priority
```

---

### **Notification Management:**

```
☐ Mark single notification as read
☐ Mark all notifications as read
☐ Delete single notification
☐ Verify soft delete (isDeleted = true)
☐ Verify cache invalidation
```

---

### **Task Reminders:**

```
☐ Create one-time reminder
☐ Create recurring reminder (daily)
☐ Create recurring reminder (weekly)
☐ Get reminders for task
☐ Get my reminders
☐ Cancel single reminder
☐ Cancel all reminders for task
☐ Verify BullMQ job scheduling
```

---

### **Activity Feed:**

```
☐ Get group activity feed
☐ Get parent dashboard feed
☐ Verify real-time updates (Socket.IO)
☐ Verify cache TTL (30s)
☐ Verify activity message generation
☐ Test all 10 activity types
```

---

### **Real-Time Features:**

```
☐ Socket.IO connection established
☐ Real-time notification delivery
☐ Real-time activity feed updates
☐ Fallback to push when offline
☐ Reconnection after disconnect
```

---

## 🔧 API Testing with curl

### **Test 1: Create Notification**

```bash
# Create single notification
curl -X POST "http://localhost:5000/notifications" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "receiverId": "user123",
    "title": "Test Notification",
    "subTitle": "This is a test",
    "type": "system",
    "priority": "normal",
    "channels": ["in_app"]
  }'

# Expected: 201 Created with notification object
```

---

### **Test 2: Get My Notifications**

```bash
# Get first page
curl -X GET "http://localhost:5000/notifications/my?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with paginated notifications

# Get unread only
curl -X GET "http://localhost:5000/notifications/my?status=unread" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with unread notifications
```

---

### **Test 3: Get Unread Count**

```bash
curl -X GET "http://localhost:5000/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with {"data": {"count": 5}}
```

---

### **Test 4: Mark as Read**

```bash
curl -X POST "http://localhost:5000/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with updated notification
```

---

### **Test 5: Mark All as Read**

```bash
curl -X POST "http://localhost:5000/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with {"data": {"count": 15}}
```

---

### **Test 6: Delete Notification**

```bash
curl -X DELETE "http://localhost:5000/notifications/$NOTIF_ID" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with deleted notification
```

---

### **Test 7: Create Task Reminder**

```bash
curl -X POST "http://localhost:5000/task-reminders/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "task123",
    "reminderTime": "2026-03-27T14:00:00Z",
    "reminderType": "before_deadline",
    "message": "Task due in 24 hours!"
  }'

# Expected: 201 Created with reminder object
```

---

### **Test 8: Get Task Reminders**

```bash
# Get reminders for task
curl -X GET "http://localhost:5000/task-reminders/task/task123" \
  -H "Authorization: Bearer $TOKEN"

# Get my reminders
curl -X GET "http://localhost:5000/task-reminders/my" \
  -H "Authorization: Bearer $TOKEN"
```

---

### **Test 9: Cancel Reminder**

```bash
curl -X DELETE "http://localhost:5000/task-reminders/$REMINDER_ID" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with cancelled reminder
```

---

### **Test 10: Get Activity Feed**

```bash
# Get group activity feed
curl -X GET "http://localhost:5000/notifications/activity-feed/group123?limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Get parent dashboard feed
curl -X GET "http://localhost:5000/notifications/dashboard/activity-feed?limit=10" \
  -H "Authorization: Bearer $BUSINESS_TOKEN"
```

---

### **Test 11: Send Bulk Notification (Admin)**

```bash
curl -X POST "http://localhost:5000/notifications/bulk" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2", "user3"],
    "title": "System Update",
    "subTitle": "New features available",
    "type": "system",
    "priority": "high",
    "channels": ["in_app", "email"]
  }'

# Expected: 200 OK with list of created notifications
```

---

## 🔴 Redis Debugging

### **Connect to Redis:**

```bash
# CLI
redis-cli

# With authentication
redis-cli -a your_redis_password

# Remote connection
redis-cli -h redis_host -p 6379
```

---

### **Check Cache Keys:**

```bash
# List all notification cache keys
KEYS notification:*

# List keys for specific user
KEYS notification:user:user123:*

# List all activity feed caches
KEYS notification:dashboard:activity-feed:*
```

---

### **Check Unread Count Cache:**

```bash
# Get cached value
GET notification:user:user123:unread-count

# Check TTL
TTL notification:user:user123:unread-count

# Expected: Integer value (e.g., "5") with TTL < 30
```

---

### **Check Notification List Cache:**

```bash
# Get cached list
GET notification:user:user123:notifications

# Check TTL
TTL notification:user:user123:notifications

# Expected: JSON array with TTL < 60
```

---

### **Check Activity Feed Cache:**

```bash
# Get cached feed
GET notification:dashboard:activity-feed:businessUserId:10

# Check TTL
TTL notification:dashboard:activity-feed:businessUserId:10

# Expected: JSON array with TTL < 30
```

---

### **Manual Cache Invalidation:**

```bash
# Delete specific cache
DEL notification:user:user123:unread-count

# Delete all user caches
DEL notification:user:user123:unread-count
DEL notification:user:user123:notifications

# Delete using pattern (via script)
redis-cli --eval "local keys = redis.call('KEYS', 'notification:user:user123:*') if #keys > 0 then redis.call('DEL', unpack(keys)) end"
```

---

### **Monitor Redis Memory:**

```bash
# Check memory usage
INFO memory

# Check key count
DBSIZE

# Check slow log
SLOWLOG GET 10
```

---

### **Redis Performance Testing:**

```bash
# Benchmark Redis
redis-benchmark -q -n 1000

# Test GET performance
redis-benchmark -q -n 1000 get notification:user:user123:unread-count

# Expected: >50,000 requests per second
```

---

## 📦 MongoDB Debugging

### **Connect to MongoDB:**

```bash
# MongoDB Shell
mongosh

# With connection string
mongosh "mongodb://localhost:27017/task_management"
```

---

### **Query Notifications:**

```javascript
// Find user notifications
db.notifications.find({
  receiverId: ObjectId("user123")
}).sort({ createdAt: -1 }).limit(10)

// Count unread
db.notifications.countDocuments({
  receiverId: ObjectId("user123"),
  status: { $ne: 'read' }
})

// Find by type
db.notifications.find({
  receiverId: ObjectId("user123"),
  type: 'task'
})

// Find deleted
db.notifications.find({
  isDeleted: true
}).sort({ deletedAt: -1 }).limit(10)
```

---

### **Query Task Reminders:**

```javascript
// Find reminders for task
db.taskreminders.find({
  taskId: ObjectId("task123")
}).sort({ reminderTime: -1 })

// Find pending reminders
db.taskreminders.find({
  userId: ObjectId("user123"),
  status: 'pending'
})

// Find by trigger type
db.taskreminders.find({
  triggerType: 'before_deadline'
})
```

---

### **Check Indexes:**

```javascript
// List all indexes on notifications
db.notifications.getIndexes()

// Expected indexes:
// - { receiverId: 1, createdAt: -1 }
// - { receiverId: 1, status: 1 }
// - { scheduledFor: 1, status: 1 }

// List indexes on task reminders
db.taskreminders.getIndexes()

// Expected indexes:
// - { taskId: 1, reminderTime: -1 }
// - { userId: 1, reminderTime: -1 }
// - { reminderTime: 1, status: 1 }
```

---

### **Create Missing Index:**

```javascript
// Create compound index
db.notifications.createIndex(
  { receiverId: 1, status: 1, isDeleted: 1 },
  { name: 'unread_count_index' }
)

// Create text index
db.notifications.createIndex(
  { 'title.en': 'text', 'subTitle.en': 'text' },
  { name: 'text_search_index' }
)
```

---

### **Explain Query Performance:**

```javascript
// Analyze query execution
db.notifications.find({
  receiverId: ObjectId("user123"),
  status: { $ne: 'read' }
}).explain('executionStats')

// Check executionStats:
// - totalDocsExamined (should be low with index)
// - executionTimeMillis (should be < 10ms)
// - indexName (should use proper index)
```

---

### **Aggregate for Activity Feed:**

```javascript
// Test activity feed query
db.notifications.aggregate([
  {
    $match: {
      'data.groupId': 'group123',
      'data.activityType': {
        $in: ['task_created', 'task_completed', 'subtask_completed']
      },
      isDeleted: false
    }
  },
  { $sort: { createdAt: -1 } },
  { $limit: 10 }
]).explain('executionStats')
```

---

## 🟡 BullMQ Monitoring

### **Check Queue Status:**

```typescript
// In Node.js application
const { notificationQueue } = require('./helpers/bullmq/bullmq');

// Get job counts
const jobCounts = await notificationQueue.getJobCounts();
console.log('Job counts:', jobCounts);
// { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 3 }

// Get specific counts
const waitingCount = await notificationQueue.getWaitingCount();
const activeCount = await notificationQueue.getActiveCount();
const completedCount = await notificationQueue.getCompletedCount();
const failedCount = await notificationQueue.getFailedCount();
const delayedCount = await notificationQueue.getDelayedCount();
```

---

### **Get Jobs by State:**

```typescript
// Get waiting jobs
const waitingJobs = await notificationQueue.getWaiting(0, 10);
console.log('Waiting jobs:', waitingJobs.map(j => ({ id: j.id, data: j.data })));

// Get active jobs
const activeJobs = await notificationQueue.getActive(0, 10);
console.log('Active jobs:', activeJobs.map(j => ({ id: j.id, data: j.data })));

// Get completed jobs
const completedJobs = await notificationQueue.getCompleted(0, 10);
console.log('Completed jobs:', completedJobs.length);

// Get failed jobs
const failedJobs = await notificationQueue.getFailed(0, 10);
console.log('Failed jobs:', failedJobs.map(j => ({ id: j.id, failedReason: j.failedReason })));

// Get delayed jobs
const delayedJobs = await notificationQueue.getDelayed(0, 10);
console.log('Delayed jobs:', delayedJobs.map(j => ({ id: j.id, delay: j.delay })));
```

---

### **Get Specific Job:**

```typescript
// Get job by ID
const job = await notificationQueue.getJob('job123');

if (job) {
  console.log('Job state:', await job.getState());
  console.log('Job data:', job.data);
  console.log('Attempts:', job.attemptsMade);
  console.log('Failed reason:', job.failedReason);
  console.log('Finished on:', job.finishedOn);
  console.log('Processed on:', job.processedOn);
}
```

---

### **Retry Failed Job:**

```typescript
// Get failed job
const failedJob = await notificationQueue.getJob('failedJob123');

if (failedJob) {
  // Retry the job
  await failedJob.retry();
  console.log('Job retried successfully');
  
  // Check new state
  const newState = await failedJob.getState();
  console.log('New state:', newState);  // 'waiting'
}
```

---

### **Remove Jobs:**

```typescript
// Remove completed jobs older than 1 hour
const removed = await notificationQueue.clean(
  3600000,  // 1 hour in milliseconds
  'completed'
);
console.log(`Removed ${removed.length} completed jobs`);

// Remove all failed jobs
await notificationQueue.clean(0, 'failed');

// Remove specific job
const job = await notificationQueue.getJob('job123');
if (job) {
  await job.remove();
  console.log('Job removed');
}
```

---

### **Monitor Worker Health:**

```typescript
const { Worker } = require('bullmq');

// Create worker with monitoring
const worker = new Worker('notificationQueue-e-learning', processor, {
  connection: redisOptions,
  concurrency: 10,
});

// Monitor events
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed in ${job.processedOn - job.timestamp}ms`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed: ${err.message}`);
});

worker.on('error', (err) => {
  console.error('Worker error:', err);
});

worker.on('drained', () => {
  console.log('Queue drained - all jobs processed');
});

// Check worker status
console.log('Worker is running:', worker.isRunning());
```

---

### **BullMQ Dashboard (Optional):**

```typescript
// Install bull-board for web UI
npm install bull-board

// Add to application
const { createBullBoard } = require('bull-board');
const { BullMQAdapter } = require('bull-board/bullMQAdapter');

const { serverAdapter } = createBullBoard({
  queues: [new BullMQAdapter(notificationQueue)],
  serverAdapter: new ExpressAdapter(),
});

app.use('/admin/queues', serverAdapter.getRouter());

// Access at: http://localhost:5000/admin/queues
```

---

## 📈 Performance Monitoring

### **Response Time Tracking:**

```typescript
// Add middleware to track API response times
app.use('/notifications', (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    
    // Track metrics
    if (duration > 200) {
      logger.warn(`Slow response: ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

// Target response times:
// GET /notifications/my: <100ms (cached), <200ms (DB)
// GET /notifications/unread-count: <10ms (cached)
// POST /notifications/:id/read: <50ms
// DELETE /notifications/:id: <50ms
```

---

### **Cache Hit Rate Monitoring:**

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
      return JSON.parse(cached);
    }
    
    this.misses++;
    const data = await dbFetch();
    await redisClient.setEx(key, ttl, JSON.stringify(data));
    return data;
  }
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    if (total === 0) return 0;
    return (this.hits / total) * 100;
  }
  
  getMetrics() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate().toFixed(2) + '%',
    };
  }
}

// Usage
const metrics = new CacheMetrics();
setInterval(() => {
  logger.info('Cache metrics:', metrics.getMetrics());
}, 60000);  // Log every minute
```

---

### **Error Rate Monitoring:**

```typescript
class ErrorMetrics {
  private errors: Map<string, number> = new Map();
  
  trackError(endpoint: string, error: Error) {
    const count = this.errors.get(endpoint) || 0;
    this.errors.set(endpoint, count + 1);
    
    logger.error(`Error in ${endpoint}:`, error);
  }
  
  getErrorRates() {
    const result: Record<string, number> = {};
    this.errors.forEach((count, endpoint) => {
      result[endpoint] = count;
    });
    return result;
  }
}

// Usage
const errorMetrics = new ErrorMetrics();

app.use('/notifications', (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      errorMetrics.trackError(req.path, new Error(`HTTP ${res.statusCode}`));
    }
  });
  next();
});
```

---

## 🔍 Common Issues & Solutions

### **Issue 1: Notifications Not Appearing**

**Symptoms**: User reports no notifications showing

**Debug Steps**:
```bash
# 1. Check MongoDB
mongosh
db.notifications.find({ receiverId: ObjectId("user123") }).count()

# 2. Check Redis cache
redis-cli
GET notification:user:user123:notifications

# 3. Check API response
curl -X GET "http://localhost:5000/notifications/my" -H "Authorization: Bearer $TOKEN"

# 4. Check logs
tail -f logs/app.log | grep "notification"
```

**Solution**:
```typescript
// Clear cache and retry
await redisClient.del('notification:user:user123:notifications');
```

---

### **Issue 2: Unread Count Not Updating**

**Symptoms**: Badge count stuck

**Debug Steps**:
```bash
# Check actual count in DB
mongosh
db.notifications.countDocuments({
  receiverId: ObjectId("user123"),
  status: { $ne: 'read' }
})

# Check cached count
redis-cli
GET notification:user:user123:unread-count
TTL notification:user:user123:unread-count
```

**Solution**:
```typescript
// Invalidate cache
await redisClient.del('notification:user:user123:unread-count');

// Or wait for TTL to expire (30s)
```

---

### **Issue 3: Reminders Not Triggering**

**Symptoms**: Reminder time passed but no notification

**Debug Steps**:
```bash
# Check reminder status
mongosh
db.taskreminders.find({
  _id: ObjectId("reminder123")
})

# Check BullMQ queue
const jobs = await taskRemindersQueue.getJobs(['delayed', 'waiting']);
console.log('Pending jobs:', jobs.length);

# Check worker status
console.log('Worker running:', worker.isRunning());
```

**Solution**:
```typescript
// Restart worker
await worker.close();
startTaskRemindersWorker();

// Or manually retry job
const job = await taskRemindersQueue.getJob('job123');
if (job) await job.retry();
```

---

### **Issue 4: Real-Time Updates Not Working**

**Symptoms**: Socket.IO not emitting

**Debug Steps**:
```bash
# Check Socket.IO connection
curl -X GET "http://localhost:5000/socket.io/?EIO=4&transport=polling"

# Check logs
tail -f logs/app.log | grep "socket"

# Check if user is online
redis-cli
SMEMBERS socket:users:online
```

**Solution**:
```typescript
// Reconnect Socket.IO
socketService.reconnect();

// Or restart Socket.IO server
socketService.restart();
```

---

### **Issue 5: High Memory Usage**

**Symptoms**: Redis/MongoDB memory full

**Debug Steps**:
```bash
# Check Redis memory
redis-cli
INFO memory

# Check MongoDB size
mongosh
db.stats()

# Check queue depth
const counts = await notificationQueue.getJobCounts();
console.log(counts);
```

**Solution**:
```typescript
// Clean old Redis keys
const keys = await redisClient.keys('notification:user:*:notifications');
if (keys.length > 1000) {
  await redisClient.del(keys.slice(0, 500));
}

// Clean old BullMQ jobs
await notificationQueue.clean(3600000, 'completed');

// Run MongoDB cleanup
await notificationService.cleanupOldNotifications();
```

---

### **Issue 6: Slow API Response**

**Symptoms**: API taking >500ms

**Debug Steps**:
```bash
# Check query performance
mongosh
db.notifications.find({ receiverId: ObjectId("user123") }).explain('executionStats')

# Check Redis latency
redis-cli
LATENCY DOCTOR

# Check BullMQ queue depth
const counts = await notificationQueue.getJobCounts();
```

**Solution**:
```typescript
// Add missing index
db.notifications.createIndex({ receiverId: 1, createdAt: -1 });

// Increase cache TTL
await redisClient.setEx(key, 120, JSON.stringify(data));  // 120s instead of 60s

// Reduce pagination limit
limit: Math.min(options.limit || 10, 50);  // Max 50 instead of 100
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Manual Testing**: Complete checklist for all features
2. ✅ **API Testing**: 11 curl commands for all endpoints
3. ✅ **Redis Debugging**: Keys, TTLs, cache invalidation
4. ✅ **MongoDB Debugging**: Queries, indexes, explain
5. ✅ **BullMQ Monitoring**: Queue depth, job status, workers
6. ✅ **Performance Monitoring**: Response times, cache hit rate
7. ✅ **Common Issues**: 6 issues with solutions

### **Quick Reference:**

```bash
# Redis commands
KEYS notification:*                    # List all keys
GET notification:user:id:unread-count  # Get cached count
TTL notification:user:id:unread-count  # Check TTL
DEL notification:user:id:*             # Invalidate cache

# MongoDB commands
db.notifications.find({ receiverId: ObjectId("id") })
db.notifications.countDocuments({ status: { $ne: 'read' } })
db.notifications.getIndexes()

# BullMQ commands
await queue.getJobCounts()
await queue.getJobs(['waiting', 'active'])
await queue.clean(3600000, 'completed')
```

---

## 🎓 Final Assessment

### **Test Your Knowledge:**

1. How do you check unread count cache in Redis?
2. What command lists all BullMQ waiting jobs?
3. How do you create a compound index in MongoDB?
4. What is the target response time for GET /notifications/unread-count?
5. How do you retry a failed BullMQ job?

**Answers**:
1. `GET notification:user:userId:unread-count`
2. `await queue.getWaiting(0, 10)`
3. `db.collection.createIndex({ field1: 1, field2: 1 })`
4. <10ms (cached)
5. `await job.retry()`

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide - Complete Learning Series

---

🎉 **Congratulations! You've completed the entire Notification Module Learning Guide!**

Continue to [LEARN_NOTIFICATION_README.md](./LEARN_NOTIFICATION_README.md) for next steps and certification.
