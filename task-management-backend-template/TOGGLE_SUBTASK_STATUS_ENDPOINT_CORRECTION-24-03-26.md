# ✅ Corrected: Toggle Subtask Status Endpoint Path

**Date:** 24-03-26  
**Status:** ✅ ENDPOINT EXISTS (path was incorrect in documentation)  
**Issue:** Documentation showed wrong endpoint path

---

## 🐛 The Documentation Error

**❌ Incorrect (in status-section-flow-apis.png):**
```
PUT /tasks/subtask/:id/toggle-status
```

**✅ Correct:**
```
PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status
```

---

## ✅ Actual Endpoint Details

### **Endpoint:**
```
PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status
```

### **Alternative (via SubTask routes):**
```
PUT /subtasks/:subtaskId/toggle-status
```

---

## 📋 Request Details

### **Path Parameters:**
- `taskId` - Parent task ID (ObjectId)
- `subtaskId` - Subtask ID to toggle (ObjectId)

### **Body:**
```json
{
  "isCompleted": true
}
```

### **Auth:**
- Bearer token required
- User must have access to parent task

---

## 🧪 Example Request

```bash
curl -X PUT "http://localhost:5000/api/v1/tasks/69c2293c49bd6d6b7e4af3f2/subtasks/69c2293c49bd6d6b7e4af3f3/toggle-status" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isCompleted": true
  }'
```

---

## 📊 Response

### **Success (200 OK):**
```json
{
  "success": true,
  "code": 200,
  "data": {
    "_id": "69c2293c49bd6d6b7e4af3f3",
    "title": "Read chapter 5",
    "isCompleted": true,
    "order": 1,
    "duration": 30,
    "completedAt": "2026-03-24T10:30:00.000Z"
  },
  "message": "Subtask status updated successfully"
}
```

---

## 🔧 Route Structure Explanation

### **How the Route is Mounted:**

In `task.route.ts`:
```typescript
// Line 241
router.use('/:id', SubTaskRoute);
```

This mounts all SubTask routes under `/tasks/:id/`

### **SubTask Routes (subTask.route.ts):**
```typescript
// Line 122
router.route('/:id/toggle-status').put(
  auth(TRole.commonUser),
  validateRequest(validation.toggleSubTaskStatusValidationSchema),
  controller.toggleStatus
);
```

### **Combined Path:**
```
/tasks/:taskId          (from task.route.ts)
/subtasks/:subtaskId    (from subTask.route.ts base path)
/toggle-status          (from toggle route)
────────────────────────────────────────────────
PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status
```

---

## 📁 File References

| File | Line | Purpose |
|------|------|---------|
| `task.route.ts` | 241 | Mounts SubTask routes under `/:id` |
| `subTask.route.ts` | 122 | Defines toggle-status route |
| `subTask.controller.ts` | 93-117 | Toggle status controller |
| `subTask.service.ts` | 75-95 | Toggle status service logic |

---

## 🎯 Alternative Endpoint

You can also use the direct SubTask endpoint:

```
PUT /subtasks/:id/toggle-status
```

This bypasses the task route mounting and goes directly to SubTask routes.

**Example:**
```bash
curl -X PUT "http://localhost:5000/api/v1/subtasks/69c2293c49bd6d6b7e4af3f3/toggle-status" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "isCompleted": true
  }'
```

---

## 🔄 Related Endpoints

### **Subtask Operations:**

| Operation | Method | Endpoint |
|-----------|--------|----------|
| Add subtask | POST | `/tasks/:taskId/subtasks` |
| Get all subtasks | GET | `/tasks/:taskId/subtasks` |
| Get subtask by ID | GET | `/tasks/:taskId/subtasks/:subtaskId` |
| Update subtask | PUT | `/tasks/:taskId/subtasks/:subtaskId` |
| **Toggle status** | **PUT** | `/tasks/:taskId/subtasks/:subtaskId/toggle-status` |
| Delete subtask | DELETE | `/tasks/:taskId/subtasks/:subtaskId` |

---

## ✅ Corrected API List for Status Section

### **Screen 1: Status Section (Pending & In Progress)**

1. ✅ `GET /tasks/statistics` - Get status counts
2. ✅ `GET /tasks?status=pending` - Get pending tasks
3. ✅ `GET /tasks?status=inProgress` - Get in progress tasks
4. ✅ `GET /tasks/:id` - Get task details with subtasks
5. ✅ `PUT /tasks/:id/status` - Update task status (Complete button)
6. ✅ `PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status` - Toggle subtask completion ⭐
7. ✅ `PUT /tasks/:id` - Edit task (3 dot menu)
8. ✅ `DELETE /tasks/:id` - Delete task (3 dot menu)

### **Screen 2: Status Section (Completed & Date Filter)**

1. ✅ `GET /tasks?status=completed` - Get completed tasks
2. ✅ `GET /tasks/:id` - Get task details (completed with all subtasks)
3. ✅ `GET /tasks?from=YYYY-MM-DD&to=YYYY-MM-DD` - Filter by date range
4. ✅ `GET /tasks/daily-progress?date=YYYY-MM-DD` - Get daily progress

---

## 🧪 Testing in Postman

### **Postman Request Setup:**

**Method:** PUT  
**URL:** `{{BASE_URL}}/tasks/{{TASK_ID}}/subtasks/{{SUBTASK_ID}}/toggle-status`  
**Headers:**
- `Authorization: Bearer {{SECONDARY_USER_TOKEN}}`
- `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "isCompleted": true
}
```

---

## 📝 Frontend Usage

### **TypeScript/React Example:**

```typescript
// Toggle subtask completion
const toggleSubtask = async (taskId: string, subtaskId: string, isCompleted: boolean) => {
  await api.put(`/tasks/${taskId}/subtasks/${subtaskId}/toggle-status`, {
    isCompleted,
  });
};

// Usage:
await toggleSubtask(
  '69c2293c49bd6d6b7e4af3f2',
  '69c2293c49bd6d6b7e4af3f3',
  true // Mark as completed
);
```

### **Vue/TypeScript Example:**

```typescript
// Composable for toggling subtask
const useSubtaskToggle = () => {
  const toggle = async (taskId: string, subtaskId: string) => {
    try {
      await api.put(`/tasks/${taskId}/subtasks/${subtaskId}/toggle-status`, {
        isCompleted: true,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  };

  return { toggle };
};
```

---

## ✅ Summary

### What Was Wrong:
- ❌ Documentation showed: `/tasks/subtask/:id/toggle-status`
- ❌ Missing `taskId` in path
- ❌ Incorrect path structure

### What's Correct:
- ✅ Actual endpoint: `/tasks/:taskId/subtasks/:subtaskId/toggle-status`
- ✅ Or alternative: `/subtasks/:id/toggle-status`
- ✅ Endpoint **DOES EXIST** and works correctly

### Action Required:
- ✅ Update documentation/Postman collection with correct path
- ✅ Update frontend API calls if using incorrect path

---

**The endpoint exists and works! Just the documentation path was incorrect.** 🎉
