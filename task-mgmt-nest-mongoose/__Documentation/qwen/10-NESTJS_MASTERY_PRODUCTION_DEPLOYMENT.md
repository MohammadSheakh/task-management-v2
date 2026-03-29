# 📘 **NESTJS MASTERY - Lesson 10: Production Deployment & Monitoring**

**Date**: 18-03-26  
**Level**: 🟢 Beginner → 🔴 Senior Engineer  
**Series**: NestJS Fundamentals  
**Time**: 70 minutes  
**Prerequisites**: Lesson 1-9 (All previous lessons)  

---

## 🎯 **LEARNING OBJECTIVES**

After completing this **comprehensive** lesson, you will:

1. ✅ **Understand Production Architecture** - Infrastructure design, high availability, scaling
2. ✅ **Master Docker Deployment** - Dockerfile, multi-stage builds, Docker Compose
3. ✅ **Implement CI/CD Pipelines** - GitHub Actions, automated testing, deployment
4. ✅ **Master Environment Configuration** - Environment variables, secrets management
5. ✅ **Implement Monitoring & Logging** - Health checks, metrics, distributed tracing
6. ✅ **Master Production Best Practices** - Security, performance, reliability
7. ✅ **Handle Production Issues** - Debugging, incident response, rollback strategies

---

## 📦 **PART 1: PRODUCTION ARCHITECTURE**

### **Production Architecture Overview**

```mermaid
graph TB
    subgraph "Client Layer"
        A1[Web App]
        A2[Mobile App]
        A3[Third-party APIs]
    end
    
    subgraph "Load Balancer"
        B1[Nginx/ALB<br/>SSL Termination<br/>Rate Limiting]
    end
    
    subgraph "Application Layer"
        C1[App Instance 1<br/>Port 3000]
        C2[App Instance 2<br/>Port 3000]
        C3[App Instance 3<br/>Port 3000]
    end
    
    subgraph "Cache Layer"
        D1[Redis Cluster<br/>Session Store<br/>Cache]
    end
    
    subgraph "Database Layer"
        E1[MongoDB Primary<br/>Read/Write]
        E2[MongoDB Secondary<br/>Read Replica]
        E3[MongoDB Secondary<br/>Read Replica]
    end
    
    subgraph "Message Queue"
        F1[Redis Streams<br/>BullMQ Queues]
    end
    
    subgraph "External Services"
        G1[Email Service<br/>SendGrid]
        G2[Storage<br/>S3]
        G3[Monitoring<br/>DataDog]
    end
    
    A1 --> B1
    A2 --> B1
    A3 --> B1
    
    B1 --> C1
    B1 --> C2
    B1 --> C3
    
    C1 --> D1
    C2 --> D1
    C3 --> D1
    
    C1 --> E1
    C2 --> E1
    C3 --> E1
    
    C1 --> F1
    C2 --> F1
    C3 --> F1
    
    E1 --> E2
    E1 --> E3
    
    C1 --> G1
    C1 --> G2
    C1 --> G3
    
    style B1 fill:#4ecdc4
    style C1 fill:#ffe66d
    style C2 fill:#ffe66d
    style C3 fill:#ffe66d
    style D1 fill:#95e1d3
    style E1 fill:#ff6b6b
    style F1 fill:#ffe66d
```

---

### **Deployment Strategies**

```mermaid
graph TB
    subgraph "Strategy 1: Single Server"
        A1[Single Server<br/>App + DB + Redis]
        style A1 fill:#ff6b6b
    end
    
    subgraph "Strategy 2: Separated Services"
        B1[App Server 1]
        B2[App Server 2]
        B3[MongoDB Cluster]
        B4[Redis Cluster]
        style B1 fill:#ffe66d
        style B2 fill:#ffe66d
        style B3 fill:#4ecdc4
        style B4 fill:#4ecdc4
    end
    
    subgraph "Strategy 3: Microservices"
        C1[Auth Service]
        C2[User Service]
        C3[Task Service]
        C4[Notification Service]
        style C1 fill:#95e1d3
        style C2 fill:#95e1d3
        style C3 fill:#95e1d3
        style C4 fill:#95e1d3
    end
    
    A1 --> B1
    B1 --> C1
```

