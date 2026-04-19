# Memory Efficiency Analysis - Mastery Guide

**Version:** 1.0  
**Date:** 30-03-26  
**Level:** Senior Engineering / Performance Optimization  
**Prerequisites:** SCALABILITY_COMPARISON.md, DATABASE_OPTIMIZATION_GUIDE.md

---

## Table of Contents

1. [Memory: The Hidden Bottleneck](#memory-the-hidden-bottleneck)
2. [Node.js Memory Architecture](#nodejs-memory-architecture)
3. [Memory Profiling and Analysis](#memory-profiling-and-analysis)
4. [Common Memory Leaks](#common-memory-leaks)
5. [Optimization Techniques](#optimization-techniques)
6. [Garbage Collection Tuning](#garbage-collection-tuning)
7. [Memory-Efficient Data Structures](#memory-efficient-data-structures)
8. [Stream Processing](#stream-processing)
9. [Buffer Management](#buffer-management)
10. [Production Memory Monitoring](#production-memory-monitoring)

---

## Memory: The Hidden Bottleneck

### Why Memory Matters More Than You Think

```
Scenario: Notification API at Scale

Old Architecture (Memory Inefficient):

Request: GET /api/v1/notifications?page=1&limit=100

Memory Flow:
├── 1. MongoDB returns 100 documents
│    └── 100 docs × 800 bytes (Mongoose overhead) = 80KB
├── 2. Mongoose hydrates documents
│    └── Adds getters, setters, methods = +40KB
├── 3. JSON serialization
│    └── Creates new object = +80KB (temporary)
├── 4. Response buffering
│    └── Full response in memory = 200KB
└── Total per request: 400KB

At 1,000 concurrent requests:
└── 400KB × 1,000 = 400MB RAM
    → 78% of 512MB server
    → GC running constantly
    → Latency spikes: 200-500ms ❌

---

New Architecture (Memory Optimized):

Request: GET /api/v1/notifications?page=1&limit=100

Memory Flow:
├── 1. MongoDB returns 100 documents (.lean())
│    └── 100 docs × 500 bytes (plain objects) = 50KB
├── 2. Projection (select only needed fields)
│    └── 5 fields instead of 20 = 15KB
├── 3. Stream response (no buffering)
│    └── Chunked transfer = 5KB at a time
└── Total per request: 20KB

At 1,000 concurrent requests:
└── 20KB × 1,000 = 20MB RAM
    → 4% of 512MB server
    → GC idle
    → Consistent latency: 50ms ✅

Memory Reduction: 95% (400MB → 20MB)
Performance Gain: 4x faster (200ms → 50ms)
```

### Memory vs CPU Trade-offs

```typescript
// ❌ CPU Efficient, Memory Inefficient
const allData = await Model.find({}).lean();
const result = allData
  .filter(item => item.status === 'active')
  .map(item => ({ id: item._id, name: item.title }));

// Memory: Loads ALL documents before filtering
// For 1M documents: 500MB RAM spike

// ✅ Memory Efficient, Slightly More CPU
const result = await Model.find({ status: 'active' })
  .select('title')
  .lean()
  .cursor();

for await (const doc of result) {
  processChunk(doc);  // Process one at a time
}

// Memory: Constant 10KB regardless of dataset size
// CPU: +5% for cursor management
```

---

## Node.js Memory Architecture

### V8 Heap Structure

```
┌─────────────────────────────────────────────────────────┐
│  Node.js Memory Layout                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  V8 Heap (JavaScript Objects)                           │
│  Default Max: 1.4GB (64-bit), 0.7GB (32-bit)           │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │  New Space      │  │  Old Space      │              │
│  │  (Young Gen)    │  │  (Old Gen)      │              │
│  │  ~16MB          │  │  ~1.4GB         │              │
│  │                 │  │                 │              │
│  │  - Eden         │  │  - Long-lived   │              │
│  │  - Survivor     │  │  - Promoted     │              │
│  └─────────────────┘  └─────────────────┘              │
│                                                         │
│  Minor GC: 1-5ms (New Space only)                      │
│  Major GC: 50-100ms (Full heap)                        │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Stack (Call Frames)                                    │
│  Size: ~1MB per thread                                  │
├─────────────────────────────────────────────────────────┤
│  - Function calls                                       │
│  - Local variables                                      │
│  - Return addresses                                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  External Memory (Native Buffers)                       │
│  Not tracked by V8                                      │
├─────────────────────────────────────────────────────────┤
│  - Buffer objects                                       │
│  - Typed arrays                                         │
│  - C++ allocations                                      │
└─────────────────────────────────────────────────────────┘
```

### Garbage Collection Basics

```
Garbage Collection Process:

1. Mark Phase:
   └── Traverse from roots, mark reachable objects
   
2. Sweep Phase:
   └── Free unmarked objects
   
3. Compact Phase (Major GC only):
   └── Defragment heap

GC Triggers:
├── New Space full → Minor GC (fast)
├── Old Space full → Major GC (slow)
└── Memory pressure → Aggressive GC

GC Impact on Performance:

Minor GC (New Space):
├── Frequency: Every 1-2 seconds
├── Duration: 1-5ms
└── Impact: Negligible

Major GC (Full Heap):
├── Frequency: Every 10-30 seconds (under load)
├── Duration: 50-100ms
└── Impact: Request latency spikes ❌

Optimization Goal:
└── Minimize Major GC frequency
    → Reduce object allocation rate
    → Promote fewer objects to Old Space
```

---

## Memory Profiling and Analysis

### Taking Heap Snapshots

```typescript
// Start Node.js with profiling flags
node --inspect --expose-gc app.js

// In Chrome DevTools:
// 1. Open chrome://inspect
// 2. Click "Inspect" on your app
// 3. Go to Memory tab
// 4. Take heap snapshot

// Programmatically trigger GC and snapshot
import { writeHeapSnapshot } from 'v8';

function captureHeapSnapshot(name: string) {
  if (global.gc) {
    global.gc();  // Force GC
    
    const snapshot = writeHeapSnapshot();
    console.log(`Heap snapshot saved: ${snapshot}`);
  } else {
    console.warn('Run with --expose-gc flag');
  }
}

// Usage: Monitor memory growth
setInterval(() => {
  const usage = process.memoryUsage();
  console.log('Memory Usage:', {
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`,
  });
  
  // Alert if heap growing
  if (usage.heapUsed > 1024 * 1024 * 1024) {  // >1GB
    captureHeapSnapshot('before-gc');
    global.gc();
    captureHeapSnapshot('after-gc');
  }
}, 60000);
```

### Analyzing Heap Snapshots

```
Chrome DevTools Memory Tab:

Snapshot Comparison:
├── Snapshot 1: Baseline (app started)
├── Snapshot 2: After 1000 requests
└── Snapshot 3: After 10000 requests

Look for:
├── Objects growing between snapshots
├── Detached DOM trees (memory leaks)
├── Large strings (buffer bloat)
└── Closures holding references

Common Leak Patterns:

1. Event Listener Leak:
   emitter.on('event', handler);  // Never removed
   → Fix: emitter.off('event', handler)

2. Timer Leak:
   setInterval(() => {...}, 1000);  // Never cleared
   → Fix: clearInterval(timerId)

3. Database Connection Leak:
   const conn = await db.connect();  // Never closed
   → Fix: await conn.close()

4. Cache Without TTL:
   cache.set(key, value);  // Grows forever
   → Fix: Use LRU cache with max size
```

### Memory Allocation Tracking

```typescript
// Track memory allocations in real-time
import { monitorEventLoopDelay } from 'perf_hooks';

const delayMonitor = monitorEventLoopDelay({
  resolution: 10  // 10ms buckets
});

delayMonitor.enable();

// Check every 10 seconds
setInterval(() => {
  const histogram = delayMonitor.histogram;
  
  console.log('Event Loop Delay:');
  console.log(`  Min: ${histogram.min / 1000}ms`);
  console.log(`  Max: ${histogram.max / 1000}ms`);
  console.log(`  Mean: ${(histogram.mean / 1000).toFixed(2)}ms`);
  console.log(`  P50: ${(histogram.percentile(50) / 1000).toFixed(2)}ms`);
  console.log(`  P99: ${(histogram.percentile(99) / 1000).toFixed(2)}ms`);
  
  // Alert if P99 > 100ms (GC pressure)
  if (histogram.percentile(99) > 100000) {
    console.error('⚠️ High event loop delay - possible GC pressure');
  }
  
  delayMonitor.reset();
}, 10000);
```

---

## Common Memory Leaks

### Leak Pattern 1: Unbounded Caches

```typescript
// ❌ LEAK: Cache grows forever
const cache = new Map();

async function getData(id: string) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  
  const data = await db.findById(id);
  cache.set(id, data);  // Never removed!
  return data;
}

// After 1M requests:
// Cache size: 1M entries × 1KB = 1GB
// Result: Out of memory ❌

// ✅ FIX: LRU Cache with max size
import { LRUCache } from 'lru-cache';

const cache = new LRUCache({
  max: 10000,  // Max 10,000 entries
  maxSize: 100 * 1024 * 1024,  // Max 100MB
  ttl: 5 * 60 * 1000,  // 5 minute TTL
});

async function getData(id: string) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  
  const data = await db.findById(id);
  cache.set(id, data);
  return data;
}

// After 1M requests:
// Cache size: 10,000 entries (capped)
// Memory: Constant 100MB ✅
```

### Leak Pattern 2: Event Listener Accumulation

```typescript
// ❌ LEAK: Adding listeners without removing
class NotificationService {
  private emitter = new EventEmitter();
  
  onNewNotification(userId: string, handler: Function) {
    // Creates new listener for each call
    this.emitter.on(`notification:${userId}`, handler);
  }
}

// Usage:
// Every request adds a new listener
// After 10,000 requests: 10,000 listeners
// Memory: Leaks, EventEmitter warns at 11 listeners ❌

// ✅ FIX: Track and cleanup listeners
class NotificationService {
  private emitter = new EventEmitter();
  private listeners = new Map<string, Set<Function>>();
  
  onNewNotification(userId: string, handler: Function) {
    const key = `notification:${userId}`;
    
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(handler);
    this.emitter.on(key, handler);
  }
  
  offNewNotification(userId: string, handler: Function) {
    const key = `notification:${userId}`;
    
    this.emitter.off(key, handler);
    this.listeners.get(key)?.delete(handler);
    
    // Cleanup empty sets
    if (this.listeners.get(key)?.size === 0) {
      this.listeners.delete(key);
      this.emitter.removeAllListeners(key);
    }
  }
  
  // Cleanup on user disconnect
  cleanupUser(userId: string) {
    const key = `notification:${userId}`;
    const handlers = this.listeners.get(key);
    
    handlers?.forEach(handler => {
      this.emitter.off(key, handler);
    });
    
    this.listeners.delete(key);
    this.emitter.removeAllListeners(key);
  }
}
```

### Leak Pattern 3: Large String Concatenation

```typescript
// ❌ LEAK: String concatenation creates many intermediates
function buildLargeResponse(notifications: any[]): string {
  let result = '[';
  
  for (const notif of notifications) {
    result += JSON.stringify(notif) + ',';  // Creates new string each time
  }
  
  result += ']';
  return result;
}

// For 10,000 notifications:
// Intermediate strings: 10,000
// Total allocation: 10,000 × 100KB = 1GB (temporary)
// GC pressure: HIGH ❌

// ✅ FIX: Use array join
function buildLargeResponse(notifications: any[]): string {
  const parts = notifications.map(notif => JSON.stringify(notif));
  return '[' + parts.join(',') + ']';
}

// For 10,000 notifications:
// Intermediate strings: 1 (final result)
// Total allocation: 100KB
// GC pressure: LOW ✅

// EVEN BETTER: Stream response
function streamResponse(notifications: any[], res: Response) {
  res.write('[');
  
  let first = true;
  for (const notif of notifications) {
    if (!first) res.write(',');
    res.write(JSON.stringify(notif));
    first = false;
  }
  
  res.write(']');
}

// Memory: Constant (no buffering) ✅
```

### Leak Pattern 4: Closures Holding References

```typescript
// ❌ LEAK: Closure holds reference to large object
function createProcessor(largeData: Buffer) {
  return function process() {
    // largeData is kept in memory even if not used
    console.log('Processing...');
  };
}

const processor = createProcessor(hugeBuffer);  // 100MB
// hugeBuffer cannot be GC'd because closure references it

// ✅ FIX: Don't capture unused variables
function createProcessor(largeData: Buffer) {
  const neededData = extractNeededData(largeData);
  
  return function process() {
    // Only captures neededData, not largeData
    console.log('Processing...', neededData);
  };
}

// OR: Explicitly nullify references
function createProcessor(largeData: Buffer) {
  const neededData = extractNeededData(largeData);
  largeData = null;  // Allow GC
  
  return function process() {
    console.log('Processing...', neededData);
  };
}
```

### Leak Pattern 5: Database Connection Leaks

```typescript
// ❌ LEAK: Connections not returned to pool
async function processNotifications() {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    await Notification.updateMany({...}, {...}, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    // Missing: await session.endSession()
    throw error;
  }
  
  // Missing: await session.endSession()
}

// After 10,000 requests:
// Leaked sessions: 10,000
// Connection pool exhausted ❌

// ✅ FIX: Always cleanup in finally block
async function processNotifications() {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    await Notification.updateMany({...}, {...}, { session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();  // Always executed
  }
}
```

---

## Optimization Techniques

### Technique 1: Object Pooling

```typescript
// ❌ Without pooling: Create/destroy objects constantly
function processRequest(data: any) {
  const context = {
    userId: data.userId,
    timestamp: Date.now(),
    metadata: {},
    cache: new Map(),
    // ... more properties
  };
  
  // Process...
  
  // Context garbage (creates GC pressure)
}

// ✅ With pooling: Reuse objects
class ContextPool {
  private pool: Array<any> = [];
  private maxPoolSize = 100;
  
  acquire(): any {
    if (this.pool.length > 0) {
      const context = this.pool.pop();
      // Reset context
      context.metadata = {};
      context.cache.clear();
      return context;
    }
    
    // Create new if pool empty
    return this.createContext();
  }
  
  release(context: any) {
    if (this.pool.length < this.maxPoolSize) {
      // Reset before returning to pool
      context.metadata = {};
      context.cache.clear();
      this.pool.push(context);
    }
    // Let GC collect if pool full
  }
  
  private createContext(): any {
    return {
      userId: null,
      timestamp: 0,
      metadata: {},
      cache: new Map(),
    };
  }
}

const contextPool = new ContextPool();

function processRequest(data: any) {
  const context = contextPool.acquire();
  
  try {
    context.userId = data.userId;
    context.timestamp = Date.now();
    
    // Process...
  } finally {
    contextPool.release(context);  // Return to pool
  }
}

// Benefits:
// ✅ Reduced GC pressure
// ✅ Faster allocation (reuse vs create)
// ✅ Predictable memory usage
```

### Technique 2: Lazy Loading

```typescript
// ❌ Eager loading: Load everything upfront
class NotificationDetail {
  notifications: any[];
  senders: Map<string, any>;
  tasks: Map<string, any>;
  groups: Map<string, any>;
  
  constructor(notifications: any[]) {
    this.notifications = notifications;
    this.senders = new Map();
    this.tasks = new Map();
    this.groups = new Map();
    
    // Load ALL related data immediately
    this.loadAllSenders();
    this.loadAllTasks();
    this.loadAllGroups();
  }
  
  // Memory: Loads everything even if not accessed
}

// ✅ Lazy loading: Load on demand
class NotificationDetail {
  notifications: any[];
  private senders = new Map<string, any>();
  private tasks = new Map<string, any>();
  private groups = new Map<string, any>();
  
  constructor(notifications: any[]) {
    this.notifications = notifications;
  }
  
  async getSender(userId: string) {
    if (!this.senders.has(userId)) {
      const sender = await User.findById(userId).lean();
      this.senders.set(userId, sender);
    }
    return this.senders.get(userId);
  }
  
  async getTask(taskId: string) {
    if (!this.tasks.has(taskId)) {
      const task = await Task.findById(taskId).lean();
      this.tasks.set(taskId, task);
    }
    return this.tasks.get(taskId);
  }
  
  // Only loads accessed data
  // Memory: Proportional to actual usage ✅
}
```

### Technique 3: Streaming Large Datasets

```typescript
// ❌ Buffering entire dataset
async function exportNotifications(userId: string, res: Response) {
  const all = await Notification.find({ receiverId: userId }).lean();
  // Memory spike: 100MB for 1M notifications
  
  const csv = all.map(n => 
    `${n.title},${n.status},${n.createdAt}`
  ).join('\n');
  // Another 50MB for CSV string
  
  res.send(csv);
  // Total: 150MB memory spike ❌
}

// ✅ Streaming (constant memory)
async function exportNotifications(userId: string, res: Response) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=export.csv');
  
  const cursor = Notification.find({ receiverId: userId })
    .select('title status createdAt')
    .lean()
    .cursor();
  
  // Write header
  res.write('title,status,createdAt\n');
  
  // Stream rows one at a time
  for await (const notif of cursor) {
    const row = `${notif.title},${notif.status},${notif.createdAt}\n`;
    res.write(row);
    // Memory: Constant ~1KB per iteration ✅
  }
  
  res.end();
}

// Memory comparison:
// Buffering: O(N) - grows with dataset
// Streaming: O(1) - constant memory
```

### Technique 4: Buffer Reuse

```typescript
// ❌ Allocate new buffer for each operation
function processFile(file: Buffer): Buffer {
  const processed = Buffer.alloc(file.length);
  
  for (let i = 0; i < file.length; i++) {
    processed[i] = file[i] * 2;
  }
  
  return processed;
  // Old buffer becomes garbage
}

// ✅ Reuse buffer from pool
const bufferPool: Buffer[] = [];
const MAX_BUFFER_SIZE = 1024 * 1024;  // 1MB

function getBuffer(size: number): Buffer {
  for (let i = 0; i < bufferPool.length; i++) {
    if (bufferPool[i].length >= size) {
      return bufferPool.splice(i, 1)[0];
    }
  }
  return Buffer.alloc(Math.max(size, MAX_BUFFER_SIZE));
}

function returnBuffer(buffer: Buffer) {
  if (bufferPool.length < 10) {
    buffer.fill(0);  // Clear
    bufferPool.push(buffer);
  }
}

function processFile(file: Buffer): Buffer {
  const processed = getBuffer(file.length);
  
  for (let i = 0; i < file.length; i++) {
    processed[i] = file[i] * 2;
  }
  
  const result = Buffer.from(processed.slice(0, file.length));
  returnBuffer(processed);  // Return to pool
  
  return result;
}

// Benefits:
// ✅ Reduced allocations
// ✅ Less GC pressure
// ✅ Faster processing
```

---

## Garbage Collection Tuning

### Node.js GC Flags

```bash
# Default settings (conservative)
node app.js

# Increase heap size (for memory-intensive apps)
node --max-old-space-size=4096 app.js  # 4GB

# Aggressive GC (lower latency, higher CPU)
node --max-old-space-size=4096 \
     --max-semi-space-size=64 \
     --trace-gc \
     app.js

# Production tuning (balance latency/throughput)
node --max-old-space-size=2048 \
     --max-semi-space-size=32 \
     --optimize-for-size \
     app.js
```

### GC Monitoring

```typescript
// Monitor GC events
import { PerformanceObserver } from 'perf_hooks';

const obs = new PerformanceObserver((items) => {
  for (const item of items.getEntries()) {
    if (item.entryType === 'gc') {
      const gcEntry = item as any;
      console.log('GC Event:', {
        type: gcEntry.detail.kind,
        duration: `${(gcEntry.duration / 1000).toFixed(2)}ms`,
        before: `${(gcEntry.detail.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        after: `${(gcEntry.detail.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      });
    }
  }
});

obs.observe({ entryTypes: ['gc'] });

// GC Types:
// 0: Minor GC (New Space)
// 1: Major GC (Old Space)
// 2: Minor + Major
// 3: Weak/Incremental
```

---

## Memory-Efficient Data Structures

### Choose the Right Structure

```typescript
// Scenario: Store 10,000 user sessions

// ❌ Array (O(N) lookup, memory inefficient)
const sessions: any[] = [];
function findSession(userId: string) {
  return sessions.find(s => s.userId === userId);  // Scan all
}

// ✅ Map (O(1) lookup, memory efficient)
const sessions = new Map<string, any>();
function findSession(userId: string) {
  return sessions.get(userId);  // Instant
}

// Memory comparison for 10,000 sessions:
// Array: 10MB + O(N) lookup time
// Map: 8MB + O(1) lookup time
```

### WeakMap for Caching

```typescript
// ❌ Strong reference cache (prevents GC)
const cache = new Map();

function processData(obj: any) {
  if (!cache.has(obj)) {
    cache.set(obj, expensiveComputation(obj));
  }
  return cache.get(obj);
}

// Problem: obj never GC'd as long as cache holds reference

// ✅ WeakMap (allows GC)
const cache = new WeakMap();

function processData(obj: object) {
  if (!cache.has(obj)) {
    cache.set(obj, expensiveComputation(obj));
  }
  return cache.get(obj);
}

// Benefit: When obj is GC'd, cache entry automatically removed
```

---

## Production Memory Monitoring

### Health Check Endpoint

```typescript
import express from 'express';

const app = express();

app.get('/health/memory', (req, res) => {
  const usage = process.memoryUsage();
  const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
  
  const status = {
    status: heapUsedPercent > 90 ? 'critical' : 
            heapUsedPercent > 80 ? 'warning' : 'healthy',
    memory: {
      heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      heapUsedPercent: `${heapUsedPercent.toFixed(2)}%`,
      rss: `${(usage.rss / 1024 / 1024).toFixed(2)}MB`,
      external: `${(usage.external / 1024 / 1024).toFixed(2)}MB`,
    },
    uptime: process.uptime(),
  };
  
  res.json(status);
});

// Alerting thresholds:
// Warning: >80% heap used
// Critical: >90% heap used
// Action: Scale horizontally or investigate leaks
```

---

## Conclusion

Memory optimization is critical for scaling:

```
Impact Summary:
├── Memory usage: 95% reduction (400MB → 20MB)
├── GC pressure: 80% reduction
├── Latency: 4x more consistent
├── Throughput: 5x higher capacity
└── Stability: No OOM crashes
```

**Key Takeaways:**

1. **Use .lean()** - 37% memory savings
2. **Stream large data** - O(1) memory
3. **LRU caches** - Prevent unbounded growth
4. **Object pooling** - Reduce allocations
5. **Lazy loading** - Load only what's needed
6. **Monitor GC** - Detect pressure early
7. **Profile regularly** - Find leaks before production
8. **Tune heap size** - Match workload

---

**Next Reading:**
- `HORIZONTAL_SCALING_STRATEGY.md` - Multi-server deployment
- `PERFORMANCE_BENCHMARKING.md` - Load testing
- `FUTURE_SCALABILITY_ROADMAP.md` - Path to 1M+ users

---

**Document Version:** 1.0  
**Last Updated:** 30-03-26  
**Author:** Senior Backend Engineering Team  
**Review Date:** 30-04-26
