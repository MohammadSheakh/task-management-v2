# Database Optimization Guide - MongoDB Mastery

**Version:** 1.0  
**Date:** 30-03-26  
**Level:** Senior Engineering / Database Architecture  
**Prerequisites:** SCALABILITY_COMPARISON.md, REDIS_CACHING_DEEP_DIVE.md

---

## Table of Contents

1. [The Database Scaling Problem](#the-database-scaling-problem)
2. [MongoDB Architecture Fundamentals](#mongodb-architecture-fundamentals)
3. [Indexing Strategies for 100K+ Users](#indexing-strategies-for-100k-users)
4. [Query Optimization Techniques](#query-optimization-techniques)
5. [Schema Design for Scale](#schema-design-for-scale)
6. [Connection Pooling Mastery](#connection-pooling-mastery)
7. [Read/Write Separation](#readwrite-separation)
8. [Aggregation Pipeline Optimization](#aggregation-pipeline-optimization)
9. [Performance Monitoring](#performance-monitoring)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)

---

## The Database Scaling Problem

### Why Databases Fail at Scale

```
Scenario: Task Management System Growth

Month 1 (Startup):
├── Users: 1,000
├── Tasks: 10,000
├── Notifications: 100,000
├── Query time: 50ms
└── Performance: ✅ Fast

Month 6 (Growth):
├── Users: 10,000
├── Tasks: 500,000
├── Notifications: 5,000,000
├── Query time: 500ms
└── Performance: ⚠️ Slowing down

Year 1 (Scale):
├── Users: 100,000
├── Tasks: 10,000,000
├── Notifications: 100,000,000
├── Query time: 5000ms (5 seconds!)
└── Performance: ❌ System failure
```

**Root Cause Analysis:**

```
Query Performance Degradation:

Without Indexes:
├── 10K documents → Scan 10K → 50ms
├── 1M documents → Scan 1M → 500ms
├── 10M documents → Scan 10M → 5000ms
└── Linear degradation O(N) ❌

With Indexes:
├── 10K documents → Index lookup → 5ms
├── 1M documents → Index lookup → 5ms
├── 10M documents → Index lookup → 5ms
└── Constant time O(log N) ✅
```

### The 1K vs 100K Database Load

```
Old Architecture (1K Users):

User Actions per Day:
├── Login: 1,000 users × 2 times = 2,000 queries
├── Check notifications: 1,000 × 10 times = 10,000 queries
├── View tasks: 1,000 × 20 times = 20,000 queries
├── Create tasks: 1,000 × 5 times = 5,000 writes
└── Total: 37,000 operations/day = 0.43 ops/second

Database Load:
├── Average query time: 50ms (no indexes)
├── Connections needed: 10
├── CPU usage: 20%
└── Result: Works fine ✅

---

New Architecture (100K Users):

User Actions per Day:
├── Login: 100,000 × 2 = 200,000 queries
├── Check notifications: 100,000 × 10 = 1,000,000 queries
├── View tasks: 100,000 × 20 = 2,000,000 queries
├── Create tasks: 100,000 × 5 = 500,000 writes
└── Total: 3,700,000 operations/day = 43 ops/second

Without Optimization:
├── Average query time: 500ms (COLLSCAN)
├── Connections needed: 1000 (exhausted!)
├── CPU usage: 100% (saturated)
└── Result: System crash 💥

With Optimization:
├── Average query time: 5ms (IXSCAN)
├── Cache hit rate: 95% (Redis)
├── Effective ops: 43 × 0.05 = 2.15 ops/second
├── Connections needed: 50 (pooled)
├── CPU usage: 40%
└── Result: Smooth scaling ✅
```

---

## MongoDB Architecture Fundamentals

### Storage Engine Internals

```
MongoDB WiredTiger Storage Engine:

┌─────────────────────────────────────────────────────────┐
│  Document Structure                                     │
└─────────────────────────────────────────────────────────┘

{
  _id: ObjectId("507f1f77bcf86cd799439011"),  // 12 bytes
  title: "Complete project",                   // Variable
  status: "pending",                           // Variable
  userId: ObjectId("..."),                     // 12 bytes
  createdAt: ISODate("2026-03-30"),           // 8 bytes
  updatedAt: ISODate("2026-03-30"),           // 8 bytes
  __v: 0                                       // 4 bytes
}

Average document size: ~200 bytes

┌─────────────────────────────────────────────────────────┐
│  Index Structure (B-Tree)                               │
└─────────────────────────────────────────────────────────┘

                    Root Node
                   /    |    \
                  /     |     \
            Internal  Internal  Internal
               / \      / \      / \
              /   \    /   \    /   \
          Leaf  Leaf Leaf Leaf Leaf Leaf
           |     |    |    |    |    |
        Doc1  Doc2  Doc3 Doc4 Doc5 Doc6

Index traversal: O(log N)
With 10M documents: log₂(10,000,000) ≈ 24 comparisons
```

### Query Execution Pipeline

```
Query: db.tasks.find({ userId: "123", status: "pending" })

Without Index (COLLSCAN):
┌─────────────────────────────────────────────────────────┐
│  1. Full Collection Scan                                │
│     → Read every document (10M documents)               │
│     → Time: 5000ms                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  2. Filter Documents                                    │
│     → Check userId == "123"                             │
│     → Check status == "pending"                         │
│     → Match: 50 documents                               │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  3. Return Results                                      │
│     → 50 documents                                      │
│     → Total time: 5000ms ❌                             │
└─────────────────────────────────────────────────────────┘

With Index (IXSCAN):
┌─────────────────────────────────────────────────────────┐
│  1. Index Scan (Compound Index)                         │
│     → Traverse B-tree (24 comparisons)                  │
│     → Time: 5ms                                         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  2. Fetch Documents                                     │
│     → Retrieve 50 matching documents                    │
│     → Time: 10ms                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│  3. Return Results                                      │
│     → 50 documents                                      │
│     → Total time: 15ms ✅ (333x faster!)                │
└─────────────────────────────────────────────────────────┘
```

---

## Indexing Strategies for 100K+ Users

### Index Types

```typescript
// 1. Single Field Index
notificationSchema.index({ receiverId: 1 });
// Use case: Simple lookups by one field

// 2. Compound Index (MOST IMPORTANT)
notificationSchema.index({ 
  receiverId: 1, 
  type: 1, 
  createdAt: -1 
});
// Use case: Multi-field queries with sorting

// 3. Partial Index (Filter documents)
notificationSchema.index(
  { receiverId: 1, createdAt: -1 },
  { 
    partialFilterExpression: { 
      isDeleted: false,
      status: 'unread'
    } 
  }
);
// Use case: Index only active documents (saves 60% space)

// 4. TTL Index (Auto-expire)
notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);
// Use case: Auto-cleanup old notifications

// 5. Text Index (Full-text search)
notificationSchema.index({ 
  title: 'text', 
  subTitle: 'text' 
});
// Use case: Search notifications by text

// 6. Unique Index (Constraint)
userSchema.index({ email: 1 }, { unique: true });
// Use case: Enforce uniqueness
```

### Compound Index Design

```typescript
/**
 * Compound Index Ordering Rules
 * 
 * Rule 1: Equality fields first
 * Rule 2: Range fields second
 * Rule 3: Sort fields last
 * Rule 4: Consider cardinality
 */

// Example Query:
db.notifications.find({
  receiverId: "user123",      // Equality
  type: "payment",             // Equality
  status: { $in: ["unread", "pending"] },  // Range
  createdAt: { $gte: date }    // Range + Sort
}).sort({ createdAt: -1 });

// ✅ OPTIMAL Index:
notificationSchema.index({
  receiverId: 1,    // Equality (high cardinality)
  type: 1,          // Equality (medium cardinality)
  status: 1,        // Equality (low cardinality)
  createdAt: -1,    // Sort (matches query sort)
});

// Index Selectivity (better selectivity = better performance):
// receiverId: 100,000 unique values (excellent)
// type: 10 unique values (good)
// status: 5 unique values (fair)
// createdAt: 10M unique values (excellent for range)
```

### Index Strategy for Notification Module

```typescript
import { Schema } from 'mongoose';

const notificationSchema = new Schema({
  receiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  senderId: { type: Schema.Types.ObjectId, ref: 'User' },
  receiverRole: String,
  title: String,
  subTitle: String,
  type: { 
    type: String, 
    enum: ['task', 'payment', 'system', 'auth', 'marketing'] 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: { 
    type: String, 
    enum: ['unread', 'read', 'archived'],
    default: 'unread'
  },
  channels: [{ 
    type: String, 
    enum: ['in_app', 'email', 'push', 'sms'] 
  }],
  linkFor: String,
  linkId: Schema.Types.ObjectId,
  referenceFor: String,
  referenceId: Schema.Types.ObjectId,
  data: Schema.Types.Mixed,
  scheduledFor: Date,
  readAt: Date,
  isDeleted: { type: Boolean, default: false },
}, {
  timestamps: true,  // createdAt, updatedAt
});

// ────────────────────────────────────────────────────────
// PRIMARY INDEXES (Cover 90% of queries)
// ────────────────────────────────────────────────────────

// 1. User's notifications (most common query)
notificationSchema.index({ 
  receiverId: 1, 
  createdAt: -1 
});
// Query: Get all notifications for a user

// 2. User's unread notifications (high-traffic)
notificationSchema.index({ 
  receiverId: 1, 
  status: 1, 
  createdAt: -1 
}, {
  partialFilterExpression: { 
    isDeleted: false,
    status: { $in: ['unread', 'pending'] }
  }
});
// Query: Get unread count for a user

// 3. Notifications by type (filtering)
notificationSchema.index({ 
  receiverId: 1, 
  type: 1, 
  createdAt: -1 
});
// Query: Get payment notifications for a user

// 4. Notifications by priority (urgent filtering)
notificationSchema.index({ 
  receiverId: 1, 
  priority: 1, 
  status: 1,
  createdAt: -1 
}, {
  partialFilterExpression: {
    isDeleted: false,
    priority: { $in: ['urgent', 'high'] }
  }
});
// Query: Get high-priority unread notifications

// ────────────────────────────────────────────────────────
// SECONDARY INDEXES (Cover 9% of queries)
// ────────────────────────────────────────────────────────

// 5. Role-based broadcast notifications
notificationSchema.index({ 
  receiverRole: 1, 
  createdAt: -1 
}, {
  partialFilterExpression: {
    receiverId: { $exists: false },  // Broadcast (no specific user)
    isDeleted: false
  }
});
// Query: Get all admin broadcast notifications

// 6. Reference-based lookups
notificationSchema.index({ 
  referenceFor: 1, 
  referenceId: 1 
});
// Query: Get all notifications for a task

// 7. Scheduled notifications (worker queries)
notificationSchema.index({ 
  scheduledFor: 1, 
  status: 1 
}, {
  partialFilterExpression: {
    isDeleted: false,
    status: 'pending',
    scheduledFor: { $lte: new Date() }
  }
});
// Query: Get due scheduled notifications

// ────────────────────────────────────────────────────────
// SPECIALTY INDEXES (Cover 1% of queries)
// ────────────────────────────────────────────────────────

// 8. Full-text search
notificationSchema.index({ 
  title: 'text', 
  subTitle: 'text' 
});
// Query: Search notifications by keywords

// 9. Link-based lookups
notificationSchema.index({ 
  linkFor: 1, 
  linkId: 1 
});
// Query: Get all notifications linking to a task

// 10. TTL for auto-cleanup (90 days)
notificationSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: {
      isDeleted: true  // Only delete soft-deleted
    }
  }
);
```

### Index Performance Analysis

```typescript
// Test Query 1: User's notifications
const query1 = db.notifications.find({ 
  receiverId: ObjectId("user123") 
}).sort({ createdAt: -1 }).limit(10);

// Without Index:
// └── COLLSCAN: 10,000,000 documents scanned
// └── Execution time: 5000ms

// With Index { receiverId: 1, createdAt: -1 }:
// └── IXSCAN: 10 documents scanned
// └── Execution time: 5ms
// └── Improvement: 1000x faster ✅

// Test Query 2: Unread count
const query2 = db.notifications.countDocuments({
  receiverId: ObjectId("user123"),
  status: 'unread',
  isDeleted: false
});

// Without Index:
// └── COLLSCAN: 10,000,000 documents
// └── Execution time: 4000ms

// With Partial Index:
// └── IXSCAN: 50 documents (only unread, non-deleted)
// └── Execution time: 2ms
// └── Improvement: 2000x faster ✅
// └── Index size: 40% smaller than full index

// Test Query 3: Type-filtered notifications
const query3 = db.notifications.find({
  receiverId: ObjectId("user123"),
  type: 'payment',
  status: { $in: ['unread', 'pending'] }
}).sort({ createdAt: -1 });

// Without Index:
// └── COLLSCAN: 10,000,000 documents
// └── Execution time: 5000ms

// With Compound Index { receiverId: 1, type: 1, status: 1, createdAt: -1 }:
// └── IXSCAN: 100 documents
// └── Execution time: 8ms
// └── Improvement: 625x faster ✅
```

### Index Monitoring

```typescript
/**
 * Check index usage statistics
 */
async function analyzeIndexUsage() {
  const stats = await db.notifications.aggregate([
    { $indexStats: {} }
  ]);
  
  for (const stat of stats) {
    console.log(`Index: ${JSON.stringify(stat.key)}`);
    console.log(`  Accesses: ${stat.accesses.ops}`);
    console.log(`  Hits: ${stat.accesses.hits}`);
    console.log(`  Misses: ${stat.accesses.misses}`);
    console.log(`  Size: ${stat.size} bytes`);
    
    // Identify unused indexes
    if (stat.accesses.ops === 0 && stat.name !== '_id_') {
      console.warn(`⚠️ Unused index detected: ${stat.name}`);
      console.log(`  Consider dropping to save space and write performance`);
    }
  }
}

/**
 * Identify missing indexes from slow queries
 */
async function findSlowQueries() {
  const profileData = await db.getProfilingStatus();
  
  if (profileData.was === 0) {
    console.log('Query profiling is disabled');
    console.log('Enable with: db.setProfilingLevel({ slowms: 100 })');
    return;
  }
  
  const slowQueries = await db.system.profile.find({
    millis: { $gt: 100 }  // Queries > 100ms
  }).sort({ ts: -1 }).limit(10).toArray();
  
  for (const query of slowQueries) {
    console.log(`Slow Query: ${query.op} ${query.ns}`);
    console.log(`  Duration: ${query.millis}ms`);
    console.log(`  Query: ${JSON.stringify(query.query)}`);
    console.log(`  Plan: ${query.planSummary}`);
    
    if (query.planSummary === 'COLLSCAN') {
      console.error('  ❌ Collection scan detected - needs index!');
    }
  }
}
```

---

## Query Optimization Techniques

### Use .lean() for Read-Only Queries

```typescript
// ❌ SLOW: Full Mongoose document hydration
const notifications = await Notification.find({ 
  receiverId: userId 
});
// Memory: 800 bytes per document
// Time: 80ms (50ms query + 30ms hydration)

// ✅ FAST: Plain JavaScript objects
const notifications = await Notification.find({ 
  receiverId: userId 
}).lean();
// Memory: 500 bytes per document (37.5% savings)
// Time: 50ms (no hydration overhead)

// Performance Impact at Scale:

// 10,000 notifications per request:
// Without .lean(): 8MB per request
// With .lean(): 5MB per request
// Savings: 3MB (37.5%)

// 100 concurrent requests:
// Without .lean(): 800MB RAM
// With .lean(): 500MB RAM
// Savings: 300MB RAM ✅
```

### Projection (Select Only Needed Fields)

```typescript
// ❌ BAD: Return all fields
const user = await User.findById(userId);
// Returns: password, __v, createdAt, updatedAt, etc.
// Size: ~2KB per document

// ✅ GOOD: Select only needed fields
const user = await User.findById(userId).select('name email profileImage');
// Returns: Only 3 fields
// Size: ~200 bytes (90% reduction!)

// Advanced Projection:
const notifications = await Notification.find({ 
  receiverId: userId 
}).select({
  title: 1,
  subTitle: 1,
  type: 1,
  status: 1,
  createdAt: 1,
  // Exclude large fields
  data: 0,
}).lean();
// Size: ~300 bytes vs 2KB (85% reduction)
```

### Avoid N+1 Query Problem

```typescript
// ❌ TERRIBLE: N+1 queries
const notifications = await Notification.find({ receiverId: userId });

for (const notif of notifications) {
  // 1 query per notification
  const sender = await User.findById(notif.senderId);
  console.log(sender.name);
}

// Total queries: 1 + N (where N = number of notifications)
// For 100 notifications: 101 queries
// Time: 101 × 50ms = 5050ms (5 seconds!) ❌

// ✅ GOOD: Populate in single query
const notifications = await Notification.find({ 
  receiverId: userId 
}).populate('senderId', 'name profileImage');

// Total queries: 1 (with join)
// Time: 100ms ✅

// ✅ EVEN BETTER: Manual population (more control)
const notifications = await Notification.find({ 
  receiverId: userId 
}).lean();

const senderIds = notifications.map(n => n.senderId);
const senders = await User.find({ 
  _id: { $in: senderIds } 
}).select('name profileImage').lean();

const senderMap = new Map(senders.map(s => [s._id.toString(), s]));

const result = notifications.map(n => ({
  ...n,
  sender: senderMap.get(n.senderId.toString())
}));

// Total queries: 2 (no join overhead)
// Time: 80ms (faster than populate for large datasets) ✅
```

### Use Aggregation for Complex Queries

```typescript
// ❌ SLOW: Multiple queries + application logic
const notifications = await Notification.find({ 
  receiverId: userId,
  isDeleted: false 
});

const unreadCount = notifications.filter(n => n.status === 'unread').length;
const grouped = notifications.reduce((acc, n) => {
  acc[n.type] = (acc[n.type] || 0) + 1;
  return acc;
}, {});

// Time: 100ms query + 50ms processing = 150ms

// ✅ FAST: Single aggregation pipeline
const result = await Notification.aggregate([
  { 
    $match: { 
      receiverId: new mongoose.Types.ObjectId(userId),
      isDeleted: false 
    } 
  },
  {
    $group: {
      _id: '$type',
      count: { $sum: 1 },
      unreadCount: {
        $sum: { $cond: [{ $eq: ['$status', 'unread'] }, 1, 0] }
      }
    }
  }
]);

// Time: 30ms (5x faster!) ✅
```

### Batch Writes for Bulk Operations

```typescript
// ❌ SLOW: Individual writes
for (const userId of userIds) {
  await Notification.create({
    receiverId: userId,
    title: 'New feature available',
    type: 'system'
  });
}
// 1000 users = 1000 writes
// Time: 1000 × 50ms = 50 seconds ❌

// ✅ FAST: Bulk write
const operations = userIds.map(userId => ({
  insertOne: {
    document: {
      receiverId: userId,
      title: 'New feature available',
      type: 'system',
      createdAt: new Date()
    }
  }
}));

await Notification.bulkWrite(operations);
// 1000 users = 1 bulk operation
// Time: 500ms (100x faster!) ✅
```

---

## Schema Design for Scale

### Embedding vs Referencing

```typescript
// ❌ BAD: Embedding unbounded arrays
const userSchema = new Schema({
  name: String,
  notifications: [{  // ❌ Grows indefinitely
    title: String,
    message: String,
    createdAt: Date
  }]
});

// Problem: Document size limit (16MB)
// At 1000 notifications × 200 bytes = 200KB
// At 10,000 notifications = 2MB
// At 100,000 notifications = 20MB → EXCEEDS LIMIT! 💥

// ✅ GOOD: Reference pattern
const userSchema = new Schema({
  name: String,
  // No embedded notifications
});

const notificationSchema = new Schema({
  receiverId: { type: ObjectId, ref: 'User' },
  title: String,
  message: String,
  createdAt: Date
});

// Benefits:
// ✅ Unlimited notifications
// ✅ Independent indexing
// ✅ Efficient pagination
// ✅ No document growth
```

### Schema Design for Notification Module

```typescript
import { Schema, Document, Model } from 'mongoose';

// ────────────────────────────────────────────────────────
// Interfaces
// ────────────────────────────────────────────────────────

interface INotification extends Document {
  receiverId?: Schema.Types.ObjectId;
  senderId?: Schema.Types.ObjectId;
  receiverRole?: string;
  title: string;
  subTitle?: string;
  type: 'task' | 'payment' | 'system' | 'auth' | 'marketing';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'unread' | 'read' | 'archived';
  channels: Array<'in_app' | 'email' | 'push' | 'sms'>;
  linkFor?: string;
  linkId?: Schema.Types.ObjectId;
  referenceFor?: string;
  referenceId?: Schema.Types.ObjectId;
  data?: Record<string, any>;
  scheduledFor?: Date;
  readAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ────────────────────────────────────────────────────────
// Schema Definition
// ────────────────────────────────────────────────────────

const notificationSchema = new Schema<INotification>({
  // Recipient (optional for broadcasts)
  receiverId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true  // Common lookup field
  },
  receiverRole: { 
    type: String,
    enum: ['user', 'admin', 'business', 'provider']
  },
  
  // Sender (optional for system notifications)
  senderId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Content
  title: { 
    type: String, 
    required: true,
    maxlength: 200  // Prevent abuse
  },
  subTitle: { 
    type: String,
    maxlength: 500 
  },
  
  // Classification
  type: { 
    type: String, 
    required: true,
    enum: ['task', 'payment', 'system', 'auth', 'marketing'],
    index: true  // Filter by type
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true  // Priority filtering
  },
  status: { 
    type: String, 
    enum: ['unread', 'read', 'archived'],
    default: 'unread',
    index: true  // Status filtering
  },
  
  // Delivery channels
  channels: [{ 
    type: String, 
    enum: ['in_app', 'email', 'push', 'sms'] 
  }],
  
  // Deep linking
  linkFor: String,  // e.g., 'task', 'group', 'payment'
  linkId: Schema.Types.ObjectId,
  
  // Reference tracking
  referenceFor: String,
  referenceId: Schema.Types.ObjectId,
  
  // Flexible metadata
  data: { 
    type: Schema.Types.Mixed,
    default: {} 
  },
  
  // Scheduling
  scheduledFor: { 
    type: Date,
    index: true  // Worker queries
  },
  readAt: Date,
  
  // Soft delete
  isDeleted: { 
    type: Boolean, 
    default: false,
    index: true  // Filter out deleted
  },
}, {
  timestamps: true,  // createdAt, updatedAt
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      delete ret.isDeleted;
      return ret;
    }
  },
  toObject: { 
    virtuals: true 
  }
});

// ────────────────────────────────────────────────────────
// Indexes (Critical for Performance)
// ────────────────────────────────────────────────────────

// Primary: User's notification feed
notificationSchema.index({ 
  receiverId: 1, 
  createdAt: -1 
});

// Unread notifications (high-traffic)
notificationSchema.index(
  { receiverId: 1, status: 1, createdAt: -1 },
  { 
    partialFilterExpression: { 
      isDeleted: false,
      status: { $in: ['unread', 'pending'] }
    }
  }
);

// Type filtering
notificationSchema.index({ 
  receiverId: 1, 
  type: 1, 
  createdAt: -1 
});

// Priority + status (urgent notifications)
notificationSchema.index(
  { receiverId: 1, priority: 1, status: 1, createdAt: -1 },
  {
    partialFilterExpression: {
      isDeleted: false,
      priority: { $in: ['urgent', 'high'] }
    }
  }
);

// TTL for auto-cleanup (90 days)
notificationSchema.index(
  { createdAt: 1 },
  { 
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { isDeleted: true }
  }
);

// ────────────────────────────────────────────────────────
// Static Methods
// ────────────────────────────────────────────────────────

notificationSchema.statics.getUnreadCount = async function(
  receiverId: Schema.Types.ObjectId
): Promise<number> {
  return this.countDocuments({
    receiverId,
    status: 'unread',
    isDeleted: false
  });
};

notificationSchema.statics.cleanupOldNotifications = async function(
  daysOld: number = 30,
  status: string = 'read'
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.updateMany(
    {
      createdAt: { $lt: cutoffDate },
      status,
      isDeleted: false
    },
    { 
      $set: { isDeleted: true }
    }
  );
  
  return result.modifiedCount;
};

// ────────────────────────────────────────────────────────
// Instance Methods
// ────────────────────────────────────────────────────────

notificationSchema.methods.markAsRead = async function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

// ────────────────────────────────────────────────────────
// Virtuals
// ────────────────────────────────────────────────────────

notificationSchema.virtual('isExpired').get(function() {
  if (!this.scheduledFor) return false;
  return this.scheduledFor < new Date();
});

notificationSchema.virtual('timeAgo').get(function() {
  const seconds = Math.floor((Date.now() - this.createdAt.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
});

// ────────────────────────────────────────────────────────
// Export
// ────────────────────────────────────────────────────────

export const Notification: Model<INotification> = 
  mongoose.model<INotification>('Notification', notificationSchema);
```

---

## Connection Pooling Mastery

### Connection Pool Configuration

```typescript
import mongoose from 'mongoose';

// ❌ BAD: Default connection (no pooling config)
mongoose.connect(process.env.MONGODB_URI);
// Default poolSize: 5 (too small for high load)

// ✅ GOOD: Optimized pooling
mongoose.connect(process.env.MONGODB_URI, {
  // Connection pool settings
  minPoolSize: 5,    // Keep 5 connections warm
  maxPoolSize: 50,   // Max 50 concurrent connections
  maxIdleTimeMS: 30000,  // Close idle after 30s
  waitQueueTimeoutMS: 5000,  // Wait max 5s for available connection
  
  // Socket settings
  socketTimeoutMS: 45000,  // 45s timeout for operations
  serverSelectionTimeoutMS: 5000,  // 5s to find server
  
  // Heartbeat (keep connections alive)
  heartbeatFrequencyMS: 10000,  // Check every 10s
  
  // Retry settings
  retryWrites: true,
  retryReads: true,
});

// Monitor connection pool
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});
```

### Connection Pool Monitoring

```typescript
/**
 * Monitor connection pool health
 */
async function monitorConnectionPool() {
  const adminDb = mongoose.connection.db.admin();
  const serverStatus = await adminDb.serverStatus();
  
  const connections = serverStatus.connections;
  
  console.log('Connection Pool Stats:');
  console.log(`  Current: ${connections.current}`);
  console.log(`  Available: ${connections.available}`);
  console.log(`  Total Created: ${connections.totalCreated}`);
  
  // Alert if pool exhausted
  if (connections.available === 0) {
    console.error('⚠️ CONNECTION POOL EXHAUSTED!');
    console.error('  Increase maxPoolSize or optimize queries');
  }
  
  // Alert if high connection churn
  const churnRate = connections.totalCreated / connections.current;
  if (churnRate > 10) {
    console.warn('⚠️ HIGH CONNECTION CHURN');
    console.warn('  Connections being created/closed rapidly');
    console.warn('  Consider increasing minPoolSize');
  }
}

// Monitor every 30 seconds
setInterval(monitorConnectionPool, 30000);
```

---

## Read/Write Separation

### Read Replica Configuration

```typescript
// Primary (writes + reads)
const primaryUri = 'mongodb://primary:27017/taskdb';

// Read replicas (reads only)
const replicaUris = [
  'mongodb://replica1:27017/taskdb',
  'mongodb://replica2:27017/taskdb',
  'mongodb://replica3:27017/taskdb',
];

// Connect with read preference
mongoose.connect(primaryUri, {
  readPreference: 'secondaryPreferred',  // Read from replicas
  writeConcern: { w: 'majority' },  // Write to majority
});

// Force read from primary for critical data
const criticalData = await Notification.findById(id)
  .read('primary');

// Read from secondary for non-critical (faster)
const notifications = await Notification.find({ receiverId: userId })
  .read('secondary');
```

---

## Performance Monitoring

### Query Profiling

```typescript
// Enable profiling for slow queries
db.setProfilingLevel({
  slowms: 100,  // Profile queries > 100ms
  sampleRate: 1.0  // Profile all slow queries
});

// Get slow queries
const slowQueries = await db.system.profile.find({
  millis: { $gt: 100 }
}).sort({ ts: -1 }).limit(10).toArray();

// Analyze
for (const query of slowQueries) {
  console.log(`Query: ${query.op} ${query.ns}`);
  console.log(`Duration: ${query.millis}ms`);
  console.log(`Plan: ${query.planSummary}`);
  console.log(`Docs Examined: ${query.nscannedObjects}`);
  console.log(`Docs Returned: ${query.n}`);
  
  if (query.planSummary === 'COLLSCAN') {
    console.error('❌ Needs index!');
  }
}
```

---

## Conclusion

Database optimization is critical for scaling:

```
Impact Summary:
├── Query speed: 1000x faster (with indexes)
├── Memory usage: 37% reduction (.lean())
├── Connection efficiency: 10x more throughput
├── Storage: 60% savings (partial indexes)
└── Auto-cleanup: TTL indexes
```

**Key Takeaways:**

1. **Index Strategically** - Compound, partial, TTL
2. **Use .lean()** - 37% memory savings
3. **Project Fields** - Return only what's needed
4. **Avoid N+1** - Use populate or manual joins
5. **Pool Connections** - Optimize min/max pool size
6. **Monitor Queries** - Profile slow queries
7. **Batch Writes** - Use bulkWrite for bulk operations
8. **Design Schema** - Embed vs reference correctly

---

**Next Reading:**
- `MEMORY_EFFICIENCY_ANALYSIS.md` - Memory optimization
- `HORIZONTAL_SCALING_STRATEGY.md` - Multi-server deployment
- `PERFORMANCE_BENCHMARKING.md` - Load testing

---

**Document Version:** 1.0  
**Last Updated:** 30-03-26  
**Author:** Senior Backend Engineering Team  
**Review Date:** 30-04-26
