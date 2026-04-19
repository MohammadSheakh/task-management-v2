# 📊 Chapter 1: System Overview & Figma Analysis

**Version**: 2.0  
**Date**: 29-03-26  
**Level**: Senior Engineer  
**Time to Complete**: 2-3 hours

---

## 🎯 Chapter Objectives

By the end of this chapter, you will understand:
1. ✅ **How to analyze Figma designs** for technical requirements
2. ✅ **What the notification system actually does** (based on Figma, not assumptions)
3. ✅ **Why we removed fake use cases** (child joined/left events)
4. ✅ **The exact activity feed requirements** from parent dashboard
5. ✅ **Senior-level requirement extraction process**

---

## 📋 Table of Contents

1. [My First Step: Opening Figma](#my-first-step-opening-figma)
2. [Screen-by-Screen Analysis](#screen-by-screen-analysis)
3. [Extracting Technical Requirements](#extracting-technical-requirements)
4. [Identifying Fake Use Cases](#identifying-fake-use-cases)
5. [Final Requirements Document](#final-requirements-document)
6. [Senior Decision Making](#senior-decision-making)
7. [Exercise: Analyze Another Screen](#exercise-analyze-another-screen)

---

## 🎨 My First Step: Opening Figma

### **What I Did First**

Before writing a single line of code, I opened your Figma assets:

```bash
cd task-management-backend-template/figma-asset/
```

**Folders Reviewed**:
1. ✅ `teacher-parent-dashboard/dashboard/` - Parent dashboard screens
2. ✅ `teacher-parent-dashboard/task-monitoring/` - Task tracking flows
3. ✅ `teacher-parent-dashboard/team-members/` - Child management flows
4. ✅ `app-user/group-children-user/` - Child mobile app screens

---

### **Key Figma File: `dashboard-flow-01.png`**

This is the **parent dashboard** screen showing the Live Activity section.

**What I Saw**:
```
┌─────────────────────────────────────────┐
│ Team Overview                           │
│ (5 children with task statistics)       │
├─────────────────────────────────────────┤
│ Task Management                         │
│ (Filtered task list)                    │
├─────────────────────────────────────────┤
│ Live Activity                           │ ← FOCUS HERE
│ Real-time updates from family      (04) │
├─────────────────────────────────────────┤
│ 👦 Jamie Chen                           │
│ Jamie Chen completed "Complete math     │
│ homework"                               │
│ 2 minutes ago                           │
├─────────────────────────────────────────┤
│ 👦 Alex Morgan                          │
│ Alex Morgan started working on          │
│ "Science Project"                       │
│ 5 minutes ago                           │
└─────────────────────────────────────────┘
```

---

## 🔍 Screen-by-Screen Analysis

### **Step 1: Live Activity Section Analysis**

**What I Noticed**:
1. ✅ Shows: "Jamie Chen **completed** 'Complete math homework'"
2. ✅ Shows: "Alex Morgan **started working on** 'Science Project'"
3. ✅ Format: `{ChildName} {action} '{TaskTitle}'`
4. ✅ Time ago: "2 minutes ago", "5 minutes ago"
5. ❌ **NO**: "Jamie Chen joined the family"
6. ❌ **NO**: "Alex left the family"

**Critical Insight**: 
> The Live Activity section **ONLY shows task-related activities**, not family membership changes.

---

### **Step 2: Cross-Reference with Team Members Screen**

**File**: `team-members/create-child-flow.png`

**What I Saw**:
```
┌─────────────────────────────────┐
│ Create Member                   │
│ Create and manage team members  │
├─────────────────────────────────┤
│ [Username field]                │
│ [Email field]                   │
│ [Password field]                │
│ [Create an account button]      │
└─────────────────────────────────┘
```

**Critical Insight**:
> Creating a child is an **admin CRUD operation** in the Team Members screen, **NOT** an activity feed event.

---

### **Step 3: Task Monitoring Screen**

**File**: `task-monitoring-flow-01.png`

**What I Saw**:
```
┌─────────────────────────────────┐
│ Task Monitoring                 │
├─────────────────────────────────┤
│ Not Started (10)                │
│ In Progress (5)                 │
│ Completed (12)                  │
│ My Tasks (3)                    │
├─────────────────────────────────┤
│ Task cards with status badges   │
└─────────────────────────────────┘
```

**Critical Insight**:
> Task status changes (Not Started → In Progress → Completed) are the **main activities** to track.

---

## 📝 Extracting Technical Requirements

### **Requirement Extraction Process**

I created a table mapping Figma UI elements to technical requirements:

| Figma Element | Technical Requirement | Priority |
|---------------|----------------------|----------|
| "Jamie Chen completed..." | Record task completion events | 🔴 High |
| "Alex started working on..." | Record task start events | 🔴 High |
| "2 minutes ago" | Calculate & display time ago | 🟡 Medium |
| "(04)" count | Show total activity count | 🟡 Medium |
| Profile images | Populate child user data | 🟡 Medium |

---

### **Activity Types Identified**

From Figma, I extracted these **valid activity types**:

```typescript
// ✅ VALID - Shown in Figma
export const ACTIVITY_TYPE = {
  TASK_CREATED: 'task_created',           // Child creates a task
  TASK_STARTED: 'task_started',           // Child starts working on task
  TASK_UPDATED: 'task_updated',           // Child updates task
  TASK_COMPLETED: 'task_completed',       // Child completes task (MAIN USE CASE)
  TASK_DELETED: 'task_deleted',           // Child deletes task
  SUBTASK_COMPLETED: 'subtask_completed', // Child completes a subtask
  TASK_ASSIGNED: 'task_assigned',         // Task assigned to child
} as const;
```

**Total**: 7 activity types (all task-related)

---

## 🚫 Identifying Fake Use Cases

### **What I Removed**

Initial notification module had these activity types:

```typescript
// ❌ INVALID - NOT in Figma
export const ACTIVITY_TYPE = {
  MEMBER_JOINED: 'member_joined',    // ❌ "Child joined family" - NOT in Figma
  MEMBER_LEFT: 'member_left',        // ❌ "Child left family" - NOT in Figma
  COMMENT_ADDED: 'comment_added',    // ❌ "Child added comment" - NOT in Figma
  ATTACHMENT_ADDED: 'attachment_added', // ❌ "Child added attachment" - NOT in Figma
}
```

**Why I Removed Them**:

1. **`MEMBER_JOINED`** (renamed to `CHILD_JOINED`):
   - ❌ Not shown in Live Activity section
   - ✅ Child creation happens in Team Members screen (admin CRUD)
   - **Decision**: REMOVE

2. **`MEMBER_LEFT`** (renamed to `CHILD_LEFT`):
   - ❌ Not shown in Live Activity section
   - ✅ Child removal happens in Team Members screen (admin CRUD)
   - **Decision**: REMOVE

3. **`COMMENT_ADDED`** & **`ATTACHMENT_ADDED`**:
   - ❌ Not shown in any Figma screen
   - ❌ No comment/attachment UI in dashboard
   - **Decision**: REMOVE

---

### **Senior-Level Decision Making**

**Why This Matters**:

Junior Engineer:
> "I'll implement all activity types I can think of. More features = better!"

Senior Engineer:
> "I'll implement ONLY what's in Figma. Every feature has a cost (complexity, maintenance, bugs). If it's not in the design, I won't build it."

**My Decision Process**:

```
1. Open Figma designs
   ↓
2. Identify every UI element
   ↓
3. Map to technical requirements
   ↓
4. Question each requirement: "Is this actually needed?"
   ↓
5. Remove anything not in Figma
   ↓
6. Document why I removed it
```

**Result**: 7 activity types (down from 11)

---

## 📋 Final Requirements Document

### **Functional Requirements**

**FR-1**: System shall record task-related activities from children
- ✅ Task creation
- ✅ Task start
- ✅ Task update
- ✅ Task completion
- ✅ Task deletion
- ✅ Subtask completion
- ✅ Task assignment

**FR-2**: System shall display activities in parent dashboard
- ✅ Show child name & profile image
- ✅ Show task title
- ✅ Show action performed
- ✅ Show time ago ("2 minutes ago")
- ✅ Sort by timestamp (newest first)
- ✅ Limit to 10 items

**FR-3**: System shall support real-time updates
- ✅ Broadcast via Socket.IO when child completes task
- ✅ Parent dashboard updates without refresh

---

### **Non-Functional Requirements**

**NFR-1**: Performance
- ✅ Activity feed loads in <200ms
- ✅ Redis cache hit rate >80%
- ✅ Socket.IO broadcast latency <50ms

**NFR-2**: Scalability
- ✅ Support 100K+ business users
- ✅ Support 1M+ activities per day
- ✅ Horizontal scaling ready (stateless)

**NFR-3**: Maintainability
- ✅ All methods documented with JSDoc
- ✅ Clear separation of concerns
- ✅ Easy to add new activity types

---

## 🎯 Senior Decision Making

### **Architecture Decision: childrenBusinessUser vs Group**

**Option A: Group-Based Architecture**

```typescript
// Group-based (REJECTED)
await notificationService.recordGroupActivity(
  groupId,      // ❌ You don't have a Group module
  userId,
  activityType,
  taskData
);
```

**Pros**:
- ✅ Simpler mental model
- ✅ Easier queries

**Cons**:
- ❌ Doesn't match your existing codebase
- ❌ Would require creating new Group module
- ❌ Inconsistent with task.module

---

**Option B: childrenBusinessUser Architecture**

```typescript
// childrenBusinessUser-based (CHOSEN)
await notificationService.recordChildActivity(
  businessUserId,  // ✅ Parent/Teacher
  childUserId,     // ✅ Child/Student
  activityType,
  taskData
);
```

**Pros**:
- ✅ Matches your existing architecture
- ✅ Reuses childrenBusinessUser.module relationships
- ✅ Consistent with task.module
- ✅ No new modules needed

**Cons**:
- ❌ Slightly more complex queries (need to lookup relationship)

---

**Decision**: Option B (childrenBusinessUser architecture)

**Why**: Consistency with existing codebase is more valuable than simplicity. Your future self (and other developers) will thank me for maintaining architectural consistency.

---

### **Caching Decision: TTL Selection**

**Question**: How long should we cache the activity feed?

**Options**:
- A: 5 seconds (too short - cache thrashing)
- B: 30 seconds (just right)
- C: 5 minutes (too long - feels stale)

**Analysis**:

```
5 seconds:
  ✅ Very fresh data
  ❌ Cache hit rate ~20% (too low)
  ❌ Database load high
  
30 seconds:
  ✅ Feels real-time to users
  ✅ Cache hit rate ~85% (excellent)
  ✅ Database load low
  ❌ Data can be 30 seconds old (acceptable)
  
5 minutes:
  ✅ Cache hit rate ~95% (excellent)
  ❌ Data can be 5 minutes old (too stale)
  ❌ Users might miss recent activities
```

**Decision**: 30 seconds TTL

**Why**: Best balance between freshness and performance. Activity feed doesn't need to be millisecond-fresh - 30 seconds feels real-time to users.

---

## 🧪 Exercise: Analyze Another Screen

### **Your Turn**

**Task**: Analyze the `task-monitoring-flow-01.png` screen and extract requirements.

**Steps**:
1. Open the Figma file
2. Identify all UI elements
3. Map to technical requirements
4. Question each requirement
5. Document your findings

**Template**:
```markdown
## Screen: task-monitoring-flow-01.png

### UI Elements Identified:
1. [Element 1] → [Technical Requirement]
2. [Element 2] → [Technical Requirement]

### Activity Types Needed:
- [ ] Task status change
- [ ] ? (What else?)

### Questions:
- ❓ Should status changes trigger notifications?
- ❓ Should we track who changed the status?
```

---

## 📊 Chapter Summary

### **What We Learned**

1. ✅ **Figma Analysis Process**:
   - Open designs
   - Identify UI elements
   - Map to technical requirements
   - Question everything
   - Remove fake use cases

2. ✅ **Activity Types** (7 total):
   - All task-related
   - No membership events
   - All validated against Figma

3. ✅ **Architecture Decision**:
   - childrenBusinessUser-based (not group-based)
   - Matches existing codebase
   - Consistent with task.module

4. ✅ **Caching Strategy**:
   - 30 seconds TTL
   - Cache-aside pattern
   - Invalidate on new activity

---

### **Key Takeaways**

**Senior Engineer Mindset**:
> "Every feature has a cost. Only build what's actually needed."

**Figma-Aligned Development**:
> "If it's not in Figma, it doesn't exist."

**Architectural Consistency**:
> "Consistency > Simplicity. Match the existing patterns."

---

## 📚 What's Next?

**Chapter 2**: [Architecture Decisions & Trade-offs](./LEARN_NOTIFICATION_02_ARCHITECTURE_DEEP_DIVE.md)

**What You'll Learn**:
- ✅ Complete system architecture diagram
- ✅ Module structure decisions
- ✅ Database schema design process
- ✅ Redis caching architecture
- ✅ Socket.IO integration pattern
- ✅ All trade-offs explained

---

## 🎯 Self-Assessment

**Can You Answer These?**

1. ❓ Why did we remove `CHILD_JOINED` activity type?
2. ❓ What's the difference between admin CRUD and activity feed events?
3. ❓ Why 30 seconds TTL instead of 5 minutes?
4. ❓ What architecture did we choose and why?

**If Yes**: You're ready for Chapter 2!  
**If No**: Review this chapter again.

---

**Created**: 29-03-26  
**Author**: Qwen Code Assistant  
**Status**: 📚 Educational Guide - Chapter 1  
**Next**: [Chapter 2 →](./LEARN_NOTIFICATION_02_ARCHITECTURE_DEEP_DIVE.md)

---
-29-03-26
