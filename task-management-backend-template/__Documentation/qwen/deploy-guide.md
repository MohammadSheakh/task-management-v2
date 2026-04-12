# AWS EC2 Deployment Guide — Production Infrastructure Planning

# Project: Task Management Backend + Frontend

# Last Updated: 12-04-26

# Version: 1.0 — Complete Infrastructure Strategy

---

## 1. SYSTEM ARCHITECTURE OVERVIEW

### 1.1 Services Required

Based on codebase analysis (`serverV2.ts`, `docker-compose.yml`, `package.json`):

| Service | Purpose | Criticality | Resource Intensity |
|---------|---------|-------------|-------------------|
| **Node.js App** | Express.js backend (API + Socket.IO) | Critical | High (CPU + RAM) |
| **MongoDB** | Primary database (Mongoose ODM) | Critical | High (RAM + Disk I/O) |
| **Redis** | Cache, BullMQ queues, Socket.IO adapter, rate limiting, session storage | Critical | High (RAM) |
| **Kafka** | Real-time chat message streaming | Optional (if chat enabled) | Medium (CPU + RAM) |
| **Nginx** | Reverse proxy, load balancer, SSL termination | Critical | Low (CPU) |
| **React/Next.js Frontend** | Dashboard + Admin panel | Critical | Medium (CPU + RAM) |

### 1.2 Current Architecture Analysis

```typescript
// serverV2.ts — Cluster Mode (Line 24)
const numCPUs = config.environment === 'production' ? os.cpus().length : 1;

// This means production uses ALL available CPU cores via Node.js cluster module
```

**Key Findings from Codebase:**
- ✅ Cluster mode enabled (uses all CPU cores)
- ✅ Redis has 3 clients (pub, sub, duplicate for state management)
- ✅ BullMQ workers run in each cluster worker (notification, task reminders, preferred time)
- ✅ Socket.IO with Redis adapter (horizontal scaling ready)
- ✅ Kafka consumer exists but commented out (`startMessageConsumer()` not called in serverV2.ts)
- ⚠️ Dockerfile is dev-oriented (not production-optimized)
- ⚠️ No health check endpoint currently implemented

### 1.3 Redis Usage Intensity

From grep search: **2,587 Redis references** in codebase

**Redis is used for:**
1. **Caching** — User profiles, task details, lists, group metadata
2. **BullMQ Queues** — 5 active queues (notification, task-reminders, preferred-time, conversation-updates, chat-participants)
3. **Socket.IO Adapter** — Cross-worker communication for real-time features
4. **Rate Limiting** — Custom sliding window rate limiter (`rateLimiterRedis.ts`)
5. **Session Management** — JWT refresh tokens, auth sessions
6. **Real-time State** — User online status, room membership tracking
7. **Distributed Locks** — Cron job coordination (future use)

**Conclusion:** Redis is **THE MOST CRITICAL** infrastructure after MongoDB. Must be sized correctly.

---

## 2. INFRASTRUCTURE DECISION: EC2 vs Fargate vs Managed Services

### 2.1 Recommendation: Hybrid Approach

For your scale targets (100K concurrent users, 10M tasks), **DO NOT put everything on one EC2 instance**.

