# Monitoring, Security, Backup & Disaster Recovery

# Project: Task Management Backend

# Last Updated: 12-04-26

---

## TABLE OF CONTENTS

1. [Monitoring Strategy](#monitoring)
2. [CloudWatch Setup](#cloudwatch)
3. [Application Performance Monitoring (APM)](#apm)
4. [Logging Strategy](#logging)
5. [Security Hardening](#security)
6. [Backup Strategy](#backup)
7. [Disaster Recovery Plan](#disaster-recovery)
8. [Incident Response](#incident-response)
9. [Runbooks](#runbooks)

---

## MONITORING STRATEGY <a name="monitoring"></a>

### 1. Monitoring Layers

```
┌─────────────────────────────────────────────────┐
│              Monitoring Stack                     │
│                                                    │
│  ┌───────────────────────────────────────────┐   │
│  │  Layer 4: Business Metrics                 │   │
│  │  - Active users, tasks created, revenue   │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │  Layer 3: Application Metrics              │   │
│  │  - Response times, error rates, throughput│   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │  Layer 2: Infrastructure Metrics           │   │
│  │  - CPU, memory, disk, network             │   │
│  └───────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────┐   │
│  │  Layer 1: Service Health                   │   │
│  │  - MongoDB, Redis, BullMQ, Socket.IO      │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### 2. Key Metrics to Monitor

**Layer 1: Service Health (Critical - Page if down)**

| Metric | Target | Check Interval | Alert Threshold | Action |
|--------|--------|----------------|-----------------|--------|
| **MongoDB Connection** | Connected | 30s | Disconnected | Page on-call |
| **Redis Connection** | Connected | 30s | Disconnected | Page on-call |
| **BullMQ Workers** | Running | 1 min | Not running | Restart workers |
| **Socket.IO** | Listening | 1 min | Port closed | Restart app |
| **Health Endpoint** | 200 OK | 30s | 5xx or timeout | Investigate |

**Layer 2: Infrastructure Metrics (Warning - Investigate)**

| Metric | Target | Check Interval | Warning | Critical | Action |
|--------|--------|----------------|---------|----------|--------|
| **CPU Utilization** | < 60% | 1 min | > 70% for 5 min | > 90% for 5 min | Scale out |
| **Memory Utilization** | < 70% | 1 min | > 80% for 5 min | > 90% for 5 min | Scale up |
| **Disk Usage** | < 70% | 5 min | > 80% | > 90% | Clean logs, expand disk |
| **Network I/O** | < 1 Gbps | 1 min | > 80% of limit | > 95% of limit | Investigate |
| **CPU Credits (t3)** | > 100 | 5 min | < 50 | < 20 | Upgrade to c5 |

**Layer 3: Application Metrics (Warning - Investigate)**

| Metric | Target | Check Interval | Warning | Critical | Action |
|--------|--------|----------------|---------|----------|--------|
| **API Response Time (p95)** | < 200ms (GET) | 1 min | > 200ms | > 500ms | Optimize queries |
| **API Response Time (p99)** | < 500ms (POST) | 1 min | > 500ms | > 1000ms | Offload to BullMQ |
| **Error Rate (5xx)** | < 0.1% | 1 min | > 1% | > 5% | Rollback if recent deploy |
| **Error Rate (4xx)** | < 5% | 5 min | > 10% | > 20% | Check for abuse |
| **Requests per Second** | Varies | 1 min | Sudden drop | Sudden spike | Investigate |
| **Cache Hit Rate** | > 80% | 5 min | < 70% | < 50% | Increase Redis |

**Layer 4: Business Metrics (Info - Review Daily)**

| Metric | Target | Check Interval | Alert | Action |
|--------|--------|----------------|-------|--------|
| **Active Users (DAU)** | Growing | 1 hour | Sudden drop > 20% | Investigate |
| **Tasks Created/Hour** | Varies | 1 hour | Sudden spike | Check for abuse |
| **Tasks Completed/Hour** | Varies | 1 hour | Low completion rate | Check BullMQ |
| **API Usage per User** | Varies | Daily | Sudden increase | Check for scraping |
| **Revenue (if applicable)** | Growing | Daily | Payment failures | Check Stripe |

---

## CLOUDWATCH SETUP <a name="cloudwatch"></a>

### 1. Install CloudWatch Agent

```bash
# Install CloudWatch Agent
sudo apt update
sudo apt install amazon-cloudwatch-agent -y

# Generate configuration
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# Or create manually:
sudo nano /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
```

**CloudWatch Agent Configuration:**

```json
{
  "agent": {
    "metrics_collection_interval": 60,
    "run_as_user": "root"
  },
  "metrics": {
    "append_dimensions": {
      "AutoScalingGroupName": "${aws:AutoScalingGroupName}",
      "ImageId": "${aws:ImageId}",
      "InstanceId": "${aws:InstanceId}",
      "InstanceType": "${aws:InstanceType}"
    },
    "metrics_collected": {
      "cpu": {
        "resources": ["*"],
        "measurement": [
          {"name": "cpu_usage_idle", "rename": "CPU_USAGE_IDLE", "unit": "Percent"},
          {"name": "cpu_usage_nice", "unit": "Percent"},
          {"name": "cpu_usage_guest", "unit": "Percent"},
          "cpu_usage_user",
          "cpu_usage_system"
        ],
        "totalcpu": false,
        "drop_device": true,
        "fieldpass": ["usage_idle", "usage_user", "usage_system"]
      },
      "disk": {
        "resources": ["/"],
        "measurement": [
          {"name": "disk_used_percent", "unit": "Percent"},
          "disk_free",
          "disk_total"
        ],
        "drop_device": true
      },
      "mem": {
        "measurement": [
          "mem_used",
          "mem_used_percent",
          "mem_available",
          "mem_available_percent"
        ]
      },
      "net": {
        "resources": ["eth0"],
        "measurement": [
          "bytes_sent",
          "bytes_recv",
          "drop_in",
          "drop_out"
        ]
      },
      "swap": {
        "measurement": [
          "swap_used_percent"
        ]
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/task-mgmt/app.log",
            "log_group_name": "/task-mgmt/app",
            "log_stream_name": "{instance_id}/app",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/task-mgmt/error.log",
            "log_group_name": "/task-mgmt/error",
            "log_stream_name": "{instance_id}/error",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/backend_access.log",
            "log_group_name": "/task-mgmt/nginx/access",
            "log_stream_name": "{instance_id}/access",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/nginx/backend_error.log",
            "log_group_name": "/task-mgmt/nginx/error",
            "log_stream_name": "{instance_id}/error",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
```

**Start CloudWatch Agent:**
```bash
# Start agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

# Check status
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -m ec2 -a status
```

---

### 2. CloudWatch Alarms

**Create Alarms via AWS CLI:**

```bash
# ==========================================
# CPU Utilization Alarms
# ==========================================
aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-HighCPU-Warning" \
  --alarm-description "CPU utilization > 70% for 5 minutes" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 70 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts \
  --unit Percent

aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-HighCPU-Critical" \
  --alarm-description "CPU utilization > 90% for 5 minutes" \
  --metric-name CPUUtilization \
  --namespace AWS/EC2 \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts-critical \
  --unit Percent

# ==========================================
# Memory Utilization Alarms
# ==========================================
aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-HighMemory-Warning" \
  --alarm-description "Memory utilization > 80% for 5 minutes" \
  --metric-name mem_used_percent \
  --namespace CWAgent \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts \
  --unit Percent

aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-HighMemory-Critical" \
  --alarm-description "Memory utilization > 90% for 5 minutes" \
  --metric-name mem_used_percent \
  --namespace CWAgent \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 90 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts-critical \
  --unit Percent

# ==========================================
# Disk Utilization Alarm
# ==========================================
aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-HighDisk-Warning" \
  --alarm-description "Disk utilization > 80%" \
  --metric-name disk_used_percent \
  --namespace CWAgent \
  --statistic Average \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts \
  --unit Percent

# ==========================================
# Status Check Failed (Instance Health)
# ==========================================
aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-InstanceHealth" \
  --alarm-description "Instance status check failed" \
  --metric-name StatusCheckFailed \
  --namespace AWS/EC2 \
  --statistic Maximum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=InstanceId,Value=i-1234567890abcdef0 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts-critical \
  --unit Count

# ==========================================
# ALB Target Response Time (Stage 2+)
# ==========================================
aws cloudwatch put-metric-alarm \
  --alarm-name "TaskMgmt-ALB-HighResponseTime" \
  --alarm-description "ALB target response time (p95) > 500ms" \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 0.5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=LoadBalancer,Value=app/task-mgmt-alb/abc123 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:task-mgmt-alerts \
  --unit Seconds
```

---

### 3. CloudWatch Dashboard

**Create custom dashboard:**

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "TaskMgmt-Production" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "x": 0,
        "y": 0,
        "width": 6,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/EC2", "CPUUtilization", "InstanceId", "i-1234567890abcdef0"]
          ],
          "period": 60,
          "stat": "Average",
          "title": "CPU Utilization",
          "yAxis": {"left": {"min": 0, "max": 100}}
        }
      },
      {
        "type": "metric",
        "x": 6,
        "y": 0,
        "width": 6,
        "height": 6,
        "properties": {
          "metrics": [
            ["CWAgent", "mem_used_percent", "InstanceId", "i-1234567890abcdef0"]
          ],
          "period": 60,
          "stat": "Average",
          "title": "Memory Utilization",
          "yAxis": {"left": {"min": 0, "max": 100}}
        }
      },
      {
        "type": "metric",
        "x": 12,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/task-mgmt-alb/abc123"],
            [".", "TargetResponseTime", ".", "."]
          ],
          "period": 60,
          "stat": "Sum",
          "title": "ALB Requests & Response Time"
        }
      },
      {
        "type": "log",
        "x": 0,
        "y": 6,
        "width": 12,
        "height": 6,
        "properties": {
          "query": "SOURCE \"/task-mgmt/error\" | fields @timestamp, @message | sort @timestamp desc | limit 100",
          "title": "Recent Errors"
        }
      }
    ]
  }'
```

---

## APPLICATION PERFORMANCE MONITORING (APM) <a name="apm"></a>

### 1. Custom Metrics in Application

**Add to your application:**

```typescript
// src/middleware/metrics.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/logger';

// In-memory metrics (export to CloudWatch periodically)
const metrics = {
  requests: {} as Record<string, number>,
  responseTimes: {} as Record<string, number[]>,
  errors: {} as Record<string, number>,
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const route = req.route?.path || req.path;
  const key = `${req.method} ${route}`;

  // Track request start
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Increment request count
    metrics.requests[key] = (metrics.requests[key] || 0) + 1;

    // Track response time
    if (!metrics.responseTimes[key]) {
      metrics.responseTimes[key] = [];
    }
    metrics.responseTimes[key].push(duration);

    // Track errors
    if (statusCode >= 500) {
      metrics.errors[key] = (metrics.errors[key] || 0) + 1;
      logger.error('5xx Error', {
        method: req.method,
        route: key,
        statusCode,
        duration,
        userId: (req as any).user?.id,
        ip: req.ip,
      });
    }

    // Log all requests (for debugging)
    logger.info('Request completed', {
      method: req.method,
      route: key,
      statusCode,
      duration,
    });
  });

  next();
}

// Export metrics periodically
setInterval(() => {
  logger.info('Metrics Summary (last 60s):', JSON.stringify(metrics, null, 2));

  // Calculate percentiles
  for (const [route, times] of Object.entries(metrics.responseTimes)) {
    if (times.length === 0) continue;

    const sorted = [...times].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];

    logger.info(`Response Time: ${route}`, {
      count: times.length,
      p50,
      p95,
      p99,
    });
  }

  // Reset for next interval
  Object.keys(metrics.requests).forEach(k => metrics.requests[k] = 0);
  Object.keys(metrics.responseTimes).forEach(k => metrics.responseTimes[k] = []);
  Object.keys(metrics.errors).forEach(k => metrics.errors[k] = 0);
}, 60000); // Every 60 seconds
```

---

### 2. Distributed Tracing (AWS X-Ray)

**Install X-Ray SDK:**
```bash
pnpm add aws-xray-sdk-core
```

**Add to app.ts:**
```typescript
import AWSXRay from 'aws-xray-sdk-core';

// Enable X-Ray (production only)
if (process.env.NODE_ENV === 'production') {
  AWSXRay.captureHTTPsGlobal(require('http'));
  AWSXRay.captureHTTPsGlobal(require('https'));

  // Add X-Ray middleware to Express
  app.use(AWSXRay.express.openSegment('TaskMgmt-Backend'));
}

// ... your routes ...

if (process.env.NODE_ENV === 'production') {
  app.use(AWSXRay.express.closeSegment());
}
```

**Install X-Ray Daemon on EC2:**
```bash
# Download and install
curl https://s3.us-east-2.amazonaws.com/aws-xray-assets.us-east-2/xray-daemon/aws-xray-daemon-3.x.deb -o /tmp/xray.deb
sudo dpkg -i /tmp/xray.deb

# Enable and start
sudo systemctl enable xray
sudo systemctl start xray
```

---

### 3. Business Metrics Tracking

```typescript
// src/services/metrics.service.ts
import { redisClient } from '../helpers/redis/redis';

export class MetricsService {
  // Track active users
  async trackActiveUser(userId: string) {
    const today = new Date().toISOString().split('T')[0];
    const key = `metrics:dau:${today}`;
    await redisClient.sAdd(key, userId);
    await redisClient.expire(key, 86400 * 2); // Keep for 2 days
  }

  // Get DAU
  async getDailyActiveUsers(date: string): Promise<number> {
    const key = `metrics:dau:${date}`;
    return await redisClient.sCard(key);
  }

  // Track task creation
  async trackTaskCreated() {
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    const key = `metrics:tasks-created:${hour}`;
    await redisClient.incr(key);
    await redisClient.expire(key, 86400 * 7); // Keep for 7 days
  }

  // Track task completion
  async trackTaskCompleted() {
    const hour = new Date().toISOString().slice(0, 13);
    const key = `metrics:tasks-completed:${hour}`;
    await redisClient.incr(key);
    await redisClient.expire(key, 86400 * 7);
  }

  // Get tasks created per hour
  async getTasksCreatedPerHour(date: string): Promise<number[]> {
    const results = [];
    for (let hour = 0; hour < 24; hour++) {
      const key = `metrics:tasks-created:${date}T${hour.toString().padStart(2, '0')}`;
      const count = await redisClient.get(key);
      results.push(parseInt(count || '0'));
    }
    return results;
  }
}
```

---

## LOGGING STRATEGY <a name="logging"></a>

### 1. Structured JSON Logging

**Your current Winston setup (enhanced):**

```typescript
// src/shared/logger.ts
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, errors, json } = winston.format;

// Custom format for production
const productionFormat = printf(({ level, message, timestamp, ...meta }) => {
  return JSON.stringify({
    level,
    message,
    timestamp,
    ...meta,
  });
});

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'ISO8601' }),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: {
    service: 'task-mgmt-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console (for Docker/cloud logging)
    new winston.transports.Console({
      format: combine(
        timestamp(),
        json()
      ),
    }),

    // Application log file (daily rotation)
    new DailyRotateFile({
      filename: '/var/log/task-mgmt/app-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      zippedArchive: true,
      level: 'info',
    }),

    // Error log file (separate, for easier debugging)
    new DailyRotateFile({
      filename: '/var/log/task-mgmt/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '90d',
      zippedArchive: true,
      level: 'error',
    }),
  ],
});

// Create errorLogger (alias for errors)
const errorLogger = logger.child({ type: 'error' });

export { logger, errorLogger };
```

### 2. Request Correlation ID

**Add correlation ID middleware:**
```typescript
// src/middleware/correlationId.ts
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Get correlation ID from header (if from upstream service) or generate new
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  // Add to request object
  (req as any).correlationId = correlationId;

  // Add to response header
  res.setHeader('X-Correlation-ID', correlationId);

  // Add to all logs in this request
  (req as any).logger = logger.child({ correlationId });

  next();
}

// Use in app.ts
app.use(correlationIdMiddleware);
```

**Usage in controllers:**
```typescript
// In your controller
const reqLogger = (req as any).logger || logger;
reqLogger.info('Processing request', { taskId, userId });
```

### 3. Log Levels Guide

| Level | When to Use | Example | Alert? |
|-------|-------------|---------|--------|
| **ERROR** | Operation failed, needs investigation | DB connection lost, payment failed | Yes (immediate) |
| **WARN** | Something unusual, but system continues | Cache miss rate high, slow query detected | Yes (review) |
| **INFO** | Normal operation, significant events | User logged in, task created, deployment | No |
| **DEBUG** | Detailed information for debugging | Query execution time, cache hit/miss | No |

**Log Examples:**

```typescript
// ERROR (with context)
errorLogger.error('Payment processing failed', {
  userId,
  paymentId,
  error: error.message,
  stack: error.stack,
  amount,
  currency,
});

// WARN
logger.warn('Cache hit rate below target', {
  hitRate: '65%',
  target: '80%',
  period: 'last 5 minutes',
});

// INFO
logger.info('User logged in', {
  userId,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
});

// DEBUG
logger.debug('Database query executed', {
  query: 'Task.find',
  filters: { userId, status: 'active' },
  duration: '45ms',
  results: 15,
});
```

---

## SECURITY HARDENING <a name="security"></a>

### 1. EC2 Security Hardening

**SSH Security:**
```bash
# 1. Disable root SSH login
sudo nano /etc/ssh/sshd_config
# Change:
PermitRootLogin no

# 2. Use SSH keys only (disable password authentication)
PasswordAuthentication no
ChallengeResponseAuthentication no
UsePAM yes

# 3. Change default SSH port (optional, reduces automated attacks)
Port 2222

# 4. Limit SSH access to specific IPs
# In /etc/ssh/sshd_config:
AllowUsers ubuntu@your.ip.address.here

# 5. Restart SSH service
sudo systemctl restart sshd
```

**Firewall (UFW):**
```bash
# Install UFW
sudo apt install ufw -y

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (from your IP only)
sudo ufw allow from your.ip.address.here to any port 22 proto tcp

# Allow HTTP (for Let's Encrypt)
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Enable UFW
sudo ufw enable

# Check status
sudo ufw status verbose
```

**Fail2Ban (Brute Force Protection):**
```bash
# Install fail2ban
sudo apt install fail2ban -y

# Create jail configuration
sudo nano /etc/fail2ban/jail.local

# Add:
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Check status
sudo fail2ban-client status sshd
```

**Automatic Security Updates:**
```bash
# Install unattended upgrades
sudo apt install unattended-upgrades -y

# Configure
sudo dpkg-reconfigure -plow unattended-upgrades

# Edit configuration
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades

# Ensure these lines are uncommented:
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";

# Test
sudo unattended-upgrades --dry-run
```

### 2. Application Security

**CORS Whitelist (No Wildcards):**
```typescript
// src/app.ts
import cors from 'cors';

const corsOptions = {
  origin: [
    'https://app.yourdomain.com',
    'https://admin.yourdomain.com',
    'https://yourdomain.com',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

**Helmet.js (Security Headers):**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.yourdomain.com'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
}));
```

**Rate Limiting (Already implemented, verify):**
```typescript
// Verify rate limiting is active on all routes
// Check response headers:
curl -I https://api.yourdomain.com/api/v1/tasks

# Expected headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 1617724800
```

**Input Validation (Zod):**
```typescript
// Verify all endpoints use Zod validation
// Example:
import { z } from 'zod';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.date().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
});

// Validate in controller
const result = createTaskSchema.safeParse(req.body);
if (!result.success) {
  throw new ApiError(400, 'Invalid input', result.error);
}
```

### 3. Secrets Management

**AWS SSM Parameter Store:**
```bash
# Store secrets securely
aws ssm put-parameter \
  --name "/task-mgmt/prod/MONGODB_URL" \
  --value "mongodb+srv://user:pass@cluster.mongodb.net/db" \
  --type SecureString

aws ssm put-parameter \
  --name "/task-mgmt/prod/JWT_ACCESS_SECRET" \
  --value "$(openssl rand -hex 64)" \
  --type SecureString

# Retrieve in deployment script
MONGODB_URL=$(aws ssm get-parameter \
  --name "/task-mgmt/prod/MONGODB_URL" \
  --with-decryption \
  --query Parameter.Value \
  --output text)

# Grant EC2 instance permission to read
aws iam put-role-policy \
  --role-name EC2-TaskMgmt-Role \
  --policy-name SSM-Read-TaskMgmt \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ],
        "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/task-mgmt/prod/*"
      }
    ]
  }'
```

### 4. Database Security

**MongoDB Network Access:**
```
MongoDB Atlas → Network Access → Add IP Address

Allowed IPs:
- EC2 security group IP (private IP)
- Your office IP (for admin access)

NEVER allow: 0.0.0.0/0 (entire internet)
```

**MongoDB User Permissions:**
```javascript
// Create application user (limited permissions)
use task-management

db.createRole({
  role: "appRole",
  privileges: [
    {
      resource: { db: "task-management", collection: "" },
      actions: ["find", "insert", "update", "remove", "createIndex"]
    }
  ],
  roles: []
});

db.createUser({
  user: "app-user",
  pwd: "strong_password_here",
  roles: [{ role: "appRole", db: "task-management" }]
});

// Create admin user (for management)
db.createUser({
  user: "admin-user",
  pwd: "strong_admin_password_here",
  roles: [
    { role: "dbAdmin", db: "task-management" },
    { role: "readWrite", db: "task-management" }
  ]
});
```

### 5. File Upload Security

**S3 Presigned URLs (Never expose credentials):**
```typescript
// Generate presigned URL for upload
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-formatter';

const s3Client = new S3Client({ region: process.env.AWS_REGION });

export async function generateUploadPresignedUrl(userId: string, fileName: string) {
  const key = `uploads/${userId}/${Date.now()}-${fileName}`;
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: 'application/octet-stream',
    MaxContentLength: 50 * 1024 * 1024, // 50 MB
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return { url, key };
}

// Frontend uploads directly to S3 (no backend involvement)
```

**Validate File Types:**
```typescript
// Validate file type before generating presigned URL
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
];

if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new ApiError(400, 'Invalid file type');
}
```

---

## BACKUP STRATEGY <a name="backup"></a>

### 1. Backup Overview

| Component | Method | Frequency | Retention | Recovery Time |
|-----------|--------|-----------|-----------|---------------|
| **MongoDB** | Atlas automated backups | Daily | 7 days (Stage 1-2), 14 days (Stage 3+) | < 1 hour |
| **Redis** | ElastiCache snapshots (Stage 2+), AOF file (Stage 1) | Daily | 7 days | < 30 minutes |
| **S3 Files** | Versioning + cross-region replication | Real-time | Indefinite | Immediate |
| **EC2 AMI** | Automated via Lambda/CloudWatch Events | Weekly | 4 weeks | < 30 minutes |
| **Nginx Config** | Git repository | Every change | Indefinite | < 5 minutes |
| **Environment Variables** | AWS SSM Parameter Store | Every change | Indefinite | < 5 minutes |
| **Application Logs** | CloudWatch Logs | Real-time | 30 days | Immediate |

### 2. MongoDB Backup (Atlas)

**Atlas handles backups automatically:**
```
Backup Schedule: Daily at 03:00 UTC (configure in Atlas Console)
Retention: 7 days (default), extend to 14 days for Stage 3+
Point-in-Time Recovery (PITR): Enable (+ $15/month)
  - Continuous oplog backup
  - Restore to any second in retention period
```

**Manual Backup (if needed):**
```bash
# Using mongodump
mongodump \
  --uri "mongodb+srv://admin:password@cluster.mongodb.net/task-management" \
  --out /backup/mongodb/$(date +%Y%m%d)

# Compress
tar -czf /backup/mongodb/backup-$(date +%Y%m%d).tar.gz \
  /backup/mongodb/$(date +%Y%m%d)

# Upload to S3
aws s3 cp /backup/mongodb/backup-$(date +%Y%m%d).tar.gz \
  s3://task-mgmt-backups/mongodb/
```

**Restore from Backup:**
```bash
# Download backup
aws s3 cp s3://task-mgmt-backups/mongodb/backup-20260412.tar.gz .

# Extract
tar -xzf backup-20260412.tar.gz

# Restore
mongorestore \
  --uri "mongodb+srv://admin:password@cluster.mongodb.net/task-management" \
  --drop \
  /backup/mongodb/20260412/task-management
```

### 3. Redis Backup

**Stage 1: Docker Redis (AOF File)**
```bash
# AOF is enabled by default (appendonly yes)
# Backup script:

#!/bin/bash
BACKUP_DIR="/backup/redis"
DATE=$(date +%Y%m%d-%H%M%S)

# Trigger save
docker exec task-mgmt-redis redis-cli -a $REDIS_PASSWORD BGSAVE

# Wait for save
sleep 5

# Copy AOF file
docker cp task-mgmt-redis:/data/appendonly.aof $BACKUP_DIR/appendonly-$DATE.aof

# Compress
gzip $BACKUP_DIR/appendonly-$DATE.aof

# Delete old backups (keep 7 days)
find $BACKUP_DIR -name "appendonly-*.aof.gz" -mtime +7 -delete
```

**Stage 2+: ElastiCache (Automated Snapshots)**
```
Backup Window: 02:00-04:00 UTC (configure in AWS Console)
Retention: 7 days
Manual Snapshots: Available via AWS Console or CLI
```

```bash
# Create manual snapshot
aws elasticache create-snapshot \
  --cache-cluster-id task-mgmt-redis \
  --snapshot-name manual-$(date +%Y%m%d)

# List snapshots
aws elasticache describe-snapshots \
  --cache-cluster-id task-mgmt-redis
```

### 4. EC2 AMI Backup

**Automated AMI Creation:**
```bash
# Create Lambda function for automated AMI creation
# Use AWS SDK to create AMI weekly

import boto3
import datetime

def lambda_handler(event, context):
    ec2 = boto3.client('ec2')
    
    # Create AMI
    instance_id = 'i-1234567890abcdef0'
    name = f"task-mgmt-backup-{datetime.datetime.now().strftime('%Y%m%d')}"
    
    response = ec2.create_image(
        InstanceId=instance_id,
        Name=name,
        Description=f"Weekly backup of Task Management EC2",
        NoReboot=True
    )
    
    image_id = response['ImageId']
    
    # Add tags
    ec2.create_tags(
        Resources=[image_id],
        Tags=[
            {'Key': 'Name', 'Value': name},
            {'Key': 'Purpose', 'Value': 'Backup'},
            {'Key': 'DeleteAfter', 'Value': (datetime.datetime.now() + datetime.timedelta(days=28)).strftime('%Y-%m-%d')}
        ]
    )
    
    # Delete old AMIs (older than 28 days)
    # (Add cleanup logic here)
    
    return {
        'statusCode': 200,
        'body': f"Created AMI: {image_id}"
    }
```

**CloudWatch Events (Trigger Lambda weekly):**
```json
{
  "source": ["aws.events"],
  "detail-type": ["Scheduled Event"],
  "schedule": "cron(0 2 ? * SUN *)"
}
```

### 5. Backup Verification

**Monthly Backup Restoration Test:**
```
Schedule: First Monday of every month
Procedure:
  1. Create test EC2 instance from AMI
  2. Restore MongoDB from backup to test cluster
  3. Restore Redis from snapshot to test cluster
  4. Verify application starts successfully
  5. Verify data integrity (spot-check records)
  6. Document results
  7. Terminate test infrastructure

Success Criteria:
  - Application starts within 5 minutes
  - All critical endpoints respond
  - Sample data matches production
  - No errors in logs
```

---

## DISASTER RECOVERY PLAN <a name="disaster-recovery"></a>

### 1. RTO & RPO Targets

| Stage | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|-------|-------------------------------|-------------------------------|
| **Stage 1** | < 2 hours | < 24 hours (daily backups) |
| **Stage 2** | < 1 hour | < 24 hours (daily backups) |
| **Stage 3** | < 30 minutes | < 1 hour (PITR enabled) |
| **Stage 4** | < 15 minutes | < 5 minutes (cross-region replication) |

### 2. Disaster Scenarios & Recovery Procedures

**Scenario 1: EC2 Instance Failure**

```
Detection: CloudWatch alarm (StatusCheckFailed)
Impact: Application down, Redis down (if Docker)

Recovery Steps:
  1. Auto Scaling launches new instance (Stage 2+) OR
     Manually launch new instance from AMI (Stage 1)
  2. New instance pulls latest code from Git
  3. Deploy script runs automatically (user data)
  4. New instance connects to MongoDB Atlas + ElastiCache
  5. Health check passes
  6. Nginx routes traffic to new instance

Estimated Recovery Time:
  Stage 1: 15-30 minutes (manual)
  Stage 2+: 5-10 minutes (automatic)

Data Loss: None (stateless application, all data in external services)
```

**Scenario 2: MongoDB Failure**

```
Detection: Application errors, CloudWatch alarm
Impact: All database operations fail

Recovery Steps:
  1. Atlas automatically fails over to secondary node (< 1 minute)
  2. Application reconnects automatically (retryWrites: true)
  3. If catastrophic failure (data corruption):
     a. Stop application (prevent further writes)
     b. Restore from latest backup to new cluster
     c. Update MONGODB_URL in .env
     d. Restart application
     e. Verify data integrity

Estimated Recovery Time:
  Automatic failover: < 1 minute
  Manual restore: 30-60 minutes

Data Loss:
  Automatic failover: None
  Manual restore: Up to 24 hours (depends on backup age)
```

**Scenario 3: Redis Failure**

```
Detection: Application errors, cache hit rate drops to 0%
Impact: Slow responses, rate limiting broken, BullMQ jobs stuck

Recovery Steps:
  1. ElastiCache automatically fails over to replica (< 30 seconds)
  2. Application reconnects (ioredis retryStrategy)
  3. During cache warm-up (5-15 minutes):
     - Expect higher DB load (monitor closely)
     - API response times may increase temporarily
     - Rate limiting counters reset (temporary vulnerability)
  4. If catastrophic failure:
     a. Create new ElastiCache cluster from snapshot
     b. Update REDIS_HOST in .env
     c. Restart application
     d. Monitor cache warm-up

Estimated Recovery Time:
  Automatic failover: < 30 seconds
  Manual restore: 15-30 minutes

Data Loss:
  Session data: Lost (users need to re-login)
  Cache: Lost (will rebuild from DB queries)
  BullMQ queues: Lost (jobs need to be re-queued)
  Rate limits: Reset
```

**Scenario 4: Data Corruption (Application Bug)**

```
Detection: User reports, error monitoring, data validation checks
Impact: Corrupted data in MongoDB

Recovery Steps:
  1. Stop application immediately (prevent further corruption)
  2. Identify root cause (review recent deployments, logs)
  3. Fix bug in code
  4. Restore MongoDB to point before corruption:
     a. Use PITR (Point-in-Time Recovery)
     b. Restore to timestamp just before corruption started
     c. Test restored data integrity
  5. Deploy fixed application
  6. Monitor closely for 24 hours

Estimated Recovery Time: 1-2 hours
Data Loss: From corruption start time to backup time
```

**Scenario 5: Security Breach**

```
Detection: Unusual activity, AWS GuardDuty, user reports
Impact: Potential data breach

Recovery Steps:
  1. Isolate affected instances (security group changes)
  2. Rotate ALL secrets:
     - JWT secrets
     - Redis password
     - MongoDB credentials
     - API keys (Stripe, S3, etc.)
  3. Review access logs (identify compromised data)
  4. Patch vulnerability
  5. Restore from clean backup (if data modified)
  6. Notify affected users (if PII compromised)
  7. File incident report
  8. Conduct post-mortem

Estimated Recovery Time: 4-24 hours (depends on severity)
Data Loss: Depends on breach type
```

### 3. Disaster Recovery Checklist

```
Pre-Disaster Preparation:
□ Backups configured and tested
□ AMI created weekly
□ Runbooks documented
□ Team trained on recovery procedures
□ Contact list updated (AWS support, team members)
□ Post-mortem template prepared

During Disaster:
□ Assess impact (what's broken, what's working)
□ Communicate to stakeholders (team, users if needed)
□ Follow appropriate runbook
□ Document actions taken (for post-mortem)
□ Monitor recovery progress

Post-Disaster:
□ Verify application fully operational
□ Monitor for 24 hours (watch for recurring issues)
□ Conduct post-mortem within 48 hours
□ Update runbooks based on lessons learned
□ Implement preventive measures
□ Review and update disaster recovery plan
```

---

## INCIDENT RESPONSE <a name="incident-response"></a>

### 1. Incident Severity Levels

| Level | Description | Response Time | Escalation | Example |
|-------|-------------|---------------|------------|---------|
| **SEV-1 (Critical)** | Complete outage, data loss | Immediate (24/7) | CTO + Engineering Lead | DB down, security breach |
| **SEV-2 (High)** | Major feature broken, affecting > 50% users | < 30 minutes | Engineering Lead | BullMQ workers down, payment failures |
| **SEV-3 (Medium)** | Minor feature broken, affecting < 50% users | < 2 hours | On-call Engineer | Slow responses, cache issues |
| **SEV-4 (Low)** | Cosmetic issue, edge case | < 24 hours | Development Team | UI bug, rare error |

### 2. Incident Response Process

```
1. DETECT
   - Automated alerts (CloudWatch, application monitoring)
   - User reports (support tickets, social media)
   - Manual observation (team monitoring)

2. ASSESS
   - Determine severity level
   - Identify affected systems/users
   - Estimate impact

3. RESPOND
   - Follow appropriate runbook
   - Communicate to stakeholders
   - Implement fix or workaround

4. RESOLVE
   - Verify fix is working
   - Monitor for recurrence (24 hours)
   - Communicate resolution to stakeholders

5. REVIEW
   - Conduct post-mortem within 48 hours
   - Document root cause
   - Identify preventive measures
   - Update runbooks
   - Implement improvements
```

### 3. Communication Templates

**Initial Incident Message:**
```
Subject: [SEV-2] Task Management API - High Error Rates

Team,

We're experiencing high error rates (5xx) on the Task Management API starting at {time}.

Impact:
- Approximately {X}% of users affected
- Features impacted: {list features}

Current Status:
- Investigating root cause
- Suspected issue: {description}

Next Update: {time, typically 30 minutes}

On-Call: {name}
```

**Resolution Message:**
```
Subject: [RESOLVED] Task Management API - High Error Rates

Team,

The incident affecting the Task Management API has been resolved.

Root Cause:
{Description of what caused the issue}

Resolution:
{Description of fix applied}

Impact:
- Duration: {start time} to {end time}
- Users affected: {estimate}
- Data loss: {yes/no, describe if yes}

Preventive Measures:
{List actions to prevent recurrence}

Post-Mortem: Scheduled for {date/time}
```

---

## RUNBOOKS <a name="runbooks"></a>

### Runbook 1: Application Won't Start

```
Symptoms:
- Health check failing
- Application logs show errors on startup

Steps:
1. Check logs for error message
   docker logs task-mgmt-backend
   tail -f /var/log/task-mgmt/error.log

2. Common issues:
   a. MongoDB connection failed
      - Check MONGODB_URL in .env
      - Verify MongoDB Atlas is accessible
      - Check network access (IP whitelist)

   b. Redis connection failed
      - Check REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
      - Test connection: redis-cli -h host -p port -a password ping
      - Check ElastiCache security group

   c. Port already in use
      - Check: lsof -i :6730
      - Kill existing process: kill -9 {PID}

   d. Out of memory
      - Check: free -h
      - Restart: docker restart task-mgmt-backend

3. Fix issue and restart
   docker compose -f docker-compose.production.yml down
   docker compose -f docker-compose.production.yml up -d

4. Verify health check
   curl http://localhost:6730/api/v1/health
```

### Runbook 2: High API Response Times

```
Symptoms:
- API response times > 500ms (p95)
- Users reporting slowness

Steps:
1. Check CloudWatch for resource utilization
   - CPU: > 80%? → Scale out
   - Memory: > 90%? → Scale up
   - Disk I/O: High? → Check for log buildup

2. Check MongoDB query performance
   - Atlas → Real-Time Performance Panel
   - Identify slow queries (> 100ms)
   - Check for missing indexes
   - Review recent schema changes

3. Check Redis cache hit rate
   - redis-cli INFO stats | grep keyspace
   - Hit rate < 70%? → Increase Redis memory
   - Check for keys without TTL (memory leak)

4. Check BullMQ queue depth
   - redis-cli LLEN bull:{queue-name}:wait
   - Queue depth > 500? → Add more workers

5. Check for recent deployments
   - git log --oneline -5
   - If recent deploy → Rollback
   - ./deploy.sh (with previous version)

6. If issue persists:
   - Restart application
   - Scale out (add more instances)
   - Contact on-call engineer
```

### Runbook 3: BullMQ Jobs Not Processing

```
Symptoms:
- Queue depth increasing
- Jobs stuck in "waiting" or "active" state
- Notifications not being sent

Steps:
1. Check if workers are running
   docker ps | grep task-mgmt-backend
   pm2 list

2. Check worker logs
   docker logs task-mgmt-backend | grep -i "worker"
   tail -f /var/log/task-mgmt/app.log | grep -i "bullmq"

3. Check Redis connection (workers use Redis)
   redis-cli ping
   redis-cli INFO clients

4. Check queue status
   redis-cli LRANGE bull:notificationQueue-e-learning:wait 0 -1
   redis-cli LRANGE bull:task-reminders-queue:wait 0 -1

5. Restart workers
   docker restart task-mgmt-backend
   pm2 restart task-mgmt-backend

6. If jobs still stuck:
   a. Clear stuck jobs (if safe to lose)
      redis-cli DEL bull:{queue-name}:wait
      redis-cli DEL bull:{queue-name}:active

   b. Restart application completely
      docker compose -f docker-compose.production.yml down
      docker compose -f docker-compose.production.yml up -d

7. Monitor queue depth for 10 minutes
   redis-cli LLEN bull:{queue-name}:wait
```

### Runbook 4: SSL Certificate Expiry

```
Symptoms:
- Browser warning: "Your connection is not private"
- Certificate expired

Steps:
1. Check certificate expiry
   echo | openssl s_client -servername api.yourdomain.com -connect api.yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates

2. Renew with Certbot
   sudo certbot renew --force-renewal

3. Verify renewal
   sudo certbot certificates

4. Reload Nginx
   sudo systemctl reload nginx

5. Test in browser
   https://api.yourdomain.com

Prevention:
- Certbot auto-renews 30 days before expiry
- Ensure cron job is active: crontab -l | grep certbot
- Monitor certificate expiry in CloudWatch
```

### Runbook 5: Database Connection Pool Exhausted

```
Symptoms:
- Errors: "Connection pool exhausted"
- API requests timing out
- MongoDB Atlas shows maxed connections

Steps:
1. Check current connection count
   - Atlas → Metrics → Connections
   - Check: Current connections vs. max connections

2. Identify connection leak
   - Check application logs for unclosed connections
   - Review recent code changes (new queries, missing .disconnect())

3. Increase pool size (temporary fix)
   // In mongoDbConfig.ts
   maxPoolSize: 100 → 200

4. Restart application (releases leaked connections)
   docker compose -f docker-compose.production.yml restart

5. Long-term fixes:
   a. Implement connection pool monitoring
   b. Add timeout to queries (prevent hanging connections)
   c. Review all Mongoose queries (ensure .lean() used)
   d. Upgrade MongoDB Atlas tier (more connections allowed)

6. Monitor for 30 minutes
   - Check connection count decreasing
   - Verify API response times improving
```

---

## FINAL PRODUCTION READINESS CHECKLIST

```
MONITORING:
□ CloudWatch Agent installed and configured
□ Alarms created (CPU, memory, disk, status check)
□ Dashboard created (key metrics visible)
□ SNS topic created (alert notifications)
□ Application metrics tracking (response times, errors)
□ Business metrics tracking (DAU, tasks created)

LOGGING:
□ Structured JSON logging enabled
□ Log rotation configured (daily, 30-day retention)
□ Correlation ID middleware added
□ Error tracking separate from info logs
□ Logs shipped to CloudWatch

SECURITY:
□ SSH hardened (key-only, root disabled)
□ Firewall configured (UFW, minimal ports)
□ Fail2Ban installed and running
□ Automatic updates enabled
□ CORS whitelist configured (no wildcards)
□ Helmet.js security headers enabled
□ Rate limiting active on all endpoints
□ Input validation on 100% endpoints (Zod)
□ Secrets rotated from defaults
□ Secrets stored in AWS SSM (not .env files)
□ MongoDB network access restricted
□ Redis password-protected
□ File uploads validated (type, size)

BACKUP:
□ MongoDB Atlas backups configured (daily, 7-day retention)
□ Redis backup strategy implemented
□ S3 versioning enabled (file uploads)
□ EC2 AMI creation automated (weekly)
□ Nginx config versioned in Git
□ Backup restoration tested monthly

DISASTER RECOVERY:
□ Runbooks documented (5 scenarios)
□ Team trained on recovery procedures
□ Contact list updated
□ Post-mortem template prepared
□ RTO/RPO targets defined per stage

DEPLOYMENT:
□ Production Dockerfile created
□ Docker Compose production config ready
│ Nginx configuration tested
│ SSL certificates obtained (Let's Encrypt)
│ Deployment script tested
│ Rollback procedure documented
│ Zero-downtime deployment ready (optional)

PERFORMANCE:
□ Load testing completed (target user count)
□ API response times < 200ms (GET), < 500ms (POST)
□ Cache hit rate > 80%
□ Database indexes created
□ .lean() used on read-only queries
□ Compression enabled (gzip/brotli)
□ Pagination on all list endpoints

DOCUMENTATION:
□ Architecture diagrams updated
□ API documentation current
□ Runbooks accessible to team
□ Deployment procedures documented
□ Troubleshooting guide available
```

---

-date-month-last two digit of year: 12-04-26
