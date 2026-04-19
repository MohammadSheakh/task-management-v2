# 🔴 OLD (WRONG) vs ✅ NEW (CORRECTED) - ENDPOINT COMPARISON

## SubTask Endpoints - CRITICAL FIXES

---

## 1️⃣ CREATE SUBTASK

### ❌ OLD (WRONG)
```
POST {{baseUrl}}/v1/tasks/{{taskId}}/subtasks
```
**Problem:** Uses nested route structure (taskId in URL)

### ✅ NEW (CORRECTED)
```
POST {{baseUrl}}/v1/tasks/subtask/
Body: { "taskId": "{{taskId}}", "title": "...", "order": 1 }
```
**Fixed:** taskId moved to request body, matches backend route

**Backend Reference:**
```typescript
// src/modules/task.module/subTask/subTask.route.ts
router.route('/').post(..., controller.create);
// Base: /v1/tasks/subtask/
```

---

## 2️⃣ GET ALL SUBTASKS

### ❌ OLD (WRONG)
```
GET {{baseUrl}}/v1/tasks/{{taskId}}/subtasks
```
**Problem:** Wrong URL structure

### ✅ NEW (CORRECTED)
```
GET {{baseUrl}}/v1/tasks/subtask/task/:taskId
```
**Fixed:** Correct backend route structure

**Backend Reference:**
```typescript
router.route('/task/:taskId').get(..., controller.getSubTasksByTask);
```

---

## 3️⃣ TOGGLE SUBTASK STATUS

### ❌ OLD (WRONG)
```
POST {{baseUrl}}/v1/tasks/{{taskId}}/subtasks/{{subtaskId}}/toggle
```
**Problems:**
- Wrong HTTP method (POST instead of PUT)
- Wrong URL structure
- Missing "-status" suffix

### ✅ NEW (CORRECTED)
```
PUT {{baseUrl}}/v1/tasks/subtask/:subtaskId/toggle-status
Body: { "isCompleted": true }
```
**Fixed:**
- Correct HTTP method (PUT)
- Correct URL structure
- isCompleted in request body

**Backend Reference:**
```typescript
router.route('/:id/toggle-status').put(..., controller.toggleStatus);
```

---

## 4️⃣ MISSING ENDPOINTS (NOW ADDED)

### ✅ NEW - Get Subtasks with Pagination
```
GET {{baseUrl}}/v1/tasks/subtask/task/:taskId/paginate?page=1&limit=10
```

### ✅ NEW - Get Subtask Statistics
```
GET {{baseUrl}}/v1/tasks/subtask/statistics
```

### ✅ NEW - Get Single Subtask
```
GET {{baseUrl}}/v1/tasks/subtask/:subtaskId
```

### ✅ NEW - Update Subtask
```
PUT {{baseUrl}}/v1/tasks/subtask/:subtaskId
Body: { "title": "...", "isCompleted": true, "order": 2 }
```

### ✅ NEW - Delete Subtask
```
DELETE {{baseUrl}}/v1/tasks/subtask/:subtaskId
```

---

## 📊 SUMMARY TABLE

| Operation | Old (Wrong) | New (Corrected) | Status |
|-----------|-------------|-----------------|--------|
| Create | `POST /tasks/:taskId/subtasks` | `POST /tasks/subtask/` | ✅ Fixed |
| Get All | `GET /tasks/:taskId/subtasks` | `GET /tasks/subtask/task/:taskId` | ✅ Fixed |
| Toggle | `POST /tasks/:taskId/subtasks/:id/toggle` | `PUT /tasks/subtask/:id/toggle-status` | ✅ Fixed |
| Paginate | ❌ Missing | `GET /tasks/subtask/task/:taskId/paginate` | ✅ Added |
| Statistics | ❌ Missing | `GET /tasks/subtask/statistics` | ✅ Added |
| Get by ID | ❌ Missing | `GET /tasks/subtask/:id` | ✅ Added |
| Update | ❌ Missing | `PUT /tasks/subtask/:id` | ✅ Added |
| Delete | ❌ Missing | `DELETE /tasks/subtask/:id` | ✅ Added |

---

## 🎯 WHY THE CHANGE?

### Backend Architecture Decision

The backend uses a **flat route structure** for SubTasks instead of **nested routes**:

**Nested Route (NOT USED):**
```
/tasks/:taskId/subtasks
/tasks/:taskId/subtasks/:id
/tasks/:taskId/subtasks/:id/toggle
```

**Flat Route (ACTUAL IMPLEMENTATION):**
```
/tasks/subtask/
/tasks/subtask/task/:taskId
/tasks/subtask/:id
/tasks/subtask/:id/toggle-status
```

### Benefits of Flat Structure:
1. ✅ Clearer separation of concerns (SubTask is independent resource)
2. ✅ Easier to add cross-task subtask operations
3. ✅ Better RESTful design (subtasks are resources, not properties)
4. ✅ Simplifies route nesting logic
5. ✅ Matches GenericController pattern used throughout backend

---

## 📝 TESTING INSTRUCTIONS

1. **Import** the corrected collection: `01-User-Common-Part1-v4-CORRECTED.postman_collection.json`

2. **Set Variables:**
   - `{{baseUrl}}` = `http://localhost:5000`
   - `{{accessToken}}` = Your JWT token
   - `{{taskId}}` = Create a task first, copy its ID
   - `{{subtaskId}}` = Create a subtask first, copy its ID

3. **Test Flow:**
   ```
   1. Create Task → Copy taskId
   2. Create Subtask (use taskId from step 1)
   3. Get All Subtasks (verify creation)
   4. Toggle Subtask Status (verify parent task updates)
   5. Get Task by ID (verify subtask count updated)
   ```

4. **Verify Parent Task Auto-Updates:**
   - After creating subtask → Check `totalSubtasks` increased
   - After toggling subtask → Check `completedSubtasks` updated
   - After completing all subtasks → Check task `status` = "completed"

---

## 🔍 VERIFICATION CHECKLIST

- [x] All SubTask endpoints use flat route structure
- [x] Toggle endpoint uses PUT method (not POST)
- [x] Toggle endpoint includes "-status" suffix
- [x] Create endpoint expects taskId in body (not URL)
- [x] Pagination endpoint added
- [x] Statistics endpoint added
- [x] Get by ID endpoint added
- [x] Update endpoint added
- [x] Delete endpoint added
- [x] All path parameters use `:paramName` format (not `{{paramName}}`)

---

**Document Created:** 16-03-26
**Status:** ✅ READY FOR TESTING
**Collection Version:** v4-CORRECTED