**Strategy Comparison**:

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| **Single Server** | Simple, cheap | Single point of failure | Development, MVP |
| **Separated Services** | Better reliability, scalable | More complex | Production (10K users) |
| **Microservices** | Highly scalable, independent | Very complex | Enterprise (100K+ users) |

---

## 📦 **PART 2: DOCKER DEPLOYMENT**

### **Production Dockerfile**

```dockerfile
# ─────────────────────────────────────────────
# Dockerfile - Multi-stage Build
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# ─────────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# ─────────────────────────────────────────────
# Stage 3: Production
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Change ownership to non-root user
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

---

### **Docker Compose for Production**

```yaml
# ─────────────────────────────────────────────
# docker-compose.prod.yml
# ─────────────────────────────────────────────
version: '3.8'

services:
  # ─────────────────────────────────────────────
  # Application Service
  # ─────────────────────────────────────────────
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: nestjs-app
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongo:27017/taskdb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    ports:
      - "3000:3000"
    depends_on:
      mongo:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # ─────────────────────────────────────────────
  # MongoDB Service
  # ─────────────────────────────────────────────
  mongo:
    image: mongo:7
    container_name: nestjs-mongo
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGO_USERNAME}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
      - mongo-config:/data/configdb
    networks:
      - app-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G

  # ─────────────────────────────────────────────
  # Redis Service
  # ─────────────────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: nestjs-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --appendonly yes
    volumes:
      - redis-data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 10s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M

  # ─────────────────────────────────────────────
  # Nginx Reverse Proxy
  # ─────────────────────────────────────────────
  nginx:
    image: nginx:alpine
    container_name: nestjs-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 5s
      retries: 3

  # ─────────────────────────────────────────────
  # Worker Service (for BullMQ)
  # ─────────────────────────────────────────────
  worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: nestjs-worker
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/taskdb
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    depends_on:
      - mongo
      - redis
    networks:
      - app-network
    command: ["node", "dist/worker.js"]
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '1'
          memory: 512M

# ─────────────────────────────────────────────
# Networks
# ─────────────────────────────────────────────
networks:
  app-network:
    driver: bridge

# ─────────────────────────────────────────────
# Volumes
# ─────────────────────────────────────────────
volumes:
  mongo-data:
    driver: local
  mongo-config:
    driver: local
  redis-data:
    driver: local
