# Horizontal Scaling Strategy - Mastery Guide

**Version:** 1.0  
**Date:** 30-03-26  
**Level:** Senior Engineering / System Architecture  
**Prerequisites:** SCALABILITY_COMPARISON.md, REDIS_CACHING_DEEP_DIVE.md

---

## Table of Contents

1. [Vertical vs Horizontal Scaling](#vertical-vs-horizontal-scaling)
2. [Stateless Architecture Design](#stateless-architecture-design)
3. [Load Balancing Strategies](#load-balancing-strategies)
4. [Session Management at Scale](#session-management-at-scale)
5. [Database Scaling](#database-scaling)
6. [Redis Clustering](#redis-clustering)
7. [Queue Scaling](#queue-scaling)
8. [Auto-Scaling Strategies](#auto-scaling-strategies)
9. [Deployment Architecture](#deployment-architecture)
10. [Multi-Region Deployment](#multi-region-deployment)

---

## Vertical vs Horizontal Scaling

### Vertical Scaling (Scale Up)

```
Definition: Add more resources to existing server

Example Progression:

Server 1 (Startup - 1K users):
├── CPU: 2 vCPU
├── RAM: 4GB
├── Cost: $40/month
└── Capacity: 1,000 concurrent users

Server 2 (Growth - 10K users):
├── CPU: 4 vCPU
├── RAM: 8GB
├── Cost: $80/month
└── Capacity: 10,000 concurrent users

Server 3 (Scale - 50K users):
├── CPU: 8 vCPU
├── RAM: 16GB
├── Cost: $160/month
└── Capacity: 50,000 concurrent users

Server 4 (Max - 100K users):
├── CPU: 16 vCPU
├── RAM: 32GB
├── Cost: $320/month
└── Capacity: 100,000 concurrent users

Limitations:
├── Hardware ceiling (max ~64 vCPU, 1TB RAM)
├── Single point of failure
├── Downtime during upgrade
├── Cost increases exponentially
└── No redundancy
```

### Horizontal Scaling (Scale Out)

```
Definition: Add more servers

Example Progression:

Phase 1 (Startup - 1K users):
├── Servers: 1
├── Each: 2 vCPU, 4GB
├── Total Cost: $40/month
└── Capacity: 1,000 users

Phase 2 (Growth - 10K users):
├── Servers: 5
├── Each: 2 vCPU, 4GB
├── Total Cost: $200/month
└── Capacity: 50,000 users

Phase 3 (Scale - 100K users):
├── Servers: 10
├── Each: 2 vCPU, 4GB
├── Total Cost: $400/month
└── Capacity: 500,000 users

Phase 4 (Hyper - 500K users):
├── Servers: 50
├── Each: 2 vCPU, 4GB
├── Total Cost: $2,000/month
└── Capacity: 2,500,000 users

Advantages:
├── Linear scaling (add server = add capacity)
├── No downtime (add/remove servers dynamically)
├── Redundancy (server failure = minor impact)
├── Cost increases linearly
└── Geographic distribution possible
```

### Comparison Matrix

```
┌─────────────────────────────────────────────────────────┐
│  Scaling Comparison                                     │
├─────────────────────────────────────────────────────────┤
│  Factor              │  Vertical   │  Horizontal       │
├─────────────────────────────────────────────────────────┤
│  Max Capacity        │  ~100K      │  Unlimited        │
│  Cost Efficiency     │  Good       │  Better           │
│  Redundancy          │  None       │  Built-in         │
│  Downtime            │  Required   │  Zero             │
│  Complexity          │  Low        │  Medium           │
│  Failure Impact      │  100%       │  1/N              │
│  Geographic Reach    │  Single     │  Multi-region     │
└─────────────────────────────────────────────────────────┘

Recommendation:
├── Start with vertical (simpler, cheaper initially)
├── Switch to horizontal at ~10K users
└── Hybrid approach for optimal cost/performance
```

---

## Stateless Architecture Design

### Why Statelessness Matters

```
Stateful Server (OLD Architecture):

┌─────────────────────────────────────────────────────────┐
│  Server 1                                               │
│  ┌─────────────────────────────────────────┐           │
│  │  User Sessions (in-memory)              │           │
│  │  - user123: { cart: [...], prefs: {} }  │           │
│  │  - user456: { cart: [...], prefs: {} }  │           │
│  └─────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘

Problem: User must always hit same server
├── Load balancer needs sticky sessions
├── Server failure = session loss
├── Cannot scale dynamically
└── Deployment requires draining

---

Stateless Server (NEW Architecture):

┌─────────────────────────────────────────────────────────┐
│  Server 1                    │  Server 2               │
│  ┌────────────────────────┐  │  ┌───────────────────┐  │
│  │  No in-memory state    │  │  │  No in-memory     │  │
│  │  (request context only)│  │  │  state            │  │
│  └────────────────────────┘  │  └───────────────────┘  │
└──────────────────────────────┴─────────────────────────┘
              │                           │
              └───────────┬───────────────┘
                          │
              ┌───────────▼───────────────┐
              │   Redis (Shared State)    │
              │   - Sessions              │
              │   - Cache                 │
              │   - Rate limits           │
              └───────────────────────────┘

Benefits:
├── Any server can handle any request
├── Load balancer: Round-robin (simple)
├── Server failure: No impact (state in Redis)
├── Scale up/down: Instant
└── Deployment: Rolling (zero downtime)
```

### Implementing Statelessness

```typescript
// ❌ STATEFUL: In-memory session storage
const sessions = new Map<string, Session>();

app.post('/login', (req, res) => {
  const session = createSession(user);
  sessions.set(session.id, session);  // In-memory!
  res.cookie('sessionId', session.id);
});

// Problem: Session lost if server restarts
// Problem: User must hit same server

// ✅ STATELESS: Redis session storage
import { redisClient } from './helpers/redis';

app.post('/login', async (req, res) => {
  const session = createSession(user);
  
  // Store in Redis (shared across all servers)
  await redisClient.setEx(
    `session:${session.id}`,
    7 * 24 * 60 * 60,  // 7 days
    JSON.stringify(session)
  );
  
  res.cookie('sessionId', session.id);
});

// Any server can retrieve session
app.get('/profile', async (req, res) => {
  const sessionId = req.cookies.sessionId;
  const session = await redisClient.get(`session:${sessionId}`);
  // Works on ANY server ✅
});
```

### Stateless Design Patterns

```typescript
// Pattern 1: Request Context (not stored)
class RequestContext {
  userId: string;
  requestId: string;
  timestamp: number;
  
  constructor(req: Request) {
    this.userId = req.user?.id;
    this.requestId = req.headers['x-request-id'];
    this.timestamp = Date.now();
  }
  // Context exists only for request duration
  // No persistence needed
}

// Pattern 2: Externalized State
class NotificationService {
  // ❌ BAD: In-memory cache
  private cache = new Map<string, Notification>();
  
  // ✅ GOOD: Redis cache
  async getNotification(id: string): Promise<Notification> {
    const cached = await redisClient.get(`notification:${id}`);
    if (cached) return JSON.parse(cached);
    
    const notification = await db.findById(id);
    await redisClient.setEx(
      `notification:${id}`,
      1800,  // 30 min
      JSON.stringify(notification)
    );
    return notification;
  }
}

// Pattern 3: Idempotent Operations
class PaymentService {
  // ✅ Idempotent: Safe to retry on any server
  async processPayment(params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<Payment> {
    // Check if already processed (in DB)
    const existing = await Payment.findOne({
      idempotencyKey: params.idempotencyKey
    });
    
    if (existing) return existing;  // Already done
    
    // Process payment
    const payment = await createPayment(params);
    return payment;
  }
  // Can be called on any server, any number of times
  // Result is always the same
}
```

---

## Load Balancing Strategies

### Layer 4 Load Balancing (TCP/UDP)

```
Architecture:

                    ┌──────────────┐
                    │  NLB (AWS)   │
                    │  Layer 4     │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ Server 1│      │ Server 2│      │ Server 3│
    │  :3000  │      │  :3000  │      │  :3000  │
    └─────────┘      └─────────┘      └─────────┘

How it works:
├── Operates at TCP level
├── Forwards packets based on IP:port
├── No HTTP awareness
└── Fastest option (microseconds)

Use cases:
├── WebSocket connections
├── Database connections
└── High-throughput APIs

Limitations:
└── Cannot route based on URL, headers, etc.
```

### Layer 7 Load Balancing (HTTP)

```
Architecture:

                    ┌──────────────┐
                    │  ALB (AWS)   │
                    │  Layer 7     │
                    │  / NGINX     │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐
    │ Server 1│      │ Server 2│      │ Server 3│
    │  :3000  │      │  :3000  │      │  :3000  │
    └─────────┘      └─────────┘      └─────────┘

How it works:
├── Operates at HTTP level
├── Routes based on URL, headers, method
├── Can do SSL termination
└── Slower than L4 (milliseconds)

Routing Rules:

# Path-based routing
/api/v1/users/*     → User Service (Servers 1-3)
/api/v1/tasks/*     → Task Service (Servers 4-6)
/api/v1/notify/*    → Notification Service (Servers 7-9)

# Header-based routing
X-API-Version: v2   → New servers (10-12)
X-API-Version: v1   → Old servers (1-3)

# Weight-based routing (canary deployment)
90% traffic         → Stable version (Servers 1-9)
10% traffic         → New version (Servers 10-12)
```

### Load Balancing Algorithms

```typescript
// Algorithm 1: Round Robin (Default)
// Simple, works well for homogeneous servers

Request 1 → Server 1
Request 2 → Server 2
Request 3 → Server 3
Request 4 → Server 1
// ...cycles through

// Algorithm 2: Least Connections
// Routes to server with fewest active connections

Server 1: 50 active connections
Server 2: 20 active connections  ← Next request goes here
Server 3: 35 active connections

// Best for: Long-lived connections (WebSocket)

// Algorithm 3: IP Hash
// Same client IP → same server (sticky sessions)

Client IP 192.168.1.1 → hash → Server 2
Client IP 192.168.1.2 → hash → Server 1

// Best for: When some state is local (avoid if possible)

// Algorithm 4: Weighted Round Robin
// Different server capacities

Server 1 (2 vCPU): Weight 2 → Gets 2x requests
Server 2 (4 vCPU): Weight 4 → Gets 4x requests
Server 3 (2 vCPU): Weight 2 → Gets 2x requests

// Best for: Heterogeneous server fleet
```

### NGINX Configuration

```nginx
# /etc/nginx/nginx.conf

upstream notification_api {
    least_conn;  # Algorithm
    
    server 10.0.1.1:3000 weight=2;  # More powerful
    server 10.0.1.2:3000 weight=2;
    server 10.0.1.3:3000 weight=1;  # Less powerful
    
    keepalive 32;  # Connection pooling
}

server {
    listen 80;
    server_name api.example.com;
    
    location /api/v1/notifications {
        proxy_pass http://notification_api;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Request-ID $request_id;
        
        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Health checks
        proxy_next_upstream error timeout http_500 http_502 http_503;
        proxy_next_upstream_tries 3;
    }
}
```

---

## Session Management at Scale

### Redis Session Storage

```typescript
import { redisClient } from './helpers/redis';

interface Session {
  userId: string;
  email: string;
  role: string;
  deviceId: string;
  createdAt: number;
  lastActive: number;
}

class SessionService {
  private sessionTTL = 7 * 24 * 60 * 60;  // 7 days
  
  /**
   * Create session (login)
   */
  async createSession(
    userId: string,
    userData: Partial<Session>,
    deviceId: string
  ): Promise<string> {
    const sessionId = this.generateSessionId();
    const session: Session = {
      userId,
      email: userData.email!,
      role: userData.role!,
      deviceId,
      createdAt: Date.now(),
      lastActive: Date.now(),
    };
    
    // Store in Redis
    await redisClient.setEx(
      `session:${sessionId}`,
      this.sessionTTL,
      JSON.stringify(session)
    );
    
    // Track user's sessions (for multi-device)
    await redisClient.sAdd(
      `user:${userId}:sessions`,
      sessionId
    );
    
    return sessionId;
  }
  
  /**
   * Get session (authenticate request)
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const data = await redisClient.get(`session:${sessionId}`);
    if (!data) return null;
    
    const session = JSON.parse(data);
    
    // Update last active (async, don't wait)
    this.updateLastActive(sessionId);
    
    return session;
  }
  
  /**
   * Destroy session (logout)
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;
    
    // Remove from user's session set
    await redisClient.sRem(
      `user:${session.userId}:sessions`,
      sessionId
    );
    
    // Delete session
    await redisClient.del(`session:${sessionId}`);
  }
  
  /**
   * Logout from all devices
   */
  async logoutAllDevices(userId: string): Promise<void> {
    const sessionIds = await redisClient.sMembers(
      `user:${userId}:sessions`
    );
    
    if (sessionIds.length === 0) return;
    
    // Delete all sessions
    const keys = sessionIds.map(id => `session:${id}`);
    await redisClient.del(keys);
    await redisClient.del(`user:${userId}:sessions`);
  }
  
  /**
   * Update last active timestamp
   */
  private async updateLastActive(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    const data = await redisClient.get(key);
    if (!data) return;
    
    const session = JSON.parse(data);
    session.lastActive = Date.now();
    
    // Update with remaining TTL
    await redisClient.setEx(key, this.sessionTTL, JSON.stringify(session));
  }
  
  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Session Security

```typescript
class SessionSecurity {
  /**
   * Implement session rotation on sensitive actions
   */
  async rotateSession(oldSessionId: string): Promise<string> {
    const oldSession = await getSession(oldSessionId);
    if (!oldSession) throw new Error('Invalid session');
    
    // Create new session with same data
    const newSessionId = await createSession(
      oldSession.userId,
      oldSession,
      oldSession.deviceId
    );
    
    // Destroy old session
    await destroySession(oldSessionId);
    
    return newSessionId;
  }
  
  /**
   * Detect session hijacking
   */
  async detectHijacking(
    sessionId: string,
    currentIP: string,
    currentUserAgent: string
  ): Promise<boolean> {
    const session = await getSession(sessionId);
    if (!session) return false;
    
    const key = `session:${sessionId}:fingerprint`;
    const fingerprint = await redisClient.get(key);
    
    if (!fingerprint) {
      // First request with this session - set fingerprint
      const newFingerprint = JSON.stringify({
        ip: currentIP,
        userAgent: currentUserAgent,
        timestamp: Date.now(),
      });
      await redisClient.setEx(key, 3600, newFingerprint);
      return false;
    }
    
    const parsed = JSON.parse(fingerprint);
    
    // Check for significant changes (possible hijacking)
    const ipChanged = parsed.ip !== currentIP;
    const uaChanged = parsed.userAgent !== currentUserAgent;
    const timeSinceUpdate = Date.now() - parsed.timestamp;
    
    // Alert if both IP and UA change within short time
    if (ipChanged && uaChanged && timeSinceUpdate < 300000) {  // 5 min
      logger.warn('Possible session hijacking detected!', {
        sessionId,
        oldIP: parsed.ip,
        newIP: currentIP,
      });
      
      // Invalidate session
      await destroySession(sessionId);
      return true;
    }
    
    return false;
  }
}
```

---

## Database Scaling

### Read Replicas

```
Architecture:

┌─────────────────────────────────────────────────────────┐
│  MongoDB Replica Set                                    │
└─────────────────────────────────────────────────────────┘

         ┌─────────────────┐
         │   PRIMARY       │  ← All writes go here
         │   (Read/Write)  │
         │   10.0.1.1      │
         └────────┬────────┘
                  │
         ┌────────┼────────┐
         │        │        │
    ┌────▼────┐ ┌─▼───────┐ ┌─▼───────┐
    │Secondary│ │Secondary│ │Secondary│
    │(Read)   │ │(Read)   │ │(Read)   │
    │10.0.2.1 │ │10.0.2.2 │ │10.0.2.3 │
    └─────────┘ └─────────┘ └─────────┘

Read Distribution:
├── Primary: 25% of reads (default)
├── Secondaries: 75% of reads
└── Write capacity: Primary only

Configuration:

mongoose.connect(uri, {
  readPreference: 'secondaryPreferred',  // Read from replicas
  writeConcern: { w: 'majority' },  // Write to majority
});

// Force read from primary for critical data
const user = await User.findById(id).read('primary');

// Read from secondary for non-critical (faster)
const notifications = await Notification.find({ userId })
  .read('secondary');
```

### Sharding

```
When to Shard:
├── Collection size > 100GB
├── Write throughput > 20K ops/sec
├── Read throughput > 100K ops/sec
└── Working set > RAM

Shard Key Selection:

// ❌ BAD: Monotonically increasing (hotspot)
{ createdAt: 1 }
// All writes go to newest shard → Hotspot

// ❌ BAD: Low cardinality (uneven distribution)
{ status: 1 }
// Only 3 values → Poor distribution

// ✅ GOOD: High cardinality, frequent in queries
{ userId: 'hashed' }
// Even distribution, queries include userId

// ✅ GOOD: Compound shard key
{ userId: 1, createdAt: -1 }
// Range queries on createdAt within userId

Sharding Commands:

// Enable sharding
sh.enableSharding('taskdb');

// Shard collection
sh.shardCollection('taskdb.notifications', {
  receiverId: 'hashed'
});

// Check distribution
db.notifications.getShardDistribution();
```

---

## Redis Clustering

### Redis Cluster Architecture

```
Redis Cluster (6 nodes):

┌─────────────────────────────────────────────────────────┐
│  Master Nodes (3)           │  Replica Nodes (3)       │
├─────────────────────────────┤──────────────────────────┤
│  Master 1: Slots 0-5460     │  Replica 1 → Master 1    │
│  10.0.1.1:6379              │  10.0.2.1:6379           │
│                             │                          │
│  Master 2: Slots 5461-10922 │  Replica 2 → Master 2    │
│  10.0.1.2:6379              │  10.0.2.2:6379           │
│                             │                          │
│  Master 3: Slots 10923-16383│  Replica 3 → Master 3    │
│  10.0.1.3:6379              │  10.0.2.3:6379           │
└─────────────────────────────┴──────────────────────────┘

How it works:
├── 16384 hash slots total
├── Keys distributed by CRC16(key) % 16384
├── Masters handle reads/writes
├── Replicas provide failover
└── Automatic failover on master failure

Client Configuration:

import { createCluster } from 'redis';

const cluster = createCluster({
  rootNodes: [
    { url: 'redis://10.0.1.1:6379' },
    { url: 'redis://10.0.1.2:6379' },
    { url: 'redis://10.0.1.3:6379' },
  ],
  defaults: {
    password: process.env.REDIS_PASSWORD,
  },
});

await cluster.connect();

// Auto-routes to correct node based on key
await cluster.set('session:abc123', data);  // Goes to Master 1
await cluster.get('notification:xyz789');   // Goes to Master 2
```

---

## Queue Scaling

### Multiple Workers

```
Architecture:

┌─────────────────────────────────────────────────────────┐
│  BullMQ Queue: 'notifications'                          │
└─────────────────────────────────────────────────────────┘
              │
              │ (Redis)
              │
    ┌─────────┼─────────┬─────────┬─────────┐
    │         │         │         │         │
┌───▼───┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐ ┌──▼────┐
│Worker1│ │Worker2│ │Worker3│ │Worker4│ │Worker5│
│ 10.0.3│ │ 10.0.3│ │ 10.0.3│ │ 10.0.3│ │ 10.0.3│
│  .1   │ │  .2   │ │  .3   │ │  .4   │ │  .5   │
└───────┘ └───────┘ └───────┘ └───────┘ └───────┘

Each worker:
├── concurrency: 10
├── Processes jobs independently
└── BullMQ distributes automatically

Total capacity:
├── 5 workers × 10 concurrency = 50 concurrent jobs
├── Add more workers to scale
└── Remove workers to scale down

Auto-Scaling Workers:

// Monitor queue depth
const queueDepth = await notificationQueue.getWaitingCount();

if (queueDepth > 1000) {
  // Scale up: Add 2 workers
  await scaleWorkers(2);
} else if (queueDepth < 100) {
  // Scale down: Remove 1 worker
  await scaleWorkers(-1);
}
```

---

## Auto-Scaling Strategies

### Kubernetes HPA (Horizontal Pod Autoscaler)

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: notification-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
```

### AWS Auto Scaling

```
Auto Scaling Group Configuration:

┌─────────────────────────────────────────────────────────┐
│  Auto Scaling Group: notification-api-asg               │
├─────────────────────────────────────────────────────────┤
│  Min Capacity: 3                                        │
│  Max Capacity: 50                                       │
│  Desired Capacity: 10                                   │
│                                                         │
│  Scaling Policies:                                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Scale Up: CPU > 70% for 5 min                   │   │
│  │   → Add 2 instances                             │   │
│  │                                                 │   │
│  │ Scale Down: CPU < 30% for 10 min                │   │
│  │   → Remove 1 instance                           │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

Scaling Timeline:

T+0:00  CPU spikes to 75%
T+0:05  Alarm triggers (5 min average > 70%)
T+0:06  Auto Scaling launches 2 instances
T+0:08  Instances healthy, added to load balancer
T+0:10  Traffic distributed to new instances
T+0:15  CPU drops to 50%

T+2:00  CPU drops to 25%
T+2:10  Alarm triggers (10 min average < 30%)
T+2:11  Auto Scaling terminates 1 instance
T+2:15  Traffic redistributed
```

---

## Deployment Architecture

### Production Architecture (100K Users)

```
┌─────────────────────────────────────────────────────────┐
│  Global Architecture                                    │
└─────────────────────────────────────────────────────────┘

                    ┌─────────────────┐
                    │  CloudFlare CDN │
                    │  (DDoS protect) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  AWS ALB        │
                    │  (L7 LB)        │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │  API    │        │  API    │        │  API    │
    │ Servers │        │ Servers │        │ Servers │
    │   x10   │        │   x10   │        │   x10   │
    │ AZ-1    │        │ AZ-2    │        │ AZ-3    │
    └────┬────┘        └────┬────┘        └────┬────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
    │ MongoDB │        │ MongoDB │        │ MongoDB │
    │ Primary │        │Secondary│        │Secondary│
    │  AZ-1   │        │  AZ-2   │        │  AZ-3   │
    └─────────┘        └─────────┘        └─────────┘
    
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ Redis Cache │   │ Redis Cache │   │ Redis Cache │
    │   Master    │   │   Replica   │   │   Replica   │
    └─────────────┘   └─────────────┘   └─────────────┘

Components:
├── 30 API servers (3 AZs × 10)
├── MongoDB replica set (3 nodes)
├── Redis cluster (1 master, 2 replicas)
├── Load balancer (multi-AZ)
└── CDN for static assets

Capacity:
├── 30 servers × 10,000 users/server = 300,000 users
├── Auto-scaling to 50 servers = 500,000 users
└── Multi-region for 1M+ users
```

---

## Multi-Region Deployment

### Active-Passive (Disaster Recovery)

```
┌─────────────────────────────────────────────────────────┐
│  Primary Region (us-east-1)      │  DR Region (us-west-2)│
├──────────────────────────────────┤──────────────────────┤
│  ✅ Active (100% traffic)        │  ⏸️ Passive (0%)     │
│  - 30 API servers                │  - 5 API servers     │
│  - MongoDB primary               │  - MongoDB secondary │
│  - Redis master                  │  - Redis replica     │
│                                  │                      │
│  MongoDB: Async replication ───────────────────────────→│
│  Redis: Async replication ─────────────────────────────→│
│  S3: Cross-region replication ─────────────────────────→│
└──────────────────────────────────┴──────────────────────┘

Failover Process:
1. Detect primary region failure
2. Update DNS to point to DR region
3. Promote MongoDB secondary to primary
4. Promote Redis replica to master
5. Scale up DR servers
6. Traffic now flows to DR region

RTO (Recovery Time Objective): < 30 minutes
RPO (Recovery Point Objective): < 5 minutes
```

### Active-Active (High Availability)

```
┌─────────────────────────────────────────────────────────┐
│  Region 1 (us-east-1)          │  Region 2 (eu-west-1) │
├────────────────────────────────┤───────────────────────┤
│  ✅ 50% traffic                │  ✅ 50% traffic       │
│  - 15 API servers              │  - 15 API servers     │
│  - MongoDB arbiter             │  - MongoDB arbiter    │
│  - Redis master                │  - Redis master       │
│                                │                       │
│  ←──────── MongoDB Global Cluster (sharded) ─────────→│
│  ←──────── Redis Cluster (multi-region) ──────────────→│
└────────────────────────────────┴───────────────────────┘

Benefits:
├── Zero downtime during region failure
├── Lower latency (users hit nearest region)
├── Better disaster recovery
└── Compliance (data residency)

Challenges:
├── Data consistency (conflict resolution)
├── Increased complexity
└── Higher cost
```

---

## Conclusion

Horizontal scaling is essential for 100K+ users:

```
Impact Summary:
├── Capacity: Linear scaling (add server = add capacity)
├── Availability: 99.99% (multi-AZ, auto-failover)
├── Latency: Consistent under load
├── Cost: Linear growth ($40/server/month)
└── Flexibility: Scale up/down dynamically
```

**Key Takeaways:**

1. **Stateless Design** - Store state in Redis, not memory
2. **Load Balancing** - Layer 7 for HTTP, Layer 4 for TCP
3. **Session Management** - Redis with TTL and rotation
4. **Database Scaling** - Read replicas, then sharding
5. **Redis Clustering** - For >100GB cache
6. **Queue Scaling** - Multiple workers, auto-scale
7. **Auto-Scaling** - Based on CPU, memory, queue depth
8. **Multi-Region** - Active-passive for DR, active-active for HA

---

**Next Reading:**
- `PERFORMANCE_BENCHMARKING.md` - Load testing strategies
- `FUTURE_SCALABILITY_ROADMAP.md` - Path to 1M+ users

---

**Document Version:** 1.0  
**Last Updated:** 30-03-26  
**Author:** Senior Backend Engineering Team  
**Review Date:** 30-04-26
