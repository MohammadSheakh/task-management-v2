# 🚀 Getting Started Guide

**Version**: 1.0  
**Last Updated**: 08-03-26  
**Status**: ✅ Production Ready

---

## 🎯 Overview

This guide will help you set up and run the Task Management Backend system on your local machine for development and testing.

---

## 📋 Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18+ | Runtime environment |
| **MongoDB** | 5+ | Database |
| **Redis** | 6+ | Caching & Sessions |
| **Git** | Latest | Version control |

### Optional Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Docker** | Latest | Containerization |
| **Stripe CLI** | Latest | Local webhook testing |
| **Postman** | Latest | API testing |

---

## 🔧 Installation Steps

### Step 1: Clone Repository

```bash
# Clone the repository
git clone <repository-url>
cd task-management-backend-template
```

### Step 2: Install Dependencies

```bash
# Install all dependencies
npm install

# Verify installation
npm list --depth=0
```

### Step 3: Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

### Step 4: Configure Environment Variables

```bash
# .env - Required Variables

# Server Configuration
PORT=5000
NODE_ENV=development
BACKEND_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://localhost:27017/task-management
MONGODB_POOL_MIN=5
MONGODB_POOL_MAX=50

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Service (SendGrid)
SENDGRID_API_KEY=SG....
EMAIL_FROM=noreply@example.com

# Firebase (for push notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY=your-private-key

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
UPLOAD_PATH=./uploads

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 5: Start Services

```bash
# Start MongoDB (if not running)
mongod --dbpath /data/db

# Start Redis (if not running)
redis-server

# Verify services
redis-cli ping  # Should return: PONG
mongo --eval "db.version()"  # Should return version
```

### Step 6: Start Development Server

```bash
# Start with hot reload
npm run dev

# Server should start on http://localhost:5000
```

### Step 7: Verify Installation

```bash
# Test health endpoint
curl http://localhost:5000/health

# Expected response:
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-03-08T10:00:00.000Z"
}
```

---

## 🧪 Testing Setup

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- task.module.test.js

# Run in watch mode
npm run test:watch
```

### Test Database

```bash
# Use test database
export MONGODB_URI=mongodb://localhost:27017/task-management-test

# Run tests with test database
npm test
```

---

## 🔌 API Testing

### Using Postman

1. **Import Collection**
   - Open Postman
   - Import `__Documentation/postman/Task-Management.postman_collection.json`
   - Set environment variables

2. **Test Endpoints**
   - Start with `/auth/signup`
   - Get JWT token
   - Use token for authenticated requests

### Using cURL

```bash
# Signup
curl -X POST http://localhost:5000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'

# Get Profile (use token from login)
curl -X GET http://localhost:5000/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐳 Docker Setup (Optional)

### Start with Docker Compose

```bash
# Start all services
docker-compose up -d

# Services started:
# - MongoDB (localhost:27017)
# - Redis (localhost:6379)
# - Backend (localhost:5000)

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Docker Environment Variables

```bash
# docker-compose.yml uses these:
MONGODB_URI=mongodb://mongo:27017/task-management
REDIS_HOST=redis
PORT=5000
```

---

## 🔧 Development Tools

### Recommended VS Code Extensions

```bash
# Install these extensions:
- ESLint
- Prettier
- MongoDB for VS Code
- Thunder Client (API testing)
- Mermaid Markdown Syntax Highlighting
- GitLens
```

### Useful Commands

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix lint errors
npm run lint:fix

# Check for unused dependencies
npm run depcheck

# Build TypeScript
npm run build
```

---

## 📊 Database Setup

### Create Indexes

```bash
# Connect to MongoDB
mongo

# Use database
use task-management

# Run index creation script
db.task.createIndex({ createdById: 1, status: 1, startTime: -1 })
db.task.createIndex({ ownerUserId: 1, status: 1, startTime: -1 })
# ... (see module documentation for all indexes)
```

### Seed Sample Data

```bash
# Run seed script
npm run seed

# This creates:
# - Sample users
# - Sample groups
# - Sample tasks
# - Sample subscriptions
```

---

## 🐛 Troubleshooting

### Issue 1: MongoDB Connection Failed

**Error**: `MongoServerError: connect ECONNREFUSED`

**Solution**:
```bash
# Start MongoDB
mongod --dbpath /data/db

# Or check if running
ps aux | grep mongod
```

### Issue 2: Redis Connection Failed

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Start Redis
redis-server

# Or check if running
redis-cli ping  # Should return: PONG
```

### Issue 3: Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill process
kill -9 <PID>

# Or use different port
PORT=5001 npm run dev
```

### Issue 4: JWT Token Invalid

**Error**: `Unauthorized: Invalid token`

**Solution**:
```bash
# Check JWT_SECRET in .env matches
# Re-login to get fresh token
curl -X POST http://localhost:5000/auth/login ...
```

### Issue 5: Stripe Webhook Not Working

**Error**: Webhooks not received

**Solution**:
```bash
# Install Stripe CLI
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:5000/stripe-webhook

# Use webhook secret from CLI output in .env
```

---

## 📝 Next Steps

### After Setup

1. ✅ **Test Basic Endpoints**
   - `/auth/signup`
   - `/auth/login`
   - `/users/profile`

2. ✅ **Create Sample Data**
   - Create user account
   - Create group
   - Create tasks
   - Test notifications

3. ✅ **Explore Documentation**
   - Read [Project Overview](./PROJECT_OVERVIEW.md)
   - Review [API Overview](./API_OVERVIEW.md)
   - Check module-specific docs

4. ✅ **Start Development**
   - Pick a module
   - Read module documentation
   - Make changes
   - Run tests

---

## 🔗 Related Documentation

- [Project Overview](./PROJECT_OVERVIEW.md)
- [API Overview](./API_OVERVIEW.md)
- [Development Guide](./DEVELOPMENT_GUIDE.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Module Documentation](../../src/modules/)

---

## 📞 Support

### Getting Help

- **Documentation**: Check module docs
- **Issues**: Create GitHub issue
- **Questions**: Ask in team chat

### Common Questions

**Q: How do I reset the database?**
```bash
mongo
use task-management
db.dropDatabase()
npm run seed
```

**Q: How do I test Stripe payments locally?**
```bash
# Use Stripe test cards
# Card: 4242 4242 4242 4242
# Any future date, any CVC
```

**Q: How do I view logs?**
```bash
# Development logs
npm run dev  # Logs to console

# Production logs
# Check AWS CloudWatch or log files
```

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Complete
