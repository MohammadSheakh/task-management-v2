# 🏗️ **SYSTEM DESIGN FOR NODE.JS DEVELOPERS**

**Level**: Mid to Senior (2-5+ years)  
**Focus**: Practical System Design + Node.js Implementation  
**Time**: 4-6 Weeks  
- [LastRead](#lastRead)
---

## 📋 **WHY SYSTEM DESIGN MATTERS FOR NODE.JS**

```
┌─────────────────────────────────────────────────────────────────┐
│              REAL-WORLD NODE.JS SYSTEM DESIGN                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📦 You'll design:                                               │
│     • REST/GraphQL APIs that scale to millions of requests      │ 
│     • Real-time applications (chat, notifications, live updates)│ 
│     • Microservices architecture                                │
│     • Caching layers for performance                            │
│     • Database sharding strategies                              │
│     • Message queue systems                                     │
│     • Load balancing configurations                             │
│                                                                  │
│  🎯 Interview Questions:                                         │
│     • "Design Twitter's feed system"                            │
│     • "Design a URL shortener like bit.ly"                      │
│     • "Design a real-time chat application"                     │
│     • "Design a rate limiter for our API"                       │
│     • "How would you scale our Node.js backend?"                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 **COMPLETE CURRICULUM**

### **Phase 1: Fundamentals (Week 1-2)**
- Scalability concepts
- Load balancing
- Caching strategies
- Database design

### **Phase 2: Core Components (Week 3-4)**
- Message queues
- Rate limiting
- Real-time systems
- Microservices

### **Phase 3: Advanced Topics (Week 5-6)**
- Distributed systems
- Consistency patterns
- Monitoring & observability
- Production deployment

---

## 🏗️ **MODULE 1: SCALABILITY FUNDAMENTALS**

### **1.1 Vertical vs Horizontal Scaling**

```javascript
// ─────────────────────────────────────────────
// VERTICAL SCALING (Scale Up)
// ─────────────────────────────────────────────
/*
Add more resources to existing server:
- More CPU cores
- More RAM
- Faster storage (SSD → NVMe)

PROS:
✅ Simple to implement
✅ No code changes needed
✅ No distributed system complexity

CONS:
❌ Single point of failure
❌ Limited by hardware
❌ Expensive at scale
❌ Downtime for upgrades

NODE.JS CONSIDERATION:
- Node.js is single-threaded
- More CPU cores help with cluster mode
- More RAM helps with caching

EXAMPLE:
- t3.medium (2 vCPU, 4GB) → t3.xlarge (4 vCPU, 16GB)
*/

// ─────────────────────────────────────────────
// HORIZONTAL SCALING (Scale Out)
// ─────────────────────────────────────────────
/*
Add more servers:
- Multiple Node.js instances
- Load balancer distributes traffic
- Shared database/cache

PROS:
✅ No single point of failure
✅ Unlimited scaling potential
✅ Cheaper (commodity hardware)
✅ Zero-downtime deployments

CONS:
❌ More complex architecture
❌ Need load balancer
❌ Distributed system challenges
❌ Data consistency issues

NODE.JS IMPLEMENTATION:
*/

// docker-compose.yml for horizontal scaling
const dockerCompose = `
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - app1
      - app2
      - app3
  
  app1:
    build: .
    environment:
      - PORT=3000
      - NODE_ENV=production
  
  app2:
    build: .
    environment:
      - PORT=3000
      - NODE_ENV=production
  
  app3:
    build: .
    environment:
      - PORT=3000
      - NODE_ENV=production
  
  redis:
    image: redis:alpine
  
  mongo:
    image: mongo:latest
`;

// ─────────────────────────────────────────────
// WHEN TO SCALE
// ─────────────────────────────────────────────
const scalingMetrics = {
  // Scale when you hit these thresholds:
  cpu: '70% average over 5 minutes',
  memory: '80% usage',
  responseTime: 'P95 > 500ms',
  errorRate: '> 1% errors',
  queueLength: '> 1000 pending requests',
  
  // Monitor these in production:
  monitoring: [
    'CPU utilization per instance',
    'Memory usage (heap, RSS)',
    'Event loop lag',
    'Active connections',
    'Request rate (RPS)',
    'Error rate',
    'Database query time',
    'Cache hit rate',
  ],
};

// Node.js monitoring example
const monitor = {
  checkMetrics() {
    const usage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    console.log({
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      cpuUser: cpuUsage.user,
      cpuSystem: cpuUsage.system,
    });
    
    // Alert if memory > 80%
    const maxMemory = 512 * 1024 * 1024; // 512MB limit
    if (usage.heapUsed / maxMemory > 0.8) {
      console.warn('⚠️ Memory usage above 80%!');
      // Trigger scaling or garbage collection
    }
  },
};

setInterval(() => monitor.checkMetrics(), 5000);
```

---

### **1.2 Load Balancing**

```javascript
// ─────────────────────────────────────────────
// LOAD BALANCER TYPES
// ─────────────────────────────────────────────

/*
1. LAYER 4 (Transport Layer)
   - Routes based on IP + Port
   - Faster, less intelligent
   - Examples: HAProxy, Nginx (TCP mode)

2. LAYER 7 (Application Layer)
   - Routes based on URL, headers, cookies
   - Slower, more intelligent
   - Examples: Nginx, Express middleware
*/

// ─────────────────────────────────────────────
// NGINX LOAD BALANCER CONFIG
// ─────────────────────────────────────────────
const nginxConfig = `
# /etc/nginx/nginx.conf

http {
    upstream nodejs_app {
        # Round Robin (default)
        server app1:3000;
        server app2:3000;
        server app3:3000;
        
        # OR: Least Connections
        # least_conn;
        # server app1:3000;
        # server app2:3000;
        
        # OR: IP Hash (sticky sessions)
        # ip_hash;
        # server app1:3000;
        # server app2:3000;
    }
    
    server {
        listen 80;
        
        location / {
            proxy_pass http://nodejs_app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_cache_bypass $http_upgrade;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Health check endpoint
        location /health {
            proxy_pass http://nodejs_app/health;
        }
    }
}
`;

// ─────────────────────────────────────────────
// CUSTOM LOAD BALANCER IN NODE.JS
// ─────────────────────────────────────────────
const http = require('http');
const httpProxy = require('http-proxy');

class LoadBalancer {
  constructor(servers) {
    this.servers = servers;
    this.current = 0;
    this.proxy = httpProxy.createProxyServer();
  }
  
  // Round Robin
  getNextServer() {
    const server = this.servers[this.current];
    this.current = (this.current + 1) % this.servers.length;
    return server;
  }
  
  // Least Connections
  getLeastConnectedServer() {
    return this.servers.reduce((least, server) => 
      server.connections < least.connections ? server : least
    );
  }
  
  handleRequest(req, res) {
    const server = this.getNextServer();
    server.connections++;
    
    console.log(`Routing to ${server.url} (connections: ${server.connections})`);
    
    this.proxy.web(req, res, {
      target: server.url,
    }, (err) => {
      server.connections--;
      res.writeHead(500);
      res.end('Proxy error');
    });
    
    // Decrement on response
    res.on('finish', () => {
      server.connections--;
    });
  }
}

// Usage
const servers = [
  { url: 'http://localhost:3001', connections: 0 },
  { url: 'http://localhost:3002', connections: 0 },
  { url: 'http://localhost:3003', connections: 0 },
];

const lb = new LoadBalancer(servers);

http.createServer((req, res) => {
  lb.handleRequest(req, res);
}).listen(8080, () => {
  console.log('Load balancer running on port 8080');
});

// ─────────────────────────────────────────────
// STICKY SESSIONS (Session Affinity)
// ─────────────────────────────────────────────
/*
Why needed:
- In-memory session storage
- WebSocket connections
- Real-time features

Implementation:
1. Cookie-based (client stores server ID)
2. IP-based (same IP → same server)
3. Token-based (JWT contains server info)
*/

const stickySessionMiddleware = (req, res, next) => {
  const sessionId = req.cookies.server_id;
  
  if (sessionId) {
    // Route to specific server
    req.targetServer = servers.find(s => s.id === sessionId);
  }
  
  if (!req.targetServer) {
    // Assign new server
    req.targetServer = servers[0];
    res.cookie('server_id', req.targetServer.id);
  }
  
  next();
};
```

---

## 🏗️ **MODULE 2: CACHING STRATEGIES**

### **2.1 Caching Layers**

```javascript
// ─────────────────────────────────────────────
// CACHE HIERARCHY
// ─────────────────────────────────────────────
/*
┌─────────────────────────────────────────┐
│  Browser Cache (5 min - 1 year)         │
│  - Static assets                        │
│  - API responses (Cache-Control)        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  CDN Cache (1 min - 1 day)              │
│  - Static files                         │
│  - Images, videos                       │
│  - API responses                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Application Cache (Redis/Memcached)    │
│  - Database query results               │
│  - Session data                         │
│  - Computed values                      │
│  TTL: 1 min - 24 hours                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Database                               │
│  - Persistent storage                   │
│  - Source of truth                      │
└─────────────────────────────────────────┘
*/

// ─────────────────────────────────────────────
// REDIS CACHING IMPLEMENTATION
// ─────────────────────────────────────────────
const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      maxRetriesPerRequest: 3,
      retryDelayOnFailures: 100,
    });
    
    // Default TTL
    this.DEFAULT_TTL = 300; // 5 minutes
  }
  
  // Generate cache key
  getKey(prefix, ...args) {
    return `${prefix}:${args.join(':')}`;
  }
  
  // Get from cache
  async get(key) {
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
  
  // Set cache
  async set(key, value, ttl = this.DEFAULT_TTL) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }
  
  // Delete from cache
  async delete(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }
  
  // Cache-aside pattern (most common)
  async getOrSet(key, fetcher, ttl = this.DEFAULT_TTL) {
    // Try cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return { data: cached, fromCache: true };
    }
    
    // Cache miss - fetch from source
    const data = await fetcher();
    
    // Store in cache
    await this.set(key, data, ttl);
    
    return { data, fromCache: false };
  }
  
  // Invalidate pattern-based keys
  async invalidatePattern(pattern) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    return keys.length;
  }
}

