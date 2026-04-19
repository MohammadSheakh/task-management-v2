# Migration Guide: enqueueWebNotification → createNotification

**Date:** 30-03-26  
**Version:** 1.0  
**Status:** ✅ Complete

---

## Overview

This document describes the migration from the legacy `enqueueWebNotification` function to the new scalable `createNotification` method from `notification.module`.

---

## Why Migrate?

| Feature | `enqueueWebNotification` (Old) | `notification.module` (New) |
|---------|-------------------------------|----------------------------|
| **Architecture** | Simple function | Full module with service layer |
| **Caching** | ❌ No Redis caching | ✅ Redis cache-aside pattern |
| **Pagination** | ❌ Not supported | ✅ Aggregation pagination |
| **Multi-channel** | ❌ Limited | ✅ In-app, Email, Push, SMS |
| **Scheduling** | ❌ No | ✅ BullMQ scheduled jobs |
| **Bulk Operations** | ❌ No | ✅ Bulk notification support |
| **Activity Feed** | ❌ No | ✅ Live activity feed for dashboards |
| **Read/Unread** | ❌ Manual | ✅ Built-in with caching |
| **Performance** | Basic queue | Optimized for 100K+ users |

---

## API Comparison

### Old: enqueueWebNotification

```typescript
import { enqueueWebNotification } from '../../../services/notification.service';

await enqueueWebNotification(
  title: string,
  senderId: string,
  receiverId: string,
  receiverRole: string | null,
  type: TNotificationType,
  idOfType: Types.ObjectId,
  linkFor: string | null,
  linkId: string | null
);
```

### New: createNotification

```typescript
import { NotificationService } from '../../modules/notification.module/notification/notification.service';

const notificationService = new NotificationService();

await notificationService.createNotification(
  {
    receiverId: new Types.ObjectId(userId),
    senderId: new Types.ObjectId(senderId), // optional
    receiverRole: 'admin', // optional, for role-based broadcast
    title: 'Notification Title',
    subTitle: 'Optional subtitle',
    type: 'payment' | 'task' | 'assignment' | 'reminder' | 'system',
    priority: 'normal' | 'high' | 'urgent', // optional
    channels: ['in_app'], // ['in_app', 'email', 'push', 'sms']
    linkFor: 'task', // optional
    linkId: new Types.ObjectId(taskId), // optional
    referenceFor: 'task', // optional
    referenceId: new Types.ObjectId(taskId), // optional
    data: { // optional, for custom metadata
      taskId,
      activityType: 'task_completed',
    }
  },
  scheduledFor // optional Date for scheduled delivery
);
```

---

## Migration Examples

### Example 1: Admin Notification (Subscription Cancel)

**Before:**
```typescript
await enqueueWebNotification(
  `A User ${user.userId} ${user.subscriptionPlan} Cancel his subscription`,
  user.userId,
  null,
  TRole.admin,
  TNotificationType.payment,
  null,
  null,
  null
);
```

**After:**
```typescript
import { NotificationService } from '../../modules/notification.module/notification/notification.service';
import { NotificationPriority, NotificationChannel, NotificationType } from '../../modules/notification.module/notification/notification.constant';

const notificationService = new NotificationService();

await notificationService.createNotification({
  senderId: new Types.ObjectId(user.userId),
  receiverRole: 'admin',
  title: 'Subscription Cancelled',
  subTitle: `User ${user.email} cancelled their subscription`,
  type: NotificationType.PAYMENT,
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP],
  linkFor: 'subscription',
  linkId: userSubscription._id,
  referenceFor: 'subscription',
  referenceId: userSubscription._id,
  data: {
    userId: user.userId,
    userEmail: user.email,
    subscriptionId: userSubscription._id,
  }
});
```

---

### Example 2: User Notification (Payment Success)

**Before:**
```typescript
await enqueueWebNotification(
  `Your Individual subscription has been activated successfully!`,
  user._id,
  user._id,
  TRole.user,
  TNotificationType.payment,
  null,
  newUserSubscription._id
);
```

**After:**
```typescript
await notificationService.createNotification({
  receiverId: new Types.ObjectId(user._id),
  senderId: new Types.ObjectId(user._id),
  title: 'Subscription Activated',
  subTitle: 'Your Individual subscription has been activated successfully!',
  type: NotificationType.PAYMENT,
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
  linkFor: 'subscription',
  linkId: new Types.ObjectId(newUserSubscription._id),
  referenceFor: 'subscription',
  referenceId: new Types.ObjectId(newUserSubscription._id),
  data: {
    subscriptionId: newUserSubscription._id,
    eventType: 'initial_purchase',
  }
});
```

---

### Example 3: Test Notification (Admin)

**Before:**
```typescript
await enqueueWebNotification(
  `Test notification send to admin from user id : ${id}`,
  id,
  null,
  TRole.admin,
  TNotificationType.payment,
  null,
  null,
  null
);
```

**After:**
```typescript
await notificationService.createNotification({
  senderId: new Types.ObjectId(id),
  receiverRole: 'admin',
  title: 'Test Notification',
  subTitle: `Test notification from user ${id}`,
  type: NotificationType.SYSTEM,
  priority: NotificationPriority.NORMAL,
  channels: [NotificationChannel.IN_APP],
});
```

---

## Migration Checklist

For each file using `enqueueWebNotification`:

- [ ] Import `NotificationService` from notification.module
- [ ] Import notification constants (NotificationType, NotificationPriority, NotificationChannel)
- [ ] Create service instance: `const notificationService = new NotificationService();`
- [ ] Replace `enqueueWebNotification()` call with `notificationService.createNotification()`
- [ ] Map old parameters to new notification object structure
- [ ] Add proper `receiverId` or `receiverRole` (not both)
- [ ] Use proper enum values instead of raw strings
- [ ] Add `channels` array for delivery methods
- [ ] Add `data` object for custom metadata
- [ ] Comment out old `enqueueWebNotification` import and call
- [ ] Test notification delivery

---

## Files Migrated

| File | Status | Notifications |
|------|--------|---------------|
| `src/modules/auth/auth.service.ts` | ✅ Complete | Registration notifications |
| `src/modules/user.module/user/user.controller.ts` | ✅ Complete | Test notification |
| `src/modules/subscription.module/subscriptionPlan/subscriptionPlan.controller.ts` | ✅ Complete | Subscription cancel |
| `src/modules/payment.module/revenueCatWebhook/handlers/handleInitialPurchase.ts` | ✅ Complete | Purchase success |
| `src/modules/payment.module/revenueCatWebhook/handlers/handleExpiration.ts` | ✅ Complete | Expiration warning |
| `src/modules/payment.module/revenueCatWebhook/handlers/handleRenewal.ts` | ✅ Complete | Renewal confirmation |
| `src/modules/payment.module/revenueCatWebhook/handlers/handleCancellation.ts` | ✅ Complete | Cancel to user + admin |
| `src/modules/payment.module/revenueCatWebhook/handlers/handleRefund.ts` | ✅ Complete | Refund to user + admin |
| `src/modules/payment.module/revenueCatWebhook/handlers/handleBillingIssue.ts` | ✅ Complete | Billing issue alert |

---

## Benefits Achieved

### 1. **Redis Caching**
- Unread counts cached (5 min TTL)
- Recent notifications cached (10 min TTL)
- Activity feed cached (30 sec TTL)

### 2. **BullMQ Integration**
- All notifications queued asynchronously
- Retry logic with exponential backoff
- Job progress tracking

### 3. **Multi-Channel Delivery**
- In-app notifications (default)
- Email notifications
- Push notifications (FCM)
- SMS notifications (future)

### 4. **Advanced Features**
- Scheduled notifications (reminders)
- Bulk notifications (up to 1000 users)
- Activity feed for parent/teacher dashboards
- Read/unread tracking with caching

### 5. **Performance**
- Designed for 100K+ concurrent users
- Optimized MongoDB queries with `.lean()`
- Compound indexes on notification collection
- Connection pooling configured

---

## Backward Compatibility

The old `enqueueWebNotification` function remains in `src/services/notification.service.ts` for backward compatibility but is **deprecated**.

```typescript
// ❌ Deprecated - DO NOT USE
import { enqueueWebNotification } from '../../../services/notification.service';

// ✅ Use this instead
import { NotificationService } from '../../modules/notification.module/notification/notification.service';
```

---

## Testing

After migration, verify:

1. **Unit Tests**
   - Notification creation works
   - Cache invalidation works
   - BullMQ jobs are queued

2. **Integration Tests**
   - End-to-end notification flow
   - Multi-channel delivery
   - Scheduled notifications

3. **Performance Tests**
   - Response time < 200ms for notification creation
   - Cache hit rate > 80%
   - Queue depth monitoring

---

## Rollback Plan

If issues occur:

1. Revert individual file changes
2. Keep using `enqueueWebNotification` temporarily
3. Debug notification.module issues separately
4. Re-apply migration after fixes

---

## Support

For questions or issues:
- Check `LEARN_NOTIFICATION_00_MASTER_GUIDE.md`
- Review `HOW_TO_USE_FROM_ANY_MODULE.md`
- See notification.module/doc/README-V4-30-03-26.md

---

**Migration Completed:** 30-03-26  
**Next Review:** 30-04-26
