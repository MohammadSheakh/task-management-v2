# 🔐 Chapter 4: JWT Token System - Complete Guide

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Intermediate  
**Prerequisites**: Chapter 1 (Registration), Chapter 2 (Login), Chapter 3 (Email Verification)  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ What JWT is and why we use it
- ✅ JWT structure (Header, Payload, Signature)
- ✅ Access token vs Refresh token
- ✅ Token generation process
- ✅ Token verification
- ✅ Token rotation strategy
- ✅ Token blacklisting (logout)
- ✅ Security best practices
- ✅ Testing JWT tokens
- ✅ Debugging token issues

---

## 📊 Big Picture: JWT in Our System

```
┌─────────────────────────────────────────────────────────────────┐
│                    JWT TOKEN SYSTEM                              │
│                                                                  │
│  User Login                                                      │
│       ↓                                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Token Generation                                        │  │
│  │  ┌────────────────────┐  ┌────────────────────┐         │  │
│  │  │  Access Token      │  │  Refresh Token     │         │  │
│  │  │  • 15 minutes      │  │  • 7 days          │         │  │
│  │  │  • API access      │  │  • Get new access  │         │  │
│  │  │  • Stored in memory│  │  │  • HTTP-only cookie│       │  │
│  │  └────────────────────┘  └────────────────────┘         │  │
│  └──────────────────────────────────────────────────────────┘  │
│       ↓                                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Token Usage                                             │  │
│  │  • Access token → API requests (Authorization header)    │  │
│  │  • Refresh token → Get new access token (auto)           │  │
│  └──────────────────────────────────────────────────────────┘  │
│       ↓                                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Token Verification                                      │  │
│  │  • Verify signature                                      │  │
│  │  • Check expiry                                          │  │
│  │  • Check blacklist (Redis)                               │  │
│  │  • Check database                                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│       ↓                                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Token Refresh                                           │  │
│  │  • Access token expired                                  │  │
│  │  • Use refresh token to get new access token             │  │
│  │  • Rotate refresh token (security)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│       ↓                                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Token Blacklist (Logout)                                │  │
│  │  • Add to Redis blacklist                                │  │
│  │  • Delete from database                                  │  │
│  │  • Invalidate session                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 What is JWT?

### **Definition:**

**JWT (JSON Web Token)** is a compact, URL-safe token format used for securely transmitting information between parties as a JSON object.

### **Why We Use JWT:**

```
Traditional Session-Based Auth:
┌─────────────────────────────────────────────────┐
│  Client          Server          Database       │
│    │               │                │           │
│    │─── Login ────>│                │           │
│    │               │─── Query ────>│           │
│    │               │<── Session ───│           │
│    │<── Cookie ────│                │           │
│    │               │                │           │
│    │─── Request ──>│                │           │
│    │               │─── Query ────>│  ← Slow!   │
│    │               │<── User ──────│           │
│    │<── Response ──│                │           │
└─────────────────────────────────────────────────┘
Problem: Every request needs database query

JWT Token-Based Auth:
┌─────────────────────────────────────────────────┐
│  Client          Server          Redis          │
│    │               │                │           │
│    │─── Login ────>│                │           │
│    │               │─── Cache ────>│           │
│    │<── Tokens ────│                │           │
│    │               │                │           │
│    │─── Request ──>│                │           │
│    │  (with JWT)   │─── Verify ────>│ ← Fast!   │
│    │               │<── Valid ──────│           │
│    │<── Response ──│                │           │
└─────────────────────────────────────────────────┘
Benefit: No database query needed for verification
```

### **JWT Advantages:**

1. **Stateless**: Server doesn't need to store session data
2. **Scalable**: Works across multiple servers
3. **Fast**: No database query for verification
4. **Secure**: Cryptographically signed
5. **Flexible**: Can contain any payload data

---

## 📦 JWT Structure

### **Three Parts:**

```
JWT = Header.Payload.Signature

