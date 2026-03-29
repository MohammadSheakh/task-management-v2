# 📮 Postman Collections Index

**Project:** Task Management Backend  
**Purpose:** Organized Postman collections by user role  
**Last Updated:** 12-03-26  
**Version:** 2.0 - Organized Structure  

---

## 📁 Folder Structure

```
postman-collections/
├── 00-public-auth/          # Public & Authentication endpoints
├── 01-user-common/          # Common User endpoints (Part 1 & 2)
├── 02-admin/                # Admin & Super Admin endpoints
├── 03-secondary-user/       # Secondary User (Student/Child) endpoints
├── _docs/                   # Documentation & summaries
└── README.md                # This index
```

---

## 📋 Collections by Role

### 00 - Public & Authentication

**Folder:** `00-public-auth/`

| Collection | Endpoints | Auth | Description |
|------------|-----------|------|-------------|
| `00-Public-Auth.postman_collection.json` | 10 | ❌ No | Health check, Register, Login, Verify Email, Forgot Password, Refresh Token, Logout |

**Use For**: 
- Initial authentication testing
- Token management
- Public endpoint testing

---

### 01 - User Common

**Folder:** `01-user-common/`

| Collection | Endpoints | Auth | Description |
|------------|-----------|------|-------------|
| `01-User-Common-Part1.postman_collection.json` | 14 | ✅ Yes | User Profile (6) + Task Management (8) - Legacy |
| `01-User-Common-Part1-UPDATED.postman_collection.json` | 14 | ✅ Yes | User Profile (6) + Task Management (8) - **CURRENT** |
| `01-User-Common-Part2.postman_collection.json` | 21 | ✅ Yes | Subtasks, Groups, Notifications - Legacy |
| `01-User-Common-Part2-Charts-Progress.postman_collection.json` | 21 | ✅ Yes | Charts (10) + TaskProgress (6) + childrenBusinessUser (5) - **CURRENT** |

**Use For**:
- User profile management
- Task CRUD operations
- Subtask management
- Notifications
- **NEW**: Chart aggregation endpoints
- **NEW**: TaskProgress endpoints
- **NEW**: childrenBusinessUser endpoints

---

### 02 - Admin

**Folder:** `02-admin/`

| Collection | Endpoints | Auth | Description |
|------------|-----------|------|-------------|
| `01-Super-Admin.postman_collection.json` | 20 | ✅ Admin | Super Admin endpoints - Legacy |
| `02-Admin-Full.postman_collection.json` | 25 | ✅ Admin | Complete admin collection - Legacy |
| `02-Admin-Full-UPDATED.postman_collection.json` | 25 | ✅ Admin | Complete admin with Charts - **CURRENT** |
| `02-Primary-User.postman_collection.json` | 15 | ✅ Admin | Primary User management |

**Use For**:
- User management (all users)
- Admin analytics
- **NEW**: Chart aggregation endpoints (10)
- Payment & transactions
- Subscription management

---

### 03 - Secondary User

**Folder:** `03-secondary-user/`

| Collection | Endpoints | Auth | Description |
|------------|-----------|------|-------------|
| `03-Secondary-User.postman_collection.json` | 20 | ✅ Yes | Secondary User (Student/Child) - Legacy |
| `03-Secondary-User-UPDATED-v2.postman_collection.json` | 20 | ✅ Yes | Secondary User with TaskProgress + Socket.IO info - **CURRENT** |

**Use For**:
- Student/Child role testing
- Task management (personal, single, collaborative)
- **NEW**: TaskProgress endpoints
- **NEW**: Socket.IO event documentation
- Profile & settings
- Analytics & charts

---

## 🚀 Quick Start Guide

### Step 1: Import Collections

1. Open Postman
2. Click **Import**
3. Select folders:
   - `00-public-auth/`
   - `01-user-common/`
   - `02-admin/`
   - `03-secondary-user/`

**OR** import individual collections as needed.

---

### Step 2: Set Base URL

1. Click on any collection
2. Go to **Variables** tab
3. Set `baseUrl` to: `http://localhost:5000`

---

### Step 3: Authenticate

1. Open `00-public-auth/00-Public-Auth.postman_collection.json`
2. Run **Register User** request
3. Run **Login** request
4. Access tokens automatically saved to environment

---

### Step 4: Test by Role

#### Test as Child/Student:
```
1. Import 00-Public-Auth
2. Import 03-Secondary-User-UPDATED-v2
3. Register/Login as child
4. Test task creation, progress tracking
```

#### Test as Parent:
```
1. Import 00-Public-Auth
2. Import 01-User-Common-Part1-UPDATED
3. Import 01-User-Common-Part2-Charts-Progress
4. Register/Login as parent
5. Test dashboard, charts, child monitoring
```

#### Test as Admin:
```
1. Import 00-Public-Auth
2. Import 02-Admin-Full-UPDATED
3. Register/Login as admin
4. Test user management, analytics, charts
```

---

## 📊 Collection Statistics

| Role | Collections | Total Endpoints | Current Version |
|------|-------------|-----------------|-----------------|
| Public/Auth | 1 | 10 | ✅ v2.0 |
| User Common | 4 | 70 | ✅ v2.0 |
| Admin | 4 | 85 | ✅ v2.0 |
| Secondary User | 2 | 40 | ✅ v2.0 |
| **Total** | **11** | **205** | **✅ All Current** |

---

## 🔧 Version Guide

### Legacy Collections (⚠️ Outdated)
- ❌ **DO NOT USE** - Contains outdated references
- Kept for historical reference only
- Uses old `/api/v1/` paths
- Uses old `/groups/` endpoints
- Missing TaskProgress & Chart endpoints