// Usage in Express
const cache = new CacheService();

app.get('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = cache.getKey('user', id);
  
  const { data, fromCache } = await cache.getOrSet(
    cacheKey,
    async () => {
      // Fetch from database
      return await db.users.findById(id);
    },
    300 // 5 minutes TTL
  );
  
  res.json({
    success: true,
    data,
    meta: {
      fromCache,
      cachedAt: fromCache ? new Date() : null,
    },
  });
});

// ─────────────────────────────────────────────
// WRITE-THROUGH CACHE
// ─────────────────────────────────────────────
class WriteThroughCache extends CacheService {
  async write(key, value, writer, ttl = this.DEFAULT_TTL) {
    // Write to database
    const result = await writer();
    
    // Update cache
    await this.set(key, result, ttl);
    
    return result;
  }
}

// Usage
app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const cacheKey = cache.getKey('user', id);
  
  const result = await cache.write(
    cacheKey,
    req.body,
    async () => {
      // Update database
      return await db.users.findByIdAndUpdate(id, req.body, { new: true });
    },
    300
  );
  
  res.json({ success: true, data: result });
});

// ─────────────────────────────────────────────
// WRITE-BEHIND CACHE (Async)
// ─────────────────────────────────────────────
class WriteBehindCache extends CacheService {
  constructor() {
    super();
    this.writeQueue = [];
    this.processing = false;
  }
  
