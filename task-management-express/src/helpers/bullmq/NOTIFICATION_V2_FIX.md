# Notification V2 Worker - Fix Documentation

## 📅 Date: 08-04-26

---

## 🎯 Problem Statement

### ❌ The Issue: Double Notification Creation

**OLD FLOW (V1 - BROKEN):**
```
1. Controller calls: notificationService.createNotification(data)
   ↓
2. notification.service.ts: Creates notification in DB
   ↓
3. notification.service.ts: Queues job with FULL payload
   ↓
4. V1 Worker (bullmq.ts): Receives job
   ↓
5. V1 Worker: Creates ANOTHER notification in DB ❌ DUPLICATE!
   ↓
6. V1 Worker: Sends socket notification
```

**RESULT:** Users receive **TWO** notifications for every single event!

---

## ✅ The Solution: V2 Worker

### NEW FLOW (V2 - FIXED):
```
1. Controller calls: notificationService.createNotification(data)
   ↓
2. notification.service.ts: Creates notification in DB (ONCE ✅)
   ↓
3. notification.service.ts: Queues job with ONLY notificationId
   ↓
4. V2 Worker (notificationWorkerV2.ts): Receives job
   ↓
5. V2 Worker: Fetches EXISTING notification from DB ✅
   ↓
6. V2 Worker: Delivers via socket/email/push
   ↓
7. V2 Worker: Updates deliveredAt status
```

**RESULT:** Users receive **ONE** notification, delivered through proper channels!

---

## 📁 Files Changed

### 1. **NEW FILE**: `src/helpers/bullmq/notificationWorkerV2.ts`
   - V2 notification worker with proper architecture
   - Only processes EXISTING notifications (no creation)
   - Fetches from DB → Delivers → Updates status

### 2. **MODIFIED**: `src/modules/notification.module/notification/notification.service.ts`
   - Changed import: `notificationQueue` → `notificationQueueV2`
   - Updated `queueNotification()` method to only pass `notificationId`
   - Added V2 documentation comments

### 3. **MODIFIED**: `src/helpers/bullmq/bullmq.ts`
   - Marked V1 queue and worker as DEPRECATED
   - Added detailed comments explaining the issue
   - Kept for reference (DO NOT DELETE - breaks historical context)

### 4. **MODIFIED**: `src/serverV2.ts`
   - Changed import: `startNotificationWorker` → `startNotificationWorkerV2`
   - Updated worker initialization

### 5. **MODIFIED**: `src/server.ts`
   - Changed import: `startNotificationWorker` → `startNotificationWorkerV2`
   - Updated worker initialization

---

## 🔧 Technical Details

### V2 Queue Configuration

```typescript
export const notificationQueueV2 = new Queue("notificationQueue-v2", {
  connection: redisPubClient.options,
  defaultJobOptions: {
    attempts: 3,
    backoff: { 
      type: 'exponential', 
      delay: 2000 
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});
```

### Job Data Structure (V2)

```typescript
interface INotificationJobDataV2 {
  notificationId: string;  // ONLY pass ID, not full payload
}
```

### Worker Processing Steps

1. **Fetch**: Get notification from DB by ID
2. **Validate**: Check if exists and not already delivered
3. **Build**: Create delivery payload with populated fields
4. **Deliver**: Send via appropriate channel (socket, email, push)
5. **Update**: Set `deliveredAt` timestamp and status

---

## 📊 Performance Impact

### Before (V1 - Broken):
- **DB Writes**: 2 per notification (create + worker create)
- **User Experience**: Sees duplicate notifications
- **Memory**: Unnecessary payload duplication in queue

### After (V2 - Fixed):
- **DB Writes**: 1 per notification (create only)
- **User Experience**: Single, clean notification
- **Memory**: Minimal (only ID in queue)
- **Cache Efficiency**: Better (single source of truth)

---

## 🧪 Testing Checklist

- [ ] Create notification → Verify only 1 entry in DB
- [ ] Check queue job contains only `notificationId`
- [ ] V2 worker fetches notification correctly
- [ ] Socket delivery works for online users
- [ ] Offline users have notification stored (no duplicate)
- [ ] `deliveredAt` timestamp is set correctly
- [ ] Scheduled notifications work (delayed jobs)
- [ ] Bulk notifications don't create duplicates
- [ ] Error handling works (failed jobs retry)

