# 📊 Analytics Module - Diagrams Index (v2.0)

**Last Updated**: 12-03-26  
**Version**: 2.0 - Complete  

---

## 📁 Folder Structure

```
dia/
├── 01-current-v2/          # Current v2.0 diagrams (ACTIVE)
├── 02-legacy-v1/           # Legacy v1.0 diagrams (REFERENCE)
└── README.md               # This index
```

---

## 📋 Current Diagrams (v2.0) ⭐

**Folder**: `01-current-v2/`

**Contains**: 8 comprehensive diagrams updated with:
- ✅ Chart Aggregation service (10 endpoints)
- ✅ childrenBusinessUser integration
- ✅ TaskProgress integration
- ✅ Socket.IO Real-Time layer
- ✅ Updated cache structures

### Diagram List (8 of 8)

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 1 | **Schema** | `analytics-schema-v2.mermaid` | Data sources & cache structures |
| 2 | **System Architecture** | `analytics-system-architecture-v2.mermaid` | Complete system architecture |
| 3 | **Sequence** | `analytics-sequence-v2.mermaid` | 6 sequence scenarios |
| 4 | **User Flow** | `analytics-user-flow-v2.mermaid` | Parent/Child/Admin flows |
| 5 | **Swimlane** | `analytics-swimlane-v2.mermaid` | Responsibility swimlanes |
| 6 | **State Machine** | `analytics-state-machine-v2.mermaid` | All state machines |
| 7 | **Component Architecture** | `analytics-component-architecture-v2.mermaid` | Component architecture |
| 8 | **Data Flow** | `analytics-data-flow-v2.mermaid` | Data flow diagram |

---

## 📚 Legacy Diagrams (v1.0)

**Folder**: `02-legacy-v1/`

**Contains**: Original v1.0 diagrams (kept for historical reference)

**Note**: These diagrams are **outdated** and should only be used for:
- Historical reference
- Understanding migration path
- Comparing v1.0 vs v2.0 changes

---

## 🆕 What's New in v2.0 Diagrams

### New Components
- ✅ **chartAggregation service** - 10 chart-specific endpoints
- ✅ **Socket.IO Real-Time layer** - Activity feed broadcasting
- ✅ **Family Rooms** - Auto-join based on childrenBusinessUser
- ✅ **Chart Cache** - 5 min TTL for chart data

### Updated Components
- ✅ **groupAnalytics** → Family-based (childrenBusinessUser)
- ✅ **taskAnalytics** → Added family task analytics
- ✅ **userAnalytics** → Added TaskProgress integration

### New Data Sources
- ✅ **childrenBusinessUser collection** - Family relationships
- ✅ **TaskProgress collection** - Per-child progress tracking

### Removed Data Sources
- ❌ **Group collection** - Replaced by childrenBusinessUser
- ❌ **GroupMember collection** - Replaced by childrenBusinessUser

---

## 🎨 Diagram Conventions (v2.0)

### Color Coding

| Color | Meaning | Component |
|-------|---------|-----------|
| 🔵 Blue | User/Frontend | Flutter, Web, Admin |
| 🟢 Green | Analytics Services | chartAggregation, groupAnalytics |
| 🟠 Orange | API Gateway | Routes, Middleware |
| 🟣 Purple | Business Logic | Controllers, Services |
| 🔴 Red | Data Layer | MongoDB, Redis |
| 🟡 Yellow | Real-Time | Socket.IO, Events |
| ⚪ Gray | Cache | Chart, Family, User caches |

---

## 📝 Usage Guide

### Find Current Diagrams
```bash
cd src/modules/analytics.module/doc/dia/01-current-v2/
ls -1
# All 8 current v2.0 diagrams
```

### Find Legacy Diagrams
```bash
cd src/modules/analytics.module/doc/dia/02-legacy-v1/
ls -1
# All 8 legacy v1.0 diagrams
```

---

## 🔗 Related Documentation

### Module Documentation
- [Architecture Guide (v2.0)](../ANALYTICS_MODULE_ARCHITECTURE-v2.md)
- [System Guide (v2.0)](../ANALYTICS_MODULE_SYSTEM_GUIDE-v2.md)
- [Update Summary](../COMPLETE_ANALYTICS_V2_UPDATE_SUMMARY-12-03-26.md)

### Related Modules
- [Task Module](../../task.module/doc/)
- [childrenBusinessUser Module](../../childrenBusinessUser.module/doc/)
- [taskProgress Module](../../taskProgress.module/doc/)

### Global Documentation
- [Flow Documentation](../../../../flow/)
- [Postman Collections](../../../../postman-collections/)
- [Socket.IO Guide](../../../../helpers/socket/SOCKET_IO_INTEGRATION.md)

---

## ✅ Status

**Diagrams**: ✅ **100% COMPLETE (8/8)**  
**Version**: ✅ **v2.0 Current**  
**Organization**: ✅ **v1.0 vs v2.0 separated**  
**Production Ready**: ✅ **YES**  

---

**Last Updated**: 12-03-26  
**Maintained By**: Backend Engineering Team  
**Status**: ✅ **ALL ANALYTICS DIAGRAMS UPDATED TO v2.0**
