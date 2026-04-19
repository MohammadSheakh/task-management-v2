# 📮 Postman Collections - Task Management API

**Last Updated**: 08-03-26  
**Version**: 2.0  
**Status**: ✅ Complete with all new endpoints

---

## 🎯 Overview

This folder contains comprehensive Postman collections for the Task Management API, organized by user roles and functionality.

**Total Collections**: 4
- ✅ **00 - Public & Auth** (No authentication required)
- ✅ **01 - User Common Part 1** (Profile, Tasks)
- ✅ **01 - User Common Part 2** (Subtasks, Groups, Notifications, Analytics)
- ✅ **02 - Admin Full** (Admin-only endpoints)

---

## 📁 Collection Files

| File | Role | Endpoints | Auth Required |
|------|------|-----------|---------------|
| `00-Public-Auth.postman_collection.json` | Public | 11 | ❌ No |
| `01-User-Common-Part1.postman_collection.json` | User | 14 | ✅ Yes |
| `01-User-Common-Part2.postman_collection.json` | User | 21 | ✅ Yes |
| `02-Admin-Full.postman_collection.json` | Admin | 20 | ✅ Yes (Admin) |

**Total Endpoints**: 66+

---

## 🚀 Quick Start

### Step 1: Import Collections

1. Open Postman
2. Click **Import**
3. Select all 4 JSON files
4. Collections will appear in sidebar

### Step 2: Set Base URL

1. Click on any collection
2. Go to **Variables** tab
3. Set `baseUrl` to your API URL:
   - Local: `http://localhost:5000`
   - Production: `https://api.yourdomain.com`

### Step 3: Authenticate

1. Open **00 - Public & Auth** collection
2. Run **Register User** request
3. Run **Login** request
4. Access tokens are automatically saved to environment

---

## 🔐 Authentication Flow

### 1. Register User

