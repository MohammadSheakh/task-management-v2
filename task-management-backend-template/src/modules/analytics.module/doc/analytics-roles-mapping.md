# Analytics Module - Role-Based Access Control Mapping

## Overview

This document defines the role-based access control (RBAC) for all analytics endpoints in the Task Management system. Each endpoint is mapped to specific user roles based on the Figma design and business requirements.

---

## Role Definitions

| Role | Description | Dashboard |
|------|-------------|-----------|
| `admin` | System administrators managing the entire platform | Main Admin Dashboard |
| `business` | Group owners, parents, teachers (Group Plan subscribers) | Teacher/Parent Dashboard |
| `child` | Group members, children (mobile app users) | Mobile App (Child Interface) |
| `individual` | Standalone individual users (not in groups) | Mobile App (Individual Interface) |

---

## Analytics Sub-Modules

### 1. User Analytics (`/user/my/*`)
**Purpose:** Personal analytics for individual users to track their own productivity

| Endpoint | Roles | Figma Reference | Description |
|----------|-------|-----------------|-------------|
| `GET /user/my/overview` | `child`, `individual` | `home-flow.png` | Complete user analytics overview |
| `GET /user/my/daily-progress` | `child`, `individual` | `home-flow.png` | Today's task progress (X/Y completed) |
| `GET /user/my/weekly-streak` | `child`, `individual` | `profile-permission-account-interface.png` | Current & longest streak data |
| `GET /user/my/productivity-score` | `child`, `individual` | `profile-permission-account-interface.png` | Productivity score (0-100) with breakdown |
| `GET /user/my/completion-rate` | `child`, `individual` | `profile-permission-account-interface.png` | Task completion rate analytics |
| `GET /user/my/task-statistics` | `child`, `individual` | `status-section-flow-01.png` | Tasks by status, priority, type |
| `GET /user/my/trend` | `child`, `individual` | `history_screen.dart` | Daily/weekly/monthly trend data |

**Access Pattern:** All users can view their own personal analytics

---

### 2. Task Analytics (`/task/*`)
**Purpose:** Task-level analytics with role-specific views

#### Admin-Level Task Analytics
| Endpoint | Roles | Figma Reference | Description |
|----------|-------|-----------------|-------------|
| `GET /task/overview` | `admin` | `dashboard-section-flow.png` | Platform-wide task overview |
| `GET /task/status-distribution` | `admin` | `dashboard-section-flow.png` | Task status distribution across platform |
| `GET /task/daily-summary` | `admin` | `dashboard-section-flow.png` | Daily task creation/completion summary |

#### Business (Parent/Teacher) Task Analytics
| Endpoint | Roles | Figma Reference | Description |
|----------|-------|-----------------|-------------|
| `GET /task/group/:groupId` | `business` | `dashboard-flow-01.png` | Group-specific task analytics |
| `GET /task/:taskId/collaborative-progress` | `business` | `task-details-with-subTasks.png` | Collaborative task progress tracking |
| `GET /child/:childId/performance` | `business` | `team-member-flow-01.png` | Individual child's performance analytics |
| `GET /parent/my-children/overview` | `business` | `dashboard-flow-01.png` | All children's performance overview |

**Access Pattern:**
- Admins see platform-wide data
- Business users (parents/teachers) see data for their group members only

---

### 3. Group Analytics (`/group/:groupId/*`)
**Purpose:** Group-level analytics for team/family management

| Endpoint | Roles | Figma Reference | Description |
|----------|-------|-----------------|-------------|
| `GET /group/:groupId/overview` | `business` | `dashboard-flow-01.png` | Group summary & completion rates |
| `GET /group/:groupId/members` | `business` | `team-member-flow-01.png` | Individual member statistics |
| `GET /group/:groupId/leaderboard` | `business` | `dashboard-flow-01.png` | Member productivity leaderboard |
| `GET /group/:groupId/performance` | `business` | `dashboard-flow-01.png` | Group-level performance KPIs |
| `GET /group/:groupId/activity` | `business` | `dashboard-flow-01.png` | Real-time activity feed |

**Access Pattern:** Only group owners/admins (business role) can access group analytics

---

### 4. Admin Analytics (`/admin/*`)
**Purpose:** Platform-wide business intelligence for system administrators

| Endpoint | Roles | Figma Reference | Description |
|----------|-------|-----------------|-------------|
| `GET /admin/dashboard` | `admin` | `dashboard-section-flow.png` | Complete admin dashboard overview |
| `GET /admin/user-growth` | `admin` | `user-list-flow.png` | User growth trends & churn rate |
| `GET /admin/revenue` | `admin` | `subscription-flow.png` | MRR, ARR, subscription revenue |
| `GET /admin/task-metrics` | `admin` | `dashboard-section-flow.png` | Platform task metrics & KPIs |
| `GET /admin/engagement` | `admin` | `dashboard-section-flow.png` | User engagement & retention metrics |

**Access Pattern:** Exclusively for system administrators

---

## Role Access Matrix

```
┌─────────────────────────────────────┬───────┬──────────┬───────┬────────────┐
│ Endpoint Category                   │ Admin │ Business │ Child │ Individual │
├─────────────────────────────────────┼───────┼──────────┼───────┼────────────┤
│ User Analytics (own data)           │  ❌   │    ❌    │   ✅  │     ✅     │
│ Task Analytics (platform-wide)      │  ✅   │    ❌    │   ❌  │     ❌     │
│ Task Analytics (group-specific)     │  ❌   │    ✅    │   ❌  │     ❌     │
│ Group Analytics                     │  ❌   │    ✅    │   ❌  │     ❌     │
│ Admin Analytics                     │  ✅   │    ❌    │   ❌  │     ❌     │
└─────────────────────────────────────┴───────┴──────────┴───────┴────────────┘
```

---

## Implementation Notes

### Middleware Stack
All analytics routes use the following middleware pattern:
```typescript
router.get('/endpoint',
  auth(TRole.<specific-role>),  // Role-based authentication
  controller.<method>
);
```

### Role Constants
- `TRole.admin` - System administrators
- `TRole.business` - Group owners, parents, teachers
- `TRole.child` - Children, group members (mobile users)
- `TRole.individual` - Standalone individual users
- `TRole.commonUser` - Common access level for child, business, individual
- `TRole.common` - Common access level for admin only

### Authorization Logic
- **User Analytics**: Uses `TRole.commonUser` (allows child, business, individual)
- **Task Analytics (Admin)**: Uses `TRole.admin` (admin only)
- **Task Analytics (Business)**: Uses `TRole.business` (business only)
- **Group Analytics**: Uses `TRole.business` (business only)
- **Admin Analytics**: Uses `TRole.admin` (admin only)

---

## Security Considerations

1. **Data Isolation**: Users can only access analytics for their own data or their group members
2. **Role Enforcement**: All routes enforce role-based access via middleware
3. **No Horizontal Privilege Escalation**: Business users cannot access other groups' data
4. **No Vertical Privilege Escalation**: Non-admin users cannot access admin analytics

---

## Figma Asset References

All role assignments are based on the Figma designs located in:
```
/figma-asset/
├── main-admin-dashboard/        → Admin role endpoints
├── teacher-parent-dashboard/    → Business role endpoints
└── app-user/
    ├── group-children-user/     → Child role endpoints
    └── individual-user/         → Individual role endpoints
```

---

**Version:** 1.0.0  
**Last Updated:** 10-03-26  
**Author:** Senior Backend Engineering Team
