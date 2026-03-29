# 🔴 Chapter 5: Redis Caching System - Complete Guide

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Intermediate  
**Prerequisites**: Chapter 2 (Login), Chapter 4 (JWT Tokens)  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ Why Redis is critical for performance
- ✅ Session caching (7 days TTL)
- ✅ OTP caching (10 minutes TTL)
- ✅ Token blacklist implementation
- ✅ Rate limiting with Redis (sliding window)
- ✅ Cache invalidation strategies
- ✅ Redis data structures
- ✅ Monitoring and debugging
- ✅ Performance benchmarks
- ✅ Best practices

---

## 📊 Big Picture: Redis in Our System

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS CACHING SYSTEM                          │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Use Case 1: Session Caching                             │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ User Login                                         │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ Cache session data in Redis                        │ │  │
│  │  │ Key: session:userId:fcmToken                       │ │  │
│  │  │ TTL: 7 days                                        │ │  │
│  │  │                                                     │ │  │
│  │  │ Benefit: 10x faster than MongoDB queries           │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Use Case 2: OTP Caching                                 │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ Generate OTP                                       │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ Store in Redis (fast access)                       │ │  │
│  │  │ Key: otp:email:type                                │ │  │
│  │  │ TTL: 10 minutes                                    │ │  │
│  │  │                                                     │ │  │
│  │  │ Benefit: Instant verification                      │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Use Case 3: Token Blacklist                             │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ User Logout                                        │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ Add token to blacklist                             │ │  │
│  │  │ Key: blacklist:token                               │ │  │
│  │  │ TTL: Until token expires                           │ │  │
│  │  │                                                     │ │  │
│  │  │ Benefit: Fast revocation check                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Use Case 4: Rate Limiting                               │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ API Request                                        │ │  │
│  │  │   ↓                                                 │ │  │
│  │  │ Check rate limit counter                           │ │  │
│  │  │ Key: ratelimit:type:identifier                     │ │  │
│  │  │ Algorithm: Sliding window                          │ │  │
│  │  │                                                     │ │  │
│  │  │ Benefit: Distributed rate limiting                 │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Why Redis?

### **The Performance Problem:**

```
Without Redis (MongoDB Only):
┌─────────────────────────────────────────────────┐
│  Every API Request:                             │
│                                                 │
│  1. Query MongoDB for user data                 │
│     → ~50ms average                             │
│                                                 │
│  2. Query MongoDB for token validation          │
│     → ~30ms average                             │
│                                                 │
│  3. Query MongoDB for session data              │
│     → ~40ms average                             │
│                                                 │
│  Total per request: ~120ms                      │
│                                                 │
│  For 100K users × 10 requests/day:              │
│  = 1,000,000 queries/day                        │
│  = High database load                           │
│  = Slow response times                          │
└─────────────────────────────────────────────────┘

With Redis (Caching Layer):
┌─────────────────────────────────────────────────┐
│  First Request:                                 │
│  1. Query MongoDB (cache miss)                  │
│     → ~50ms                                     │
│  2. Cache in Redis                              │
│     → ~1ms                                      │
│                                                 │
│  Subsequent Requests:                           │
│  1. Read from Redis (cache hit)                 │
│     → ~1ms                                      │
│                                                 │
│  Total per request: ~1ms (after first)          │
│                                                 │
│  For 100K users × 10 requests/day:              │
│  = 100K MongoDB queries (first requests)        │
│  = 900K Redis queries (cached)                  │
│  = 90% reduction in DB load                     │
│  = 10x faster response times                    │
└─────────────────────────────────────────────────┘
```

### **Redis Advantages:**

1. **Lightning Fast**: ~1ms response time (vs 50ms for MongoDB)
2. **In-Memory**: Data stored in RAM (no disk I/O)
3. **Rich Data Structures**: Strings, Hashes, Lists, Sets, Sorted Sets
4. **Atomic Operations**: Thread-safe operations
5. **Pub/Sub**: Real-time messaging
6. **Persistence**: Optional disk persistence
7. **Clustering**: Horizontal scaling

### **When to Use Redis:**

```
✅ Good Use Cases:
• Session storage
• Token blacklist
• Rate limiting counters
• OTP storage
• Frequently accessed data
• Real-time analytics
• Leaderboards

❌ Bad Use Cases:
• Primary data storage
• Large files
• Data that never changes
• Complex queries
• Data durability critical
```

