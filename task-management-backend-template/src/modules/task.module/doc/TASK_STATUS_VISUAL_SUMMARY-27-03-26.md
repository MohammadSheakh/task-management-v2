# Task Status Update — Visual Summary

**Quick Reference Guide**  
**Last Updated:** 27-03-26

---

## 🎯 One-Page Flow Chart

### **Scenario: Child Updates Task Status**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Child Opens Task Details                     │
│                  (figma: home-flow.png - Screen 3)              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │  What type of task?  │
          └──────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌──────────┐  ┌──────────────┐
   │Personal│  │  Single  │  │ Collaborative│
   │        │  │Assignment│  │              │
   └───┬────┘  └─────┬────┘  └──────┬───────┘
       │             │              │
       │             │              │
       ▼             ▼              ▼
   ┌─────────────────────────┐  ┌──────────────────────┐
   │  PUT /tasks/:id/status  │  │ PUT /task-progress/  │
   │                         │  │   :taskId/status     │
   └────────────────────────┘  └──────────┬───────────┘
            │                              │
            │                              │
            ▼                              ▼
   ┌───────────────────────┐    ┌──────────────────────────┐
   │  Task Service         │    │  TaskProgress Service    │
   │  - Update task.status │    │  - Update child progress │
   │  - Set completedAt    │    │  - Check ALL children    │
   └──────────────────────┘    │  - Auto-complete parent │◄──┐
            │                   └─────────────────────────┘   │
            │                              │                   │
            ▼                              ▼                   │
   ┌────────────────┐            ┌──────────────────┐         │
   │  MongoDB       │            │  MongoDB         │         │
   │  tasks         │            │  taskProgress    │         │
   └────────────────┘            └──────┬───────────┘         │
                                        │                     │
                                        │ All completed?      │
                                        │                     │
                                        └─────────────────────┘
                                                │
                                                ▼
                                   ┌────────────────────────┐
                                   │  YES: Update Parent    │
                                   │  - task.status = done  │
                                   │  - Emit socket event   │
                                   │  - Invalidate cache    │
                                   └────────────────────────┘
```

---

## 📊 Database Schema Relationships

```
┌─────────────────────────┐
│   tasks Collection      │
│                         │
│  _id: ObjectId          │
│  taskType: "collaborative"
│  status: "inProgress"   │◄─── Auto-updated when
│  assignedUserIds: [...] │     ALL children complete
│  createdById: ObjectId  │
└──────────┬──────────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────────┐
│   taskProgress          │
│   Collection            │
│                         │
│  taskId: ObjectId       │
│  userId: ObjectId       │
│  status: "completed"    │◄─── Child 1
│  progressPercentage: 100│
│  completedSubtaskIndexes: [0,1,2]
├─────────────────────────┤
│  taskId: ObjectId       │
│  userId: ObjectId       │
│  status: "completed"    │◄─── Child 2
│  progressPercentage: 100│
├─────────────────────────┤
│  taskId: ObjectId       │
│  userId: ObjectId       │
│  status: "completed"    │◄─── Child 3 (LAST)
│  progressPercentage: 100│
└─────────────────────────┘
```

---

## 🔄 Sequence Diagram

### **Collaborative Task — Last Child Completes**

```
Child App          TaskProgress      TaskProgress       Parent Task       Parent
                   Controller         Service            Model          Dashboard
    │                   │                  │                │               │
    │ PUT /task-progress/:id/status       │                │               │
    │──────────────────>│                  │                │               │
    │                   │  Validate        │                │               │
    │                   │  Request         │                │               │
    │                   │                  │                │               │
    │                   │  Update Progress │                │               │
    │                   │─────────────────>│                │               │
    │                   │                  │                │               │
    │                   │                  │ Find Task      │               │
    │                   │                  │───────────────>│               │
    │                   │                  │                │               │
    │                   │                  │ Check ALL      │               │
    │                   │                  │ Children Done? │               │
    │                   │                  │                │               │
    │                   │                  │ YES: Update    │               │
    │                   │                  │ Parent Status  │               │
    │                   │                  │───────────────>│               │
    │                   │                  │                │               │
    │                   │                  │ Invalidate     │               │
    │                   │                  │ Cache          │               │
    │                   │                  │                │               │
    │                   │                  │ Emit Socket    │               │
    │                   │                  │ Event          │               │
    │                   │                  │                │               │
    │                   │                  │                │  Real-time    │
    │                   │                  │                │  Update       │
    │                   │                  │                │──────────────>│
    │                   │                  │                │               │
    │  Success Response │                  │                │               │
    │<──────────────────│                  │                │               │
    │                   │                  │                │               │
```

---

## 🎨 UI State Changes

### **Before Last Child Completes**

```
┌─────────────────────────────────────┐
│  Task: Group Science Project        │
│  Type: Collaborative                │
│  Status: In Progress                │
│                                     │
│  👤 Child 1: ✅ Completed           │
│  👤 Child 2: ✅ Completed           │
│  👤 Child 3: 🔄 In Progress         │
│                                     │
│  [Start] [Complete] ← Child 3 view  │
└─────────────────────────────────────┘
```

### **After Child 3 Clicks "Complete"**

```
┌─────────────────────────────────────┐
│  Task: Group Science Project        │
│  Type: Collaborative                │
│  Status: ✅ Completed 🎉            │
│                                     │
│  👤 Child 1: ✅ Completed           │
│  👤 Child 2: ✅ Completed           │
│  👤 Child 3: ✅ Completed           │
│                                     │
│  🎉 All children completed!         │
│  Completed at: Jan 5, 10:30 AM      │
└─────────────────────────────────────┘
```

---

## 🔐 Permission Check Flow

```
         User Requests Status Update
                      │
                      ▼
         ┌────────────────────────┐
         │  Is user authenticated?│
         └───────────┬────────────┘
                     │ YES
                     ▼
         ┌────────────────────────┐
         │  What task type?       │
         └───────────┬────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────  ┌──────────┐  ┌────────────┐
   │Personal│  │  Single  │  │Collaborative│
   └───┬────┘  └─────┬────┘  └─────┬──────┘
       │             │             │
       ▼             ▼             ▼
  Is owner?     Is assigned?  Is in assigned
       │             │         user list?
       │             │             │
       ▼             ▼             ▼
    ✅ YES        ✅ YES        ✅ YES
       │             │             │
       └─────────────┴─────────────┘
                     │
                     ▼
          Update Progress Allowed
```

---

## 📈 Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | < 200ms | Personal/Single assignment |
| **API Response Time** | < 300ms | Collaborative (with auto-complete check) |
| **Cache Hit Rate** | > 80% | Task progress queries |
| **Auto-Complete Latency** | < 50ms | Last child → parent update |
| **Socket Event Delivery** | < 100ms | Real-time update to parent |

---

## 🧪 Quick Test Checklist

- [ ] Personal task: Child can update status directly
- [ ] Single assignment: Assigned user can update status
- [ ] Collaborative: Each child can update own progress
- [ ] Collaborative: Parent task auto-completes when ALL children complete
- [ ] Real-time: Parent dashboard updates immediately
- [ ] Cache: Invalidated after status update
- [ ] Permissions: Users can only update tasks they have access to

---

**For Detailed Documentation:**  
See `TASK_STATUS_UPDATE_FLOW-27-03-26.md` in same folder.

---
-27-03-26