Example:
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGY1YTFiMmMzZDRlNWY2ZzdoOGk5ajAiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTY3ODEyMzQ1NiwiZXhwIjoxNjc4MTI0MzU2fQ.abc123...

Decoded:
Header:  {"alg":"HS256","typ":"JWT"}
Payload: {"userId":"64f5a1b2c3d4e5f6g7h8i9j0","email":"john@example.com","role":"user","iat":1678123456,"exp":1678124356}
Signature: HMACSHA256(...)
```

### **Part 1: Header**

```typescript
// Header structure
{
  "alg": "HS256",  // Algorithm: HMAC SHA-256
  "typ": "JWT"     // Type: JSON Web Token
}

// Encoded (Base64Url)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

**Header Fields:**
- `alg`: Signing algorithm (HS256 = HMAC with SHA-256)
- `typ`: Token type (always "JWT")

### **Part 2: Payload**

```typescript
// Access Token Payload
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "userName": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "iat": 1678123456,  // Issued At (timestamp)
  "exp": 1678124356   // Expiration (timestamp, 15 min later)
}

// Refresh Token Payload
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "userName": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "deviceId": "abc123...",
  "iat": 1678123456,  // Issued At (timestamp)
  "exp": 1678728256   // Expiration (timestamp, 7 days later)
}
```

**Payload Fields:**
- `userId`: User's MongoDB ID
- `userName`: User's name
- `email`: User's email
- `role`: User's role (user, admin, etc.)
- `iat`: "Issued At" timestamp (automatic)
- `exp`: "Expiration" timestamp (automatic)

### **Part 3: Signature**

```typescript
// Signature creation
const header = base64UrlEncode(header);
const payload = base64UrlEncode(payload);
const secret = config.jwt.accessSecret;

const signature = HMACSHA256(
  `${header}.${payload}`,
  secret
);

// Result: "abc123def456..."
```

**Signature Purpose:**
- Verifies token wasn't tampered with
- Proves token was created by server
- Prevents forgery

---

## 🔑 Access Token vs Refresh Token

### **Comparison Table:**

| Feature | Access Token | Refresh Token |
|---------|-------------|---------------|
| **Purpose** | Access protected APIs | Get new access token |
| **Expiry** | 15 minutes | 7 days |
| **Storage** | Memory (client) | HTTP-only cookie |
| **Sent Via** | Authorization header | Automatic (cookie) |
| **Rotation** | No | Yes (on use) |
| **Blacklist** | Yes (logout) | Yes (logout) |
| **Payload** | User info + role | User info + deviceId |

### **Why Two Tokens?**

```
Security Trade-off:
┌─────────────────────────────────────────────────┐
│  Short-lived Access Token (15 min)              │
│  ✓ More secure (expires quickly)                │
│  ✗ User must re-authenticate often              │
│                                                 │
│  Long-lived Refresh Token (7 days)              │
│  ✓ Better UX (auto-refresh)                     │
│  ✗ Security risk if stolen                      │
│                                                 │
│  Solution: Use BOTH!                            │
│  • Access token for API calls (short expiry)    │
│  • Refresh token to get new access token        │
│  • Best of both worlds: Security + UX           │
└─────────────────────────────────────────────────┘
```

### **Token Lifecycle:**