**Recommended Architecture:**

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Infrastructure                    │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  EC2 App     │    │  EC2 App     │  ← Auto Scaling   │
│  │  Server(s)   │    │  Server(s)   │    Group (2-10)   │
│  │  (Backend +  │    │  (Backend +  │                   │
│  │   Frontend)  │    │   Frontend)  │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                            │
│         └────────┬──────────┘                            │
│                  │                                       │
│           ┌──────▼──────┐                               │
│           │   Nginx LB  │  ← Single EC2 or ALB          │
│           └──────┬──────┘                               │
│                  │                                       │
│         ┌────────▼────────┐                             │
│         │  AWS ALB/NLB    │  ← Application Load Balancer│
│         └────────┬────────┘                             │
│                  │                                       │
│     ┌────────────┼────────────┐                         │
│     │            │            │                          │
│  ┌──▼──┐    ┌───▼────┐   ┌──▼────┐                     │
│  │MongoDB│   │ Redis  │   │ Kafka │                     │
│  │Atlas  │   │ElastiC │   │(MSK)  │                     │
│  │(Mngd) │   │ache    │   │or EC2)│                     │
│  └───────┘   └────────┘   └───────┘                     │
└─────────────────────────────────────────────────────────┘
```

**Why NOT single EC2?**
- ❌ Single point of failure (violates 99.9% uptime target)
- ❌ Cannot scale independently (app vs DB vs cache)
- ❌ Resource contention (MongoDB + Redis + Node.js compete for RAM)
- ❌ No auto-scaling capability
- ❌ Backup/restore complexity

### 2.2 Service Placement Strategy

| Component | Where to Run | Why |
|-----------|--------------|-----|
| **Node.js Backend** | EC2 Auto Scaling Group (2+ instances) | Stateless, scales horizontally |
| **React/Next.js Frontend** | Same EC2 instances (initial stage) OR S3 + CloudFront | Cost-effective initially |
| **MongoDB** | **MongoDB Atlas** (Managed) OR EC2 with replica set | Managed = less ops overhead |
| **Redis** | **ElastiCache** (Managed) OR EC2 | Managed = automatic failover |
| **Kafka** | **MSK** (Managed) OR skip if chat not critical | Optional for MVP |
| **Nginx** | EC2 (single instance) OR AWS ALB | ALB = fully managed |
| **File Storage** | **S3** (external) | Never store files on EC2 |

---

## 3. INFRASTRUCTURE STAGES — SCALING ROADMAP

### STAGE 1: MVP / LAUNCH (0-1,000 Concurrent Users)

**Timeline:** Months 1-3
**Goal:** Validate product, minimize costs, maintain ability to scale

#### 3.1.1 Architecture — Single EC2 Instance

```
┌──────────────────────────────────────────┐
│         Single EC2 Instance               │
│                                           │
│  ┌─────────────────────────────────────┐ │
│  │  Nginx (Reverse Proxy + SSL)        │ │
│  └──────────┬──────────────────────────┘ │
│             │                             │
│      ┌──────┴──────┐                     │
│      │             │                      │
│  ┌───▼────┐   ┌───▼────┐                │
│  │Backend │   │Frontend│                │
│  │Node.js │   │React/  │                │
│  │:6730   │   │Next.js │                │
│  │        │   │:3000   │                │
│  └───┬────┘   └────────┘                │
│      │                                   │
│  ┌───▼────────────────────┐             │
│  │  Docker Compose:       │             │
│  │  - Redis (:6379)       │             │
│  │  - Kafka (optional)    │             │
│  └────────────────────────┘             │
│                                          │
│  External: MongoDB Atlas (free tier)    │
└──────────────────────────────────────────┘
```

#### 3.1.2 EC2 Instance Specification

| Specification | Value | Rationale |
|---------------|-------|-----------|
| **Instance Type** | **t3.large** | 2 vCPU, 8 GB RAM — sweet spot for cost/performance |
| **vCPUs** | 2 | Node.js cluster uses all cores; 2 cores = 2 workers |
| **RAM** | 8 GB | Sufficient for app (2GB) + Redis (1GB) + Frontend (1GB) + buffer (4GB) |
| **Storage** | 50 GB gp3 (EBS) | OS (10GB) + app (5GB) + logs (10GB) + buffer (25GB) |
| **OS** | Ubuntu 22.04 LTS | Well-supported, familiar ecosystem |
| **Architecture** | x86_64 (AMD64) | Better Node.js performance than ARM for this use case |

**Memory Allocation on t3.large (8 GB total):**
- Node.js app (cluster mode): 2 GB (maxOldSpaceSize per worker: 1 GB × 2 workers)
- Redis (Docker): 1.5 GB (maxmemory setting)
- React/Next.js frontend: 1 GB
- Nginx + OS: 0.5 GB
- Buffer/overhead: 3 GB

**DO NOT use t3.micro or t3.small:**
- ❌ t3.micro (1 vCPU, 1 GB RAM): Cannot run cluster mode, Redis will OOM
- ❌ t3.small (2 vCPU, 2 GB RAM): Insufficient RAM for production workload
- ⚠️ t3.medium (2 vCPU, 4 GB RAM): Marginal — will struggle under load

#### 3.1.3 External Services

| Service | Plan | Cost/Month | Notes |
|---------|------|------------|-------|
| **MongoDB Atlas** | M10 Shared (2 GB RAM) | ~$60 | 3-node replica set, automated backups |
| **AWS S3** | Standard | ~$5-10 | File uploads, static assets |
| **Cloudflare** | Free tier | $0 | CDN, DDoS protection, SSL |
| **Route 53** | Hosted zone | $0.50 | DNS management |
| **AWS SES** | Pay-per-use | ~$1-5 | Email (SMTP replacement) |

#### 3.1.4 Monthly Cost Breakdown — Stage 1

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 t3.large** | On-demand, us-east-1 | **$60.76** |
| **EBS gp3 (50 GB)** | $0.08/GB | **$4.00** |
| **Data Transfer** | 1 TB out (avg) | **$90.00** |
| **MongoDB Atlas M10** | 3-node replica | **$60.00** |
| **S3 Storage** | 10 GB + requests | **$5.00** |
| **Route 53** | 1 hosted zone | **$0.50** |
| **Total** | | **~$220/month** |

**Cost Optimization Options:**
- **1-year Reserved Instance**: Save 40% on EC2 → **$36/month** (total ~$195/month)
- **MongoDB Atlas M0** (free tier): For testing only (512 MB limit, not production-ready)
- **Spot Instance**: NOT recommended (can terminate anytime, breaks uptime target)

#### 3.1.5 When to Scale to Stage 2

**Triggers (any one):**
- CPU utilization > 70% sustained (CloudWatch alarm)
- RAM usage > 80% sustained
- API response time (p95) > 200ms for GET endpoints
- Redis memory usage > 70% of maxmemory
- Concurrent users > 1,000
- Database connection pool saturation (> 40 of 50 connections)

**Monitoring Setup:**
```bash
# CloudWatch Alarms to Create:
- CPUUtilization > 70% for 5 minutes
- MemoryUtilization > 80% for 5 minutes (requires custom metric)
- DatabaseConnections > 40
- Redis UsedMemory > 1.2 GB
- TargetResponseTime (ALB) > 200ms
```

---

### STAGE 2: GROWTH (1,000-10,000 Concurrent Users)

**Timeline:** Months 3-9
**Goal:** Improve reliability, separate concerns, prepare for scale

#### 3.2.1 Architecture — Split Services

```
┌──────────────────────────────────────────────────┐
│              AWS Infrastructure                   │
│                                                    │
│  ┌──────────────┐      ┌──────────────┐          │
│  │  EC2 App #1  │      │  EC2 App #2  │          │
│  │  t3.large    │      │  t3.large    │          │
│  │  Backend +   │      │  Backend +   │          │
│  │  Frontend    │      │  Frontend    │          │
│  └──────┬───────┘      └──────┬───────┘          │
│         │                     │                   │
│         └──────────┬──────────┘                   │
│                    │                              │
│             ┌──────▼──────┐                      │
│             │  AWS ALB    │  ← Application Load  │
│             │  (Managed)  │    Balancer           │
│             └──────┬──────┘                      │
│                    │                              │
│         ┌──────────┼──────────┐                  │
│         │          │          │                   │
│  ┌──────▼──┐  ┌───▼────┐  ┌──▼──────┐           │
│  │MongoDB  │  │ Redis  │  │  S3     │           │
│  │Atlas    │  │Elasti  │  │ (Files) │           │
│  │M10/M20  │  │Cache   │  │         │           │
│  └─────────┘  └────────┘  └─────────┘           │
└──────────────────────────────────────────────────┘
```

**Key Changes from Stage 1:**
1. ✅ **2 EC2 instances** behind ALB (high availability)
2. ✅ **AWS ALB** replaces Nginx as load balancer (managed, auto-scaling)
3. ✅ **ElastiCache Redis** (managed, automatic failover)
4. ✅ **MongoDB Atlas upgraded** to M20 if needed
5. ⚠️ Kafka still on EC2 (optional, only if chat is active)

#### 3.2.2 EC2 Instance Specifications (×2)

| Specification | Value | Rationale |
|---------------|-------|-----------|
| **Instance Type** | **t3.large** (×2) | Same as Stage 1, but now 2 instances |
| **Count** | 2 | Minimum for high availability |
| **Auto Scaling** | Min: 2, Max: 4 | Scale based on CPU > 60% |
| **Availability Zones** | us-east-1a, us-east-1b | Survive AZ failure |
| **Storage** | 50 GB gp3 each | Same as Stage 1 |

**Why still t3.large?**
- At this stage, bottleneck is usually **database**, not app servers
- Adding more app servers (horizontal scale) is better than vertical scale
- Each instance handles ~5,000 concurrent users easily with proper caching

#### 3.2.3 Managed Services Specifications

**AWS ElastiCache Redis:**
| Specification | Value |
|---------------|-------|
| **Engine** | Redis 7.x |
| **Node Type** | cache.t3.medium (2 GB RAM) |
| **Configuration** | Cluster mode disabled (simpler, sufficient for now) |
| **Nodes** | 1 primary + 1 replica (for failover) |
| **Max Memory** | 1.5 GB (reserve 0.5 GB for Redis overhead) |
| **Eviction Policy** | allkeys-lru (cache-aside pattern) |
| **Multi-AZ** | Enabled (automatic failover) |

**MongoDB Atlas (if not migrating to DocumentDB):**
| Specification | Value |
|---------------|-------|
| **Tier** | M20 (2 GB RAM) or M30 (4 GB RAM) |
| **Replica Set** | 3 nodes (automatic) |
| **Backup** | Daily, 7-day retention |
| **Connection Pool** | Min: 10, Max: 100 (increase from Stage 1) |

#### 3.2.4 Monthly Cost Breakdown — Stage 2

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 t3.large (×2)** | On-demand | **$121.52** |
| **EBS gp3 (50 GB ×2)** | $0.08/GB | **$8.00** |
| **AWS ALB** | 1 load balancer + LCU | **$22.27** |
| **ElastiCache Redis** | cache.t3.medium (2 nodes) | **$36.50** |
| **MongoDB Atlas M20** | 3-node replica | **$120.00** |
| **Data Transfer** | 2 TB out (avg) | **$170.00** |
| **S3 + CloudFront** | 50 GB + CDN | **$15.00** |
| **Route 53 + SES** | DNS + Email | **$5.00** |
| **Total** | | **~$498/month** |

**Cost Optimization:**
- **1-year Reserved Instances (EC2)**: Save 40% → **$73/month** (total ~$450/month)
- **ElastiCache Reserved**: Save 35% → **$24/month**
- **MongoDB Atlas annual**: Save 20% → **$96/month**
- **Optimized Total**: **~$390/month**

#### 3.2.5 When to Scale to Stage 3

**Triggers:**
- Auto Scaling group hits Max instances (4) regularly
- MongoDB Atlas CPU > 70% sustained
- Redis cache hit rate < 70% (indicates memory pressure)
- ALB TargetResponseTime p95 > 200ms
- Concurrent users > 10,000
- BullMQ queue depth > 500 jobs (indicates worker saturation)

---

### STAGE 3: SCALE (10,000-50,000 Concurrent Users)

**Timeline:** Months 9-18
**Goal:** Full production reliability, handle growth, optimize costs

#### 3.3.1 Architecture — Production Grade

```
┌──────────────────────────────────────────────────────────┐
│                  AWS Infrastructure                       │
│                                                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐    │
│  │EC2 App 1│  │EC2 App 2│  │EC2 App 3│  │EC2 App 4│    │
│  │t3.xlarge│  │t3.xlarge│  │t3.xlarge│  │t3.xlarge│    │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘    │
│       │            │            │            │           │
│       └────────────┴────────────┴────────────┘           │
│                          │                               │
│                   ┌──────▼──────┐                        │
│                   │  AWS ALB    │  ← Auto Scaling: 4-8  │
│                   └──────┬──────┘                       │
│                          │                               │
│        ┌─────────────────┼─────────────────┐           │
│        │                 │                 │            │
│  ┌─────▼─────┐    ┌──────▼──────┐   ┌─────▼─────┐     │
│  │MongoDB    │    │ Redis       │   │  MSK      │     │
│  │Atlas M30  │    │ ElastiCache │   │  (Kafka)  │     │
│  │(4GB RAM)  │    │ r6g.large   │   │  (3 nodes)│     │
│  └───────────┘    └─────────────┘   └───────────┘     │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  S3 + CF     │  │  CloudWatch  │                     │
│  │  (Frontend)  │  │  + X-Ray     │                     │
│  └──────────────┘  └──────────────┘                     │
└──────────────────────────────────────────────────────────┘
```

**Key Changes from Stage 2:**
1. ✅ **4 EC2 instances** (upgraded to t3.xlarge)
2. ✅ **Auto Scaling** (4-8 instances based on load)
3. ✅ **ElastiCache upgraded** to r6g.large (memory-optimized)
4. ✅ **MongoDB Atlas M30** (4 GB RAM)
5. ✅ **AWS MSK** for Kafka (if chat is critical)
6. ✅ **Frontend moved to S3 + CloudFront** (separate from backend)
7. ✅ **CloudWatch + X-Ray** for observability

#### 3.3.2 EC2 Instance Specifications (Auto Scaling Group)

| Specification | Value | Rationale |
|---------------|-------|-----------|
| **Instance Type** | **t3.xlarge** | 4 vCPU, 16 GB RAM |
| **Count** | 4 (min), 8 (max) | Scale based on CPU > 50% |
| **Availability Zones** | us-east-1a, 1b, 1c | Survive multi-AZ failure |
| **Storage** | 100 GB gp3 each | More logs, more buffer |
| **Launch Template** | Automated | AMI + user data script |

**Memory Allocation on t3.xlarge (16 GB total):**
- Node.js app (4 workers): 4 GB (1 GB per worker)
- Redis client buffers: 1 GB
- Frontend (if still co-hosted): 2 GB
- OS + Nginx + buffer: 3 GB
- Available for caching: 6 GB

**Why t3.xlarge (not c5 or m5)?**
- ✅ Burstable CPU handles traffic spikes efficiently
- ✅ Cost-effective for variable workloads
- ✅ 16 GB RAM provides ample buffer
- ⚠️ If CPU credits deplete consistently → switch to c5.xlarge (compute-optimized)

#### 3.3.3 Managed Services Specifications

**AWS ElastiCache Redis (Upgraded):**
| Specification | Value |
|---------------|-------|
| **Node Type** | cache.r6g.large (13 GB RAM, memory-optimized) |
| **Configuration** | Cluster mode enabled (2 shards, 2 replicas each) |
| **Total Nodes** | 6 (2 primary + 4 replicas) |
| **Max Memory per Node** | 10 GB |
| **Total Cache Capacity** | 20 GB (across 2 shards) |
| **Multi-AZ** | Enabled (automatic failover) |
| **Backup** | Daily, 7-day retention |

**MongoDB Atlas M30:**
| Specification | Value |
|---------------|-------|
| **Tier** | M30 (4 GB RAM, 40 GB storage) |
| **Replica Set** | 3 nodes |
| **Backup** | Daily, 14-day retention |
| **Connection Pool** | Min: 20, Max: 200 |
| **Read Replicas** | Add if read-heavy workload |

**AWS MSK (Kafka) — Optional:**
| Specification | Value |
|---------------|-------|
| **Broker Type** | kafka.m5.large (2 vCPU, 8 GB RAM) |
| **Broker Count** | 3 (minimum for Kafka) |
| **Storage** | 100 GB EBS per broker |
| **Estimated Cost** | ~$250/month |

**Note:** Only deploy MSK if real-time chat is a core feature. If chat can be deferred, skip this until Stage 4.

#### 3.3.4 Monthly Cost Breakdown — Stage 3

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 t3.xlarge (×4)** | On-demand (avg 5) | **$486.72** |
| **EBS gp3 (100 GB ×5)** | $0.08/GB | **$40.00** |
| **AWS ALB** | 1 LB + higher LCU | **$45.00** |
| **ElastiCache Redis** | cache.r6g.large (6 nodes) | **$219.00** |
| **MongoDB Atlas M30** | 3-node replica | **$240.00** |
| **AWS MSK (optional)** | 3 brokers | **$250.00** |
| **Data Transfer** | 5 TB out | **$425.00** |
| **S3 + CloudFront** | 100 GB + CDN | **$50.00** |
| **CloudWatch + X-Ray** | Monitoring | **$30.00** |
| **Total** | | **~$1,786/month** (without MSK: $1,536) |

**Cost Optimization:**
- **1-year Reserved Instances (EC2)**: Save 40% → **$292/month**
- **ElastiCache Reserved**: Save 35% → **$142/month**
- **MongoDB Atlas annual**: Save 20% → **$192/month**
- **Savings Plans**: Additional 10-15% on data transfer
- **Optimized Total**: **~$1,200/month** (without MSK: $1,000/month)

#### 3.3.5 When to Scale to Stage 4

**Triggers:**
- Concurrent users > 50,000
- Auto Scaling at max capacity (8 instances) > 30 minutes
- MongoDB Atlas CPU > 80% sustained
- Redis eviction rate > 10% of commands (memory pressure)
- API error rate > 1% (5xx errors)
- BullMQ job failure rate > 5%

---

### STAGE 4: ENTERPRISE (50,000-100,000+ Concurrent Users)

**Timeline:** Months 18+
**Goal:** Meet full scale targets, 99.9% uptime, global performance

#### 3.4.1 Architecture — Enterprise Grade

```
┌──────────────────────────────────────────────────────────────┐
│                    AWS Global Infrastructure                  │
│                                                                │
│  ┌─────────────────────┐      ┌─────────────────────┐       │
│  │  us-east-1 (Primary)│      │  us-west-2 (DR)     │       │
│  │                      │      │                      │       │
│  │  ┌────────┐ ×8-16   │      │  ┌────────┐ ×4      │       │
│  │  │EC2 App │         │      │  │EC2 App │(standby) │       │
│  │  │t3.2xlg │         │      │  │t3.xlarge│         │       │
│  │  └───┬────┘         │      │  └───┬────┘         │       │
│  │      │               │      │      │               │       │
│  │  ┌───▼────┐         │      │  ┌───▼────┐         │       │
│  │  │  ALB   │         │      │  │  ALB   │         │       │
│  │  └───┬────┘         │      │  └───┬────┘         │       │
│  │      │               │      │      │               │       │
│  │  ┌───┴───┐  ┌──────┐│      │  ┌───┴───┐  ┌──────┐│       │
│  │  │Atlas  │  │Redis ││      │  │Atlas  │  │Redis ││       │
│  │  │M40/50 │  │r6g.xl││      │  │(read  │  │(async││       │
│  │  │       │  │arge  ││      │  │only)  │  │repl) ││       │
│  │  └───────┘  └──────┘│      │  └───────┘  └──────┘│       │
│  └─────────────────────┘      └─────────────────────┘       │
│           │                              │                   │
│           └──────────────┬───────────────┘                   │
│                          │                                    │
│                   ┌──────▼──────┐                            │
│                   │ Route 53    │  ← Geo-routing              │
│                   │ (DNS LB)    │                             │
│                   └─────────────┘                             │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  S3 + CF     │  │  CloudWatch  │  │  WAF +       │       │
│  │  (Global CDN)│  │  + X-Ray     │  │  Shield      │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

