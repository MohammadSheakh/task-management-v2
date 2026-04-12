# EC2 Instance Specifications — Deep Dive

# Project: Task Management Backend

# Last Updated: 12-04-26

---

## 1. INSTANCE TYPE ANALYSIS

### 1.1 Why NOT t3.micro or t3.nano

**t3.nano Specifications:**
```
vCPUs: 2 (burstable)
RAM: 0.5 GB (512 MB)
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.0052
Monthly Cost: $3.80
```

**Why t3.nano FAILS:**
- ❌ 512 MB RAM cannot run Node.js cluster mode (minimum 1 GB per worker)
- ❌ Cannot run Redis (minimum 256 MB for basic Redis)
- ❌ Cannot run MongoDB connection pool
- ❌ Cannot run React/Next.js frontend (minimum 512 MB)
- ❌ Will OOM (Out of Memory) within minutes of startup
- ❌ CPU credits deplete in ~2 hours under load

**t3.micro Specifications:**
```
vCPUs: 2 (burstable)
RAM: 1 GB
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.0104
Monthly Cost: $7.59
```

**Why t3.micro FAILS:**
- ❌ 1 GB RAM is barely enough for SINGLE Node.js worker
- ❌ No room for Redis (needs 256 MB minimum)
- ❌ No room for frontend (needs 512 MB minimum)
- ❌ No buffer for OS + Nginx + logs
- ❌ Will crash under 100+ concurrent users
- ❌ Redis will evict keys immediately (memory pressure)

**Memory Breakdown on t3.micro (1 GB total):**
```
Node.js (1 worker): 512 MB (max-old-space-size)
Redis: 256 MB
Frontend: 128 MB (will struggle)
OS + Nginx: 64 MB
Buffer: 64 MB (INSUFFICIENT)
Total: 1,024 MB — NO ROOM FOR SPIKES
```

**Verdict:** ❌ **DO NOT USE** for any stage of this project.

---

### 1.2 Why t3.small is MARGINAL

**t3.small Specifications:**
```
vCPUs: 2 (burstable)
RAM: 2 GB
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.0208
Monthly Cost: $15.18
```

**Memory Breakdown on t3.small (2 GB total):**
```
Node.js (1 worker): 768 MB (max-old-space-size)
Redis: 512 MB
Frontend: 256 MB
OS + Nginx: 128 MB
Buffer: 384 MB (still tight)
Total: 2,048 MB
```

**Why t3.small is RISKY:**
- ⚠️ Can run single Node.js worker only (no cluster mode benefit)
- ⚠️ Redis limited to 512 MB (will fill up fast with 10M tasks)
- ⚠️ Frontend will be slow (256 MB is minimal for Next.js)
- ⚠️ Any traffic spike → OOM crash
- ⚠️ BullMQ workers will compete with API workers for RAM
- ⚠️ Socket.IO connections will consume memory rapidly

**When t3.small MIGHT work:**
- ✅ Development/staging environment only
- ✅ Testing with < 50 concurrent users
- ✅ Short-term MVP validation (1-2 weeks)
- ✅ NOT for production with real users

**Verdict:** ⚠️ **Only for development/testing**, never production.

---

### 1.3 Why t3.medium is ACCEPTABLE (barely)

**t3.medium Specifications:**
```
vCPUs: 2 (burstable)
RAM: 4 GB
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.0416
Monthly Cost: $30.37
```

**Memory Breakdown on t3.medium (4 GB total):**
```
Node.js (2 workers): 1.5 GB (768 MB per worker)
Redis: 1 GB
Frontend: 512 MB
OS + Nginx: 256 MB
Buffer: 768 MB (acceptable)
Total: 4,096 MB
```

**Pros:**
- ✅ Can run 2 Node.js workers (cluster mode)
- ✅ Redis has 1 GB (decent cache capacity)
- ✅ Frontend runs adequately
- ✅ Affordable ($30/month)

**Cons:**
- ⚠️ Buffer is only 768 MB (spikes will cause issues)
- ⚠️ Redis will fill up at ~500 concurrent users
- ⚠️ BullMQ workers compete with API workers
- ⚠️ No room for Kafka (if chat is enabled)
- ⚠️ Will need upgrade within 2-3 months if growth is steady

