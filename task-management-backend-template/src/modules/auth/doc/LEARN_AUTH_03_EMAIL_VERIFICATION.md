# 📧 Chapter 3: Email Verification Flow - Step by Step

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Beginner  
**Prerequisites**: Chapter 1 (Registration), Chapter 2 (Login)  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ Why email verification is critical for security
- ✅ How OTP generation works
- ✅ How verification tokens work
- ✅ The complete verification flow
- ✅ OTP validation process
- ✅ Token validation process
- ✅ User activation after verification

---

## 📊 Big Picture: Email Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 EMAIL VERIFICATION FLOW                          │
│                                                                  │
│  Scenario 1: After Registration                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. User registers                                        │  │
│  │ 2. System generates OTP + Verification Token             │  │
│  │ 3. System sends email with OTP                           │  │
│  │ 4. User receives email                                   │  │
│  │ 5. User enters OTP in app                                │  │
│  │ 6. System verifies OTP + Token                           │  │
│  │ 7. User account activated                                │  │
│  │ 8. User can now login                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Scenario 2: Login Without Verification                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 1. User tries to login                                   │  │
│  │ 2. System checks isEmailVerified                         │  │
│  │ 3. If false → Return error with OTP                      │  │
│  │ 4. User enters OTP                                       │  │
│  │ 5. System verifies OTP                                   │  │
│  │ 6. User account activated                                │  │
│  │ 7. Auto-login or redirect to login                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Why Email Verification?

### **Security Reasons:**

1. **Prevents Fake Accounts**
   ```
   Without Verification:
   - Attacker creates 1000 fake accounts
   - Spams your system
   - Abuses free trials
   - Manipulates ratings/reviews
   
   With Verification:
   - Each account needs valid email
   - Much harder to create bulk accounts
   - Reduces spam by 90%+
   ```

2. **Account Recovery**
   ```
   - Forgot password? → Email reset link
   - Account hacked? → Email notification
   - Need support? → Verify ownership via email
   ```

3. **Communication Channel**
   ```
   - Task notifications
   - Important updates
   - Security alerts
   - Marketing (with consent)
   ```

### **Business Reasons:**

1. **User Quality**: Verified users are more engaged
2. **Trust**: Users trust verified accounts more
3. **Compliance**: Some regulations require email verification
4. **Analytics**: Better user data for business decisions

---

## 📬 Step-by-Step: Email Verification Flow

### **Step 1: OTP Generation (During Registration)**

**File**: `src/modules/otp/otp.service.ts`

```typescript
import { OTP } from './otp.model';

const createVerificationEmailOtp = async (email: string) => {
  // Step 1: Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Example: "123456"
  
  // Step 2: Calculate expiry time (10 minutes from now)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  // Example: 2026-03-22T12:10:00Z
  
  // Step 3: Create OTP document in MongoDB
  await OTP.create({
    email,
    otp,
    type: 'verify',  // Verification OTP
    expiresAt,
    isUsed: false,
  });
  
  // Step 4: Send email asynchronously (via BullMQ)
  await emailQueue.add('send-verification-email', {
    email,
    otp,
    type: 'verify'
  });
  
  // Step 5: Return OTP (for response)
  return otp;
};
```

**OTP Schema:**

```typescript
const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['verify', 'reset'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// TTL index - auto-delete after expiry
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for fast lookups
otpSchema.index({ email: 1, type: 1 });

export const OTP = model('OTP', otpSchema);
```

**OTP Document Example:**

```json
{
  "_id": ObjectId("64f5a1b2c3d4e5f6g7h8i9j0"),
  "email": "john@example.com",
  "otp": "123456",
  "type": "verify",
  "expiresAt": ISODate("2026-03-22T12:10:00Z"),
  "isUsed": false,
  "createdAt": ISODate("2026-03-22T12:00:00Z"),
  "updatedAt": ISODate("2026-03-22T12:00:00Z")
}
```

**Security Features:**
- 6 digits = 1,000,000 combinations
- 10 minute TTL (Time To Live)
- One-time use only (`isUsed` flag)
- Auto-deleted after expiry (TTL index)

---

### **Step 2: Verification Token Creation**

**File**: `src/modules/token/token.service.ts`