**Key Changes from Stage 3:**
1. ✅ **8-16 EC2 instances** (t3.2xlarge) in primary region
2. ✅ **Disaster Recovery** region (us-west-2, 4 standby instances)
3. ✅ **MongoDB Atlas M40/M50** (8-16 GB RAM)
4. ✅ **Redis r6g.xlarge** (25 GB RAM, larger cluster)
5. ✅ **Route 53 geo-routing** (global traffic distribution)
6. ✅ **AWS WAF + Shield** (DDoS protection)
7. ✅ **Global CDN** (CloudFront + S3 for frontend + static assets)

#### 3.4.2 EC2 Instance Specifications

| Specification | Value |
|---------------|-------|
| **Instance Type** | **t3.2xlarge** (8 vCPU, 32 GB RAM) |
| **Primary Region** | 8-16 instances (auto-scaling) |
| **DR Region** | 4 instances (standby, can scale up) |
| **Availability Zones** | 3+ in primary, 2 in DR |
| **Storage** | 200 GB gp3 per instance |

#### 3.4.3 Monthly Cost Breakdown — Stage 4

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **EC2 t3.2xlarge (×12 avg)** | On-demand | **$2,433** |
| **EBS gp3 (200 GB ×16)** | $0.08/GB | **$256** |
| **AWS ALB (×2 regions)** | 2 LBs + LCU | **$90** |
| **ElastiCache Redis** | cache.r6g.xlarge (10 nodes) | **$730** |
| **MongoDB Atlas M40** | 3-node replica | **$480** |
| **Data Transfer** | 10 TB+ out | **$850** |
| **S3 + CloudFront (Global)** | 500 GB + CDN | **$150** |
| **CloudWatch + X-Ray** | Enterprise monitoring | **$100** |
| **WAF + Shield** | DDoS protection | **$60** |
| **Route 53 + SES** | DNS + Email | **$10** |
| **Total** | | **~$5,159/month** |

