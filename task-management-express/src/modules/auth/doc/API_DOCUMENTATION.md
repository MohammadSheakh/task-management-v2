# Authentication Module - API Documentation

## 📋 Overview

Complete API documentation for the Authentication Module with support for **email/password authentication**, **social login (Google/Apple)**, **email verification**, **password recovery**, and **token management**.

**Base URL:** `{{baseUrl}}/v1`  
**Last Updated:** 10-03-26  
**Version:** 2.0

---

## 🏗️ Architecture

### Module Structure
```
src/modules/auth/
├── auth.constant.ts       # Rate limit configurations
├── auth.interface.ts      # TypeScript interfaces
├── auth.validations.ts    # Zod validation schemas
├── auth.service.ts        # Business logic
├── auth.controller.ts     # HTTP handlers
└── auth.routes.ts         # API routes
```

---

## 🔐 Authentication Flow

### Registration Flow
```
1. POST /auth/register → Create account
2. POST /auth/verify-email → Verify with OTP
3. POST /auth/login → Get access tokens
```

### Social Login Flow
```
1. POST /auth/google-login → Login with Google
2. POST /auth/apple → Login with Apple
3. Receive access tokens
```

### Password Recovery Flow
```
1. POST /auth/forgot-password → Request reset
2. POST /auth/reset-password → Reset with OTP
```

---

## 📚 Registration Endpoints

**Base Path:** `/auth`

### 1. Register User
```http
POST /auth/register
Content-Type: application/json
Rate Limit: 10 requests per hour
```

**Description:** Register a new user account with email and password

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `name` | Required, min 2 characters, max 50 characters |
| `email` | Required, valid email format, unique |
| `password` | Required, min 8 characters, must contain uppercase, lowercase, and number |

**Response (201 Created):**
```json
{
  "code": 201,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false
    }
  },
  "success": true
}
```

**Next Steps:**
- User receives verification email with OTP
- User must verify email before logging in

---

### 2. Register User V2
```http
POST /auth/register/v2
Content-Type: application/json
Rate Limit: 10 requests per hour
```

**Description:** Enhanced registration with additional user details

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "phoneNumber": "+1234567890",
  "gender": "male",
  "dateOfBirth": "2010-01-15"
}
```

**Response (201 Created):**
```json
{
  "code": 201,
  "message": "User registered successfully. Please verify your email.",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": false
    },
    "profile": {
      "phoneNumber": "+1234567890",
      "gender": "male",
      "dob": "2010-01-15T00:00:00.000Z"
    }
  },
  "success": true
}
```

---

## 🔑 Login Endpoints

### 3. Login
```http
POST /auth/login
Content-Type: application/json
Rate Limit: 5 attempts per 15 minutes
```

**Description:** Login with email and password

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user",
      "isEmailVerified": true,
      "profileImage": "https://..."
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "success": true
}
```

**Token Information:**
| Token | Expiry | Usage |
|-------|--------|-------|
| `accessToken` | 15 minutes | API authentication |
| `refreshToken` | 7 days | Token refresh |

---

### 4. Login V2 (with FCM Token)
```http
POST /auth/login/v2
Content-Type: application/json
Rate Limit: 5 attempts per 15 minutes
```

**Description:** Login with email, password, and FCM token for push notifications

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "fcmToken": "fcm_device_token_here"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "success": true
}
```

---

## 🌐 Social Login Endpoints

### 5. Google Login
```http
POST /auth/google-login
Content-Type: application/json
Rate Limit: 5 attempts per 15 minutes
```

**Description:** Login or register with Google OAuth

**Request Body:**
```json
{
  "idToken": "google_id_token_from_client",
  "fcmToken": "fcm_device_token_here"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Google login successful",
  "data": {
    "user": {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "profileImage": "https://...",
      "authProvider": "google",
      "isEmailVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "success": true
}
```

---

### 6. Google Login V2
```http
POST /auth/google-login/v2
Content-Type: application/json
Rate Limit: 5 attempts per 15 minutes
```

**Description:** Enhanced Google login with additional data

**Request Body:**
```json
{
  "idToken": "google_id_token_from_client"
}
```

---

### 7. Google Auth Callback
```http
POST /auth/google
Content-Type: application/json
```

**Description:** Google OAuth callback (client sends ID token)

**Request Body:**
```json
{
  "idToken": "google_id_token"
}
```

---

### 8. Apple Auth Callback
```http
POST /auth/apple
Content-Type: application/json
```

**Description:** Apple OAuth callback (client sends ID token)

**Request Body:**
```json
{
  "idToken": "apple_id_token"
}
```

---

## 📧 Email Verification Endpoints

### 9. Verify Email
```http
POST /auth/verify-email
Content-Type: application/json
Rate Limit: 5 requests per hour
```

**Description:** Verify email address with OTP

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Email verified successfully",
  "data": {
    "email": "john@example.com",
    "isEmailVerified": true
  },
  "success": true
}
```

---

### 10. Resend OTP
```http
POST /auth/resend-otp
Content-Type: application/json
Rate Limit: 100 requests per minute
```

**Description:** Resend verification OTP to email

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "OTP resent successfully",
  "data": {
    "email": "john@example.com"
  },
  "success": true
}
```

---

## 🔒 Password Management Endpoints

### 11. Forgot Password
```http
POST /auth/forgot-password
Content-Type: application/json
Rate Limit: 3 requests per hour
```

**Description:** Request password reset OTP

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Password reset OTP sent to your email",
  "data": {
    "email": "john@example.com"
  },
  "success": true
}
```

---

### 12. Reset Password
```http
POST /auth/reset-password
Content-Type: application/json
Rate Limit: 100 requests per minute
```

**Description:** Reset password with OTP

**Request Body:**
```json
{
  "email": "john@example.com",
  "otp": "123456",
  "password": "NewSecurePass123!"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `password` | Required, min 8 characters, must contain uppercase, lowercase, and number |

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Password reset successfully",
  "data": {
    "email": "john@example.com"
  },
  "success": true
}
```

---

### 13. Change Password
```http
POST /auth/change-password
Authorization: Bearer <token>
Content-Type: application/json
Rate Limit: 100 requests per minute
Role: child, business
```

**Description:** Change password for authenticated user

**Request Body:**
```json
{
  "oldPassword": "OldSecurePass123!",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Password changed successfully",
  "data": {
    "email": "john@example.com"
  },
  "success": true
}
```

---

## 🚪 Session Management Endpoints

### 14. Logout
```http
GET /auth/logout
Rate Limit: 100 requests per minute
```

**Description:** Logout and clear all FCM tokens for user

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Logout successful",
  "data": {
    "success": true
  },
  "success": true
}
```

---

### 15. Refresh Auth Token
```http
POST /auth/refresh-auth
Content-Type: application/json
Rate Limit: 100 requests per minute
```

**Description:** Refresh access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Token refreshed successfully",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "success": true
}
```