```typescript
import jwt from 'jsonwebtoken';
import { Token } from './token.model';
import { TokenType } from './token.interface';

const createVerifyEmailToken = async (user) => {
  // Step 1: Create payload
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };
  
  // Step 2: Generate JWT token
  const verifyEmailToken = jwt.sign(
    payload,
    config.token.TokenSecret,
    { expiresIn: config.token.verifyEmailTokenExpiration }
  );
  // Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  
  // Step 3: Clean up old verification tokens
  await Token.deleteMany({ 
    user: user._id,
    type: TokenType.VERIFY 
  });
  
  // Step 4: Calculate expiry
  const expiresAt = getExpirationTime(config.token.verifyEmailTokenExpiration);
  // Example: 24 hours from now
  
  // Step 5: Store token in database
  await Token.create({
    token: verifyEmailToken,
    user: user._id,
    type: TokenType.VERIFY,
    expiresAt,
    verified: false,
  });
  
  // Step 6: Return token
  return verifyEmailToken;
};
```

**Verification Token Structure:**

```typescript
// JWT Payload
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "email": "john@example.com",
  "role": "user",
  "iat": 1678123456,  // Issued at
  "exp": 1678209856   // Expires (24 hours)
}

// Encoded Token
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NGY1YTFiMmMzZDRlNWY2ZzdoOGk5ajAiLCJlbWFpbCI6ImpvaG5AZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImlhdCI6MTY3ODEyMzQ1NiwiZXhwIjoxNjc4MjA5ODU2fQ.abc123...
```

**Token Schema:**

```typescript
const tokenSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  token: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['access', 'refresh', 'verify', 'reset'],
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  verified: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// TTL index
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for lookups
tokenSchema.index({ user: 1, type: 1 });

export const Token = model('Token', tokenSchema);
```

---

