# 📮 Postman Collections - Update Plan

**Date**: 12-03-26  
**Status**: In Progress  

---

## 🎯 Plan

Update all Postman collections to include new endpoints:
1. ✅ Socket.IO integration endpoints
2. ✅ Chart aggregation endpoints (10 new)
3. ✅ TaskProgress endpoints
4. ✅ ChildrenBusinessUser endpoints

---

## 📝 Collections to Update

### 1. ✅ 00-Public-Auth.postman_collection.json
**Status**: Updated  
**Endpoints**: 10 (Health, Auth, etc.)

---

### 2. 01-User-Common-Part1.postman_collection.json
**Status**: Needs Update  
**New Endpoints to Add**:
- GET /analytics/charts/user-growth
- GET /analytics/charts/task-status
- GET /analytics/charts/family-activity/:businessUserId
- GET /analytics/charts/child-progress/:businessUserId
- GET /analytics/charts/status-by-child/:businessUserId
- GET /analytics/charts/completion-trend/:userId
- GET /analytics/charts/activity-heatmap/:userId
- GET /analytics/charts/collaborative-progress/:taskId

---

### 3. 01-User-Common-Part2.postman_collection.json
**Status**: Needs Update  
**New Endpoints to Add**:
- GET /task-progress/:taskId/user/:userId
- GET /task-progress/:taskId/children
- PUT /task-progress/:taskId/status
- PUT /task-progress/:taskId/subtasks/:subtaskIndex/complete
- GET /children-business-user/children
- POST /children-business-user/create-child
- PUT /children-business-user/set-secondary-user

---

### 4. 02-Admin-Full.postman_collection.json
**Status**: Needs Update  
**New Endpoints to Add**:
- All chart aggregation endpoints (admin view)
- User management enhancements

---

### 5. 03-Secondary-User.postman_collection.json
**Status**: Needs Update  
**New Endpoints to Add**:
- TaskProgress endpoints
- Real-time Socket.IO info

---

## 🔧 Update Strategy

Update collections in this order:
1. ✅ 00-Public-Auth (DONE)
2. ⏳ 01-User-Common-Part1 (User Profile + Tasks + Charts)
3. ⏳ 01-User-Common-Part2 (TaskProgress + ChildrenBusinessUser)
4. ⏳ 02-Admin-Full (Admin analytics + charts)
5. ⏳ 03-Secondary-User (Student/Child view)

---

## 📊 New Endpoints Summary

### Chart Aggregation (10 endpoints)
```
GET /analytics/charts/user-growth?days=30
GET /analytics/charts/task-status
GET /analytics/charts/monthly-income?months=12
GET /analytics/charts/user-ratio
GET /analytics/charts/family-activity/:businessUserId?days=7
GET /analytics/charts/child-progress/:businessUserId
GET /analytics/charts/status-by-child/:businessUserId
GET /analytics/charts/completion-trend/:userId?days=30
GET /analytics/charts/activity-heatmap/:userId?days=30
GET /analytics/charts/collaborative-progress/:taskId
```

### TaskProgress (6 endpoints)
```
GET /task-progress/:taskId/user/:userId
GET /task-progress/:taskId/children
GET /task-progress/child/:childId/tasks
PUT /task-progress/:taskId/status
PUT /task-progress/:taskId/subtasks/:subtaskIndex/complete
POST /task-progress/:taskId
```

### ChildrenBusinessUser (5 endpoints)
```
GET /children-business-user/children
POST /children-business-user/create-child
PUT /children-business-user/:id
DELETE /children-business-user/:id
PUT /children-business-user/set-secondary-user
```

---

**Next**: Update 01-User-Common-Part1.postman_collection.json
