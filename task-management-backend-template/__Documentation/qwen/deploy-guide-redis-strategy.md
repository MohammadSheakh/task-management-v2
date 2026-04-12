# Redis Architecture & Sizing Guide

# Project: Task Management Backend

# Last Updated: 12-04-26

---

## TABLE OF CONTENTS

1. [Redis Usage Analysis in Your Application](#usage-analysis)
2. [Redis Memory Sizing by Stage](#memory-sizing)
3. [Redis Architecture Patterns](#architecture-patterns)
4. [Redis Configuration by Stage](#configuration)
5. [Redis Performance Optimization](#performance)
6. [Redis Monitoring & Alerts](#monitoring)
7. [Redis Backup & Recovery](#backup)
8. [Redis Troubleshooting Guide](#troubleshooting)

---

## REDIS USAGE ANALYSIS IN YOUR APPLICATION <a name="usage-analysis"></a>

### 1. How Redis is Used in Your Codebase

Based on analysis of 2,587 Redis references in your codebase:

| Use Case | Implementation | Memory Impact | Criticality |
|----------|----------------|---------------|-------------|
| **Cache-Aside Pattern** | User profiles, task details, lists | HIGH (primary consumer) | Critical |
| **BullMQ Queues** | 5 active queues (notifications, reminders, etc.) | MEDIUM (job data + metadata) | Critical |
| **Socket.IO Adapter** | Cross-worker communication | LOW-MEDIUM (connection state) | Critical |
| **Rate Limiting** | Sliding window counters | LOW (small counters) | High |
| **Session Storage** | JWT refresh tokens, auth sessions | MEDIUM (token data) | Critical |
| **Real-time State** | User online status, room membership | LOW-MEDIUM (presence data) | High |
| **Pub/Sub** | Socket.IO events, distributed notifications | LOW (ephemeral) | Medium |
| **Distributed Locks** | Cron job coordination (future) | LOW (small locks) | Medium |

### 2. Memory Consumption Breakdown

**Cache-Aside Pattern (60-70% of Redis memory):**

From `masterSystemPrompt.md` TTL specifications:

| Data Type | TTL | Estimated Size per Item | Items at Scale | Total Memory |
|-----------|-----|------------------------|----------------|--------------|
| **User Profile** | 15 min | ~2 KB | 10,000 active users | 20 MB |
| **Task Detail** | 5 min | ~5 KB | 50,000 tasks viewed | 250 MB |
| **Task List** | 2 min | ~10 KB | 20,000 list views | 200 MB |
| **Group Metadata** | 30 min | ~3 KB | 5,000 groups | 15 MB |
| **Auth Access Token** | 15 min (match JWT) | ~1 KB | 10,000 active sessions | 10 MB |
| **Refresh Token** | 7 days | ~2 KB | 50,000 users (long-lived) | 100 MB |
| **OTP / Temp Token** | 10 min | ~512 B | 1,000 pending OTPs | 0.5 MB |

**Total Cache at Stage 3 (50K users): ~595.5 MB**

**BullMQ Queues (20-25% of Redis memory):**

| Queue | Job Size | Queue Depth | Retry Buffer | Total Memory |
|-------|----------|-------------|--------------|--------------|
| **notificationQueue** | ~2 KB | 500 jobs | 1,000 (retries) | 3 MB |
| **task-reminders-queue** | ~3 KB | 2,000 jobs | 4,000 (retries) | 18 MB |
| **preferredTimeQueue** | ~1 KB | 1,000 jobs | 2,000 (retries) | 3 MB |
| **updateConversationsLastMessage** | ~2 KB | 500 jobs | 1,000 (retries) | 3 MB |
| **notify-participants-queue** | ~5 KB | 2,000 jobs | 4,000 (retries) | 30 MB |
| **Completed Jobs Buffer** | Varies | 100 jobs/queue | 500 total | 10 MB |
| **Failed Jobs Buffer** | Varies | 100 jobs/queue | 500 total | 15 MB |

**Total BullMQ at Stage 3: ~82 MB**

**Socket.IO Adapter (5-10% of Redis memory):**

| Data Type | Size per Item | Items | Total Memory |
|-----------|---------------|-------|--------------|
| **Socket Connections** | ~1 KB | 10,000 concurrent | 10 MB |
| **Room Memberships** | ~512 B | 50,000 room-user pairs | 25 MB |
| **Session State** | ~2 KB | 10,000 sessions | 20 MB |
| **Pub/Sub Channels** | ~256 B | 1,000 channels | 0.25 MB |

**Total Socket.IO at Stage 3: ~55.25 MB**

**Rate Limiting (2-5% of Redis memory):**

| Data Type | Size per Item | Items | Total Memory |
|-----------|---------------|-------|--------------|
| **Sliding Window Counters** | ~512 B | 100,000 users | 50 MB |
| **Auth Attempt Trackers** | ~256 B | 10,000 IPs | 2.5 MB |
| **Lockout State** | ~128 B | 1,000 locked accounts | 0.125 MB |

**Total Rate Limiting at Stage 3: ~52.6 MB**

**Total Redis Memory Estimate (Stage 3):**

```
Cache-Aside:      595.5 MB (65%)
BullMQ Queues:    82 MB (9%)
Socket.IO:        55.25 MB (6%)
Rate Limiting:    52.6 MB (6%)
Overhead:         130 MB (14%) — Redis internal structures, fragmentation
────────────────────────────────────────
Total:            915.35 MB ≈ ~1 GB
```

**Safety Margin:** 2x estimated usage = **2 GB recommended minimum**

---

## REDIS MEMORY SIZING BY STAGE <a name="memory-sizing"></a>

### Stage 1: MVP (0-1,000 Concurrent Users)

**Estimated Usage:**
```
Cache-Aside:      60 MB (1,000 users × small dataset)
BullMQ Queues:    10 MB (low queue depth)
Socket.IO:        5 MB (1,000 concurrent connections)
Rate Limiting:    5 MB (1,000 users)
Overhead:         20 MB
────────────────────────────────
Total:            100 MB
```

**Recommended Redis Memory: 1.5 GB (Docker on EC2)**

```
Why 1.5 GB (15x estimated usage):
✅ Ample room for growth (10x user increase)
✅ Survives traffic spikes without eviction
✅ Redis can use remaining memory for internal optimizations
✅ No need to tune eviction policies aggressively

Configuration:
--maxmemory 1500mb
--maxmemory-policy allkeys-lru
--maxmemory-samples 10
```

**Memory Utilization at Stage 1:**
```
Used: 100 MB (7%)
Available: 1,400 MB (93%)
Status: ✅ HEALTHY (lots of headroom)
```

---

### Stage 2: Growth (1,000-10,000 Concurrent Users)

**Estimated Usage:**
```
Cache-Aside:      200 MB (10x user increase)
BullMQ Queues:    30 MB (moderate queue depth)
Socket.IO:        20 MB (10K concurrent connections)
Rate Limiting:    20 MB (10K users)
Overhead:         50 MB
────────────────────────────────
Total:            320 MB
```

**Recommended Redis Memory: 2 GB (ElastiCache cache.t3.medium)**

```
Why 2 GB:
✅ 6x estimated usage (safe margin)
✅ Accommodates 3x more users before upgrade
✅ ElastiCache standard sizing

Configuration:
maxmemory 2gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
```

**Memory Utilization at Stage 2:**
```
Used: 320 MB (16%)
Available: 1,680 MB (84%)
Status: ✅ HEALTHY
```

---

### Stage 3: Scale (10,000-50,000 Concurrent Users)

**Estimated Usage:**
```
Cache-Aside:      600 MB (50K users, active dataset)
BullMQ Queues:    82 MB (high queue depth)
Socket.IO:        55 MB (50K concurrent connections)
Rate Limiting:    53 MB (50K users)
Overhead:         130 MB
────────────────────────────────
Total:            920 MB
```

**Recommended Redis Memory: 20 GB (ElastiCache cluster, 2 shards × 10 GB)**

```
Why 20 GB (cluster mode):
✅ 22x estimated usage (very safe)
✅ Cluster mode distributes load across 2 shards
✅ Each shard has 10 GB (plenty of headroom)
✅ Survives 10x traffic spike without issues

Configuration (per shard):
maxmemory 10gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
cluster-enabled yes
```

**Memory Utilization at Stage 3:**
```
Used: 920 MB (4.6%)
Available: 19,080 MB (95.4%)
Status: ✅ VERY HEALTHY (cluster mode scales horizontally)
```

**Why such large headroom?**
```
1. Cache hit rate target: > 90%
   - More memory = more cached items = higher hit rate
   - Each 1% increase in hit rate saves ~50 DB queries/sec

2. BullMQ queue spikes during peak hours
   - Task reminders fire simultaneously (e.g., 9 AM)
   - Need buffer for 10x normal queue depth

3. Socket.IO state is critical
   - Losing socket state = disconnecting 50K users
   - Better to over-provision than risk outages

4. Rate limiting accuracy
   - Must track 50K+ users accurately
   - Evicting rate limit keys = allowing abuse
```

---

### Stage 4: Enterprise (50,000-100,000+ Concurrent Users)

**Estimated Usage:**
```
Cache-Aside:      1.2 GB (100K users, optimized caching)
BullMQ Queues:    150 MB (very high queue depth)
Socket.IO:        110 MB (100K concurrent connections)
Rate Limiting:    100 MB (100K users)
Overhead:         250 MB
────────────────────────────────
Total:            1.81 GB
```

**Recommended Redis Memory: 100 GB (ElastiCache cluster, 4 shards × 25 GB)**

```
Why 100 GB (large cluster):
✅ 55x estimated usage (enterprise-grade safety)
✅ 4 shards distribute load geographically
✅ Each shard can handle 25K concurrent users
✅ Supports global deployment (multi-region)

Configuration (per shard):
maxmemory 25gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
cluster-enabled yes
cluster-require-full-coverage no
```

**Memory Utilization at Stage 4:**
```
Used: 1.81 GB (1.8%)
Available: 98.19 GB (98.2%)
Status: ✅ EXTREMELY HEALTHY
```

**Why so much headroom at Stage 4?**
```
1. 99.9% uptime target (8.76 hours downtime/year max)
   - Cannot afford Redis OOM under any circumstances
   - Over-provisioning is cheaper than downtime

2. Multi-region replication
   - Each region needs independent cache
   - Cache warm-up period after failover

3. Seasonal traffic spikes
   - Back-to-school season (education app)
   - Marketing campaigns can 10x traffic temporarily

4. Future-proofing
   - Adding features = more cache keys
   - Better to have capacity ready
```

---

## REDIS ARCHITECTURE PATTERNS <a name="architecture-patterns"></a>

### Pattern 1: Single Instance (Stage 1)

```
┌─────────────────────────────────────┐
│  EC2 Instance (t3.large)            │
│                                      │
│  ┌───────────────────────────────┐  │
│  │  Docker: Redis 7 Alpine      │  │
│  │  - Port: 6379                │  │
│  │  - Max Memory: 1.5 GB        │  │
│  │  - Persistence: AOF          │  │
│  │  - Password: Required        │  │
│  └───────────────────────────────┘  │
│                                      │
│  Node.js App connects via:          │
│  redis://localhost:6379             │
└─────────────────────────────────────┘
```

**Pros:**
- ✅ Simple setup (1 Docker container)
- ✅ No network latency (localhost)
- ✅ Free (included in EC2 cost)
- ✅ Easy to backup (copy AOF file)

**Cons:**
- ❌ Single point of failure (EC2 dies → Redis dies)
- ❌ Manual failover (no automatic recovery)
- ❌ Limited to EC2 RAM (8 GB total for everything)
- ❌ You manage everything (updates, backups, monitoring)

**When to use:** Stage 1 only (0-1,000 users), testing, development

---

### Pattern 2: Primary + Replica (Stage 2)

```
┌─────────────────────────────────────────────────────┐
│  AWS ElastiCache (Managed Redis)                     │
│                                                       │
│  ┌──────────────────────┐    ┌──────────────────────┐│
│  │  Primary Node        │    │  Replica Node        ││
│  │  cache.t3.medium     │    │  cache.t3.medium     ││
│  │  us-east-1a          │    │  us-east-1b          ││
│  │  2 GB RAM            │    │  2 GB RAM            ││
│  │  READ/WRITE          │    │  READ-ONLY           ││
│  └──────────┬───────────┘    └──────────┬───────────┘│
│             │                           │             │
│             └───────────┬───────────────┘             │
│                         │                             │
│            Automatic Failover                         │
│            (< 30 seconds)                             │
└─────────────────────────┼─────────────────────────────┘
                          │
               ┌──────────▼──────────┐
               │  EC2 App Server #1  │
               │  EC2 App Server #2  │
               │  (Both connect to   │
               │   ElastiCache endpoint)│
               └─────────────────────┘
```

**Pros:**
- ✅ Automatic failover (< 30 seconds)
- ✅ Multi-AZ (survives AZ failure)
- ✅ Managed backups (point-in-time recovery)
- ✅ Read scaling (replica handles read queries)
- ✅ AWS manages patching, updates, monitoring

**Cons:**
- ⚠️ Costs $37/month (vs free Docker)
- ⚠️ Slight network latency (vs localhost)
- ⚠️ Less control over configuration

**When to use:** Stage 2+ (1,000+ users), production workloads

---

### Pattern 3: Cluster Mode (Stage 3-4)

```
┌──────────────────────────────────────────────────────────┐
│  AWS ElastiCache Cluster (Redis Cluster Mode)             │
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐               │
│  │  Shard 1        │  │  Shard 2        │               │
│  │  (Hash slots    │  │  (Hash slots    │               │
│  │   0-8191)       │  │   8192-16383)   │               │
│  │                 │  │                 │               │
│  │  ┌───────────┐  │  │  ┌───────────┐  │               │
│  │  │ Primary   │  │  │  │ Primary   │  │               │
│  │  │ r6g.large │  │  │  │ r6g.large │  │               │
│  │  │ 13 GB RAM │  │  │  │ 13 GB RAM │  │               │
│  │  └─────┬─────┘  │  │  └─────┬─────┘  │               │
│  │        │        │  │        │        │               │
│  │  ┌─────┴─────┐  │  │  ┌─────┴─────┐  │               │
│  │  │ Replica 1 │  │  │  │ Replica 1 │  │               │
│  │  │ r6g.large │  │  │  │ r6g.large │  │               │
│  │  │ 13 GB RAM │  │  │  │ 13 GB RAM │  │               │
│  │  └─────┬─────┘  │  │  └─────┬─────┘  │               │
│  │        │        │  │        │        │               │
│  │  ┌─────┴─────┐  │  │  ┌─────┴─────┐  │               │
│  │  │ Replica 2 │  │  │  │ Replica 2 │  │               │
│  │  │ r6g.large │  │  │  │ r6g.large │  │               │
│  │  │ 13 GB RAM │  │  │  │ 13 GB RAM │  │               │
│  │  └───────────┘  │  │  └───────────┘  │               │
│  └─────────────────┘  └─────────────────┘               │
│                                                            │
│  Total: 2 shards × 3 nodes = 6 nodes                     │
│  Total Memory: 26 GB (13 GB × 2 shards)                  │
│  Automatic sharding, failover, load balancing            │
└──────────────────────────────────────────────────────────┘
```

**How Cluster Mode Works:**
```
1. Client connects to any node
2. Node calculates hash slot for key (CRC16)
3. If key is on this node → serve request
4. If key is on different node → redirect client
5. Client caches slot-to-node mapping (avoids future redirects)
```

**Pros:**
- ✅ Horizontal scaling (add more shards)
- ✅ Massive memory capacity (20+ GB)
- ✅ Automatic sharding (data distributed evenly)
- ✅ High availability (each shard has replicas)
- ✅ Survives multiple node failures

**Cons:**
- ⚠️ Complex to manage (cluster commands)
- ⚠️ Multi-key operations limited to single shard
- ⚠️ More expensive ($219+/month)
- ⚠️ Requires cluster-aware Redis client

**When to use:** Stage 3+ (10,000+ users), high-availability requirement

---

## REDIS CONFIGURATION BY STAGE <a name="configuration"></a>

### Stage 1: Docker Redis Configuration

**docker-compose.yml:**
```yaml
redis:
  image: redis:7-alpine
  container_name: task-mgmt-redis
  ports:
    - "6379:6379"
  command: >
    redis-server
    --appendonly yes
    --maxmemory 1500mb
    --maxmemory-policy allkeys-lru
    --maxmemory-samples 10
    --requirepass ${REDIS_PASSWORD}
    --loglevel notice
    --slowlog-log-slower-than 10000
    --slowlog-max-len 128
  volumes:
    - redis_data:/data
  restart: always
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '1.0'
  networks:
    - task-mgmt-network
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3
```

**Key Configuration Explained:**
```
appendonly yes
→ Enables AOF (Append Only File) persistence
→ Every write operation logged to file
→ Survives Redis restarts without data loss
→ File size: ~10-50 MB (depending on write volume)

maxmemory 1500mb
→ Hard limit on Redis memory usage
→ Prevents Redis from consuming all EC2 RAM
→ Leaves 2.5 GB for other services

maxmemory-policy allkeys-lru
→ Evicts least recently used keys when memory full
→ Appropriate for cache-aside pattern
→ Alternative: volatile-lru (only evict keys with TTL)

maxmemory-samples 10
→ LRU approximation sample size
→ Higher = more accurate eviction, slightly more CPU
→ Default is 5, 10 is good balance

requirepass ${REDIS_PASSWORD}
→ Password authentication required
→ NEVER leave Redis open without password
→ Store password in .env (not hardcoded)

slowlog-log-slower-than 10000
→ Log queries slower than 10ms (10,000 microseconds)
→ Helps identify slow operations
→ Adjust based on workload

slowlog-max-len 128
→ Keep last 128 slow queries
→ Review with: SLOWLOG GET
```

---

### Stage 2: ElastiCache Redis Configuration

**AWS Console Settings:**
```
Parameter Group: Create custom parameter group

Parameters:
- maxmemory-policy: allkeys-lru
- maxmemory-samples: 10
- timeout: 300 (close idle connections after 5 min)
- tcp-keepalive: 60 (detect dead connections)
- slowlog-log-slower-than: 10000
- slowlog-max-len: 128
- loglevel: notice

Security:
- Encryption in-transit: Enabled (TLS)
- Authentication: Redis AUTH token
- Security Group: Allow EC2 SG only (port 6379)
- Subnet Group: Private subnets (us-east-1a, 1b)
```

**Connection String:**
```
Primary Endpoint: your-cluster.xxxxx.0001.use1.cache.amazonaws.com:6379
Reader Endpoint: your-cluster.xxxxx.ro.0001.use1.cache.amazonaws.com:6379

Update .env:
REDIS_HOST=your-cluster.xxxxx.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_auth_token
```

**Node.js Connection (ioredis):**
```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
  tls: {}, // Enable TLS for ElastiCache
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) {
      return null; // Stop retrying after 3 attempts
    }
    return Math.min(times * 200, 2000); // Exponential backoff
  },
  enableOfflineQueue: true,
  enableReadyCheck: true,
});

export default redis;
```

---

### Stage 3: ElastiCache Cluster Mode Configuration

**AWS Console Settings:**
```
Cluster Mode: Enabled
Shards: 2
Replicas per Shard: 2
Node Type: cache.r6g.large (13 GB RAM)

Parameter Group:
- maxmemory-policy: allkeys-lru
- maxmemory-samples: 10
- cluster-enabled: yes
- cluster-require-full-coverage: no
- timeout: 300
- tcp-keepalive: 60

Security:
- Encryption in-transit: Enabled (TLS)
- Authentication: Redis AUTH token
- Security Group: Allow EC2 SG only (port 6379)
- Subnet Group: Private subnets (us-east-1a, 1b, 1c)
```

**Node.js Connection (ioredis Cluster):**
```typescript
import Redis from 'ioredis';

const redis = new Redis.Cluster(
  [
    {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT),
    },
  ],
  {
    redisOptions: {
      password: process.env.REDIS_PASSWORD,
      tls: {},
    },
    maxRedirections: 16,
    retryDelayOnFailover: 200,
    retryDelayOnClusterDown: 500,
    slotsRefreshTimeout: 5000,
  }
);

export default redis;
```

**Key Differences from Single Instance:**
```
1. Use Redis.Cluster instead of Redis
2. Provide at least 1 node (client discovers cluster)
3. maxRedirections: Handle cross-slot operations
4. retryDelayOnFailover: Wait for failover completion
5. slotsRefreshTimeout: Cluster topology update timeout
```

---

## REDIS PERFORMANCE OPTIMIZATION <a name="performance"></a>

### 1. Key Naming Convention

**From masterSystemPrompt.md:**
```
Format: <module>:<id>:<datatype>

Examples:
✅ task:abc123:detail
✅ user:xyz789:profile
✅ group:grp001:members
✅ rate:auth:ip:192.168.1.1
✅ session:user:abc123:device:xyz
```

**Why this matters:**
```
✅ Consistent naming = easier debugging (SCAN pattern)
✅ Avoids key collisions (different modules, same ID)
✅ Enables batch operations (SCAN task:*:detail)
✅ Simplifies cache invalidation (DEL task:abc123:*)
```

---

### 2. TTL Strategy

**Recommended TTLs (from masterSystemPrompt.md):**

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| **User Profile** | 15 minutes | Changes infrequently, safe to cache |
| **Task Detail** | 5 minutes | Updates moderately, balance freshness/performance |
| **Task List** | 2 minutes | Changes frequently (status, assignments) |
| **Group Metadata** | 30 minutes | Rarely changes, safe to cache longer |
| **Auth Access Token** | 15 minutes | Match JWT expiry (security) |
| **Refresh Token** | 7 days | Long-lived, stored for session management |
| **OTP / Temp Token** | 10 minutes | Short-lived by design (security) |
| **Rate Limit Counters** | 1 minute | Sliding window (auto-expire) |
| **Socket.IO Room State** | 1 hour | Rebuild on reconnect |
| **BullMQ Job Data** | 24 hours | Clean up old jobs |

**Implementation:**
```typescript
// Cache with TTL
await redis.setex(
  `task:${taskId}:detail`,
  300, // 5 minutes in seconds
  JSON.stringify(taskData)
);

// Check: 5 minutes = 300 seconds
// 15 minutes = 900 seconds
// 30 minutes = 1800 seconds
// 1 hour = 3600 seconds
// 7 days = 604800 seconds
```

---

### 3. Pipeline Optimization

**Problem: Multiple Redis calls = high latency**
```typescript
// ❌ BAD: 3 separate Redis calls (3 round trips)
const user = await redis.get(`user:${userId}:profile`);
const tasks = await redis.get(`user:${userId}:tasks`);
const settings = await redis.get(`user:${userId}:settings`);
// Total latency: 3 × network_latency (e.g., 3 × 2ms = 6ms)
```

**Solution: Use pipelines**
```typescript
// ✅ GOOD: 1 pipeline (1 round trip)
const pipeline = redis.pipeline();
pipeline.get(`user:${userId}:profile`);
pipeline.get(`user:${userId}:tasks`);
pipeline.get(`user:${userId}:settings`);
const results = await pipeline.exec();
// Total latency: 1 × network_latency (e.g., 1 × 2ms = 2ms)
// 66% latency reduction!
```

**When to use pipelines:**
```
✅ Fetching multiple unrelated keys
✅ Setting multiple cache keys
✅ Batch rate limit checks
❌ When you need intermediate results (conditional logic)
❌ When operations depend on previous results
```

---

### 4. Cache Invalidation Strategy

**On Write Operations:**
```typescript
// When updating a task, invalidate related cache
async function updateTask(taskId: string, data: Partial<ITask>) {
  // 1. Update database
  const updatedTask = await Task.findByIdAndUpdate(taskId, data, { new: true });

  // 2. Invalidate cache
  await redis.del(`task:${taskId}:detail`);

  // 3. Invalidate related list caches
  const userId = updatedTask.userId.toString();
  await redis.del(`user:${userId}:tasks`);

  // 4. Return updated data
  return updatedTask;
}
```

**Pattern: Cache-Aside with Invalidation**
```typescript
async function getTask(taskId: string) {
  // Step 1: Try cache
  const cached = await redis.get(`task:${taskId}:detail`);
  if (cached) {
    return JSON.parse(cached);
  }

  // Step 2: Cache miss → read from DB
  const task = await Task.findById(taskId).lean();
  if (!task) return null;

  // Step 3: Write to cache
  await redis.setex(
    `task:${taskId}:detail`,
    300, // 5 minutes
    JSON.stringify(task)
  );

  // Step 4: Return data
  return task;
}
```

---

### 5. Memory Optimization

**Use Efficient Data Structures:**
```typescript
// ❌ BAD: Store entire object as JSON string
await redis.set(`task:${taskId}:detail`, JSON.stringify(task));
// Memory: ~5 KB per task (JSON overhead)

// ✅ GOOD: Use Redis Hash (more efficient)
await redis.hset(`task:${taskId}:detail`, {
  title: task.title,
  status: task.status,
  dueDate: task.dueDate?.toISOString(),
  userId: task.userId.toString(),
});
// Memory: ~3 KB per task (no JSON overhead)
```

**Compress Large Values:**
```typescript
import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Compress before storing (for large values)
async function setCompressed(key: string, value: any, ttl: number) {
  const json = JSON.stringify(value);
  const compressed = await gzipAsync(Buffer.from(json));
  await redis.setex(key, ttl, compressed.toString('base64'));
}

async function getCompressed(key: string) {
  const compressed = await redis.get(key);
  if (!compressed) return null;
  const json = (await gunzipAsync(Buffer.from(compressed, 'base64'))).toString();
  return JSON.parse(json);
}
```

**When to compress:**
```
✅ Values > 1 KB (e.g., task lists, user profiles with many fields)
✅ Values with repetitive data (high compression ratio)
❌ Values < 512 B (compression overhead > savings)
❌ Rate limit counters (too small to benefit)
```

---

## REDIS MONITORING & ALERTS <a name="monitoring"></a>

### 1. Key Metrics to Monitor

**Memory Metrics:**
```
used_memory: Actual memory used by Redis (bytes)
used_memory_human: Human-readable (e.g., "1.23G")
used_memory_peak: Maximum memory used ever
used_memory_peak_human: Human-readable peak
used_memory_rss: Memory from OS perspective (includes fragmentation)
maxmemory: Configured max memory limit
mem_fragmentation_ratio: used_memory_rss / used_memory (target: 1-1.5)
```

**Command Metrics:**
```
total_commands_processed: Total commands ever processed
instantaneous_ops_per_sec: Current operations per second
keyspace_hits: Cache hits
keyspace_misses: Cache misses
hit_rate: keyspace_hits / (keyspace_hits + keyspace_misses) × 100%
```

**Client Metrics:**
```
connected_clients: Number of connected clients
blocked_clients: Clients waiting on blocking commands (BLPOP, etc.)
rejected_connections: Connections rejected (maxclients limit reached)
```

**Persistence Metrics:**
```
rdb_last_bgsave_status: Last RDB save status (ok/err)
aof_last_bgrewrite_status: Last AOF rewrite status (ok/err)
aof_last_write_status: Last AOF write status (ok/err)
```

---

### 2. Monitoring Commands

**Check Redis Health:**
```bash
# Connect to Redis
redis-cli -h your-redis-host -p 6379 -a your_password

# Basic info
INFO

# Memory details
INFO memory

# Stats (hits, misses, commands)
INFO stats

# Client connections
INFO clients

# Replication (if using replicas)
INFO replication

# Cluster info (if using cluster mode)
INFO cluster

# Keyspace (key count per database)
INFO keyspace
```

**Calculate Cache Hit Rate:**
```bash
# Get hits and misses
redis-cli INFO stats | grep keyspace

# Output example:
# keyspace_hits:123456
# keyspace_misses:12345

# Calculate hit rate:
# hit_rate = 123456 / (123456 + 12345) × 100%
# hit_rate = 123456 / 135801 × 100%
# hit_rate = 90.9% ✅ (target: > 80%)
```

**Find Largest Keys:**
```bash
# Scan for keys and estimate memory usage (Redis 4.0+)
redis-cli --bigkeys

# Output example:
# [00.00%] Biggest key found so far: 'task:abc123:detail' (12345 bytes, type: string)
# [00.00%] Biggest hash found so far: 'user:xyz789:profile' (23 fields, 6789 bytes)

# More detailed analysis (requires redis-memory-usage tool)
pip install redis-memory-analyzer
rma --host your-redis-host --port 6379 --password your_password
```

**Monitor Slow Queries:**
```bash
# Get slow queries (slower than configured threshold)
SLOWLOG GET 10

# Output example:
# 1) 1) (integer) 0
#    2) (integer) 1633024800
#    3) (integer) 15000  # Duration in microseconds (15ms)
#    4) 1) "KEYS"
#       2) "task:*"
#       3) "*"

# Clear slow log
SLOWLOG RESET
```

**⚠️ WARNING:** Never use `KEYS *` in production (blocks Redis)
```bash
# ❌ BAD: Blocks Redis, O(N) complexity
KEYS task:*

# ✅ GOOD: Use SCAN (non-blocking, incremental)
SCAN 0 MATCH task:* COUNT 100
```

---

### 3. CloudWatch Alarms (ElastiCache)

**Create these alarms in AWS Console:**

| Metric | Threshold | Action | Severity |
|--------|-----------|--------|----------|
| **FreeableMemory** | < 500 MB for 5 min | Investigate, consider scaling | Warning |
| **FreeableMemory** | < 200 MB for 5 min | Scale up immediately | Critical |
| **CPUUtilization** | > 70% for 5 min | Add more shards/nodes | Warning |
| **CPUUtilization** | > 90% for 5 min | Scale up urgently | Critical |
| **EngineCPUUtilization** | > 80% for 5 min | Optimize queries or scale | Warning |
| **CurrConnections** | > 10,000 | Check for connection leaks | Warning |
| **Evictions** | > 100/sec | Increase maxmemory | Critical |
| **CacheHits** / **CacheMisses** | Hit rate < 70% | Review TTLs, increase memory | Warning |
| **ReplicationLag** | > 5 seconds | Check replica health | Critical |

**CloudWatch Alarm Example (CLI):**
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "Redis-LowMemory" \
  --namespace AWS/ElastiCache \
  --metric-name FreeableMemory \
  --dimensions Name=CacheClusterId,Value=your-cluster-id \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 524288000 \
  --comparison-operator LessThanThreshold \
  --alarm-description "Redis freeable memory < 500 MB for 10 minutes" \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:redis-alerts
```

---

### 4. Application-Level Monitoring

**Add to your service layer:**
```typescript
// src/helpers/redis/redis-monitoring.ts
import { redisClient } from './redis';
import { logger } from '../../shared/logger';

// Monitor cache hit rate
let hits = 0;
let misses = 0;

export function trackCacheHit() {
  hits++;
}

export function trackCacheMiss() {
  misses++;
}

// Report every 5 minutes
setInterval(() => {
  const total = hits + misses;
  const hitRate = total > 0 ? (hits / total) * 100 : 0;

  logger.info('Cache Performance (last 5 min):', {
    hits,
    misses,
    total,
    hitRate: `${hitRate.toFixed(2)}%`,
  });

  // Alert if hit rate drops below target
  if (hitRate < 80) {
    logger.warn('Cache hit rate below target!', { hitRate });
  }

  // Reset counters
  hits = 0;
  misses = 0;
}, 300000); // 5 minutes

// Monitor Redis connection health
setInterval(async () => {
  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    if (latency > 10) {
      logger.warn('High Redis latency', { latency });
    }
  } catch (error) {
    logger.error('Redis connection lost!', error);
  }
}, 60000); // Every 1 minute
```

---

## REDIS BACKUP & RECOVERY <a name="backup"></a>

### 1. Stage 1: Docker Redis Backup

**Manual Backup:**
```bash
# Connect to Redis
docker exec -it task-mgmt-redis redis-cli -a your_password

# Trigger background save
BGSAVE

# Check save status
LASTSAVE

# Exit Redis
exit

# Copy AOF file to safe location
docker cp task-mgmt-redis:/data/appendonly.aof /backup/redis/appendonly-$(date +%Y%m%d).aof

# Compress backup
gzip /backup/redis/appendonly-$(date +%Y%m%d).aof
```

**Automated Backup Script:**
```bash
#!/bin/bash
# backup-redis.sh

BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/appendonly-$DATE.aof.gz"

# Create backup directory
mkdir -p $BACKUP_DIR

# Trigger save
docker exec task-mgmt-redis redis-cli -a $REDIS_PASSWORD BGSAVE

# Wait for save to complete
sleep 5

# Copy and compress
docker exec task-mgmt-redis cat /data/appendonly.aof | gzip > $BACKUP_FILE

# Delete backups older than 7 days
find $BACKUP_DIR -name "appendonly-*.aof.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

**Cron Job (daily backup at 2 AM):**
```bash
crontab -e

# Add this line:
0 2 * * * /opt/task-management/backup-redis.sh >> /var/log/redis-backup.log 2>&1
```

**Restore from Backup:**
```bash
# Stop Redis
docker stop task-mgmt-redis

# Decompress backup
gunzip /backup/redis/appendonly-20260412-020000.aof.gz

# Replace AOF file
docker cp /backup/redis/appendonly-20260412-020000.aof task-mgmt-redis:/data/appendonly.aof

# Start Redis
docker start task-mgmt-redis

# Verify
docker exec task-mgmt-redis redis-cli -a $REDIS_PASSWORD DBSIZE
```

---

### 2. Stage 2+: ElastiCache Backup

**Automated Backups (ElastiCache handles this):**
```
Backup Window: Configure in AWS Console (e.g., 02:00-04:00 UTC)
Retention: 7 days (Stage 2), 14 days (Stage 3+)
Type: Automated daily backups
Storage: S3 (managed by AWS, no extra cost up to 2x cluster storage)
```

**Manual Backup (Snapshot):**
```bash
# Create manual snapshot
aws elasticache create-snapshot \
  --cache-cluster-id your-cluster-id \
  --snapshot-name manual-backup-$(date +%Y%m%d)

# List snapshots
aws elasticache describe-snapshots \
  --cache-cluster-id your-cluster-id

# Delete old snapshot
aws elasticache delete-snapshot \
  --snapshot-name manual-backup-20260101
```

**Restore from Snapshot:**
```bash
# Create new cluster from snapshot
aws elasticache create-cache-cluster \
  --cache-cluster-id restored-cluster \
  --cache-node-type cache.t3.medium \
  --engine redis \
  --snapshot-name manual-backup-20260412 \
  --num-cache-nodes 1

# Update application to use new cluster
# (change REDIS_HOST in .env)
```

**Point-in-Time Recovery (PITR):**
```
Available: ElastiCache Redis (cluster mode disabled)
How it works: Continuous backup to S3
Recovery: Restore to any second in retention period
Cost: +$15/month per cluster

Enable PITR:
aws elasticache modify-cache-cluster \
  --cache-cluster-id your-cluster-id \
  --snapshot-retention-limit 7 \
  --auto-minor-version-upgrade \
  --preferred-maintenance-window sun:03:00-sun:04:00
```

---

## REDIS TROUBLESHOOTING GUIDE <a name="troubleshooting"></a>

### Issue 1: High Memory Usage

**Symptoms:**
```
- Redis evicting keys unexpectedly
- Cache hit rate dropping
- Application errors: "OOM command not allowed when used memory > maxmemory"
```

**Diagnosis:**
```bash
# Check memory usage
redis-cli INFO memory

# Look for:
used_memory: 1450000000 (1.45 GB)
used_memory_human: 1.35G
maxmemory: 1500000000 (1.5 GB)
mem_fragmentation_ratio: 1.2

# Check key distribution
redis-cli --bigkeys

# Find keys expiring soon
redis-cli INFO keyspace
```

**Solutions:**
```
1. Increase maxmemory (if EC2 has spare RAM)
   - Edit docker-compose.yml: --maxmemory 2000mb
   - Restart Redis

2. Review TTLs (are they too long?)
   - Refresh tokens: 7 days → 3 days (if acceptable)
   - Task lists: 2 minutes → 1 minute (high churn)

3. Check for memory leaks (keys without TTL)
   redis-cli --bigkeys
   # Look for keys that shouldn't exist or have no expiry

4. Evict old data manually (if needed)
   redis-cli SCAN 0 MATCH "task:*:detail" COUNT 1000
   # Identify old keys to delete
   redis-cli DEL task:old123:detail

5. Upgrade to larger Redis instance (Stage 2+: ElastiCache)
```

---

### Issue 2: High Latency

**Symptoms:**
```
- API response times increasing
- Redis ping > 5ms (should be < 1ms for localhost, < 5ms for ElastiCache)
- Timeouts in application
```

**Diagnosis:**
```bash
# Check Redis latency
redis-cli --latency

# Output: min: 0, max: 5, avg: 1.2 (good)
# If avg > 5: Problem detected

# Check slow queries
redis-cli SLOWLOG GET 10

# Check CPU usage
redis-cli INFO cpu

# Check network (for ElastiCache)
ping your-redis-host.cache.amazonaws.com
```

**Solutions:**
```
1. Optimize slow queries
   - Avoid KEYS * command (use SCAN instead)
   - Avoid large hashes (split into smaller hashes)
   - Use pipelines for batch operations

2. Check network latency (ElastiCache)
   - Ensure EC2 and ElastiCache in same region
   - Use VPC endpoint (avoid public internet)
   - Check for network congestion

3. Upgrade Redis instance (more CPU = faster processing)
   - Stage 1: t3.large → t3.xlarge (if CPU bottleneck)
   - Stage 2+: cache.t3.medium → cache.r6g.large

4. Enable cluster mode (distribute load across shards)
   - See Stage 3 configuration above
```

---

### Issue 3: Connection Issues

**Symptoms:**
```
- Application errors: "ECONNREFUSED" or "ETIMEDOUT"
- Redis-cli cannot connect
- High number of connected clients
```

**Diagnosis:**
```bash
# Check Redis status
redis-cli ping
# Expected: PONG
# If error: Redis is down or unreachable

# Check connected clients
redis-cli INFO clients

# Output example:
# connected_clients:250
# blocked_clients:5
# rejected_connections:0

# Check if Redis is running (Docker)
docker ps | grep redis

# Check logs (Docker)
docker logs task-mgmt-redis
```

**Solutions:**
```
1. Restart Redis (Docker)
   docker restart task-mgmt-redis

2. Check security groups (ElastiCache)
   - Ensure EC2 SG is allowed in ElastiCache SG
   - Check port 6379 is open

3. Increase maxclients (if hitting limit)
   redis-cli CONFIG SET maxclients 10000
   # Default is 10,000 (usually sufficient)

4. Check for connection leaks in application
   - Ensure Redis connections are closed properly
   - Use connection pooling (ioredis handles this)

5. Enable reconnect logic in application
   - ioredis has built-in reconnection
   - Verify retryStrategy is configured
```

---

### Issue 4: BullMQ Jobs Stuck

**Symptoms:**
```
- Queue depth increasing
- Jobs not being processed
- BullMQ worker logs show connection errors
```

**Diagnosis:**
```bash
# Check Redis connection (BullMQ uses Redis)
redis-cli ping

# Check queue status
redis-cli LRANGE bull:task-reminders-queue:wait 0 -1
redis-cli LRANGE bull:task-reminders-queue:active 0 -1
redis-cli LRANGE bull:task-reminders-queue:delayed 0 -1

# Check for failed jobs
redis-cli LRANGE bull:task-reminders-queue:failed 0 -1

# Check Redis memory (OOM prevents job processing)
redis-cli INFO memory
```

**Solutions:**
```
1. Restart BullMQ workers
   - Kill worker processes
   - Restart application (workers reconnect on startup)

2. Clear stuck jobs (if safe to lose them)
   redis-cli DEL bull:task-reminders-queue:wait
   redis-cli DEL bull:task-reminders-queue:active
   redis-cli DEL bull:task-reminders-queue:delayed

3. Check Redis connection in worker config
   - Ensure BullMQ connects to correct Redis endpoint
   - Verify password is correct

4. Increase worker concurrency
   const worker = new Worker('queue-name', processor, {
     concurrency: 20, // Default is 10
   });

5. Check for job processing errors (review worker logs)
```

---

### Issue 5: Replication Lag (Stage 2+)

**Symptoms:**
```
- Replica not in sync with primary
- Reads from replica return stale data
- Failover takes longer than expected
```

**Diagnosis:**
```bash
# Check replication status
redis-cli INFO replication

# Output example:
# role:master
# connected_slaves:1
# slave0:ip=10.0.1.2,state=online,offset=123456,lag=0

# lag > 5 seconds indicates problem

# Check replica directly
redis-cli -h replica-host -p 6379 INFO replication

# Output example:
# role:slave
# master_host:10.0.1.1
# master_port:6379
# master_link_status:up
# master_last_io_seconds_ago:1
```

**Solutions:**
```
1. Check network between primary and replica
   ping replica-host
   # Latency should be < 1ms (same AZ) or < 5ms (cross-AZ)

2. Restart replica (if replication broken)
   - ElastiCache: Automatic (AWS handles)
   - Docker: docker restart redis-replica

3. Check primary load (high load causes lag)
   redis-cli INFO cpu
   # If CPU > 80%, consider upgrading instance

4. Reduce write volume (if overwhelming replication)
   - Batch writes (pipelines)
   - Offload writes to BullMQ (async processing)

5. Enable cluster mode (Stage 3+, distributes writes across shards)
```

---

-date-month-last two digit of year: 12-04-26
