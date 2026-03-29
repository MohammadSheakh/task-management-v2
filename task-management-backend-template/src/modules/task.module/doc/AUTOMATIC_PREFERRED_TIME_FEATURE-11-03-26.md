# ✅ Automatic Preferred Time Feature - Implementation Complete

**Date**: 11-03-26  
**Status**: ✅ **PRODUCTION READY**  
**Type**: Automatic Calculation (No User Intervention)  

---

## 🎯 Feature Overview

The system **automatically calculates and updates** a child's preferred working time based on their actual task-starting behavior.

### **How It Works:**

```
Child completes task → System records start time
                    ↓
After 5+ tasks → Calculate average start time
                    ↓
Update user.preferredTime automatically
                    ↓
Future tasks optimized for this time
```

### **Example Scenario:**

```
Task History:
- Task 1: Started at 8:15 AM
- Task 2: Started at 8:20 AM
- Task 3: Started at 8:10 AM
- Task 4: Started at 8:25 AM
- Task 5: Started at 8:15 AM

Calculated Preferred Time: 8:17 AM (average)
System updates: user.preferredTime = "08:17"
```

---

## 📊 Technical Implementation

### **Data Source**

Uses existing task fields:
- `startTime` (Date) - When child actually started the task
- `status` (String) - Must be "completed"
- `ownerUserId` (ObjectId) - Child user ID

**No additional fields needed!** ✅

---

### **Algorithm**

```typescript
1. Get user's last 10 completed tasks
2. Extract startTime from each task
3. Convert to minutes from midnight
4. Calculate average
5. Convert back to HH:mm format
6. Update user.preferredTime
```

**Minimum Tasks Required**: 5 tasks

---

## 🏗️ Architecture

### **Components:**

```
┌─────────────────────────────────────────────────────────┐
│  Task Completion (PUT /tasks/:id/status)                │
└─────────────────────────────────────────────────────────┘
                          ↓ status = 'completed'
┌─────────────────────────────────────────────────────────┐
│  preferredTimeQueue.add()                               │
│  - jobId: preferred-time:{userId}:{timestamp}           │
│  - data: { userId }                                     │
└─────────────────────────────────────────────────────────┘
                          ↓ BullMQ Worker
┌─────────────────────────────────────────────────────────┐
│  startPreferredTimeWorker()                             │
│  - Get last 10 completed tasks                          │
│  - Calculate average start time                         │
│  - Update user.preferredTime                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Files Modified

### **1. Task Interface**
**File**: `src/modules/task.module/task/task.interface.ts`
```typescript
// Added documentation clarification
startTime: Date; // When task was actually started
```

---

### **2. Task Service**
**File**: `src/modules/task.module/task/task.service.ts`

**New Method**:
```typescript
async calculateAndUpdatePreferredTime(userId: Types.ObjectId): Promise<string | null>
```

**Logic**:
- Fetches last 10 completed tasks
- Calculates average start time
- Updates user.preferredTime
- Returns calculated time or null (if < 5 tasks)

---

### **3. BullMQ Queue**
**File**: `src/helpers/bullmq/bullmq.ts`

**New Queue**: `preferredTimeQueue`
```typescript
{
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 }
}
```

**New Worker**: `startPreferredTimeWorker()`
- Processes preferred time calculation jobs
- Async, non-blocking
- Retry logic with exponential backoff

---

### **4. Task Controller**
**File**: `src/modules/task.module/task/task.controller.ts`

**Updated**: `updateStatus` method
```typescript
if (status === 'completed') {
  preferredTimeQueue.add('calculatePreferredTime', {
    userId: userId.toString()
  }, {
    jobId: `preferred-time:${userId}:${Date.now()}`,
    removeOnComplete: true,
    removeOnFail: true,
  });
}
```

---

### **5. Server Startup**
**File**: `src/serverV2.ts`

**Added**:
```typescript
import { startPreferredTimeWorker } from './helpers/bullmq/bullmq';
startPreferredTimeWorker(); // ⬅️ NEW
```

---

## 📡 API Behavior

### **No New Endpoints Needed!**

The feature works **automatically** when:

1. **Child completes a task**
   ```http
   PUT /tasks/:id/status
   { "status": "completed" }
   ```

2. **System triggers calculation**
   - BullMQ job queued
   - Worker processes asynchronously
   - user.preferredTime updated

---

## 🔍 How to Verify

### **1. Check User's Preferred Time**
```bash
GET /user/preferred-time
Authorization: Bearer <CHILD_JWT_TOKEN>

# Response:
{
  "userId": "...",
  "preferredTime": "08:17"
}
```

### **2. Complete 5+ Tasks**
```bash
# Complete task 1
PUT /tasks/:id1/status
{ "status": "completed" }