```
┌─────────────────────────────────────────────────────────┐
│              TOKEN LIFECYCLE                             │
│                                                          │
│  Login                                                   │
│    ↓                                                     │
│  ┌──────────────────────────────────────────────┐       │
│  │ Generate Tokens                              │       │
│  │ • Access Token (15 min) ──→ Memory           │       │
│  │ • Refresh Token (7 days) ──→ Cookie          │       │
│  └──────────────────────────────────────────────┘       │
│    ↓                                                     │
│  API Request (with Access Token)                         │
│    ↓                                                     │
│  ┌──────────────────────────────────────────────┐       │
│  │ Token Valid?                                 │       │
│  │ • Check signature ✓                          │       │
│  │ • Check expiry ✓                             │       │
│  │ • Check blacklist ✓                          │       │
│  │ → Allow request                              │       │
│  └──────────────────────────────────────────────┘       │
│    ↓                                                     │
│  After 15 minutes (Access Token expired)                 │
│    ↓                                                     │
│  ┌──────────────────────────────────────────────┐       │
│  │ Auto-Refresh                                 │       │
│  │ • Use Refresh Token                          │       │
│  │ • Get new Access Token                       │       │
│  │ • Rotate Refresh Token                       │       │
│  └──────────────────────────────────────────────┘       │
│    ↓                                                     │
│  Continue API requests                                   │
│    ↓                                                     │
│  After 7 days (Refresh Token expired)                    │
│    ↓                                                     │
│  ┌──────────────────────────────────────────────┐       │
│  │ Re-authentication Required                   │       │
│  │ • User must login again                      │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 🏭 Token Generation Process

### **File**: `src/modules/token/token.service.ts`

```typescript
import jwt, { Secret } from 'jsonwebtoken';
import { config } from '../../config';
import { Token } from './token.model';
import { TokenType } from './token.interface';
import { IUser } from '../user.module/user/user.interface';

/**
 * Generate both access and refresh tokens
 */
const accessAndRefreshToken = async (user: IUser) => {
  // Step 1: Create payload
  const payload = {
    userId: user._id,
    userName: user.name,
    email: user.email,
    role: user.role,
  };

  // Step 2: Generate access token (15 minutes)
  const accessToken = createToken(
    payload,
    config.jwt.accessSecret,
    config.jwt.accessExpiration  // '15m'
  );

  // Step 3: Generate refresh token (7 days)
  const refreshToken = createToken(
    payload,
    config.jwt.refreshSecret,
    config.jwt.refreshExpiration  // '7d'
  );

  // Step 4: Store tokens in database
  await Token.create({
    token: accessToken,
    user: user._id,
    type: TokenType.ACCESS,
    expiresAt: getExpirationTime(config.jwt.accessExpiration),
  });

  await Token.create({
    token: refreshToken,
    user: user._id,
    type: TokenType.REFRESH,
    expiresAt: getExpirationTime(config.jwt.refreshExpiration),
  });

  // Step 5: Return tokens
  return { accessToken, refreshToken };
};

/**
 * Helper: Create JWT token
 */
const createToken = (
  payload: object,
  secret: Secret,
  expireTime: string
) => {
  return jwt.sign(payload, secret, { expiresIn: expireTime });
};

/**
 * Helper: Calculate expiration timestamp
 */
const getExpirationTime = (expiration: string) => {
  const timeValue = parseInt(expiration);
  
  if (expiration.includes('d')) {
    return addDays(new Date(), timeValue);
  } else if (expiration.includes('m')) {
    return addMinutes(new Date(), timeValue);
  }
  
  return new Date();
};