**When t3.medium works:**
- ✅ Early-stage startup (0-500 concurrent users)
- ✅ Budget-constrained MVP (1-3 months)
- ✅ You're willing to upgrade quickly when needed

**Verdict:** ✅ **Acceptable for very early stage** (0-500 users), but plan to upgrade to t3.large within 2-3 months.

---

### 1.4 Why t3.large is the SWEET SPOT (RECOMMENDED)

**t3.large Specifications:**
```
vCPUs: 2 (burstable)
RAM: 8 GB
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.0832
Monthly Cost: $60.76
```

**Memory Breakdown on t3.large (8 GB total):**
```
Node.js (2 workers): 2 GB (1 GB per worker)
Redis: 1.5 GB
Frontend (React/Next.js): 1 GB
OS + Nginx + System: 512 MB
Buffer/Overhead: 3 GB
Total: 8,192 MB
```

**Pros:**
- ✅ Ample RAM for all services + 3 GB buffer
- ✅ Can handle 1,000+ concurrent users comfortably
- ✅ Redis has 1.5 GB (good cache capacity)
- ✅ Frontend runs smoothly (1 GB is healthy for Next.js)
- ✅ Room for Kafka (if needed, ~512 MB)
- ✅ BullMQ workers don't starve API workers
- ✅ Survives traffic spikes without OOM
- ✅ Cost-effective ($61/month vs $30 for marginal gain)

**Performance Estimates:**
```
Concurrent Users: 1,000-2,000
API Response Time: < 150ms (GET with cache), < 400ms (POST)
Memory Usage: 4-5 GB (60% utilization)
CPU Usage: 20-40% (burstable, plenty of credits)
Redis Hit Rate: > 85% (with 1.5 GB cache)
```

**Cons:**
- ⚠️ Will need horizontal scaling (more instances) at ~2,000 users
- ⚠️ CPU credits may deplete under sustained high load

**Verdict:** ✅✅ **RECOMMENDED for Stage 1 (0-1,000 users)**. Best balance of cost and performance.

---

### 1.5 t3.xlarge — Stage 3 Powerhouse

**t3.xlarge Specifications:**
```
vCPUs: 4 (burstable)
RAM: 16 GB
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.1664
Monthly Cost: $121.47
```

**Memory Breakdown on t3.xlarge (16 GB total):**
```
Node.js (4 workers): 4 GB (1 GB per worker)
Redis: 2 GB
Frontend: 2 GB
Kafka (optional): 1 GB
OS + Nginx + System: 1 GB
Buffer/Overhead: 6 GB
Total: 16,384 MB
```

**Pros:**
- ✅ 4 CPU cores = 4 cluster workers (2x throughput vs t3.large)
- ✅ 16 GB RAM = plenty of room for growth
- ✅ Can handle 5,000-10,000 concurrent users per instance
- ✅ Redis can cache more data (2 GB = ~50K task details)
- ✅ Kafka can run locally (if chat is active)
- ✅ 6 GB buffer = survives major traffic spikes

**Performance Estimates:**
```
Concurrent Users: 5,000-10,000
API Response Time: < 100ms (GET with cache), < 300ms (POST)
Memory Usage: 8-10 GB (60% utilization)
CPU Usage: 30-50% (burstable, healthy credit balance)
Redis Hit Rate: > 90% (with 2 GB cache)
Throughput: ~2,000 req/sec (with proper caching)
```

**Cons:**
- ⚠️ Overkill for < 1,000 users (waste of $60/month vs t3.large)
- ⚠️ CPU credits still有限 (may deplete at sustained 70%+ usage)

**Verdict:** ✅ **Ideal for Stage 3 (10,000-50,000 users)**. Use 4 instances behind ALB.

---

### 1.6 t3.2xlarge — Enterprise Scale

**t3.2xlarge Specifications:**
```
vCPUs: 8 (burstable)
RAM: 32 GB
Network: Up to 5 Gbps
EBS Bandwidth: Up to 2,040 Mbps
Hourly Cost: $0.3328
Monthly Cost: $242.98
```

