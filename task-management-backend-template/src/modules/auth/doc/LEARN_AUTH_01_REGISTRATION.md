# 📝 Chapter 1: Registration Flow - Step by Step

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Beginner  
**Prerequisites**: None  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ How a user registration request flows through the system
- ✅ Every layer: Route → Controller → Service → Database
- ✅ How UserProfile is created
- ✅ How OTP is generated and sent
- ✅ How validation works
- ✅ How error handling works

---

## 📊 Big Picture: Registration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER REGISTRATION FLOW                        │
│                                                                  │
│  Client (Flutter/Web)                                           │
│         ↓                                                        │
│  1. POST /auth/register                                          │
│     { name, email, password, role, acceptTOC }                  │
│         ↓                                                        │
│  2. Rate Limiter (10 per hour)                                  │
│         ↓                                                        │
│  3. Validation (Zod Schema)                                     │
│         ↓                                                        │
│  4. AuthController.register()                                    │
│         ↓                                                        │
│  5. AuthService.createUser()                                     │
│         ↓                                                        │
│  6. Create UserProfile (acceptTOC: true)                        │
│         ↓                                                        │
│  7. Hash Password (bcrypt, 12 rounds)                           │
│         ↓                                                        │
│  8. Create User (email, password, role, profileId)              │
│         ↓                                                        │
│  9. Create OTP (6 digits, 10 min TTL)                           │
│         ↓                                                        │
│  10. Send Email (async via BullMQ)                              │
│         ↓                                                        │
│  11. Return Response                                             │
│     { user, verificationToken, otp }                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Step-by-Step Deep Dive

### **Step 1: Client Sends Registration Request**

**File**: `Flutter/Web Client`

```typescript
// Client-side code (Flutter/Dart example)
final response = await http.post(
  Uri.parse('http://localhost:5000/auth/register'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({
    'name': 'John Doe',
    'email': 'john@example.com',
    'password': 'SecurePass123!',
    'role': 'user',  // or 'child', 'business'
    'acceptTOC': true,  // Accept Terms of Conditions
  }),
);

// Expected Response: 201 Created
{
  "success": true,
  "message": "Account created successfully, Please verify your email",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "verificationToken": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "123456"  // FIXME: Will be removed (sent via email)
  }
}
```

**What's happening:**
- Client sends HTTP POST request to `/auth/register`
- Request body contains user information
- Server will process this request through multiple layers

---

### **Step 2: Route Handling**

**File**: `src/modules/auth/auth.routes.ts`

```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';

const router = Router();

// ─── Rate Limiter Definition ─────────────────────────────────
/**
 * Rate limit: 10 registrations per hour per IP
 * Prevents spam registrations
 */
const registerLimiter = rateLimiter('strict');  // 3 per hour (strict)

// ─── Registration Route ──────────────────────────────────────
router.post(
  '/register',
  registerLimiter,  // 🔒 Rate limiting: 10 per hour
  AuthController.register,  // Controller method
);

export const AuthRoutes = router;
```

**What's happening:**
1. Request hits the `/register` route
2. `registerLimiter` middleware checks rate limit
3. If limit exceeded → Return 429 Too Many Requests
4. If limit OK → Pass to `AuthController.register`

**Rate Limiting Details:**
```typescript
// From src/middlewares/rateLimiterRedis.ts
const RATE_LIMIT_PRESETS = {
  strict: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 3,                     // 3 requests
    message: 'Too many registration attempts'
  }
}
```

---

### **Step 3: Input Validation (Zod Schema)**

**File**: `src/modules/auth/auth.validations.ts`

```typescript
import { z } from 'zod';

// Registration validation schema
const registerValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(2, 'Name must be at least 2 characters'),
    
    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Invalid email address'),
    
    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number'
      ),
    
    role: z
      .enum(['user', 'child', 'business'], {
        required_error: 'Role is required',
      }),
    
    acceptTOC: z
      .boolean({
        required_error: 'You must accept Terms and Conditions',
      }),
  }),
});

export const AuthValidation = {
  registerValidationSchema,
  // ... other validations
};
```

**What's happening:**
- Zod validates the request body
- Checks data types, formats, and constraints
- If validation fails → Return 400 Bad Request
- If validation passes → Continue to controller