export const TokenService = {
  createToken,
  accessAndRefreshToken,
  // ... other methods
};
```

### **Token Generation Flow:**

```
┌─────────────────────────────────────────────────┐
│  1. Create Payload                              │
│  {                                              │
│    "userId": "64f5a1b2c3d4e5f6g7h8i9j0",       │
│    "userName": "John Doe",                      │
│    "email": "john@example.com",                 │
│    "role": "user"                               │
│  }                                              │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  2. Sign Access Token (15 min)                  │
│  jwt.sign(payload, accessSecret, {              │
│    expiresIn: '15m'                             │
│  })                                             │
│                                                 │
│  Result: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..." │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  3. Sign Refresh Token (7 days)                 │
│  jwt.sign(payload, refreshSecret, {             │
│    expiresIn: '7d'                              │
│  })                                             │
│                                                 │
│  Result: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpX..." │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  4. Store in Database                           │
│  Token.create({                                 │
│    token: accessToken,                          │
│    user: userId,                                │
│    type: 'access',                              │
│    expiresAt: 2026-03-22T12:15:00Z              │
│  })                                             │
│                                                 │
│  Token.create({                                 │
│    token: refreshToken,                         │
│    user: userId,                                │
│    type: 'refresh',                             │
│    expiresAt: 2026-03-29T12:00:00Z              │
│  })                                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  5. Return to Client                            │
│  {                                              │
│    "accessToken": "eyJhbGciOiJIUzI1NiIs...",   │
│    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."   │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## 🔎 Token Verification

### **File**: `src/modules/token/token.service.ts`

```typescript
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import { Token } from './token.model';
import { TokenType } from './token.interface';

/**
 * Verify JWT token
 */
const verifyToken = async (
  token: string,
  secret: Secret,
  tokenType: TokenType
) => {
  // Step 1: Verify JWT signature and expiry
  const decoded = jwt.verify(token, secret) as JwtPayload;
  
  // Step 2: Find token in database
  const storedToken = await Token.findOne({
    token,
    user: decoded.userId,
    type: tokenType,
  });
  
  // Step 3: Check if token exists
  if (!storedToken) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token is invalid or already used'
    );
  }
  
  // Step 4: Check if token is expired
  if (storedToken.expiresAt < new Date()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Token has expired'
    );
  }
  
  // Step 5: Check token type
  if (storedToken.type !== tokenType) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid token type'
    );
  }
  
  // Step 6: Mark token as verified
  storedToken.verified = true;
  await storedToken.save();
  
  // Step 7: Delete token (one-time use for verify/reset)
  if (tokenType === TokenType.VERIFY || tokenType === TokenType.RESET) {
    await Token.deleteOne({ _id: storedToken._id });
  }
  
  return decoded;
};

export const TokenService = {
  verifyToken,
  // ... other methods
};
```

### **Verification Flow:**

```
┌─────────────────────────────────────────────────┐
│  Client Request                                 │
│  Authorization: Bearer eyJhbGciOiJIUzI1NiIs... │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Auth Middleware                                │
│  1. Extract token from header                   │
│  2. Call TokenService.verifyToken()             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Step 1: JWT.verify()                           │
│  • Check signature (valid?)                     │
│  • Check expiry (not expired?)                  │
│  • Decode payload                               │
│                                                 │
│  If invalid → Throw error                       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Step 2: Database Lookup                        │
│  Token.findOne({                                │
│    token: token,                                │
│    user: decoded.userId,                        │
│    type: 'access'                               │
│  })                                             │
│                                                 │
│  If not found → Throw error                     │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Step 3: Check Expiry                           │
│  if (storedToken.expiresAt < new Date())        │
│    → Throw error (Token expired)                │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Step 4: Check Type                             │
│  if (storedToken.type !== 'access')             │
│    → Throw error (Invalid token type)           │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Step 5: Mark Verified                          │
│  storedToken.verified = true                    │
│  await storedToken.save()                       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Step 6: Return Decoded Payload                 │
│  {                                              │
│    "userId": "64f5a1b2c3d4e5f6g7h8i9j0",       │
│    "userName": "John Doe",                      │
│    "email": "john@example.com",                 │
│    "role": "user"                               │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## 🔄 Token Rotation Strategy

### **Why Rotate Tokens?**

```
Security Risk Without Rotation:
┌─────────────────────────────────────────────────┐
│  Attacker steals refresh token                  │
│    ↓                                             │
│  Attacker can use it forever (7 days)           │
│    ↓                                             │
│  Continuous unauthorized access                 │
└─────────────────────────────────────────────────┘

Security With Rotation:
┌─────────────────────────────────────────────────┐
│  Attacker steals refresh token                  │
│    ↓                                             │
│  Legitimate user refreshes (rotates token)      │
│    ↓                                             │
│  Old token blacklisted                          │
│    ↓                                             │
│  Attacker tries to use old token                │
│    ↓                                             │
│  Token rejected (blacklisted)                   │
│    ↓                                             │
│  System detects reuse attack                    │
│    ↓                                             │
│  All sessions invalidated                       │
└─────────────────────────────────────────────────┘
```

### **Token Rotation Implementation:**

**File**: `src/modules/auth/auth.service.ts`

```typescript
const refreshAuth = async (refreshToken: string) => {
  try {
    // Step 1: Check if token is blacklisted in Redis
    const blacklistKey = `blacklist:${refreshToken}`;
    const isBlacklisted = await redisClient.get(blacklistKey);
    
    if (isBlacklisted) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Refresh token has been revoked. Please login again.'
      );
    }
    
    // Step 2: Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      config.jwt.refreshSecret as Secret
    ) as jwt.JwtPayload & { 
      userId: string; 
      email: string; 
      role: string;
    };
    
    // Step 3: Check if user exists and is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'User not found'
      );
    }
    
    if (user.isDeleted) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'User account is deleted'
      );
    }
    
    // Step 4: Verify token type in database
    const tokenDoc = await Token.findOne({
      token: refreshToken,
      user: user._id,
      type: TokenType.REFRESH,
    });
    
    if (!tokenDoc) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Invalid refresh token. Please login again.'
      );
    }
    
    if (tokenDoc.expiresAt < new Date()) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Refresh token has expired. Please login again.'
      );
    }
    
    // Step 5: Generate new access and refresh token pair (ROTATION)
    const tokens = await TokenService.accessAndRefreshToken(user);
    
    // Step 6: Blacklist old refresh token (PREVENT REUSE)
    const oldTokenExpiry = tokenDoc.expiresAt.getTime() - Date.now();
    const oldTokenTTL = Math.max(0, Math.floor(oldTokenExpiry / 1000));
    
    if (oldTokenTTL > 0) {
      await redisClient.setEx(
        blacklistKey,
        Math.min(oldTokenTTL, AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL),
        'blacklisted'
      );
    }
    
    // Step 7: Delete old refresh token from database
    await Token.deleteOne({ token: refreshToken });
    
    logger.info(`Token refreshed for user ${user._id}`);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    errorLogger.error('Refresh token error:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if ((error as any).name === 'TokenExpiredError') {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Refresh token has expired. Please login again.'
      );
    }
    
    if ((error as any).name === 'JsonWebTokenError') {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED,
        'Invalid refresh token. Please login again.'
      );
    }
    
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to refresh token'
    );
  }
};
```

### **Token Rotation Flow:**

```
┌─────────────────────────────────────────────────┐
│  1. Client Sends Refresh Token                  │
│  POST /auth/refresh-auth                        │
│  { "refreshToken": "eyJhbGciOiJIUzI1NiIs..." } │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  2. Check Redis Blacklist                       │
│  GET blacklist:<refreshToken>                   │
│                                                 │
│  If exists → Token already used (attack!)       │
│  → Invalidate all sessions                      │
│  → Throw error                                  │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  3. Verify JWT Signature                        │
│  jwt.verify(refreshToken, refreshSecret)        │
│                                                 │
│  If invalid → Throw error                       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  4. Check Database                              │
│  Token.findOne({                                │
│    token: refreshToken,                         │
│    user: userId,                                │
│    type: 'refresh'                              │
│  })                                             │
│                                                 │
│  If not found → Throw error                     │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  5. Generate NEW Tokens                         │
│  const tokens = await TokenService.             │
│    accessAndRefreshToken(user)                  │
│                                                 │
│  → New access token (15 min)                    │
│  → New refresh token (7 days)                   │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  6. Blacklist OLD Refresh Token                 │
│  redisClient.setEx(                             │
│    `blacklist:${refreshToken}`,                 │
│    oldTokenTTL,                                 │
│    'blacklisted'                                │
│  )                                              │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  7. Delete OLD Token from DB                    │
│  Token.deleteOne({ token: refreshToken })       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  8. Return NEW Tokens                           │
│  {                                              │
│    "accessToken": "new-access-token",           │
│    "refreshToken": "new-refresh-token"          │
│  }                                              │
└─────────────────────────────────────────────────┘
```

---

## 🚫 Token Blacklisting (Logout)

### **Why Blacklist?**

```
Without Blacklist:
┌─────────────────────────────────────────────────┐
│  User logs out                                  │
│    ↓                                             │
│  Client deletes token from memory               │
│    ↓                                             │
│  Token still valid until expiry                 │
│    ↓                                             │
│  If token was stolen → Attacker can still use   │
└─────────────────────────────────────────────────┘

