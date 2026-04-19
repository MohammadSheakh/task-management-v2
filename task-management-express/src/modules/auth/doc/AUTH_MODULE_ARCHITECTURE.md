# 🔐 Auth Module - Architecture Documentation

**Version**: 1.0  
**Status**: ✅ Production Ready  
**Last Updated**: 08-03-26

---

## 🎯 Module Overview

The Auth Module provides comprehensive authentication and authorization for the Task Management System, handling user registration, login, password management, OAuth integration, and session management.

### Key Features

- ✅ **User Registration**: Email/password registration with OTP verification
- ✅ **User Login**: JWT-based authentication
- ✅ **OAuth Integration**: Google & Apple social login
- ✅ **Password Management**: Forgot password, reset password, change password
- ✅ **Email Verification**: OTP-based email verification
- ✅ **Session Management**: Redis-backed session caching (7 day TTL)
- ✅ **Rate Limiting**: Brute force protection (5 attempts / 15 min)
- ✅ **Token Management**: Access token + Refresh token rotation
- ✅ **Device Management**: FCM token registration for push notifications
- ✅ **Account Security**: Failed login attempts, account locking

---

## 📂 Module Structure

```
auth/
├── doc/
│   ├── dia/                        # 8 Mermaid diagrams
│   │   ├── auth-schema.mermaid
│   │   ├── auth-system-architecture.mermaid
│   │   ├── auth-sequence.mermaid
│   │   ├── auth-user-flow.mermaid
│   │   ├── auth-swimlane.mermaid
│   │   ├── auth-state-machine.mermaid
│   │   ├── auth-component-architecture.mermaid
│   │   └── auth-data-flow.mermaid
│   ├── AUTH_MODULE_ARCHITECTURE.md # This file
│   ├── AUTH_MODULE_SYSTEM_GUIDE.md # System guide
│   └── perf/
│       └── auth-module-performance-report.md
│
├── auth.constants.ts               # Constants & config
├── auth.controller.ts              # HTTP handlers
├── auth.interface.ts               # TypeScript interfaces
├── auth.routes.ts                  # API routes + Rate limiters
├── auth.service.ts                 # Business logic + Redis caching
└── auth.validations.ts             # Zod validation schemas
```

---

## 🏗️ Architecture Design

### Design Principles

1. **Security-First**
   - Rate limiting on all auth endpoints
   - Brute force protection
   - Password hashing (bcryptjs)
   - JWT with short expiry

2. **Redis Caching**
   - Session caching (7 day TTL)
   - OTP caching (10 min TTL)
   - Token blacklist caching

3. **Token Rotation**
   - Access token: 15 min expiry
   - Refresh token: 7 days expiry
   - Refresh token rotation on use

4. **Scalability**
   - Stateless JWT tokens
   - Redis for sessions
   - Horizontal scaling ready

---

## 📊 Authentication Flow

### Registration Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Register
       ↓
┌─────────────┐
│ Create User │
│ + Profile   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Send OTP    │
│ (Email)     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Verify OTP  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Verified  │
│   User      │
└─────────────┘
```

### Login Flow

```
┌─────────────┐
│   User      │
└──────┬──────┘
       │ 1. Login
       ↓
┌─────────────┐
│ Validate    │
│ Credentials │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Generate    │
│ JWT Tokens  │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Cache       │
│ Session     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│ Return      │
│ Tokens      │
└─────────────┘
```

---

## 🔐 Security Architecture

### Rate Limiting

| Endpoint | Rate Limit | Protection |
|----------|-----------|------------|
| `/login`, `/login/v2` | 5 / 15 min | 🔒 Brute force |
| `/google-login`, `/google-login/v2` | 5 / 15 min | 🔒 Brute force |
| `/register`, `/register/v2` | 10 / hour | 🔒 Spam |
| `/forgot-password` | 3 / hour | 🔒 Email spam |
| `/verify-email` | 5 / hour | 🔒 Verification spam |
| `/change-password` | 100 / min | 🔒 General abuse |
| `/reset-password` | 100 / min | 🔒 General abuse |

### JWT Token Structure

```typescript
// Access Token (15 min)
{
  userId: string,
  role: string,
  email: string,
  iat: number,
  exp: number  // 15 minutes
}

// Refresh Token (7 days)
{
  userId: string,
  deviceId: string,
  iat: number,
  exp: number  // 7 days
}
```

### Password Security

```typescript
// Hashing
const hashedPassword = await bcryptjs.hash(password, 12);

// Comparison
const isValid = await bcryptjs.compare(password, hashedPassword);

// Never store raw passwords
password: {
  type: String,
  required: false,
  select: false  // Never return in queries
}
```

---

## 🎯 Key Components

### 1. Auth Service

**File**: `auth.service.ts`

**Responsibilities**:
- User registration
- User login
- Password management
- OAuth integration
- Session caching (Redis)
- Token generation

**Key Methods**:
```typescript
class AuthService {
  // Registration
  async register(userData: ICreateUser): Promise<{ user: IUser, tokens: ITokens }>
  
  // Login
  async login(email: string, password: string, fcmToken?: string): Promise<IUser & ITokens>
  
  // Password management
  async forgotPassword(email: string): Promise<void>
  async resetPassword(token: string, newPassword: string): Promise<void>
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void>
  
  // OAuth
  async googleLogin(payload: IGoogleLoginPayload): Promise<IUser & ITokens>
  async appleLogin(payload: any): Promise<IUser & ITokens>
  
