# 🔐 API Flow: Authentication & Onboarding

**Role:** All Users (Common, Business, Admin)  
**Figma Reference:** Multiple screens  
**Module:** Auth, User Management  
**Date:** 15-03-26  
**Version:** 1.0 - Complete Flow  

---

## 🎯 User Journey Overview

```
┌─────────────────────────────────────────────────────────────┐
│            AUTHENTICATION & ONBOARDING FLOW                 │
├─────────────────────────────────────────────────────────────┤
│  1. Register → Email/Password                               │
│  2. Verify Email → OTP Verification                         │
│  3. Login → Get Tokens                                      │
│  4. OAuth Login → Google/Apple (Optional)                   │
│  5. Complete Profile → Additional Details                   │
│  6. Subscribe → Choose Plan                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 Flow 1: Registration

### Screen: Register Page

**Figma:** App signup flow

### Step 1: Register New User

```http
POST /v1/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user001",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "user"
    },
    "message": "OTP sent to your email"
  }
}
```

### Step 2: Verify Email with OTP

```http
POST /v1/auth/verify-email
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Email verified successfully"
  }
}
```

---

## 📍 Flow 2: Login

### Screen: Login Page

### Step 1: Login with Email/Password

```http
POST /v1/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "user001",
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

## 📍 Flow 3: OAuth Authentication

### Google Login

```http
POST /v1/auth/google-login
Content-Type: application/json

{
  "email": "user@gmail.com",
  "name": "Google User",
  "avatar": "https://lh3.googleusercontent.com/..."
}
```

### Apple Sign In

```http
POST /v1/auth/apple
Content-Type: application/json

{
  "identityToken": "eyJhbGciOiJSUzI1NiIs...",
  "name": "Apple User"
}
```

---

## 📍 Flow 4: Password Management

### Forgot Password

```http
POST /v1/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Reset Password

```http
POST /v1/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePass123!"
}
```

### Change Password (Authenticated)

```http
POST /v1/auth/change-password
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{
  "oldPassword": "OldPass123!",
  "newPassword": "NewSecurePass456!"
}
```

---

## 📍 Flow 5: Token Management

### Refresh Access Token

```http
POST /v1/auth/refresh-auth
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "new_access_token",
      "refreshToken": "new_refresh_token"
    }
  }
}
```

### Logout

```http
GET /v1/auth/logout
Authorization: Bearer {{accessToken}}
```

---

## 📊 API Endpoint Summary

| Endpoint | Method | Purpose | Rate Limit |
|----------|--------|---------|------------|
| `/auth/register` | POST | Register user | 10/hour |
| `/auth/verify-email` | POST | Verify email | 5/hour |
| `/auth/resend-otp` | POST | Resend OTP | 5/hour |
| `/auth/login` | POST | Login | 5/15min |
| `/auth/forgot-password` | POST | Request reset | 3/hour |
| `/auth/reset-password` | POST | Reset password | 3/hour |
| `/auth/change-password` | POST | Change password | 100/min |
| `/auth/refresh-auth` | POST | Refresh token | 100/min |
| `/auth/logout` | GET | Logout | 100/min |
| `/auth/google-login` | POST | Google OAuth | 5/15min |
| `/auth/apple` | POST | Apple Sign In | 5/15min |

---

**Status:** ✅ **COMPLETE**  
**Last Updated:** 15-03-26
