# Token Expiration Handling Guide

**Date:** 01-04-26  
**Module:** Auth Middleware  
**Status:** ✅ Implemented

---

## Problem

When a JWT access token expires, the backend was logging the error but the frontend wasn't receiving a clear response to handle it properly.

---

## Solution

The `handleJWTError` utility now includes an `errorType` code in the error response, allowing the frontend to detect token expiration programmatically.

**Note:** This uses the existing `globalErrorHandler` structure - no changes to middleware flow.

---

## Response Format

### Token Expired (401 Unauthorized)

```json
{
  "code": 401,
  "message": "Your session has expired. Please log in again.",
  "error": [
    {
      "path": "token",
      "message": "Your session has expired. Please log in again.",
      "code": "TOKEN_EXPIRED"
    }
  ]
}
```

### Invalid Token (401 Unauthorized)

```json
{
  "code": 401,
  "message": "Invalid authentication token.",
  "error": [
    {
      "path": "token",
      "message": "Invalid authentication token.",
      "code": "INVALID_TOKEN"
    }
  ]
}
```

### Development Mode (with stack trace)

```json
{
  "code": 401,
  "message": "Your session has expired. Please log in again.",
  "error": [
    {
      "path": "token",
      "message": "Your session has expired. Please log in again.",
      "code": "TOKEN_EXPIRED"
    }
  ],
  "stack": "TokenExpiredError: jwt expired\n    at..."
}
```

---

## Frontend Implementation Guide

### Option 1: Check `error[].code` and Auto-Logout

```typescript
// Example: Axios interceptor
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.[0]?.code;
      
      if (errorCode === 'TOKEN_EXPIRED') {
        // Token expired - clear session and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return;
      }
      
      if (errorCode === 'INVALID_TOKEN') {
        // Invalid token - clear session and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return;
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Option 2: Try Refresh Token First

```typescript
// Example: Axios interceptor with refresh token logic
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.[0]?.code;
      
      if (errorCode === 'TOKEN_EXPIRED' && !originalRequest._retry) {
        originalRequest._retry = true;
        
        try {
          // Try to refresh the token
          const refreshToken = localStorage.getItem('refreshToken');
          const response = await axios.post('/api/v1/auth/refresh-token', {
            refreshToken
          });
          
          // Save new access token
          localStorage.setItem('accessToken', response.data.data.attributes.accessToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.data.attributes.accessToken}`;
          return axiosInstance(originalRequest);
          
        } catch (refreshError) {
          // Refresh failed - logout user
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      
      if (errorCode === 'INVALID_TOKEN') {
        // Invalid token - logout immediately
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### Option 3: Simple Check in API Call

```typescript
// Example: Individual API call handling
async function fetchTasks() {
  try {
    const response = await fetch('/api/v1/tasks', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      const data = await response.json();
      
      if (data.error?.[0]?.code === 'TOKEN_EXPIRED') {
        // Handle token expiration
        logout();
        return;
      }
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
}
```

---

## Backend Implementation Details

### File: `src/errors/handleJWTError.ts`

**Enhanced to include error code:**

```typescript
import { IErrorMessage } from "../types/errors.types";

export default function handleJWTError(error: any) {
  const isTokenExpired = error.name === "TokenExpiredError";
  
  const message = isTokenExpired
    ? "Your session has expired. Please log in again."
    : "Invalid authentication token.";

  const errorMessages: IErrorMessage[] = [
    { 
      path: "token", 
      message,
      // Add error code for frontend to detect token expiration programmatically
      code: isTokenExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    }
  ];

  return { 
    code: 401, 
    message, 
    errorMessages,
  };
}
```

### Flow: `auth` middleware → `globalErrorHandler`

```typescript
// src/middlewares/auth.ts
const verifyUser = await TokenService.verifyToken(
  token,
  config.jwt.accessSecret as Secret,
  TokenType.ACCESS
);
// If token is expired, jwt.verify() throws TokenExpiredError
// This gets caught by catchAsync → passed to globalErrorHandler
// globalErrorHandler calls handleJWTError → returns structured response
```

---

## Error Codes Reference

| Error Code | HTTP Status | Meaning | Recommended Action |
|------------|-------------|---------|-------------------|
| `TOKEN_EXPIRED` | 401 | Access token has expired | Try refresh token OR logout |
| `INVALID_TOKEN` | 401 | Token is malformed or tampered | Logout immediately |
| (none) | 401 | Other auth error | Check error message |

---

## Testing

### Test Token Expiration

```bash
# 1. Login to get access token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Wait for token to expire (default: 15 minutes)
# OR manually modify token to be expired

# 3. Make request with expired token
curl -X GET http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer <expired-token>"

# Expected Response:
# {
#   "code": 401,
#   "message": "Your session has expired. Please log in again.",
#   "error": [
#     {
#       "path": "token",
#       "message": "Your session has expired. Please log in again.",
#       "code": "TOKEN_EXPIRED"
#     }
#   ]
# }
```

---

## Response Structure Compatibility

This implementation is **100% compatible** with the existing `globalErrorHandler`:

- ✅ Uses same response format (`code`, `message`, `error[]`)
- ✅ No changes to middleware flow
- ✅ Works with existing error handling
- ✅ Adds `code` field to error array for programmatic detection

---

## Related Files

- `src/middlewares/auth.ts` - Main auth middleware
- `src/middlewares/globalErrorHandler.ts` - Global error handler
- `src/errors/handleJWTError.ts` - JWT error formatter (✅ Enhanced)
- `src/types/errors.types.ts` - Error message type definition (✅ Enhanced)
- `src/modules/token/token.service.ts` - Token verification logic
- `src/errors/ApiError.ts` - Custom error class

---

## Notes

- Token expiration is **expected behavior** (access tokens expire after 15 minutes by default)
- Frontend should **always** handle 401 responses gracefully
- Consider implementing **refresh token rotation** for better UX
- For production, consider using **refresh token** to get new access token before forcing logout
- The `error[].code` field is **optional** - existing error handling continues to work

---