```

---

### **Nginx Configuration**

```nginx
# ─────────────────────────────────────────────
# nginx/nginx.conf
# ─────────────────────────────────────────────
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging format
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;

    # Performance optimizations
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 10M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    # Upstream (load balancing)
    upstream nestjs_app {
        least_conn;
        server app:3000 max_fails=3 fail_timeout=30s;
        server app:3000 max_fails=3 fail_timeout=30s;
        server app:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    # HTTP Server (redirect to HTTPS)
    server {
        listen 80;
        server_name api.example.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name api.example.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Security headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # API routes
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;
            limit_conn conn_limit 10;

            proxy_pass http://nestjs_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
            proxy_read_timeout 90s;
            proxy_connect_timeout 75s;
        }

        # Health check endpoint (no rate limiting)
        location /health {
            proxy_pass http://nestjs_app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            access_log off;
        }

        # Static files
        location /static/ {
            alias /var/www/static/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

---

## 📦 **PART 3: CI/CD PIPELINE**

### **GitHub Actions CI/CD**

```yaml
# ─────────────────────────────────────────────
# .github/workflows/ci-cd.yml
# ─────────────────────────────────────────────
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ─────────────────────────────────────────────
  # Job 1: Lint & Type Check
  # ─────────────────────────────────────────────
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Run TypeScript type check
        run: npm run type-check

  # ─────────────────────────────────────────────
  # Job 2: Tests
  # ─────────────────────────────────────────────
  test:
    name: Tests
    runs-on: ubuntu-latest
    
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      mongo:
        image: mongo:7
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping:1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit
        env:
          CI: true

      - name: Run integration tests
        run: npm run test:integration
        env:
          CI: true
          MONGODB_URI: mongodb://localhost:27017/test
          REDIS_HOST: localhost

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          fail_ci_if_error: false

  # ─────────────────────────────────────────────
  # Job 3: Build Docker Image
  # ─────────────────────────────────────────────
  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: [lint, test]
    
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          file: ./Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ─────────────────────────────────────────────
  # Job 4: Deploy to Staging
  # ─────────────────────────────────────────────
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging-api.example.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to staging server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/nestjs-app
            docker-compose -f docker-compose.staging.yml pull
            docker-compose -f docker-compose.staging.yml up -d
            docker system prune -af

      - name: Health check
        run: |
          sleep 30
          curl -f https://staging-api.example.com/health || exit 1

  # ─────────────────────────────────────────────
  # Job 5: Deploy to Production
  # ─────────────────────────────────────────────
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://api.example.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to production server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PRODUCTION_HOST }}
          username: ${{ secrets.PRODUCTION_USER }}
          key: ${{ secrets.PRODUCTION_SSH_KEY }}
          script: |
            cd /opt/nestjs-app
            docker-compose -f docker-compose.prod.yml pull
            docker-compose -f docker-compose.prod.yml up -d
            docker system prune -af

      - name: Health check
        run: |
          sleep 30
          curl -f https://api.example.com/health || exit 1

      - name: Notify deployment success
        if: success()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "✅ Production deployment successful!\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

      - name: Notify deployment failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "❌ Production deployment failed!\nBranch: ${{ github.ref }}\nCommit: ${{ github.sha }}"
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## 📦 **PART 4: ENVIRONMENT CONFIGURATION**

### **Environment Variables Management**

```bash
# ─────────────────────────────────────────────
# .env.example
# ─────────────────────────────────────────────

# ─────────────────────────────────────────────
# Application
# ─────────────────────────────────────────────
NODE_ENV=production
PORT=3000
API_PREFIX=/api/v1
APP_NAME=Task Management API

# ─────────────────────────────────────────────
# Database (MongoDB)
# ─────────────────────────────────────────────
MONGODB_URI=mongodb://username:password@localhost:27017/taskdb?authSource=admin
MONGODB_POOL_SIZE=10
MONGODB_SERVER_SELECTION_TIMEOUT=5000

# ─────────────────────────────────────────────
# Redis
# ─────────────────────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_password_here
REDIS_DB=0
REDIS_TLS_ENABLED=false

# ─────────────────────────────────────────────
# Authentication
# ─────────────────────────────────────────────
JWT_SECRET=your_super_secure_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_here
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=task-management-api
JWT_AUDIENCE=task-management-client

# ─────────────────────────────────────────────
# Rate Limiting
# ─────────────────────────────────────────────
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
RATE_LIMIT_STRICT_TTL=900
RATE_LIMIT_STRICT_MAX=5

# ─────────────────────────────────────────────
# Email Service
# ─────────────────────────────────────────────
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=Task Management

# ─────────────────────────────────────────────
# File Storage (S3)
# ─────────────────────────────────────────────
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=task-management-uploads

# ─────────────────────────────────────────────
# Monitoring
# ─────────────────────────────────────────────
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
DATADOG_API_KEY=your_datadog_api_key
LOG_LEVEL=info

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────
CORS_ORIGIN=https://app.example.com
CORS_CREDENTIALS=true
```

---

### **Configuration Module**

```typescript
// ─────────────────────────────────────────────
// config/configuration.ts
// ─────────────────────────────────────────────
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  // Application
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI,
    poolSize: parseInt(process.env.MONGODB_POOL_SIZE, 10) || 10,
    serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT, 10) || 5000,
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    tlsEnabled: process.env.REDIS_TLS_ENABLED === 'true',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: process.env.JWT_ISSUER,
    audience: process.env.JWT_AUDIENCE,
  },

  // Rate Limiting
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    strictTtl: parseInt(process.env.RATE_LIMIT_STRICT_TTL, 10) || 900,
    strictMax: parseInt(process.env.RATE_LIMIT_STRICT_MAX, 10) || 5,
  },

  // Email
  email: {
    provider: process.env.EMAIL_PROVIDER || 'sendgrid',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME,
  },

  // AWS S3
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3Bucket: process.env.AWS_S3_BUCKET,
  },

  // Monitoring
  monitoring: {
    sentryDsn: process.env.SENTRY_DSN,
    datadogApiKey: process.env.DATADOG_API_KEY,
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
}));
```

---

## 📦 **PART 5: MONITORING & LOGGING**

### **Health Checks**

```typescript
// ─────────────────────────────────────────────
// health/health.controller.ts
// ─────────────────────────────────────────────
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HttpHealthIndicator,
  HealthCheckError,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private http: HttpHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  async healthCheck() {
    return this.health.check([
      // Database health
      () => this.db.pingCheck('mongodb'),

      // Memory health (max 80% usage)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // Disk health (max 80% usage)
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.8 }),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  async readinessCheck() {
    return this.health.check([
      () => this.db.pingCheck('mongodb'),
    ]);
  }

  @Get('live')
  @HealthCheck()
  async livenessCheck() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ]);
  }
}
```

---

### **Logging Configuration**

```typescript
// ─────────────────────────────────────────────
// logger/logger.service.ts
// ─────────────────────────────────────────────
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json(),
      ),
      defaultMeta: {
        service: 'task-management-api',
        environment: process.env.NODE_ENV,
      },
      transports: [
        // Error logs
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '20m',
          maxFiles: '14d',
        }),

        // Combined logs
        new winston.transports.DailyRotateFile({
          filename: 'logs/combined-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '20m',
          maxFiles: '14d',
        }),

        // Console (for development)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }
}
```

---

### **Request Logging Middleware**

```typescript
// ─────────────────────────────────────────────
// middleware/request-logger.middleware.ts
// ─────────────────────────────────────────────
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CustomLoggerService } from '../logger/logger.service';
import { v4 as uuidv4 } from 'uuid';

