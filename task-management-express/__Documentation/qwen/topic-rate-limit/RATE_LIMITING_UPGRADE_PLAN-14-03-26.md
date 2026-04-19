# Rate Limiting Upgrade Plan

**Date:** 14-03-26  
**Priority:** High (Required for Production)  
**Estimated Time:** 2-3 hours

---

## 🎯 Problem Statement

Current rate limiting implementation uses `express-rate-limit` with:
- ❌ Memory store (doesn't scale across multiple instances)
- ❌ Incomplete Redis integration (doesn't work with v7+)
- ❌ Fixed window algorithm (allows bursting at window boundaries)

**Impact:**
- Rate limits reset on server restart
- Different limits per server instance (inconsistent user experience)
- Users can burst at window boundaries

---

## ✅ Solution: `rate-limit-redis` + `express-rate-limit`

### **Step 1: Install Dependencies**

```bash
npm install rate-limit-redis
```

### **Step 2: Update `src/middlewares/rateLimiter.ts`**

Replace the custom Redis store with official `rate-limit-redis`:

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../helpers/redis/redis';
import { errorLogger } from '../shared/logger';

// Create Redis store instance
const createRedisStore = (windowMs: number) => {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    resetExpiryPrecision: 'seconds', // More precise TTL
  });
};

// Update rateLimiter function
export function rateLimiter(
  type: TRateLimitType = 'user',
  useRedis: boolean = true  // Default to true for production
) {
  const preset = RATE_LIMIT_PRESETS[type];
  
  return rateLimit({
    store: useRedis ? createRedisStore(preset.windowMs) : undefined,
    windowMs: preset.windowMs,
    max: preset.max,
    message: preset.message,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.userId || req.ip || 'unknown';
    },
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: preset.message.message,
        retryAfter: Math.ceil(preset.windowMs / 1000),
      });
    },
    // Skip for trusted IPs (optional)
    skip: (req: any) => {
      // Skip for internal health checks
      return req.path === '/health';
    },
  });
}
```

### **Step 3: Update Auth Routes**

**File:** `src/modules/auth/auth.routes.ts`

```typescript
import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import { redisClient } from '../../helpers/redis/redis';

// Create shared Redis store
const authRedisStore = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.sendCommand(args),
});

const loginLimiter = rateLimit({
  store: authRedisStore,
  windowMs: AUTH_RATE_LIMITS.LOGIN.windowMs,
  max: AUTH_RATE_LIMITS.LOGIN.max,
  message: AUTH_RATE_LIMITS.LOGIN.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // Use IP for auth endpoints
});
```

### **Step 4: Update Task Routes**

**File:** `src/modules/task.module/task/task.route.ts`

```typescript
import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import { redisClient } from '../../../helpers/redis/redis';

const taskRedisStore = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.sendCommand(args),
});

const createTaskLimiter = rateLimit({
  store: taskRedisStore,
  windowMs: TASK_RATE_LIMITS.CREATE_TASK.windowMs,
  max: TASK_RATE_LIMITS.CREATE_TASK.max,
  message: TASK_RATE_LIMITS.CREATE_TASK.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip,
});
```

### **Step 5: Test Redis Connection**

Add health check for Redis rate limiting:

```typescript
// src/helpers/redis/redis.ts
export async function checkRedisHealth() {
  try {
    await redisClient.ping();
    return {
      status: 'healthy',
      connected: true,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      error: error.message,
    };
  }
}

// src/health/health.controller.ts
async function checkRateLimiting() {
  const redisHealth = await checkRedisHealth();
  return {
    rateLimiting: redisHealth.connected ? 'redis' : 'memory',
    redis: redisHealth,
  };
}
```

---

## 📊 Benefits

### **Before (Current)**
```
Server 1: [Memory: 3/5 requests]
Server 2: [Memory: 2/5 requests]
Server 3: [Memory: 4/5 requests]

User hits all 3 servers → 9/5 requests (bypasses rate limit!)
```

### **After (With Redis)**
```
Redis: [ratelimit:login:192.168.1.1 = 3/5]

Server 1 → Check Redis → 3/5 ✅
Server 2 → Check Redis → 4/5 ✅
Server 3 → Check Redis → 5/5 ❌ BLOCKED

All servers share same counter!
```

---

## 🧪 Testing Checklist

- [ ] Test rate limiting with single instance
- [ ] Test rate limiting with multiple instances (2+ servers)
- [ ] Verify Redis counters are created correctly
- [ ] Verify TTL is set properly on Redis keys
- [ ] Test rate limit headers in response
- [ ] Test 429 response when limit exceeded
- [ ] Test rate limit reset after window expires
- [ ] Test fallback when Redis is unavailable
- [ ] Load test with 100+ concurrent requests

---

## 📈 Monitoring

Add metrics for rate limiting:

```typescript
// Track rate limit hits
redisClient.subscribe('ratelimit:*');
redisClient.on('message', (channel, message) => {
  logger.info(`Rate limit hit: ${channel} = ${message}`);
  // Send to monitoring system (Datadog, Prometheus, etc.)
});
```

---

## 🔄 Migration Plan

### **Phase 1: Development (Day 1)**
- [ ] Install `rate-limit-redis`
- [ ] Update `rateLimiter.ts` middleware
- [ ] Test locally with Redis

### **Phase 2: Staging (Day 2)**
- [ ] Deploy to staging environment
- [ ] Monitor Redis memory usage
- [ ] Verify rate limiting works across instances

### **Phase 3: Production (Day 3)**
- [ ] Deploy to production during low-traffic period
- [ ] Monitor for 24 hours
- [ ] Rollback plan: Set `useRedis: false` if issues

---

## 🚨 Rollback Plan

If issues occur, revert to memory store:

```typescript
// Quick rollback in rateLimiter.ts
export function rateLimiter(type: TRateLimitType, useRedis: boolean = false) {
  // Set useRedis = false to disable Redis
  // ...
}
```

---

## 📚 References

- [rate-limit-redis Documentation](https://www.npmjs.com/package/rate-limit-redis)
- [express-rate-limit Documentation](https://www.npmjs.com/package/express-rate-limit)
- [masterSystemPrompt.md Section 10](../../masterSystemPrompt.md) - Rate Limiting Rules

---

**Estimated Impact:**
- ✅ Zero downtime deployment
- ✅ Backward compatible (can toggle Redis on/off)
- ✅ Improves security and consistency
- ✅ Required for horizontal scaling

**Priority:** 🔴 HIGH - Required before production deployment with multiple instances