  async write(key, value, writer, delay = 5000) {
    // Update cache immediately
    await this.set(key, value);
    
    // Queue database write
    this.writeQueue.push({ key, value, writer, delay });
    
    // Process queue
    this.processQueue();
    
    return value;
  }
  
  async processQueue() {
    if (this.processing || this.writeQueue.length === 0) return;
    
    this.processing = true;
    
    while (this.writeQueue.length > 0) {
      const item = this.writeQueue.shift();
      
      // Wait for delay
      await new Promise(resolve => setTimeout(resolve, item.delay));
      
      // Write to database
      try {
        await item.writer();
      } catch (error) {
        console.error('Write-behind failed:', error);
        // Re-queue or handle error
      }
    }
    
    this.processing = false;
  }
}
```

### **2.2 Cache Invalidation Strategies**

```javascript
// ─────────────────────────────────────────────
// INVALIDATION PATTERNS
// ─────────────────────────────────────────────

/*
1. TTL-BASED (Time-To-Live)
   - Cache expires after fixed time
   - Simple, but data might be stale
   
2. EVENT-BASED
   - Invalidate on data change
   - More complex, but fresh data
   
3. TAG-BASED
   - Group related cache entries
   - Invalidate by tag
   
4. DEPENDENCY-BASED
   - Track cache dependencies
   - Invalidate cascade
*/