**Cost Optimization:**
- **1-year Reserved Instances**: Save 40-50% → **$1,460/month**
- **Savings Plans (1-year)**: Additional 15% → **$2,180/month**
- **MongoDB Atlas annual**: Save 20% → **$384/month**
- **Optimized Total**: **~$3,500/month**

---

## 4. EC2 INSTANCE TYPE COMPARISON

### 4.1 Detailed Comparison Table

| Instance Type | vCPUs | RAM | Network | EBS Bandwidth | Hourly Cost | Monthly Cost | Best For |
|---------------|-------|-----|---------|---------------|-------------|--------------|----------|
| **t3.micro** | 2 | 1 GB | Up to 5 Gbps | Up to 2,040 Mbps | $0.0104 | $7.59 | ❌ NOT suitable (too small) |
| **t3.small** | 2 | 2 GB | Up to 5 Gbps | Up to 2,040 Mbps | $0.0208 | $15.18 | ❌ Insufficient RAM |
| **t3.medium** | 2 | 4 GB | Up to 5 Gbps | Up to 2,040 Mbps | $0.0416 | $30.37 | ⚠️ Marginal for MVP |
| **t3.large** ⭐ | 2 | 8 GB | Up to 5 Gbps | Up to 2,040 Mbps | $0.0832 | $60.76 | ✅ **Stage 1-2** |
| **t3.xlarge** | 4 | 16 GB | Up to 5 Gbps | Up to 2,040 Mbps | $0.1664 | $121.47 | ✅ **Stage 3** |
| **t3.2xlarge** | 8 | 32 GB | Up to 5 Gbps | Up to 2,040 Mbps | $0.3328 | $242.98 | ✅ **Stage 4** |
| **c5.xlarge** | 4 | 8 GB | Up to 10 Gbps | Up to 4,750 Mbps | $0.1700 | $124.10 | CPU-bound workloads |
| **m5.xlarge** | 4 | 16 GB | Up to 10 Gbps | Up to 4,750 Mbps | $0.1920 | $140.16 | General purpose |
| **r5.xlarge** | 4 | 32 GB | Up to 10 Gbps | Up to 4,750 Mbps | $0.2520 | $183.96 | Memory-intensive |

### 4.2 Why t3 Family (Burstable Performance)?