---

## 💾 Redis Data Structures

### **1. Strings (Most Common)**

```typescript
// Simple key-value storage
SET key value
GET key
DEL key

// With expiry (TTL)
SETEX key seconds value
SET key value EX seconds

// Example: Session caching
SET session:64f5a1b2c3d4e5f6g7h8i9j0:web '{"userId":"...","email":"..."}'
SETEX session:64f5a1b2c3d4e5f6g7h8i9j0:web 604800 '{"userId":"...","email":"..."}'
// TTL: 604800 seconds = 7 days
```

**Use Cases:**
- Session caching
- OTP storage
- Token blacklist
- Simple counters

---

### **2. Hashes (Object Storage)**

```typescript
// Store object fields
HSET key field value
HGET key field
HGETALL key
HDEL key field

// Example: User profile cache
HSET user:64f5a1b2c3d4e5f6g7h8i9j0 name "John Doe"
HSET user:64f5a1b2c3d4e5f6g7h8i9j0 email "john@example.com"
HSET user:64f5a1b2c3d4e5f6g7h8i9j0 role "user"

// Retrieve
HGETALL user:64f5a1b2c3d4e5f6g7h8i9j0
// Returns: { name: "John Doe", email: "john@example.com", role: "user" }
```

**Use Cases:**
- User profiles
- Partial object caching
- Field-level updates

---

### **3. Sorted Sets (Leaderboards, Rate Limiting)**

```typescript
// Add with score
ZADD key score member

// Get count
ZCARD key

// Remove by score range
ZREMRANGEBYSCORE key min max

// Example: Rate limiting (sliding window)
ZADD ratelimit:auth:ip:127.0.0.1 1678123456000 "1678123456000-0.123456"
ZADD ratelimit:auth:ip:127.0.0.1 1678123457000 "1678123457000-0.654321"

// Count requests in last 15 minutes
ZREMRANGEBYSCORE ratelimit:auth:ip:127.0.0.1 0 1678122556000  // Remove old
ZCARD ratelimit:auth:ip:127.0.0.1  // Count current
```

**Use Cases:**
- Rate limiting (sliding window)
- Leaderboards
- Priority queues
- Time-series data

---

### **4. Lists (Queues)**

```typescript
// Push to list
LPUSH key value
RPUSH key value

// Pop from list
LPOP key
RPOP key

// Example: Simple queue (not used in our system - we use BullMQ)
LPUSH email:queue "send-welcome-email"
RPOP email:queue
```

**Use Cases:**
- Simple queues
- Recent items
- Activity feeds

---

### **5. Sets (Unique Items)**

```typescript
// Add unique member
SADD key member

// Check membership
SISMEMBER key member

// Get all members
SMEMBERS key

// Example: Track active users
SADD active:users "64f5a1b2c3d4e5f6g7h8i9j0"
SISMEMBER active:users "64f5a1b2c3d4e5f6g7h8i9j0"
// Returns: 1 (true) or 0 (false)
```

**Use Cases:**
- Unique visitors
- Tags
- Access control lists

---

## 📦 Use Case 1: Session Caching

### **Implementation:**

**File**: `src/modules/auth/auth.service.ts`

```typescript
import { redisClient } from '../../helpers/redis/redis';
import { AUTH_SESSION_CONFIG } from './auth.constants';

const loginV2 = async (email: string, password: string, fcmToken?: string) => {
  // ... authentication logic ...
  
  // 🔴 REDIS SESSION CACHING
  try {
    // Step 1: Create session key
    const sessionKey = `session:${user._id}:${fcmToken || 'web'}`;
    
    // Step 2: Prepare session data
    const sessionData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fcmToken,
      deviceType: deviceInfo?.deviceType || 'web',
      deviceName: deviceInfo?.deviceName || 'Unknown Device',
      loginAt: new Date(),
    };
    
    // Step 3: Cache in Redis with 7 day TTL
    await redisClient.setEx(
      sessionKey,
      AUTH_SESSION_CONFIG.SESSION_TTL,  // 604800 seconds = 7 days
      JSON.stringify(sessionData)
    );
    
    logger.info(`Session cached for user ${user._id} (${sessionKey})`);
  } catch (error) {
    errorLogger.error('Failed to cache session:', error);
    // Don't throw - login should succeed even if caching fails
  }
  
  // ... return tokens ...
};
```

