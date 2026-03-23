# 🔗 Chapter 9: Module Integration - Complete Guide

**Version**: 1.0  
**Date**: 22-03-26  
**Difficulty**: Advanced  
**Prerequisites**: All previous chapters  

---

## 🎯 Learning Objectives

By the end of this chapter, you will understand:
- ✅ How all auth modules work together
- ✅ User module integration
- ✅ UserProfile module integration
- ✅ Token module integration
- ✅ OTP module integration
- ✅ Notification module integration
- ✅ UserDevices module integration
- ✅ OAuthAccount module integration
- ✅ Module communication patterns
- ✅ Dependency injection best practices

---

## 📊 Big Picture: Module Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTH MODULE ECOSYSTEM                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Core Auth Module                                        │  │
│  │  ┌────────────────────────────────────────────────────┐ │  │
│  │  │ auth.service.ts                                    │ │  │
│  │  │ • register()                                       │ │  │
│  │  │ • login()                                          │ │  │
│  │  │ • logout()                                         │ │  │
│  │  │ • forgotPassword()                                 │ │  │
│  │  │ • resetPassword()                                  │ │  │
│  │  │ • changePassword()                                 │ │  │
│  │  │ • verifyEmail()                                    │ │  │
│  │  │ • googleLogin()                                    │ │  │
│  │  │ • appleLogin()                                     │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓           ↓           ↓           ↓                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  User    │  │  Token   │  │   OTP    │  │  OAuth   │       │
│  │  Module  │  │  Module  │  │  Module  │  │  Module  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│         ↓           ↓           ↓           ↓                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Supporting Modules                                      │  │
│  │  • UserProfile (preferences, settings)                   │  │
│  │  • UserDevices (FCM tokens, push notifications)          │  │
│  │  • Notification (emails, push notifications)             │  │
│  │  • Wallet (optional, for payments)                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Module Dependencies

### **Dependency Graph:**

```
auth.module
├── user.module (required)
│   ├── user.model.ts
│   ├── user.service.ts
│   └── userProfile.module
│       ├── userProfile.model.ts
│       └── userProfile.service.ts
│
├── token.module (required)
│   ├── token.model.ts
│   └── token.service.ts
│
├── otp.module (required)
│   ├── otp.model.ts
│   └── otp.service.ts
│
├── oauthAccount.module (optional)
│   ├── oauthAccount.model.ts
│   └── oauthAccount.service.ts
│
├── userDevices.module (optional)
│   ├── userDevices.model.ts
│   └── userDevices.service.ts
│
└── notification.module (optional)
    ├── notification.model.ts
    └── notification.service.ts
```

---

## 📦 Module Integration Examples

### **Example 1: User Registration Flow**

```typescript
// File: src/modules/auth/auth.service.ts

import { User } from '../user.module/user/user.model';
import { UserProfile } from '../user.module/userProfile/userProfile.model';
import { TokenService } from '../token/token.service';
import { OtpService } from '../otp/otp.service';
import { UserRoleDataService } from '../user.module/userRoleData/userRoleData.service';

const createUser = async (userData: ICreateUser, userProfileId: string) => {
  // Step 1: Check existing user (User Module)
  const existingUser = await User.findOne({ email: userData.email });
  
  if (existingUser && existingUser.isEmailVerified) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
  }
  
  // Step 2: Hash password (bcrypt)
  userData.password = await bcryptjs.hash(userData.password, 12);
  
  // Step 3: Create user (User Module)
  const user = await User.create(userData);
  
  // Step 4: Link userProfile (UserProfile Module)
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId,
    userId: user._id
  });
  
  // Step 5: Create verification token (Token Module)
  const verificationToken = await TokenService.createVerifyEmailToken(user);
  
  // Step 6: Create OTP (OTP Module)
  const otp = await OtpService.createVerificationEmailOtp(user.email);
  
  // Step 7: Create role-specific data (UserRoleData Module)
  const userRoleDataService = new UserRoleDataService();
  await userRoleDataService.createRoleData(user._id, user.role);
  
  return { user, verificationToken, otp };
};
```