**Pros:**
- ✅ Cost-effective for variable workloads (your traffic won't be constant 24/7)
- ✅ CPU credits accumulate during low usage, spent during spikes
- ✅ Perfect for staging/development environments
- ✅ Up to 5 Gbps network (sufficient for app servers)

**Cons:**
- ⚠️ If CPU credits run out, performance throttles to baseline (20% for t3.large)
- ⚠️ NOT suitable for consistently high CPU workloads (use c5 or m5 instead)

**Monitoring CPU Credits:**
```bash
# CloudWatch Metric: CPUCreditBalance
# Alert if: CPUCreditBalance < 50 for 15 minutes
# Action: Upgrade to c5.xlarge or add more instances
```

**When to switch from t3 to c5:**
- CPU credit balance consistently < 100
- Sustained CPU utilization > 60% (not spiky, but constant)
- Application requires consistent high performance (no throttling acceptable)

---

## 5. DEPLOYMENT ARCHITECTURE — DETAILED SETUP

### 5.1 EC2 Instance Setup (Stage 1-2)

#### 5.1.1 Operating System & Software Stack

```bash
# OS: Ubuntu 22.04 LTS (Jammy Jellyfish)

# Software Versions:
- Node.js: 18.x (LTS) or 20.x (LTS)
- pnpm: 8.x+ (package manager)
- Docker: 24.x+ (containerization)
- Docker Compose: 2.x+
- Nginx: 1.24.x+ (reverse proxy)
- PM2: 5.x+ (process manager, optional if using Docker)
- Certbot: 1.x+ (Let's Encrypt SSL)
```

#### 5.1.2 Production Dockerfile

**Current Dockerfile is dev-oriented. Replace with:**

```dockerfile
# Production-Optimized Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (production only)
RUN pnpm install --prod --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# --- Production Image ---
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy built artifacts and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --prod --frozen-lockfile

# Copy only necessary source folders
COPY src/views ./src/views
COPY src/i18n ./src/i18n

# Set Node.js memory limits
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Expose port
EXPOSE 6730

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6730/api/v1/health || exit 1

# Start production server
CMD ["node", "dist/serverV2.js"]
```

**Key Improvements:**
1. ✅ Multi-stage build (smaller image, ~150 MB vs ~500 MB)
2. ✅ Production-only dependencies (no devDependencies)
3. ✅ `NODE_OPTIONS` memory limit (prevents OOM)
4. ✅ Health check endpoint (required for ALB + Docker orchestration)
5. ✅ No hot-reload, no ts-node (faster startup, lower memory)

#### 5.1.3 Production Docker Compose

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile.production
    ports:
      - "6730:6730"
    environment:
      - NODE_ENV=production
      - PORT=6730
      - MONGODB_URL=${MONGODB_URL}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - # ... all other env vars
    depends_on:
      - redis
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.5'
        reservations:
          memory: 1G
          cpus: '0.5'
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: >
      redis-server
      --appendonly yes
      --maxmemory 1500mb
      --maxmemory-policy allkeys-lru
      --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: always
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'

  # Kafka (optional, only if chat is active)
  # kafka:
  #   image: bitnami/kafka:3.7.0
  #   ports:
  #     - "9092:9092"
  #   environment:
  #     - KAFKA_ENABLE_KRAFT=yes
  #     - # ... kafka config
  #   volumes:
  #     - kafka_data:/bitnami/kafka
  #   restart: always

volumes:
  redis_data:
  # kafka_data:
```

**Key Improvements:**
1. ✅ Resource limits (prevents container from consuming all host RAM)
2. ✅ Redis maxmemory + eviction policy (critical for cache behavior)
3. ✅ Redis password (security)
4. ✅ Log rotation (prevents disk fill-up)
5. ✅ Restart policy (automatic recovery)

#### 5.1.4 Nginx Configuration (Production)

Create `/etc/nginx/sites-available/task-management-backend.conf`:

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# Upstream (for future horizontal scaling)
upstream backend_cluster {
    server 127.0.0.1:6730;
    # Add more servers here when scaling
    # server 127.0.0.1:6731;
}

# Backend API
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # WebSocket Support (for Socket.IO)
    map $http_upgrade $connection_upgrade {
        default upgrade;
        ''      close;
    }

    # Backend API
    location /api/ {
        # Rate limiting for auth endpoints
        location /api/v1/auth/ {
            limit_req zone=auth_limit burst=10 nodelay;
            proxy_pass http://backend_cluster;
        }

        # General API rate limiting
        limit_req zone=api_limit burst=200 nodelay;

        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;

        # Disable buffering for streaming
        proxy_buffering off;
    }

    # Socket.IO (separate port)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:6738;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Socket.IO requires sticky sessions if multiple backends
        # Not needed for single instance
    }

    # Health Check
    location /health {
        proxy_pass http://backend_cluster;
        access_log off;
    }

    # File Upload Limit
    client_max_body_size 50M;

    # Logging
    access_log /var/log/nginx/backend_access.log;
    error_log /var/log/nginx/backend_error.log;
}

# Frontend (React/Next.js)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    root /var/www/task-management-frontend/dist;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    # Static Assets (cache for 30 days)
    location ~* \.(ico|css|js|gif|webp|jpe?g|png|woff2?|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA Fallback
    location / {
        try_files $uri /index.html;
    }

    # Rate Limiting
    limit_req zone=api_limit burst=50 nodelay;

    client_max_body_size 10M;

    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log;
}

# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com app.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

#### 5.1.5 Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# 1. Pull latest code
echo "📦 Pulling latest code..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
pnpm install --frozen-lockfile

# 3. Build TypeScript
echo "🔨 Building TypeScript..."
pnpm build

# 4. Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down

# 5. Build new Docker images
echo "🐳 Building Docker images..."
docker compose build

# 6. Start containers
echo "▶️  Starting containers..."
docker compose up -d

# 7. Wait for health check
echo "⏳ Waiting for application to start..."
for i in {1..30}; do
  if curl -s http://localhost:6730/api/v1/health | grep -q "healthy"; then
    echo "✅ Application is healthy!"
    break
  fi
  echo "Attempt $i: Waiting..."
  sleep 2
done

# 8. Check container status
echo "📊 Container Status:"
docker compose ps

echo "✅ Deployment complete!"
```

Make it executable:
```bash
chmod +x deploy.sh
```

---

### 5.2 MongoDB Atlas Setup

#### 5.2.1 Cluster Configuration

**Stage 1 (M10):**
```
Provider: AWS
Region: us-east-1 (N. Virginia)
Tier: M10
RAM: 2 GB
Storage: 10 GB (auto-scaling to 20 GB)
Backup: Daily, 7-day retention
Monitoring: Enabled (Basic)
```

**Connection String:**
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/task-management?retryWrites=true&w=majority
```

#### 5.2.2 Connection Pool Settings

In `src/config/mongoDbConfig.ts`:

```typescript
await mongoose.connect(config.database.mongoUrl, {
  // Connection Pool Settings
  minPoolSize: 5,
  maxPoolSize: 50,  // Increase to 100 in Stage 2+
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxIdleTimeMS: 10000,  // Close idle connections after 10s

  // Retry Writes
  retryWrites: true,
  retryReads: true,

  // Read Preference (for future read replicas)
  readPreference: 'primaryPreferred',

  // Write Concern
  w: 'majority',
  j: true,
});
```

---

### 5.3 AWS ElastiCache Redis Setup

#### 5.3.1 Stage 1 (Docker on EC2)

```bash
# In docker-compose.yml (already configured above)
redis:
  image: redis:7-alpine
  command: >
    redis-server
    --appendonly yes
    --maxmemory 1500mb
    --maxmemory-policy allkeys-lru
    --requirepass your_secure_password
```

#### 5.3.2 Stage 2+ (ElastiCache)

**Configuration:**
```
Engine: Redis 7.x
Node Type: cache.t3.medium (Stage 2), cache.r6g.large (Stage 3+)
Configuration: Cluster mode disabled (Stage 2), enabled (Stage 3+)
Nodes: 1 primary + 1 replica (Stage 2), 2 shards + 4 replicas (Stage 3)
Multi-AZ: Enabled
Backup: Daily, 7-day retention
Encryption: In-transit (TLS) + At-rest (not available for Redis, use VPC security)
```

**Connection String:**
```
master.xxx.0001.use1.cache.amazonaws.com:6379
```

**Update `.env`:**
```bash
REDIS_HOST=your-elasticache-endpoint.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password  # If auth enabled
```

---

## 6. COST OPTIMIZATION STRATEGIES

### 6.1 Immediate Savings (Stage 1)

| Strategy | Savings | Risk |
|----------|---------|------|
| **Reserved Instance (1-year)** | 40% on EC2 | Low (committed to 1 year) |
| **MongoDB Atlas M0 (testing only)** | $60/month → $0 | High (512 MB limit, not production) |
| **Cloudflare Free CDN** | $50/month → $0 | None |
| **AWS SES for Email** | $20/month → $1-5 | None |
| **Spot Instance for non-prod** | 70% on dev/staging | Medium (can terminate) |

### 6.2 Medium-Term Savings (Stage 2-3)

| Strategy | Savings | Notes |
|----------|---------|-------|
| **Savings Plans (1-year)** | 15-20% on compute | More flexible than RI |
| **ElastiCache Reserved** | 35% on Redis | Commit to 1 year |
| **MongoDB Atlas Annual** | 20% on database | Pay upfront |
| **Data Transfer Optimization** | 10-15% on egress | Use CloudFront, VPC endpoints |
| **Right-sizing** | 20-30% | Monitor actual usage, downgrade if over-provisioned |

### 6.3 Long-Term Savings (Stage 4)

| Strategy | Savings | Notes |
|----------|---------|-------|
| **Reserved Instances (3-year)** | 60% on EC2 | Maximum savings, long commitment |
| **Graviton Instances (r6g, m6g)** | 20% better price/performance | ARM-based, requires testing |
| **Spot Fleet for stateless workers** | 70% on BullMQ workers | Only for queue workers, not API servers |
| **S3 Intelligent Tiering** | 10-15% on storage | Automatic optimization |

---

## 7. SCALING TRIGGERS & MONITORING

### 7.1 CloudWatch Alarms

Create these alarms in CloudWatch:

| Metric | Threshold | Action | Severity |
|--------|-----------|--------|----------|
| **CPUUtilization** | > 70% for 5 min | Scale out (add EC2) | Warning |
| **CPUUtilization** | > 90% for 5 min | Scale out urgently | Critical |
| **MemoryUtilization** | > 80% for 5 min | Investigate, scale up | Warning |
| **CPUCreditBalance** | < 50 for 15 min | Upgrade to c5/m5 | Warning |
| **DatabaseConnections** | > 40 (Stage 1) | Increase pool size | Warning |
| **DatabaseConnections** | > 50 (Stage 1) | Upgrade MongoDB | Critical |
| **Redis UsedMemory** | > 1.2 GB (Stage 1) | Increase maxmemory | Warning |
| **Redis Evictions** | > 100/sec | Increase cache size | Critical |
| **TargetResponseTime (ALB)** | > 200ms (p95) | Investigate, scale out | Warning |
| **TargetResponseTime (ALB)** | > 500ms (p95) | Scale out urgently | Critical |
| **5xx Error Rate** | > 1% | Investigate immediately | Critical |
| **BullMQ Queue Depth** | > 500 jobs | Add workers | Warning |
| **BullMQ Job Failure Rate** | > 5% | Investigate errors | Critical |

### 7.2 Custom Metrics

Install CloudWatch Agent to track:

```json
{
  "metrics": {
    "metrics_collected": {
      "mem": {
        "measurement": ["mem_used_percent"],
        "metrics_collection_interval": 60
      },
      "disk": {
        "resources": ["/"],
        "measurement": ["disk_used_percent"],
        "metrics_collection_interval": 60
      }
    }
  }
}
```

### 7.3 Scaling Decision Matrix

| Scenario | Current Stage | Action | New Stage |
|----------|---------------|--------|-----------|
| CPU > 70% sustained | Stage 1 | Add second EC2 + ALB | Stage 2 |
| Redis memory > 80% | Stage 1 | Migrate to ElastiCache | Stage 2 |
| DB connections > 40 | Stage 1 | Upgrade to M20 | Stage 2 |
| Concurrent users > 10K | Stage 2 | Upgrade to t3.xlarge ×4 | Stage 3 |
| Redis evictions high | Stage 2 | Upgrade to r6g.large | Stage 3 |
| DB CPU > 70% | Stage 2 | Upgrade to M30 | Stage 3 |
| Concurrent users > 50K | Stage 3 | Upgrade to t3.2xlarge ×8 | Stage 4 |

---

## 8. SECURITY HARDENING

### 8.1 EC2 Security Hardening

```bash
# 1. Disable root SSH login
sudo nano /etc/ssh/sshd_config
PermitRootLogin no

# 2. Use SSH keys only (disable password auth)
PasswordAuthentication no

# 3. Enable UFW (Uncomplicated Firewall)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# 4. Install fail2ban (brute force protection)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# 5. Enable automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades

# 6. Set up log rotation
sudo nano /etc/logrotate.d/node-app
/var/log/task-management/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
}
```

### 8.2 AWS Security Groups

**EC2 Security Group:**
```
Inbound Rules:
- Port 22 (SSH): Allow from your IP only (e.g., 123.45.67.89/32)
- Port 80 (HTTP): Allow from 0.0.0.0/0 (redirects to HTTPS)
- Port 443 (HTTPS): Allow from 0.0.0.0/0
- Port 6730 (Backend): Allow from ALB security group only
- Port 6738 (Socket.IO): Allow from ALB security group only

