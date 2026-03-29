# 📊 Global Diagrams Index

**Project:** Task Management Backend  
**Purpose:** Project-level diagrams showing complete system architecture  
**Last Updated:** 12-03-26  
**Version:** 2.0 - Organized Structure  

---

## 📁 Folder Structure

```
__Documentation/dia/
├── 01-current-v2/          # Current v2.0 diagrams (ACTIVE)
├── 02-legacy-v1/           # Legacy v1.0 diagrams (REFERENCE)
└── README.md               # This index
```

---

## 📋 Current Diagrams (v2.0) ⭐

**Folder:** `01-current-v2/`

**Contains**: 9 comprehensive diagrams updated with:
- ✅ childrenBusinessUser module
- ✅ taskProgress module
- ✅ Socket.IO Real-Time Layer
- ✅ Chart aggregation endpoints
- ✅ Updated collections and relationships

### Diagram List

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 1 | **System Schema** | `complete-system-schema-v2.mermaid` | ER Diagram with all collections |
| 2 | **System Architecture** | `complete-system-architecture-v2.mermaid` | Complete system architecture |
| 3 | **User Journey** | `complete-user-journey-v2.mermaid` | Parent, Child, Admin journeys |
| 4 | **Module Dependency** | `module-dependency-diagram-v2.mermaid` | Module dependencies |
| 5 | **State Machine** | `complete-state-machine-v2.mermaid` | All entity state machines |
| 6 | **Data Flow** | `complete-data-flow-v2.mermaid` | End-to-end data flows |
| 7 | **Sequence Diagram** | `complete-sequence-diagram-v2.mermaid` | 8 key scenarios |
| 8 | **Swimlane Diagram** | `complete-swimlane-diagram-v2.mermaid` | Responsibility swimlanes |
| 9 | **Deployment Architecture** | `deployment-architecture-v2.mermaid` | Production deployment |

---

## 📚 Legacy Diagrams (v1.0)

**Folder:** `02-legacy-v1/`

**Contains**: Original v1.0 diagrams (kept for historical reference)

**Note**: These diagrams are **outdated** and should only be used for:
- Historical reference
- Understanding migration path
- Comparing v1.0 vs v2.0 changes

### Legacy Diagram List

| # | Diagram | File | Status |
|---|---------|------|--------|
| 1 | System Schema | `complete-system-schema.mermaid` | ⚠️ Outdated |
| 2 | System Architecture | `complete-system-architecture.mermaid` | ⚠️ Outdated |
| 3 | User Journey | `complete-user-journey.mermaid` | ⚠️ Outdated |
| 4 | Module Dependency | `module-dependency-diagram.mermaid` | ⚠️ Outdated |
| 5 | State Machine | `complete-state-machine.mermaid` | ⚠️ Outdated |
| 6 | Data Flow | `complete-data-flow.mermaid` | ⚠️ Outdated |
| 7 | Sequence Diagram | `complete-sequence-diagram.mermaid` | ⚠️ Outdated |
| 8 | Swimlane Diagram | `complete-swimlane-diagram.mermaid` | ⚠️ Outdated |
| 9 | Deployment Architecture | `deployment-architecture.mermaid` | ⚠️ Outdated |

---

## 🆕 What's New in v2.0

### New Collections (ER Diagram)
1. ✅ **CHILDREN_BUSINESS_USER** - Parent-child relationship tracking
2. ✅ **TASK_PROGRESS** - Per-child progress tracking
3. ✅ **USER_DEVICE** - Device management for FCM

### New Modules (Architecture)
1. ✅ **taskProgress.module** - Real-time progress tracking
2. ✅ **childrenBusinessUser.module** - Family management
3. ✅ **chartAggregation service** - 10 chart endpoints

### New Real-Time Layer ⭐
- ✅ **Socket.IO Server** - Bidirectional communication
- ✅ **Redis Adapter** - Multi-worker support
- ✅ **Room Management** - User/Family/Task rooms
- ✅ **Socket Events** - task:assigned, task-progress:*, group:activity

### New State Machines
1. ✅ **TaskProgress States** - notStarted → inProgress → completed
2. ✅ **ChildBusinessUser States** - Pending → Active → Removed
3. ✅ **SecondaryUser States** - NotSecondary ↔ Secondary

### New User Journeys
1. ✅ **Parent/Business User Journey** - 7 phases
2. ✅ **Child/Student User Journey** - 7 phases
3. ✅ **Admin User Journey** - 5 phases
4. ✅ **Collaborative Task Journey** - 5 phases

### New Sequence Scenarios
1. ✅ Child Completes Task (Real-Time to Parent)
2. ✅ Child Starts Task (Real-Time to Parent)
3. ✅ Real-Time Family Activity Feed

---

## 🎯 Quick Navigation

### Find Current Diagrams
```bash
cd __Documentation/dia/01-current-v2/
ls -1
# All 9 current v2.0 diagrams
```

### Find Legacy Diagrams
```bash
cd __Documentation/dia/02-legacy-v1/
ls -1
# All 9 legacy v1.0 diagrams
```