### **Session Key Structure:**

```
session:<userId>:<fcmToken>
│       │        │
│       │        └─ Device identifier (or 'web')
│       └─ User ID from MongoDB
└─ Namespace for sessions

Examples:
session:64f5a1b2c3d4e5f6g7h8i9j0:web
session:64f5a1b2c3d4e5f6g7h8i9j0:abc123fcm (iOS device)
session:64f5a1b2c3d4e5f6g7h8i9j0:xyz789fcm (Android device)
```

### **Session Data Structure:**

```json
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "email": "john@example.com",
  "role": "user",
  "fcmToken": "abc123...",
  "deviceType": "ios",
  "deviceName": "iPhone 14 Pro",
  "loginAt": "2026-03-22T12:00:00Z"
}
```

### **Session Usage in Middleware:**

```typescript
// In auth middleware
const auth = (...roles) => async (req, res, next) => {
  // Step 1: Verify JWT token
  const decoded = await TokenService.verifyToken(token, secret, TokenType.ACCESS);
  
  // Step 2: Try to get session from Redis (fast path)
  const sessionKey = `session:${decoded.userId}:${fcmToken}`;
  const cachedSession = await redisClient.get(sessionKey);
  
  if (cachedSession) {
    // Cache hit - use cached session
    const session = JSON.parse(cachedSession);
    req.user = session;
    req.session = session;
    logger.debug(`Session cache hit: ${sessionKey}`);
  } else {
    // Cache miss - query MongoDB (slow path)
    const user = await User.findById(decoded.userId);
    req.user = user;
    logger.debug(`Session cache miss: ${sessionKey}`);
  }
  
  next();
};
```

### **Session Invalidation:**

```typescript
// On logout
const logout = async (refreshToken, userId, fcmToken) => {
  // ... blacklist token ...
  
  // Remove session cache
  const sessionKey = `session:${userId}:${fcmToken}`;
  await redisClient.del(sessionKey);
  logger.info(`Session deleted: ${sessionKey}`);
  
  // Or logout from all devices
  if (logoutFromAllDevices) {
    const sessionPattern = `session:${userId}:*`;
    const keys = await redisClient.keys(sessionPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`All sessions deleted for user ${userId}`);
    }
  }
};

// On password change
const changePassword = async (userId, currentPassword, newPassword) => {
  // ... change password ...
  
  // Invalidate ALL sessions (security)
  const sessionPattern = `session:${userId}:*`;
  const keys = await redisClient.keys(sessionPattern);
  if (keys.length > 0) {
    await redisClient.del(keys);
    logger.info(`All sessions invalidated for user ${userId} after password change`);
  }
};
```

---

## 📦 Use Case 2: OTP Caching

### **Implementation:**

**File**: `src/modules/otp/otp.service.ts`

```typescript
import { redisClient } from '../../helpers/redis/redis';

const createVerificationEmailOtp = async (email: string) => {
  // Step 1: Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Step 2: Store in MongoDB (persistent)
  await OTP.create({
    email,
    otp,
    type: 'verify',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });
  
  // Step 3: 🔴 Cache in Redis (fast access)
  const otpKey = `otp:email:${email}:verify`;
  await redisClient.setEx(
    otpKey,
    600,  // 10 minutes (600 seconds)
    otp
  );
  
  logger.debug(`OTP cached: ${otpKey}`);
  
  // Step 4: Send email
  await emailQueue.add('send-verification-email', { email, otp });
  
  return otp;
};
```

### **OTP Key Structure:**

```
otp:email:<email>:<type>
│   │       │      │
│   │       │      └─ OTP type (verify, reset)
│   │       └─ User email
│   └─ Namespace for OTP
└─ Namespace for cache

Examples:
otp:email:john@example.com:verify
otp:email:john@example.com:reset
```

### **OTP Verification:**