### **Step 3: Email Sending**

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
    subject: 'Verify Your Email Address',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; }
            .header { background: #4CAF50; color: white; padding: 20px; }
            .content { padding: 30px; }
            .otp { 
              font-size: 32px; 
              letter-spacing: 5px; 
              background: #f0f0f0;
              padding: 15px;
              text-align: center;
              margin: 20px 0;
            }
            .footer { color: #999; font-size: 12px; padding: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Task Management!</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p>Thank you for registering! Please use the following OTP to verify your email address:</p>
              
              <div class="otp">
                ${otp}
              </div>
              
              <p>This OTP is valid for <strong>10 minutes</strong>.</p>
              <p>If you didn't request this, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2026 Task Management. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
  
  // Send email
  await transporter.sendMail(mailOptions);
};
```

**Email Template Preview:**

```
┌─────────────────────────────────────────────────┐
│  Task Management                                │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Welcome to Task Management!                    │
│                                                 │
│  Hi there,                                      │
│                                                 │
│  Thank you for registering! Please use the      │
│  following OTP to verify your email address:    │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │          1 2 3 4 5 6                    │   │
│  │                                         │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  This OTP is valid for 10 minutes.              │
│                                                 │
│  If you didn't request this, please ignore      │
│  this email.                                    │
│                                                 │
│  ─────────────────────────────────────────────  │
│  © 2026 Task Management. All rights reserved.   │
└─────────────────────────────────────────────────┘
```

---

### **Step 4: Verification Endpoint**

**File**: `src/modules/auth/auth.routes.ts`

```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/validateRequest';
import { AuthValidation } from './auth.validations';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';

const router = Router();

const verifyEmailLimiter = rateLimiter('strict');  // 5 per hour

router.post(
  '/verify-email',
  verifyEmailLimiter,  // 🔒 Rate limiting: 5 per hour
  validateRequest(AuthValidation.verifyEmailValidationSchema),
  AuthController.verifyEmail,
);

export const AuthRoutes = router;
```

**Validation Schema:**

```typescript
// src/modules/auth/auth.validations.ts
const verifyEmailValidationSchema = z.object({
  body: z.object({
    email: z
      .string({
        required_error: 'Email is required.',
      })
      .email('Invalid email address.'),
    
    otp: z
      .string({
        required_error: 'OTP is required.',
      })
      .min(6, 'OTP must be 6 digits')
      .max(6, 'OTP must be 6 digits')
      .regex(/^\d+$/, 'OTP must contain only numbers'),
  }),
});
```

---

### **Step 5: Controller Processing**

**File**: `src/modules/auth/auth.controller.ts`

```typescript
const verifyEmail = catchAsync(async (req, res) => {
  // Step 1: Extract data from request
  const { email, token, otp } = req.body;
  
  // Step 2: Call service to verify email
  const result = await AuthService.verifyEmail(email, token, otp);
  
  // Step 3: Send response
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Email verified successfully',
    data: {
      result,
    },
    success: true,
  });
});
```

---

### **Step 6: Service Logic - verifyEmail**

**File**: `src/modules/auth/auth.service.ts`

```typescript
const verifyEmail = async (email: string, token: string, otp: string) => {
  // Step 1: Find user by email
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      'User not found'
    );
  }
  
  // Step 2: Verify JWT token
  await TokenService.verifyToken(
    token,
    config.token.TokenSecret,
    TokenType.VERIFY
  );
  
  // Step 3: Verify OTP
  await OtpService.verifyOTP(
    user.email,
    otp,
    OtpType.VERIFY
  );
  
  // Step 4: Mark email as verified
  user.isEmailVerified = true;
  await user.save();
  
  // Step 5: Generate JWT tokens for auto-login
  const tokens = await TokenService.accessAndRefreshToken(user);
  
  // Step 6: Return result
  return {
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
    tokens,
  };
};
```

---

### **Step 7: OTP Verification**

**File**: `src/modules/otp/otp.service.ts`

```typescript
const verifyOTP = async (
  email: string,
  otp: string,
  type: OtpType
) => {
  // Step 1: Find OTP in database
  const otpDoc = await OTP.findOne({
    email,
    otp,
    type,
    isUsed: false,
  });
  
  if (!otpDoc) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Invalid or expired OTP'
    );
  }
  
  // Step 2: Check if OTP is expired
  if (otpDoc.expiresAt < new Date()) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'OTP has expired. Please request a new one.'
    );
  }
  
  // Step 3: Mark OTP as used
  otpDoc.isUsed = true;
  await otpDoc.save();
  
  // Step 4: Delete OTP (cleanup)
  await OTP.deleteOne({ _id: otpDoc._id });
  
  return true;
};
```

**OTP Verification Flow:**

```
┌─────────────────────────────────────────────────┐
│  OTP Verification Process                       │
│                                                  │
│  1. Find OTP by:                                │
│     - email: "john@example.com"                 │
│     - otp: "123456"                             │
│     - type: "verify"                            │
│     - isUsed: false                             │
│                                                  │
│  2. Check expiry:                               │
│     - expiresAt > now?                          │
│     - If expired → Error                        │
│                                                  │
│  3. Mark as used:                               │
│     - isUsed = true                             │
│                                                  │
│  4. Delete OTP:                                 │
│     - Prevent reuse                             │
│                                                  │
│  5. Return success                              │
└─────────────────────────────────────────────────┘
```

---

### **Step 8: Token Verification**

**File**: `src/modules/token/token.service.ts`

```typescript
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
  
  // Step 7: Delete token (one-time use)
  await Token.deleteOne({ _id: storedToken._id });
  
  return decoded;
};
```

---

### **Step 9: User Activation**

After successful verification:

```typescript
// User document updated
{
  "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "user",
  "isEmailVerified": true,  // ✅ Changed from false to true
  "isDeleted": false,
  "updatedAt": "2026-03-22T12:05:00Z"  // Updated timestamp
}

// User can now:
// - Login successfully
// - Access all features
// - Receive notifications
// - Reset password if needed
```

---

## 🎯 Complete Flow Diagram

```
┌──────────┐
│  User    │
└────┬─────┘
     │ After Registration
     │ (Receives email with OTP)
     ↓
