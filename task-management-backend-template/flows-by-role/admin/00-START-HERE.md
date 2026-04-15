# 🔄 API Flow Documentation - Role-Based Organization

**Project:** Task Management Backend  
**Last Updated:** 15-03-26  
**Version:** 6.0 - Pure Role-Based Structure  

---

## 📁 Complete Structure

```
flow/
├── README.md                          ← This file
└── _flows-by-role/                    ← ALL flows organized by role
    ├── child-student/                 ← 7 flows for child users
    │   ├── 00-README.md               ← Role index
    │   ├── 01-child-student-home-flow-v1.5.md
    │   ├── 02-child-home-realtime-v2.md
    │   ├── 03-child-task-creation-v1.5.md
    │   ├── 04-child-task-creation-realtime-v2.md
    │   ├── 05-child-task-creation-with-permission-v2.md
    │   ├── 06-child-task-progress-realtime-flow.md
    │   └── 07-preferred-time-suggestion-flow.md
    │
    ├── parent-teacher/                ← 3 flows for parent users
    │   ├── 00-README.md               ← Role index
    │   ├── 01-business-parent-dashboard-v1.5.md
    │   ├── 02-parent-dashboard-realtime-v2.md
    │   └── 03-parent-realtime-monitoring-flow.md
    │
    ├── admin/                         ← 1 flow for admin users
    │   ├── 00-README.md               ← Role index
    │   └── 01-admin-dashboard-flow.md
    │
    └── all-users/                     ← 5 flows for all users
        ├── 00-README.md               ← Role index
        ├── 01-auth-onboarding-flow.md
        ├── 02-subscription-flow.md
        ├── 03-task-reminders-flow.md
        ├── 04-analytics-charts-flow.md
        └── 05-settings-flow.md
```

---

## 🎯 Quick Navigation

### 👨‍🎓 For Child/Student App Developer
**Go to:** `_flows-by-role/child-student/`

**7 Flows:**
- Home screen (HTTP + Real-Time v2)
- Task creation (HTTP + Real-Time v2)
- Task creation with permissions
- Task progress tracking
- Preferred time settings

---

### 👨‍🏫 For Parent/Teacher Dashboard Developer
**Go to:** `_flows-by-role/parent-teacher/`

**3 Flows:**
- Dashboard (HTTP + Real-Time v2)
- Real-time monitoring
- Live activity feed

---

### 👤 For Admin Dashboard Developer
**Go to:** `_flows-by-role/admin/`

**1 Flow:**
- Complete platform management

---

### 🌐 For All Apps (Shared Features)
**Go to:** `_flows-by-role/all-users/`

**5 Flows:**
- Authentication (login, register, OAuth)
- Subscription management
- Task reminders
- Analytics charts
- Settings

---

## 📊 Complete Flow Inventory

### Child/Student (7 flows)

| # | Flow | Version | Type | Recommended |
|---|------|---------|------|-------------|
| 1 | Home Screen | v1.5 | HTTP | Quick reference |
| 2 | Home Screen | v2.0 | **Real-Time** ⭐ | **Production** |
| 3 | Task Creation | v1.5 | HTTP | Quick reference |
| 4 | Task Creation | v2.0 | **Real-Time** ⭐ | **Production** |
| 5 | Task Creation (Permission) | v2.0 | Real-Time | Production |
| 6 | Task Progress | v2.0 | Real-Time | Production |
| 7 | Preferred Time | v1.0 | HTTP | Production |

---

### Parent/Teacher (3 flows)

| # | Flow | Version | Type | Recommended |
|---|------|---------|------|-------------|
| 1 | Dashboard | v1.5 | HTTP | Quick reference |
| 2 | Dashboard | v2.0 | **Real-Time** ⭐ | **Production** |
| 3 | Real-Time Monitoring | v2.0 | Real-Time | Production |

---

### Admin (1 flow)

| # | Flow | Version | Type |
|---|------|---------|------|
| 1 | Admin Dashboard | v1.0 | HTTP |

---

### All Users (5 flows)

| # | Flow | Version | Endpoints |
|---|------|---------|-----------|
| 1 | Authentication | v1.0 | 10+ |
| 2 | Subscription | v1.0 | 7+ |
| 3 | Task Reminders | v1.0 | 5+ |
| 4 | Analytics Charts | v1.0 | 10+ |
| 5 | Settings | v1.0 | 7+ |

---

## 🎯 Implementation Priority

### MVP (Must Have)

**Child App:**
1. ✅ `_flows-by-role/all-users/01-auth-onboarding-flow.md`
2. ✅ `_flows-by-role/child-student/02-child-home-realtime-v2.md`
3. ✅ `_flows-by-role/child-student/04-child-task-creation-realtime-v2.md`
4. ✅ `_flows-by-role/all-users/05-settings-flow.md`

**Parent Dashboard:**
1. ✅ `_flows-by-role/all-users/01-auth-onboarding-flow.md`
2. ✅ `_flows-by-role/parent-teacher/02-parent-dashboard-realtime-v2.md`
3. ✅ `_flows-by-role/parent-teacher/03-parent-realtime-monitoring-flow.md`

**Admin Dashboard:**
1. ✅ `_flows-by-role/all-users/01-auth-onboarding-flow.md`
2. ✅ `_flows-by-role/admin/01-admin-dashboard-flow.md`

---

### Phase 2 (Should Have)

**All Apps:**
- Task reminders
- Analytics charts
- Subscription management

**Child App:**
- Task progress tracking
- Preferred time settings

---

## ✅ Status

| Component | Status |
|-----------|--------|
| **Role Organization** | ✅ Complete |
| **Total Flows** | 16 flows |
| **Total Endpoints** | 150+ |
| **Alignment** | ✅ 100% |
| **Legacy Files** | ✅ 0 remaining |

---

## 📞 Quick Reference

### File Naming Convention

```
[sequence]-[flow-name]-[version].md

Examples:
01-child-student-home-flow-v1.5.md
02-child-home-realtime-v2.md
03-child-task-creation-v1.5.md
```

### Version Guide

- **v1.0/v1.5** - HTTP only (quick reference)
- **v2.0** - HTTP + Socket.IO (production recommended)

---

**Last Updated:** 15-03-26  
**Version:** 6.0 - Pure Role-Based  
**Status:** ✅ **PRODUCTION READY**
