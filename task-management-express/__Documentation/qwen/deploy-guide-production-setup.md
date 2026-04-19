# Production Setup Guide — Docker, Nginx, PM2, Deployment

# Project: Task Management Backend

# Last Updated: 12-04-26

---

## TABLE OF CONTENTS

1. [Production Docker Setup](#docker-production)
2. [Nginx Configuration](#nginx-config)
3. [PM2 Alternative (if not using Docker)](#pm2-setup)
4. [Environment Configuration](#env-config)
5. [Deployment Scripts](#deployment-scripts)
6. [Zero-Downtime Deployment](#zero-downtime)
7. [Rollback Procedures](#rollback)
8. [Production Checklist](#production-checklist)

---

## PRODUCTION DOCKER SETUP <a name="docker-production"></a>

### 1. Production Dockerfile

**Current Dockerfile is dev-oriented. Replace with production-optimized version:**

```dockerfile
# ==========================================
# Stage 1: Build
# ==========================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files (leverage Docker cache)
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally
RUN npm install -g pnpm

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN pnpm build

# Remove dev dependencies and source maps (optional, reduces size)
# RUN rm -rf src/
# RUN find dist -name "*.map" -delete

# ==========================================
# Stage 2: Production
# ==========================================
FROM node:18-alpine AS production

# Add labels for better observability
LABEL maintainer="your-team@yourdomain.com"
LABEL version="1.0"
LABEL description="Task Management Backend - Production"

# Set Node.js environment
ENV NODE_ENV=production
ENV PORT=6730
ENV NODE_OPTIONS="--max-old-space-size=1024"

# Set working directory
WORKDIR /app

# Install pnpm globally (needed for production install)
RUN npm install -g pnpm

# Copy built artifacts and production dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Install production dependencies (separate layer for caching)
RUN pnpm install --prod --frozen-lockfile

# Copy only necessary runtime files
COPY --from=builder /app/src/views ./src/views
COPY --from=builder /app/src/i18n ./src/i18n

# Create non-root user (security best practice)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 6730

# Health check (required for ALB + orchestration)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:6730/api/v1/health || exit 1

# Start production server
CMD ["node", "dist/serverV2.js"]
```

**Key Improvements over Current Dockerfile:**

| Feature | Current (Dev) | Production | Benefit |
|---------|---------------|------------|---------|
| **Build Stage** | Single stage | Multi-stage | Smaller image (~150 MB vs ~500 MB) |
| **Dependencies** | All (dev + prod) | Production only | 60% smaller, faster pull |
| **TypeScript** | ts-node (runtime compilation) | Pre-compiled JS | 50% faster startup |
| **Hot Reload** | Enabled (ts-node-dev) | Disabled | Lower memory, production stability |
| **User** | root | non-root (nodejs) | Security (container escape prevention) |
| **Health Check** | None | Built-in | ALB integration, auto-recovery |
| **Memory Limit** | Unlimited | 1 GB (max-old-space-size) | Prevents OOM crashes |
| **Source Maps** | Included | Removed (optional) | Smaller image, IP protection |

**Build and Test:**
```bash
# Build production image
docker build -f Dockerfile.production -t task-mgmt-backend:prod .

# Test locally
docker run -p 6730:6730 \
  --env-file .env.production \
  task-mgmt-backend:prod

# Check image size
docker images | grep task-mgmt-backend
# Expected: ~150-200 MB (vs ~500 MB for dev image)

# Test health check
curl http://localhost:6730/api/v1/health
# Expected: {"status":"healthy","db":"connected","redis":"connected",...}
```

---

### 2. Production Docker Compose

**docker-compose.production.yml:**

```yaml
version: '3.8'

services:
  # ==========================================
  # Backend API
  # ==========================================
  backend:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: task-mgmt-backend
    ports:
      - "6730:6730"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      redis:
        condition: service_healthy
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
    networks:
      - task-mgmt-network
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:6730/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # ==========================================
  # Redis
  # ==========================================
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

  # ==========================================
  # Kafka (OPTIONAL - only if chat is active)
  # ==========================================
  # kafka:
  #   image: bitnami/kafka:3.7.0
  #   container_name: task-mgmt-kafka
  #   ports:
  #     - "9092:9092"
  #   environment:
  #     - KAFKA_ENABLE_KRAFT=yes
  #     - KAFKA_CFG_PROCESS_ROLES=broker,controller
  #     - KAFKA_CFG_NODE_ID=1
  #     - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka:9093
  #     - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
  #     - KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092
  #     - ALLOW_PLAINTEXT_LISTENER=yes
  #     - KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true
  #     - KAFKA_CFG_MESSAGE_MAX_BYTES=10485760
  #   volumes:
  #     - kafka_data:/bitnami/kafka
  #   restart: always
  #   deploy:
  #     resources:
  #       limits:
  #         memory: 1G
  #         cpus: '1.0'
  #   networks:
  #     - task-mgmt-network
  #   healthcheck:
  #     test: ["CMD", "kafka-topics.sh", "--bootstrap-server", "localhost:9092", "--list"]
  #     interval: 30s
  #     timeout: 10s
  #     retries: 3
  #     start_period: 60s

volumes:
  redis_data:
    driver: local
  # kafka_data:
  #   driver: local

networks:
  task-mgmt-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

**Resource Limits Explained:**

```yaml
deploy:
  resources:
    limits:
      memory: 2G        # Hard limit (container killed if exceeds)
      cpus: '1.5'       # CPU cap (1.5 = 150% of one core)
    reservations:
      memory: 1G        # Guaranteed minimum (scheduler ensures this)
      cpus: '0.5'       # Minimum CPU guarantee
```

**Why these limits?**
```
Backend (2G limit, 1G reservation):
- Node.js workers: 1 GB (max-old-space-size)
- Redis client buffers: 256 MB
- Application overhead: 256 MB
- Buffer: 512 MB
Total: 2 GB

Redis (2G limit, 1G reservation):
- Redis data: 1.5 GB (maxmemory setting)
- Redis overhead: 256 MB
- AOF file buffer: 256 MB
Total: 2 GB

Kafka (1G limit, 512M reservation):
- Kafka JVM heap: 512 MB
- Kafka overhead: 256 MB
- Log buffer: 256 MB
Total: 1 GB
```

---

### 3. Environment File (.env.production)

**Create separate production env file:**

```bash
# =======================================
# Server Configuration
# =======================================
NODE_ENV=production
PORT=6730
SOCKET=6738

# =======================================
# MongoDB Atlas (NEVER localhost)
# =======================================
MONGODB_URL=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/task-management?retryWrites=true&w=majority

# =======================================
# Redis (ElastiCache or Docker)
# =======================================
REDIS_HOST=redis  # Docker: 'redis', ElastiCache: 'your-cluster.cache.amazonaws.com'
REDIS_PORT=6379
REDIS_PASSWORD=your_strong_password_here_generate_with_openssl_rand_hex_32

# =======================================
# JWT Configuration (GENERATE NEW SECRETS)
# =======================================
JWT_ACCESS_SECRET=generate_with_openssl_rand_hex_64_do_not_use_default
JWT_REFRESH_SECRET=generate_with_openssl_rand_hex_64_do_not_use_default
JWT_ACCESS_EXPIRATION_TIME=15m
JWT_REFRESH_EXPIRATION_TIME=7d

# =======================================
# Auth Configuration
# =======================================
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15
BCRYPT_SALT_ROUNDS=12

# =======================================
# Token Configuration
# =======================================
TOKEN_SECRET=generate_with_openssl_rand_hex_64_do_not_use_default
VERIFY_EMAIL_TOKEN_EXPIRATION_TIME=10m
RESET_PASSWORD_TOKEN_EXPIRATION_TIME=5m
VERIFY_EMAIL_OTP_EXPIRATION_TIME=10
RESET_PASSWORD_OTP_EXPIRATION_TIME=5
MAX_OTP_ATTEMPTS=5
ATTEMPT_WINDOW_MINUTES=10

# =======================================
# SMTP (Email Delivery)
# =======================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_not_account_password
EMAIL_FROM=noreply@yourdomain.com

# =======================================
# Stripe (Business Subscriptions)
# =======================================
STRIPE_SECRET_KEY=sk_live_your_live_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_signing_secret
STRIPE_WEBHOOK_URL=https://api.yourdomain.com/api/v1/stripe/webhook
STRIPE_SUCCESS_URL=https://app.yourdomain.com/subscription/success
STRIPE_CANCEL_URL=https://app.yourdomain.com/subscription/cancel
STRIPE_STANDARD_PLAN_PRICE_ID=price_your_live_plan_id

# =======================================
# RevenueCat (Individual Subscriptions)
# =======================================
REVENUECAT_API_KEY=your_live_revenuecat_public_api_key
REVENUECAT_WEBHOOK_SECRET=your_live_revenuecat_webhook_signing_secret

# =======================================
# Client URLs (CORS Whitelist)
# =======================================
CLIENT_URL=https://app.yourdomain.com
ADMIN_URL=https://admin.yourdomain.com

# =======================================
# Backend Configuration
# =======================================
BACKEND_IP=your_ec2_private_ip_or_localhost
BACKEND_BASE_URL=https://api.yourdomain.com
SHOBHOY_URL=https://shobhoy.yourdomain.com

# =======================================
# External Services
# =======================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

AWS_S3_BUCKET=task-mgmt-uploads-your-region
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

FIREBASE_PROJECT_ID=your_firebase_project_id
Firebase_Service_Account_Path_For_Translation=./firebase-credentials.json

ENCRYPTION_KEY=generate_with_openssl_rand_hex_32

# =======================================
# Logging
# =======================================
LOG_LEVEL=info
LOG_FILE=/var/log/task-mgmt/app.log
ERROR_LOG_FILE=/var/log/task-mgmt/error.log
```

**Generate Secure Secrets:**
```bash
# Generate JWT_ACCESS_SECRET (64 hex chars)
openssl rand -hex 64

# Generate JWT_REFRESH_SECRET (64 hex chars)
openssl rand -hex 64

# Generate TOKEN_SECRET (64 hex chars)
openssl rand -hex 64

# Generate REDIS_PASSWORD (32 hex chars)
openssl rand -hex 32

# Generate ENCRYPTION_KEY (32 hex chars)
openssl rand -hex 32
```

**Security Rules:**
```
❌ NEVER commit .env.production to Git
❌ NEVER use default secrets (change ALL defaults)
❌ NEVER use test/live keys in wrong environment
❌ NEVER share credentials via email/Slack (use AWS SSM or Vault)
✅ Use different secrets for dev/staging/production
✅ Rotate secrets every 90 days
✅ Store secrets in AWS SSM Parameter Store (production)
```

---

## NGINX CONFIGURATION <a name="nginx-config"></a>

### 1. Install Nginx

```bash
# Update package list
sudo apt update

# Install Nginx
sudo apt install nginx -y

# Enable and start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Check status
sudo systemctl status nginx

# Open firewall ports
sudo ufw allow 'Nginx Full'
```

### 2. Nginx Configuration File

**Create `/etc/nginx/sites-available/task-management-backend.conf`:**

```nginx
# ==========================================
# Rate Limiting Zones
# ==========================================
# General API: 100 requests/minute per IP
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

# Auth endpoints: 5 requests/minute per IP (brute force protection)
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/m;

# WebSocket connection upgrade mapping
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# ==========================================
# Upstream (Backend Cluster)
# ==========================================
upstream backend_cluster {
    server 127.0.0.1:6730;
    # Add more servers when scaling horizontally
    # server 127.0.0.1:6731;
    # server 127.0.0.1:6732;

    # Keepalive connections (reuse connections for better performance)
    keepalive 32;
}

# ==========================================
# Backend API Server (HTTPS)
# ==========================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name api.yourdomain.com;

    # ======================================
    # SSL Configuration
    # ======================================
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ======================================
    # Security Headers
    # ======================================
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'" always;

    # ======================================
    # Gzip Compression
    # ======================================
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/xml+rss
        application/vnd.ms-fontobject
        application/x-font-ttf
        font/opentype
        image/svg+xml
        image/x-icon;

    # ======================================
    # Logging
    # ======================================
    access_log /var/log/nginx/backend_access.log;
    error_log /var/log/nginx/backend_error.log warn;

    # ======================================
    # Auth Endpoints (Strict Rate Limiting)
    # ======================================
    location /api/v1/auth/ {
        # Rate limiting
        limit_req zone=auth_limit burst=10 nodelay;

        # Proxy to backend
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # ======================================
    # General API (Moderate Rate Limiting)
    # ======================================
    location /api/ {
        # Rate limiting
        limit_req zone=api_limit burst=200 nodelay;

        # Proxy to backend
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
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

        # File upload limit
        client_max_body_size 50M;
    }

    # ======================================
    # Socket.IO (WebSocket Support)
    # ======================================
    location /socket.io/ {
        # No rate limiting for WebSocket (handled by app)
        proxy_pass http://127.0.0.1:6738;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts (long-lived connections)
        proxy_connect_timeout 60s;
        proxy_send_timeout 86400s;  # 24 hours
        proxy_read_timeout 86400s;  # 24 hours

        # Disable buffering
        proxy_buffering off;
    }

    # ======================================
    # Health Check (No logging, no rate limit)
    # ======================================
    location /health {
        proxy_pass http://backend_cluster;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        access_log off;
    }

    # ======================================
    # Let's Encrypt Challenge (SSL Renewal)
    # ======================================
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# ==========================================
# Frontend App Server (HTTPS)
# ==========================================
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name app.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers on;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Root directory for React/Next.js build
    root /var/www/task-management-frontend/dist;
    index index.html;

    # Logging
    access_log /var/log/nginx/frontend_access.log;
    error_log /var/log/nginx/frontend_error.log warn;

    # Static Assets (Cache for 30 days)
    location ~* \.(ico|css|js|gif|webp|jpe?g|png|woff2?|svg|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA Fallback (React Router)
    location / {
        try_files $uri /index.html;
    }

    # Rate Limiting
    limit_req zone=api_limit burst=50 nodelay;

    # File Upload Limit
    client_max_body_size 10M;

    # Let's Encrypt Challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
}

# ==========================================
# HTTP → HTTPS Redirect
# ==========================================
server {
    listen 80;
    listen [::]:80;
    server_name api.yourdomain.com app.yourdomain.com;

    # Let's Encrypt Challenge (must be accessible via HTTP)
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}
```

### 3. Enable Configuration

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/task-management-backend.conf /etc/nginx/sites-enabled/

# Remove default site (if exists)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Expected output:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# Reload Nginx
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificates
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com

# Follow prompts (enter email, agree to terms)

# Verify auto-renewal
sudo certbot renew --dry-run

# Certbot automatically adds cron job for renewal
# Check cron job:
crontab -l | grep certbot
# Expected: 0 */12 * * * certbot renew --quiet
```

---

## PM2 SETUP (IF NOT USING DOCKER) <a name="pm2-setup"></a>

### 1. Install PM2

```bash
# Install PM2 globally
npm install -g pm2

# Generate startup script
pm2 startup
# Copy and run the command it outputs

# Save current process list
pm2 save
```

### 2. PM2 Ecosystem Configuration

**Create `ecosystem.config.js`:**

```javascript
module.exports = {
  apps: [
    {
      name: 'task-mgmt-backend',
      script: 'dist/serverV2.js',
      instances: 2, // Use both CPU cores (t3.large)
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 6730,
        NODE_OPTIONS: '--max-old-space-size=1024',
      },
      // Auto-restart on crash
      max_memory_restart: '1500M',
      // Logging
      error_file: '/var/log/task-mgmt/error.log',
      out_file: '/var/log/task-mgmt/out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      // Restart on file change (optional, not recommended for production)
      // watch: false,
      // Health check
      wait_ready: true,
      wait_ready_timeout: 10000,
    },
  ],
};
```

### 3. PM2 Commands

```bash
# Start application
pm2 start ecosystem.config.js --env production

# View status
pm2 status

# View logs
pm2 logs task-mgmt-backend

# Monitor (real-time)
pm2 monit

# Restart
pm2 restart task-mgmt-backend

# Stop
pm2 stop task-mgmt-backend

# Delete from PM2
pm2 delete task-mgmt-backend

# Graceful reload (zero-downtime)
pm2 reload task-mgmt-backend

# View detailed info
pm2 info task-mgmt-backend
```

---

## DEPLOYMENT SCRIPTS <a name="deployment-scripts"></a>

### 1. Simple Deployment Script (deploy.sh)

**Create `deploy.sh`:**

```bash
#!/bin/bash
set -e

# ==========================================
# Configuration
# ==========================================
APP_DIR="/opt/task-management"
BACKUP_DIR="/opt/backups/task-management"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup-$DATE"
LOG_FILE="/var/log/task-mgmt/deploy-$DATE.log"

# ==========================================
# Functions
# ==========================================
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

error_exit() {
  log "ERROR: $1"
  log "Deployment failed! Rolling back..."
  rollback
  exit 1
}

rollback() {
  if [ -d "$BACKUP_PATH" ]; then
    log "Restoring from backup: $BACKUP_PATH"
    cd $APP_DIR
    docker compose down
    rm -rf src/ dist/ package.json pnpm-lock.yaml
    cp -r $BACKUP_PATH/* .
    docker compose up -d
    log "Rollback complete!"
  fi
}

# ==========================================
# Pre-deployment Checks
# ==========================================
log "========================================="
log "Starting deployment..."
log "========================================="

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
  error_exit "docker-compose.yml not found! Are you in the right directory?"
fi

# Create backup directory
mkdir -p $BACKUP_PATH
mkdir -p /var/log/task-mgmt

# ==========================================
# Step 1: Backup Current Version
# ==========================================
log "Step 1/7: Creating backup..."
if [ -d "src" ] || [ -d "dist" ]; then
  cp -r src dist package.json pnpm-lock.yaml .env.production $BACKUP_PATH/
  log "Backup created: $BACKUP_PATH"
else
  log "No existing installation found, skipping backup"
fi

# ==========================================
# Step 2: Pull Latest Code
# ==========================================
log "Step 2/7: Pulling latest code..."
git pull origin main || error_exit "Failed to pull latest code"

# ==========================================
# Step 3: Install Dependencies
# ==========================================
log "Step 3/7: Installing dependencies..."
pnpm install --frozen-lockfile || error_exit "Failed to install dependencies"

# ==========================================
# Step 4: Build TypeScript
# ==========================================
log "Step 4/7: Building TypeScript..."
pnpm build || error_exit "Failed to build TypeScript"

# ==========================================
# Step 5: Stop Existing Containers
# ==========================================
log "Step 5/7: Stopping existing containers..."
docker compose down || log "No running containers to stop"

# ==========================================
# Step 6: Build Docker Images
# ==========================================
log "Step 6/7: Building Docker images..."
docker compose -f docker-compose.production.yml build || error_exit "Failed to build Docker images"

# ==========================================
# Step 7: Start Containers
# ==========================================
log "Step 7/7: Starting containers..."
docker compose -f docker-compose.production.yml up -d || error_exit "Failed to start containers"

# ==========================================
# Health Check
# ==========================================
log "Waiting for application to start..."
for i in {1..30}; do
  if curl -s http://localhost:6730/api/v1/health | grep -q "healthy"; then
    log "✅ Application is healthy!"
    break
  fi
  log "Attempt $i/30: Waiting..."
  sleep 2
done

# Final health check
if ! curl -s http://localhost:6730/api/v1/health | grep -q "healthy"; then
  error_exit "Application failed to start properly"
fi

# ==========================================
# Post-deployment
# ==========================================
log "========================================="
log "Deployment complete!"
log "========================================="

# Show container status
log "Container Status:"
docker compose -f docker-compose.production.yml ps

# Clean old backups (keep last 10)
log "Cleaning old backups..."
cd $BACKUP_DIR
ls -t | tail -n +11 | xargs rm -rf 2>/dev/null || true
log "Kept last 10 backups"

# Restart Nginx (in case of config changes)
sudo systemctl reload nginx

log "Deployment log: $LOG_FILE"
```

**Make executable:**
```bash
chmod +x deploy.sh
```

**Run deployment:**
```bash
./deploy.sh
```

---

### 2. Zero-Downtime Deployment Script

**Create `deploy-zero-downtime.sh`:**

```bash
#!/bin/bash
set -e

# ==========================================
# Configuration
# ==========================================
APP_DIR="/opt/task-management"
LOG_FILE="/var/log/task-mgmt/deploy-$(date +%Y%m%d-%H%M%S).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# ==========================================
# Zero-Downtime Deployment (Blue-Green)
# ==========================================
log "Starting zero-downtime deployment..."

# Pull latest code
log "Pulling latest code..."
git pull origin main

# Install dependencies
log "Installing dependencies..."
pnpm install --frozen-lockfile

# Build TypeScript
log "Building TypeScript..."
pnpm build

# Build new Docker image (without stopping old one)
log "Building new Docker image..."
docker compose -f docker-compose.production.yml build

# Start new container on different port (green environment)
log "Starting new container on port 6731..."
PORT=6731 docker compose -f docker-compose.production.yml up -d

# Wait for new container to be healthy
log "Waiting for new container to be healthy..."
for i in {1..30}; do
  if curl -s http://localhost:6731/api/v1/health | grep -q "healthy"; then
    log "✅ New container is healthy!"
    break
  fi
  log "Attempt $i/30: Waiting..."
  sleep 2
done

# Verify new container
if ! curl -s http://localhost:6731/api/v1/health | grep -q "healthy"; then
  log "ERROR: New container failed to start!"
  log "Rolling back..."
  docker stop task-mgmt-backend-green
  docker rm task-mgmt-backend-green
  exit 1
fi

# Update Nginx to point to new container
log "Updating Nginx to point to new container..."
sudo sed -i 's/127.0.0.1:6730/127.0.0.1:6731/g' /etc/nginx/sites-available/task-management-backend.conf
sudo systemctl reload nginx

# Wait for traffic to switch
log "Waiting for traffic to switch..."
sleep 10

# Stop old container
log "Stopping old container..."
docker compose -f docker-compose.production.yml down

# Update port back to 6730 in docker-compose (for next deployment)
# (docker-compose already has 6730, no change needed)

log "========================================="
log "Zero-downtime deployment complete!"
log "========================================="
```

**Make executable:**
```bash
chmod +x deploy-zero-downtime.sh
```

---

## ROLLBACK PROCEDURES <a name="rollback"></a>

### 1. Quick Rollback (Docker)

```bash
#!/bin/bash
# rollback.sh

set -e

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting rollback..."

# Stop current containers
log "Stopping current containers..."
docker compose -f docker-compose.production.yml down

# Find latest backup
BACKUP_DIR="/opt/backups/task-management"
LATEST_BACKUP=$(ls -t $BACKUP_DIR | head -1)

if [ -z "$LATEST_BACKUP" ]; then
  log "ERROR: No backups found!"
  exit 1
fi

log "Restoring from backup: $LATEST_BACKUP"

# Restore files
cp -r $BACKUP_DIR/$LATEST_BACKUP/* .

# Rebuild and restart
log "Rebuilding Docker images..."
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Health check
log "Waiting for application to start..."
for i in {1..30}; do
  if curl -s http://localhost:6730/api/v1/health | grep -q "healthy"; then
    log "✅ Rollback successful!"
    exit 0
  fi
  sleep 2
done

log "ERROR: Rollback failed!"
exit 1
```

### 2. Rollback via Git

```bash
# View recent commits
git log --oneline -10

# Revert to specific commit
git revert <commit-hash>

# OR reset to specific commit (destructive, use with caution)
git reset --hard <commit-hash>

# Redeploy
./deploy.sh
```

### 3. Rollback via Docker Image Tags

```bash
# List Docker images
docker images | grep task-mgmt-backend

# Run specific image version
docker run -p 6730:6730 \
  --env-file .env.production \
  task-mgmt-backend:prod-20260411

# Update docker-compose.yml to use specific tag
# image: task-mgmt-backend:prod-20260411
```

---

## PRODUCTION CHECKLIST <a name="production-checklist"></a>

### Pre-Deployment Checklist

```
□ Code reviewed and approved
□ All tests passing (npm run test:ci)
□ TypeScript build successful (npm run build)
□ No console.log in production code
□ Environment variables configured (.env.production)
□ Secrets generated (no defaults)
□ Database indexes created
□ Redis configuration tested
□ Nginx configuration tested
□ SSL certificates obtained
□ Backup strategy in place
□ Monitoring configured (CloudWatch)
□ Rollback procedure documented
□ Team notified of deployment
```

### Post-Deployment Checklist

```
□ Application started successfully
□ Health check passing (GET /api/v1/health)
□ Database connected
□ Redis connected
□ BullMQ workers running
□ Socket.IO connections working
□ API endpoints responding (< 200ms for GET)
□ Cache hit rate > 80%
□ No errors in application logs
□ No errors in Nginx logs
□ SSL certificate valid
□ CORS working (frontend can reach backend)
□ Rate limiting active
□ File uploads working (S3)
□ Email delivery working (SMTP)
□ Payment webhooks working (Stripe)
□ Monitoring alerts active
□ Backups running
□ Load test performed (optional but recommended)
```

### Monitoring Checklist (First 24 Hours)

```
□ CPU utilization < 70%
□ Memory utilization < 80%
□ Disk usage < 70%
□ API response times < 200ms (GET), < 500ms (POST)
□ Error rate < 1% (5xx errors)
□ Cache hit rate > 80%
□ Redis memory usage stable
□ MongoDB connection pool < 80% capacity
□ BullMQ queue depth < 100 jobs
□ No unusual log patterns
□ No customer-reported issues
```

---

-date-month-last two digit of year: 12-04-26