// Tag-based invalidation implementation
class TaggedCache extends CacheService {
  async setWithTags(key, value, tags, ttl = this.DEFAULT_TTL) {
    // Set the value
    await this.set(key, value, ttl);
    
    // Add key to each tag's set
    for (const tag of tags) {
      await this.redis.sadd(`tag:${tag}`, key);
      await this.redis.expire(`tag:${tag}`, ttl);
    }
  }
  
  async invalidateByTag(tag) {
    // Get all keys with this tag
    const keys = await this.redis.smembers(`tag:${tag}`);
    
    if (keys.length > 0) {
      // Delete all keys
      await this.redis.del(...keys);
      // Delete tag set
      await this.redis.del(`tag:${tag}`);
    }
    
    return keys.length;
  }
}

// Usage
const taggedCache = new TaggedCache();

// Cache user data with tags
await taggedCache.setWithTags(
  'user:123',
  userData,
  ['user:123', 'users:list', 'admin:users'],
  300
);

// Invalidate all user:123 related cache
await taggedCache.invalidateByTag('user:123');

// Invalidate all user list cache
await taggedCache.invalidateByTag('users:list');
```

---

## 🏗️ **MODULE 3: RATE LIMITING**

### **3.1 Rate Limiting Algorithms**

```javascript
// ─────────────────────────────────────────────
// 1. FIXED WINDOW COUNTER
// ─────────────────────────────────────────────
/*
Divide time into fixed windows, count requests per window.

PROS:
✅ Simple to implement
✅ Memory efficient

CONS:
❌ Burst at window boundaries
❌ Not smooth limiting
*/

class FixedWindowRateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // key → { count, resetTime }
  }
  
  isAllowed(key) {
    const now = Date.now();
    const record = this.requests.get(key);
    
    if (!record || now > record.resetTime) {
      // New window
      this.requests.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }
    
    if (record.count >= this.maxRequests) {
      return false;
    }
    
    record.count++;
    return true;
  }
}

// Usage
const limiter = new FixedWindowRateLimiter(100, 60000); // 100 req/min

app.use((req, res, next) => {
  const key = req.ip;
  
  if (!limiter.isAllowed(key)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((limiter.requests.get(key).resetTime - Date.now()) / 1000),
    });
  }
  
  next();
});

// ─────────────────────────────────────────────
// 2. SLIDING WINDOW LOG
// ─────────────────────────────────────────────
/*
Keep timestamp of each request, remove old ones.

PROS:
✅ No burst at boundaries
✅ Accurate limiting

CONS:
❌ Memory intensive
❌ Slower for high traffic
*/

class SlidingWindowLogRateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map(); // key → [timestamps]
  }
  
  isAllowed(key) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps
    timestamps = timestamps.filter(ts => ts > windowStart);
    
    if (timestamps.length >= this.maxRequests) {
      return false;
    }
    
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    return true;
  }
}