┌─────────────────────────────────────────────────┐
│  1. User Opens Email                           │
│  ┌───────────────────────────────────────────┐ │
│  │ Subject: Verify Your Email Address        │ │
│  │                                            │ │
│  │ Hi there,                                 │ │
│  │                                            │ │
│  │ Your OTP is: 123456                       │ │
│  │                                            │ │
│  │ Valid for 10 minutes.                     │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  2. User Enters OTP in App                     │
│  ┌───────────────────────────────────────────┐ │
│  │  Verify Your Email                        │ │
│  │                                            │ │
│  │  Email: john@example.com                  │ │
│  │                                            │ │
│  │  OTP: [1][2][3][4][5][6]                  │ │
│  │                                            │ │
│  │  [Verify Email]                           │ │
│  └───────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  3. POST /auth/verify-email                    │
│  {                                              │
│    "email": "john@example.com",                │
│    "token": "eyJhbGciOiJIUzI1NiIs...",         │
│    "otp": "123456"                             │
│  }                                              │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  4. Rate Limiter                               │
│  Check: 5 verifications per hour               │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  5. Validation (Zod)                           │
│  • Email format                                │
│  • OTP is 6 digits                             │
│  • OTP contains only numbers                   │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  6. AuthService.verifyEmail()                  │
│  • Find user by email                          │
│  • Verify JWT token                            │
│  • Verify OTP                                  │
│  • Mark isEmailVerified = true                 │
│  • Generate access/refresh tokens              │
└─────────────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────────────┐
│  7. Response                                   │
│  {                                              │
│    "success": true,                            │
│    "message": "Email verified successfully",   │
│    "data": {                                   │
│      "user": { _id, name, email, role },       │
│      "tokens": { accessToken, refreshToken }   │
│    }                                           │
│  }                                              │
└─────────────────────────────────────────────────┘
     ↓
┌──────────┐
│  User    │
│  - Email verified            │
│  - Auto-login                │
│  - Redirect to home          │
└──────────┘
```

---

## 🧪 Testing Email Verification

### **Test 1: Successful Verification**

```bash
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

### **Test 2: Invalid OTP**

```bash
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "999999"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

### **Test 3: Expired OTP**

```bash
# Wait 11 minutes after registration, then try to verify
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "123456"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "OTP has expired. Please request a new one."
}
```

---

### **Test 4: Already Used OTP**

```bash
# Try to use the same OTP twice
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "123456"
  }'

# Second time with same OTP
curl -X POST http://localhost:5000/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "123456"
  }'
```

**Expected Response (second time):**
```json
{
  "success": false,
  "message": "Invalid or expired OTP"
}
```

---

### **Test 5: Resend OTP**

```bash
curl -X POST http://localhost:5000/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Otp sent successfully",
  "data": {
    "verificationToken": "eyJhbGciOiJIUzI1NiIs...",
    "otp": "654321"  // New OTP
  }
}
```

---

## 🔍 Debugging Tips

### **Check MongoDB for OTP**

```bash
mongosh

# Find OTP
db.otps.findOne({ email: "john@example.com" })

# Check if OTP is expired
db.otps.find({
  email: "john@example.com",
  expiresAt: { $gt: new Date() }
})

# Check used OTPs
db.otps.find({
  email: "john@example.com",
  isUsed: true
})
```

### **Check Redis for OTP**

```bash
redis-cli

# Check OTP cache
GET otp:email:john@example.com:verify

# Check TTL
TTL otp:email:john@example.com:verify
# Expected: ~600 (10 minutes)
```

### **Check User Verification Status**

```bash
mongosh

# Find user
db.users.findOne({ email: "john@example.com" })

# Check isEmailVerified field
db.users.findOne(
  { email: "john@example.com" },
  { projection: { email: 1, isEmailVerified: 1 } }
)
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Why Email Verification**: Security, account recovery, communication
2. ✅ **OTP Generation**: 6 digits, 10 min TTL, one-time use
3. ✅ **Verification Token**: JWT with 24 hour expiry
4. ✅ **Email Sending**: HTML template with OTP
5. ✅ **Verification Endpoint**: Rate limited, validated
6. ✅ **OTP Verification**: Find, check expiry, mark used, delete
7. ✅ **Token Verification**: Verify JWT, check DB, mark verified, delete
8. ✅ **User Activation**: Set isEmailVerified = true
9. ✅ **Auto-Login**: Generate tokens after verification

### **Key Files:**

| File | Purpose |
|------|---------|
| `otp.service.ts` | OTP generation and verification |
| `otp.model.ts` | OTP schema |
| `token.service.ts` | Verification token |
| `emailService.ts` | Email sending |
| `auth.service.ts` | verifyEmail function |
| `auth.controller.ts` | Verification endpoint |

### **Security Features:**

- ✅ 6-digit OTP (1,000,000 combinations)
- ✅ 10 minute TTL
- ✅ One-time use only
- ✅ Rate limiting (5 per hour)
- ✅ JWT token verification
- ✅ Auto-delete after use

### **Next Chapter:**

→ [Chapter 4: JWT Token System](./LEARN_AUTH_04_JWT_TOKENS.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