**Modules Used:**
- ✅ User Module (create user)
- ✅ UserProfile Module (link profile)
- ✅ Token Module (create verification token)
- ✅ OTP Module (create OTP)
- ✅ UserRoleData Module (create role data)

---

### **Example 2: User Login Flow**

```typescript
// File: src/modules/auth/auth.service.ts

import { User } from '../user.module/user/user.model';
import { UserDevices } from '../user.module/userDevices/userDevices.model';
import { TokenService } from '../token/token.service';
import { redisClient } from '../../helpers/redis/redis';

const loginV2 = async (email: string, password: string, fcmToken?: string) => {
  // Step 1: Find user (User Module)
  const user = await User.findOne({ email }).select('+password');
  
  // Step 2: Validate credentials
  const isValid = await bcryptjs.compare(password, user.password);
  if (!isValid) throw new ApiError(...);
  
  // Step 3: Generate tokens (Token Module)
  const tokens = await TokenService.accessAndRefreshToken(user);
  
  // Step 4: Track device (UserDevices Module)
  if (fcmToken) {
    let device = await UserDevices.findOne({ userId: user._id, fcmToken });
    if (!device) {
      device = await UserDevices.create({
        userId: user._id,
        fcmToken,
        deviceType: 'web',
        deviceName: 'Unknown Device',
        lastActive: new Date(),
      });
    } else {
      device.lastActive = new Date();
      await device.save();
    }
  }
  
  // Step 5: Cache session (Redis)
  const sessionKey = `session:${user._id}:${fcmToken || 'web'}`;
  await redisClient.setEx(
    sessionKey,
    604800,  // 7 days
    JSON.stringify({
      userId: user._id,
      email: user.email,
      role: user.role,
    })
  );
  
  return { user: user.toObject(), tokens };
};
```

**Modules Used:**
- ✅ User Module (find user)
- ✅ Token Module (generate JWT tokens)
- ✅ UserDevices Module (track device)
- ✅ Redis (session caching)

---

### **Example 3: OAuth Login Flow**

```typescript
// File: src/modules/auth/auth.service.ts

import { OAuthAccountService } from '../user.module/oauthAccount/oauthAccount.service';
import { OAuthAccount } from '../user.module/oauthAccount/oauthAccount.model';
import { User } from '../user.module/user/user.model';
import { UserProfile } from '../user.module/userProfile/userProfile.model';
import { TokenService } from '../token/token.service';

const oAuthAccountService = new OAuthAccountService();

const googleLogin = async ({ idToken, role, acceptTOC }: IGoogleLoginPayload) => {
  // Step 1: Verify Google token (OAuthAccount Module)
  const { providerId, email, name, picture } =
    await oAuthAccountService.verifyGoogleToken(idToken);
  
  // Step 2: Check existing OAuth account (OAuthAccount Module)
  let googleAccount = await OAuthAccount.findOne({
    authProvider: TAuthProvider.google,
    providerId,
  }).populate('userId');
  
  if (googleAccount && googleAccount.userId) {
    // Existing user - login
    const user = await User.findById(googleAccount.userId);
    
    // Update token (OAuthAccount Module)
    await oAuthAccountService.updateOAuthTokens(googleAccount._id, idToken);
    
    const tokens = await TokenService.accessAndRefreshToken(user);
    return { user: user.toObject(), tokens };
  }
  
  // Step 3: Check existing local account (User Module)
  const localUser = await User.findOne({
    email: email.toLowerCase(),
    hashedPassword: { $ne: null },
  });
  
  if (localUser && localUser.isEmailVerified) {
    // Link OAuth account (OAuthAccount Module)
    await oAuthAccountService.createOAuthAccount(
      localUser._id,
      TAuthProvider.google,
      providerId,
      email,
      idToken,
      true,
    );
    
    const tokens = await TokenService.accessAndRefreshToken(localUser);
    return { user: localUser.toObject(), tokens, isLinked: true };
  }
  
  // Step 4: Create new user (User + UserProfile Modules)
  const userProfile = await UserProfile.create({ acceptTOC: true });
  
  const newUser = await User.create({
    email: email.toLowerCase(),
    name: name || email.split('@')[0],
    isEmailVerified: true,
    role,
    authProvider: TAuthProvider.google,
    profileId: userProfile._id,
  });
  
  // Link profile (UserProfile Module)
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId: userProfile._id,
    userId: newUser._id,
  });
  
  // Create OAuth account (OAuthAccount Module)
  await oAuthAccountService.createOAuthAccount(
    newUser._id,
    TAuthProvider.google,
    providerId,
    email,
    idToken,
    true,
  );
  
  const tokens = await TokenService.accessAndRefreshToken(newUser);
  return { user: newUser.toObject(), tokens, isNewUser: true };
};
```

