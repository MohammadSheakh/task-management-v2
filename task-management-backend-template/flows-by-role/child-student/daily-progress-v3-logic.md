# Daily Progress V3 - Business Logic Flow

## 🎯 Overview

This document explains the complete flow of the `/tasks/daily-progress/v3` endpoint with detailed thinking at each step.

---

## 📋 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER OPENS APP                           │
│                  (Home Screen Load)                         │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Frontend Calls API                                 │
│  GET /tasks/daily-progress/v3?date=2026-04-13              │
│  Headers: Authorization: Bearer <token>                    │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: Authentication & Rate Limiting                     │
│  ✓ Verify JWT token                                         │
│  ✓ Extract userId from token                                │
│  ✓ Check rate limit (100 req/min)                          │
│  ✓ Validate date format (if provided)                      │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: Cache Check (Redis)                                │
│  Cache Key: "daily-progress-v3:2026-04-13:user-123"        │
│                                                             │
│  ┌──────────────────────────────────┐                      │
│  │ Cache HIT?                       │                      │
│  │                                  │                      │
│  │ YES → Return cached data         │                      │
│  │        (Skip to Step 8)          │                      │
│  │                                  │                      │
│  │ NO  → Continue to Step 4         │                      │
│  └──────────────────────────────────┘                      │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Define Date Range                                  │
│                                                             │
│  targetDate = 2026-04-13 (or today if not provided)        │
│  startOfDay = 2026-04-13 00:00:00.000                      │
│  endOfDay   = 2026-04-13 23:59:59.999                      │
│                                                             │
│  THINKING: Why exact day boundaries?                       │
│  - "Daily" means midnight to midnight                      │
│  - Captures all tasks scheduled for this day               │
│  - Supports future-dated tasks                             │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Query MongoDB for Tasks                            │
│                                                             │
│  Query:                                                     │
│  {                                                          │
│    $or: [                                                   │
│      { ownerUserId: userId },        ← Self-created tasks  │
│      { assignedUserIds: userId }     ← Assigned tasks      │
│    ],                                                       │
│    startTime: {                                             │
│      $gte: startOfDay,  (00:00:00.000)                     │
│      $lte: endOfDay     (23:59:59.999)                     │
│    },                                                       │
│    isDeleted: false                                         │
│  }                                                          │
│                                                             │
│  Sort: { startTime: 1 }  ← Chronological order             │
│                                                             │
│  THINKING: Why this query structure?                       │
│  - $or: User sees ALL responsibilities (self + assigned)   │
│  - startTime: Filter by SCHEDULED date, not creation date  │
│  - isDeleted: Soft delete support                          │
│  - Sort: Earliest tasks first (what to do NOW?)            │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Calculate Statistics                               │
│                                                             │
│  From query results (example):                             │
│                                                             │
│  Task 1: "Math Homework"     → Status: PENDING             │
│  Task 2: "UX/UI Design"      → Status: PENDING             │
│  Task 3: "Read Chapter 5"    → Status: IN_PROGRESS         │
│  Task 4: "Science Project"   → Status: PENDING             │
│  Task 5: "History Essay"     → Status: COMPLETED           │
│                                                             │
│  Calculations:                                              │
│  total      = 5  (all tasks)                                │
│  completed  = 1  (status === COMPLETED)                    │
│  inProgress = 1  (status === IN_PROGRESS)                  │
│  pending    = 3  (status === PENDING)                      │
│  remaining  = 4  (total - completed)                       │
│                                                             │
│  THINKING: Why count by task status?                       │
│  - Task-level status is the source of truth                │
│  - Subtask completion automatically updates task status    │
│  - User cares about "tasks done" not "subtasks done"       │
│  - CRITICAL: 4/5 subtasks done ≠ task completed            │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 7: Build Task List with Subtask Progress              │
│                                                             │
│  For each task, calculate:                                  │
│                                                             │
│  Example - Task with subtasks:                              │
│  {                                                          │
│    _id: "task-123",                                         │
│    title: "Math Homework",                                  │
│    status: "pending",                                       │
│    startTime: "2026-04-13T10:30:00.000Z",                  │
│    taskType: "self",                                        │
│    assignedBy: "user-456",                                  │
│    subtasks: {                                              │
│      total: 5,                                              │
│      completed: 2                                           │
│    },                                                       │
│    progressPercentage: 40  ← (2/5 * 100)                   │
│  }                                                          │
│                                                             │
│  Example - Task without subtasks:                           │
│  {                                                          │
│    _id: "task-789",                                         │
│    title: "Read Chapter 5",                                 │
│    status: "inProgress",                                    │
│    startTime: "2026-04-13T14:00:00.000Z",                  │
│    taskType: "self",                                        │
│    subtasks: undefined,  ← No subtasks                     │
│    progressPercentage: 0   ← Not completed yet             │
│  }                                                          │
│                                                             │
│  Progress % Logic:                                          │
│  - If task HAS subtasks: (completedSubtasks/total)*100     │
│  - If NO subtasks + completed: 100%                        │
│  - If NO subtasks + not completed: 0%                      │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 8: Generate Dynamic Encouragement Message             │
│                                                             │
│  Logic:                                                     │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │ if (completed === 0):                        │          │
│  │   → "No tasks completed yet.                 │          │
│  │        Let's get started!"                   │          │
│  │                                              │          │
│  │ else if (completed === total && total > 0): │          │
│  │   → "All tasks completed!                    │          │
│  │        Amazing work! 🎉"                     │          │
│  │                                              │          │
│  │ else:                                        │          │
│  │   → "4 tasks remaining.                      │          │
│  │        You've got this!"                     │          │
│  │        ↑ Figma shows this exact message      │          │
│  └──────────────────────────────────────────────┘          │
│                                                             │
│  THINKING: Why dynamic messages?                           │
│  - MOTIVATIONAL DESIGN: Different messages for different   │
│    progress states                                          │
│  - Psychological impact: Right words at right time         │
│    increase engagement                                      │
│  - 0 completed: Gentle nudge, no guilt                     │
│  - All done: Celebration, dopamine hit                     │
│  - In progress: Encouragement, confidence                  │
│  - Pluralization: "1 task" vs "2 tasks"                    │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 9: Build Final Response (Figma-Aligned)               │
│                                                             │
│  {                                                          │
│    "date": "2026-04-13",                                    │
│    "progress": {                                            │
│      "completed": 1,                                        │
│      "total": 5,                                            │
│      "display": "1/5",           ← Figma badge             │
│      "percentage": 20            ← Progress bar fill       │
│    },                                                       │
│    "statistics": {                                          │
│      "total": 5,                                            │
│      "completed": 1,                                        │
│      "pending": 3,                                          │
│      "inProgress": 1,                                       │
│      "remaining": 4                                         │
│    },                                                       │
│    "message": "4 tasks remaining. You've got this!",        │
│    "tasks": [ ... ]                                         │
│  }                                                          │
│                                                             │
│  FIGMA ALIGNMENT:                                           │
│  - "1/5" badge       → progress.display                    │
│  - Progress bar 20%  → progress.percentage                 │
│  - Message text      → message                              │
│  - Task list         → tasks[]                              │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 10: Cache Result (Redis)                              │
│                                                             │
│  Cache Key: "daily-progress-v3:2026-04-13:user-123"        │
│  TTL: 120 seconds (2 minutes)                               │
│  Value: Full response object                                │
│                                                             │
│  THINKING: Why 2 minutes?                                   │
│  - Home screen accessed frequently (every app open)        │
│  - Task status can change (subtask completion, etc.)       │
│  - Stale data = user frustration                           │
│  - Trade-off: Performance vs. freshness                    │
│    → Freshness wins for home screen widget                 │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 11: Return Response to Frontend                       │
│                                                             │
│  HTTP 200 OK                                                │
│  {                                                          │
│    "success": true,                                         │
│    "message": "Daily progress retrieved successfully (V3)",│
│    "data": { ... }  ← Response from Step 9                 │
│  }                                                          │
└──────────────────────────────────────┬──────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 12: Frontend Renders UI                               │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │ Daily Progress              1/5              │           │
│  │ ▓▓░░░░░░░░░░░░░░░░░░░                     │           │
│  │                                              │           │
│  │ 4 tasks remaining. You've got this!         │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  Your Tasks:                                                │
│  ┌─────────────────────────────────────────────┐           │
│  │ Complete Math Homework        Pending       │           │
│  │ 🕐 10:30 AM  📄 5 subtasks                  │           │
│  │                    ▓░░░░ 0% Completed       │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │ UX/UI Design                  Pending       │           │
│  │ 🕐 10:30 AM  📄 5 subtasks                  │           │
│  │                    ▓░░░░ 0% Completed       │           │
│  └─────────────────────────────────────────────┘           │
│                                                             │
│  ┌─────────────────────────────────────────────┐           │
│  │ Complete Math Homework        In Progress   │           │
│  │ 🕐 10:30 AM  📄 2/5 subtasks                │           │
│  │                    ▓▓▓░░ 30% Completed      │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧠 Decision Tree: Edge Cases