### Current Collections (✅ Recommended)
- ✅ **USE THESE** - All issues fixed
- Updated to `/v1/` paths
- Updated to `/children-business-user/` endpoints
- Includes TaskProgress endpoints (6)
- Includes Chart endpoints (10)
- Socket.IO documentation included

---

## 📝 Documentation (_docs/)

### Summary Documents
| File | Description |
|------|-------------|
| `README.md` | Original index (legacy reference) |
| `POSTMAN_COLLECTIONS_UPDATE_COMPLETE-12-03-26.md` | Complete update summary |
| `POSTMAN_UPDATE_STATUS-12-03-26.md` | Update tracking |
| `UPDATE_PLAN-12-03-26.md` | Original update plan |
| `FIX_SUMMARY.md` | Fix summary |

---

## 🎯 Common Workflows

### Workflow 1: Test Authentication
```
1. Open 00-public-auth collection
2. Run "Register User"
3. Run "Login"
4. Verify tokens saved
5. Run "Refresh Token"
6. Run "Logout"
```

### Workflow 2: Test Child Task Creation
```
1. Open 03-secondary-user-UPDATED-v2 collection
2. Run "Register Secondary User"
3. Run "Login as Secondary User"
4. Run "Get My Profile" (check isSecondaryUser)
5. Run "Create Personal Task" (always allowed)
6. If secondary: Run "Create Single Assignment"
7. If secondary: Run "Create Collaborative"
```

### Workflow 3: Test Parent Dashboard
```
1. Open 01-user-common-part1-UPDATED collection
2. Run "Login as Parent"
3. Run "Get My Profile"
4. Run "Get My Tasks"
5. Run "Get Daily Progress"
6. Open 01-user-common-part2-charts-progress
7. Run "Get Family Activity Chart"
8. Run "Get Child Progress Comparison"
9. Run "Get Task Status by Child"
```

### Workflow 4: Test Admin Analytics
```
1. Open 02-admin-full-updated collection
2. Run "Login as Admin"
3. Run "Get Admin Dashboard Overview"
4. Run "Get User Growth Chart"
5. Run "Get Task Status Distribution"
6. Run "Get Monthly Income Chart"
7. Run "Get User Ratio Chart"
```

---

## 🔐 Environment Variables

Collections use these variables:

| Variable | Description | Set By |
|----------|-------------|--------|
| `baseUrl` | API base URL | Manual (http://localhost:5000) |
| `accessToken` | JWT access token | Auto (Login) |
| `refreshToken` | JWT refresh token | Auto (Login) |
| `userId` | Current user ID | Auto (Login) |
| `taskId` | Last created task ID | Auto (Create Task) |
| `businessUserId` | Business user ID | Manual |
| `childUserId` | Child user ID | Auto (Create Child) |

---

## ✅ Testing Checklist

### Authentication
- [ ] Register new user
- [ ] Login with credentials
- [ ] Verify tokens saved
- [ ] Refresh access token
- [ ] Logout

### User Common (Part 1)
- [ ] Get user profile
- [ ] Update profile info
- [ ] Get/Update support mode
- [ ] Get/Update notification style
- [ ] Create personal task
- [ ] Create collaborative task
- [ ] Get tasks with filters
- [ ] Update task status
- [ ] Delete task

### User Common (Part 2)
- [ ] Create subtask
- [ ] Get subtasks for task
- [ ] Update subtask
- [ ] Toggle subtask status
- [ ] Get notifications
- [ ] Mark notification as read
- [ ] Get family activity chart
- [ ] Get child progress comparison
- [ ] Get children list
- [ ] Create child account
- [ ] Set secondary user permission

### Admin
- [ ] Get all users (paginate)
- [ ] Get students
- [ ] Get mentors
- [ ] Get admin dashboard
- [ ] Get user growth chart
- [ ] Get task status distribution
- [ ] Get monthly income chart
- [ ] Get user ratio chart
- [ ] Manage subscriptions

### Secondary User
- [ ] Register as secondary user
- [ ] Login as secondary user
- [ ] Check permissions
- [ ] Create personal task
- [ ] Create single assignment (if secondary)
- [ ] Create collaborative (if secondary)
- [ ] Get task progress
- [ ] Complete subtask
- [ ] Get analytics charts

---

## 📞 Support & Resources

### Documentation Locations
- **Postman Collections**: `postman-collections/` (organized by role)
- **Flow Documentation**: `flow/` (organized by feature)
- **Socket.IO Guide**: `src/helpers/socket/SOCKET_IO_INTEGRATION.md`
- **Chart Endpoints**: `src/modules/analytics.module/chartAggregation/`
- **TaskProgress Module**: `src/modules/taskProgress.module/`
- **childrenBusinessUser**: `src/modules/childrenBusinessUser.module/`

### Key Contacts
- **Backend Lead**: [Your Name]
- **Postman Collections**: Complete (v2.0)
- **Flow Documentation**: Complete (v2.0)
- **Socket.IO Integration**: Complete

---

## ✅ Status

**Postman Collections**: ✅ **100% ORGANIZED**  
**Folder Structure**: ✅ **CLEAN & LOGICAL**  
**Version Control**: ✅ **Legacy separated, Current highlighted**  
**Documentation**: ✅ **Complete & accessible**  
**Production Ready**: ✅ **YES**  

---

**Last Updated**: 12-03-26  
**Version**: 2.0 - Organized Structure  
**Maintained By**: Backend Engineering Team  
**Status**: ✅ **READY FOR TESTING**