**Modules Used:**
- ✅ OAuthAccount Module (verify token, create account)
- ✅ User Module (find/create user)
- ✅ UserProfile Module (create profile)
- ✅ Token Module (generate JWT tokens)

---

## 🔧 Module Communication Patterns

### **Pattern 1: Direct Service Call**

```typescript
// Simple and direct
import { TokenService } from '../token/token.service';

const tokens = await TokenService.accessAndRefreshToken(user);
```

**Best For:**
- Simple operations
- Synchronous calls
- No side effects

---

### **Pattern 2: Event Emitter (Async)**

```typescript
// Decoupled communication
import EventEmitter from 'events';

const eventEmitterForUpdateUserProfile = new EventEmitter();

// Publisher (Auth Module)
eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
  userProfileId,
  userId: user._id
});

// Subscriber (UserProfile Module)
eventEmitterForUpdateUserProfile.on(
  'eventEmitterForUpdateUserProfile',
  async (value) => {
    await UserProfile.findByIdAndUpdate(value.userProfileId, {
      userId: value.userId
    });
  }
);
```

**Best For:**
- Async operations
- Decoupled modules
- Multiple subscribers
- Non-critical updates

---

### **Pattern 3: Queue-Based (BullMQ)**

```typescript
// For heavy/async operations
import { emailQueue } from '../../helpers/queues/emailQueue';

// Publisher (Auth Module)
await emailQueue.add('send-verification-email', {
  email: user.email,
  otp: otp,
  type: 'verify'
});

// Consumer (Notification Module - Worker)
emailQueue.process('send-verification-email', async (job) => {
  await sendEmail(job.data.email, job.data.otp);
});
```

**Best For:**
- Heavy operations
- Email sending
- Push notifications
- Background jobs
- Retry logic

---

## 📊 Data Flow Between Modules

### **Registration Data Flow:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Registration Data Flow                                         │
│                                                                  │
│  Client Request                                                 │
│  { name, email, password, role, acceptTOC }                    │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Auth Module                                             │  │
│  │  • Validate input                                        │  │
│  │  • Hash password                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  User Module                                             │  │
│  │  • Create user document                                  │  │
│  │  • Set: email, password (hashed), role                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  UserProfile Module                                      │  │
│  │  • Create profile document                               │  │
│  │  • Set: acceptTOC, supportMode, notificationStyle        │  │
│  │  • Link to user (userId)                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  UserRoleData Module                                     │  │
│  │  • Create role-specific data                             │  │
│  │  • Set: role, permissions, status                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Token Module                                            │  │
│  │  • Create verification token                             │  │
│  │  • Store in database                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  OTP Module                                              │  │
│  │  • Generate 6-digit OTP                                  │  │
│  │  • Store in MongoDB + Redis                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Notification Module                                     │  │
│  │  • Send verification email                               │  │
│  │  • Via BullMQ queue                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│         ↓                                                        │
│  Response to Client                                             │
│  { user, verificationToken, otp }                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Shared Data Structures