**Memory Breakdown on t3.2xlarge (32 GB total):**
```
Node.js (8 workers): 8 GB (1 GB per worker)
Redis client buffers: 2 GB
Frontend (if co-hosted): 4 GB
Kafka (if needed): 2 GB
OS + Nginx + System: 2 GB
Buffer/Overhead: 14 GB
Total: 32,768 MB
```

**Pros:**
- ✅ 8 CPU cores = maximum Node.js cluster workers
- ✅ 32 GB RAM = enterprise-grade capacity
- ✅ Can handle 20,000-50,000 concurrent users per instance
- ✅ Massive buffer for spikes and growth
- ✅ Can run all services on single instance (if needed)

**Performance Estimates:**
```
Concurrent Users: 20,000-50,000
API Response Time: < 80ms (GET with cache), < 250ms (POST)
Memory Usage: 15-20 GB (60% utilization)
CPU Usage: 40-60% (sustained, monitor CPU credits)
Throughput: ~5,000 req/sec (with proper caching)
```

**Cons:**
- ❌ Expensive ($243/month per instance)
- ❌ Wasteful if < 10,000 users
- ⚠️ CPU credits WILL deplete at sustained high load (switch to c5)

**Verdict:** ✅ **For Stage 4 (50,000-100,000+ users)**. Use 8-16 instances behind ALB.

---

## 2. INSTANCE FAMILY COMPARISON

### 2.1 t3 vs c5 vs m5 vs r5

| Family | Purpose | CPU:RAM Ratio | Best For | Cost (xlarge) |
|--------|---------|---------------|----------|---------------|
| **t3** | Burstable general purpose | 1:4 (vCPU:GB) | Variable workloads, cost-sensitive | $121/month |
| **c5** | Compute-optimized | 1:2 | High CPU usage, consistent performance | $124/month |
| **m5** | General purpose | 1:4 | Balanced workloads | $140/month |
| **r5** | Memory-optimized | 1:8 | Large caches, in-memory processing | $184/month |

### 2.2 When to Switch from t3 to c5

**Switch to c5.xlarge if:**
```
1. CPU credit balance consistently < 100
2. CPU utilization > 60% sustained (not spiky, but constant)
3. Application requires consistent high performance (no throttling acceptable)
4. You're running at 70%+ of t3.xlarge CPU capacity for > 1 hour daily
```

**c5.xlarge Specifications:**
```
vCPUs: 4 (dedicated, NOT bursty)
RAM: 8 GB
Network: Up to 10 Gbps
EBS Bandwidth: Up to 4,750 Mbps
Hourly Cost: $0.1700
Monthly Cost: $124.10
```

**Comparison: t3.xlarge vs c5.xlarge**
```
Metric              | t3.xlarge      | c5.xlarge
--------------------|----------------|----------------
vCPUs               | 4 (burstable)  | 4 (dedicated)
RAM                 | 16 GB          | 8 GB
Network             | 5 Gbps         | 10 Gbps
EBS Bandwidth       | 2,040 Mbps     | 4,750 Mbps
Sustained CPU       | Throttles at   | Full speed
                    | baseline (40%) | always
Cost                | $121/month     | $124/month
Best For            | Spiky traffic  | Consistent load
```

**Key Insight:** c5.xlarge has HALF the RAM of t3.xlarge but DOUBLE the network/EBS bandwidth and NO CPU throttling.

**Decision Matrix:**
```
IF your bottleneck is CPU → c5.xlarge
IF your bottleneck is RAM → t3.xlarge (or r5.xlarge)
IF your workload is spiky → t3.xlarge
IF your workload is constant → c5.xlarge
```

**For your use case:**
- **Stage 1-2:** t3.large (RAM is more important than CPU for caching)
- **Stage 3:** t3.xlarge (still RAM-heavy workload due to Redis)
- **Stage 4:** Consider c5.2xlarge for API servers, r5.xlarge for Redis workers

---

## 3. STORAGE CONFIGURATION

### 3.1 EBS Volume Types