With Blacklist:
┌─────────────────────────────────────────────────┐
│  User logs out                                  │
│    ↓                                             │
│  Token added to Redis blacklist                 │
│    ↓                                             │
│  Token immediately invalid                        │
│    ↓                                             │
│  Even if stolen → Cannot be used                │
└─────────────────────────────────────────────────┘
```

### **Blacklist Implementation:**

**File**: `src/modules/auth/auth.service.ts`

```typescript
const logout = async (
  refreshToken: string,
  userId?: string,
  fcmToken?: string,
  logoutFromAllDevices: boolean = false
) => {
  try {
    // Step 1: Verify the refresh token and add to blacklist
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        config.jwt.refreshSecret as Secret
      ) as jwt.JwtPayload;
      
      // Blacklist the refresh token in Redis
      const blacklistKey = `blacklist:${refreshToken}`;
      const tokenExpiry = decoded.exp 
        ? decoded.exp - Math.floor(Date.now() / 1000) 
        : AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL;
      
      await redisClient.setEx(
        blacklistKey,
        Math.min(tokenExpiry, AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL),
        'blacklisted'
      );
      
      logger.info(`Token blacklisted for user ${decoded.userId}`);
    }
    
    // Step 2: Remove user session from Redis cache
    if (userId) {
      const sessionPattern = fcmToken
        ? `session:${userId}:${fcmToken}`
        : `session:${userId}:*`;
      
      const keys = await redisClient.keys(sessionPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Session cache cleared for user ${userId}`);
      }
    }
    
    // Step 3: Optionally logout from all devices
    if (logoutFromAllDevices && userId) {
      await UserDevices.deleteMany({ 
        userId: new mongoose.Types.ObjectId(userId) 
      });
      logger.info(`All devices logged out for user ${userId}`);
    } else if (fcmToken && userId) {
      // Remove only the current device
      await UserDevices.deleteOne({
        userId: new mongoose.Types.ObjectId(userId),
        fcmToken
      });
      logger.info(`Device logged out for user ${userId}`);
    }
    
    return { success: true };
  } catch (error) {
    errorLogger.error('Logout error:', error);
    // Don't throw - logout should succeed even if blacklist fails
    return { success: true };
  }
};
```

### **Blacklist Flow:**

```
┌─────────────────────────────────────────────────┐
│  1. User Logs Out                               │
│  POST /auth/logout                              │
│  { "refreshToken": "eyJhbGciOiJIUzI1NiIs..." } │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  2. Verify Refresh Token                        │
│  jwt.verify(refreshToken, refreshSecret)        │
│                                                 │
│  Get expiry from decoded token                  │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  3. Add to Redis Blacklist                      │
│  redisClient.setEx(                             │
│    `blacklist:${refreshToken}`,                 │
│    tokenExpiry,                                 │
│    'blacklisted'                                │
│  )                                              │
│                                                 │
│  Key: blacklist:eyJhbGciOiJIUzI1NiIs...        │
│  Value: blacklisted                             │
│  TTL: Until token expires                       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  4. Clear Session Cache                         │
│  KEYS session:${userId}:*                       │
│  DEL session:${userId}:${fcmToken}              │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  5. Remove Device (optional)                    │
│  UserDevices.deleteOne({                        │
│    userId,                                      │
│    fcmToken                                     │
│  })                                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  6. Return Success                              │
│  { "success": true }                            │
└─────────────────────────────────────────────────┘
```

---

## 🧪 Testing JWT Tokens

### **Test 1: Generate Tokens on Login**

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
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

**Decode the Token:**
```bash
# Copy access token and go to jwt.io
# Paste token to see decoded payload

Expected Payload:
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "userName": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "iat": 1678123456,
  "exp": 1678124356
}
```

---

### **Test 2: Use Access Token**

```bash
curl -X GET http://localhost:5000/users/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

### **Test 3: Refresh Expired Token**

```bash
# Wait 15 minutes for access token to expire

curl -X POST http://localhost:5000/auth/refresh-auth \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token"
  }
}
```

---

### **Test 4: Use Blacklisted Token**

```bash
# 1. Login and get tokens
curl -X POST http://localhost:5000/auth/login ...