Outbound Rules:
- All traffic: Allow to 0.0.0.0/0
```

**MongoDB Atlas Network Access:**
```
Allow from: EC2 security group IP (or VPC peering)
NEVER allow from 0.0.0.0/0
```

**ElastiCache Security Group:**
```
Inbound:
- Port 6379: Allow from EC2 security group only
```

### 8.3 Environment Variable Security

**NEVER commit `.env` file to Git.**

Use AWS Systems Manager Parameter Store or HashiCorp Vault for production:

```bash
# Example: Store secrets in AWS SSM
aws ssm put-parameter --name "/task-mgmt/prod/MONGODB_URL" --value "mongodb+srv://..." --type SecureString
aws ssm put-parameter --name "/task-mgmt/prod/JWT_ACCESS_SECRET" --value "your_secret" --type SecureString
aws ssm put-parameter --name "/task-mgmt/prod/REDIS_PASSWORD" --value "your_password" --type SecureString

# Retrieve in deployment script
MONGODB_URL=$(aws ssm get-parameter --name "/task-mgmt/prod/MONGODB_URL" --with-decryption --query Parameter.Value --output text)
```

---

## 9. BACKUP & DISASTER RECOVERY

### 9.1 Backup Strategy

| Component | Backup Method | Frequency | Retention | Recovery Time |
|-----------|---------------|-----------|-----------|---------------|
| **MongoDB** | Atlas automated backups | Daily | 7 days (Stage 1-2), 14 days (Stage 3+) | < 1 hour |
| **Redis** | ElastiCache automated backups | Daily | 7 days | < 30 minutes |
| **S3 Files** | S3 versioning + cross-region replication | Real-time | Indefinite | Immediate |
| **EC2 AMI** | Automated AMI creation (Lambda + CloudWatch Events) | Weekly | 4 weeks | < 30 minutes |
| **Nginx Config** | Git repository (version controlled) | Every change | Indefinite | < 5 minutes |
| **Environment Variables** | AWS SSM Parameter Store | Every change | Indefinite | < 5 minutes |

### 9.2 Disaster Recovery Plan

**Scenario 1: EC2 Instance Failure**
```
Recovery Steps:
1. Auto Scaling automatically launches new instance
2. New instance pulls latest code from Git
3. New instance connects to MongoDB Atlas + ElastiCache (no data loss)
4. Nginx routes traffic to new instance
Estimated Downtime: < 5 minutes
```

**Scenario 2: MongoDB Failure**
```
Recovery Steps:
1. Atlas automatically fails over to secondary node (< 1 minute)
2. Application reconnects automatically (retryWrites: true)
3. If catastrophic failure, restore from latest backup
Estimated Downtime: < 1 minute (automatic), < 1 hour (manual restore)
```

**Scenario 3: Redis Failure**
```
Recovery Steps:
1. ElastiCache automatically fails over to replica
2. Application reconnects (cache warm-up period: 5-15 minutes)
3. During warm-up, increased DB load expected (monitor closely)
Estimated Downtime: < 30 seconds (automatic)
```

**Scenario 4: Entire Region Failure**
```
Recovery Steps:
1. Route 53 routes traffic to DR region (us-west-2)
2. MongoDB Atlas global cluster promotes secondary region
3. Redis async replication catches up
4. EC2 instances in DR region scale up
Estimated Downtime: < 15 minutes
Data Loss: < 1 minute of writes (RPO)
```

---

## 10. PERFORMANCE OPTIMIZATION CHECKLIST

### 10.1 Node.js Optimization

```typescript
// 1. Set memory limits (in .env or Docker)
NODE_OPTIONS="--max-old-space-size=1024"  // 1 GB per worker

// 2. Enable compression (already in Nginx, but add in Express too)
import compression from 'compression';
app.use(compression());

// 3. Implement health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

// 4. Use cluster mode (already implemented in serverV2.ts)
// Ensure numCPUs uses all cores in production

// 5. Connection pooling (already configured)
// MongoDB: minPoolSize: 5, maxPoolSize: 50
// Redis: Use connection pooling (ioredis)
```

### 10.2 MongoDB Optimization

```typescript
// 1. Indexes (critical for 10M+ tasks)
// Run these in MongoDB shell or via Mongoose schema

// Task collection indexes
db.tasks.createIndex({ userId: 1, status: 1 });
db.tasks.createIndex({ userId: 1, createdAt: -1 });
db.tasks.createIndex({ status: 1, createdAt: -1 });
db.tasks.createIndex({ dueDate: 1 }, { partialFilterExpression: { dueDate: { $exists: true } } });

// User collection indexes
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ refreshToken: 1 });

// 2. Use .lean() on all read-only queries (already in rules)
const tasks = await Task.find({ userId }).lean().exec();

// 3. Use projection (only return needed fields)
const tasks = await Task.find({ userId }).select('title status dueDate').lean();

// 4. Monitor slow queries
db.setProfilingLevel(1, { slowms: 100 });  // Log queries > 100ms
```

### 10.3 Redis Optimization

```typescript
// 1. Set maxmemory and eviction policy
// In docker-compose.yml or ElastiCache:
--maxmemory 1500mb
--maxmemory-policy allkeys-lru

// 2. Monitor memory usage
INFO memory

// 3. Use pipelines for batch operations
const pipeline = redisClient.multi();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
await pipeline.exec();

// 4. Use appropriate TTLs (as per masterSystemPrompt.md)
// User profile: 15 min
// Task detail: 5 min
// Task list: 2 min
```

### 10.4 Nginx Optimization

```nginx
# Already in config above, but key points:

# 1. Enable gzip
gzip on;
gzip_comp_level 6;

# 2. Enable HTTP/2
listen 443 ssl http2;

# 3. Use Brotli (better than gzip, requires module)
brotli on;
brotli_comp_level 6;

# 4. Enable caching headers for static assets
location ~* \.(css|js|png|jpg|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}

# 5. Use proxy_cache for API responses (if cacheable)
proxy_cache api_cache;
proxy_cache_valid 200 5m;
```

---

## 11. CI/CD PIPELINE (FUTURE)

### 11.1 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint:check
      - run: pnpm test:ci

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -f Dockerfile.production -t your-ecr-repo/task-mgmt:${{ github.sha }} .
      - run: docker push your-ecr-repo/task-mgmt:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /opt/task-management
            ./deploy.sh
```

---

## 12. MIGRATION PATH — STAGE 1 TO STAGE 2

### 12.1 Step-by-Step Migration Plan

**Week 1: Preparation**
```
Day 1-2: Set up MongoDB Atlas (M10)
  - Create cluster in us-east-1
  - Configure network access (allow EC2 IP)
  - Test connection from EC2
  - Migrate data using mongodump/mongorestore

Day 3-4: Set up AWS ALB
  - Create Application Load Balancer
  - Create target group (point to EC2)
  - Update Route 53 DNS to ALB
  - Test traffic routing

Day 5-7: Set up ElastiCache Redis
  - Create cache cluster (cache.t3.medium)
  - Configure security groups
  - Update .env REDIS_HOST
  - Test connection
  - Monitor cache hit rate
```

**Week 2: Dual Deployment**
```
Day 1-3: Add second EC2 instance
  - Launch identical t3.large instance
  - Deploy application
  - Register with ALB target group
  - Test load balancing

Day 4-5: Configure Auto Scaling
  - Create Auto Scaling group (min: 2, max: 4)
  - Set up scaling policies (CPU > 60%)
  - Test scaling (stress test)

Day 6-7: Monitor & Validate
  - Monitor CloudWatch metrics
  - Check API response times
  - Verify cache hit rates
  - Check error rates
```

