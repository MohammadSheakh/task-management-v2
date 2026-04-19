# 🔑 Chapter 2: Login Flow - Step by Step

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Beginner  
**Prerequisites**: Chapter 1 (Registration)  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ How login request flows through the system
- ✅ Rate limiting for brute force protection
- ✅ Password verification with bcrypt
- ✅ JWT token generation
- ✅ Redis session caching
- ✅ Device tracking (FCM tokens)
- ✅ Email verification enforcement (NEW!)

---

## 📊 Big Picture: Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                       USER LOGIN FLOW                            │
│                                                                  │
│  Client (Flutter/Web)                                           │
│         ↓                                                        │
│  1. POST /auth/login                                             │
│     { email, password, fcmToken? }                              │
│         ↓                                                        │
│  2. Rate Limiter (5 attempts per 15 min) ⚠️ SECURITY           │
│         ↓                                                        │
│  3. Find User by Email                                          │
│         ↓                                                        │
│  4. Check Email Verified ⚠️ NEW!                               │
│     └─→ If not verified → Throw error with OTP                 │
│         ↓                                                        │
│  5. Validate Password (bcrypt.compare)                          │
│         ↓                                                        │
│  6. Generate JWT Tokens                                         │
│     - Access Token (15 min)                                     │
│     - Refresh Token (7 days)                                    │
│         ↓                                                        │
│  7. Cache Session in Redis (7 days TTL)                         │
│         ↓                                                        │
│  8. Track Device (FCM token)                                    │
│         ↓                                                        │
│  9. Return Response                                              │
│     { user, tokens: { accessToken, refreshToken } }             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Step-by-Step Deep Dive

### **Step 1: Client Sends Login Request**

**File**: `Flutter/Web Client`

```typescript
// Client-side code (Flutter/Dart example)
final response = await http.post(
  Uri.parse('http://localhost:5000/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'email': 'john@example.com',
    'password': 'SecurePass123!',
    'fcmToken': 'abc123...',  // Optional: For push notifications
  }),
);

// Expected Response: 200 OK
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",  // 15 min expiry
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."  // 7 days expiry
    }
  }
}
```

**What's in the request:**
- `email`: User's email address
- `password`: Plain text password (HTTPS encrypts in transit)
- `fcmToken`: Firebase Cloud Messaging token (optional, for push notifications)

---

### **Step 2: Route Handling with Rate Limiting**

**File**: `src/modules/auth/auth.routes.ts`

```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/validateRequest';
import { AuthValidation } from './auth.validations';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';

const router = Router();

// ─── Rate Limiter for Login ───────────────────────────────────
/**
 * Rate limit: 5 login attempts per 15 minutes per IP
 * Prevents brute force attacks
 * 
 * ⚠️ SECURITY FIX: Previously was 5001 (bug), now fixed to 5
 */
const loginLimiter = rateLimiter('auth');  // 5 attempts / 15 min

// ─── Login Route ──────────────────────────────────────────────
router.post(
  '/login',
  loginLimiter,  // 🔒 Rate limiting: 5 attempts per 15 min
  validateRequest(AuthValidation.loginValidationSchema),  // Zod validation
  AuthController.login,  // Controller method
);

export const AuthRoutes = router;
```

**Rate Limiting Details:**

```typescript
// From src/middlewares/rateLimiterRedis.ts
const RATE_LIMIT_PRESETS = {
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts ⚠️ FIXED from 5001
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later',
    },
  }
}
```

**How Sliding Window Works:**

```
Time: 0min    5min    10min   15min
      │       │       │       │
      ├───────┴───────┴───────┤
      ←   Sliding Window      →
      
Attempt 1: ✅ OK (count: 1/5)
Attempt 2: ✅ OK (count: 2/5)
Attempt 3: ✅ OK (count: 3/5)
Attempt 4: ✅ OK (count: 4/5)
Attempt 5: ✅ OK (count: 5/5)
Attempt 6: ❌ BLOCKED (429 Too Many Requests)

After 15 minutes:
Window slides, oldest attempt expires
Attempt 6: ✅ OK (count: 1/5)
```

**Response Headers:**

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1678123456
Retry-After: 900  // Seconds until reset
```

---

### **Step 3: Input Validation**

**File**: `src/modules/auth/auth.validations.ts`

```typescript
import { z } from 'zod';

const loginValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required.',
        invalid_type_error: 'Email must be a string.',
      })
      .email('Invalid email address.'),

    password: z
      .string({
        required_error: 'Password is required.',
        invalid_type_error: 'Password must be a string.',
      })
      .min(8, 'Password must be at least 8 characters long.'),

    fcmToken: z.string({
      required_error: 'Fcm token is required.',
      invalid_type_error: 'Fcm token must be a string.',
    }).optional(),  // Optional field
  }),
});
```

**Validation Checks:**
1. ✅ Email is required and valid format
2. ✅ Password is required and min 8 characters
3. ✅ FCM token is optional (for push notifications)

**Example Validation Errors:**

```json
// Missing email
{
  "success": false,
  "message": "Email is required."
}

// Invalid email format
{
  "success": false,
  "message": "Invalid email address."
}

// Password too short
{
  "success": false,
  "message": "Password must be at least 8 characters long."
}
```

---

### **Step 4: Controller Processing**

**File**: `src/modules/auth/auth.controller.ts`

```typescript
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';

const login = catchAsync(async (req, res) => {
  // Step 1: Extract credentials from request
  const { email, password, fcmToken } = req.body;

  // Step 2: Call service to authenticate user
  const result = await AuthService.login(email, password, fcmToken);

  // Step 3: Set refresh token in HTTP-only cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,        // Not accessible via JavaScript
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    sameSite: 'lax',       // CSRF protection
  });

  // Step 4: Send response to client
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully',
    data: result,
    success: true,
  });
});

export const AuthController = {
  login,
  // ... other methods
};
```

**What's happening:**
1. Extract email, password, FCM token from request
2. Call `AuthService.login()` for authentication
3. Set refresh token in HTTP-only cookie (more secure)
4. Send formatted response

**Why HTTP-only Cookie?**
- JavaScript cannot access it (XSS protection)
- Automatically sent with requests
- More secure than localStorage
- CSRF protection with `sameSite: 'lax'`

---

### **Step 5: Service Logic - Login Function**

**File**: `src/modules/auth/auth.service.ts`

```typescript
import bcryptjs from 'bcryptjs';
import { User } from '../user.module/user/user.model';
import { TokenService } from '../token/token.service';
import { UserDevices } from '../user.module/userDevices/userDevices.model';
import { redisClient } from '../../helpers/redis/redis';
import { AUTH_SESSION_CONFIG } from './auth.constants';
import { logger, errorLogger } from '../../shared/logger';

const login = async (
  email: string,
  password: string,
  fcmToken?: string,
  deviceInfo?: { deviceType?: string; deviceName?: string }
) => {
  // Step 1: Find user by email (include password for comparison)
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid credentials'
    );
  }

  // Step 2: Check if user account is deleted
  if (user.isDeleted) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Your account is deleted. Please create a new account.'
    );
  }

  // Step 3: ⚠️ NEW! Enforce email verification
  if (!user.isEmailVerified) {
    // Generate verification token and OTP
    const [verificationToken, otp] = await Promise.all([
      TokenService.createVerifyEmailToken(user),
      OtpService.createVerificationEmailOtp(user.email)
    ]);
    
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your email before logging in',
      { verificationToken, otp }
    );
  }

  // Step 4: Verify password with bcrypt
  const isPasswordValid = await bcryptjs.compare(password, user.password);
  
  if (!isPasswordValid) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Invalid credentials'
    );
  }

  // Step 5: Generate JWT tokens
  const tokens = await TokenService.accessAndRefreshToken(user);

  // Step 6: Track device (FCM token)
  if (fcmToken) {
    const deviceType = deviceInfo?.deviceType || 'web';
    const deviceName = deviceInfo?.deviceName || 'Unknown Device';

    let device = await UserDevices.findOne({
      userId: user._id,
      fcmToken,
    });

    if (!device) {
      // New device - create record
      device = await UserDevices.create({
        userId: user._id,
        fcmToken,
        deviceType,
        deviceName,
        lastActive: new Date(),
      });
    } else {
      // Existing device - update last active
      device.lastActive = new Date();
      await device.save();
    }
  }

  // Step 7: ⚠️ NEW! Cache session in Redis
  try {
    const sessionKey = `session:${user._id}:${fcmToken || 'web'}`;
    const sessionData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fcmToken,
      deviceType: deviceInfo?.deviceType || 'web',
      deviceName: deviceInfo?.deviceName || 'Unknown Device',
      loginAt: new Date(),
    };

    // Cache for 7 days (matches refresh token expiry)
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

  // Step 8: Remove password from response
  const { password: _, ...userWithoutPassword } = user.toObject();

  return {
    user: userWithoutPassword,
    tokens
  };
};
```

**What's happening (detailed):**

1. **Find User**: Query MongoDB by email, include password field
2. **Account Check**: Verify account not deleted
3. **Email Verification**: ⚠️ NEW! Check if email verified, if not → error with OTP
4. **Password Check**: Compare plain password with hashed password using bcrypt
5. **Token Generation**: Create access token (15 min) and refresh token (7 days)
6. **Device Tracking**: Store/update FCM token for push notifications
7. **Session Caching**: ⚠️ NEW! Cache session in Redis for 7 days
8. **Response**: Return user (without password) and tokens

---

### **Step 6: Email Verification Enforcement (NEW!)**

This is a **critical security feature** added in the recent fixes.

**Before Fix:**
```typescript
// ❌ OLD: Email verification check was commented out
// if (!user.isEmailVerified) {
//   throw new ApiError(...);
// }
```

**After Fix:**
```typescript
// ✅ NEW: Enforced with helpful error response
if (!user.isEmailVerified) {
  const [verificationToken, otp] = await Promise.all([
    TokenService.createVerifyEmailToken(user),
    OtpService.createVerificationEmailOtp(user.email)
  ]);
  
  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    'Please verify your email before logging in',
    { verificationToken, otp }  // Help user verify immediately
  );
}
```

**Why This Matters:**
- Prevents fake accounts with invalid emails
- Ensures user can recover account via email
- Improves overall system security
- Provides OTP immediately for verification

**Client Response:**
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "data": {
    "verificationToken": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "123456"
  }
}
```

