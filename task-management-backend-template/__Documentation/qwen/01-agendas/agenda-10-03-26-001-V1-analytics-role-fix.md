# Agenda - Analytics Module Role-Based Access Control Fix

## Session Information
- **Date:** 10-03-26
- **Session ID:** 001
- **Version:** V1
- **File:** `agenda-10-03-26-001-V1.md`

---

## Objective
Fix and standardize role-based access control (RBAC) for all analytics module routes based on Figma designs and role definitions.

---

## Tasks Completed

### ✅ 1. Role Analysis
- Reviewed `src/middlewares/roles.ts` - Understanding role hierarchy
- Analyzed Figma assets in `figma-asset/` folder:
  - `main-admin-dashboard/` → Admin role
  - `teacher-parent-dashboard/` → Business role
  - `app-user/group-children-user/` → Child role
  - `app-user/individual-user/` → Individual role

### ✅ 2. Role Mapping Definition
Established clear role mapping:
| Role | Dashboard | Use Case |
|------|-----------|----------|
| `admin` | Main Admin Dashboard | Platform-wide analytics |
| `business` | Teacher/Parent Dashboard | Group/family management |
| `child` | Mobile App (Group Member) | Personal analytics |
| `individual` | Mobile App (Standalone) | Personal analytics |

### ✅ 3. Route Files Updated

#### userAnalytics.route.ts
- **Before:** All routes used `TRole.common`
- **After:** All routes use `TRole.commonUser` (child, individual, business)
- **Reason:** Personal analytics should be accessible by all user types for their own data

#### taskAnalytics.route.ts
- **Admin routes** (`/task/overview`, `/task/status-distribution`, `/task/daily-summary`):
  - Changed from `TRole.common` → `TRole.admin`
  - Reason: Platform-wide data is admin-only
  
- **Business routes** (`/task/group/:groupId`, `/task/:taskId/collaborative-progress`, `/child/:childId/performance`, `/parent/my-children/overview`):
  - Changed from `TRole.commonUser` → `TRole.business`
  - Reason: Parent/teacher-specific features for managing group members

#### groupAnalytics.route.ts
- **All routes** changed from `TRole.common` → `TRole.business`
- **Reason:** Group analytics are only for group owners/admins (parents/teachers)

#### adminAnalytics.route.ts
- **Already correct:** All routes use `TRole.admin`
- **Enhanced:** Added detailed descriptions to documentation comments

### ✅ 4. Documentation Created
Created comprehensive role mapping documentation:
- **File:** `src/modules/analytics.module/doc/analytics-roles-mapping.md`
- **Contents:**
  - Role definitions
  - Endpoint-to-role mapping tables
  - Access matrix
  - Implementation notes
  - Security considerations
  - Figma references

### ✅ 5. Documentation Standards Applied
All route comments now follow the format:
```typescript
/*-─────────────────────────────────
|  Role | Module | Figma Reference | Description
└──────────────────────────────────*/
```

---

## Files Modified

1. `src/modules/analytics.module/userAnalytics/userAnalytics.route.ts`
2. `src/modules/analytics.module/taskAnalytics/taskAnalytics.route.ts`
3. `src/modules/analytics.module/groupAnalytics/groupAnalytics.route.ts`
4. `src/modules/analytics.module/adminAnalytics/adminAnalytics.route.ts`

## Files Created

1. `src/modules/analytics.module/doc/analytics-roles-mapping.md`
2. `__Documentation/qwen/agenda-10-03-26-001-V1-analytics-role-fix.md` (this file)

---

## Role Access Summary

### User Analytics (`/user/my/*`)
- **Access:** `child`, `individual`, `business` (via `TRole.commonUser`)
- **Purpose:** Personal productivity tracking for all users

### Task Analytics (`/task/*`)
- **Admin endpoints:** `admin` only
- **Business endpoints:** `business` only (for managing group members)

### Group Analytics (`/group/:groupId/*`)
- **Access:** `business` only
- **Purpose:** Group/family management for parents/teachers

### Admin Analytics (`/admin/*`)
- **Access:** `admin` only
- **Purpose:** Platform-wide business intelligence

---

## Verification Checklist

- [x] All routes have proper role assignments
- [x] All routes have documentation comments with Figma references
- [x] Role assignments align with Figma designs
- [x] Role assignments align with `roles.ts` definitions
- [x] Documentation created for future reference
- [x] No breaking changes to existing middleware patterns

---

## Next Steps

1. Test all analytics endpoints with different role tokens
2. Update Postman collection with role-based categorization
3. Verify frontend alignment (Flutter app & website)
4. Add integration tests for role-based access control

---

**Session Status:** ✅ COMPLETE  
**Date:** 10-03-26
