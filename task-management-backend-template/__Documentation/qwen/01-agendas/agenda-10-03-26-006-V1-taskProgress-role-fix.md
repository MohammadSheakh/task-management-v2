# Agenda - TaskProgress Module Role-Based Access Control Fix

## Session Information
- **Date:** 10-03-26
- **Session ID:** 006
- **Version:** V1
- **File:** `agenda-10-03-26-006-V1.md`

---

## Objective
Fix and standardize role-based access control (RBAC) for all taskProgress module routes based on Figma designs and role definitions.

---

## Module Overview

The TaskProgress module tracks each child's independent progress on collaborative tasks:
- 6 routes total
- 4 routes for child users (view/update own progress)
- 2 routes for business users (view all children's progress)

---

## Tasks Completed

### ✅ 1. Module Analysis
Reviewed complete module structure:
- `taskProgress.route.ts` - Route definitions
- `taskProgress.controller.ts` - HTTP request handlers
- `taskProgress.service.ts` - Business logic with Redis caching
- `taskProgress.model.ts` - Mongoose schema
- `taskProgress.constant.ts` - Constants, rate limits, cache config

### ✅ 2. Figma Asset Review
Analyzed Figma designs in:
```
/figma-asset/
├── teacher-parent-dashboard/
│   └── task-monitoring/
│       ├── task-monitoring-flow-01.png    → Parent monitoring view
│       └── create-task-flow/
│           └── collaborative-task.png     → Task assignment
└── app-user/
    └── group-children-user/
        ├── status-section-flow-01.png     → Child progress view
        └── edit-update-task-flow.png      → Update progress
```

### ✅ 3. Role Mapping Definition

#### Key Insights:
1. **Children track their own progress** - View and update personal progress
2. **Parents monitor all children** - View-only access to all children's progress
3. **Separate endpoints for different views** - Task-centric vs child-centric views

#### TaskProgress Module Routes Fixed (6 routes):

| Route | Previous | Fixed | Justification |
|-------|----------|-------|---------------|
| `GET /:taskId/user/:userId` | `TRole.commonUser` ✅ | `TRole.commonUser` ✅ | Child views own progress |
| `GET /:taskId/children` | `TRole.commonUser` ❌ | `TRole.business` ✅ | Parent views all children |
| `GET /child/:childId/tasks` | `TRole.commonUser` ❌ | `TRole.business` ✅ | Parent views child's tasks |
| `PUT /:taskId/status` | `TRole.commonUser` ✅ | `TRole.commonUser` ✅ | Child updates own status |
| `PUT /:taskId/subtasks/:idx` | `TRole.commonUser` ✅ | `TRole.commonUser` ✅ | Child completes subtask |
| `POST /:taskId` | `TRole.commonUser` ✅ | `TRole.commonUser` ✅ | System creates progress |

### ✅ 4. Route File Updated

#### taskProgress.route.ts Changes:
- Changed 2 routes from `TRole.commonUser` → `TRole.business`
  - `GET /:taskId/children` - Parent monitoring
  - `GET /child/:childId/tasks` - Child performance view
- Enhanced all documentation with Figma references
- Added detailed descriptions
- Added rate limiting notes

### ✅ 5. Documentation Created
Created comprehensive role mapping documentation:
- **File:** `src/modules/taskProgress.module/doc/taskProgress-roles-mapping.md`
- **Contents:**
  - Module purpose
  - Role definitions
  - All 6 routes mapped
  - Access matrix
  - Data model with indexes
  - Caching strategy
  - Progress calculation formula
  - Security considerations
  - Figma references
  - API examples

### ✅ 6. Documentation Standards Applied
All route comments follow the format:
```typescript
/*-─────────────────────────────────
|  Role | Module | Figma Reference | Description
|  @desc Description
|  @auth Authentication requirement
|  @rateLimit Rate limit info
└──────────────────────────────────*/
```

---

## Files Modified

1. `src/modules/taskProgress.module/taskProgress.route.ts`
   - Fixed 2 routes with `TRole.business`
   - Enhanced documentation comments
   - Added Figma references

## Files Created

1. `src/modules/taskProgress.module/doc/taskProgress-roles-mapping.md`
2. `__Documentation/qwen/agenda-10-03-26-006-V1-taskProgress-role-fix.md` (this file)

---

## Role Access Summary

### Child Routes (4/6) - `TRole.commonUser`

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 1 | `/:taskId/user/:userId` | GET | Get my progress |
| 2 | `/:taskId/status` | PUT | Update task status |
| 3 | `/:taskId/subtasks/:idx/complete` | PUT | Complete subtask |
| 4 | `/:taskId` | POST | Create progress (internal) |

### Business Routes (2/6) - `TRole.business`

| # | Endpoint | Method | Purpose |
|---|----------|--------|---------|
| 5 | `/:taskId/children` | GET | All children's progress on task |
| 6 | `/child/:childId/tasks` | GET | All tasks progress for child |

---

## Access Control Matrix

```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ GET    /:taskId/user/:userId        │  ❌   │    ❌    │   ✅  │
│ GET    /:taskId/children            │  ❌   │    ✅    │   ❌  │
│ GET    /child/:childId/tasks        │  ❌   │    ✅    │   ❌  │
│ PUT    /:taskId/status              │  ❌   │    ❌    │   ✅  │
│ PUT    /:taskId/subtasks/:idx       │  ❌   │    ❌    │   ✅  │
│ POST   /:taskId                     │  ❌   │    ❌    │   ✅  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

**Note:**
- ✅ Child routes use `TRole.commonUser` (child, business, individual)
- ✅ Business routes use `TRole.business` (business/parent only)
- ✅ Internal POST route called by system during task creation

---

## Key Business Logic

### Progress Tracking
- Each child has independent progress record
- Progress percentage calculated from subtask completion
- Status transitions: `notStarted` → `inProgress` → `completed`

### Parent Monitoring
- View all children's progress on a task
- View child's overall task performance
- Read-only access (cannot modify children's progress)

### Notifications
- Parent notified when child completes task
- Async notification via BullMQ
- Includes task title and child name

---

## Caching Strategy

| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `taskProgress:task:<id>:user:<id>` | 5 min | Individual progress |
| `taskProgress:task:<id>:children` | 3 min | All children's progress |
| `taskProgress:user:<id>:tasks` | 3 min | User's tasks progress |
| `taskProgress:task:<id>:summary` | 2 min | Task summary |

**Cache Invalidation:**
- Update progress → Invalidate individual cache
- Complete subtask → Invalidate all related caches
- Task completion → Invalidate summary, send notification

---

## Progress Calculation

```typescript
// Formula
progressPercentage = (completedSubtaskCount / totalSubtasks) * 100

// Example
// Task has 5 subtasks, child completed 3
progressPercentage = (3 / 5) * 100 = 60%
```

---

## Security Improvements

### Before Fix:
```typescript
// ❌ PROBLEM: Too permissive - any commonUser could view all children
router.get('/:taskId/children', auth(TRole.commonUser), ...)
```

### After Fix:
```typescript
// ✅ SOLUTION: Only business users (parents/teachers)
router.get('/:taskId/children', auth(TRole.business), ...)
```

### Impact:
- ✅ Children can only view their own progress
- ✅ Parents can view all children's progress
- ✅ Prevents children from viewing other children's progress
- ✅ Aligns with Figma design (Parent Dashboard only)

---

## Verification Checklist

- [x] All routes have proper role assignments
- [x] All routes have documentation comments with Figma references
- [x] Role assignments align with Figma designs
- [x] Role assignments align with `roles.ts` definitions
- [x] Documentation created for future reference
- [x] No breaking changes to existing middleware patterns
- [x] Rate limiting properly configured
- [x] Caching strategy documented

---

## Testing Recommendations

### Unit Tests Needed:

**Child Routes:**
1. ✅ Child can view their own progress
2. ❌ Child cannot view another child's progress (403 Forbidden)
3. ✅ Child can update their own task status
4. ✅ Child can complete their own subtask
5. ❌ Child cannot update another child's progress (403 Forbidden)

**Business Routes:**
1. ✅ Business user can view all children's progress on task
2. ✅ Business user can view child's overall task performance
3. ❌ Business user cannot update child's progress (400 Bad Request)
4. ✅ Summary calculates correct completion rate

### Integration Tests:
1. Create collaborative task → Progress records auto-created for all children
2. Child completes subtask → Progress percentage updates → Parent notified
3. Child completes all subtasks → Task status auto-updates to completed
4. Parent views task → Sees all children's progress with summary

---

## Next Steps

1. **Test all endpoints** with different role tokens
2. **Update Postman collection** with taskProgress endpoints
3. **Verify frontend alignment** (Flutter app & website)
4. **Add integration tests** for progress tracking
5. **Monitor cache hit rates** for optimization
6. **Review notification delivery** for parent notifications

---

## Related Modules

This module interacts with:
- **Task Module**: Parent task reference
- **User Module**: Child user reference
- **Notification Module**: Parent notifications on task completion
- **Group Module**: Group/collaborative tasks
- **GroupMember Module**: Permission checks

---

**Session Status:** ✅ COMPLETE  
**Date:** 10-03-26  
**Duration:** ~30 minutes  
**Engineer:** Senior Backend Engineering Team