**Example Validation Errors:**
```json
// Missing email
{
  "success": false,
  "message": "Email is required"
}

// Invalid email format
{
  "success": false,
  "message": "Invalid email address"
}

// Password too short
{
  "success": false,
  "message": "Password must be at least 8 characters"
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
import { ICreateUser, IRegisterData } from './auth.interface';
import { UserProfile } from '../user.module/userProfile/userProfile.model';

const register = catchAsync(async (req, res) => {
  // Step 1: Extract data from request
  const data: IRegisterData = req.body;

  // Step 2: Check if user accepted Terms of Conditions
  if (!data.acceptTOC) {
    return sendResponse(res, {
      code: StatusCodes.CREATED,
      message: 'Please Read Terms and Conditions and Accept it.',
      data: null,
      success: true,
    });
  }

  // Step 3: Create UserProfile
  const userProfile = await UserProfile.create({
    acceptTOC: data.acceptTOC,
  });

  // Step 4: Prepare user data object
  const userDTO: ICreateUser = {
    name: data.name,
    email: req.body.email,
    password: req.body.password,
    role: data.role,
    profileId: userProfile._id,  // Link profile to user
  };

  // Step 5: Call service to create user
  const result = await AuthService.createUser(userDTO, userProfile._id);

  // Step 6: Send response to client
  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: 'Account created successfully, Please verify your email',
    data: result,
    success: true,
  });
});

export const AuthController = {
  register,
  // ... other methods
};
```

**What's happening:**
1. Extract request data
2. Check if user accepted Terms & Conditions
3. Create UserProfile document
4. Prepare User DTO (Data Transfer Object)
5. Call `AuthService.createUser()`
6. Format and send response

**Why Two Documents?**
- `UserProfile`: Stores profile-specific data (preferences, settings)
- `User`: Stores authentication data (email, password, role)
- This separation allows better organization and scalability

---

### **Step 5: Service Logic - createUser**

**File**: `src/modules/auth/auth.service.ts`

```typescript
import bcryptjs from 'bcryptjs';
import { User } from '../user.module/user/user.model';
import { TokenService } from '../token/token.service';
import { OtpService } from '../otp/otp.service';
import { ICreateUser } from './auth.interface';

const createUser = async (userData: ICreateUser, userProfileId: string) => {
  
  // Step 1: Check if user already exists
  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      // Email already registered and verified
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Email already taken'
      );
    } else {
      // Email exists but not verified - update and resend verification
      await User.findOneAndUpdate({ email: userData.email }, userData);

      const verificationToken = await TokenService.createVerifyEmailToken(existingUser);
      await OtpService.createVerificationEmailOtp(existingUser.email);
      
      return { verificationToken };
    }
  }

  // Step 2: Hash password (12 rounds of bcrypt)
  userData.password = await bcryptjs.hash(userData.password, 12);

  // Step 3: Create user in database
  const user = await User.create(userData);

  // Step 4: Emit event to update userProfile with userId
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId,
    userId: user._id
  });

  // Step 5: Create verification token and OTP
  const [verificationToken, otp] = await Promise.all([
    TokenService.createVerifyEmailToken(user),
    OtpService.createVerificationEmailOtp(user.email)
  ]);

  // Step 6: Return result
  return { user, verificationToken, otp };
};
```

**What's happening:**
1. Check if email already exists
2. If exists and verified → Throw error
3. If exists but not verified → Update and resend verification
4. Hash password with bcrypt (12 rounds)
5. Create user document
6. Link userProfile to user
7. Generate verification token and OTP
8. Return result to controller

---

### **Step 6: Password Hashing Deep Dive**

**File**: `bcryptjs` library

```typescript
// Before hashing
const plainPassword = 'SecurePass123!';

// Hashing process
const saltRounds = 12;
const hashedPassword = await bcryptjs.hash(plainPassword, saltRounds);

// Result (example)
// $2a$12$KIXxKzN8vPqR7zJ9mH5LxOqY3vZ8wN2pQ4rT6sU8vW0xY2zA4bC6d

// Password verification
const isValid = await bcryptjs.compare(plainPassword, hashedPassword);
// Returns: true if password matches
```

**Why 12 Rounds?**
- More rounds = more secure but slower
- 12 rounds takes ~250ms per hash
- Makes brute force attacks expensive
- Industry standard for password hashing

**Hash Structure:**
```
$2a$12$KIXxKzN8vPqR7zJ9mH5LxOqY3vZ8wN2pQ4rT6sU8vW0xY2zA4bC6d
│   │   │
│   │   └─ Hash (22 characters)
│   └─ Cost factor (12 rounds)
└─ Algorithm (2a = bcrypt)
```

---

### **Step 7: User Model Structure**

**File**: `src/modules/user.module/user/user.model.ts`