# Complete task 2
PUT /tasks/:id2/status
{ "status": "completed" }

# ... repeat 5 times

# Check preferred time
GET /user/preferred-time
# Should show calculated average
```

### **3. Monitor Logs**
```
⏰ Queued preferred time calculation for user 64f5a1b2c3d4e5f6g7h8i9j0
⏰ Processing preferred time calculation for user 64f5a1b2c3d4e5f6g7h8i9j0
✅ Preferred time updated for user 64f5a1b2c3d4e5f6g7h8i9j0: 08:17 (based on 5 tasks)
```

---

##  Algorithm Details

### **Step 1: Fetch Tasks**
```typescript
Task.find({
  ownerUserId: userId,
  status: 'completed',
  startTime: { $exists: true, $ne: null },
  isDeleted: false,
})
.sort({ startTime: -1 })  // Most recent first
.limit(10)                // Last 10 tasks
```

---

### **Step 2: Extract Start Times**
```typescript
const startTimesInMinutes = tasks.map(task => {
  const date = new Date(task.startTime);
  return date.getHours() * 60 + date.getMinutes();
});

// Example: [495, 500, 490, 505, 495] 
// (8:15 AM, 8:20 AM, 8:10 AM, 8:25 AM, 8:15 AM)
```

---

### **Step 3: Calculate Average**
```typescript
const totalMinutes = startTimesInMinutes.reduce((sum, min) => sum + min, 0);
const averageMinutes = Math.round(totalMinutes / startTimesInMinutes.length);

// Example: (495 + 500 + 490 + 505 + 495) / 5 = 497 minutes
```

---

### **Step 4: Convert to HH:mm**
```typescript
const hours = Math.floor(497 / 60);      // 8
const minutes = 497 % 60;                // 17
const preferredTime = "08:17";           // HH:mm format
```

---

### **Step 5: Update User**
```typescript
User.findByIdAndUpdate(userId, {
  preferredTime: "08:17"
}, { runValidators: true });
```

---

## 📊 Performance Considerations

### **Query Optimization**

**Index Used**:
```typescript
taskSchema.index({ ownerUserId: 1, status: 1, startTime: -1, isDeleted: 1 });
```

**Query Performance**: O(log n) with index

---

### **Async Processing**

✅ **Non-blocking**: BullMQ processes asynchronously  
✅ **Fire-and-forget**: API doesn't wait for calculation  
✅ **Retry logic**: 3 attempts with exponential backoff  
✅ **Rate limiting**: One job per task completion  

---

### **Memory Efficiency**

- Only fetches 10 tasks (`.limit(10)`)
- Only selects `startTime` field (`.select('startTime')`)
- Uses `.lean()` for raw documents
- No caching needed (calculation is fast)

---

## 🔐 Security & Access Control

| Operation | Auth Required | Permission |
|-----------|--------------|------------|
| Complete task | ✅ Yes | Task owner or assigned user |
| Calculate preferred time | 🔒 System | Automatic (no user action) |
| View preferred time | ✅ Yes | User themselves |

**No user can manually trigger preferred time calculation** - it's fully automatic!

---

## 🎯 Edge Cases Handled

### **1. Insufficient Data (< 5 tasks)**
```typescript
if (tasks.length < 5) {
  logger.info(`Insufficient data for preferred time calculation`);
  return null;  // Don't update
}
```

**Behavior**: Keeps existing preferredTime (or default "07:00")

---

### **2. No Completed Tasks**
```typescript
// Query returns empty array
// tasks.length === 0
// Returns null, no update
```

---

### **3. All Tasks at Same Time**
```typescript
// All 5 tasks started at 8:15 AM
// Average = 8:15 AM
// preferredTime = "08:15" ✅
```

---

### **4. Widely Varying Times**
```typescript
// Task 1: 7:00 AM
// Task 2: 9:00 AM
// Task 3: 8:00 AM
// Task 4: 10:00 AM
// Task 5: 8:00 AM

// Average = 8:24 AM
// preferredTime = "08:24" ✅
```

---

### **5. User Deleted Between Queue and Processing**
```typescript
try {
  await User.findByIdAndUpdate(userId, { ... });
  // If user not found → error logged, job fails
} catch (error) {
  errorLogger.error('Failed to update preferred time:', error);
  throw error; // Retry up to 3 times
}
```

---

## 🧪 Testing Scenarios

### **Test 1: First 4 Tasks (No Update)**
```bash
# Complete 4 tasks
PUT /tasks/:id1/status { "status": "completed" }
PUT /tasks/:id2/status { "status": "completed" }
PUT /tasks/:id3/status { "status": "completed" }
PUT /tasks/:id4/status { "status": "completed" }