```typescript
const verifyOTP = async (email: string, otp: string, type: OtpType) => {
  // Step 1: Try Redis first (fast)
  const otpKey = `otp:email:${email}:${type}`;
  const cachedOtp = await redisClient.get(otpKey);
  
  if (cachedOtp) {
    // Cache hit - verify immediately
    if (cachedOtp === otp) {
      // OTP matches - delete from cache
      await redisClient.del(otpKey);
      return true;
    } else {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
    }
  }
  
  // Step 2: Cache miss - query MongoDB (slow)
  const otpDoc = await OTP.findOne({
    email,
    otp,
    type,
    isUsed: false,
  });
  
  if (!otpDoc) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid or expired OTP');
  }
  
  // Check expiry
  if (otpDoc.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'OTP has expired');
  }
  
  // Mark as used and delete
  otpDoc.isUsed = true;
  await otpDoc.save();
  await OTP.deleteOne({ _id: otpDoc._id });
  
  return true;
};
```

---

## 📦 Use Case 3: Token Blacklist

### **Implementation:**

**File**: `src/modules/auth/auth.service.ts`

```typescript
const refreshAuth = async (refreshToken: string) => {
  try {
    // Step 1: 🔴 Check if token is blacklisted in Redis
    const blacklistKey = `blacklist:${refreshToken}`;
    const isBlacklisted = await redisClient.get(blacklistKey);
    
    if (isBlacklisted) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Refresh token has been revoked. Please login again.'
      );
    }
    
    // ... verify token and generate new tokens ...
    
    // Step 2: Blacklist old refresh token
    const oldTokenExpiry = tokenDoc.expiresAt.getTime() - Date.now();
    const oldTokenTTL = Math.max(0, Math.floor(oldTokenExpiry / 1000));
    
    if (oldTokenTTL > 0) {
      await redisClient.setEx(
        blacklistKey,
        Math.min(oldTokenTTL, AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL),
        'blacklisted'
      );
      logger.debug(`Token blacklisted: ${blacklistKey}`);
    }
    
    // ... return new tokens ...
  } catch (error) {
    // ... error handling ...
  }
};
```

### **Blacklist Key Structure:**

```
blacklist:<token>
│         │
│         └─ Full JWT token string
└─ Namespace for blacklist

Example:
blacklist:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGY1YTFiMmMzZDRlNWY2ZzdoOGk5ajAiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTY3ODEyMzQ1NiwiZXhwIjoxNjc4MTI0MzU2fQ.abc123...
```

### **Blacklist TTL:**

```typescript
// Calculate remaining token lifetime
const oldTokenExpiry = tokenDoc.expiresAt.getTime() - Date.now();
const oldTokenTTL = Math.max(0, Math.floor(oldTokenExpiry / 1000));

// Set blacklist TTL (min of remaining time and max TTL)
const blacklistTTL = Math.min(
  oldTokenTTL,
  AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL  // 24 hours
);

// Example:
// Token expires in 2 hours → Blacklist TTL = 2 hours
// Token expires in 7 days → Blacklist TTL = 24 hours (max)
```

---

## 📦 Use Case 4: Rate Limiting (Sliding Window)

### **Implementation:**

**File**: `src/middlewares/rateLimiterRedis.ts`

```typescript
import { redisClient } from '../helpers/redis/redis';

/**
 * Check rate limit using Redis sorted set (sliding window)
 */
async function checkRateLimit(
  key: string,
  windowMs: number,
  max: number,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  try {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Use Redis pipeline for atomic operations
    const pipeline = redisClient.multi();
    
    // Step 1: Remove old entries outside the window
    pipeline.zRemRangeByScore(key, '0', String(windowStart));
    
    // Step 2: Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
    
    // Step 3: Set expiry on the key
    pipeline.expireAt(key, Math.ceil((now + windowMs) / 1000));
    
    // Step 4: Count requests in current window
    pipeline.zCard(key);
    
    // Execute pipeline
    const results = await pipeline.exec();
    
    // Get the count (last result)
    const count = (results?.[3] as number) || 0;
    const remaining = Math.max(0, max - count);
    const reset = Math.ceil((now + windowMs) / 1000);
    
    return {
      success: count <= max,
      remaining,
      reset,
      total: max,
    };
  } catch (error) {
    errorLogger.error('Redis rate limit check failed:', error);
    // Fail open - allow request if Redis is down
    return {
      success: true,
      remaining: max,
      reset: Math.ceil((Date.now() + windowMs) / 1000),
      total: max,
    };
  }
}
```

### **Sliding Window Algorithm:**