| Type | IOPS | Throughput | Latency | Cost/GB | Best For |
|------|------|------------|---------|---------|----------|
| **gp2** | 3 IOPS/GB (up to 16K) | 128-250 MB/s | < 10ms | $0.10 | Legacy (use gp3 instead) |
| **gp3** ⭐ | 3,000 baseline | 125 MB/s | < 10ms | $0.08 | **General purpose (RECOMMENDED)** |
| **io2** | Up to 64K | 1,000 MB/s | < 1ms | $0.125 | Mission-critical databases |
| **st1** | 500 IOPS | 500 MB/s | < 20ms | $0.045 | Big data, log storage |

**Recommendation: gp3 for all stages**

### 3.2 Storage Sizing by Stage

**Stage 1 (t3.large):**
```
OS (Ubuntu): 10 GB
Application code: 5 GB
Docker images: 5 GB
Application logs (30 days): 10 GB
Nginx logs (30 days): 2 GB
Buffer: 18 GB
Total: 50 GB gp3
Cost: $4/month
```

**Stage 2 (t3.large ×2):**
```
Same as Stage 1 per instance: 50 GB each
Total: 100 GB (50 GB × 2)
Cost: $8/month
```

**Stage 3 (t3.xlarge ×4):**
```
OS: 10 GB
Application: 5 GB
Docker images: 5 GB
Logs (30 days, higher traffic): 20 GB
Nginx logs: 5 GB
Buffer: 55 GB
Total: 100 GB per instance
Total all instances: 400 GB
Cost: $32/month
```

**Stage 4 (t3.2xlarge ×8-16):**
```
Same as Stage 3 but more log buffer: 200 GB per instance
Total all instances: 1,600-3,200 GB
Cost: $128-256/month
```

### 3.3 Log Rotation Configuration

Create `/etc/logrotate.d/task-management`:

```bash
/var/log/task-management/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ubuntu ubuntu
    sharedscripts
    postrotate
        systemctl reload nginx > /dev/null 2>&1 || true
    endscript
}

/var/log/nginx/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 www-data adm
}
```

---

## 4. NETWORK CONFIGURATION

### 4.1 VPC Setup

```
VPC: 10.0.0.0/16
├── Public Subnet (us-east-1a): 10.0.1.0/24
│   └── Nginx Load Balancer / ALB
│
├── Private Subnet (us-east-1a): 10.0.2.0/24
│   └── EC2 App Server #1
│
├── Private Subnet (us-east-1b): 10.0.3.0/24
│   └── EC2 App Server #2
│
└── Private Subnet (us-east-1c): 10.0.4.0/24
    └── ElastiCache Redis + RDS/MongoDB (if self-hosted)
```

**Security Groups:**

**EC2 App Server SG:**
```
Inbound:
- Port 6730 (Backend): Allow from ALB SG only
- Port 6738 (Socket.IO): Allow from ALB SG only
- Port 22 (SSH): Allow from your IP only (e.g., 123.45.67.89/32)

Outbound:
- All traffic: Allow to 0.0.0.0/0
```

**ALB SG:**
```
Inbound:
- Port 80 (HTTP): Allow from 0.0.0.0/0
- Port 443 (HTTPS): Allow from 0.0.0.0/0

Outbound:
- Port 6730: Allow to EC2 App Server SG
- Port 6738: Allow to EC2 App Server SG
```

### 4.2 Bandwidth Requirements

**Stage 1 (1,000 concurrent users):**
```
Average API response: 50 KB
Requests per second: 500
Bandwidth needed: 500 × 50 KB = 25 MB/s = 200 Mbps
t3.large network: Up to 5 Gbps (sufficient)
```

**Stage 3 (50,000 concurrent users):**
```
Average API response: 50 KB
Requests per second: 25,000
Bandwidth needed: 25,000 × 50 KB = 1,250 MB/s = 10 Gbps
t3.xlarge network: Up to 5 Gbps (NEED MULTIPLE INSTANCES)
Solution: 4 instances × 2.5 Gbps each = 10 Gbps total
```

---

## 5. CPU CREDIT MANAGEMENT

### 5.1 How Burstable Instances Work

**t3 Instance CPU Credits:**
```
Baseline performance: 20% of CPU (t3.large)
CPU credits earned: 24 credits/hour (t3.large)
1 credit = 100% of 1 vCPU for 1 minute
t3.large can burst to 100% CPU using credits
```

