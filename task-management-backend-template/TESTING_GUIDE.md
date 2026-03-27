# 🧪 Testing Guide - Auth Module

**Version**: 1.0.0  
**Date**: 26-03-23  
**Status**: ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Running Tests](#running-tests)
5. [Test Structure](#test-structure)
6. [Test Examples](#test-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This testing suite provides comprehensive integration tests for the Auth Module using:

- **Vitest**: Fast, modern testing framework
- **Supertest**: HTTP assertion library
- **MongoDB**: Test database
- **Redis**: Test cache

### What's Tested?

| Area | Coverage | Status |
|------|----------|--------|
| Registration | ✅ Complete | Production Ready |
| Login | ✅ Complete | Production Ready |
| Email Verification | ✅ Complete | Production Ready |
| Password Management | ✅ Complete | Production Ready |
| Token Refresh | ✅ Complete | Production Ready |
| Logout | ✅ Complete | Production Ready |
| OAuth (Google/Apple) | 📝 Documented | Needs Mocking |
| Security (Rate Limiting) | ✅ Complete | Production Ready |

---

## 📦 Installation

### Step 1: Install Dependencies

```bash
# Install test dependencies
npm install --save-dev vitest @vitest/coverage-v8 @vitest/ui supertest @types/supertest

# Or install all at once
npm install
```

### Step 2: Verify Installation

```bash
# Check if vitest is installed
npx vitest --version

# Expected output: vitest/1.6.0
```

---

## ⚙️ Configuration

### Files Created

```
task-management-backend-template/
├── vitest.config.ts          # Vitest configuration
├── src/
│   ├── test/
│   │   └── setup.ts          # Global test setup
│   └── modules/
│       └── auth/
│           └── auth.test.ts  # Auth module tests
└── package.json              # Updated with test scripts
```

### Environment Variables

The test setup automatically configures these environment variables:

```typescript
// Database
MONGO_URI=mongodb://localhost:27017/task_management_test
REDIS_HOST=localhost
REDIS_PORT=6379

// JWT Secrets
JWT_ACCESS_SECRET=test-access-secret-key-for-testing-only-12345
JWT_REFRESH_SECRET=test-refresh-secret-key-for-testing-only-67890

// OAuth
GOOGLE_CLIENT_ID=test-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=test-google-client-secret

// Email
SMTP_HOST=smtp.test.com
SMTP_PORT=587
SMTP_USER=test@example.com
SMTP_PASS=test-password
```

---

## 🚀 Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage

# Run only auth module tests
npm run test:auth

# Run integration tests
npm run test:integration

# Run tests for CI/CD
npm run test:ci
```

### Advanced Commands

```bash
# Run specific test file
npx vitest run src/modules/auth/auth.test.ts

# Run tests matching pattern
npx vitest run -t "should login user"

# Run tests with custom reporter
npx vitest run --reporter=verbose

# Run tests in parallel
npx vitest run --pool=threads

# Run tests sequentially
npx vitest run --pool=forks
```

---

## 📊 Test Structure

### File Organization

```typescript
/**
 * ═══════════════════════════════════════════════════════════════════
 * Auth Module Test Suite
 * ═══════════════════════════════════════════════════════════════════
 *
 * 1. Test Setup & Teardown
 * 2. Registration Tests
 * 3. Login Tests
 * 4. Email Verification Tests
 * 5. Password Management Tests
 * 6. Token Refresh Tests
 * 7. Logout Tests
 * 8. OAuth Tests
 * 9. Security Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('Auth Module Tests', () => {
  // Setup
  beforeAll(async () => {
    // Connect to test database
  });

  // Teardown
  afterAll(async () => {
    // Disconnect from database
  });

  // Test suites
  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      // Test implementation
    });
  });
});
```

---

## 📝 Test Examples

### Example 1: Testing Registration

```typescript
it('should register a new user successfully', async () => {
  // Arrange: Prepare test data
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'TestPassword123!',
    role: 'user',
    acceptTOC: true,
  };

  // Act: Send registration request
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send(userData)
    .expect(201);

  // Assert: Verify response
  expect(response.body.success).toBe(true);
  expect(response.body.data.user).toBeDefined();
  expect(response.body.data.user.email).toBe(userData.email);

  // Assert: Verify in database
  const userInDb = await User.findOne({ email: userData.email });
  expect(userInDb).toBeDefined();
  expect(userInDb.password).not.toBe(userData.password); // Hashed
});
```

### Example 2: Testing Login

```typescript
it('should login user with valid credentials', async () => {
  // Arrange: Create user
  const user = await User.create({
    email: 'test@example.com',
    password: 'TestPassword123!',
    name: 'Test User',
    role: 'user',
    isEmailVerified: true,
  });

  // Act: Send login request
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: user.email,
      password: 'TestPassword123!',
    })
    .expect(200);

  // Assert: Verify tokens
  expect(response.body.data.tokens.accessToken).toBeDefined();
  expect(response.body.data.tokens.refreshToken).toBeDefined();

  // Assert: Verify cookie
  const cookie = response.headers['set-cookie'][0];
  expect(cookie).toContain('refreshToken');
  expect(cookie).toContain('HttpOnly');
});
```

### Example 3: Testing Error Scenarios

```typescript
it('should reject login with invalid credentials', async () => {
  // Arrange: Create user
  await User.create({
    email: 'test@example.com',
    password: 'CorrectPassword123!',
    name: 'Test User',
    role: 'user',
    isEmailVerified: true,
  });

  // Act & Assert: Try login with wrong password
  await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: 'test@example.com',
      password: 'WrongPassword123!',
    })
    .expect(401);
});
```

---

## 🏆 Best Practices

### 1. Test Isolation

```typescript
// ✅ GOOD: Clean database before/after each test
beforeEach(async () => {
  await cleanupDatabase();
});

afterEach(async () => {
  await cleanupDatabase();
});

// ❌ BAD: Tests depend on each other
// Test 1 creates user, Test 2 uses that user
```

### 2. Unique Test Data

```typescript
// ✅ GOOD: Generate unique email for each test
const generateUniqueEmail = () => `test.${Date.now()}@example.com`;

it('should register user', async () => {
  const email = generateUniqueEmail();
  // Test with unique email
});

// ❌ BAD: Hardcoded email
const email = 'test@example.com'; // May conflict
```

### 3. Comprehensive Assertions

```typescript
// ✅ GOOD: Multiple assertions
expect(response.status).toBe(200);
expect(response.body.success).toBe(true);
expect(response.body.data.user).toBeDefined();
expect(response.body.data.user.email).toBe(email);

// ❌ BAD: Single assertion
expect(response.status).toBe(200);
```

### 4. Test Naming

```typescript
// ✅ GOOD: Descriptive names
it('should reject login with unverified email', async () => {
  // Clear what's being tested
});

// ❌ BAD: Vague names
it('should work', async () => {
  // What should work?
});
```

### 5. Async Handling

```typescript
// ✅ GOOD: Proper async/await
it('should create user', async () => {
  const user = await User.create(userData);
  expect(user).toBeDefined();
});

// ❌ BAD: Missing await
it('should create user', () => {
  const user = await User.create(userData); // Missing async
});
```

### 6. Error Testing

```typescript
// ✅ GOOD: Test error scenarios
it('should reject invalid email', async () => {
  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ email: 'invalid' })
    .expect(400);

  expect(response.body.message).toContain('invalid email');
});

// ❌ BAD: Only test success scenarios
it('should register user', async () => {
  // Only tests happy path
});
```

---

## 🔧 Troubleshooting

### Issue 1: Tests Not Running

**Problem**: `vitest` command not found

**Solution**:
```bash
# Install vitest globally
npm install -g vitest

# Or use npx
npx vitest run
```

---

### Issue 2: Database Connection Failed

**Problem**: `MongoServerError: connect ECONNREFUSED`

**Solution**:
```bash
# Start MongoDB
mongod --dbpath /data/db

# Or use Docker
docker run -d -p 27017:27017 mongo:latest
```

---

### Issue 3: Redis Connection Failed

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution**:
```bash
# Start Redis
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

---

### Issue 4: Tests Timing Out

**Problem**: `Error: Test timed out in 5000ms`

**Solution**:
```typescript
// Increase timeout in vitest.config.ts
test: {
  testTimeout: 30000, // 30 seconds
}

// Or per test
it('should take longer', async () => {
  vi.setConfig({ testTimeout: 60000 });
  // Test implementation
}, 60000);
```

---

### Issue 5: Port Already in Use

**Problem**: `EADDRINUSE: address already in use`

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use random port in tests
process.env.PORT = '0';
```

---

### Issue 6: Tests Affecting Each Other

**Problem**: Test A passes alone but fails with Test B

**Solution**:
```typescript
// Ensure proper cleanup
beforeEach(async () => {
  await redisClient.flushAll(); // Clear Redis
  await cleanupDatabase();      // Clear MongoDB
});

// Run tests sequentially
// vitest.config.ts
test: {
  sequence: {
    concurrent: false,
  }
}
```

---

## 📈 Coverage Report

After running `npm run test:coverage`, open the HTML report:

```bash
# Open coverage report
open coverage/index.html

# Or view in browser
# file:///path/to/project/coverage/index.html
```

### Coverage Goals

| Metric | Goal | Current |
|--------|------|---------|
| Statements | 70% | - |
| Branches | 60% | - |
| Functions | 70% | - |
| Lines | 70% | - |

---

## 🎓 Learning Resources

### Vitest Documentation
- [Official Docs](https://vitest.dev/)
- [API Reference](https://vitest.dev/api/)
- [Config Reference](https://vitest.dev/config/)

### Supertest Documentation
- [GitHub Repo](https://github.com/ladjs/supertest)
- [NPM Package](https://www.npmjs.com/package/supertest)

### Testing Best Practices
- [Testing Best Practices](https://github.com/goldbergyoni/nodebestpractices#3-testing-and-overall-quality)
- [Node.js Testing Guide](https://developer.mozilla.org/en-US/docs/Learn/Server-side/Node_server/mongodb_testing)

---

## 📞 Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review test examples in `auth.test.ts`
3. Consult Vitest documentation
4. Ask the engineering team

---

**Created**: 26-03-23  
**Author**: Senior Engineering Team  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