export interface LoggedRequest extends Request {
  requestId: string;
  startTime: number;
}

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private logger: CustomLoggerService) {}

  use(req: LoggedRequest, res: Response, next: NextFunction) {
    // Generate unique request ID
    req.requestId = uuidv4();
    req.startTime = Date.now();

    // Log request
    this.logger.log(`${req.method} ${req.originalUrl}`, 'HTTP');

    // Log response on finish
    res.on('finish', () => {
      const duration = Date.now() - req.startTime;
      const logData = {
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      };

      if (res.statusCode >= 500) {
        this.logger.error(`${res.statusCode} ${req.method} ${req.originalUrl}`, JSON.stringify(logData), 'HTTP');
      } else {
        this.logger.log(`${res.statusCode} ${req.method} ${req.originalUrl} - ${duration}ms`, 'HTTP');
      }
    });

    next();
  }
}
```

---

### **Metrics Collection**

```typescript
// ─────────────────────────────────────────────
// metrics/metrics.service.ts
// ─────────────────────────────────────────────
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleDestroy {
  private registry: client.Registry;
  private httpRequestDuration: client.Histogram;
  private httpRequestTotal: client.Counter;
  private activeConnections: client.Gauge;

  constructor() {
    this.registry = new client.Registry();
    client.collectDefaultMetrics({ register: this.registry });

    // HTTP request duration histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    // HTTP request total counter
    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // Active connections gauge
    this.activeConnections = new client.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestDuration
      .labels(method, route, statusCode.toString())
      .observe(duration / 1000);

    this.httpRequestTotal
      .labels(method, route, statusCode.toString())
      .inc();
  }

  setActiveConnections(count: number) {
    this.activeConnections.set(count);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  onModuleDestroy() {
    this.registry.clear();
  }
}
```

---

## 📦 **PART 6: PRODUCTION BEST PRACTICES**

### **Security Checklist**

```markdown
## Production Security Checklist

### Authentication & Authorization
- [ ] JWT secrets are strong (min 32 characters)
- [ ] JWT expiration is set appropriately (15min access, 7d refresh)
- [ ] Refresh token rotation implemented
- [ ] Rate limiting on auth endpoints (5 req/min)
- [ ] Password hashing with bcrypt (10+ rounds)
- [ ] Account lockout after failed attempts

### Network Security
- [ ] HTTPS/TLS enabled everywhere
- [ ] CORS properly configured (not *)
- [ ] Security headers set (Helmet.js)
- [ ] Rate limiting enabled
- [ ] DDoS protection (Cloudflare, AWS Shield)
- [ ] Firewall rules configured

### Data Security
- [ ] Environment variables encrypted at rest
- [ ] Database credentials rotated regularly
- [ ] Sensitive data encrypted in database
- [ ] No sensitive data in logs
- [ ] SQL/NoSQL injection protection
- [ ] XSS protection enabled

### Infrastructure Security
- [ ] Non-root user in Docker
- [ ] Minimal base image (Alpine)
- [ ] Regular security updates
- [ ] Vulnerability scanning (Snyk, Dependabot)
- [ ] Secrets management (AWS Secrets Manager, Vault)
- [ ] Audit logging enabled
```

---

### **Performance Checklist**

```markdown
## Production Performance Checklist

### Database
- [ ] All query fields indexed
- [ ] Compound indexes for common queries
- [ ] Query optimization with explain()
- [ ] Connection pooling configured
- [ ] Read replicas for read-heavy workloads
- [ ] Slow query monitoring enabled

### Caching
- [ ] Redis caching for frequently accessed data
- [ ] Cache hit rate > 80%
- [ ] Appropriate TTL for each cache type
- [ ] Cache invalidation on writes
- [ ] Cache key naming convention

### Application
- [ ] Response compression enabled
- [ ] Gzip/Brotli compression
- [ ] Lazy loading for heavy modules
- [ ] Request timeout configured
- [ ] Graceful shutdown implemented
- [ ] Memory leak monitoring

### Infrastructure
- [ ] Load balancer configured
- [ ] Auto-scaling enabled
- [ ] CDN for static assets
- [ ] Database connection limits set
- [ ] Resource limits (CPU, memory)
- [ ] Horizontal scaling tested
```

---

### **Reliability Checklist**

```markdown
## Production Reliability Checklist

### High Availability
- [ ] Multiple app instances (min 3)
- [ ] Load balancer health checks
- [ ] Auto-restart on failure
- [ ] Database replication
- [ ] Redis sentinel/cluster
- [ ] Multi-AZ deployment

### Monitoring & Alerting
- [ ] Health check endpoints
- [ ] Uptime monitoring (Pingdom, UptimeRobot)
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring (DataDog, New Relic)
- [ ] Log aggregation (ELK, Splunk)
- [ ] Alert channels configured (Slack, PagerDuty)

### Backup & Recovery
- [ ] Automated database backups
- [ ] Backup verification tests
- [ ] Point-in-time recovery tested
- [ ] Disaster recovery plan documented
- [ ] RTO/RPO defined
- [ ] Regular recovery drills

### Incident Response
- [ ] On-call rotation defined
- [ ] Incident response playbook
- [ ] Post-mortem process
- [ ] Runbooks for common issues
- [ ] Communication plan
- [ ] Escalation paths defined
```

---

## ✅ **PRODUCTION CHECKLIST**

```
Pre-Deployment
[ ] All tests passing (unit, integration, E2E)
[ ] Code coverage > 80%
[ ] No critical security vulnerabilities
[ ] Environment variables documented
[ ] Database migrations tested
[ ] Rollback plan documented

Deployment
[ ] CI/CD pipeline configured
[ ] Staging environment tested
[ ] Blue-green or canary deployment
[ ] Health checks passing
[ ] Monitoring dashboards updated
[ ] Team notified of deployment

Post-Deployment
[ ] Smoke tests passing
[ ] Error rates monitored (< 1%)
[ ] Response times acceptable (< 200ms)
[ ] Database performance normal
[ ] Cache hit rates acceptable (> 80%)
[ ] No memory leaks detected

Monitoring
[ ] Application metrics collected
[ ] Business metrics tracked
[ ] Alerts configured and tested
[ ] Log aggregation working
[ ] Distributed tracing enabled
[ ] Dashboard accessible

Documentation
[ ] API documentation updated
[ ] Deployment guide current
[ ] Runbooks available
[ ] Architecture diagrams updated
[ ] On-call documentation complete
```

---

## 🎯 **KNOWLEDGE CHECK**

### **Question 1: Multi-stage Docker Builds**

Why use multi-stage Docker builds?

<details>
<summary>💡 Click to reveal answer</summary>

**Benefits**:
1. **Smaller image size** (only production dependencies)
2. **Better security** (no build tools in production)
3. **Faster deployments** (smaller images to pull)

**Example**:
```dockerfile
# Stage 1: Build
FROM node:20 AS builder
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
```

**Result**: 150MB vs 900MB image size!
</details>

---

### **Question 2: Health Check Types**

What's the difference between liveness, readiness, and startup probes?

<details>
<summary>💡 Click to reveal answer</summary>

**Liveness Probe**:
- "Is the app running?"
- Restarts container if fails
- Example: Check if process is alive

**Readiness Probe**:
- "Is the app ready for traffic?"
- Removes from load balancer if fails
- Example: Check database connection

**Startup Probe**:
- "Has the app started?"
- Disables other probes until succeeds
- Example: Check if initialization complete

**Use all three** for production-grade reliability!
</details>

---

### **Question 3: Blue-Green Deployment**

What is blue-green deployment and why use it?

<details>
<summary>💡 Click to reveal answer</summary>

**Blue-Green Deployment**:
- Two identical environments (Blue = current, Green = new)
- Deploy new version to Green
- Test Green thoroughly
- Switch load balancer to Green
- Keep Blue as fallback

**Benefits**:
- ✅ Zero downtime deployment
- ✅ Instant rollback (switch back to Blue)
- ✅ Thorough testing before traffic switch
- ✅ No risk to production users

**Trade-off**: Requires 2x infrastructure (more expensive)
</details>

---

## 📚 **ADDITIONAL RESOURCES**

- **Docker Best Practices**: [Docker Docs](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- **Kubernetes**: [Kubernetes Documentation](https://kubernetes.io/docs/home/)
- **CI/CD**: [GitHub Actions Docs](https://docs.github.com/en/actions)
- **Monitoring**: [Prometheus Docs](https://prometheus.io/docs/introduction/overview/)
- **Logging**: [Winston Docs](https://github.com/winstonjs/winston)
- **Security**: [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🎓 **HOMEWORK**

1. ✅ Create production Dockerfile with multi-stage build
2. ✅ Set up Docker Compose for production (app, mongo, redis, nginx)
3. ✅ Configure Nginx as reverse proxy with SSL
4. ✅ Set up GitHub Actions CI/CD pipeline
5. ✅ Implement health check endpoints
6. ✅ Configure Winston logging with daily rotation
7. ✅ Set up Prometheus metrics collection
8. ✅ Create comprehensive environment configuration
9. ✅ Implement request logging middleware
10. ✅ Document deployment and rollback procedures

---

## 🎉 **CONGRATULATIONS!**

You've completed the **NestJS Mastery Series**! 

### **What You've Learned**:
1. ✅ Module Architecture
2. ✅ Decorators & Dependency Injection
3. ✅ Guards, Interceptors & Filters
4. ✅ DTOs & Validation
5. ✅ Services & Repository Pattern
6. ✅ Database & Mongoose Advanced
7. ✅ Caching Strategies with Redis
8. ✅ Message Queues with BullMQ
9. ✅ Testing with Vitest
10. ✅ Production Deployment & Monitoring

### **You're Now Ready To**:
- 🚀 Build production-ready NestJS applications
- 🏗️ Design scalable architectures
- 🔒 Implement enterprise-grade security
- ⚡ Optimize for performance
- 🧪 Write comprehensive tests
- 📊 Monitor and debug production systems

---

**Series Completion Date**: 18-03-26  
**Total Lessons**: 10  
**Total Words**: ~67,000+  
**Total Code Examples**: 140+  
**Status**: ✅ **COMPLETE**

---
-18-03-26
