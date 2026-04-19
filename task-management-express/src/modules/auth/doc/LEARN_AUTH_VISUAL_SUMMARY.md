# 🎨 Visual Summary - Authentication System

**Version**: 1.0  
**Date**: 22-03-26  
**Purpose**: Visual diagrams and summaries for quick understanding  

---

## 📊 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTH MODULE ARCHITECTURE                        │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    CLIENT LAYER                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │ Flutter App  │  │  Website     │  │  Admin Panel │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   EXPRESS SERVER                       │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │ Middleware Layer                                 │  │    │
│  │  │ • Rate Limiter (Redis)                           │  │    │
│  │  │ • Auth Middleware                                │  │    │
│  │  │ • Validation (Zod)                               │  │    │
│  │  │ • Error Handler                                  │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │ Controller Layer                                 │  │    │
│  │  │ • AuthController                                 │  │    │
│  │  │ • UserController                                 │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  │                                                         │    │
│  │  ┌──────────────────────────────────────────────────┐  │    │
│  │  │ Service Layer                                    │  │    │
│  │  │ • AuthService                                    │  │    │
│  │  │ • TokenService                                   │  │    │
│  │  │ • OtpService                                     │  │    │
│  │  └──────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   DATA LAYER                           │    │
│  │                                                         │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │    │
│  │  │  MongoDB     │  │   Redis      │  │  BullMQ      │ │    │
│  │  │  (Database)  │  │   (Cache)    │  │  (Queue)     │ │    │
│  │  │              │  │              │  │              │ │    │
│  │  │ • Users      │  │ • Sessions   │  │ • Emails     │ │    │
│  │  │ • Profiles   │  │ • OTPs       │  │ • Notifs     │ │    │
│  │  │ • Tokens     │  │ • Rate Limit │  │ • Jobs       │ │    │
│  │  │ • Devices    │  │ • Blacklist  │  │              │ │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Registration Flow (Visual)

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. POST /auth/register
     │    { name, email, password, role, acceptTOC }
     ↓
┌─────────────────────────────────────────────────┐
│  Rate Limiter                                   │
│  Check: 10 registrations per hour               │
│  ✓ Pass → Continue                              │
│  ✗ Block → 429 Too Many Requests                │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Zod Validation                                 │
│  • Email format                                 │
│  • Password strength (min 8 chars)              │
│  • Role is valid                                │
│  • acceptTOC = true                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  AuthController.register()                      │
│  • Create UserProfile document                  │
│  • Prepare User DTO                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  AuthService.createUser()                       │
│  • Check if email exists                        │
│  • Hash password (bcrypt, 12 rounds)            │
│  • Create User document                         │
│  • Link UserProfile                             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  TokenService + OtpService                      │
│  • Create verification token (JWT)              │
│  • Generate 6-digit OTP                         │
│  • Store OTP in MongoDB (10 min TTL)            │
│  • Send email (BullMQ queue)                    │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Response to Client                             │
│  {                                              │
│    success: true,                               │
│    message: "Account created...",               │
│    data: { user, verificationToken, otp }       │
│  }                                              │
└─────────────────────────────────────────────────┘
     ↓