**Week 3: Decommission Old Setup**
```
Day 1-2: Validate new infrastructure
  - No errors for 48 hours
  - Response times within target
  - Cache hit rate > 80%

Day 3-4: Remove Docker MongoDB/Redis (if running on EC2)
  - Stop containers
  - Verify Atlas + ElastiCache working
  - Free up EC2 resources

Day 5-7: Optimize & Document
  - Right-size instances if needed
  - Update documentation
  - Train team on new infrastructure
```

---

## 13. ESTIMATED COSTS SUMMARY

### 13.1 All Stages Comparison

| Stage | Users | EC2 | Database | Redis | Other | Total/Month |
|-------|-------|-----|----------|-------|-------|-------------|
| **Stage 1 (MVP)** | 0-1K | $61 | $60 | $0 (Docker) | $100 | **~$220** |
| **Stage 2 (Growth)** | 1K-10K | $122 | $120 | $37 | $220 | **~$498** |
| **Stage 3 (Scale)** | 10K-50K | $487 | $240 | $219 | $600 | **~$1,546** |
| **Stage 4 (Enterprise)** | 50K-100K+ | $2,433 | $480 | $730 | $1,516 | **~$5,159** |

### 13.2 Optimized Costs (with Reservations)

| Stage | Users | Optimized Total/Month | Savings |
|-------|-------|----------------------|---------|
| **Stage 1 (MVP)** | 0-1K | **~$195** | 11% |
| **Stage 2 (Growth)** | 1K-10K | **~$390** | 22% |
| **Stage 3 (Scale)** | 10K-50K | **~$1,200** | 22% |
| **Stage 4 (Enterprise)** | 50K-100K+ | **~$3,500** | 32% |

### 13.3 Cost Per User Analysis

| Stage | Total Cost | Concurrent Users | Cost Per 1K Users/Month |
|-------|-----------|------------------|------------------------|
| **Stage 1** | $220 | 1,000 | **$220** |
| **Stage 2** | $498 | 10,000 | **$50** |
| **Stage 3** | $1,546 | 50,000 | **$31** |
| **Stage 4** | $5,159 | 100,000 | **$52** |

**Key Insight:** Cost per user decreases significantly as you scale (economies of scale), then slightly increases at Stage 4 due to multi-region DR setup.

---

## 14. ALTERNATIVE: AWS Fargate (Serverless)

### 14.1 When to Use Fargate vs EC2

**Use Fargate if:**
- ✅ You want zero server management
- ✅ Traffic is highly variable (spiky)
- ✅ Team is small (no dedicated DevOps)
- ✅ You're okay with 20-30% higher costs for convenience

**Use EC2 if:**
- ✅ You want cost optimization (cheaper at scale)
- ✅ You need fine-grained control (CPU, memory, networking)
- ✅ You have predictable traffic patterns
- ✅ You have DevOps expertise

### 14.2 Fargate Architecture

```
┌──────────────────────────────────────┐
│         AWS Fargate                   │
│                                        │
│  ┌─────────────┐  ┌─────────────┐    │
│  │  Fargate    │  │  Fargate    │    │
│  │  Task: App  │  │  Task: App  │    │
│  │  (1 vCPU,   │  │  (1 vCPU,   │    │
│  │   2 GB)     │  │   2 GB)     │    │
│  └──────┬──────┘  └──────┬──────┘    │
│         │                │            │
│         └────────┬───────┘            │
│                  │                    │
│           ┌──────▼──────┐            │
│           │  AWS ALB    │            │
│           └──────┬──────┘            │
│                  │                    │
│         ┌────────┼────────┐          │
│         │        │        │           │
│  ┌──────▼──┐ ┌──▼────┐ ┌─▼──────┐   │
│  │Atlas    │ │Elasti │ │  S3    │   │
│  │MongoDB  │ │Cache  │ │        │   │
│  └─────────┘ └───────┘ └────────┘   │
└──────────────────────────────────────┘
```

### 14.3 Fargate Cost Estimate (Stage 2 Equivalent)

| Component | Specification | Monthly Cost |
|-----------|---------------|--------------|
| **Fargate Tasks (×2)** | 1 vCPU, 2 GB RAM (always on) | $75.60 |
| **Fargate Tasks (scaling)** | Avg +2 tasks during peak | $37.80 |
| **ECS Cluster** | Managed | $0 |
| **AWS ALB** | 1 LB + LCU | $22.27 |
| **MongoDB Atlas M20** | 3-node replica | $120.00 |
| **ElastiCache Redis** | cache.t3.medium | $36.50 |
| **Data Transfer** | 2 TB out | $170.00 |
| **Total** | | **~$462/month** |

**Comparison:** EC2 Stage 2 = $498/month, Fargate = $462/month
- Fargate is **slightly cheaper** at Stage 2 (due to no EC2 overhead)
- Fargate becomes **more expensive** at Stage 3+ (EC2 reserved instances win)
- Fargate saves **~20 hours/month** in ops work (worth ~$2,000 at $100/hr DevOps rate)

**Recommendation:** Use **EC2 for Stage 1-2** (more control, learn the system), then consider **Fargate for Stage 3+** if ops overhead becomes a bottleneck.

---

## 15. RECOMMENDATIONS & NEXT STEPS

### 15.1 Immediate Actions (This Week)

1. ✅ **Provision EC2 t3.large** in us-east-1
2. ✅ **Set up MongoDB Atlas M10** (free trial available)
3. ✅ **Configure Docker + Docker Compose** on EC2
4. ✅ **Deploy production Dockerfile** (not dev Dockerfile)
5. ✅ **Set up Nginx + Let's Encrypt SSL**
6. ✅ **Configure CloudWatch monitoring**
7. ✅ **Test load with 100 concurrent users** (use k6 or Artillery)

### 15.2 Short-Term Actions (Next Month)

1. ✅ **Implement health check endpoint** (`GET /api/v1/health`)
2. ✅ **Set up proper logging** (Winston/Pino to CloudWatch)
3. ✅ **Configure backup strategy** (automated AMI, MongoDB backups)
4. ✅ **Load test with 1,000 concurrent users**
5. ✅ **Document runbooks** (how to restart, how to check logs, how to rollback)
6. ✅ **Set up CI/CD pipeline** (GitHub Actions or GitLab CI)

### 15.3 Medium-Term Actions (Months 2-3)

1. ✅ **Migrate to ElastiCache Redis** (when ready for Stage 2)
2. ✅ **Add second EC2 instance + ALB**
3. ✅ **Configure Auto Scaling**
4. ✅ **Implement distributed locks for cron jobs** (Redis SETNX)
5. ✅ **Set up staging environment** (identical to production, smaller instances)
6. ✅ **Conduct disaster recovery drill**

### 15.4 Code Changes Required Before Production

```typescript
// 1. Add health check endpoint (src/app.ts or routes)
app.get('/api/v1/health', authenticateForHealthCheck, async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const redisStatus = await redisClient.ping() ? 'connected' : 'disconnected';

    res.json({
      status: dbStatus === 'connected' && redisStatus === 'connected' ? 'healthy' : 'degraded',
      db: dbStatus,
      redis: redisStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'down',
      error: error.message,
    });
  }
});

// 2. Fix JWT secrets in .env (NEVER use defaults in production)
JWT_ACCESS_SECRET=<generate with: openssl rand -hex 64>
JWT_REFRESH_SECRET=<generate with: openssl rand -hex 64>
TOKEN_SECRET=<generate with: openssl rand -hex 64>

// 3. Update CORS whitelist (no wildcards in production)
// In app.ts or middleware:
const corsOptions = {
  origin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com',
  ],
  credentials: true,
};
app.use(cors(corsOptions));

// 4. Disable detailed errors in production
if (process.env.NODE_ENV === 'production') {
  app.use((err, req, res, next) => {
    logger.error('Internal Server Error', { error: err.message, stack: err.stack });
    res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
    });
  });
}

// 5. Implement graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(async () => {
    await mongoose.disconnect();
    await closeRedisConnections();
    process.exit(0);
  });
});
```

