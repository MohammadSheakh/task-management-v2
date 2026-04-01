# Token Expiration Handling Guide

**Date:** 01-04-26  
**Module:** Auth Middleware  
**Status:** ✅ Implemented

---

## Problem

When a JWT access token expires, the backend was logging the error but the frontend wasn't receiving a clear response to handle it properly.

---

## Solution

The `auth` middleware now catches `TokenExpiredError` and `JsonWebTokenError` explicitly and returns a response using `sendResponse` format for consistency with other API responses.

**Note:** This uses your existing `sendResponse` structure - same format as successful API responses.

---

## Response Format

### Token Expired (401 Unauthorized)

```json
{
  "code": 401,
  "message": "Your session has expired. Please log in again.",
  "data": {
    "attributes": null
  },
  "success": false
}
```

### Invalid Token (401 Unauthorized)

```json
{
  "code": 401,
  "message": "Invalid authentication token.",
  "data": {
    "attributes": null
  },
  "success": false
}
```

---

## Frontend Implementation Guide

### Option 1: Check `success` field and Auto-Logout

```typescript
// Example: Axios interceptor
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const responseData = error.response?.data;
      
      // Check if it's a token expiration (success: false, data.attributes: null)
      if (responseData?.success === false && responseData?.data?.attributes === null) {
        // Token expired or invalid - clear session and redirect to login
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

### Option 2: Check Message Content

```typescript
// Example: Axios interceptor with message checking
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401) {
      const message = error.response?.data?.message;
      
      if (message === 'Your session has expired. Please log in again.') {
        // Token expired - try refresh or logout
        if (!originalRequest._retry) {
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
      }
      
      if (message === 'Invalid authentication token.') {
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
    
    const data = await response.json();
    
    if (!response.ok) {
      // Check for token expiration
      if (data.success === false && data.data.attributes === null) {
        if (data.message === 'Your session has expired. Please log in again.') {
          // Handle token expiration
          logout();
          return;
        }
      }
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
  }
}
```

---

## Backend Implementation Details

### File: `src/middlewares/auth.ts`

**Token verification with error handling:**

```typescript
try {
  const verifyUser = await TokenService.verifyToken(
    token,
    config.jwt.accessSecret as Secret,
    TokenType.ACCESS
  );
  // ... rest of auth logic
  next();
} catch (error: any) {
  // ✅ Handle JWT verification errors with sendResponse format
  if (error.name === 'TokenExpiredError') {
    return sendResponse(res, {
      code: StatusCodes.UNAUTHORIZED,
      message: 'Your session has expired. Please log in again.',
      success: false,
      data: null,
    });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return sendResponse(res, {
      code: StatusCodes.UNAUTHORIZED,
      message: 'Invalid authentication token.',
      success: false,
      data: null,
    });
  }
  
  // Re-throw other errors to be handled by global error handler
  throw error;
}
```

### Flow: `auth` middleware → `sendResponse`

```typescript
// jwt.verify() throws TokenExpiredError
// ↓
// catch block in auth middleware
// ↓
// sendResponse() with standardized format
// ↓
// Frontend receives consistent response structure
```

---

## Response Structure Reference

| Field | Type | Description |
|-------|------|-------------|
| `code` | number | HTTP status code (401 for unauthorized) |
| `message` | string | Human-readable error message |
| `data.attributes` | null | Always null for error responses |
| `success` | boolean | `false` for error responses |

---

## Testing

### Test Token Expiration

```bash
# 1. Login to get access token
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# 2. Wait for token to expire (default: 15 minutes)

# 3. Make request with expired token
curl -X GET http://localhost:5000/api/v1/tasks \
  -H "Authorization: Bearer <expired-token>"

# Expected Response:
# {
#   "code": 401,
#   "message": "Your session has expired. Please log in again.",
#   "data": {
#     "attributes": null
#   },
#   "success": false
# }
```

---

## Response Structure Compatibility

This implementation uses your **existing `sendResponse` format**:

- ✅ Same structure as successful API responses
- ✅ Consistent `code`, `message`, `data`, `success` fields
- ✅ `data.attributes` is `null` for errors
- ✅ `success: false` indicates error state
- ✅ No changes to `globalErrorHandler` needed

---

## Related Files

- `src/middlewares/auth.ts` - Main auth middleware (✅ Enhanced)
- `src/shared/sendResponse.ts` - Standard response formatter
- `src/middlewares/globalErrorHandler.ts` - Global error handler (unchanged)
- `src/modules/token/token.service.ts` - Token verification logic

---

## Notes

- Token expiration is **expected behavior** (access tokens expire after 15 minutes by default)
- Frontend should **always** check for 401 responses
- Consider implementing **refresh token rotation** for better UX
- Response format matches your existing API responses for consistency
- Other errors (not token-related) still use `globalErrorHandler`

---