```typescript
import { model, Schema } from 'mongoose';

const userSchema = new Schema({
  // Link to UserProfile
  profileId: {
    type: Schema.Types.ObjectId,
    ref: 'UserProfile',
    required: true,
  },

  // Basic information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    unique: true,  // No duplicate emails
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
  },

  role: {
    type: String,
    enum: ['user', 'child', 'business', 'admin'],
    required: [true, 'Role is required'],
  },

  // Authentication
  password: {
    type: String,
    required: false,  // Optional for OAuth users
    select: false,    // Never return in queries by default
    minlength: [8, 'Password must be at least 8 characters'],
  },

  // Email verification
  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  // Account status
  isDeleted: {
    type: Boolean,
    default: false,
  },

  // Timestamps (automatic)
}, {
  timestamps: true,  // Adds createdAt, updatedAt
});

// Indexes for performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, isDeleted: 1 });

export const User = model('User', userSchema);
```

**Key Points:**
- `profileId`: Links to UserProfile document
- `email`: Unique, lowercase, validated
- `password`: Never returned in queries (`select: false`)
- `isEmailVerified`: Tracks verification status
- `isDeleted`: Soft delete support
- Indexes: Speed up queries

---

### **Step 8: UserProfile Model**

**File**: `src/modules/user.module/userProfile/userProfile.model.ts`

```typescript
import { model, Schema } from 'mongoose';

const userProfileSchema = new Schema({
  // Terms acceptance
  acceptTOC: {
    type: Boolean,
    required: [true, 'Must accept Terms of Conditions'],
  },

  // Personal information
  location: String,
  dob: Date,  // Date of birth
  gender: String,

  // Preferences
  supportMode: {
    type: String,
    enum: ['calm', 'encouraging', 'logical'],
    default: 'calm',
  },

  notificationStyle: {
    type: String,
    enum: ['gentle', 'firm', 'neutral'],
    default: 'gentle',
  },

  // Link to User (added after user creation)
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false,
  },

}, {
  timestamps: true,
});

export const UserProfile = model('UserProfile', userProfileSchema);
```

**Why Separate Profile?**
- Separation of concerns (auth vs profile)
- Different access patterns
- Easier to extend
- Better for scalability

---

### **Step 9: OTP Generation**

**File**: `src/modules/otp/otp.service.ts`

```typescript
import { OTP } from './otp.model';

const createVerificationEmailOtp = async (email: string) => {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Example: "123456"

  // Calculate expiry (10 minutes from now)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Create OTP document
  await OTP.create({
    email,
    otp,
    type: 'verify',  // Verification OTP
    expiresAt,
  });

  // Send email (async via BullMQ)
  await emailQueue.add('send-verification-email', {
    email,
    otp,
    type: 'verify'
  });

  return otp;
};
```

**OTP Structure:**
```typescript
// OTP Document in MongoDB
{
  _id: ObjectId("..."),
  email: "john@example.com",
  otp: "123456",
  type: "verify",
  expiresAt: Date(2026-03-22T12:00:00Z),
  isUsed: false,
  createdAt: Date(2026-03-22T11:50:00Z),
  updatedAt: Date(2026-03-22T11:50:00Z)
}
```

**Security Features:**
- 6 digits = 1,000,000 combinations
- 10 minute TTL (Time To Live)
- One-time use only
- Automatically deleted after expiry

---

### **Step 10: Email Sending (Async)**

**File**: `src/helpers/emailService.ts`

```typescript
import nodemailer from 'nodemailer';

// Configure email transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send verification email
const sendVerificationEmail = async (email: string, otp: string) => {
  const mailOptions = {
    from: 'Task Management <noreply@taskmgmt.com>',
    to: email,
    subject: 'Verify Your Email',
    html: `
      <h1>Welcome to Task Management!</h1>
      <p>Please use the following OTP to verify your email:</p>
      <h2 style="font-size: 24px; letter-spacing: 5px;">${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};
```

**Why Async?**
- Email sending can take 1-5 seconds
- Don't block the registration response
- Use BullMQ queue for reliability
- Retry failed emails automatically

---

### **Step 11: Response to Client**

**File**: `src/shared/sendResponse.ts`

```typescript
import { Response } from 'express';

interface IApiResponse<T> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

const sendResponse = <T>(res: Response, data: IApiResponse<T>) => {
  res.status(data.code).json({
    success: data.success,
    message: data.message,
    data: data.data,
  });
};

export default sendResponse;
```

**Final Response Example:**
```json
{
  "success": true,
  "message": "Account created successfully, Please verify your email",
  "data": {
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false
    },
    "verificationToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "otp": "123456"  // FIXME: Will be removed (sent via email only)
  }
}
```

**Response Codes:**
- `201 Created`: Registration successful
- `400 Bad Request`: Validation error or email exists
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

## 🎯 Complete Flow Diagram

```
┌──────────┐
│  Client  │
└────┬─────┘
     │ 1. POST /auth/register
     │    { name, email, password, role, acceptTOC }
     ↓