┌─────────┐
│  User   │
│  - Check email for OTP         │
│  - Verify email                │
│  - Login                       │
└─────────┘
```

---

## 🔑 Login Flow (Visual)

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. POST /auth/login
     │    { email, password, fcmToken }
     ↓
┌─────────────────────────────────────────────────┐
│  Rate Limiter ⚠️ SECURITY                       │
│  Check: 5 attempts per 15 minutes               │
│  ✓ Pass → Continue                              │
│  ✗ Block → 429 Too Many Requests                │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Zod Validation                                 │
│  • Email format                                 │
│  • Password min length                          │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  AuthController.login()                         │
│  • Extract credentials                          │
│  • Call AuthService.login()                       │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  AuthService.login()                            │
│  • Find user by email                           │
│  • Check isDeleted                              │
│  • Check isEmailVerified ⚠️ NEW!                │
│    └─→ If not verified → Error with OTP         │
│  • Verify password (bcrypt.compare)             │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  TokenService                                   │
│  • Generate access token (15 min)               │
│  • Generate refresh token (7 days)              │
│  • Store tokens in MongoDB                      │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Redis Session Cache ⚠️ NEW!                    │
│  • Key: session:userId:fcmToken                 │
│  • TTL: 7 days                                  │
│  • Data: { userId, email, role, device }        │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  UserDevices                                    │
│  • Find or create device record                 │
│  • Update lastActive                            │
│  • Track for push notifications                 │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  Response to Client                             │
│  {                                              │
│    success: true,                               │
│    user: { _id, name, email, role },            │
│    tokens: { accessToken, refreshToken }        │
│  }                                              │
│                                                 │
│  + Set HTTP-only cookie (refreshToken)          │
└─────────────────────────────────────────────────┘
     ↓
┌─────────┐
│  User   │
│  - Store access token          │
│  - Navigate to home            │
│  - Receive push notifications  │
└─────────┘
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                               │
│                                                                  │
│  Layer 1: Rate Limiting                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Login: 5 attempts / 15 min                            │   │
│  │ • Register: 10 attempts / hour                          │   │
│  │ • Forgot Password: 3 attempts / hour                    │   │
│  │ • Prevents brute force attacks                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                        │
│  Layer 2: Input Validation                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Zod schema validation                                 │   │
│  │ • Email format check                                    │   │
│  │ • Password strength (min 8 chars, uppercase, etc.)      │   │
│  │ • NoSQL injection prevention                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                        │
│  Layer 3: Password Security                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Bcrypt hashing (12 rounds)                            │   │
│  │ • Salt per password                                     │   │
│  │ • Never stored in plain text                            │   │
│  │ • select: false in schema                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                        │
│  Layer 4: Email Verification                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • 6-digit OTP                                           │   │
│  │ • 10 minute TTL                                         │   │
│  │ • Required before login                                 │   │
│  │ • Prevents fake accounts                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                        │
│  Layer 5: JWT Tokens                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Access token: 15 min expiry                           │   │
│  │ • Refresh token: 7 days expiry                          │   │
│  │ • Token rotation on refresh                             │   │
│  │ • Token blacklisting on logout                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                        │
│  Layer 6: Session Security                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Redis session caching                                 │   │
│  │ • Session invalidation on password change               │   │
│  │ • Device tracking                                       │   │
│  │ • HTTP-only cookies                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│         ↓                                                        │
│  Layer 7: Account Security                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ • Account lockout (5 failed attempts)                   │   │
│  │ • Failed login tracking                                 │   │
│  │ • Soft delete support                                   │   │
│  │ • lastPasswordChange tracking                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

```
┌─────────────────────────────────────────────────────────────────┐
│                    MONGODB SCHEMA                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ users collection                                         │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ _id: ObjectId                                         │ │  │
│  │ │ profileId: ObjectId → userProfiles                    │ │  │
│  │ │ name: String                                          │ │  │
│  │ │ email: String (unique, indexed)                       │ │  │
│  │ │ password: String (hashed, select: false)              │ │  │
│  │ │ role: String (user, child, business, admin)           │ │  │
│  │ │ isEmailVerified: Boolean                              │ │  │
│  │ │ isDeleted: Boolean                                    │ │  │
│  │ │ createdAt: Date                                       │ │  │
│  │ │ updatedAt: Date                                       │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ userprofiles collection                                  │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ _id: ObjectId                                         │ │  │
│  │ │ userId: ObjectId → users                              │ │  │
│  │ │ acceptTOC: Boolean                                    │ │  │
│  │ │ location: String                                      │ │  │
│  │ │ dob: Date                                             │ │  │
│  │ │ gender: String                                        │ │  │
│  │ │ supportMode: String (calm, encouraging, logical)      │ │  │
│  │ │ notificationStyle: String (gentle, firm, neutral)     │ │  │
│  │ │ createdAt: Date                                       │ │  │
│  │ │ updatedAt: Date                                       │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ tokens collection                                        │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ _id: ObjectId                                         │ │  │
│  │ │ user: ObjectId → users                                │ │  │
│  │ │ token: String                                         │ │  │
│  │ │ type: String (access, refresh, verify, reset)         │ │  │
│  │ │ expiresAt: Date                                       │ │  │
│  │ │ verified: Boolean                                     │ │  │
│  │ │ createdAt: Date                                       │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ otps collection                                          │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ _id: ObjectId                                         │ │  │
│  │ │ email: String                                         │ │  │
│  │ │ otp: String (6 digits)                                │ │  │
│  │ │ type: String (verify, reset)                         │ │  │
│  │ │ expiresAt: Date                                       │ │  │
│  │ │ isUsed: Boolean                                       │ │  │
│  │ │ createdAt: Date                                       │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ userdevices collection                                   │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ _id: ObjectId                                         │ │  │
│  │ │ userId: ObjectId → users                              │ │  │
│  │ │ fcmToken: String                                      │ │  │
│  │ │ deviceType: String (web, ios, android)                │ │  │
│  │ │ deviceName: String                                    │ │  │
│  │ │ lastActive: Date                                      │ │  │
│  │ │ createdAt: Date                                       │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ oauthaccounts collection                                 │  │
│  │ ┌──────────────────────────────────────────────────────┐ │  │
│  │ │ _id: ObjectId                                         │ │  │
│  │ │ userId: ObjectId → users                              │ │  │
│  │ │ authProvider: String (google, apple)                  │ │  │
│  │ │ providerId: String                                    │ │  │
│  │ │ email: String                                         │ │  │
│  │ │ accessToken: String (encrypted)                       │ │  │
│  │ │ isVerified: Boolean                                   │ │  │
│  │ │ lastUsedAt: Date                                      │ │  │
│  │ │ createdAt: Date                                       │ │  │
│  │ └──────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 Redis Data Structures