// ─────────────────────────────────────────────
// 3. SLIDING WINDOW COUNTER (Redis-based)
// ─────────────────────────────────────────────
/*
Hybrid approach: weighted average of current + previous window.

PROS:
✅ No burst at boundaries
✅ Memory efficient
✅ Works in distributed systems

CONS:
❌ More complex
❌ Slight approximation
*/

const slidingWindowCounter = `
-- Lua script for Redis (atomic operation)
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local windowStart = now - windowMs
local currentWindowStart = math.floor(now / windowMs) * windowMs
local previousWindowStart = currentWindowStart - windowMs

-- Get counts for current and previous windows
local currentKey = key .. ':' .. currentWindowStart
local previousKey = key .. ':' .. previousWindowStart

local currentCount = tonumber(redis.call('GET', currentKey) or '0')
local previousCount = tonumber(redis.call('GET', previousKey) or '0')

-- Calculate weighted count
local windowPosition = (now - currentWindowStart) / windowMs
local weightedCount = (previousCount * (1 - windowPosition)) + currentCount

if weightedCount >= maxRequests then
  return 0
end

-- Increment current window
redis.call('INCR', currentKey)
redis.call('EXPIRE', currentKey, math.ceil(windowMs / 1000) * 2)

return 1
`;

// Node.js implementation with Redis
class RedisSlidingWindowRateLimiter {
  constructor(redisClient, maxRequests, windowMs) {
    this.redis = redisClient;
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    
    // Load Lua script
    this.script = slidingWindowCounter;
  }
  
  async isAllowed(key) {
    const now = Date.now();
    
    const result = await this.redis.eval(
      this.script,
      1, // Number of keys
      `ratelimit:${key}`,
      this.windowMs.toString(),
      this.maxRequests.toString(),
      now.toString(),
    );
    
    return result === 1;
  }
}

// ─────────────────────────────────────────────
// 4. TOKEN BUCKET
// ─────────────────────────────────────────────
/*
Tokens added at fixed rate, each request consumes token.

PROS:
✅ Allows bursting
✅ Smooth limiting
✅ Good for APIs

CONS:
❌ More state to maintain
*/

class TokenBucketRateLimiter {
  constructor(capacity, refillRate) {
    this.capacity = capacity;      // Max tokens
    this.refillRate = refillRate;  // Tokens per second
    this.buckets = new Map();      // key → { tokens, lastRefill }
  }
  
  refill(bucket) {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }
  
  isAllowed(key, tokensNeeded = 1) {
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefill: Date.now() };
      this.buckets.set(key, bucket);
    }
    
    this.refill(bucket);
    
    if (bucket.tokens >= tokensNeeded) {
      bucket.tokens -= tokensNeeded;
      return true;
    }
    
    return false;
  }
  
  getRemainingTokens(key) {
    const bucket = this.buckets.get(key);
    if (!bucket) return this.capacity;
    this.refill(bucket);
    return Math.floor(bucket.tokens);
  }
}

// Usage
const tokenBucket = new TokenBucketRateLimiter(100, 10); // 100 tokens, 10/sec refill

app.use((req, res, next) => {
  const key = req.ip;
  
  if (!tokenBucket.isAllowed(key)) {
    res.set('X-RateLimit-Remaining', tokenBucket.getRemainingTokens(key));
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }
  
  res.set('X-RateLimit-Remaining', tokenBucket.getRemainingTokens(key));
  next();
});

// ─────────────────────────────────────────────
// 5. LEAKY BUCKET
// ─────────────────────────────────────────────
/*
Requests flow in, processed at fixed rate.

PROS:
✅ Smooth output rate
✅ Good for downstream protection

CONS:
❌ Can delay requests
❌ Not good for real-time
*/

class LeakyBucketRateLimiter {
  constructor(capacity, leakRate) {
    this.capacity = capacity;    // Max queue size
    this.leakRate = leakRate;    // Requests per second
    this.buckets = new Map();    // key → { water, lastLeak }
  }
  
  leak(bucket) {
    const now = Date.now();
    const elapsed = (now - bucket.lastLeak) / 1000;
    const leaked = elapsed * this.leakRate;
    
    bucket.water = Math.max(0, bucket.water - leaked);
    bucket.lastLeak = now;
  }
  
