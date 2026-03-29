# Agenda - Group & GroupMember Modules Role-Based Access Control Fix

## Session Information
- **Date:** 10-03-26
- **Session ID:** 003
- **Version:** V1
- **File:** `agenda-10-03-26-003-V1.md`

---

## Objective
Fix and standardize role-based access control (RBAC) for all group and groupMember module routes based on Figma designs and role definitions.

---

## Modules Overview

### Group Module
Manages family/team groups:
- 7 routes total
- All routes now use `TRole.business` (group owners/admins)

### GroupMember Module
Manages group memberships:
- 13 routes total
- 12 routes use `TRole.business` (owners/admins)
- 1 route uses `TRole.commonUser` (child users - leave group only)

---

## Tasks Completed

### ✅ 1. Module Analysis
Reviewed complete module structure:

**Group Module:**
- `group.route.ts` - Route definitions
- `group.controller.ts` - HTTP request handlers
- `group.service.ts` - Business logic with Redis caching
- `group.model.ts` - Mongoose schema with pagination plugin
- `group.constant.ts` - Constants, rate limits, cache config

**GroupMember Module:**
- `groupMember.route.ts` - Route definitions
- `groupMember.controller.ts` - HTTP request handlers
- `groupMember.service.ts` - Business logic with Redis caching
- `groupMember.model.ts` - Mongoose schema
- `groupMember.constant.ts` - Role hierarchy, permissions

### ✅ 2. Figma Asset Review
Analyzed Figma designs in:
```
/figma-asset/teacher-parent-dashboard/
├── dashboard/
│   └── dashboard-flow-01.png         → Group management screens
├── team-members/
│   ├── create-child-flow.png         → Create member account
│   ├── edit-child-flow.png           → Update member profile
│   └── team-member-flow-01.png       → Member list & management
└── settings-permission-section/
    └── permission-flow.png           → Permission management
```

### ✅ 3. Role Mapping Definition

#### Key Insights:
1. **Business Users (Parents/Teachers)** own and manage groups
2. **Child Users (Members)** can only view their membership and leave groups
3. Group operations are exclusively for business users

#### Group Module Routes Fixed (7 routes):

| Route | Previous | Fixed | Justification |
|-------|----------|-------|---------------|
| `POST /` | `TRole.user` ❌ | `TRole.business` ✅ | Only business users create groups |
| `GET /my` | `TRole.user` ❌ | `TRole.business` ✅ | Only business users have groups |
| `GET /:id` | `TRole.user` ❌ | `TRole.business` ✅ | Group details for members |
| `PUT /:id` | `TRole.user` ❌ | `TRole.business` ✅ | Owner/admin update settings |
| `DELETE /:id` | `TRole.user` ❌ | `TRole.business` ✅ | Owner deletes group |
| `GET /:id/statistics` | `TRole.user` ❌ | `TRole.business` ✅ | Member stats for owner |
| `GET /search` | `TRole.user` ❌ | `TRole.business` ✅ | Search for groups |

#### GroupMember Module Routes Fixed (13 routes):

| Route | Previous | Fixed | Justification |
|-------|----------|-------|---------------|
| `GET /:id/members` | `TRole.user` ❌ | `TRole.business` ✅ | View members (owner/admin) |
| `GET /:groupId/members/:userId` | `TRole.user` ❌ | `TRole.business` ✅ | View member details |
| `POST /:id/members` | `TRole.user` ❌ | `TRole.business` ✅ | Add members (owner/admin) |
| `PUT /:groupId/members/:userId/role` | `TRole.user` ❌ | `TRole.business` ✅ | Update role (owner only) |
| `DELETE /:groupId/members/:userId` | `TRole.user` ❌ | `TRole.business` ✅ | Remove member (owner/admin) |
| `POST /:id/leave` | `TRole.user` ❌ | `TRole.commonUser` ✅ | Child leaves group |
| `GET /:id/count` | `TRole.user` ❌ | `TRole.business` ✅ | Member count |
| `GET /:groupId/check/:userId` | `TRole.user` ❌ | `TRole.business` ✅ | Check membership |
| `GET /:id/permissions` | `TRole.user` ❌ | `TRole.business` ✅ | View permissions |
| `PUT /:id/permissions` | `TRole.user` ❌ | `TRole.business` ✅ | Update permissions |
| `POST /:id/permissions/toggle` | `TRole.user` ❌ | `TRole.business` ✅ | Toggle permission |
| `POST /:id/members/create` | `TRole.user` ❌ | `TRole.business` ✅ | Create member account |
| `PATCH /:id/members/:userId/profile` | `TRole.user` ❌ | `TRole.business` ✅ | Update profile |

### ✅ 4. Route Files Updated

#### group.route.ts Changes:
- Changed all 7 routes from `TRole.user` → `TRole.business`
- Enhanced documentation with Figma references
- Added detailed descriptions

