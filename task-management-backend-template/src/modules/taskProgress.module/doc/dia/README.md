# 📊 TaskProgress Module - Diagrams Index (v2.0)

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
- ✅ Socket.IO real-time integration
- ✅ Family activity broadcasting
- ✅ Real-time parent notifications
- ✅ Per-child progress tracking
- ✅ Enhanced caching

### Diagram List (8 of 8)

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 1 | **Schema** | `taskProgress-module-schema-v2.mermaid` | TaskProgress schema |
| 2 | **System Architecture** | `taskProgress-module-system-architecture-v2.mermaid` | System architecture |
| 3 | **Sequence** | `taskProgress-module-sequence-v2.mermaid` | 4 sequence scenarios |
| 4 | **User Flow** | `taskProgress-module-user-flow-v2.mermaid` | Parent/Child flows |
| 5 | **Swimlane** | `taskProgress-module-swimlane-v2.mermaid` | Responsibility swimlanes |
| 6 | **State Machine** | `taskProgress-module-state-machine-v2.mermaid` | All state machines |
| 7 | **System Flow** | `taskProgress-module-system-flow-v2.mermaid` | System flow diagram |
| 8 | **Component Architecture** | `taskProgress-module-component-architecture-v2.mermaid` | Component architecture |

---

## 📚 Legacy Diagrams (v1.0)

**Folder**: `02-legacy-v1/`

**Contains**: Original v1.0 diagrams (kept for historical reference)

**Note**: These diagrams are **outdated** and should only be used for:
- Historical reference
- Understanding migration path
- Comparing v1.0 vs v2.0 changes

---

## 🆕 What's New in v2.0

### New Components
- ✅ **Socket.IO Real-Time layer** - Instant progress updates
- ✅ **Socket.IO State Cache** - 1 min TTL
- ✅ **Family Rooms** - Activity broadcasting
- ✅ **Progress Rooms** - Progress-specific updates

### Updated Components
- ✅ **TaskProgress Service** - Integrated Socket.IO
- ✅ **Cache Structure** - Added Socket.IO state
- ✅ **Service Layer** - Real-time with fallback

### New Data Sources
- ✅ **Socket.IO State** - Progress subscribers, family rooms
- ✅ **TaskProgress collection** - Per-child progress (already existed, now integrated)

---

## 🎨 Diagram Conventions (v2.0)

### Color Coding

| Color | Meaning | Component |
|-------|---------|-----------|
| 🔵 Blue | User/Frontend | Flutter, Web |
| 🟢 Green | Business Logic | taskProgress.service |
| 🟠 Orange | API Gateway | Routes, Middleware |
| 🟣 Purple | Related Modules | Task, SubTask, Notification |
| 🔴 Red | Data Layer | MongoDB, Redis |
| 🟡 Yellow | Real-Time | Socket.IO, Events |
| ⚪ Gray | Cache | Progress, Socket.IO state |

---

## 📝 Usage Guide

### Find Current Diagrams
```bash
cd src/modules/taskProgress.module/doc/dia/01-current-v2/
ls -1
# All 8 current v2.0 diagrams
```

### Find Legacy Diagrams
```bash
cd src/modules/taskProgress.module/doc/dia/02-legacy-v1/
ls -1
# All legacy v1.0 diagrams
```

---

## 🔗 Related Documentation

### Module Documentation
- [API Documentation](../API_DOCUMENTATION.md)
- [Update Summary](../COMPLETE_TASKPROGRESS_MODULE_V2_UPDATE_SUMMARY-12-03-26.md)
- [Task Module v2.0](../../task.module/doc/)
- [SubTask Module v2.0](../../task.module/subTask/doc/)

### Related Modules
- [Task Module](../../task.module/)
- [SubTask Module](../../task.module/subTask/)
- [Notification Module](../../notification.module/)
- [Socket.IO Guide](../../../../../helpers/socket/SOCKET_IO_INTEGRATION.md)

### Global Documentation
- [Flow Documentation](../../../../../flow/)
- [Postman Collections](../../../../../postman-collections/)

---

## ✅ Status

**Diagrams**: ✅ **100% COMPLETE (8/8)**  
**Version**: ✅ **v2.0 Current**  
**Organization**: ✅ **v1.0 vs v2.0 separated**  
**Production Ready**: ✅ **YES**  

---

**Last Updated**: 12-03-26  
**Maintained By**: Backend Engineering Team  
**Status**: ✅ **ALL TASKPROGRESS MODULE DIAGRAMS UPDATED TO v2.0**
