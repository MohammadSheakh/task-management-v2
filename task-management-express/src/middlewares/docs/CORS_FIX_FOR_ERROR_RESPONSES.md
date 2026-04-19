# CORS Fix for Error Responses

**Date:** 01-04-26  
**Issue:** Frontend couldn't read error responses (console.log showed nothing, but Network tab showed the response)  
**Status:** ✅ Fixed

---

## Problem

When the backend returned a 401 error (token expired), the response was:
- ✅ Visible in Postman
- ✅ Visible in browser Network tab
- ❌ **NOT accessible via JavaScript** (`console.log(response)` showed nothing)

---

## Root Cause

The CORS middleware was not setting headers properly for **error responses**. When an error occurred, the `globalErrorHandler` sent the response without ensuring CORS headers were present, causing the browser to block the response from JavaScript.

---

## Solution

Added explicit CORS headers in two places:

### 1. Enhanced CORS Configuration (`src/app.ts`)

```typescript
app.use(
  cors({
    origin: '*',
    credentials: true,
    exposedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  })
);
```

### 2. Added Middleware to Ensure CORS Headers on ALL Responses

```typescript
// ✅ Ensure CORS headers are set for ALL responses (including errors)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization, X-Request-Id');
  next();
});
```

### 3. Added CORS Headers in Global Error Handler

```typescript
// src/middlewares/globalErrorHandler.ts

// ✅ Ensure CORS headers are set for error responses
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization');
```

---

## Testing for Frontend Developer

### Before Fix:
```javascript
axios.get('/api/v1/tasks', {
  headers: { Authorization: 'Bearer expired-token' }
})
.catch(error => {
  console.log('Error:', error.response); // ❌ undefined - can't read response!
  console.log('Status:', error.response?.status); // ❌ undefined
});
```

### After Fix:
```javascript
axios.get('/api/v1/tasks', {
  headers: { Authorization: 'Bearer expired-token' }
})
.catch(error => {
  console.log('Error:', error.response); // ✅ Full response object
  console.log('Status:', error.response?.status); // ✅ 401
  console.log('Data:', error.response?.data); // ✅ Error details
  console.log('Error Code:', error.response?.data?.error?.[0]?.code); // ✅ "TOKEN_EXPIRED"
});
```

---

## Response Now Accessible in Frontend

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

---

## Frontend Code Example

```typescript
// Axios interceptor - NOW WORKS!
axios.interceptors.response.use(
  response => response,
  error => {
    // ✅ This now works - response is accessible
    console.log('Error status:', error.response?.status);
    console.log('Error data:', error.response?.data);
    
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.[0]?.code;
      
      if (errorCode === 'TOKEN_EXPIRED') {
        console.log('Token expired - logging out...');
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## Files Modified

1. **`src/app.ts`** - Enhanced CORS configuration + added middleware
2. **`src/middlewares/globalErrorHandler.ts`** - Added CORS headers for error responses
3. **`src/middlewares/ensureCorsHeaders.ts`** - Created reusable CORS middleware (optional use)

---

## Verification Steps

1. **Start the backend server**
2. **Open browser DevTools → Network tab**
3. **Make API call with expired token**
4. **Check Network tab:**
   - Response should show 401 with error details ✅
   - Response headers should include `Access-Control-Allow-Origin: *` ✅
5. **Check Console tab:**
   - `console.log(error.response)` should now show full response ✅
   - Can access `error.response.data.error[0].code` ✅

---

## Common CORS Issues & Solutions

### Issue 1: `Access-Control-Allow-Origin` error
**Solution:** Backend must include `Access-Control-Allow-Origin` header ✅ Fixed

### Issue 2: Can't read response body
**Solution:** Backend must include `Access-Control-Expose-Headers` ✅ Fixed

### Issue 3: Preflight OPTIONS request fails
**Solution:** Backend must handle OPTIONS method ✅ Already handled by CORS middleware

### Issue 4: Credentials not sent
**Solution:** Frontend must set `withCredentials: true` (if using cookies)
```typescript
axios.create({
  withCredentials: true
});
```

---

## Notes

- Using `origin: '*'` with `credentials: true` is technically against CORS spec, but works for development
- For production, replace `'*'` with specific origin: `'http://localhost:8084'`
- The middleware ensures CORS headers are set even if error occurs before CORS middleware runs
- This fix applies to **ALL error responses**, not just token expiration

---

## Related Documentation

- `TOKEN_EXPIRATION_HANDLING.md` - Token expiration handling guide
- `../errors/ApiError.ts` - Custom error class
- `../middlewares/globalErrorHandler.ts` - Global error handler

---
