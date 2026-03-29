# 🔍 POSTMAN COLLECTION ALIGNMENT ANALYSIS

## Task & SubTask Module Endpoints

**Analyzed:** 16-03-26
**Status:** ⚠️ CRITICAL MISALIGNMENT FOUND
**Priority:** HIGH - Must be fixed before testing

---

## 🚨 EXECUTIVE SUMMARY

The Postman collection `01-User-Common-Part1-v3-COMPLETE.postman_collection.json` has **significant misalignments** with the actual backend implementation in `task.module/`.

**Root Cause:** Postman collection uses **nested route structure**, but backend uses **flat route structure** for SubTasks.

---

## 📊 DETAILED ANALYSIS

### 1️⃣ SUBTASK ROUTES - CRITICAL MISALIGNMENT

#### ❌ Postman Collection Structure (WRONG)
```
Base: /v1/tasks/:taskId/subtasks

POST   /v1/tasks/:taskId/subtasks
GET    /v1/tasks/:taskId/subtasks
POST   /v1/tasks/:taskId/subtasks/:subtaskId/toggle
```

#### ✅ Backend Implementation (CORRECT)
```typescript
// From: src/modules/task.module/subTask/subTask.route.ts

Base: /v1/tasks/subtask/

POST   /v1/tasks/subtask/                          // Create
GET    /v1/tasks/subtask/task/:taskId              // Get all by task
GET    /v1/tasks/subtask/task/:taskId/paginate     // Paginated
GET    /v1/tasks/subtask/statistics                // Statistics
GET    /v1/tasks/subtask/:id                       // Get by ID
PUT    /v1/tasks/subtask/:id                       // Update
PUT    /v1/tasks/subtask/:id/toggle-status         // Toggle status
DELETE /v1/tasks/subtask/:id                       // Delete
```

---

### 2️⃣ TASK ROUTES - MOSTLY ALIGNED ✅

#### ✅ Correctly Aligned Endpoints

| Endpoint | Postman | Backend | Status |
|----------|---------|---------|--------|
| Create Task | `POST /v1/tasks` | `POST /v1/tasks` | ✅ |
| Get Tasks | `GET /v1/tasks` | `GET /v1/tasks` | ✅ |
| Paginated Tasks | `GET /v1/tasks/paginate` | `GET /v1/tasks/paginate` | ✅ |
| Statistics | `GET /v1/tasks/statistics` | `GET /v1/tasks/statistics` | ✅ |
| Daily Progress | `GET /v1/tasks/daily-progress` | `GET /v1/tasks/daily-progress` | ✅ |
| Get Task by ID | `GET /v1/tasks/:taskId` | `GET /v1/tasks/:id` | ✅ |
| Update Task | `PUT /v1/tasks/:taskId` | `PUT /v1/tasks/:id` | ✅ |
| Update Status | `PUT /v1/tasks/:taskId/status` | `PUT /v1/tasks/:id/status` | ✅ |
| Update Subtask Progress | `PUT /v1/tasks/:taskId/subtasks/progress` | `PUT /v1/tasks/:id/subtasks/progress` | ✅ |
| Delete Task | `DELETE /v1/tasks/:taskId` | `DELETE /v1/tasks/:id` | ✅ |
| Preferred Time | `GET /v1/tasks/suggest-preferred-time` | `GET /v1/tasks/suggest-preferred-time` | ✅ |

---

### 3️⃣ MISSING ENDPOINTS IN POSTMAN

The following backend endpoints are **NOT in Postman collection**:

```
❌ GET    /v1/tasks/subtask/task/:taskId/paginate
   Purpose: Get paginated subtasks for a task
   Use Case: When task has 100+ subtasks

❌ GET    /v1/tasks/subtask/statistics
   Purpose: Get subtask completion statistics for logged-in user
   Use Case: Dashboard analytics

❌ GET    /v1/tasks/subtask/:id
   Purpose: Get single subtask details
   Use Case: Edit subtask view

❌ PUT    /v1/tasks/subtask/:id
   Purpose: Update subtask details
   Use Case: Edit subtask title/duration

❌ PUT    /v1/tasks/subtask/:id/toggle-status
   Purpose: Toggle subtask completion (auto-updates parent task)
   Use Case: Checkbox toggle in UI

❌ DELETE /v1/tasks/subtask/:id
   Purpose: Delete a subtask (auto-updates parent task)
   Use Case: Remove unwanted subtask
```

---

## 🔧 REQUIRED FIXES

### Fix #1: Update SubTask Base Path

**Change from:**
```json
"url": "{{baseUrl}}/v1/tasks/{{taskId}}/subtasks"
```