---

## 🎯 Key Features

### 1. JWT Token System
- **Access Token**: 15 minute expiry for API authentication
- **Refresh Token**: 7 day expiry for token refresh
- **Automatic Rotation**: New refresh token issued on every refresh

### 2. Email Verification
- OTP-based email verification
- OTP expires after 10 minutes
- Resend OTP functionality available

### 3. Social Authentication
- Google OAuth 2.0 support
- Apple Sign-In support
- Automatic account creation for new social users

### 4. Password Security
- Bcrypt hashing (12 rounds)
- Password strength validation
- Secure password reset with OTP

### 5. Rate Limiting
| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Register | 10 requests | 1 hour |
| Forgot Password | 3 requests | 1 hour |
| Verify Email | 5 requests | 1 hour |
| General Auth | 100 requests | 1 minute |

### 6. Brute Force Protection
- Account lockout after 5 failed login attempts
- 15 minute lockout period
- Lockout state stored in Redis

---

## 📊 Database Schema

### User Collection
```javascript
{
  _id: ObjectId,
  profileId: ObjectId,                   // References UserProfile
  name: String,
  email: String,                         // Unique, indexed
  password: String,                      // Hashed with bcrypt
  phoneNumber: String,
  profileImage: String,
  role: String,                          // 'user' | 'admin' | 'student' | etc.
  authProvider: String,                  // 'local' | 'google' | 'apple'
  isEmailVerified: Boolean,
  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Token Collection (for refresh tokens)
```javascript
{
  _id: ObjectId,
  userId: ObjectId,                      // References User
  token: String,                         // Hashed refresh token
  expiresAt: Date,
  isDeleted: Boolean,
  createdAt: Date
}
```

---

## 🚨 Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Email already exists",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Password must be at least 8 characters long and contain uppercase, lowercase, and number",
  "success": false
}
```

```json
{
  "code": 400,
  "message": "Invalid OTP",
  "success": false
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Invalid email or password",
  "success": false
}
```

```json
{
  "code": 401,
  "message": "Email not verified. Please verify your email first.",
  "success": false
}
```

```json
{
  "code": 401,
  "message": "Refresh token expired or invalid",
  "success": false
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Account locked due to too many failed attempts. Try again in 15 minutes",
  "success": false
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "User not found",
  "success": false
}
```

### 429 Too Many Requests
```json
{
  "code": 429,
  "message": "Too many login attempts. Please try again later",
  "success": false,
  "retryAfter": 900
}
```

---

## 🧪 Testing with cURL

### Register User
```bash
curl -X POST http://localhost:6733/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:6733/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### Verify Email
```bash
curl -X POST http://localhost:6733/api/v1/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456"
  }'
```

### Forgot Password
```bash
curl -X POST http://localhost:6733/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com"
  }'
```

### Reset Password
```bash
curl -X POST http://localhost:6733/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "otp": "123456",
    "password": "NewSecurePass123!"
  }'
```

### Change Password (Authenticated)
```bash
curl -X POST http://localhost:6733/api/v1/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "OldSecurePass123!",
    "newPassword": "NewSecurePass123!"
  }'
```

### Refresh Token
```bash
curl -X POST http://localhost:6733/api/v1/auth/refresh-auth \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### Google Login
```bash
curl -X POST http://localhost:6733/api/v1/auth/google-login \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google_id_token_from_client",
    "fcmToken": "fcm_device_token"
  }'
```

---

## 📝 Notes

1. **Token Storage**: Store tokens securely on client (Keychain/Keystore)
2. **Token Expiry**: Access tokens expire after 15 minutes, use refresh tokens to get new ones
3. **Email Verification**: Users must verify email before accessing protected endpoints
4. **Password Requirements**: Min 8 characters, must contain uppercase, lowercase, and number
5. **Rate Limiting**: All auth endpoints have rate limiting to prevent abuse
6. **Social Login**: Social users have `isEmailVerified` set to true automatically
7. **FCM Token**: Optional for push notifications, stored on login
8. **Logout**: Clears all FCM tokens for the user

---

## 🚀 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm run start
```

---

## 📞 Support

For issues or questions:
- Check error messages
- Review server logs
- Contact backend team

---

**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team  
**Status:** ✅ Complete and Production-Ready
