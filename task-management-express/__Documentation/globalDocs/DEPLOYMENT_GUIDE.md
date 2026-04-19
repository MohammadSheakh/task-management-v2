# 🚀 Deployment Guide

**Version**: 1.0  
**Last Updated**: 08-03-26  
**Status**: ✅ Production Ready

---

## 🎯 Overview

This guide covers production deployment, infrastructure setup, monitoring, and maintenance of the Task Management Backend system.

---

## 📋 Table of Contents

1. [Production Architecture](#production-architecture)
2. [Prerequisites](#prerequisites)
3. [AWS Setup](#aws-setup)
4. [Database Deployment](#database-deployment)
5. [Application Deployment](#application-deployment)
6. [Environment Configuration](#environment-configuration)
7. [SSL/TLS Setup](#ssltls-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup Strategy](#backup-strategy)
10. [Scaling](#scaling)
11. [Security Hardening](#security-hardening)
12. [Troubleshooting](#troubleshooting)

---

## 🏗️ Production Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Users                                     │
│  Mobile App │ Web App │ Admin Dashboard                     │
└─────────────────────────────────────────────────────────────┘
                          ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare (CDN + DDoS Protection)             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│           AWS Application Load Balancer (ALB)               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│          Auto Scaling Group (EC2 Instances)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                 │
│  │  App 1   │  │  App 2   │  │  App 3   │  ...            │
│  └──────────┘  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              Data Layer                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ MongoDB Atlas│  │ Redis Cloud  │  │   AWS S3     │     │
│  │  (Primary)   │  │   (Cache)    │  │  (Files)     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Prerequisites

### AWS Account Setup

```bash
# Required AWS Services:
- EC2 (Application servers)
- RDS or MongoDB Atlas (Database)
- ElastiCache or Redis Cloud (Redis)
- S3 (File storage)
- ALB (Load balancer)
- CloudWatch (Monitoring)
- Certificate Manager (SSL)
- Secrets Manager (API keys)
```

### Domain & SSL

```bash
# Requirements:
- Domain name purchased
- SSL certificate (AWS ACM or Let's Encrypt)
- DNS configured
```

### Third-Party Services

```bash
# Required:
- MongoDB Atlas cluster OR AWS DocumentDB
- Redis Cloud OR AWS ElastiCache
- Stripe account (payments)
- SendGrid account (email)
- Firebase account (push notifications)

# Optional:
- Sentry (error tracking)
- Pingdom (uptime monitoring)
- Datadog (advanced monitoring)
```

---

## ☁️ AWS Setup

### Step 1: Create VPC

```bash
# VPC Configuration:
- CIDR: 10.0.0.0/16
- Subnets:
  - Public: 10.0.1.0/24, 10.0.2.0/24
  - Private: 10.0.10.0/24, 10.0.11.0/24
- Internet Gateway: Attached
- NAT Gateway: For private subnets
```

### Step 2: Security Groups

```bash
# ALB Security Group:
- Inbound: HTTPS (443) from 0.0.0.0/0
- Outbound: All traffic

# EC2 Security Group:
- Inbound: Port 5000 from ALB SG
- Outbound: All traffic

# Database Security Group:
- Inbound: Port 27017 from EC2 SG
- Outbound: All traffic

# Redis Security Group:
- Inbound: Port 6379 from EC2 SG
- Outbound: All traffic
```

### Step 3: Create Load Balancer

```bash
# ALB Configuration:
- Type: Application Load Balancer
- Scheme: Internet-facing
- Listeners: HTTPS:443
- Target Group: EC2 instances, port 5000
- Health Check: /health, interval 30s
```

---

## 🍃 Database Deployment

### MongoDB Atlas Setup

```bash
# 1. Create Cluster
# - Provider: AWS
# - Region: us-east-1
# - Tier: M10 (Production)
# - Storage: 10 GB
# - Backup: Automated daily

# 2. Configure Access
# - Whitelist IPs: ALB IP range
# - Database User: Create admin user

# 3. Connection String
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/task-management?retryWrites=true&w=majority
```

### Database Indexes

```javascript
// Run on production database
use task-management

// Task indexes
db.task.createIndex({ createdById: 1, status: 1, startTime: -1 })
db.task.createIndex({ ownerUserId: 1, status: 1, startTime: -1 })
db.task.createIndex({ assignedUserIds: 1, status: 1 })
db.task.createIndex({ groupId: 1, status: 1 })
db.task.createIndex({ status: 1, isDeleted: 1 })
db.task.createIndex({ startTime: -1 })
db.task.createIndex({ createdById: 1, isDeleted: 1 })
db.task.createIndex({ isDeleted: 1, startTime: -1 })
db.task.createIndex({ groupId: 1, isDeleted: 1 })

// User indexes
db.user.createIndex({ email: 1 }, { unique: true })
db.user.createIndex({ role: 1, isDeleted: 1 })

// Group indexes
db.group.createIndex({ ownerUserId: 1, isDeleted: 1 })
db.group.createIndex({ status: 1, isDeleted: 1 })

// Notification indexes
db.notification.createIndex({ receiverId: 1, isRead: 1, createdAt: -1 })
db.notification.createIndex({ receiverId: 1, createdAt: -1 })
```

---

## 🖥️ Application Deployment

### EC2 Instance Setup

```bash
# 1. Launch EC2 Instance
# - AMI: Amazon Linux 2 or Ubuntu 22.04
# - Type: t3.medium (minimum)
# - Storage: 20 GB
# - Key pair: Create/download

# 2. Install Dependencies
sudo yum update -y
sudo yum install -y nodejs npm git

# 3. Clone Repository
git clone <repository-url>
cd task-management-backend-template

# 4. Install Dependencies
npm install --production

# 5. Build (if using TypeScript)
npm run build
```

### PM2 Setup

```bash
# Install PM2
sudo npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'task-management-api',
    script: 'dist/serverV2.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup
pm2 startup
```

### Systemd Service (Alternative)

```bash
# Create service file
sudo nano /etc/systemd/system/task-management.service

# Add content:
[Unit]
Description=Task Management Backend
After=network.target

[Service]
Type=notify
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/task-management-backend-template
ExecStart=/usr/bin/node dist/serverV2.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable task-management
sudo systemctl start task-management
sudo systemctl status task-management
```

---

## ⚙️ Environment Configuration

### Production .env

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
BACKEND_URL=https://api.yourdomain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/task-management
MONGODB_POOL_MIN=10
MONGODB_POOL_MAX=100

# Redis
REDIS_HOST=your-redis-cluster.xxxxx.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT Secrets (Use strong random strings)
JWT_SECRET=super-secret-jwt-key-min-32-chars-long
JWT_REFRESH_SECRET=super-secret-refresh-key-min-32-chars-long
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (SendGrid)
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@yourdomain.com

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/home/ec2-user/task-management-backend-template/uploads
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
LOG_LEVEL=info
```

### Store Secrets in AWS Secrets Manager

```bash
# Store JWT secret
aws secretsmanager create-secret \
  --name task-management/jwt-secret \
  --secret-string "your-jwt-secret"

# Retrieve in application
aws secretsmanager get-secret-value \
  --secret-id task-management/jwt-secret
```

---

## 🔒 SSL/TLS Setup

### AWS Certificate Manager

```bash
# 1. Request Certificate
# - Domain: *.yourdomain.com
# - Validation: DNS
# - Add CNAME records to DNS

# 2. Wait for validation (5-10 minutes)

# 3. Attach to ALB
# - ALB → Listeners → Edit
# - Select certificate
```

### Force HTTPS Redirect

```bash
# ALB Listener Rule:
# If: Path is /*
# Then: Redirect to https://#{host}:443/#{path}?#{query}
```

---

## 📊 Monitoring & Logging

### CloudWatch Setup

```bash
# 1. Install CloudWatch Agent
sudo yum install -y amazon-cloudwatch-agent

# 2. Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard

# 3. Start
sudo systemctl start amazon-cloudwatch-agent
sudo systemctl enable amazon-cloudwatch-agent
```

### CloudWatch Alarms

```bash
# Create Alarms:
- CPU Utilization > 80% for 5 minutes
- Memory Utilization > 80% for 5 minutes
- Disk Utilization > 80% for 5 minutes
- Error Rate > 5% for 5 minutes
- Response Time > 500ms for 5 minutes
```

### Application Logging

```typescript
// Winston configuration for production
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});
```

### Sentry Integration

```bash
# Install Sentry
npm install @sentry/node

# Configure
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production',
  tracesSampleRate: 0.1
});
```

---

## 💾 Backup Strategy

### Database Backup

```bash
# MongoDB Atlas Automated Backups:
- Frequency: Daily
- Retention: 7 days
- Point-in-time recovery: Enabled

# Manual Backup
mongodump --uri="mongodb+srv://..." --out=/backup/mongodb-$(date +%Y%m%d)
```

### File Backup

```bash
# S3 Versioning:
# Enable versioning on S3 bucket

# Backup uploads to different region
aws s3 sync /uploads s3://backup-bucket/uploads --region us-west-2
```

### Backup Schedule

| Data Type | Frequency | Retention |
|-----------|-----------|-----------|
| **Database** | Daily | 7 days |
| **Files (S3)** | Continuous | 30 days |
| **Logs** | Weekly | 90 days |
| **Configuration** | On change | 1 year |

---

## 📈 Scaling

### Horizontal Scaling

```bash
# Auto Scaling Configuration:
- Minimum instances: 2
- Maximum instances: 10
- Target CPU: 70%
- Scale-in cooldown: 300s
- Scale-out cooldown: 60s
```

### Database Scaling

```bash
# MongoDB Atlas:
- Vertical: Upgrade cluster tier (M10 → M30 → M50)
- Horizontal: Enable sharding (for >100GB)

# Redis:
- Vertical: Upgrade node type
- Horizontal: Enable cluster mode
```

### Load Balancer Scaling

```bash
# ALB automatically scales based on traffic
# No configuration needed
```

---

## 🔐 Security Hardening

### Server Hardening

```bash
# 1. Disable root login
sudo passwd -l root

# 2. Setup firewall (UFW)
sudo ufw allow 22/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 3. Automatic security updates
sudo yum install -y yum-cron
sudo systemctl enable yum-cron
sudo systemctl start yum-cron

# 4. Fail2ban
sudo yum install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### Application Security

```bash
# 1. Helmet.js (already configured)
app.use(helmet());

# 2. Rate limiting (already configured)
app.use(rateLimit({...}));

# 3. CORS whitelist
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com']
}));

# 4. Input validation (already configured)
// All endpoints use Zod validation
```

### Database Security

```bash
# 1. Use strong passwords
# 2. Whitelist IPs
# 3. Enable encryption at rest
# 4. Enable encryption in transit (TLS)
# 5. Regular security updates
```

---

## 🐛 Troubleshooting

### Issue 1: High CPU Usage

**Solution**:
```bash
# Check running processes
top

# Check PM2 logs
pm2 logs

# Scale horizontally
# Auto Scaling will add instances
```

### Issue 2: Database Connection Issues

**Solution**:
```bash
# Check MongoDB Atlas status
# Verify whitelist IPs
# Check connection string
# Verify network connectivity
telnet cluster0.xxxxx.mongodb.net 27017
```

### Issue 3: Memory Leaks

**Solution**:
```bash
# Check memory usage
pm2 monit

# Restart instances
pm2 restart all

# Analyze heap dump
# Use clinic.js or node-inspect
```

### Issue 4: Slow Response Times

**Solution**:
```bash
# Check CloudWatch metrics
# Identify slow endpoints
# Enable query profiling
db.setProfilingLevel(2)

# Check Redis cache hit rate
redis-cli INFO stats

# Scale database if needed
```

---

## 🔗 Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [Getting Started Guide](./GETTING_STARTED.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [System Architecture](./SYSTEM_ARCHITECTURE.md)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Complete