# 2. Logout (blacklist token)
curl -X POST http://localhost:5000/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'

# 3. Try to use blacklisted refresh token
curl -X POST http://localhost:5000/auth/refresh-auth \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Refresh token has been revoked. Please login again."
}
```

---

## 🔍 Debugging JWT Tokens

### **Check MongoDB for Tokens**

```bash
mongosh

# Find all tokens for a user
db.tokens.find({ user: ObjectId("64f5a1b2c3d4e5f6g7h8i9j0") })

# Find access tokens
db.tokens.find({ type: "access" })

# Find refresh tokens
db.tokens.find({ type: "refresh" })

# Find expired tokens
db.tokens.find({ 
  expiresAt: { $lt: new Date() } 
})

# Count tokens
db.tokens.countDocuments({ 
  user: ObjectId("64f5a1b2c3d4e5f6g7h8i9j0"),
  type: "refresh"
})
```

### **Check Redis for Blacklist**

```bash
redis-cli

# List all blacklisted tokens
KEYS blacklist:*

# Check if specific token is blacklisted
GET blacklist:eyJhbGciOiJIUzI1NiIs...

# Check TTL of blacklisted token
TTL blacklist:eyJhbGciOiJIUzI1NiIs...
# Expected: Seconds until token expires
```

### **Decode JWT Token**

```bash
# Method 1: Use jwt.io (online)
# 1. Go to https://jwt.io
# 2. Paste your token
# 3. See decoded payload

