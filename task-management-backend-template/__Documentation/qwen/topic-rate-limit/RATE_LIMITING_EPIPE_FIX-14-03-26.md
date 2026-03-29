# Rate Limiting EPIPE Error Fix

**Date:** 14-03-26  
**Error:** `write EPIPE` and `The client is closed`  
**Status:** ✅ Fixed

---

## 🐛 Problem

**Error Messages:**
```
Sat Mar 14 2026 15:21:33 [Lock Smit] error: UnhandleException Detected The client is closed
Sat Mar 14 2026 15:21:34 [Lock Smit] error: UnhandleException Detected write EPIPE
```

**Root Cause:**
- `rate-limit-redis` tries to send commands to Redis immediately
- Redis connection not established yet during startup
- Writing to closed Redis socket causes EPIPE error

---

## ✅ Solution

**Add connection check before sending Redis commands**

### **Before (Broken)**
```typescript
function createRedisStore(windowMs: number) {
  return new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    // ❌ No connection check - tries to send even if Redis closed
  });
}
```

### **After (Fixed)**
```typescript
function createRedisStore(windowMs: number) {
  return new RedisStore({
    sendCommand: async (...args: string[]) => {
      try {
        // ✅ Check if Redis is connected before sending command
        if (!redisClient.isOpen && !redisClient.isReady) {
          return 0; // Allow request if Redis not ready
        }
        return await redisClient.sendCommand(args);
      } catch (error) {
        // ✅ Handle errors gracefully - don't block requests
        errorLogger.error('Redis rate limit command failed:', error);
        return 0; // Allow request on Redis error
      }
    },
    prefix: 'ratelimit:',
  });
}
```

---

## 🔧 How It Works

### **Connection States**
```
redisClient.isOpen    → Connection is open
redisClient.isReady   → Connection is ready for commands
```

### **Flow**
```
Request arrives
    ↓
sendCommand() called
    ↓
Is Redis open/ready?
    ├─ NO  → Return 0 (allow request, no rate limiting)
    └─ YES → Send command to Redis
              ↓
           Success?
              ├─ YES → Return count
              └─ NO  → Log error, return 0 (allow request)
```

---

## 🛡️ Error Handling Strategy

**Fail Open (Not Fail Closed)**
- If Redis unavailable → **Allow requests** (don't block users)
- Log error for monitoring
- Better to allow some extra requests than block legitimate users

**Why?**
- Rate limiting is a **protection**, not a core feature
- Blocking all requests due to Redis issues is worse than allowing some extra requests
- Redis issues should be fixed, but shouldn't take down the entire API

---

## 📊 Testing

### **1. Restart Server**
```bash
npm run dev
```

### **2. Check Logs**
**Before (Broken):**
```
error: UnhandleException Detected The client is closed
error: UnhandleException Detected write EPIPE
[Process crashes]
```

**After (Fixed):**
```
✅ No EPIPE errors
✅ Server starts normally
[If Redis not ready] Redis rate limit command failed: ...
✅ Requests still processed
```

### **3. Verify Rate Limiting Works**
```bash
# Make requests
curl http://localhost:5000/api/v1/login

# Check Redis (once connected)
redis-cli KEYS 'ratelimit:*'

# Should see keys being created
```

---

## 📝 Files Modified

| File | Change |
|------|--------|
| `src/middlewares/rateLimiter.ts` | Added connection check in `sendCommand` |

---

## 🎯 Benefits

1. **✅ No EPIPE Errors** - Checks connection before writing
2. **✅ Graceful Degradation** - Allows requests if Redis fails
3. **✅ No Crashes** - Errors logged but don't crash server
4. **✅ Production Ready** - Handles Redis connection issues gracefully

---

## 🔍 Monitoring

### **Check for Redis Errors**
```bash
# Look for these in logs
Redis rate limit command failed: ...
```

### **If You See Many Errors**
1. Check Redis server status
2. Verify Redis connection string
3. Check network connectivity
4. Monitor Redis memory usage

---

## ⚠️ Important Notes

### **Temporary Behavior**
- During startup (before Redis connects) → **No rate limiting**
- Once Redis connects → **Rate limiting active**
- If Redis disconnects → **No rate limiting** (but requests continue)

### **Why Allow Requests on Redis Failure?**
- **Option 1: Fail Open** (current) → Allow requests, log error
- **Option 2: Fail Closed** → Block all requests (too aggressive)

**We chose Fail Open because:**
- Rate limiting is protective, not essential
- Better to allow some abuse than block all legitimate users
- Redis issues should be rare with proper infrastructure

---

## ✅ Verification Checklist

- [x] No EPIPE errors on server start
- [x] No "client is closed" errors
- [x] Server starts successfully even if Redis unavailable
- [x] Rate limiting works once Redis connects
- [x] Errors logged for monitoring
- [x] TypeScript compilation successful

---

**Fix Completed:** 14-03-26  
**Status:** ✅ Resolved  
**Behavior:** Graceful degradation on Redis failures