```
┌────────────────────────────────────────┐
│ What if user has NO tasks for the day? │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ total = 0                              │
│ completed = 0                          │
│ percentage = 0                         │
│ display = "0/0"                        │
│ message = "No tasks completed yet.     │
│          Let's get started!"           │
│ tasks = []                             │
└──────────┬─────────────────────────────┘
           │
           ▼
    Frontend shows empty state

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────┐
│ What if ALL tasks are completed?       │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ completed = total (e.g., 5/5)          │
│ remaining = 0                          │
│ percentage = 100                       │
│ display = "5/5"                        │
│ message = "All tasks completed!        │
│          Amazing work! 🎉"             │
└──────────┬─────────────────────────────┘
           │
           ▼
    Frontend shows celebration state

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────┐
│ What if task has subtasks?             │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ Task status updates when:              │
│ - ALL subtasks completed → COMPLETED   │
│ - ANY subtask started → IN_PROGRESS    │
│ - No subtasks started → PENDING        │
│                                        │
│ progressPercentage =                   │
│   (completedSubtasks / totalSubtasks)  │
│   * 100                                │
│                                        │
│ Example: 2/5 subtasks = 40%            │
└──────────┬─────────────────────────────┘
           │
           ▼
    Frontend shows subtask progress bar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────┐
│ What if date is in the future?         │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ Query returns tasks scheduled for      │
│ that future date.                      │
│                                        │
│ Example: ?date=2026-04-20             │
│ → Shows tasks scheduled for Apr 20     │
│ → Even if created today (Apr 13)       │
│                                        │
│ THINKING: Supports advance planning    │
└──────────┬─────────────────────────────┘
           │
           ▼
    Frontend shows future schedule

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────┐
│ What if user is assigned tasks?        │
└──────────┬─────────────────────────────┘
           │
           ▼
┌────────────────────────────────────────┐
│ Query includes tasks where:            │
│ - ownerUserId = userId (self tasks)    │
│   OR                                   │
│ - assignedUserIds includes userId      │
│   (assigned by teacher/parent)         │
│                                        │
│ THINKING: User sees ALL responsibilities│
│ in one view                            │
└──────────┬─────────────────────────────┘
           │
           ▼
    Frontend shows mixed task types
```

