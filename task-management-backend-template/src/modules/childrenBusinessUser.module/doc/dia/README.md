# 👨‍👩‍👧‍👦 Children Business User Module - Diagrams Index (v2.0)

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
- ✅ Secondary User permission system
- ✅ Real-time parent notifications
- ✅ Family room auto-join

### Diagram List (8 of 8)

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 1 | **Schema** | `childrenBusinessUser-schema-v2.mermaid` | Data sources & relationships |
| 2 | **System Architecture** | `childrenBusinessUser-system-architecture-v2.mermaid` | Complete system architecture |
| 3 | **Sequence** | `childrenBusinessUser-sequence-v2.mermaid` | 6 sequence scenarios |
| 4 | **User Flow** | `childrenBusinessUser-user-flow-v2.mermaid` | Parent/Child flows |
| 5 | **Swimlane** | `childrenBusinessUser-swimlane-v2.mermaid` | Responsibility swimlanes |
| 6 | **State Machine** | `childrenBusinessUser-state-machine-v2.mermaid` | All state machines |
| 7 | **Component Architecture** | `childrenBusinessUser-component-architecture-v2.mermaid` | Component architecture |
| 8 | **System Flow** | `childrenBusinessUser-system-flow-v2.mermaid` | System flow diagram |

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
- ✅ **Socket.IO Real-Time layer** - Family activity broadcasting
- ✅ **Family Rooms** - Auto-join based on relationship
- ✅ **Socket.IO State Cache** - 1 min TTL
- ✅ **Real-Time Events** - group:activity, permission_changed, task-progress:*

### Updated Components
- ✅ **Secondary User System** - Real-time permission updates
- ✅ **Service Layer** - Integrated Socket.IO broadcasting
- ✅ **Cache Structure** - Added Socket.IO state

### New Data Sources
- ✅ **Socket.IO State** - Family room members, activity feeds
- ✅ **TaskProgress collection** - For real-time updates

---

## 🎨 Diagram Conventions (v2.0)

### Color Coding

| Color | Meaning | Component |
|-------|---------|-----------|
| 🔵 Blue | User/Frontend | Parent/Child apps |
| 🟢 Green | Business Logic | childrenBusinessUser service |
| 🟠 Orange | API Gateway | Routes, Middleware |
| 🟣 Purple | Related Modules | User, Subscription, Task |
| 🔴 Red | Data Layer | MongoDB, Redis |
| 🟡 Yellow | Real-Time | Socket.IO, Events |
| ⚪ Gray | Cache | Family, Secondary, Socket.IO state |

---

## 📝 Usage Guide

### Find Current Diagrams
```bash
cd src/modules/childrenBusinessUser.module/doc/dia/01-current-v2/
ls -1
# All 8 current v2.0 diagrams
```

### Find Legacy Diagrams
```bash
cd src/modules/childrenBusinessUser.module/doc/dia/02-legacy-v1/
ls -1
# All 8 legacy v1.0 diagrams
```

---

## 🔗 Related Documentation

### Module Documentation
- [Architecture Guide (v2.0)](../CHILDREN_BUSINESS_USER_ARCHITECTURE-v2.md)
- [System Guide (v2.0)](../CHILDREN_BUSINESS_USER_SYSTEM_GUIDE-v2.md)
- [API Documentation](../API_DOCUMENTATION.md)
- [Update Summary](../COMPLETE_CHILDREN_BUSINESS_USER_V2_UPDATE_SUMMARY-12-03-26.md)

### Related Modules
- [Task Module](../../task.module/doc/)
- [Analytics Module](../../analytics.module/doc/)
- [Socket.IO Guide](../../../../helpers/socket/SOCKET_IO_INTEGRATION.md)

### Global Documentation
- [Flow Documentation](../../../../flow/)
- [Postman Collections](../../../../postman-collections/)

---

## ✅ Status

**Diagrams**: ✅ **100% COMPLETE (8/8)**  
**Version**: ✅ **v2.0 Current**  
**Organization**: ✅ **v1.0 vs v2.0 separated**  
**Production Ready**: ✅ **YES**  

---

**Last Updated**: 12-03-26  
**Maintained By**: Backend Engineering Team  
**Status**: ✅ **ALL CHILDREN BUSINESS USER DIAGRAMS UPDATED TO v2.0**