**Client Action:**
```typescript
// Client should now:
// 1. Show "Verify your email" screen
// 2. Pre-fill OTP (from response)
// 3. Call /auth/verify-email endpoint
// 4. After verification, auto-login
```

---

### **Step 7: Password Verification with Bcrypt**

**How Bcrypt Works:**

```typescript
// User registration (password hashing)
const plainPassword = 'SecurePass123!';
const hashedPassword = await bcryptjs.hash(plainPassword, 12);
// Result: "$2a$12$KIXxKzN8vPqR7zJ9mH5LxOqY3vZ8wN2pQ4rT6sU8vW0xY2zA4bC6d"

// User login (password verification)
const isValid = await bcryptjs.compare(plainPassword, hashedPassword);
// Returns: true if password matches, false otherwise
```

**Bcrypt Hash Structure:**
```
$2a$12$KIXxKzN8vPqR7zJ9mH5LxOqY3vZ8wN2pQ4rT6sU8vW0xY2zA4bC6d
│   │   └────────────────────────────────────────────────────┐
│   │   Salt + Hash (combined)                               │
│   └─ Cost factor (12 rounds)                               │
└─ Algorithm identifier                                      │
```

**Why Bcrypt?**
- **Salt**: Random data added to each password (prevents rainbow tables)
- **Cost Factor**: Number of hashing rounds (slows down brute force)
- **One-way**: Cannot reverse hash to get password
- **Industry Standard**: Proven security over decades

**Timing:**
- Hashing: ~250ms (intentionally slow)
- Comparison: ~250ms
- Makes brute force expensive

---

### **Step 8: JWT Token Generation**

**File**: `src/modules/token/token.service.ts`

```typescript
import jwt from 'jsonwebtoken';
import { config } from '../../config';

const accessAndRefreshToken = async (user) => {
  // Step 1: Create payload
  const payload = {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
  };

  // Step 2: Generate access token (15 minutes)
  const accessToken = jwt.sign(
    payload,
    config.jwt.accessSecret,
    { expiresIn: '15m' }
  );

  // Step 3: Generate refresh token (7 days)
  const refreshToken = jwt.sign(
    payload,
    config.jwt.refreshSecret,
    { expiresIn: '7d' }
  );

  // Step 4: Store tokens in database
  await Token.create({
    token: accessToken,
    user: user._id,
    type: 'access',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  await Token.create({
    token: refreshToken,
    user: user._id,
    type: 'refresh',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });

  return { accessToken, refreshToken };
};
```

**JWT Structure:**

```
Access Token (15 min):
┌─────────────────────────────────────────────────────────┐
│ Header: { "alg": "HS256", "typ": "JWT" }               │
│ Payload: {                                             │
│   "userId": "64f5a1b2c3d4e5f6g7h8i9j0",                │
│   "userName": "John Doe",                              │
│   "email": "john@example.com",                         │
│   "role": "user",                                      │
│   "iat": 1678123456,  // Issued at                     │
│   "exp": 1678124356   // Expires (15 min)              │
│ }                                                       │
│ Signature: HMACSHA256(...)                             │
└─────────────────────────────────────────────────────────┘

Encoded: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGY...
```