  isAllowed(key) {
    let bucket = this.buckets.get(key);
    
    if (!bucket) {
      bucket = { water: 0, lastLeak: Date.now() };
      this.buckets.set(key, bucket);
    }
    
    this.leak(bucket);
    
    if (bucket.water < this.capacity) {
      bucket.water++;
      return true;
    }
    
    return false;
  }
}
```

### **3.2 Production Rate Limiter**

```javascript
// ─────────────────────────────────────────────
// EXPRESS RATE LIMITER MIDDLEWARE
// ─────────────────────────────────────────────
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Basic rate limiter
const basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests',
    retryAfter: Math.ceil((15 * 60 * 1000) / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Redis-backed rate limiter (for distributed systems)
const redisLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req) => {
    return req.ip; // Or req.user.id for authenticated users
  },
  message: {
    error: 'Rate limit exceeded',
    retryAfter: 60,
  },
});

// Different limits for different routes
app.use('/api/', basicLimiter);
app.use('/api/auth/', redisLimiter); // Stricter for auth

// Tiered rate limiting
const createTieredLimiter = (tiers) => {
  return (req, res, next) => {
    // Determine user tier
    const tier = getUserTier(req); // 'free', 'pro', 'enterprise'
    const config = tiers[tier] || tiers.free;
    
    const limiter = rateLimit({
      windowMs: config.windowMs,
      max: config.max,
    });
    
    limiter(req, res, next);
  };
};

const tieredLimiter = createTieredLimiter({
  free: { windowMs: 60000, max: 10 },
  pro: { windowMs: 60000, max: 100 },
  enterprise: { windowMs: 60000, max: 1000 },
});
```

---

## 🏗️ **MODULE 4: MESSAGE QUEUES**

### **4.1 Why Message Queues?**

```javascript
// ─────────────────────────────────────────────
// USE CASES
// ─────────────────────────────────────────────
/*
1. ASYNC PROCESSING
   - Email sending
   - Image/video processing
   - Report generation
   
2. DECOUPLING SERVICES
   - Microservices communication
   - Event-driven architecture
   
3. LOAD LEVELING
   - Handle traffic spikes
   - Backpressure management
   
4. DELAYED TASKS
   - Scheduled emails
   - Reminder notifications
   
5. RELIABILITY
   - Retry failed operations
   - Dead letter queues
*/

// ─────────────────────────────────────────────
// BULLMQ IMPLEMENTATION
// ─────────────────────────────────────────────
const { Queue, Worker } = require('bullmq');

// Create queue
const emailQueue = new Queue('emails', {
  connection: {
    host: 'localhost',
    port: 6379,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  },
});

// Add job to queue
async function sendWelcomeEmail(userEmail, userName) {
  await emailQueue.add('welcome', {
    email: userEmail,
    name: userName,
  }, {
    delay: 5000, // Send after 5 seconds
    jobId: `welcome-${userEmail}`, // Unique job ID
  });
}

// Worker to process jobs
const worker = new Worker('emails', async (job) => {
  console.log(`Processing job: ${job.id}`);
  
  switch (job.name) {
    case 'welcome':
      await sendEmail({
        to: job.data.email,
        subject: 'Welcome!',
        body: `Hello ${job.data.name}, welcome to our platform!`,
      });
      break;
      
    case 'notification':
      await sendPushNotification(job.data);
      break;
      
    case 'report':
      await generateReport(job.data);
      break;
  }
  
  return { success: true };
}, {
  connection: {
    host: 'localhost',
    port: 6379,
  },
  concurrency: 5, // Process 5 jobs concurrently
});

// Event handlers
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job.id} failed:`, err);
});

// Usage in Express route
app.post('/api/register', async (req, res) => {
  const user = await createUser(req.body);
  
  // Queue email instead of waiting
  await sendWelcomeEmail(user.email, user.name);
  
  res.json({ success: true, user });
  // Response sent immediately, email sent async
});
```

### **4.2 Priority Queues**