#### groupMember.route.ts Changes:
- Changed 12 routes from `TRole.user` → `TRole.business`
- Changed 1 route (`POST /:id/leave`) from `TRole.user` → `TRole.commonUser`
  - This is the ONLY route child users can access
  - Allows child to voluntarily leave a group
- Enhanced all documentation comments

### ✅ 5. Documentation Created
Created comprehensive role mapping documentation:
- **File:** `src/modules/group.module/doc/group-roles-mapping.md`
- **Contents:**
  - Module purpose
  - Role definitions with hierarchy
  - All 20 routes mapped (7 group + 13 groupMember)
  - Access matrices
  - Data models with indexes
  - Caching strategy
  - Permission matrix
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

1. `src/modules/group.module/group/group.route.ts`
   - Fixed 7 routes with proper `TRole.business` authentication
   - Enhanced documentation comments

2. `src/modules/group.module/groupMember/groupMember.route.ts`
   - Fixed 12 routes with `TRole.business`
   - Fixed 1 route (`leave`) with `TRole.commonUser` for child users
   - Enhanced documentation comments

## Files Created

1. `src/modules/group.module/doc/group-roles-mapping.md`
2. `__Documentation/qwen/agenda-10-03-26-003-V1-group-role-fix.md` (this file)

---

## Role Access Summary

### Group Module - All Business Routes (7/7)

| # | Endpoint | Method | Role | Purpose |
|---|----------|--------|------|---------|
| 1 | `/` | POST | `business` | Create group |
| 2 | `/my` | GET | `business` | Get my groups |
| 3 | `/:id` | GET | `business` | Get group details |
| 4 | `/:id` | PUT | `business` | Update group |
| 5 | `/:id` | DELETE | `business` | Delete group |
| 6 | `/:id/statistics` | GET | `business` | Get statistics |
| 7 | `/search` | GET | `business` | Search groups |

### GroupMember Module - Mixed Roles (12 Business, 1 Child)

#### Business Routes (12/13):
| # | Endpoint | Method | Role | Purpose |
|---|----------|--------|------|---------|
| 1 | `/:id/members` | GET | `business` | Get members |
| 2 | `/:groupId/members/:userId` | GET | `business` | Get member details |
| 3 | `/:id/members` | POST | `business` | Add member |
| 4 | `/:groupId/members/:userId/role` | PUT | `business` | Update role |
| 5 | `/:groupId/members/:userId` | DELETE | `business` | Remove member |
| 6 | `/:id/count` | GET | `business` | Get count |
| 7 | `/:groupId/check/:userId` | GET | `business` | Check membership |
| 8 | `/:id/permissions` | GET | `business` | Get permissions |
| 9 | `/:id/permissions` | PUT | `business` | Update permissions |
| 10 | `/:id/permissions/toggle` | POST | `business` | Toggle permission |
| 11 | `/:id/members/create` | POST | `business` | Create member account |
| 12 | `/:id/members/:userId/profile` | PATCH | `business` | Update profile |

#### Child Routes (1/13):
| # | Endpoint | Method | Role | Purpose |
|---|----------|--------|------|---------|
| 13 | `/:id/leave` | POST | `commonUser` | Leave group |

---

## Access Control Matrices