---

## 16. MONITORING DASHBOARD SETUP

### 16.1 Key Metrics to Track

**Application Metrics:**
```
- Request rate (req/sec per endpoint)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections
- Cache hit rate (target: > 80%)
- Queue depth (per queue)
- Job success rate (target: > 95%)
```

**Infrastructure Metrics:**
```
- CPU utilization (per instance)
- Memory utilization (per instance)
- Disk utilization (per instance)
- Network I/O (per instance)
- Database connections
- Redis memory usage
- Redis connected clients
```

**Business Metrics:**
```
- Active users (DAU, MAU)
- Tasks created per hour
- Tasks completed per hour
- Notification delivery rate
- API usage per user tier
```

### 16.2 Monitoring Tools

**Option 1: AWS Native (Recommended for Stage 1-2)**
```
- CloudWatch (metrics + logs + alarms)
- CloudWatch Dashboard (custom dashboards)
- X-Ray (distributed tracing)
- Cost: $30-100/month
```

**Option 2: Open Source (Recommended for Stage 3+)**
```
- Prometheus (metrics collection)
- Grafana (dashboards + alerting)
- ELK Stack (Elasticsearch + Logstash + Kibana for logs)
- Cost: $100-300/month (additional EC2 for monitoring)
```

**Option 3: SaaS (Easiest, Most Expensive)**
```
- Datadog (APM + infra monitoring)
- New Relic (APM + logs)
- Sentry (error tracking)
- Cost: $100-500/month (based on hosts)
```

**Recommendation:** Start with **CloudWatch** (Stage 1-2), migrate to **Prometheus + Grafana** (Stage 3+), or use **Datadog** if budget allows and team is small.

---

## 17. FINAL CHECKLIST BEFORE GO-LIVE

### 17.1 Infrastructure Checklist

- [ ] EC2 instance provisioned (t3.large minimum)
- [ ] Security groups configured (only necessary ports open)
- [ ] MongoDB Atlas cluster running
- [ ] Redis running (Docker or ElastiCache)
- [ ] Nginx configured with SSL
- [ ] Domain DNS pointing to EC2/ALB
- [ ] CloudWatch alarms configured
- [ ] Backup strategy implemented
- [ ] Load testing completed (1,000 concurrent users)
- [ ] Disaster recovery plan documented

### 17.2 Application Checklist

- [ ] Health check endpoint implemented
- [ ] Production Dockerfile built
- [ ] Environment variables secured (no defaults, no .env in Git)
- [ ] CORS whitelist configured (no wildcards)
- [ ] Rate limiting enabled on all endpoints
- [ ] Error handling production-ready (no stack traces exposed)
- [ ] Logging configured (structured JSON, no console.log)
- [ ] Graceful shutdown implemented
- [ ] Database indexes created
- [ ] Redis cache invalidation tested
- [ ] BullMQ workers running
- [ ] File uploads streaming to S3 (not buffering)

### 17.3 Security Checklist

- [ ] All secrets rotated from defaults (JWT, TOKEN, etc.)
- [ ] SSH key-only access
- [ ] Automatic security updates enabled
- [ ] SSL certificates auto-renewing (Certbot cron)
- [ ] MongoDB network access restricted
- [ ] Redis password-protected
- [ ] API rate limiting tested
- [ ] Input validation on 100% endpoints (Zod)
- [ ] NoSQL injection sanitization enabled
- [ ] XSS protection headers set

### 17.4 Performance Checklist

- [ ] API response times < 200ms (GET), < 500ms (POST/PUT)
- [ ] Redis cache hit rate > 80%
- [ ] MongoDB queries using indexes (no COLLSCAN)
- [ ] .lean() used on read-only queries
- [ ] Compression enabled (gzip/brotli)
- [ ] Nginx caching configured for static assets
- [ ] BullMQ queue configs have attempts + backoff
- [ ] Heavy operations return 202 Accepted + jobId

---

## 18. TROUBLESHOOTING GUIDE

### 18.1 Common Issues & Solutions

**Issue 1: High CPU Usage**
```
Symptoms: CPU > 80% sustained, slow response times
Diagnosis: Check CloudWatch CPUUtilization metric
Solutions:
  1. Check for infinite loops or heavy computations
  2. Add more instances (horizontal scaling)
  3. Upgrade to t3.xlarge or c5.xlarge
  4. Check BullMQ workers (are they consuming too much CPU?)
  5. Profile with Node.js --inspect flag
```

**Issue 2: Redis Out of Memory**
```
Symptoms: Redis eviction errors, cache misses
Diagnosis: Run `INFO memory` in Redis CLI
Solutions:
  1. Increase maxmemory setting
  2. Check for cache key leaks (keys without TTL)
  3. Review TTLs (are they too long?)
  4. Upgrade to larger Redis instance
  5. Enable cluster mode (sharding)
```

**Issue 3: MongoDB Connection Pool Exhausted**
```
Symptoms: "Connection pool exhausted" errors
Diagnosis: Check `db.serverStatus().connections` in MongoDB shell
Solutions:
  1. Increase maxPoolSize (from 50 to 100)
  2. Check for connection leaks (not closing connections)
  3. Add read replicas (distribute reads)
  4. Upgrade MongoDB instance (more connections allowed)
  5. Implement connection pooling at application level
```

**Issue 4: BullMQ Jobs Stuck in Queue**
```
Symptoms: Queue depth increasing, jobs not processing
Diagnosis: Check BullMQ worker logs, check Redis connection
Solutions:
  1. Check if workers are running (ps aux | grep node)
  2. Check Redis connection (workers connect to Redis)
  3. Increase worker concurrency
  4. Check job timeout settings
  5. Restart workers
```

**Issue 5: High API Response Times**
```
Symptoms: p95 > 200ms for GET endpoints
Diagnosis: Use X-Ray or manual timing to find bottleneck
Solutions:
  1. Check MongoDB query performance (use .explain())
  2. Check Redis cache hit rate (should be > 80%)
  3. Add indexes to frequently queried fields
  4. Implement pagination (never return unpaginated lists)
  5. Offload heavy operations to BullMQ
```

---

## 19. GLOSSARY

| Term | Definition |
|------|------------|
| **vCPU** | Virtual CPU core (1 thread on physical core) |
| **EBS** | Elastic Block Storage (persistent disk for EC2) |
| **gp3** | General Purpose SSD (3rd gen, cost-effective) |
| **ALB** | Application Load Balancer (Layer 7, HTTP/HTTPS) |
| **LCU** | Load Balancer Capacity Unit (ALB pricing metric) |
| **Auto Scaling** | Automatically add/remove EC2 instances based on metrics |
| **ElastiCache** | Managed Redis/Memcached service |
| **MSK** | Managed Streaming for Kafka |
| **CloudFront** | AWS CDN (Content Delivery Network) |
| **Route 53** | AWS DNS service |
| **CloudWatch** | AWS monitoring + logging service |
| **X-Ray** | AWS distributed tracing service |
| **RPO** | Recovery Point Objective (max acceptable data loss) |
| **RTO** | Recovery Time Objective (max acceptable downtime) |
| **Reserved Instance** | Pre-pay for 1-3 years, save 40-60% |
| **Savings Plans** | Commit to $/hour, save 15-20%, more flexible than RI |
| **Spot Instance** | Bid on unused EC2 capacity, save 70%, can terminate anytime |

---

## 20. REFERENCES & FURTHER READING

- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- [MongoDB Atlas Pricing](https://www.mongodb.com/pricing)
- [AWS ElastiCache Pricing](https://aws.amazon.com/elasticache/pricing/)
- [Node.js Cluster Module](https://nodejs.org/api/cluster.html)
- [Redis Memory Optimization](https://redis.io/docs/manual/optimization/memory-optimization/)
- [BullMQ Production Guidelines](https://docs.bullmq.io/guide/going-to-production)
- [MongoDB Indexing Best Practices](https://www.mongodb.com/docs/manual/core/indexes/)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

## 21. DOCUMENT VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 12-04-26 | Initial comprehensive deployment guide |

---

-date-month-last two digit of year: 12-04-26