# Method 2: Use command line (Node.js)
node -e "
const jwt = require('jsonwebtoken');
const token = 'eyJhbGciOiJIUzI1NiIs...';
const decoded = jwt.decode(token);
console.log(JSON.stringify(decoded, null, 2));
"

# Method 3: Use base64 decoding (manual)
echo "eyJ1c2VySWQiOiI2NGY1YTFiMmMzZDRlNWY2ZzdoOGk5ajAiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20ifQ" | base64 -d
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **What is JWT**: Stateless, secure token format
2. ✅ **JWT Structure**: Header, Payload, Signature
3. ✅ **Access vs Refresh Token**: Different purposes, different expiry
4. ✅ **Token Generation**: Create both tokens on login
5. ✅ **Token Verification**: Verify signature, check DB, check expiry
6. ✅ **Token Rotation**: Rotate refresh tokens on use
7. ✅ **Token Blacklisting**: Invalidate tokens on logout
8. ✅ **Security Best Practices**: Rotation, blacklisting, short expiry
9. ✅ **Testing**: How to test token flows
10. ✅ **Debugging**: MongoDB, Redis, jwt.io

### **Key Files:**

| File | Purpose |
|------|---------|
| `token.service.ts` | Token generation and verification |
| `token.model.ts` | Token schema |
| `token.interface.ts` | TypeScript interfaces |
| `auth.service.ts` | refreshAuth, logout functions |

### **Security Features:**

- ✅ Short-lived access tokens (15 min)
- ✅ Long-lived refresh tokens (7 days)
- ✅ Token rotation (prevent reuse)
- ✅ Token blacklisting (logout)
- ✅ Database storage (track all tokens)
- ✅ Redis blacklist (fast lookup)
- ✅ Signature verification (prevent forgery)

### **Next Chapter:**

→ [Chapter 5: Redis Caching System](./LEARN_AUTH_05_REDIS_CACHING.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