### Group Module
```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ POST   /                            │  ❌   │    ✅    │   ❌  │
│ GET    /my                          │  ❌   │    ✅    │   ❌  │
│ GET    /:id                         │  ❌   │    ✅    │   ❌  │
│ PUT    /:id                         │  ❌   │    ✅    │   ❌  │
│ DELETE /:id                         │  ❌   │    ✅    │   ❌  │
│ GET    /:id/statistics              │  ❌   │    ✅    │   ❌  │
│ GET    /search                      │  ❌   │    ✅    │   ❌  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

### GroupMember Module
```
┌─────────────────────────────────────┬───────┬──────────┬───────┐
│ Endpoint                            │ Admin │ Business │ Child │
├─────────────────────────────────────┼───────┼──────────┼───────┤
│ GET    /:id/members                 │  ❌   │    ✅    │   ❌  │
│ GET    /:groupId/members/:userId    │  ❌   │    ✅    │   ❌  │
│ POST   /:id/members                 │  ❌   │    ✅    │   ❌  │
│ PUT    /:groupId/members/:userId/role│ ❌   │    ✅    │   ❌  │
│ DELETE /:groupId/members/:userId    │  ❌   │    ✅    │   ❌  │
│ POST   /:id/leave                   │  ❌   │    ❌    │   ✅  │
│ GET    /:id/count                   │  ❌   │    ✅    │   ❌  │
│ GET    /:groupId/check/:userId      │  ❌   │    ✅    │   ❌  │
│ GET    /:id/permissions             │  ❌   │    ✅    │   ❌  │
│ PUT    /:id/permissions             │  ❌   │    ✅    │   ❌  │
│ POST   /:id/permissions/toggle      │  ❌   │    ✅    │   ❌  │
│ POST   /:id/members/create          │  ❌   │    ✅    │   ❌  │
│ PATCH  /:id/members/:userId/profile│  ❌   │    ✅    │   ❌  │
└─────────────────────────────────────┴───────┴──────────┴───────┘
```

---

## Group Hierarchy

```
┌─────────────────────────────────────────────┐
│              GROUP HIERARCHY                │
├─────────────────────────────────────────────┤
│  OWNER (Business User - Group Creator)      │
│    ├─ Can delete group                      │
│    ├─ Can promote/demote members            │
│    ├─ Can manage all settings               │
│    └─ Can remove any member                 │
├─────────────────────────────────────────────┤
│  ADMIN (Business User - Trusted Member)     │
│    ├─ Can add/remove members                │
│    ├─ Can manage settings                   │
│    └─ Cannot delete group or remove owner   │
├─────────────────────────────────────────────┤
│  MEMBER (Child/Secondary User)              │
│    ├─ Can view group info                   │
│    ├─ Can view own tasks                    │
│    └─ Can leave group (self-removal)        │
└─────────────────────────────────────────────┘
```

---

## Permission Matrix

```
┌──────────────────────┬───────┬───────┬──────────┐
│ Permission           │ Owner │ Admin │ Member   │
├──────────────────────┼───────┼───────┼──────────┤
│ Edit Group           │   ✅  │   ✅  │    ❌    │
│ Delete Group         │   ✅  │   ❌  │    ❌    │
│ Invite Members       │   ✅  │   ✅  │    ❌    │
│ Remove Members       │   ✅  │   ✅  │    ❌    │
│ Promote Members      │   ✅  │   ❌  │    ❌    │
│ Manage Settings      │   ✅  │   ✅  │    ❌    │
│ View Analytics       │   ✅  │   ✅  │    ❌    │
│ Create Tasks         │   ✅  │   ✅  │    ⚠️    │
└──────────────────────┴───────┴───────┴──────────┘
```
⚠️ Members need explicit `canCreateTasks` permission

---

## Key Business Logic

### Group Creation
- Business users can create up to 50 groups
- Name must be unique
- Owner is automatically the first member

### Member Management
- Owners/admins can add members
- Only owners can update member roles
- Cannot remove the only owner
- Members can leave groups voluntarily

### Permission System
- Owners/admins have full permissions by default
- Members need explicit `canCreateTasks` permission
- Permissions can be granted/revoked individually

### Caching Strategy
| Cache Key | TTL | Purpose |
|-----------|-----|---------|
| `group:<id>` | 5 min | Group details |
| `group:<id>:members` | 3 min | Member list |
| `group:<id>:memberCount` | 1 min | Member count |
| `user:<id>:groups` | 10 min | User's groups |

---

## Security Improvements

### Before Fix:
```typescript
// ❌ PROBLEM: Too permissive - any user could manage groups
router.route('/').post(auth(TRole.user), ...)
```

### After Fix:
```typescript
// ✅ SOLUTION: Only business users (parents/teachers)
router.route('/').post(auth(TRole.business), ...)
```

### Impact:
- ✅ Prevents unauthorized group creation
- ✅ Ensures only business users manage family/team groups
- ✅ Child users can only leave groups (self-determination)
- ✅ Protects against privilege escalation
- ✅ Aligns with Figma design (Teacher/Parent Dashboard only)

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

**Group Module:**
1. ✅ Business user can create group
2. ❌ Child user cannot create group (403 Forbidden)
3. ✅ Business user can view their groups
4. ❌ Business user cannot view another's private group
5. ✅ Owner can delete group
6. ❌ Admin cannot delete group (403 Forbidden)

**GroupMember Module:**
1. ✅ Owner can add members
2. ✅ Admin can add members
3. ❌ Member cannot add members (403 Forbidden)
4. ✅ Owner can update member roles
5. ❌ Admin cannot update member roles (403 Forbidden)
6. ✅ Child user can leave group
7. ❌ Child user cannot remove other members (403 Forbidden)
8. ✅ Owner can manage permissions
9. ❌ Member cannot manage permissions (403 Forbidden)

### Integration Tests:
1. Create group → Add member → Update role → Remove member
2. Create member account → Verify user created → Verify membership added
3. Update permissions → Verify member can/cannot create tasks
4. Leave group → Verify membership removed → Verify count decremented

---

## Next Steps

1. **Test all endpoints** with different role tokens
2. **Update Postman collection** with group and groupMember endpoints
3. **Verify frontend alignment** (Flutter app & website)
4. **Add integration tests** for role-based access control
5. **Monitor rate limiting** in production
6. **Review cache hit rates** for optimization

---

## Related Modules

This module interacts with:
- **User Module**: Group members are users
- **Task Module**: Members create/manage tasks within groups
- **Analytics Module**: Group-level analytics
- **Subscription Module**: Group size limits based on subscription
- **Notification Module**: Member invitations, role changes

---

**Session Status:** ✅ COMPLETE  
**Date:** 10-03-26  
**Duration:** ~45 minutes  
**Engineer:** Senior Backend Engineering Team