```
Time: 0min    5min    10min   15min
      │       │       │       │
      ├───────┴───────┴───────┤
      ←   Sliding Window      →

Request at 12:00:00
  ZADD ratelimit:auth:ip:127.0.0.1 1678123200000 "1678123200000-0.123"
  ZREMRANGEBYSCORE ratelimit:auth:ip:127.0.0.1 0 1678122300000  (remove >15min old)
  ZCARD ratelimit:auth:ip:127.0.0.1  (count: 1)
  → Allowed (1/5)

Request at 12:01:00
  ZADD ratelimit:auth:ip:127.0.0.1 1678123260000 "1678123260000-0.456"
  ZREMRANGEBYSCORE ratelimit:auth:ip:127.0.0.1 0 1678122360000
  ZCARD ratelimit:auth:ip:127.0.0.1  (count: 2)
  → Allowed (2/5)

...

Request at 12:05:00 (6th attempt)
  ZADD ratelimit:auth:ip:127.0.0.1 1678123500000 "1678123500000-0.789"
  ZREMRANGEBYSCORE ratelimit:auth:ip:127.0.0.1 0 1678122600000
  ZCARD ratelimit:auth:ip:127.0.0.1  (count: 6)
  → BLOCKED (6/5 exceeded)
```

### **Rate Limit Key Structure:**

```
ratelimit:<type>:<identifier>
│         │     │
│         │     └─ User ID or IP address
│         └─ Rate limit type (auth, api, strict)
└─ Namespace for rate limiting

Examples:
ratelimit:auth:ip:127.0.0.1
ratelimit:auth:user:64f5a1b2c3d4e5f6g7h8i9j0
ratelimit:api:user:64f5a1b2c3d4e5f6g7h8i9j0
ratelimit:strict:ip:192.168.1.1
```

---

## 🔄 Cache Invalidation Strategies

### **Strategy 1: Time-Based (TTL)**

```typescript
// Set with automatic expiry
await redisClient.setEx(key, seconds, value);

// Examples:
await redisClient.setEx('session:userId:web', 604800, sessionData);  // 7 days
await redisClient.setEx('otp:email:verify', 600, otp);  // 10 minutes
await redisClient.setEx('blacklist:token', 3600, 'blacklisted');  // 1 hour
```

**When to Use:**
- Sessions (7 days)
- OTP (10 minutes)
- Token blacklist (until token expires)
- Temporary data

---

### **Strategy 2: Manual Invalidation**

```typescript
// Delete specific key
await redisClient.del('session:userId:web');

// Delete multiple keys (pattern)
const keys = await redisClient.keys('session:userId:*');
if (keys.length > 0) {
  await redisClient.del(keys);
}
```

**When to Use:**
- Logout (delete session)
- Password change (invalidate all sessions)
- User data update (invalidate cached data)

---

### **Strategy 3: Cache-Aside (Lazy Loading)**

```typescript
const getUserProfile = async (userId: string) => {
  // Step 1: Try cache
  const cacheKey = `user:${userId}:profile`;
  const cached = await redisClient.get(cacheKey);
  
  if (cached) {
    logger.debug(`Cache hit: ${cacheKey}`);
    return JSON.parse(cached);
  }
  
  // Step 2: Cache miss - query database
  logger.debug(`Cache miss: ${cacheKey}`);
  const user = await User.findById(userId).lean();
  
  // Step 3: Write to cache
  await redisClient.setEx(
    cacheKey,
    300,  // 5 minutes
    JSON.stringify(user)
  );
  
  return user;
};
```

**When to Use:**
- Frequently accessed data
- User profiles
- Configuration data

---

### **Strategy 4: Write-Through**

```typescript
const updateUserProfile = async (userId: string, data: any) => {
  // Step 1: Update database
  const user = await User.findByIdAndUpdate(userId, data, { new: true });
  
  // Step 2: Update cache
  const cacheKey = `user:${userId}:profile`;
  await redisClient.setEx(
    cacheKey,
    300,  // 5 minutes
    JSON.stringify(user)
  );
  
  return user;
};
```

**When to Use:**
- Frequently updated data
- Ensure cache consistency
- Critical data accuracy

---

## 🧪 Testing Redis

### **Test 1: Check Redis Connection**

```bash
redis-cli ping
# Expected: PONG
```

### **Test 2: Check Sessions**