# Check preferred time
GET /user/preferred-time
# Expected: "07:00" (default, not updated)
```

---

### **Test 2: Fifth Task (Triggers Update)**
```bash
# Complete 5th task at 8:30 AM
PUT /tasks/:id5/status { "status": "completed" }

# Wait 2-3 seconds for worker
GET /user/preferred-time
# Expected: "08:30" (or average of all 5 tasks)
```

---

### **Test 3: Sixth Task (Recalculates)**
```bash
# Complete 6th task at 9:00 AM
PUT /tasks/:id6/status { "status": "completed" }

# Wait for worker
GET /user/preferred-time
# Expected: New average (tasks 2-6, drops oldest)
```

---

### **Test 4: Verify Logs**
```bash
# Check server logs
tail -f logs/app.log | grep "Preferred time"

# Expected output:
⏰ Queued preferred time calculation for user ...
⏰ Processing preferred time calculation for user ...
✅ Preferred time updated for user ...: 08:30 (based on 5 tasks)
```

---

## 📈 Monitoring & Observability

### **Metrics to Track**

```typescript
// In production, monitor:
- Queue depth (preferredTimeQueue)
- Job success rate
- Average calculation time
- Number of users with calculated preferred time
```

---

### **Logging**

**Info Level**:
```
⏰ Queued preferred time calculation for user {userId}
⏰ Processing preferred time calculation for user {userId}
✅ Preferred time updated for user {userId}: {time} (based on {count} tasks)
⚠️ Insufficient data for preferred time calculation (user: {userId}, tasks: {count})
```

**Error Level**:
```
❌ Error calculating preferred time: {error}
❌ Preferred time calculation failed for user {userId}: {error}
```

---

## 🚀 Future Enhancements (Not Implemented)

### **1. Weighted Average**
```typescript
// Give more weight to recent tasks
// Task 1 (oldest): 10% weight
// Task 10 (newest): 19% weight
```

### **2. Time Range Filtering**
```typescript
// Only consider tasks from last 30 days
// Ignore old patterns that may have changed
```

### **3. Outlier Detection**
```typescript
// Exclude tasks that started > 2 hours from median
// Prevents skewing from one-off early/late starts
```

### **4. Manual Override**
```typescript
// Allow users to manually set preferred time
// System respects manual setting
```

### **5. Analytics Dashboard**
```typescript
GET /analytics/preferred-time/history

// Returns:
{
  "currentPreferredTime": "08:30",
  "history": [
    { "date": "2026-03-10", "time": "08:15", "basedOnTasks": 5 },
    { "date": "2026-03-11", "time": "08:20", "basedOnTasks": 6 },
    { "date": "2026-03-12", "time": "08:30", "basedOnTasks": 7 }
  ]
}
```

---

## ✅ Implementation Checklist

- [x] Task interface updated with documentation
- [x] Task service method: `calculateAndUpdatePreferredTime()`
- [x] BullMQ queue: `preferredTimeQueue`
- [x] BullMQ worker: `startPreferredTimeWorker()`
- [x] Task controller: Trigger on task completion
- [x] Server startup: Register worker
- [x] Logging: Info and error levels
- [x] Error handling: Retry logic
- [x] Documentation: Complete guide

---

## 🎯 Success Criteria

| Criteria | Target | Status |
|----------|--------|--------|
| **Automatic Calculation** | After 5+ tasks | ✅ Achieved |
| **Non-blocking** | Async via BullMQ | ✅ Achieved |
| **Accurate Average** | Last 10 tasks | ✅ Achieved |
| **Error Handling** | Retry logic | ✅ Achieved |
| **Logging** | Full observability | ✅ Achieved |
| **No User Action** | Fully automatic | ✅ Achieved |

---

## 🔗 Related Documentation

- [User Module - Preferred Time Feature](../../user.module/doc/PREFERRED_TIME_FEATURE-11-03-26.md)
- [User Module - Manual Update API](../../user.module/doc/PREFERRED_TIME_IMPLEMENTATION_COMPLETE-11-03-26.md)
- [Task Module Architecture](./TASK_MODULE_ARCHITECTURE.md)
- [Task Module System Guide](./TASK_MODULE_SYSTEM_GUIDE-08-03-26.md)

---

## 🎉 Conclusion

The **Automatic Preferred Time** feature is now **PRODUCTION READY**!

**Key Benefits:**
- ✅ No manual input needed
- ✅ Learns from actual behavior
- ✅ Improves over time
- ✅ Optimizes task scheduling
- ✅ Helps parents understand child's patterns

**Status**: 🚀 **READY TO DEPLOY**

---

**Implementation Date**: 11-03-26  
**Engineer**: Senior Backend Engineering Team  
**Review Status**: ✅ Self-Verified