---

## 🚀 Migration Steps

### For Development:
1. ✅ Files already updated
2. Restart server → V2 worker will be active
3. Monitor logs for `[V2 Worker]` prefix

### For Production:
1. Deploy updated code
2. Monitor queue depth during transition
3. Old queue may have pending V1 jobs - let them complete or clear
4. Verify no duplicates in production notifications

### Rollback Plan:
If issues arise, revert to V1:
```typescript
// In server.ts/serverV2.ts:
import { startNotificationWorker } from './helpers/bullmq/bullmq';
// Change back to:
startNotificationWorker();
```

---

## 📝 Code Examples

### Creating a Notification (UNCHANGED - service handles queuing)

```typescript
// Controller or any service
const notification = await notificationService.createNotification({
  receiverId: new Types.ObjectId(userId),
  title: 'New Task Assigned',
  type: 'assignment',
  channels: ['in_app'],
  // ... other fields
});

// ✅ Automatically queued for delivery via V2 worker
// No manual queue call needed!
```

### Queue Job Payload (V2 - Minimal)

```typescript
// What gets queued:
{
  notificationId: "abc123xyz"  // ONLY the ID
}

// NOT the full payload (V1 mistake):
{
  notificationId: "abc123xyz",
  receiverId: "user123",
  title: "...",  // ❌ All this data already in DB!
  // ...
}
```

---

## 🔍 How to Verify Fix

### Check Logs:
```
✅ CORRECT (V2):
📧 Notification queued for delivery: 67890abc
🔄 [V2 Worker] Processing notification job 123 for notification 67890abc
✅ [V2 Worker] Notification 67890abc delivered successfully

❌ WRONG (V1 - Should not appear):
⚠️ [V1 DEPRECATED] Processing notification job
⚠️ [V1 DUPLICATE] Notification created for
```

### Check Database:
```javascript
// Count notifications for a user in last hour
db.notifications.find({
  receiverId: ObjectId("userId"),
  createdAt: { $gte: new Date(Date.now() - 3600000) }
}).count()

// Should match expected count, NOT double
```

### Check Queue:
```javascript
// Redis CLI
LLEN bull:notificationQueue-v2
LLEN bull:notificationQueue-v2:completed
LLEN bull:notificationQueue-v2:failed
```

---

## 🎓 Lessons Learned

### What Went Wrong in V1:
1. **Lack of separation of concerns**: Worker doing DB creation + delivery
2. **No single source of truth**: Notification created in two places
3. **Payload duplication**: Full data passed through queue unnecessarily

### V2 Design Principles:
1. **Single Responsibility**: 
   - Service creates notification
   - Worker delivers notification
2. **Minimal Queue Payload**: Only pass what's needed (ID)
3. **DB as Source of Truth**: Worker fetches from DB, doesn't recreate

---

## 📚 Related Files

- **Worker**: `src/helpers/bullmq/notificationWorkerV2.ts`
- **Service**: `src/modules/notification.module/notification/notification.service.ts`
- **Model**: `src/modules/notification.module/notification/notification.model.ts`
- **Interface**: `src/modules/notification.module/notification/notification.interface.ts`
- **Constants**: `src/modules/notification.module/notification/notification.constant.ts`

---

## 🔄 Future Improvements

1. **Email Integration**: Complete email delivery channel
2. **Push Notifications**: Add FCM/APNS support
3. **SMS Delivery**: Integrate SMS provider for urgent notifications
4. **Retry Logic**: Better handling of failed deliveries
5. **Analytics**: Track delivery success rates per channel
6. **Rate Limiting**: Prevent notification spam per user

---

## ✅ Status

- [x] V2 Worker created
- [x] Service updated to use V2 queue
- [x] Server files updated
- [x] V1 marked as deprecated
- [x] Documentation complete
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Old queue cleanup

---

**Last Updated**: 08-04-26
**Version**: 2.0
**Status**: ✅ Ready for Testing