```bash
redis-cli

# List all sessions
KEYS session:*

# Get specific session
GET session:64f5a1b2c3d4e5f6g7h8i9j0:web

# Check TTL
TTL session:64f5a1b2c3d4e5f6g7h8i9j0:web
# Expected: ~604800 (7 days)

# Delete session
DEL session:64f5a1b2c3d4e5f6g7h8i9j0:web
```

### **Test 3: Check OTP**

```bash
redis-cli

# Get OTP
GET otp:email:john@example.com:verify

# Check TTL
TTL otp:email:john@example.com:verify
# Expected: ~600 (10 minutes)
```

### **Test 4: Check Blacklist**

```bash
redis-cli

# List blacklisted tokens
KEYS blacklist:*

# Check if token is blacklisted
GET blacklist:eyJhbGciOiJIUzI1NiIs...

# Check TTL
TTL blacklist:eyJhbGciOiJIUzI1NiIs...
```

### **Test 5: Check Rate Limiting**

```bash
redis-cli

# List rate limit counters
KEYS ratelimit:*

# Get rate limit data
ZCARD ratelimit:auth:ip:127.0.0.1

# Get all entries
ZRANGE ratelimit:auth:ip:127.0.0.1 0 -1
```

### **Test 6: Monitor Redis Commands**

```bash
redis-cli MONITOR

# You'll see all commands in real-time:
# 1678123456.123 [0 127.0.0.1:12345] "SET" "session:userId:web" "..."
# 1678123456.456 [0 127.0.0.1:12345] "GET" "otp:email:verify"
# 1678123456.789 [0 127.0.0.1:12345] "DEL" "session:userId:web"
```

---

## 📊 Performance Benchmarks

### **Response Time Comparison:**

```
┌─────────────────────────────────────────────────┐
│  Operation              │  MongoDB  │  Redis   │
├─────────────────────────────────────────────────┤
│  Read (simple)          │  ~50ms    │  ~1ms    │
│  Write (simple)         │  ~60ms    │  ~1ms    │
│  Read (with query)      │  ~100ms   │  ~1ms    │
│  Delete                 │  ~40ms    │  ~1ms    │
│  Count                  │  ~80ms    │  ~1ms    │
└─────────────────────────────────────────────────┘

Performance Improvement: 40x - 100x faster with Redis
```

### **Memory Usage:**

```
Session Data: ~500 bytes per session
OTP: ~200 bytes per OTP
Blacklist Entry: ~100 bytes per token
Rate Limit Counter: ~100 bytes per IP/user

For 100K concurrent users:
Sessions: 100K × 500B = 50 MB
OTPs: 10K × 200B = 2 MB
Blacklist: 100K × 100B = 10 MB
Rate Limits: 100K × 100B = 10 MB

Total: ~72 MB
Recommended Redis Memory: 256 MB - 1 GB
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Why Redis**: 40-100x faster than MongoDB
2. ✅ **Data Structures**: Strings, Hashes, Sorted Sets, Lists, Sets
3. ✅ **Session Caching**: 7 days TTL, key structure
4. ✅ **OTP Caching**: 10 minutes TTL, fast verification
5. ✅ **Token Blacklist**: Invalidate tokens on logout
6. ✅ **Rate Limiting**: Sliding window with sorted sets
7. ✅ **Cache Invalidation**: TTL, manual, cache-aside, write-through
8. ✅ **Testing**: redis-cli commands, monitoring
9. ✅ **Performance**: Benchmarks, memory usage
10. ✅ **Best Practices**: Key naming, TTL strategies

### **Key Files:**

| File | Purpose |
|------|---------|
| `auth.service.ts` | Session caching, token blacklist |
| `otp.service.ts` | OTP caching |
| `rateLimiterRedis.ts` | Rate limiting |
| `redis.ts` | Redis client configuration |

### **Redis Key Patterns:**

```
session:<userId>:<fcmToken>         → Session data (7 days)
otp:email:<email>:<type>            → OTP (10 minutes)
blacklist:<token>                   → Blacklisted token (until expiry)
ratelimit:<type>:<identifier>       → Rate limit counter (sliding window)
user:<userId>:profile               → User profile cache (5 minutes)
```

### **Next Chapter:**

→ [Chapter 6: Password Management](./LEARN_AUTH_06_PASSWORD_MANAGEMENT.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