┌─────────────────────────────────────────┐
│  Express Server                         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 2. Rate Limiter                   │ │
│  │    - Check: 10 per hour           │ │
│  │    - Pass or 429 error            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 3. Validation (Zod)               │ │
│  │    - Check email format           │ │
│  │    - Check password strength      │ │
│  │    - Check role is valid          │ │
│  │    - Check acceptTOC = true       │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 4. AuthController.register()      │ │
│  │    - Create UserProfile           │ │
│  │    - Prepare user DTO             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 5. AuthService.createUser()       │ │
│  │    - Check email exists           │ │
│  │    - Hash password (bcrypt)       │ │
│  │    - Create User document         │ │
│  │    - Link UserProfile             │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 6. TokenService                   │ │
│  │    - Create verification token    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 7. OtpService                     │ │
│  │    - Generate 6-digit OTP         │ │
│  │    - Store in MongoDB (10 min)    │ │
│  │    - Send email (BullMQ)          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ 8. sendResponse()                 │ │
│  │    - Format response              │ │
│  │    - Return 201 Created           │ │
│  └───────────────────────────────────┘ │
└────┬────────────────────────────────────┘
     │
     │ Response:
     │ {
     │   success: true,
     │   message: "Account created...",
     │   data: { user, verificationToken, otp }
     │ }
     ↓
┌──────────┐
│  Client  │
│  - Save tokens              │
│  - Show "Check your email"  │
│  - Redirect to verify page  │
└──────────┘
```

---

## 🧪 Testing the Registration Flow

### **Test 1: Successful Registration**

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "role": "user",
    "acceptTOC": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Account created successfully, Please verify your email",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "verificationToken": "...",
    "otp": "123456"
  }
}
```

---

### **Test 2: Email Already Exists**

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",  // Same email as before
    "password": "SecurePass123!",
    "role": "user",
    "acceptTOC": true
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Email already taken"
}
```

---

### **Test 3: Validation Error (Weak Password)**

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john2@example.com",
    "password": "123",  // Too short
    "role": "user",
    "acceptTOC": true
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters"
}
```

---

### **Test 4: Rate Limit Exceeded**

```bash
# Run 4 times quickly
for i in {1..4}; do
  curl -X POST http://localhost:5000/auth/register \
    -H "Content-Type: application/json" \
    -d "{
      \"name\": \"User $i\",
      \"email\": \"user$i@example.com\",
      \"password\": \"SecurePass123!\",
      \"role\": \"user\",
      \"acceptTOC\": true
    }"
  echo ""
done
```

**Expected Response (4th request):**
```json
{
  "success": false,
  "message": "Too many registration attempts, please try again later",
  "retryAfter": "3600"  // Try again after 1 hour
}
```

---

## 🔍 Debugging Tips

### **Check MongoDB**

```bash
# Connect to MongoDB
mongosh

# Check if user was created
db.users.findOne({ email: "john@example.com" })

# Check if profile was created
db.userprofiles.findOne({ userId: ObjectId("...") })

# Check OTP
db.otps.findOne({ email: "john@example.com" })
```

### **Check Redis**

```bash
# Connect to Redis
redis-cli

# Check rate limit counter
KEYS ratelimit:strict:ip:*

# Check OTP cache
GET otp:email:john@example.com:verify
```

### **Check Logs**

```bash
# Server logs should show:
[INFO] Registration request received: john@example.com
[INFO] UserProfile created: 64f5a1b2c3d4e5f6g7h8i9j0
[INFO] User created: 64f5a1b2c3d4e5f6g7h8i9j1
[INFO] OTP generated and email sent
[INFO] Registration completed successfully
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Route Layer**: Rate limiting, route definition
2. ✅ **Validation Layer**: Zod schema validation
3. ✅ **Controller Layer**: Request handling, response formatting
4. ✅ **Service Layer**: Business logic, user creation
5. ✅ **Model Layer**: User and UserProfile schemas
6. ✅ **Security**: Password hashing, OTP generation
7. ✅ **Integration**: Email service, token service
8. ✅ **Testing**: Manual testing with curl

### **Key Files:**

| File | Purpose |
|------|---------|
| `auth.routes.ts` | Route definition, rate limiting |
| `auth.validations.ts` | Zod validation schemas |
| `auth.controller.ts` | HTTP request handling |
| `auth.service.ts` | Business logic |
| `user.model.ts` | User schema |
| `userProfile.model.ts` | Profile schema |
| `otp.service.ts` | OTP generation |
| `token.service.ts` | Token creation |

### **Next Chapter:**

→ [Chapter 2: Login Flow - Step by Step](./LEARN_AUTH_02_LOGIN.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