**Token Comparison:**

|    Feature    |  Access Token   |    Refresh Token     |
| ------------- | --------------- | -------------------- |
| **Expiry**    | 15 minutes      | 7 days               |
| **Purpose**   | API access      | Get new access token |
| **Storage**   | Memory (client) | HTTP-only cookie     |
| **Rotation**  | No              | Yes (on use)         |
| **Blacklist** | Yes (on logout) | Yes (on logout)      |

---

### **Step 9: Redis Session Caching (NEW!)**

**Why Cache Sessions?**

```
Without Caching:
Every API request → Query MongoDB for user
- Slow: ~50ms per query
- Load: 100K users × 10 requests = 1M queries/day

With Caching:
First request → Query MongoDB, cache in Redis
Subsequent requests → Read from Redis
- Fast: ~1ms per query
- Load: 100K users × 1 request = 100K queries/day
- Improvement: 10x faster, 90% less DB load
```

**Session Caching Code:**

```typescript
// Cache session on login
const sessionKey = `session:${user._id}:${fcmToken || 'web'}`;
const sessionData = {
  userId: user._id,
  email: user.email,
  role: user.role,
  fcmToken,
  deviceType: 'web',
  deviceName: 'Chrome on Windows',
  loginAt: new Date(),
};

// Store in Redis with 7 day TTL
await redisClient.setEx(
  sessionKey,
  604800,  // 7 days in seconds
  JSON.stringify(sessionData)
);

// Result: Session cached
// Key: session:64f5a1b2c3d4e5f6g7h8i9j0:web
// Value: {"userId":"64f5a1b2c3d4e5f6g7h8i9j0","email":"john@example.com",...}
// TTL: 604800 seconds
```

**Redis Key Structure:**

```
session:<userId>:<fcmToken>
│       │        │
│       │        └─ Device identifier (or 'web')
│       └─ User ID from MongoDB
└─ Namespace for sessions

Examples:
session:64f5a1b2c3d4e5f6g7h8i9j0:web
session:64f5a1b2c3d4e5f6g7h8i9j0:abc123fcm
session:64f5a1b2c3d4e5f6g7h8i9j0:xyz789fcm
```

**Session Usage in Auth Middleware:**

```typescript
// In auth middleware
const sessionKey = `session:${req.user.userId}:${fcmToken}`;
const cachedSession = await redisClient.get(sessionKey);

if (cachedSession) {
  // Fast path: Use cached session
  const session = JSON.parse(cachedSession);
  req.session = session;
} else {
  // Slow path: Query MongoDB
  const user = await User.findById(req.user.userId);
  req.session = user;
}
```

**Cache Invalidation:**

```typescript
// On logout
const sessionKey = `session:${userId}:${fcmToken}`;
await redisClient.del(sessionKey);

// On password change (invalidate ALL sessions)
const sessionPattern = `session:${userId}:*`;
const keys = await redisClient.keys(sessionPattern);
if (keys.length > 0) {
  await redisClient.del(keys);
}
```

---

### **Step 10: Device Tracking**

**Why Track Devices?**

- Send push notifications to specific devices
- Detect suspicious login locations
- Allow users to manage active sessions
- Logout from specific devices

**Device Tracking Code:**

```typescript
if (fcmToken) {
  const deviceType = deviceInfo?.deviceType || 'web';
  const deviceName = deviceInfo?.deviceName || 'Unknown Device';

  // Find or create device record
  let device = await UserDevices.findOne({
    userId: user._id,
    fcmToken,
  });

  if (!device) {
    // New device - create
    device = await UserDevices.create({
      userId: user._id,
      fcmToken,
      deviceType,
      deviceName,
      lastActive: new Date(),
    });
  } else {
    // Existing device - update last active
    device.lastActive = new Date();
    await device.save();
  }
}
```

**UserDevices Schema:**

```typescript
const userDevicesSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fcmToken: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    enum: ['web', 'ios', 'android'],
    required: true,
  },
  deviceName: {
    type: String,
    required: true,
  },
  lastActive: {
    type: Date,
    required: true,
  },
}, {
  timestamps: true,
});

// Index for fast lookups
userDevicesSchema.index({ userId: 1, fcmToken: 1 });

export const UserDevices = model('UserDevices', userDevicesSchema);
```

**Example Device Records:**

