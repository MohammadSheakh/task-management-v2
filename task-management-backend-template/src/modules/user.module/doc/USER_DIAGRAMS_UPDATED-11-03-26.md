# ✅ User Module Diagrams - Updated with Preferred Time Feature

**Date**: 11-03-26  
**Status**: ✅ **COMPLETE**  
**Feature**: Preferred Time Integration (Manual + Automatic)  

---

## 📊 Diagrams Updated

All **4 user.module diagrams** have been updated to include the **Preferred Time** feature:
1. ✅ Manual update via API (`GET/PUT /user/preferred-time`)
2. ✅ Automatic calculation (from task module BullMQ worker)
3. ✅ Cache invalidation strategy
4. ✅ Integration with task.module

---

## 📁 Updated Diagram Files

### 1. **user-schema.mermaid** ✅ UPDATED
**File**: `src/modules/user.module/doc/dia/user-schema.mermaid`

**Changes:**
- Added `preferredTime` field to User entity
- Added two relationships with Task:
  - `"tracks start time for preferred time"`
  - `"provides suggestion for scheduledTime"`
- Added index documentation

**Key Additions:**
```mermaid
User {
    String preferredTime "Auto-calculated HH:mm format"
}

User ||--o{ Task : "tracks start time for preferred time"
User ||--o| Task : "provides suggestion for scheduledTime"

%% Indexes
%% preferredTime_1_isDeleted_1 (for scheduling queries)
```

---

### 2. **user-sequence.mermaid** ✅ UPDATED
**File**: `src/modules/user.module/doc/dia/user-sequence.mermaid`

**Changes:**
- Added **4 new scenarios**:
  1. ⏰ Preferred Time - GET
  2. ⏰ Preferred Time - UPDATE (Manual)
  3. 🔄 Preferred Time - AUTO UPDATE (From Task)
  4. 🚪 Logout Flow (existing, for completeness)

**New Flows:**

#### **GET /user/preferred-time**
```mermaid
U->>FE: View Profile (Preferred Time section)
FE->>API: GET /user/preferred-time
API->>Auth: authenticate
API->>UserSvc: getPreferredTime
UserSvc->>DB: FindById select(preferredTime)
DB-->>UserSvc: preferredTime: "08:17"
UserSvc-->>API: Return { userId, preferredTime: "08:17" }
API-->>FE: Return preferred time
FE-->>U: Display "08:17 AM"
```

#### **PUT /user/preferred-time (Manual Update)**
```mermaid
U->>FE: Tap Preferred Time → Select Time
FE->>API: PUT /user/preferred-time { preferredTime: "09:00" }
API->>UserSvc: updatePreferredTime
UserSvc->>DB: FindByIdAndUpdate { preferredTime }
DB-->>UserSvc: Updated user
UserSvc->>Cache: Del user:userId:profile
Cache-->>UserSvc: Cache invalidated
UserSvc-->>API: Return success
FE-->>U: Show "Preferred time updated to 09:00 AM"
```

#### **AUTO UPDATE (From Task Module)**
```mermaid
TaskModule->>BullMQ: Add job: calculatePreferredTime
BullMQ->>PrefWorker: Process job
PrefWorker->>DB: Get last 10 completed tasks
DB-->>PrefWorker: Tasks with startTime
PrefWorker->>PrefWorker: Calculate average
PrefWorker->>DB: Update user.preferredTime
DB-->>PrefWorker: Updated
PrefWorker-->>BullMQ: Job completed
BullMQ->>Cache: Del user:userId:profile
Cache-->>BullMQ: Cache invalidated

U->>FE: Open Profile
FE->>API: GET /user/profile
API->>Cache: Get profile (miss or expired)
Cache-->>API: Miss
API->>UserSvc: getUserById
UserSvc->>DB: Find user
DB-->>UserSvc: User with updated preferredTime
UserSvc->>Cache: Set user:userId:profile
UserSvc-->>API: Return user
API-->>FE: Return profile with new preferredTime
FE-->>U: Display updated preferred time automatically
```

---