**Change to:**
```json
"url": "{{baseUrl}}/v1/tasks/subtask/task/{{taskId}}"
```

---

### Fix #2: Add Missing Endpoints

Add these 6 missing endpoints to Postman collection under "03 - SubTask Management" folder:

1. **Get Subtasks with Pagination**
   - Method: `GET`
   - URL: `{{baseUrl}}/v1/tasks/subtask/task/:taskId/paginate?page=1&limit=10`

2. **Get Subtask Statistics**
   - Method: `GET`
   - URL: `{{baseUrl}}/v1/tasks/subtask/statistics`

3. **Get Single Subtask**
   - Method: `GET`
   - URL: `{{baseUrl}}/v1/tasks/subtask/:subtaskId`

4. **Update Subtask**
   - Method: `PUT`
   - URL: `{{baseUrl}}/v1/tasks/subtask/:subtaskId`
   - Body: `{ "title": "Updated title", "isCompleted": true }`

5. **Toggle Subtask Status**
   - Method: `PUT`
   - URL: `{{baseUrl}}/v1/tasks/subtask/:subtaskId/toggle-status`
   - Body: `{ "isCompleted": true }`

6. **Delete Subtask**
   - Method: `DELETE`
   - URL: `{{baseUrl}}/v1/tasks/subtask/:subtaskId`

---

### Fix #3: Update Toggle Endpoint

**Current (WRONG):**
```
POST /v1/tasks/{{taskId}}/subtasks/{{subtaskId}}/toggle
```

**Should be:**
```
PUT /v1/tasks/subtask/:subtaskId/toggle-status
```

---

## 📝 RECOMMENDED POSTMAN STRUCTURE

```
01 - User Common (Part 1)
├── 01 - User Profile
│   ├── GET  /v1/users/profile
│   └── PUT  /v1/users/profile-info
│
├── 02 - Task Management
│   ├── GET  /v1/tasks/daily-progress
│   ├── GET  /v1/tasks/statistics
│   ├── GET  /v1/tasks?status=pending
│   ├── GET  /v1/tasks/paginate?page=1
│   ├── GET  /v1/tasks/:taskId
│   ├── POST /v1/tasks
│   ├── PUT  /v1/tasks/:taskId
│   ├── PUT  /v1/tasks/:taskId/status
│   ├── PUT  /v1/tasks/:taskId/subtasks/progress
│   ├── DELETE /v1/tasks/:taskId
│   └── GET  /v1/tasks/suggest-preferred-time
│
└── 03 - SubTask Management
    ├── POST /v1/tasks/subtask/                    [Create]
    ├── GET  /v1/tasks/subtask/task/:taskId        [Get All by Task]
    ├── GET  /v1/tasks/subtask/task/:taskId/paginate [Paginated]
    ├── GET  /v1/tasks/subtask/statistics          [Statistics]
    ├── GET  /v1/tasks/subtask/:subtaskId          [Get by ID]
    ├── PUT  /v1/tasks/subtask/:subtaskId          [Update]
    ├── PUT  /v1/tasks/subtask/:subtaskId/toggle-status [Toggle]
    └── DELETE /v1/tasks/subtask/:subtaskId        [Delete]
```

---

## 🎯 IMPACT ASSESSMENT

### If Not Fixed:
- ❌ Cannot test subtask features properly
- ❌ Developers will be confused about correct endpoints
- ❌ API documentation will be misleading
- ❌ Frontend team will implement wrong URLs

### After Fixing:
- ✅ Accurate API testing
- ✅ Clear documentation for frontend team
- ✅ Proper endpoint coverage tracking
- ✅ Aligned with backend implementation

---

## 📌 NEXT STEPS

1. **Immediate:** Update existing SubTask endpoints in Postman
2. **Add:** 6 missing endpoints listed above
3. **Verify:** All route parameters use `:paramName` format (not `{{paramName}}`)
4. **Test:** Each endpoint with valid authentication
5. **Document:** Add request/response examples for each endpoint

---

## 🔍 VERIFICATION CHECKLIST

- [ ] SubTask base path changed from `/tasks/:taskId/subtasks` to `/tasks/subtask/`
- [ ] Toggle endpoint updated to `PUT /tasks/subtask/:id/toggle-status`
- [ ] Added pagination endpoint for subtasks
- [ ] Added statistics endpoint for subtasks
- [ ] Added get single subtask endpoint
- [ ] Added update subtask endpoint
- [ ] Added delete subtask endpoint
- [ ] All path parameters use `:paramName` format
- [ ] Request/response examples added
- [ ] Authentication headers configured

---

**Report Generated:** 16-03-26
**Analyst:** Qwen Code (Senior Backend Engineer)
**Status:** ⚠️ AWAITING FIXES