---

## ⚡ Performance Considerations

### Database Query Optimization

```javascript
// RECOMMENDED: Add compound index
db.tasks.createIndex({
  ownerUserId: 1,
  startTime: 1,
  isDeleted: 1
});

db.tasks.createIndex({
  assignedUserIds: 1,
  startTime: 1,
  isDeleted: 1
});
```

### Caching Strategy

```
Cache Hit Rate Target: >80%
TTL: 120 seconds (2 minutes)
Invalidation: Automatic (TTL-based)
Key Format: daily-progress-v3:{date}:{userId}
```

### Memory Efficiency

- Use `.lean()` query → Plain JS objects (no Mongoose overhead)
- Only select required fields (avoid fetching large description fields)
- Sort at DB level (indexed field)

---

## 📊 Metrics to Track

1. **API Performance:**
   - Average response time
   - Cache hit rate
   - Database query time

2. **User Engagement:**
   - Daily active users viewing progress
   - Average tasks completed per day
   - Time of day when progress is checked

3. **Business Metrics:**
   - Completion rate (% of tasks completed)
   - Average tasks per user per day
   - Streak tracking (future enhancement)

---

## 🔒 Security Considerations

1. **Authentication:** Required (JWT token)
2. **Authorization:** User can only see their own progress
3. **Rate Limiting:** 100 requests per minute
4. **Input Validation:** Date format validation
5. **Data Privacy:** No sensitive data exposed

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| V1 | Unknown | Basic daily progress implementation |
| V2 | 02-04-26 | Figma-aligned format, dynamic messages |
| V3 | 13-04-26 | Comprehensive documentation, design thinking |

---

**Last Updated:** 13-04-2026  
**Author:** Engineering Team  
**Status:** ✅ Implemented & Documented