**Credit Burn Rate:**
```
At 20% CPU: 0 credits/hour (earning 24/hr)
At 50% CPU: ~36 credits/hour (net -12/hr)
At 100% CPU: ~96 credits/hour (net -72/hr)
```

**Maximum Burst Duration (t3.large):**
```
Starting credits: 576 (24 hours of earning)
At 50% CPU: 576 / 12 = 48 hours of bursting
At 100% CPU: 576 / 72 = 8 hours of bursting
```

### 5.2 Monitoring CPU Credits

**CloudWatch Alarm:**
```json
{
  "AlarmName": "LowCPUCredits",
  "MetricName": "CPUCreditBalance",
  "Namespace": "AWS/EC2",
  "Statistic": "Average",
  "Period": 300,
  "EvaluationPeriods": 3,
  "Threshold": 50,
  "ComparisonOperator": "LessThanThreshold",
  "AlarmDescription": "CPU credits below 50, consider upgrading to c5",
  "ActionsEnabled": true
}
```

**When to Worry:**
```
CPUCreditBalance > 200: ✅ Healthy
CPUCreditBalance 100-200: ⚠️ Monitor closely
CPUCreditBalance 50-100: ⚠️ Plan upgrade to c5
CPUCreditBalance < 50: ❌ Upgrade immediately
CPUCreditBalance = 0: 🚫 Throttled to 20% CPU
```

### 5.3 CPU Credit Optimization

**Strategies:**
```
1. Enable T3 Unlimited (pay for extra credits when depleted)
   - Cost: $0.05 per vCPU-hour when credits run out
   - Good for: Unpredictable traffic spikes

2. Use cron jobs to schedule heavy operations during low-traffic hours
   - BullMQ bulk operations: Run at 2-5 AM
   - Report generation: Run during off-peak

3. Implement request queuing for non-critical operations
   - Return 202 Accepted immediately
   - Process via BullMQ when CPU credits are healthy
```

---

## 6. RECOMMENDATIONS BY USER COUNT

### 6.1 Quick Reference Table

| Concurrent Users | Instance Type | Count | RAM per Instance | Total RAM | Monthly Cost |
|------------------|---------------|-------|------------------|-----------|--------------|
| **0-100** | t3.medium | 1 | 4 GB | 4 GB | $30 |
| **100-500** | t3.large | 1 | 8 GB | 8 GB | $61 |
| **500-1,000** | t3.large | 1 | 8 GB | 8 GB | $61 |
| **1,000-2,000** | t3.large | 2 | 8 GB | 16 GB | $122 |
| **2,000-5,000** | t3.large | 3 | 8 GB | 24 GB | $183 |
| **5,000-10,000** | t3.xlarge | 4 | 16 GB | 64 GB | $486 |
| **10,000-20,000** | t3.xlarge | 6 | 16 GB | 96 GB | $729 |
| **20,000-50,000** | t3.xlarge | 8 | 16 GB | 128 GB | $972 |
| **50,000-100,000** | t3.2xlarge | 12 | 32 GB | 384 GB | $2,916 |

**Note:** These costs are for EC2 instances ONLY. Add MongoDB Atlas, ElastiCache, data transfer, etc. (see cost analysis document).

### 6.2 Final Recommendation

**Start with: t3.large (1 instance)**
```
Why:
- Handles 1,000 concurrent users comfortably
- 8 GB RAM provides ample buffer
- $61/month is affordable for startup
- Easy to scale vertically (upgrade to larger instance)
- Easy to scale horizontally (add more instances)
```

**Upgrade Path:**
```
Month 1-3: t3.large (1 instance) → 0-1,000 users
Month 3-6: t3.large (2 instances + ALB) → 1,000-5,000 users
Month 6-12: t3.xlarge (4 instances + ALB) → 5,000-20,000 users
Month 12+: t3.2xlarge (8-16 instances + ALB) → 20,000-100,000+ users
```

**DO NOT:**
- ❌ Start with t3.micro or t3.small (will crash)
- ❌ Start with t3.xlarge (waste of money at low traffic)
- ❌ Skip monitoring (you won't know when to upgrade)
- ❌ Forget about CPU credits (t3 instances throttle when depleted)

---

-date-month-last two digit of year: 12-04-26