### 3. **user-system-architecture.mermaid** ✅ UPDATED
**File**: `src/modules/user.module/doc/dia/user-system-architecture.mermaid`

**Changes:**
- Added **Preferred Time UI** to Client Layer
- Added **⏰ /user/preferred-time** endpoint to User Module
- Added **User Collection** with `+ preferredTime field`
- Added **Async Processing** with BullMQ and Preferred Time Worker
- Added **Task Module** as external dependency
- Shows complete data flow for preferred time

**New Components:**
```mermaid
subgraph Client
    ProfileScreen[Profile Screen]
    PrefTimeUI[Preferred Time UI]
end

subgraph UserModule
    PrefTimeEndpoint[⏰ /user/preferred-time]
end

subgraph DB
    UserCol[User Collection<br/>+ preferredTime field]
    TaskCol[(Task Collection)]
end

subgraph Async
    BullMQ[BullMQ Queue]
    PrefWorker[⏰ Preferred Time Worker]
end

%% Preferred Time Flow
TaskModule --> BullMQ
BullMQ --> PrefWorker
PrefWorker --> TaskCol
PrefWorker --> UserCol
UserCol -.->|preferredTime| UserCache

style PrefTimeEndpoint fill:#9ff,stroke:#333,stroke-width:2px
style PrefWorker fill:#f9f,stroke:#333,stroke-width:2px
style UserCol fill:#bbf,stroke:#333,stroke-width:2px
style PrefTimeUI fill:#ff9,stroke:#333,stroke-width:2px
```

---

### 4. **user-component-architecture.mermaid** ✅ UPDATED
**File**: `src/modules/user.module/doc/dia/user-component-architecture.mermaid`

**Changes:**
- Added **⏰ preferredTime Service** to User Core
- Added **Async Processing** section with BullMQ and Worker
- Added **Task Module** to External Dependencies
- Shows preferred time service integration
- Color-coded components

**New Components:**
```mermaid
subgraph UserCore
    PrefTimeEndpoint[⏰ preferredTime Service]
end

subgraph Async
    BullMQ[BullMQ Queue]
    PrefWorker[⏰ Preferred Time Worker]
end

subgraph External
    TaskModule[Task Module]
end

%% Preferred Time Flow
PrefTimeEndpoint --> UserService
UserService --> UserCol[(User Collection)]

TaskModule --> BullMQ
BullMQ --> PrefWorker
PrefWorker --> TaskCol[(Task Collection)]
PrefWorker --> UserCol

style PrefTimeEndpoint fill:#9ff,stroke:#333,stroke-width:2px
style PrefWorker fill:#f9f,stroke:#333,stroke-width:2px
style BullMQ fill:#ff9,stroke:#333,stroke-width:2px
style UserCol fill:#bbf,stroke:#333,stroke-width:2px
```

---

## 🎨 Visual Enhancements

### Color Coding
```mermaid
style PrefTimeEndpoint fill:#9ff,stroke:#333,stroke-width:2px   ← Cyan for API endpoint
style PrefWorker fill:#f9f,stroke:#333,stroke-width:2px         ← Pink for worker
style BullMQ fill:#ff9,stroke:#333,stroke-width:2px             ← Yellow for queue
style UserCol fill:#bbf,stroke:#333,stroke-width:2px            ← Blue for database
style PrefTimeUI fill:#ff9,stroke:#333,stroke-width:2px         ← Yellow for UI
```

---

## 🔄 Complete Preferred Time Flow (Across All Diagrams)

### **Flow 1: Manual Update (User-Initiated)**
```
User opens Profile → Taps Preferred Time → Selects time
     ↓
Frontend: PUT /user/preferred-time { preferredTime: "09:00" }
     ↓
Backend: Update user.preferredTime
     ↓
Invalidate cache: Del user:userId:profile
     ↓
UI shows: "Preferred time updated to 09:00 AM"
```

---

### **Flow 2: Automatic Update (System-Initiated)**
```
Child completes task → System tracks startTime
     ↓
After 5+ tasks → BullMQ job triggered
     ↓
Preferred Time Worker: Calculate average start time
     ↓
Update user.preferredTime automatically
     ↓
Invalidate cache
     ↓
Next profile view shows updated preferredTime
```

