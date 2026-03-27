# Task Module Diagrams

**Version:** V2 (Current)  
**Last Updated:** 14-03-26  
**Status:** Family-Based Architecture (No Group Dependencies)

---

## 📁 Folder Structure

```
dia/
├── 01-current-v2/          ← Current V2 diagrams (family-based)
│   ├── task-schema-V2-14-03-26.mermaid
│   ├── task-system-architecture-V2-14-03-26.mermaid
│   ├── task-user-flow-V2-14-03-26.mermaid
│   ├── task-sequence-V2-14-03-26.mermaid
│   ├── task-state-machine-V2-14-03-26.mermaid
│   ├── task-component-architecture-V2-14-03-26.mermaid
│   └── task-data-flow-V2-14-03-26.mermaid
│
├── 02-legacy-v1/           ← Legacy V1 diagrams (with group dependencies)
│   └── (old diagrams moved here)
│
└── README.md               ← This file
```

---

## 📊 Diagram Index (V2 - Current)

### 0. Task Status Update Flow (NEW - 27-03-26)
**File:** `task-status-update-sequence.mermaid`
**Purpose:** Shows complete flow of task status updates for different task types
**Scenarios:**
- Personal/Single Assignment: Direct status update
- Collaborative: Individual progress → Auto-complete parent when ALL complete
**Key Features:**
- TaskProgress service auto-complete logic
- Real-time Socket.io events
- Cache invalidation
- Parent dashboard updates

---

### 1. Schema Diagram
**File:** `task-schema-V2-14-03-26.mermaid`  
**Purpose:** Shows Task schema structure and relationships  
**Key Entities:**
- Task (main entity)
- SubTask (embedded)
- User (creator, owner, assignee)
- ChildrenBusinessUser (family relationships)
- TaskProgress (individual tracking)
- Notification (alerts)

**Changes from V1:**
- ❌ Removed: Group entity
- ✅ Added: ChildrenBusinessUser relationship model
- ✅ Updated: Family-based permission system

---

### 2. System Architecture
**File:** `task-system-architecture-V2-14-03-26.mermaid`  
**Purpose:** High-level system components and interactions  
**Layers:**
- Client Layer (Flutter, Web Dashboards)
- API Layer (Routes, Controllers, Middleware)
- Business Logic Layer (Services, Cache, Queue)
- Data Layer (Models, MongoDB)
- Real-time Layer (Socket.io)
- Notification Layer

---

### 3. User Flow
**File:** `task-user-flow-V2-14-03-26.mermaid`  
**Purpose:** End-to-end user journey for task operations  
**Flows Covered:**
- Authentication & Role Check
- Task Creation (Personal, Single, Collaborative)
- Task Management (View, Filter, Paginate)
- Status Updates
- Daily Progress Tracking

---

### 4. Sequence Diagram
**File:** `task-sequence-V2-14-03-26.mermaid`  
**Purpose:** Time-ordered interactions between components  
**Sequences:**
- Task Creation Flow
- Task Status Update Flow
- Get Tasks with Pagination
- Daily Progress Flow

---

### 5. State Machine
**File:** `task-state-machine-V2-14-03-26.mermaid`  
**Purpose:** Task status transitions and guards  
**States:**
- pending → inProgress → completed
- Valid transitions only
- Terminal state: completed

---

### 6. Component Architecture
**File:** `task-component-architecture-V2-14-03-26.mermaid`  
**Purpose:** Internal module structure and dependencies  
**Components:**
- Routes Layer
- Middleware Layer
- Controller Layer (Generic)
- Service Layer (Generic)
- Data Models
- External Services

---

### 7. Data Flow
**File:** `task-data-flow-V2-14-03-26.mermaid`  
**Purpose:** Data transformation through the system  
**Paths:**
- Write Path (Create → Validate → Store → Cache Invalidation)
- Read Path (Cache Check → DB Query → Transform → Response)
- Async Path (Queue → Calculate → Update User)

---

## 🔄 V1 vs V2 Key Differences

| Aspect | V1 (Legacy) | V2 (Current) |
|--------|-------------|--------------|
| **Structure** | Group-based | Family-based |
| **Relationships** | GroupMember model | ChildrenBusinessUser model |
| **Permissions** | Group membership | Secondary User flag |
| **Activity Tracking** | Group activity | Family activity |
| **Real-time** | Group broadcast | Family member broadcast |
| **Schema** | groupId field | No groupId (uses assignedUserIds) |

---

## 🎯 Figma Alignment

All V2 diagrams are aligned with these Figma screens:

### App User (Mobile)
- `app-user/group-children-user/home-flow.png`
- `app-user/group-children-user/add-task-flow-for-permission-account-interface.png`
- `app-user/group-children-user/status-section-flow-01.png`
- `app-user/group-children-user/profile-permission-account-interface.png`

### Teacher/Parent Dashboard (Web)
- `teacher-parent-dashboard/dashboard/dashboard-flow-01.png`
- `teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png`
- `teacher-parent-dashboard/team-members/team-member-flow-01.png`
- `teacher-parent-dashboard/settings-permission-section/`

---

## 📈 Scale Considerations

All diagrams reflect senior-level engineering patterns:

- **Redis Caching:** Cache-aside pattern, TTL 2-5 minutes
- **Indexing:** All query fields indexed (see schema diagram)
- **Pagination:** Standard + Aggregation patterns
- **Rate Limiting:** 20 req/hour for task creation
- **BullMQ:** Async preferred time calculation
- **Real-time:** Socket.io for family activity feed
- **Horizontal Scaling:** Stateless design, Redis session storage

---

## 🔗 Related Documentation

- [API_DOCUMENTATION.md](../API_DOCUMENTATION.md) - Complete API reference
- [TASK_MODULE_ARCHITECTURE.md](../TASK_MODULE_ARCHITECTURE.md) - Architecture deep dive
- [TASK_MODULE_SYSTEM_GUIDE.md](../TASK_MODULE_SYSTEM_GUIDE.md) - System guide
- [task-performance-report.md](../perf/task-performance-report.md) - Performance analysis

---

**Created:** 14-03-26  
**Last Updated:** 14-03-26
