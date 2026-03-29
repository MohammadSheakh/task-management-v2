# Rate Limiter Quick Reference

## Usage Examples

### Basic Usage
```typescript
import { rateLimiter } from '../../../middlewares/rateLimiter';

// User endpoints (30 req/min)
router.get('/analytics', rateLimiter('user'), controller);

// Admin endpoints (100 req/min)
router.get('/dashboard', rateLimiter('admin'), controller);

// Auth endpoints (5 attempts/15min)
router.post('/login', rateLimiter('auth'), controller);

// API endpoints (60 req/min)
router.get('/data', rateLimiter('api'), controller);

// Strict endpoints (3 req/hour)
router.post('/forgot-password', rateLimiter('strict'), controller);
```

### Custom Rate Limiter
```typescript
import { createCustomRateLimiter } from '../../../middlewares/rateLimiter';

// File uploads: 5 per minute
const uploadLimiter = createCustomRateLimiter(
  60 * 1000,      // 1 minute
  5,              // 5 requests
  'Too many uploads'
);

router.post('/upload', uploadLimiter, uploadController);
```

### Enable Redis (for cluster)
```typescript
// Second parameter 'true' enables Redis store
router.get('/analytics', rateLimiter('user', true), controller);
```

---

## Preset Configuration

| Type | Window | Max | Use Case |
|------|--------|-----|----------|
| `user` | 1 min | 30 | User endpoints |
| `admin` | 1 min | 100 | Admin dashboard |
| `auth` | 15 min | 5 | Login/register |
| `api` | 1 min | 60 | General API |
| `strict` | 1 hour | 3 | Password reset |

---

## Response Format

### Success (Within Limit)
```json
HTTP 200 OK
RateLimit-Limit: 30
RateLimit-Remaining: 29
RateLimit-Reset: 1710234567

{
  "success": true,
  "data": { ... }
}
```

### Error (Limit Exceeded)
```json
HTTP 429 Too Many Requests
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

## Common Patterns

### Protect Route
```typescript
router.post(
  '/create-task',
  auth(),
  rateLimiter('user'),
  TaskController.createTask
);
```

### Multiple Limiters
```typescript
// Strict for OTP, general for other operations
router.post('/send-otp', rateLimiter('strict'), AuthController.sendOTP);
router.post('/verify-otp', rateLimiter('auth'), AuthController.verifyOTP);
```

### Conditional Rate Limiting
```typescript
// Skip for admin users
router.get(
  '/data',
  (req, res, next) => {
    if (req.user?.role === 'admin') return next();
    rateLimiter('user')(req, res, next);
  },
  DataController.getData
);
```

---

## Best Practices

✅ **DO:**
- Use strict limits for auth endpoints
- Use user ID for authenticated requests
- Return clear error messages with retry time
- Monitor rate limit hits in logs
- Adjust limits based on usage patterns

❌ **DON'T:**
- Use same limit for all endpoints
- Set limits too low (blocks legitimate users)
- Set limits too high (ineffective protection)
- Forget to test rate limiting
- Ignore rate limit logs

---

## Troubleshooting

### Issue: Not working across servers
**Fix:** Enable Redis store
```typescript
rateLimiter('user', true)
```

### Issue: Users complaining about limits
**Fix:** Increase limits or implement tiers
```typescript
// Premium users get higher limits
const premiumLimiter = rateLimiter('admin');
```

### Issue: Redis connection fails
**Fix:** Automatic fallback to memory (built-in)

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/middlewares/rateLimiter.ts` | Main middleware |
| `RATE_LIMITING_STRATEGY.md` | Full documentation |
| `RATE_LIMITING_IMPLEMENTATION_SUMMARY.md` | Implementation summary |

---

**Quick Start:** Just use `rateLimiter('user')` for most endpoints!
