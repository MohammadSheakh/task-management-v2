# 📋 Gap Fix Agenda - Phase 1

**Date**: 2026-03-06  
**Phase**: 1 - Critical Backend Fixes  
**Estimated Time**: 1 hour  
**Status**: ✅ IN PROGRESS

---

## 🎯 Objective

Fix the 3 critical gaps identified in the backend-frontend alignment review.

---

## 🔴 Gaps to Fix

### Gap #1: Missing `time` field alias
- **Issue**: Flutter expects `time` field, backend has `scheduledTime`
- **Impact**: API response parsing fails in Flutter
- **Solution**: Add virtual field in task.model.ts
- **File**: `src/modules/task.module/task/task.model.ts`

### Gap #2: Missing `assignedBy` for group tasks
- **Issue**: Flutter group tasks need `assignedBy` field
- **Impact**: Cannot show who assigned a group task
- **Solution**: Add virtual field populated from `createdById`
- **File**: `src/modules/task.module/task/task.model.ts`

### Gap #3: Website Redux not configured
- **Issue**: Website has empty apiSlice.js
- **Impact**: Website disconnected from backend
- **Solution**: Create taskApiSlice, groupApiSlice, notificationApiSlice
- **Files**: `Task-Management-website/src/redux/api/`

---

## 📝 Implementation Plan

### Step 1: Add Virtual Fields to Task Model (30 min)

**File**: `task.model.ts`

```typescript
// Virtual: time alias for scheduledTime (Flutter compatibility)
taskSchema.virtual('time').get(function () {
  return this.scheduledTime || formatTime(this.startTime);
});

// Virtual: assignedBy for group tasks
taskSchema.virtual('assignedBy').get(function () {
  return this.createdById;
});
```

**Update Transform**:
```typescript
taskSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    // Include virtuals in response
    if (ret.scheduledTime) ret.time = ret.scheduledTime;
    if (ret.createdById) ret.assignedBy = ret.createdById;
    return ret;
  }
});
```

---

### Step 2: Create Website Redux Slices (30 min)

**Files to Create**:
1. `taskApiSlice.js` - Task endpoints
2. `groupApiSlice.js` - Group endpoints
3. `notificationApiSlice.js` - Notification endpoints

**Update**: `apiSlice.js` - Add tag types

---

## 📊 Documentation Required

For each gap fix, create:
1. ✅ **Diagram** - Show data flow before/after
2. ✅ **Report** - Document the fix with examples
3. ✅ **Test cases** - Verify the fix works

---

## ✅ Definition of Done

- [ ] `time` virtual field added and working
- [ ] `assignedBy` virtual field added and working
- [ ] Website Redux slices created
- [ ] All API endpoints tested
- [ ] Gap fix report created with diagrams
- [ ] Flutter can parse API responses correctly

---

## 🧪 Testing Checklist

After fixes:
- [ ] GET /tasks/:id → Response includes `time` field
- [ ] GET /tasks/:id (group task) → Response includes `assignedBy`
- [ ] Website → Can load tasks via Redux
- [ ] Website → Can create tasks via Redux
- [ ] Flutter → Can parse task responses

---

**Status**: Ready to implement  
**Next**: Add virtual fields to task.model.ts
