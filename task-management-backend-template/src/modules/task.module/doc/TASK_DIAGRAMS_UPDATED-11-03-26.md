# ✅ Task Module Diagrams - Updated with Preferred Time Feature

**Date**: 11-03-26  
**Status**: ✅ **COMPLETE**  
**Feature**: Automatic Preferred Time Calculation  

---

## 📊 Diagrams Updated

All task.module diagrams have been updated to include the **Automatic Preferred Time Calculation** feature.

---

## 📁 Updated Diagram Files

### 1. **task-schema.mermaid** ✅
**File**: `src/modules/task.module/doc/dia/task-schema.mermaid`

**Changes:**
- Added `preferredTime` field to USER entity
- Added relationship: `USER ||--o{ TASK : "tracks start time for preferred time"`
- Updated TASK fields to match current schema
- Added index documentation for `preferredTime_1_isDeleted_1`

**Key Additions:**
```mermaid
USER {
    String preferredTime "Auto-calculated HH:mm format"
}

USER ||--o{ TASK : "tracks start time for preferred time"
```

---

### 2. **task-sequence.mermaid** ✅
**File**: `src/modules/task.module/doc/dia/task-sequence.mermaid`

**Changes:**
- Added Preferred Time Worker participant
- Added User Collection participant
- Shows complete flow: Task completion → BullMQ → Calculation → User update

**New Flow:**
```mermaid
U->>API: PUT /tasks/:id/status (complete task)
API->>BullMQ: Add job: calculatePreferredTime
BullMQ->>PrefWorker: Process job
PrefWorker->>DB: Get last 10 completed tasks
PrefWorker->>UserDB: Update user.preferredTime
```

---

### 3. **task-system-architecture.mermaid** ✅
**File**: `src/modules/task.module/doc/dia/task-system-architecture.mermaid`

**Changes:**
- Added Preferred Time Worker to Async Processing
- Split MongoDB into TaskDB and UserDB
- Added data flow arrows for preferred time calculation
- Highlighted new components with colors

**New Components:**
```mermaid
subgraph async
    PrefTimeWorker[⏰ Preferred Time Worker]
end

subgraph data
    TaskDB[(Task Collection)]
    UserDB[(User Collection)]
end

PrefTimeWorker --> TaskDB
PrefTimeWorker --> UserDB
```

---

### 4. **task-data-flow.mermaid** ✅
**File**: `src/modules/task.module/doc/dia/task-data-flow.mermaid`

**Changes:**
- Added Preferred Time Calc to Processing
- Added PrefTimeUpdate to Tracking
- Highlighted Task Completed as trigger event
- Shows separate flow for preferred time calculation

**New Flow Path:**
```mermaid
TaskCompleted --> PrefTimeCalc
PrefTimeCalc --> PrefTimeUpdate
```

---

### 5. **task-component-architecture.mermaid** ✅
**File**: `src/modules/task.module/doc/dia/task-component-architecture.mermaid`

**Changes:**
- Added Preferred Time Calculator to Task Sub-Module
- Added BullMQ to External Dependencies
- Shows data flow: Controller → PrefTimeCalc → BullMQ → User
- Highlighted new components

**New Components:**
```mermaid
subgraph task
    PrefTimeCalc[⏰ Preferred Time Calculator]
end

TaskController --> PrefTimeCalc
PrefTimeCalc --> BullMQ
BullMQ --> User
```

---

## 🎨 Visual Enhancements

### Color Coding
```mermaid
style PrefTimeWorker fill:#f9f,stroke:#333,stroke-width:2px  ← Pink for workers
style UserDB fill:#bbf,stroke:#333,stroke-width:2px          ← Blue for databases
style PrefTimeCalc fill:#f9f,stroke:#333,stroke-width:2px    ← Pink for calculators
style BullMQ fill:#ff9,stroke:#333,stroke-width:2px          ← Yellow for queues
style TaskCompleted fill:#9f9,stroke:#333,stroke-width:2px   ← Green for triggers
```

---

## 📊 Diagram Summary

| Diagram | Purpose | Key Update |
|---------|---------|------------|
| **Schema** | Database structure | Added preferredTime field to User |
| **Sequence** | API interaction flow | Shows preferred time calculation flow |
| **System Architecture** | High-level system design | Added worker and data flow |
| **Data Flow** | Event processing | Shows calculation trigger and update |
| **Component Architecture** | Module structure | Added calculator component |

---

## 🔄 Preferred Time Flow (Across All Diagrams)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Child completes task                                     │
│    PUT /tasks/:id/status { status: "completed" }            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Task Controller triggers BullMQ job                      │
│    preferredTimeQueue.add('calculatePreferredTime')         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Preferred Time Worker processes job                      │
│    - Get last 10 completed tasks                            │
│    - Calculate average start time                           │
│    - Update user.preferredTime                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User collection updated                                  │
│    user.preferredTime = "08:17"                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 What Each Diagram Shows

### **Schema Diagram** (task-schema.mermaid)
- ✅ TASK collection with startTime field
- ✅ USER collection with preferredTime field
- ✅ Relationship: Tasks track start time for preferred time calculation

### **Sequence Diagram** (task-sequence.mermaid)
- ✅ Step-by-step API interaction
- ✅ BullMQ job queuing
- ✅ Worker processing
- ✅ Database update

### **System Architecture** (task-system-architecture.mermaid)
- ✅ High-level system view
- ✅ Preferred Time Worker as separate component
- ✅ Data flow between collections

### **Data Flow** (task-data-flow.mermaid)
- ✅ Event-driven architecture
- ✅ Task completion as trigger
- ✅ Separate calculation flow

### **Component Architecture** (task-component-architecture.mermaid)
- ✅ Module internal structure
- ✅ Preferred Time Calculator component
- ✅ External dependencies (BullMQ, User)

---

## ✅ Verification Checklist

- [x] All 5 diagrams updated
- [x] Consistent naming across diagrams
- [x] Color coding applied
- [x] Flow logic verified
- [x] Relationships documented
- [x] Mermaid syntax validated
- [x] Files saved in correct location

---

## 📝 Next Steps

### ✅ Task Module Diagrams - COMPLETE
### ⏭️ **Next: Update User Module Diagrams**

The user.module diagrams should show:
- preferredTime field in User schema
- API endpoints for manual update (GET/PUT /user/preferred-time)
- Automatic calculation flow (from task completion)
- Integration with task.module

---

## 🔗 Related Documentation

- [Automatic Preferred Time Feature](../AUTOMATIC_PREFERRED_TIME_FEATURE-11-03-26.md)
- [Task Module Architecture](./TASK_MODULE_ARCHITECTURE.md)
- [Task Module System Guide](./TASK_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

**Diagram Update Date**: 11-03-26  
**Status**: ✅ **TASK MODULE DIAGRAMS COMPLETE**  
**Next**: User Module Diagrams Update