```javascript
// ─────────────────────────────────────────────
// PRIORITY-BASED PROCESSING
// ─────────────────────────────────────────────
const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
});

// Add jobs with priority (1-10, 1 = highest)
async function sendNotification(type, data, priority = 5) {
  await notificationQueue.add(type, data, {
    priority,
    attempts: 3,
  });
}

// High priority (1)
await sendNotification('password-reset', { email }, 1);
await sendNotification('two-factor', { phone }, 1);

// Medium priority (5)
await sendNotification('welcome', { email }, 5);
await sendNotification('order-confirmed', { orderId }, 5);

// Low priority (10)
await sendNotification('newsletter', { email }, 10);
await sendNotification('promotion', { email }, 10);
```

---

## 🏗️ **MODULE 5: REAL-TIME SYSTEMS**

### **5.1 WebSocket Architecture**

```javascript
// ─────────────────────────────────────────────
// SOCKET.IO IMPLEMENTATION
// ─────────────────────────────────────────────
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// Redis pub/sub for scaling
const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

// Create Socket.IO server
const io = new Server(httpServer, {
  adapter: createAdapter(pubClient, subClient),
  cors: {
    origin: process.env.FRONTEND_URL,
  },
});

// Middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const user = verifyToken(token);
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);
  
  // Join user-specific room
  socket.join(`user:${socket.user.id}`);
  
  // Join chat room
  socket.on('join-chat', (chatId) => {
    socket.join(`chat:${chatId}`);
  });
  
  // Handle chat message
  socket.on('chat-message', async (data) => {
    // Save to database
    const message = await saveMessage(data);
    
    // Broadcast to chat room
    io.to(`chat:${data.chatId}`).emit('new-message', message);
    
    // Send push notification to offline users
    await notifyOfflineUsers(data.chatId, message);
  });
  
  // Handle typing indicator
  socket.on('typing', (data) => {
    socket.to(`chat:${data.chatId}`).emit('user-typing', {
      userId: socket.user.id,
      chatId: data.chatId,
    });
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
    socket.broadcast.emit('user-offline', {
      userId: socket.user.id,
    });
  });
});

// ─────────────────────────────────────────────
// BROADCAST TO MULTIPLE SERVERS
// ─────────────────────────────────────────────
// When user connects to server A
// Send notification to user on server B

// Emit to specific user (works across servers)
io.to(`user:${userId}`).emit('notification', {
  type: 'new-message',
  data: message,
});

// Emit to all users in chat (works across servers)
io.to(`chat:${chatId}`).emit('new-message', message);

// Emit to all connected users
io.emit('global-announcement', { message });
```

---

## ✅ **SYSTEM DESIGN CHECKLIST**

```
Fundamentals
[ ] Understand vertical vs horizontal scaling
[ ] Know when to scale (metrics)
[ ] Load balancing algorithms
[ ] Sticky sessions implementation

Caching
[ ] Cache-aside pattern
[ ] Write-through pattern
[ ] Write-behind pattern
[ ] Cache invalidation strategies
[ ] Redis implementation

Rate Limiting
[ ] Fixed window counter
[ ] Sliding window log
[ ] Sliding window counter
[ ] Token bucket
[ ] Leaky bucket
[ ] Redis-based distributed limiting

Message Queues
[ ] BullMQ setup
[ ] Job prioritization
[ ] Retry logic
[ ] Dead letter queues

Real-time Systems
[ ] WebSocket architecture
[ ] Socket.IO with Redis adapter
[ ] Horizontal scaling for WebSockets
```

---

## 📚 **PRACTICE SYSTEM DESIGN PROBLEMS**

```
1. Design a URL Shortener (bit.ly)
2. Design a Rate Limiter
3. Design a Real-time Chat Application
4. Design a Notification System
5. Design an API Gateway
6. Design a Caching Layer
7. Design a Job Queue System
8. Design a File Upload Service
9. Design a Search Autocomplete
10. Design a Social Media Feed
```

**Each problem with detailed solutions coming in next document!**

---
-23-03-26