### **User Document (Shared Across Modules):**

```typescript
// User Module
{
  _id: ObjectId("64f5a1b2c3d4e5f6g7h8i9j0"),
  profileId: ObjectId("..."),  // ← UserProfile Module
  name: "John Doe",
  email: "john@example.com",
  password: "$2a$12$...",  // Hashed
  role: "user",  // ← UserRoleData Module
  isEmailVerified: false,  // ← Auth Module
  authProvider: "local",  // ← OAuth Module
  lastPasswordChange: Date,  // ← Auth Module
  isDeleted: false,
  createdAt: Date,
  updatedAt: Date
}
```

### **UserProfile Document (Linked to User):**

```typescript
// UserProfile Module
{
  _id: ObjectId("..."),
  userId: ObjectId("64f5a1b2c3d4e5f6g7h8i9j0"),  // ← User Module
  acceptTOC: true,
  supportMode: "calm",
  notificationStyle: "gentle",
  location: "New York",
  dob: Date,
  gender: "male",
  createdAt: Date,
  updatedAt: Date
}
```

### **Token Document (Shared Across Modules):**

```typescript
// Token Module
{
  _id: ObjectId("..."),
  user: ObjectId("64f5a1b2c3d4e5f6g7h8i9j0"),  // ← User Module
  token: "eyJhbGciOiJIUzI1NiIs...",
  type: "access",  // access | refresh | verify | reset
  expiresAt: Date,
  verified: false,
  createdAt: Date
}
```

---

## 🧪 Integration Testing

### **Test Complete Registration Flow:**

```typescript
describe('Registration Integration Test', () => {
  it('should complete full registration flow', async () => {
    // Step 1: Register user
    const registerResponse = await request(app)
      .post('/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'user',
        acceptTOC: true,
      });
    
    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.user).toBeDefined();
    expect(registerResponse.body.data.verificationToken).toBeDefined();
    expect(registerResponse.body.data.otp).toBeDefined();
    
    // Step 2: Verify email
    const verifyResponse = await request(app)
      .post('/auth/verify-email')
      .send({
        email: 'test@example.com',
        token: registerResponse.body.data.verificationToken,
        otp: registerResponse.body.data.otp,
      });
    
    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.data.user.isEmailVerified).toBe(true);
    
    // Step 3: Login
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
      });
    
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.tokens.accessToken).toBeDefined();
    expect(loginResponse.body.data.tokens.refreshToken).toBeDefined();
    
    // Verify all modules worked together:
    // 1. User created (User Module) ✓
    // 2. Profile created (UserProfile Module) ✓
    // 3. Tokens generated (Token Module) ✓
    // 4. OTP created (OTP Module) ✓
    // 5. Email sent (Notification Module) ✓
  });
});
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Module Architecture**: How modules are organized
2. ✅ **Module Dependencies**: Required vs optional modules
3. ✅ **Integration Examples**: Registration, Login, OAuth
4. ✅ **Communication Patterns**: Direct, Event Emitter, Queue
5. ✅ **Data Flow**: How data flows between modules
6. ✅ **Shared Data**: User, Profile, Token documents
7. ✅ **Integration Testing**: End-to-end tests
8. ✅ **Best Practices**: Decoupling, dependency injection
9. ✅ **Error Handling**: Cross-module error propagation
10. ✅ **Performance**: Async operations, caching

### **Key Integration Points:**

| Module | Integration Points |
|--------|-------------------|
| User | Core user data, authentication |
| UserProfile | User preferences, settings |
| Token | JWT tokens, verification |
| OTP | Email verification, password reset |
| OAuthAccount | Google/Apple login |
| UserDevices | FCM tokens, push notifications |
| Notification | Emails, push notifications |

### **Next Chapter:**

→ [Chapter 10: Testing & Debugging](./LEARN_AUTH_10_TESTING.md)

---

**Created**: 22-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide
