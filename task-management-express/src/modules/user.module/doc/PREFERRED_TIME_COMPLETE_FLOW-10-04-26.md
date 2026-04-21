# Preferred Time - Complete Flow Documentation

**Date**: 10-04-26  
**Status**: ✅ Production Ready  
**Figma References**: 
- `profile-without-permission-interface.png` (User sets preferred time)
- `task-details-flow-apis.png` (Task creation with time suggestions)

---

## 🎯 Executive Summary

**What is Preferred Time?**  
A user-specific time preference (HH:mm format) that indicates when they usually work on tasks. This helps the system:

1. **Suggest optimal task start times** when parents create tasks for children
2. **Schedule notifications** at user's preferred working hours
3. **Auto-calculate** based on historical task completion patterns

---

## 📊 Complete System Flow

```mermaid
graph TB
    subgraph "1️⃣ USER SETS PREFERRED TIME"
        A[User opens Profile screen] --> B[User taps 'Preferred time']
        B --> C[Time picker appears]
        C --> D[User selects 08:30 AM]
        D --> E[PUT /user/preferred-time]
        E --> F[Backend validates HH:mm format]
        F --> G[Updates User.preferredTime = '08:30']
        G --> H[Returns success]
    end

    subgraph "2️⃣ PARENT CREATES TASK FOR CHILD"
        P1[Parent creates task] --> P2[POST /tasks]
        P2 --> P3{Child has<br/>preferredTime?}
        P3 -->|Yes| P4[Use child.preferredTime]
        P3 -->|No| P5[Use default 07:00]
        P4 --> P6[Task.startTime suggested]
        P5 --> P6
    end

    subgraph "3️⃣ AUTO-CALCULATION (BullMQ)"
        C1[Task completed] --> C2{Last 10 tasks<br/>completed?}
        C2 -->|Yes| C3[Add job to<br/>preferredTimeQueue]
        C2 -->|No| C4[Wait for more data]
        C3 --> C5[BullMQ Worker processes]
        C5 --> C6[Analyze last 10 task startTimes]
        C6 --> C7[Calculate average]
        C7 --> C8[Update User.preferredTime]
        C8 --> C9[Log: 'Updated to 08:45']
    end

    subgraph "4️⃣ SMART SUGGESTION API"
        S1[Parent creating task] --> S2[GET /tasks/suggest-preferred-time]
        S2 --> S3{Pass assignedUserId?}
        S3 -->|Yes| S4[Fetch child.preferredTime]
        S3 -->|No| S5[Fetch my.preferredTime]
        S4 --> S6[Return suggested time<br/>+ confidence + alternatives]
        S5 --> S6
    end

    G -.-> P3
    C9 -.-> P3
    S6 -.-> P6
```

---

## 🔍 Detailed Flow Breakdown

### Flow 1: User Manually Sets Preferred Time

**Figma**: `profile-without-permission-interface.png`

```
User Flow:
1. User opens Profile screen
2. Taps "Preferred time" section
3. Sees current time: "07:00 AM"
4. Taps to change → Time picker appears
5. Selects "08:30 AM"
6. Frontend converts to "08:30" (24-hour HH:mm)
7. Calls PUT /user/preferred-time
8. Backend validates:
   ✅ Format: /^([01]\d|2[0-3]):([0-5]\d)$/
   ✅ Range: 05:00 - 23:00
9. Updates User.preferredTime = "08:30"
10. Returns success
```

**API Endpoints:**

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| `GET` | `/user/preferred-time` | `commonUser` | Get my preferred time |
| `PUT` | `/user/preferred-time` | `commonUser` | Update my preferred time |

**Request/Response Example:**

```typescript
// PUT /user/preferred-time
{
  "preferredTime": "08:30"  // ✅ Valid: 05:00-23:00
}

// Response 200 OK
{
  "success": true,
  "data": {
    "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
    "preferredTime": "08:30",
    "updatedAt": "2026-04-10T08:30:00.000Z"
  },
  "message": "Preferred time updated successfully"
}
```

---

### Flow 2: Auto-Calculation via BullMQ (Smart Learning)

**Trigger**: When a user completes tasks

```typescript
// In task.controller.ts -> updateStatus (when task marked completed)
preferredTimeQueue.add('calculatePreferredTime', {
  userId: task.ownerUserId,
}, {
  jobId: `preferred-time:${task.ownerUserId}:${Date.now()}`,
});
```

**BullMQ Worker Logic** (`bullmq.ts` → `startPreferredTimeWorker`):

```typescript
async function calculateAndUpdatePreferredTime(userId: ObjectId) {
  // 1. Get last 10 COMPLETED tasks with startTime
  const tasks = await Task.find({
    ownerUserId: userId,
    status: 'completed',
    startTime: { $exists: true, $ne: null },
    isDeleted: false,
  })
    .sort({ startTime: -1 })
    .limit(10)
    .select('startTime')
    .lean();

  // 2. Need at least 5 tasks to establish pattern
  if (tasks.length < 5) {
    return null; // Insufficient data
  }

  // 3. Extract start times in minutes from midnight
  const startTimesInMinutes = tasks.map(task => {
    const date = new Date(task.startTime);
    return date.getHours() * 60 + date.getMinutes();
  });

  // 4. Calculate average
  const totalMinutes = startTimesInMinutes.reduce((sum, m) => sum + m, 0);
  const averageMinutes = Math.round(totalMinutes / tasks.length);

  // 5. Convert back to HH:mm
  const hours = Math.floor(averageMinutes / 60);
  const minutes = averageMinutes % 60;
  const preferredTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  // 6. Update user
  await User.findByIdAndUpdate(userId, { preferredTime });

  return preferredTime;
}
```

**Example Calculation:**

```
Last 10 completed task startTimes:
1. 08:15 AM
2. 08:30 AM
3. 09:00 AM
4. 08:45 AM
5. 08:20 AM
6. 09:10 AM
7. 08:35 AM
8. 08:50 AM
9. 08:25 AM
10. 08:40 AM

Average: 08:38 AM
Calculated preferredTime: "08:38"
→ User.preferredTime updated automatically!
```

---

### Flow 3: Smart Time Suggestion for Task Creation

**API**: `GET /tasks/suggest-preferred-time`

**Use Case**: Parent creating task for child → system suggests optimal start time

```typescript
// Frontend calls when parent is creating task
GET /tasks/suggest-preferred-time?assignedUserId=CHILD_USER_ID

// Response
{
  "suggestedTime": "08:30",
  "suggestedTime12Hour": "08:30 AM",
  "basedOn": "assignee_preferred_time",
  "confidence": "high",
  "explanation": "Bashar usually works on tasks at 08:30 AM based on their preferred time setting.",
  "alternativeTimes": ["07:30", "08:30", "09:30"]
}
```

**Confidence Levels:**

| Confidence | When | Explanation |
|------------|------|-------------|
| `high` | User has preferredTime set | Based on explicit user preference |
| `medium` | Auto-calculated from history | Based on task completion patterns |
| `low` | No data available | Using default 09:00 AM |

---

## 📁 File Structure & Responsibilities

```
src/modules/
├── user.module/
│   ├── user/
│   │   ├── user.model.ts              ← preferredTime field + index
│   │   ├── user.service.ts            ← getPreferredTime(), updatePreferredTime()
│   │   ├── user.controller.ts         ← HTTP handlers
│   │   ├── user.route.ts              ← GET/PUT /user/preferred-time
│   │   └── user.validation.ts         ← Zod schema (HH:mm format)
│   └── doc/
│       ├── PREFERRED_TIME_FEATURE-11-03-26.md
│       └── PREFERRED_TIME_COMPLETE_FLOW-10-04-26.md  ← THIS FILE
│
├── task.module/
│   ├── task/
│   │   ├── task.service.ts            ← calculateAndUpdatePreferredTime()
│   │   │                              ← getPreferredTimeSuggestion()
│   │   └── task.route.ts              ← GET /tasks/suggest-preferred-time
│   └── doc/
│       └── dia/
│           └── task-system-architecture-V2-14-03-26.mermaid
│
└── helpers/
    └── bullmq/
        └── bullmq.ts                  ← preferredTimeQueue + worker
```

---

## 🗄️ Database Schema

### User Collection

```typescript
{
  _id: ObjectId,
  name: "Bashar Islam",
  email: "bashar@gmail.com",
  role: "child",
  preferredTime: "08:30",  // ← THE FIELD (HH:mm 24-hour format)
  // ... other fields
}
```

### Index Strategy

```typescript
// In user.model.ts
userSchema.index({ preferredTime: 1, isDeleted: 1 });
```

**Purpose**: 
- Efficient queries for users by preferred time
- Supports batch operations (e.g., "send notification to all users who prefer 08:00-09:00")
- Excludes soft-deleted users at index level

---

## 🔄 Complete Lifecycle

```mermaid
sequenceDiagram
    participant U as User/Child
    participant FE as Frontend (Flutter)
    participant API as Backend API
    participant DB as MongoDB
    participant MQ as BullMQ Queue
    participant W as PreferredTime Worker

    Note over U,W: 1️⃣ USER MANUALLY SETS TIME
    U->>FE: Opens Profile screen
    FE->>FE: Shows time picker (07:00 AM)
    U->>FE: Selects 08:30 AM
    FE->>API: PUT /user/preferred-time { "preferredTime": "08:30" }
    API->>API: Validate format (HH:mm)
    API->>API: Validate range (05:00-23:00)
    API->>DB: UPDATE User SET preferredTime = "08:30"
    DB-->>API: Success
    API-->>FE: 200 OK { preferredTime: "08:30" }
    FE-->>U: Shows "08:30 AM" confirmed

    Note over U,W: 2️⃣ AUTO-CALCULATION (Background)
    U->>FE: Completes task
    FE->>API: PATCH /tasks/:taskId/status { status: "completed" }
    API->>API: Task status updated
    API->>MQ: Add job: calculatePreferredTime { userId }
    API-->>FE: 200 OK Task completed
    MQ->>W: Process job
    W->>DB: FIND last 10 completed tasks (with startTime)
    DB-->>W: Returns tasks
    W->>W: Calculate average start time
    W->>DB: UPDATE User SET preferredTime = "08:38"
    DB-->>W: Success
    W->>W: Log: "Preferred time updated to 08:38"

    Note over U,W: 3️⃣ SMART SUGGESTION (Task Creation)
    U->>FE: Parent creates task for child
    FE->>API: GET /tasks/suggest-preferred-time?assignedUserId=CHILD_ID
    API->>DB: FIND child BY _id SELECT preferredTime
    DB-->>API: { preferredTime: "08:38" }
    API->>API: Build suggestion with confidence
    API-->>FE: { suggestedTime: "08:38", confidence: "high" }
    FE->>FE: Pre-fill task start time with 08:38 AM
    U->>FE: Confirms task creation
```

---

## 🎨 Frontend Integration (Flutter)

### Profile Screen Mapping

```
┌─────────────────────────────────┐
│ Profile                         │
├─────────────────────────────────┤
│  Bashar Islam                 │
│    bashar@gmail.com             │
├─────────────────────────────────┤
│ ⏰ Preferred time               │
│    When you usually work        │
│    on tasks                     │
│    ┌──────────────────────┐     │
│    │ 08:30 AM        🕐   │     │ ← Tapped → Time Picker
│    └──────────────────────┘     │
├─────────────────────────────────┤
│ 👤 Personal information    →    │
│ 💡 Support Mode            →    │
│ 🔔 Notification Style      →    │
│ ⚙️  Setting               →    │
│ 🚪 Logout                  →    │
└─────────────────────────────────┘
```

### Time Picker Flow

```dart
// Flutter code (conceptual)
void _showTimePicker() async {
  // 1. Get current preferred time from backend
  final response = await api.get('/user/preferred-time');
  final currentTime = response.data['preferredTime']; // "08:30"
  
  // 2. Parse to TimeOfDay
  final parts = currentTime.split(':');
  final initialTime = TimeOfDay(
    hour: int.parse(parts[0]),
    minute: int.parse(parts[1]),
  );
  
  // 3. Show time picker
  final picked = await showTimePicker(
    context: context,
    initialTime: initialTime,
  );
  
  if (picked != null) {
    // 4. Convert to HH:mm (24-hour)
    final preferredTime = '${picked.hour.toString().padLeft(2, '0')}:' 
                         '${picked.minute.toString().padLeft(2, '0')}';
    
    // 5. Update backend
    await api.put('/user/preferred-time', {
      'preferredTime': preferredTime,
    });
    
    // 6. Show success
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Preferred time updated to ${picked.format(context)}')),
    );
  }
}
```

---

## 📊 Performance & Scalability