```json
{
  "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "fcmToken": "abc123...",
  "deviceType": "ios",
  "deviceName": "iPhone 14 Pro",
  "lastActive": "2026-03-22T12:00:00Z",
  "createdAt": "2026-03-01T10:00:00Z",
  "updatedAt": "2026-03-22T12:00:00Z"
}
```

---

## 🎯 Complete Flow Diagram

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. POST /auth/login
     │    { email, password, fcmToken }
     ↓
┌─────────────────────────────────────────┐
│  Express Server                         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 2. Rate Limiter                   │ │
│  │    - Check: 5 per 15 min          │ │
│  │    - Pass or 429 error            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 3. Validation (Zod)               │ │
│  │    - Email format                 │ │
│  │    - Password min length          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 4. AuthController.login()         │ │
│  │    - Extract credentials          │ │
│  │    - Call AuthService.login()     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 5. AuthService.login()            │ │
│  │    - Find user by email           │ │
│  │    - Check isDeleted              │ │
│  │    - Check isEmailVerified ⚠️    │ │
│  │    - Verify password (bcrypt)     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 6. TokenService                   │ │
│  │    - Generate access token (15m)  │ │
│  │    - Generate refresh token (7d)  │ │
│  │    - Store in MongoDB             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 7. Redis Session Cache            │ │
│  │    - Key: session:userId:fcmToken │ │
│  │    - TTL: 7 days                  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 8. UserDevices                    │ │
│  │    - Find or create device        │ │
│  │    - Update lastActive            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 9. sendResponse()                 │ │
│  │    - Set cookie (refreshToken)    │ │
│  │    - Return 200 OK                │ │
│  └───────────────────────────────────┘ │
└────┬────────────────────────────────────┘
     │
     │ Response:
     │ {
     │   success: true,
     │   user: { _id, name, email, role },
     │   tokens: { accessToken, refreshToken }
     │ }
     ↓
┌──────────┐
│  Client  │
│  - Store access token         │
│  - Cookie auto-stores refresh │
│  - Navigate to home screen    │
└──────────┘
```

---

## 🧪 Testing the Login Flow

### **Test 1: Successful Login**

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "fcmToken": "abc123..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

### **Test 2: Email Not Verified**

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "unverified@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Please verify your email before logging in",
  "data": {
    "verificationToken": "...",
    "otp": "123456"
  }
}
```

---

### **Test 3: Invalid Credentials**

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "WrongPassword123"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### **Test 4: Rate Limit Exceeded**

```bash
# Run 6 login attempts with wrong password
for i in {1..6}; do
  curl -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "john@example.com",
      "password": "wrong"
    }'
  echo ""
done
```

**Expected Response (6th request):**
```json
{
  "success": false,
  "message": "Too many authentication attempts, please try again later",
  "retryAfter": "900"  // 15 minutes
}
```

---

## 🔍 Debugging Tips

### **Check Redis Session**

```bash
redis-cli

# List all sessions
KEYS session:*

# Get specific session
GET session:64f5a1b2c3d4e5f6g7h8i9j0:web

# Check TTL
TTL session:64f5a1b2c3d4e5f6g7h8i9j0:web
# Expected: ~604800 (7 days)
```

### **Check MongoDB**

```bash
mongosh

# Find user
db.users.findOne({ email: "john@example.com" })

# Check tokens
db.tokens.find({ user: ObjectId("...") })

# Check devices
db.userdevices.find({ userId: ObjectId("...") })
```

### **Check Rate Limit**

```bash
redis-cli

# Check rate limit counter
KEYS ratelimit:auth:*

# Get count
ZCARD ratelimit:auth:ip:127.0.0.1
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Rate Limiting**: 5 attempts per 15 minutes (brute force protection)
2. ✅ **Email Verification**: Enforced before login (NEW!)
3. ✅ **Password Verification**: bcrypt.compare()
4. ✅ **JWT Tokens**: Access (15 min) + Refresh (7 days)
5. ✅ **Redis Caching**: Session caching for performance
6. ✅ **Device Tracking**: FCM token management
7. ✅ **HTTP-only Cookies**: Secure refresh token storage
8. ✅ **Error Handling**: Proper error messages

### **Key Files:**

| File | Purpose |
|------|---------|
| `auth.routes.ts` | Login route, rate limiting |
| `auth.controller.ts` | Request handling, cookies |
| `auth.service.ts` | Login logic, caching |
| `token.service.ts` | JWT generation |
| `userDevices.model.ts` | Device tracking |

### **Next Chapter:**

→ [Chapter 3: Email Verification Flow](./LEARN_AUTH_03_EMAIL_VERIFICATION.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