  // Session caching
  async cacheSession(userId: string, sessionData: any): Promise<void>
  async getSession(userId: string): Promise<any>
  async invalidateSession(userId: string): Promise<void>
}
```

**Redis Session Caching**:
```typescript
// Cache session on login
const sessionKey = `session:${userId}:${fcmToken || 'web'}`;
const sessionData = {
  userId,
  email,
  role,
  fcmToken,
  deviceType,
  deviceName,
  loginAt: new Date(),
};

await redisClient.setEx(
  sessionKey,
  AUTH_SESSION_CONFIG.SESSION_TTL,  // 7 days
  JSON.stringify(sessionData)
);
```

---

### 2. Auth Controller

**File**: `auth.controller.ts`

**Responsibilities**:
- HTTP request handling
- Input validation
- Error handling
- Response formatting

**Key Methods**:
```typescript
class AuthController {
  register: (req: Request, res: Response) => Promise<void>
  registerV2: (req: Request, res: Response) => Promise<void>
  login: (req: Request, res: Response) => Promise<void>
  loginV2: (req: Request, res: Response) => Promise<void>
  googleLogin: (req: Request, res: Response) => Promise<void>
  googleLoginV2: (req: Request, res: Response) => Promise<void>
  forgotPassword: (req: Request, res: Response) => Promise<void>
  resetPassword: (req: Request, res: Response) => Promise<void>
  changePassword: (req: Request, res: Response) => Promise<void>
  verifyEmail: (req: Request, res: Response) => Promise<void>
  refreshToken: (req: Request, res: Response) => Promise<void>
  logout: (req: Request, res: Response) => Promise<void>
}
```

---

### 3. Token Service

**File**: `../token/token.service.ts`

**Responsibilities**:
- Access & refresh token generation
- Token verification
- Token blacklisting
- Email verification tokens

**Key Methods**:
```typescript
class TokenService {
  // Generate tokens
  async accessAndRefreshToken(user: IUser): Promise<ITokens>
  
  // Verify tokens
  async verifyToken(token: string, secret: string, type: TokenType): Promise<void>
  
  // Blacklist tokens
  async blacklistToken(token: string, expiry: number): Promise<void>
  
  // Email verification
  async createVerifyEmailToken(user: IUser): Promise<string>
}
```

---

## 📊 API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| POST | `/auth/register` | ❌ | 10 / hour | User registration |
| POST | `/auth/register/v2` | ❌ | 10 / hour | User registration V2 |
| POST | `/auth/login` | ❌ | 5 / 15 min | User login |
| POST | `/auth/login/v2` | ❌ | 5 / 15 min | User login V2 |
| POST | `/auth/google-login` | ❌ | 5 / 15 min | Google OAuth login |
| POST | `/auth/google-login/v2` | ❌ | 5 / 15 min | Google OAuth V2 |
| POST | `/auth/google` | ❌ | 5 / 15 min | Google auth callback |
| POST | `/auth/apple` | ❌ | 5 / 15 min | Apple auth callback |
| POST | `/auth/forgot-password` | ❌ | 3 / hour | Forgot password |
| POST | `/auth/reset-password` | ❌ | 100 / min | Reset password |
| POST | `/auth/change-password` | ✅ | 100 / min | Change password |
| POST | `/auth/verify-email` | ❌ | 5 / hour | Verify email |
| POST | `/auth/resend-otp` | ❌ | 100 / min | Resend OTP |
| GET | `/auth/logout` | ❌ | 100 / min | Logout |
| POST | `/auth/refresh-auth` | ❌ | 100 / min | Refresh token |

**Total**: 15 endpoints

---

## 🔗 External Dependencies

### Internal Modules

- ✅ **user.module** - User data
- ✅ **userProfile.module** - User profiles
- ✅ **token.module** - JWT tokens
- ✅ **otp.module** - OTP generation & verification
- ✅ **wallet.module** - Wallet creation on signup
- ✅ **notification.module** - Push notifications

### External Services

- ✅ **MongoDB** - Database
- ✅ **Redis** - Session caching
- ✅ **SendGrid/AWS SES** - Email service
- ✅ **Firebase FCM** - Push notifications
- ✅ **Google OAuth** - Google login
- ✅ **Apple OAuth** - Apple login

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
describe('AuthService', () => {
  describe('login', () => {
    it('should login user and cache session', async () => {
      // Test login with session caching
    });
    
    it('should reject invalid credentials', async () => {
      // Test invalid credentials
    });
  });
  
  describe('register', () => {
    it('should create user and profile', async () => {
      // Test user registration
    });
  });
});
```

### Integration Tests

```typescript
describe('Auth API', () => {
  describe('POST /auth/login', () => {
    it('should login user and return tokens', async () => {
      // Test login endpoint
    });
    
    it('should rate limit after 5 attempts', async () => {
      // Test rate limiting
    });
  });
  
  describe('POST /auth/register', () => {
    it('should register user', async () => {
      // Test registration
    });
  });
});
```

---

## 🚀 Future Enhancements

### Phase 2 (Optional)

- [ ] Two-factor authentication (2FA)
- [ ] Passwordless login (magic links)
- [ ] Social media linking
- [ ] Account recovery questions
- [ ] Login history tracking

### Phase 3 (Future)

- [ ] Biometric authentication
- [ ] Device trust management
- [ ] Advanced fraud detection
- [ ] Single Sign-On (SSO)

---

## 📝 Related Documentation

- [README](./README.md)
- [System Guide](./AUTH_MODULE_SYSTEM_GUIDE-08-03-26.md)
- [Performance Report](./perf/auth-module-performance-report.md)
- [Diagrams](./dia/)
- [User Module Guide](../../user.module/doc/USER_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

**Document Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Production Ready