```
POST {{baseUrl}}/v1/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

### 2. Login

```
POST {{baseUrl}}/v1/auth/login
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response:
{
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

**Note**: Access token is automatically saved to environment variable `{{accessToken}}`

### 3. Use Access Token

All authenticated requests automatically use `{{accessToken}}` from environment.

---

## 📊 Rate Limits

All endpoints have rate limiting configured:

| Endpoint Type | Rate Limit |
|--------------|------------|
| **Login** | 5 attempts / 15 minutes |
| **Register** | 10 / hour |
| **Forgot Password** | 3 / hour |
| **Verify Email** | 5 / hour |
| **User Endpoints** | 100 / minute |
| **Admin Endpoints** | 200 / minute |
| **Task Creation** | 20 / hour (50/day max) |

**Response Headers**:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1678123456
Retry-After: 900
```

---

## 📝 Collection Details

### 00 - Public & Auth (11 endpoints)

**Health Check**:
- GET /health

**Authentication**:
- POST /auth/register
- POST /auth/login
- POST /auth/google-login
- POST /auth/apple
- POST /auth/forgot-password
- POST /auth/reset-password
- POST /auth/verify-email
- POST /auth/resend-otp
- POST /auth/refresh-auth
- GET /auth/logout

---

### 01 - User Common Part 1 (14 endpoints)

**User Profile** (5):
- GET /users/profile
- PUT /users/profile-info
- GET /users/support-mode
- PUT /users/support-mode
- PUT /users/notification-style

**Task Management** (9):
- POST /tasks
- GET /tasks
- GET /tasks/paginate
- GET /tasks/statistics
- GET /tasks/daily-progress
- GET /tasks/:id
- PUT /tasks/:id
- PUT /tasks/:id/status
- DELETE /tasks/:id

---

### 01 - User Common Part 2 (21 endpoints)

**Subtasks** (6):
- POST /subtasks
- GET /subtasks/task/:taskId
- GET /subtasks/:id
- PUT /subtasks/:id
- PUT /subtasks/:id/toggle-status
- DELETE /subtasks/:id

**Groups** (5):
- POST /groups
- GET /groups/my
- GET /groups/:id
- PUT /groups/:id
- DELETE /groups/:id

**Notifications** (5):
- GET /notifications/my
- GET /notifications/unread-count
- POST /notifications/:id/read
- POST /notifications/read-all
- DELETE /notifications/:id

**Analytics** (7):
- GET /analytics/user/my/overview
- GET /analytics/user/my/daily-progress
- GET /analytics/user/my/weekly-streak
- GET /analytics/user/my/productivity-score
- GET /analytics/user/my/completion-rate
- GET /analytics/user/my/task-statistics
- GET /analytics/user/my/trend

---

### 02 - Admin Full (20 endpoints)

**User Management** (7):
- GET /users/paginate
- GET /users/paginate/for-student
- GET /users/paginate/for-mentor
- GET /users/paginate/for-sub-admin
- POST /users/send-invitation-link-to-admin-email
- PUT /users/remove-sub-admin/:id

**Admin Analytics** (5):
- GET /analytics/admin/dashboard
- GET /analytics/admin/user-growth
- GET /analytics/admin/revenue
- GET /analytics/admin/task-metrics
- GET /analytics/admin/engagement

**Payment & Transactions** (3):
- GET /payment-transactions/paginate
- GET /payment-transactions/overview/admin
- GET /payment-transactions/:id

**Subscription Management** (5):
- GET /subscription-plans/paginate
- POST /subscription-plans
- PUT /subscription-plans/:id
- DELETE /subscription-plans/:id
- GET /user-subscriptions/paginate

---

## 🔑 Environment Variables

Collections use these environment variables:

| Variable | Description | Set By |
|----------|-------------|--------|
| `baseUrl` | API base URL | Manual |
| `accessToken` | JWT access token (15 min) | Auto (login) |
| `refreshToken` | JWT refresh token (7 days) | Auto (login) |
| `userId` | Current user ID | Auto (login) |
| `taskId` | Last created task ID | Manual |
| `groupId` | Last created group ID | Manual |

---

## 🧪 Testing Tips

### 1. Test Registration Flow

```
1. Register User → Saves email to environment
2. Verify Email → Use OTP from email
3. Login → Saves tokens to environment
4. Get Profile → Verify authentication works
```

### 2. Test Task Management

```
1. Create Task → Save taskId to environment
2. Get Tasks → Verify task appears
3. Update Task Status → Change to "completed"
4. Get Daily Progress → Verify completion counted
5. Get Analytics → Verify statistics updated
```

### 3. Test Rate Limiting

```bash
# Run login 6 times quickly
# 6th request should return 429 Too Many Requests

# Example curl:
for i in {1..6}; do
  curl -X POST http://localhost:5000/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

### 4. Test Caching

```
1. Get Profile (first time) → ~50ms (cache miss)
2. Get Profile (second time) → ~5ms (cache hit)
3. Update Profile → Cache invalidated
4. Get Profile → ~50ms (cache miss again)
```

---

## 📈 Response Examples

### User Overview (Analytics)

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTasks": 156,
      "completedTasks": 124,
      "completionRate": 79.49,
      "currentStreak": 7,
      "longestStreak": 21,
      "productivityScore": 85
    },
    "today": {
      "totalTasks": 5,
      "completedTasks": 3,
      "progress": "3/5",
      "completionRate": 60
    },
    "thisWeek": {
      "totalTasks": 28,
      "completedTasks": 22,
      "completionRate": 78.57
    }
  }
}
```

### Admin Dashboard

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalUsers": 125847,
      "totalGroups": 18453,
      "totalTasks": 8947562,
      "activeUsersToday": 45621,
      "dauMauRatio": 40.52
    },
    "userGrowth": {
      "today": 234,
      "thisWeek": 1847,
      "thisMonth": 7453,
      "growthRate": {
        "daily": 0.19,
        "weekly": 1.49,
        "monthly": 6.29
      }
    },
    "revenue": {
      "mrr": 1247850.50,
      "arr": 14974206.00,
      "thisMonth": 124580.75,
      "growthRate": 4.74
    }
  }
}
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized

**Solution**:
1. Check if access token is expired (15 min TTL)
2. Run **Refresh Token** request
3. Or login again

### Issue: 429 Too Many Requests

**Solution**:
1. Wait for rate limit to reset (check `X-RateLimit-Reset` header)
2. Reduce request frequency

### Issue: Variables Not Set

**Solution**:
1. Go to collection → Variables tab
2. Set `baseUrl` manually
3. Run login to auto-set tokens

---

## 📞 Support

For issues or questions:
- Check API documentation
- Review error messages
- Check server logs

---

**Collections Generated**: 08-03-26  
**Author**: Qwen Code Assistant  
**Status**: ✅ Complete and Production-Ready