### Find Documentation
```bash
cd __Documentation/dia/01-current-v2/
ls *.md
# COMPLETE_DIAGRAMS_UPDATE_SUMMARY-12-03-26.md
# DIAGRAM_UPDATE_PROGRESS-12-03-26.md
```

---

## 📊 Diagram Statistics

| Metric | v1.0 | v2.0 | Change |
|--------|------|------|--------|
| **Total Diagrams** | 9 | 9 | ✅ Updated |
| **Total Lines** | ~2,500 | ~3,200 | +700 |
| **Collections** | 15 | 18 | +3 |
| **Modules** | 10 | 13 | +3 |
| **State Machines** | 8 | 11 | +3 |
| **User Journeys** | 3 | 4 | +1 |
| **Sequence Scenarios** | 7 | 8 | +1 |

---

## 🎨 Diagram Conventions

### Color Coding

| Color | Meaning | Module/Component |
|-------|---------|------------------|
| 🔵 Blue | User/Frontend | USER, PROFILE, Flutter |
| 🟢 Green | Task Modules | TASK, SUBTASK, TASKPROG |
| 🔴 Red | Family Modules | CHILDREN_BUSINESS_USER |
| 🟡 Yellow | Notification | NOTIFICATION, REMINDER |
| 🟣 Purple | Analytics | ANALYTICS, CHARTS |
| 🟠 Orange | Subscription | SUBSCRIPTION_PLAN |
| 🔵 Teal | Payment | PAYMENT_TRANSACTION |
| ⚪ Gray | Chat | CONVERSATION, MESSAGE |
| 🟡 Yellow | Real-Time | Socket.IO |

### Naming Conventions

- **Collections**: `CHILDREN_BUSINESS_USER` (UPPER_SNAKE)
- **Modules**: `taskProgress.module` (camelCase)
- **States**: `InProgress` (PascalCase)
- **Actions**: `createTask` (camelCase)
- **Files**: `complete-system-schema-v2.mermaid` (kebab-case)

---

## 📝 Usage Guide

### For New Team Members

**Start Here**:
1. Read `01-current-v2/COMPLETE_DIAGRAMS_UPDATE_SUMMARY-12-03-26.md`
2. Review System Architecture (v2.0)
3. Study User Journeys (v2.0)
4. Explore Module Dependencies (v2.0)

**Then**:
- Explore module-specific diagrams in `src/modules/<module>.module/doc/dia/`
- Review flow documentation in `flow/`
- Check Postman collections in `postman-collections/`

---

### For Experienced Team Members

**Quick Access**:
```bash
# Current diagrams
cd __Documentation/dia/01-current-v2/

# Specific diagram
cat complete-system-schema-v2.mermaid
cat complete-system-architecture-v2.mermaid
```

---

### For Architects

**Reference**:
- System Architecture (v2.0) - High-level design
- Module Dependencies (v2.0) - Module relationships
- Deployment Architecture (v2.0) - Production setup

---

### For Developers

**Reference**:
- System Schema (v2.0) - Database design
- State Machine (v2.0) - Entity states
- Sequence Diagram (v2.0) - API interactions

---

### For QA Engineers

**Reference**:
- Data Flow (v2.0) - Data pipeline
- Swimlane Diagram (v2.0) - Responsibilities
- User Journeys (v2.0) - Test scenarios

---

## 🔗 Related Documentation

### Module-Specific Diagrams

Each module has its own `/doc/dia/` folder with 8 diagrams:

- [`task.module/doc/dia/`](../../src/modules/task.module/doc/dia/)
- [`taskProgress.module/doc/dia/`](../../src/modules/taskProgress.module/doc/dia/)
- [`childrenBusinessUser.module/doc/dia/`](../../src/modules/childrenBusinessUser.module/doc/dia/)
- [`analytics.module/doc/dia/`](../../src/modules/analytics.module/doc/dia/)
- [`notification.module/doc/dia/`](../../src/modules/notification.module/doc/dia/)

### Flow Documentation

- [`flow/`](../../flow/) - API flow documentation (organized by feature)

### Postman Collections

- [`postman-collections/`](../../postman-collections/) - Postman collections (organized by role)

---

## 📞 Support & Resources

### Key Contacts
- **Backend Lead**: [Your Name]
- **Documentation**: Complete (v2.0)
- **Socket.IO Integration**: Complete
- **Chart Endpoints**: Complete

### External Resources
- [Mermaid Documentation](https://mermaid.js.org/)
- [Mermaid Live Editor](https://mermaid.live/)
- [VS Code Mermaid Extension](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)

---

## ✅ Status

**Diagram Organization**: ✅ **100% COMPLETE**  
**Folder Structure**: ✅ **CLEAN & LOGICAL**  
**Version Control**: ✅ **v1.0 vs v2.0 separated**  
**Navigation**: ✅ **EASY & INTUITIVE**  
**Production Ready**: ✅ **YES**  

---

**Last Updated**: 12-03-26  
**Version**: 2.0 - Organized Structure  
**Maintained By**: Backend Engineering Team  
**Status**: ✅ **ALL DIAGRAMS ORGANIZED AND UP-TO-DATE**
