# Rate Limiting Strategy Documentation

**Project:** Task Management Backend  
**Last Updated:** 2026-03-12  
**Status:** ✅ Implemented

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Available Strategies](#available-strategies)
4. [Rate Limit Configuration](#rate-limit-configuration)
5. [Route-Specific Rate Limits](#route-specific-rate-limits)
6. [Redis vs Memory Store](#redis-vs-memory-store)
7. [Best Practices](#best-practices)
8. [Migration Guide](#migration-guide)

---

## Overview

This document outlines the rate limiting implementation across the Task Management Backend system. Rate limiting protects against:
- Brute force attacks
- DDoS attacks
- API abuse
- Resource exhaustion

---

## Current Implementation

### Library Used
**`express-rate-limit` v7.5.0**

### Storage Strategy
**Hybrid Approach:**
- **Default:** Memory Store (single-instance deployments)
- **Recommended:** Redis Store (multi-instance/cluster deployments)

### Middleware Location
```
src/middlewares/rateLimiter.ts
```

---

## Available Strategies

### 1. Memory Store (Default)
**Use Case:** Single server deployment, development, testing

**Pros:**
- ✅ No external dependencies
- ✅ Simple setup
- ✅ Zero configuration

**Cons:**
- ❌ Not shared across server instances
- ❌ Resets on server restart
- ❌ Memory leaks in long-running processes

**Implementation:**
```typescript
import { rateLimiter } from '../../../middlewares/rateLimiter';

router.get('/analytics', rateLimiter('user'), controller);
```

---

### 2. Redis Store (Recommended for Production)
**Use Case:** Multi-server deployments, production environments

**Pros:**
- ✅ Shared across all server instances
- ✅ Persists through server restarts
- ✅ Automatic cleanup with TTL
- ✅ Integrates with existing Redis infrastructure

**Cons:**
- ❌ Requires Redis connection
- ❌ Slightly higher latency
- ❌ Additional failure point

**Implementation:**
```typescript
import { rateLimiter } from '../../../middlewares/rateLimiter';

// Enable Redis by passing true as second parameter
router.get('/analytics', rateLimiter('user', true), controller);
```

---

### 3. Custom Rate Limiter
**Use Case:** Special endpoints with unique requirements

**Implementation:**
```typescript
import { createCustomRateLimiter } from '../../../middlewares/rateLimiter';

// File upload: 5 requests per minute
const uploadLimiter = createCustomRateLimiter(
  60 * 1000,      // 1 minute
  5,              // 5 requests
  'Too many uploads'
);

router.post('/upload', uploadLimiter, uploadController);
```

---

## Rate Limit Configuration

### Preset Types

| Type | Window | Max Requests | Use Case |
|------|--------|--------------|----------|
| `user` | 1 minute | 30 | General user endpoints |
| `admin` | 1 minute | 100 | Admin dashboard |
| `auth` | 15 minutes | 5 | Login, registration |
| `api` | 1 minute | 60 | General API endpoints |
| `strict` | 1 hour | 3 | Password reset, OTP |

### Configuration File
```typescript
// src/middlewares/rateLimiter.ts
export const RATE_LIMIT_PRESETS = {
  user: {
    windowMs: 60 * 1000,       // 1 minute
    max: 30,                    // 30 requests per minute
    message: {
      success: false,
      message: 'Too many requests, please slow down',
    },
  },
  // ... other presets
}
```

---

## Route-Specific Rate Limits

### Authentication Routes
**File:** `src/modules/auth/auth.routes.ts`

| Endpoint | Limiter | Window | Max | Reason |
|----------|---------|--------|-----|--------|
| POST /login | `loginLimiter` | 15 min | 5 | Prevent brute force |
| POST /register | `registerLimiter` | 1 hour | 10 | Prevent spam |
| POST /forgot-password | `forgotPasswordLimiter` | 1 hour | 3 | Prevent email abuse |
| POST /verify-email | `verifyEmailLimiter` | 1 hour | 5 | Prevent verification spam |
| POST /reset-password | `authLimiter` | 1 min | 100 | Standard protection |
| POST /change-password | `authLimiter` | 1 min | 100 | Standard protection |

**Implementation:**
```typescript
const loginLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMITS.LOGIN.windowMs,
  max: AUTH_RATE_LIMITS.LOGIN.max,
  message: AUTH_RATE_LIMITS.LOGIN.message,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, AuthController.login);
```

---

### Analytics Routes
**File:** `src/modules/analytics.module/chartAggregation/chartAggregation.route.ts`

| Endpoint | Limiter | Window | Max | Reason |
|----------|---------|--------|-----|--------|
| GET /user-growth | `rateLimiter('user')` | 1 min | 30 | Dashboard charts |
| GET /task-status | `rateLimiter('user')` | 1 min | 30 | Dashboard charts |
| GET /monthly-income | `rateLimiter('user')` | 1 min | 30 | Dashboard charts |
| GET /family-activity | `rateLimiter('user')` | 1 min | 30 | Parent dashboard |

**Implementation:**
```typescript
import { rateLimiter } from '../../../middlewares/rateLimiter';

router.get(
  '/user-growth',
  auth(),
  authorize('admin'),
  rateLimiter('user'),  // 30 req/min
  ChartAggregationController.getUserGrowthChart
);
```

---

### Task Progress Routes
**File:** `src/modules/taskProgress.module/taskProgress.route.ts`

| Endpoint | Limiter | Window | Max | Reason |
|----------|---------|--------|-----|--------|
| POST /progress | `progressLimiter` | 1 min | 100 | Standard API |
| PUT /progress/:id | `updateProgressLimiter` | 1 min | 30 | Prevent spam updates |

---

### Children Business User Routes
**File:** `src/modules/childrenBusinessUser.module/childrenBusinessUser.route.ts`

| Endpoint | Limiter | Window | Max | Reason |
|----------|---------|--------|-----|--------|
| POST /create-child | `createChildLimiter` | 1 hour | 10 | Prevent abuse |
| GET /children | `childrenLimiter` | 1 min | 100 | Standard API |
| PUT /update-child/:id | `childrenLimiter` | 1 hour | 20 | Prevent frequent changes |

---

### Notification Routes
**File:** `src/modules/notification.module/notification.route.ts`

| Endpoint | Limiter | Window | Max | Reason |
|----------|---------|--------|-----|--------|
| POST /send | `sendNotificationLimiter` | 1 min | 10 | Prevent spam |
| GET /notifications | `notificationLimiter` | 1 min | 100 | Standard API |

---

## Redis vs Memory Store

### Decision Matrix

| Factor | Memory Store | Redis Store |
|--------|--------------|-------------|
| **Deployment Type** | Single server | Multi-server/Cluster |
| **Traffic** | Low (< 1000 req/min) | High (> 1000 req/min) |
| **Infrastructure** | No Redis | Redis available |
| **Persistence** | Not required | Required |
| **Complexity** | Simple | Moderate |

### Recommendation

**Development/Testing:**
```typescript
rateLimiter('user')  // Memory store (default)
```

**Production (Single Server):**
```typescript
rateLimiter('user')  // Memory store is sufficient
```

**Production (Multi-Server/Cluster):**
```typescript
rateLimiter('user', true)  // Redis store
```

---

## Best Practices

### 1. Use Appropriate Limits
```typescript
// ✅ Good: Strict limits for auth
rateLimiter('auth')  // 5 attempts per 15 min

// ✅ Good: Moderate limits for user endpoints
rateLimiter('user')  // 30 requests per min

// ❌ Bad: Same limit for all endpoints
rateLimiter('user')  // Even for login endpoint
```

### 2. Identify Users Properly
```typescript
// ✅ Uses user ID if authenticated, IP otherwise
keyGenerator: (req) => req.user?.id || req.ip

// ❌ Only uses IP (breaks for authenticated users)
keyGenerator: (req) => req.ip
```

### 3. Return Informative Errors
```typescript
// ✅ Good: Clear error with retry time
{
  success: false,
  message: 'Too many requests, please try again later',
  retryAfter: 60  // seconds
}

// ❌ Bad: Generic error
{
  error: 'Rate limit exceeded'
}
```

### 4. Set Proper Headers
```typescript
// ✅ Enable standard headers
rateLimit({
  standardHeaders: true,   // RateLimit-* headers
  legacyHeaders: false,    // Disable X-RateLimit-*
})
```

### 5. Monitor and Adjust
```typescript
// Log rate limit hits for monitoring
handler: (req, res) => {
  logger.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
  res.status(429).json({
    success: false,
    message: 'Too many requests',
  });
}
```

---

## Migration Guide

### From Memory to Redis

**Step 1: Update Configuration**
```typescript
// Before (Memory)
router.get('/analytics', rateLimiter('user'), controller);

// After (Redis)
router.get('/analytics', rateLimiter('user', true), controller);
```

**Step 2: Ensure Redis Connection**
```typescript
// src/helpers/redis/redis.ts
export const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});
```

**Step 3: Test Failover**
```typescript
// Rate limiter automatically falls back to memory if Redis fails
try {
  await redisClient.ping();
} catch (error) {
  // Falls back to memory store
  errorLogger.error('Redis unavailable, using memory store');
}
```

---

## Implementation Checklist

### ✅ Completed
- [x] Created `src/middlewares/rateLimiter.ts`
- [x] Defined rate limit presets (user, admin, auth, api, strict)
- [x] Implemented memory store (default)
- [x] Implemented Redis store (optional)
- [x] Created custom rate limiter factory
- [x] Documented all route-specific limits
- [x] Added error handling and logging

### 🔄 To Do
- [ ] Migrate all routes to use centralized `rateLimiter` middleware
- [ ] Add rate limit monitoring/dashboard
- [ ] Implement per-user rate limits for premium users
- [ ] Add rate limit analytics (track most-hit endpoints)
- [ ] Create rate limit test suite

---

## API Response Examples

### Success Response (Within Limit)
```http
HTTP/1.1 200 OK
RateLimit-Limit: 30
RateLimit-Remaining: 29
RateLimit-Reset: 1710234567

{
  "success": true,
  "data": { ... }
}
```

### Error Response (Limit Exceeded)
```http
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 30
RateLimit-Remaining: 0
RateLimit-Reset: 1710234567
Retry-After: 60

{
  "success": false,
  "message": "Too many requests, please slow down",
  "retryAfter": 60
}
```

---

## Troubleshooting

### Issue: Rate limits not working across servers
**Solution:** Switch to Redis store
```typescript
rateLimiter('user', true)  // Enable Redis
```

### Issue: Legitimate users getting rate limited
**Solution:** Increase limits or implement user tiers
```typescript
// Premium users get higher limits
const premiumLimiter = rateLimiter('admin');  // 100 req/min
```

### Issue: Redis connection failures
**Solution:** Automatic fallback to memory store
```typescript
// Built-in fallback in rateLimiter middleware
```

---

## References

- [express-rate-limit Documentation](https://www.npmjs.com/package/express-rate-limit)
- [Redis Documentation](https://redis.io/documentation)
- [OWASP Rate Limiting Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [masterSystemPrompt.md Section 10: Rate Limiting Rules](../masterSystemPrompt.md)

---

**Author:** Senior Engineering Team  
**Review Date:** 2026-03-12  
**Next Review:** 2026-06-12
