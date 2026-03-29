# 📝 SubTask Module - Diagrams Index (v2.0)

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
- ✅ TaskProgress integration
- ✅ Enhanced caching

### Diagram List (8 of 8)

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 1 | **Schema** | `subTask-module-schema-v2.mermaid` | SubTask schema with TaskProgress |
| 2 | **System Architecture** | `subTask-module-system-architecture-v2.mermaid` | System architecture |
| 3 | **Sequence** | `subTask-module-sequence-v2.mermaid` | 4 sequence scenarios |
| 4 | **User Flow** | `subTask-module-user-flow-v2.mermaid` | Parent/Child flows |
| 5 | **Swimlane** | `subTask-module-swimlane-v2.mermaid` | Responsibility swimlanes |
| 6 | **State Machine** | `subTask-module-state-machine-v2.mermaid` | All state machines |
| 7 | **System Flow** | `subTask-module-system-flow-v2.mermaid` | System flow diagram |
| 8 | **Component Architecture** | `subTask-module-component-architecture-v2.mermaid` | Component architecture |

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
- ✅ **Socket.IO Real-Time layer** - Instant subtask updates
- ✅ **TaskProgress collection** - Per-child progress tracking
- ✅ **Socket.IO State Cache** - 1 min TTL
- ✅ **Family Rooms** - Activity broadcasting

### Updated Components
- ✅ **SubTask Service** - Integrated Socket.IO
- ✅ **Cache Structure** - Added Socket.IO state
- ✅ **Service Layer** - Real-time with fallback

### New Data Sources
- ✅ **Socket.IO State** - SubTask subscribers, family rooms
- ✅ **TaskProgress collection** - Per-child progress

---

## 🎨 Diagram Conventions (v2.0)

### Color Coding

| Color | Meaning | Component |
|-------|---------|-----------|
| 🔵 Blue | User/Frontend | Flutter, Web |
| 🟢 Green | Business Logic | subtask.service |
| 🟠 Orange | API Gateway | Routes, Middleware |
| 🟣 Purple | Related Modules | Task, Notification |
| 🔴 Red | Data Layer | MongoDB, Redis |
| 🟡 Yellow | Real-Time | Socket.IO, Events |
| ⚪ Gray | Cache | SubTask, Socket.IO state |
| 🟢 Light Green | TaskProgress | taskProgress.service |

---

## 📝 Usage Guide

### Find Current Diagrams
```bash
cd src/modules/task.module/subTask/doc/dia/01-current-v2/
ls -1
# All 8 current v2.0 diagrams
```

### Find Legacy Diagrams
```bash
cd src/modules/task.module/subTask/doc/dia/02-legacy-v1/
ls -1
# All legacy v1.0 diagrams
```

---

## 🔗 Related Documentation

### Module Documentation
- [Task Module v2.0](../../TASK_MODULE_ARCHITECTURE-v2.md)
- [TaskProgress Module](../../../taskProgress.module/doc/)
- [API Documentation](../API_DOCUMENTATION.md)
- [Update Summary](../COMPLETE_SUBTASK_MODULE_V2_UPDATE_SUMMARY-12-03-26.md)

### Related Modules
- [Task Module](../../)
- [TaskProgress Module](../../../taskProgress.module/)
- [Notification Module](../../../notification.module/)
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
**Status**: ✅ **ALL SUBTASK MODULE DIAGRAMS UPDATED TO v2.0**