---

### **Flow 3: Suggestion (Task Creation)**
```
User creates task → Taps "Scheduled Time"
     ↓
Frontend: GET /tasks/suggest-preferred-time
     ↓
Task Module fetches user.preferredTime
     ↓
Returns suggestion: "08:17 AM"
     ↓
User accepts or chooses custom
```

---

## ✅ Verification Checklist

- [x] All 4 diagrams updated
- [x] Schema shows preferredTime field and relationships
- [x] Sequence shows GET, UPDATE, and AUTO UPDATE flows
- [x] Architecture shows endpoint, worker, and data flow
- [x] Component shows service integration
- [x] Cache invalidation documented
- [x] Task module integration shown
- [x] Consistent naming across diagrams
- [x] Color coding applied
- [x] Mermaid syntax validated
- [x] Files saved in correct location

---

## 📝 Diagram Summary Table

| Diagram | Purpose | Key Update |
|---------|---------|------------|
| **Schema** | Database structure | Added preferredTime field + Task relationships |
| **Sequence** | API interaction flow | Shows GET, PUT (manual), AUTO UPDATE flows |
| **System Architecture** | High-level design | Shows endpoint, worker, cache invalidation |
| **Component Architecture** | Module structure | Shows preferredTime service integration |

---

## 🎯 What Each Diagram Shows Now

### **Schema Diagram** (user-schema.mermaid)
- ✅ User collection with `preferredTime` field
- ✅ Two relationships with Task:
  - Tracking: "tracks start time for preferred time"
  - Suggestion: "provides suggestion for scheduledTime"
- ✅ Index documentation for queries

### **Sequence Diagram** (user-sequence.mermaid)
- ✅ **Standard flows**: Profile, Update, Logout
- ✅ **Preferred Time GET**: Fetch and display
- ✅ **Preferred Time PUT**: Manual update with cache invalidation
- ✅ **Auto Update**: From task module via BullMQ
- ✅ Shows complete user journey

### **System Architecture** (user-system-architecture.mermaid)
- ✅ Frontend: Profile Screen + Preferred Time UI
- ✅ Backend: `/user/preferred-time` endpoint
- ✅ Database: User Collection with preferredTime
- ✅ Async: BullMQ + Preferred Time Worker
- ✅ External: Task Module integration
- ✅ Cache invalidation strategy

### **Component Architecture** (user-component-architecture.mermaid)
- ✅ User Core: preferredTime Service
- ✅ Async: BullMQ Queue + Worker
- ✅ External: Task Module dependency
- ✅ Data flow: Service → Collection
- ✅ Worker → Task/User Collections

---

## 🔗 Related Documentation

- [User Module - Preferred Time Feature](./PREFERRED_TIME_FEATURE-11-03-26.md)
- [User Module - Implementation Complete](./PREFERRED_TIME_IMPLEMENTATION_COMPLETE-11-03-26.md)
- [Task Module - Automatic Preferred Time](../task.module/doc/AUTOMATIC_PREFERRED_TIME_FEATURE-11-03-26.md)
- [Task Module - Suggestion Feature](../task.module/doc/PREFERRED_TIME_SUGGESTION_FEATURE-11-03-26.md)
- [User Module Architecture](./USER_MODULE_ARCHITECTURE.md)

---

## 🎉 Conclusion

**All user.module diagrams are now COMPLETE and PRODUCTION READY!**

### What's Shown:
- ✅ Manual preferred time update (GET/PUT API)
- ✅ Automatic preferred time calculation (from task module)
- ✅ Cache invalidation strategy
- ✅ Task module integration
- ✅ Complete user journey
- ✅ All components, services, and data flows

### Status:
**✅ USER MODULE DIAGRAMS - COMPLETE**

---

**Diagram Update Date**: 11-03-26  
**Status**: ✅ **COMPLETE**  
**Next**: Both task.module and user.module diagrams are now synchronized!