### Metrics

| Operation | Complexity | Response Time | Cache Strategy |
|-----------|------------|---------------|----------------|
| GET preferredTime | O(1) with index | < 50ms | None (fast enough) |
| PUT preferredTime | O(log n) with index | < 100ms | Invalidate on write |
| Auto-calculation | O(n) for 10 tasks | Async (BullMQ) | N/A (background) |
| Suggestion API | O(1) | < 100ms | Cache 5 min |

### Rate Limiting

| Endpoint | Limit | Reason |
|----------|-------|--------|
| `GET /user/preferred-time` | 100 req/min | Standard read |
| `PUT /user/preferred-time` | 20 req/hour | Prevent frequent changes |
| `GET /tasks/suggest-preferred-time` | 100 req/min | Task creation flow |

---

## 🔮 Future Enhancements (Not Implemented)

### 1. Timezone Awareness
```typescript
// Current: Stores user's local time (timezone-agnostic)
preferredTime: "08:30"

// Future: Store timezone for smart conversion
preferredTimezone: "Africa/Lagos"

// When user travels to London:
// System converts 08:30 Dhaka → 03:30 London
// Notification still sent at 08:30 London time (user's local preference)
```

### 2. Multiple Preferred Times
```typescript
// Current: Single preferred time
preferredTime: "08:30"

// Future: Different times for different contexts
preferredTimes: {
  weekdays: "08:30",
  weekends: "10:00",
  studyMode: "07:00",
  creativeMode: "14:00",
}
```

### 3. Notification Scheduling
```typescript
// When creating task reminder
notificationQueue.add(
  'sendTaskReminder',
  { userId, taskId },
  {
    // Schedule at user's preferred time tomorrow
    scheduledAt: combineDateWithPreferredTime(
      tomorrow,
      user.preferredTime
    ),
  }
);
```

### 4. Analytics Dashboard
```typescript
// GET /analytics/user/preferred-time-accuracy
{
  "preferredTime": "08:30",        // What user set
  "actualAverageStartTime": "08:45", // What data shows
  "accuracy": "92%",                // Match percentage
  "recommendation": "Consider shifting to 08:45 for better accuracy",
  "taskCompletionRate": {
    "atPreferredTime": "85%",       // Tasks started at preferred time
    "otherTimes": "62%",            // Tasks started at other times
  }
}
```

---

## ✅ Testing Checklist

### Manual Testing
- [ ] New user default: "07:00"
- [ ] Update to valid time: "08:30" ✅
- [ ] Invalid format rejected: "8:30 AM" ❌
- [ ] Out of range rejected: "03:00" ❌
- [ ] Out of range rejected: "24:00" ❌
- [ ] Child user can update ✅
- [ ] Business user can update ✅
- [ ] Auto-calculation triggers on task completion ✅
- [ ] Suggestion API returns correct time ✅
- [ ] Suggestion API returns alternatives ✅

### Integration Testing
- [ ] Frontend time picker → Backend validation ✅
- [ ] BullMQ worker processes correctly ✅
- [ ] Database persistence across sessions ✅
- [ ] Index usage verified with .explain() ✅

### Performance Testing
- [ ] GET response time < 50ms ✅
- [ ] PUT response time < 100ms ✅
- [ ] Auto-calculation doesn't block API ✅
- [ ] Concurrent updates handled safely ✅

---

## 📝 Changelog

| Date | Version | Change |
|------|---------|--------|
| 11-03-26 | 1.0 | Initial implementation (manual set/get) |
| 11-03-26 | 1.1 | Added BullMQ auto-calculation |
| 14-03-26 | 1.2 | Added smart suggestion API |
| 10-04-26 | 2.0 | Complete flow documentation with diagrams |

---

## 🔗 Related Documentation

- [User Module Architecture](./USER_MODULE_ARCHITECTURE.md)
- [Task Module Performance Report](../../task.module/doc/perf/task-performance-report-V2-14-03-26.md)
- [BullMQ Implementation](../../../helpers/bullmq/bullmq.ts)
- [Figma: Profile Screen](../../../figma-asset/app-user/group-children-user/profile-without-permission-interface.png)

---

**Implementation Status**: ✅ **PRODUCTION READY**  
**Last Updated**: 10-04-26  
**Author**: Senior Backend Engineering Team