```
┌─────────────────────────────────────────────────────────────────┐
│                    REDIS CACHE                                   │
│                                                                  │
│  Session Cache                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ KEY: session:<userId>:<fcmToken>                         │  │
│  │ VALUE: { userId, email, role, device, loginAt }          │  │
│  │ TTL: 604800 seconds (7 days)                             │  │
│  │                                                          │  │
│  │ Example:                                                 │  │
│  │ KEY: session:64f5a1b2c3d4e5f6g7h8i9j0:web                │  │
│  │ VALUE: {"userId":"64f5a1b2c3d4e5f6g7h8i9j0",...}         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  OTP Cache                                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ KEY: otp:email:<email>:<type>                            │  │
│  │ VALUE: <otp>                                             │  │
│  │ TTL: 600 seconds (10 minutes)                            │  │
│  │                                                          │  │
│  │ Example:                                                 │  │
│  │ KEY: otp:email:john@example.com:verify                   │  │
│  │ VALUE: 123456                                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Token Blacklist                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ KEY: blacklist:<token>                                   │  │
│  │ VALUE: "blacklisted"                                     │  │
│  │ TTL: Matches token expiry                                │  │
│  │                                                          │  │
│  │ Example:                                                 │  │
│  │ KEY: blacklist:eyJhbGciOiJIUzI1NiIs...                   │  │
│  │ VALUE: blacklisted                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Rate Limiting                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ KEY: ratelimit:<type>:<identifier>                       │  │
│  │ TYPE: Sorted Set                                         │  │
│  │                                                          │  │
│  │ Example:                                                 │  │
│  │ KEY: ratelimit:auth:ip:127.0.0.1                         │  │
│  │ MEMBERS: [timestamp1, timestamp2, ...]                   │  │
│  │ TTL: 900 seconds (15 minutes)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📡 API Endpoints Map

```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTH API ENDPOINTS                            │
│                                                                  │
│  Registration & Login                                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /auth/register           │ Register new user        │  │
│  │ POST /auth/register/v2        │ Register V2              │  │
│  │ POST /auth/login              │ Login                    │  │
│  │ POST /auth/login/v2           │ Login V2                 │  │
│  │ POST /auth/google-login       │ Google OAuth             │  │
│  │ POST /auth/google-login/v2    │ Google OAuth V2          │  │
│  │ POST /auth/google             │ Google callback          │  │
│  │ POST /auth/apple              │ Apple callback          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Email Verification                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /auth/verify-email       │ Verify email (OTP)       │  │
│  │ POST /auth/resend-otp         │ Resend OTP               │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Password Management                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /auth/forgot-password    │ Request reset            │  │
│  │ POST /auth/reset-password     │ Reset password           │  │
│  │ POST /auth/change-password    │ Change password (auth)   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Token Management                                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ POST /auth/refresh-auth       │ Refresh access token     │  │
│  │ POST /auth/logout             │ Logout                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Rate Limits                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /auth/register              │ 10 per hour                │  │
│  │ /auth/login                 │ 5 per 15 minutes           │  │
│  │ /auth/forgot-password       │ 3 per hour                 │  │
│  │ /auth/verify-email          │ 5 per hour                 │  │
│  │ /auth/* (other)             │ 100 per minute             │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference

### **File Structure**
```
auth/
├── auth.constants.ts       # Constants & config
├── auth.controller.ts      # HTTP handlers
├── auth.interface.ts       # TypeScript interfaces
├── auth.routes.ts          # Routes + rate limiters
├── auth.service.ts         # Business logic
├── auth.validations.ts     # Zod schemas
└── doc/
    ├── dia/                # Mermaid diagrams
    ├── perf/               # Performance reports
    ├── LEARN_AUTH_*.md     # Educational guides
    └── AUTH_*.md           # Documentation
```

### **Key Dependencies**
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `zod` - Validation
- `redis` - Session caching
- `mongoose` - MongoDB ODM

### **Environment Variables**
```bash
# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MongoDB
MONGODB_URI=mongodb://localhost:27017/task-mgmt

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
APPLE_CLIENT_ID=your-apple-client-id

# Encryption
OAUTH_ENCRYPTION_KEY=your-32-char-key
```

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
