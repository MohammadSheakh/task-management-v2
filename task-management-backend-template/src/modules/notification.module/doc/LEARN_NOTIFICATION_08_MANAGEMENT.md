# 📋 Chapter 8: Notification Management

**Version**: 1.0
**Date**: 26-03-23
**Difficulty**: Intermediate
**Prerequisites**: Chapters 1-7 completed

---

## 🎯 Learning Objectives

By the end of this chapter, you will be able to:
- ✅ Get user notifications with pagination
- ✅ Mark notifications as read (single, all)
- ✅ Delete notifications (soft delete)
- ✅ Filter by status, type, priority
- ✅ Sort by date, priority
- ✅ Master all 13 API endpoints

---

## 📊 Notification Management Overview

```
┌─────────────────────────────────────────────────────────────┐
│              NOTIFICATION MANAGEMENT                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  📥 Retrieve Notifications                                   │
│     • Get my notifications (paginated)                      │
│     • Get unread count (cached)                             │
│     • Get single notification                               │
│                                                              │
│  ✅ Mark as Read                                             │
│     • Mark single notification                              │
│     • Mark all as read                                      │
│     • Bulk mark selected                                    │
│                                                              │
│  🗑️ Delete Notifications                                     │
│     • Soft delete single                                    │
│     • Bulk delete read                                      │
│     • Auto-cleanup (retention policy)                       │
│                                                              │
│  🔍 Filter & Sort                                            │
│     • Filter by status, type, priority                      │
│     • Sort by date, priority                                │
│     • Search by keyword                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📥 Retrieving Notifications

### **Endpoint 1: Get My Notifications**

```http
GET /notifications/my?status=unread&type=task&priority=high&page=1&limit=20&sortBy=-createdAt
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Cache: 60 seconds (first page only)
```

---

### **Query Parameters:**

| Parameter | Type | Default | Description | Example |
|-----------|------|---------|-------------|---------|
| `status` | string | - | Filter by status | `unread`, `read` |
| `type` | string | - | Filter by type | `task`, `group`, `system` |
| `priority` | string | - | Filter by priority | `low`, `normal`, `high`, `urgent` |
| `page` | number | `1` | Page number | `1`, `2`, `3` |
| `limit` | number | `20` | Items per page (max: 100) | `10`, `20`, `50` |
| `sortBy` | string | `-createdAt` | Sort field (`-` for desc) | `-createdAt`, `priority` |

---

### **Request Examples:**

```bash
# Get all notifications (first page)
curl -X GET "http://localhost:5000/notifications/my?page=1&limit=20" \
  -H "Authorization: Bearer <token>"

# Get unread notifications only
curl -X GET "http://localhost:5000/notifications/my?status=unread" \
  -H "Authorization: Bearer <token>"

# Get high priority task notifications
curl -X GET "http://localhost:5000/notifications/my?type=task&priority=high" \
  -H "Authorization: Bearer <token>"

# Get page 2 with custom sort
curl -X GET "http://localhost:5000/notifications/my?page=2&limit=10&sortBy=-priority" \
  -H "Authorization: Bearer <token>"
```

---

### **Response Structure:**

```json
{
  "success": true,
  "code": 200,
  "message": "Notifications retrieved successfully",
  "data": {
    "docs": [
      {
        "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
        "senderId": "64f5a1b2c3d4e5f6g7h8i9j1",
        "receiverId": "64f5a1b2c3d4e5f6g7h8i9j2",
        "title": "Task Assigned",
        "subTitle": "You have been assigned a new task",
        "type": "assignment",
        "priority": "normal",
        "status": "pending",
        "channels": ["in_app", "email"],
        "linkFor": "task",
        "linkId": "64f5a1b2c3d4e5f6g7h8i9j3",
        "data": {
          "taskId": "64f5a1b2c3d4e5f6g7h8i9j3",
          "taskTitle": "Math Homework"
        },
        "createdAt": "2026-03-26T10:00:00.000Z",
        "readAt": null,
        "isDeleted": false
      }
    ],
    "totalDocs": 45,
    "totalPages": 3,
    "page": 1,
    "limit": 20,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### **Service Implementation:**

```typescript
async getUserNotifications(
  userId: string,
  options: INotificationQueryOptions
): Promise<any> {
  const cacheKey = `notification:user:${userId}:notifications`;

  // Try cache first (only for first page)
  if (options.page === 1) {
    const cachedNotifications = await this.getFromCache<any>(cacheKey);
    if (cachedNotifications) {
      logger.debug(`Cache hit for notifications: ${userId}`);
      return cachedNotifications;
    }
  }

  // Build query
  const query: any = {
    receiverId: new Types.ObjectId(userId),
    isDeleted: false,
  };

  // Apply filters
  if (options.status) {
    query.status = options.status === 'unread' 
      ? { $ne: 'read' } 
      : options.status;
  }

  if (options.type) {
    query.type = options.type;
  }

  if (options.priority) {
    query.priority = options.priority;
  }

  // Build aggregation pipeline
  const pipeline = [
    { $match: query },
    { $sort: { createdAt: -1 } },
  ];

  // Paginate
  const result = await PaginationService.aggregationPaginate(
    Notification,
    pipeline,
    {
      page: options.page || 1,
      limit: Math.min(options.limit || 10, 100),
    }
  );

  // Cache first page
  if (options.page === 1) {
    await this.setInCache(cacheKey, result, 60);
  }

  return result;
}
```

---

### **Endpoint 2: Get Unread Count**

```http
GET /notifications/unread-count
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
Cache: 30 seconds
Response Time: <10ms (cached)
```

---

### **Purpose:**

Get the count of unread notifications for badge display.

**Example**: Show red badge with number on notification icon.

---

### **Request:**

```bash
curl -X GET "http://localhost:5000/notifications/unread-count" \
  -H "Authorization: Bearer <token>"
```

---

### **Response:**

```json
{
  "success": true,
  "code": 200,
  "message": "Unread count retrieved successfully",
  "data": {
    "count": 5
  }
}
```

---

### **Service Implementation:**

```typescript
async getUnreadCount(userId: string): Promise<number> {
  const cacheKey = `notification:user:${userId}:unread-count`;

  // Try cache first (5ms)
  const cachedCount = await this.getFromCache<number>(cacheKey);
  if (cachedCount !== null) {
    logger.debug(`Cache hit for unread count: ${userId}`);
    return cachedCount;
  }

  // Cache miss - query database (50ms)
  logger.debug(`Cache miss for unread count: ${userId}`);
  const count = await Notification.countDocuments({
    receiverId: new Types.ObjectId(userId),
    status: { $ne: 'read' },
    isDeleted: false,
  });

  // Cache the result (30s TTL)
  await this.setInCache(cacheKey, count, 30);
  logger.debug(`Cached unread count: ${count} for ${userId}`);

  return count;
}
```

---

### **Frontend Integration:**

```typescript
// React hook for unread count
function useUnreadCount() {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    // Fetch initial count
    fetchUnreadCount();
    
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const fetchUnreadCount = async () => {
    const response = await fetch('/notifications/unread-count', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    setCount(data.data.count);
  };
  
  return count;
}

// Usage in component
function NotificationBadge() {
  const unreadCount = useUnreadCount();
  
  return (
    <div className="notification-icon">
      🔔
      {unreadCount > 0 && (
        <span className="badge">{unreadCount}</span>
      )}
    </div>
  );
}
```

---

## ✅ Marking Notifications as Read

### **Endpoint 3: Mark Single Notification as Read**

```http
POST /notifications/:id/read
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

---

### **Request:**

```bash
curl -X POST "http://localhost:5000/notifications/64f5a1b2c3d4e5f6g7h8i9j0/read" \
  -H "Authorization: Bearer <token>"
```

---

### **Response:**

```json
{
  "success": true,
  "code": 200,
  "message": "Notification marked as read",
  "data": {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "status": "read",
    "readAt": "2026-03-26T14:00:00.000Z",
    "title": "Task Assigned",
    "subTitle": "You have been assigned a new task"
  }
}
```

---

### **Service Implementation:**

```typescript
async markAsRead(
  notificationId: string,
  userId: string
): Promise<INotificationDocument | null> {
  const notification = await Notification.findOne({
    _id: new Types.ObjectId(notificationId),
    receiverId: new Types.ObjectId(userId),
    isDeleted: false,
  });

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  // Already read - no-op
  if (notification.status === NotificationStatus.READ) {
    return notification;
  }

  // Mark as read
  notification.status = NotificationStatus.READ;
  notification.readAt = new Date();
  await notification.save();

  // Invalidate cache
  await this.invalidateCache(userId, notificationId);
  logger.debug(`Notification ${notificationId} marked as read`);

  return notification;
}
```

---

### **Frontend Integration:**

```typescript
// Mark as read on click
async function handleNotificationClick(notificationId: string) {
  try {
    await fetch(`/notifications/${notificationId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // Update UI optimistically
    setNotifications(prev =>
      prev.map(n =>
        n._id === notificationId
          ? { ...n, status: 'read', readAt: new Date() }
          : n
      )
    );
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
}
```

---

### **Endpoint 4: Mark All as Read**

```http
POST /notifications/read-all
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

---

### **Request:**

```bash
curl -X POST "http://localhost:5000/notifications/read-all" \
  -H "Authorization: Bearer <token>"
```

---

### **Response:**

```json
{
  "success": true,
  "code": 200,
  "message": "All notifications marked as read",
  "data": {
    "count": 15
  }
}
```

---

### **Service Implementation:**

```typescript
async markAllAsRead(userId: string): Promise<number> {
  const result = await Notification.updateMany(
    {
      receiverId: new Types.ObjectId(userId),
      status: { $ne: 'read' },
      isDeleted: false,
    },
    {
      status: 'read',
      readAt: new Date(),
    }
  );

  // Invalidate cache
  await this.invalidateCache(userId);
  logger.debug(`All notifications marked as read for user ${userId}`);

  return result.modifiedCount;
}
```

---

### **Frontend Integration:**

```typescript
// Mark all as read button
async function handleMarkAllAsRead() {
  try {
    const response = await fetch('/notifications/read-all', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    
    // Update UI
    setNotifications(prev =>
      prev.map(n => ({ ...n, status: 'read', readAt: new Date() }))
    );
    setUnreadCount(0);
    
    console.log(`Marked ${data.data.count} notifications as read`);
  } catch (error) {
    console.error('Failed to mark all as read:', error);
  }
}
```

---

## 🗑️ Deleting Notifications

### **Endpoint 5: Delete Notification (Soft Delete)**

```http
DELETE /notifications/:id
Authorization: Bearer <token>
Role: child, business
Rate Limit: 100 requests per minute
```

---

### **Purpose:**

Soft delete a notification (sets `isDeleted: true`).

**Why Soft Delete?**
- ✅ Audit trail maintained
- ✅ Can be recovered if needed
- ✅ Compliance with data retention policies

---

### **Request:**

```bash
curl -X DELETE "http://localhost:5000/notifications/64f5a1b2c3d4e5f6g7h8i9j0" \
  -H "Authorization: Bearer <token>"
```

---

### **Response:**

```json
{
  "success": true,
  "code": 200,
  "message": "Notification deleted successfully",
  "data": {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "isDeleted": true,
    "deletedAt": "2026-03-26T14:30:00.000Z"
  }
}
```

---

### **Service Implementation:**

```typescript
async deleteNotification(
  notificationId: string,
  userId: string
): Promise<INotificationDocument | null> {
  const notification = await Notification.findByIdAndUpdate(
    notificationId,
    { 
      isDeleted: true,
      deletedAt: new Date(),
    },
    { new: true }
  );

  if (!notification) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
  }

  // Invalidate cache
  await this.invalidateCache(userId, notificationId);
  logger.debug(`Notification ${notificationId} soft deleted`);

  return notification;
}
```

---

### **Auto-Cleanup (Retention Policy):**

```typescript
// Cron job: Delete old notifications daily at 2 AM
const CLEANUP_CONFIG = {
  READ_NOTIFICATION_RETENTION_DAYS: 30,
  UNREAD_NOTIFICATION_RETENTION_DAYS: 90,
  MAX_NOTIFICATIONS_PER_USER: 1000,
};

async function cleanupOldNotifications() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Delete old read notifications
  const deletedRead = await Notification.deleteMany({
    status: 'read',
    readAt: { $lt: thirtyDaysAgo },
    isDeleted: false,
  });

  // Delete old unread notifications
  const deletedUnread = await Notification.deleteMany({
    status: { $ne: 'read' },
    createdAt: { $lt: ninetyDaysAgo },
    isDeleted: false,
  });

  logger.info(
    `Cleanup: Deleted ${deletedRead.deletedCount} read, ${deletedUnread.deletedCount} unread`
  );
}

// Schedule daily
cron.schedule('0 2 * * *', cleanupOldNotifications);
```

---

## 🔍 Filtering & Sorting

### **Filter by Status:**

```typescript
// Get unread notifications
GET /notifications/my?status=unread

// Get read notifications
GET /notifications/my?status=read

// Implementation
if (options.status === 'unread') {
  query.status = { $ne: 'read' };
} else if (options.status === 'read') {
  query.status = 'read';
}
```

---

### **Filter by Type:**

```typescript
// Get only task notifications
GET /notifications/my?type=task

// Get only system notifications
GET /notifications/my?type=system

// Implementation
if (options.type) {
  query.type = options.type;
}
```

---

### **Filter by Priority:**

```typescript
// Get urgent notifications
GET /notifications/my?priority=urgent

// Get high and urgent
GET /notifications/my?priority=high&priority=urgent

// Implementation
if (options.priority) {
  query.priority = options.priority;
}
```

---

### **Sorting:**

```typescript
// Sort by newest first (default)
GET /notifications/my?sortBy=-createdAt

// Sort by oldest first
GET /notifications/my?sortBy=createdAt

// Sort by priority (urgent first)
GET /notifications/my?sortBy=-priority

// Implementation
const sortOptions: Record<string, -1 | 1> = {};
if (options.sortBy) {
  const [field, order] = options.sortBy.split('-');
  sortOptions[field] = order === '-' ? -1 : 1;
} else {
  sortOptions.createdAt = -1;  // Default: newest first
}
```

---

### **Combined Filtering & Sorting:**

```bash
# Get unread, high priority task notifications, sorted by newest
GET /notifications/my?status=unread&type=task&priority=high&sortBy=-createdAt

# Get read system notifications from last 7 days
GET /notifications/my?status=read&type=system&sortBy=-createdAt
```

---

## 📊 Bulk Operations

### **Endpoint 6: Send Bulk Notifications (Admin Only)**

```http
POST /notifications/bulk
Authorization: Bearer <admin-token>
Role: admin
Rate Limit: 10 requests per minute
Max Users: 1000 per request
```

---

### **Request:**

```bash
curl -X POST "http://localhost:5000/notifications/bulk" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2", "user3"],
    "title": "System Maintenance",
    "subTitle": "Scheduled maintenance on March 30",
    "type": "system",
    "priority": "high",
    "channels": ["in_app", "email"]
  }'
```

---

### **Response:**

```json
{
  "success": true,
  "code": 200,
  "message": "Bulk notifications sent successfully",
  "data": {
    "sent": 3,
    "failed": 0,
    "notifications": [
      {
        "_id": "notif1",
        "receiverId": "user1",
        "status": "pending"
      }
    ]
  }
}
```

---

### **Service Implementation:**

```typescript
async sendBulkNotification(
  payload: IBulkNotificationPayload
): Promise<INotificationDocument[]> {
  const { userIds, receiverRole, title, subTitle, type, priority, channels } = payload;

  // Validate limit
  if (userIds && userIds.length > 1000) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Maximum 1000 notifications allowed per bulk request'
    );
  }

  const notifications: INotificationDocument[] = [];

  // Send to specific users
  if (userIds && userIds.length > 0) {
    for (const userId of userIds) {
      try {
        const notification = await this.createNotification({
          receiverId: new Types.ObjectId(userId),
          title,
          subTitle,
          type,
          priority,
          channels,
        });
        notifications.push(notification);
      } catch (error) {
        errorLogger.error(`Failed to send to user ${userId}:`, error);
      }
    }
  }

  // Broadcast to role
  if (receiverRole && (!userIds || userIds.length === 0)) {
    const notification = await this.createNotification({
      receiverRole,
      title,
      subTitle,
      type,
      priority,
      channels,
    });
    notifications.push(notification);
  }

  if (notifications.length === 0) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'No notifications could be sent'
    );
  }

  return notifications;
}
```

---

## 🧪 Testing API Endpoints

### **Test 1: Get Notifications**

```bash
# Get first page
curl -X GET "http://localhost:5000/notifications/my?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected: List of notifications with pagination
```

---

### **Test 2: Get Unread Count**

```bash
curl -X GET "http://localhost:5000/notifications/unread-count" \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"data": {"count": 5}}
```

---

### **Test 3: Mark as Read**

```bash
curl -X POST "http://localhost:5000/notifications/$NOTIF_ID/read" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Notification with status: "read"
```

---

### **Test 4: Mark All as Read**

```bash
curl -X POST "http://localhost:5000/notifications/read-all" \
  -H "Authorization: Bearer $TOKEN"

# Expected: {"data": {"count": 15}}
```

---

### **Test 5: Delete Notification**

```bash
curl -X DELETE "http://localhost:5000/notifications/$NOTIF_ID" \
  -H "Authorization: Bearer $TOKEN"

# Expected: Notification with isDeleted: true
```

---

### **Test 6: Send Bulk Notification**

```bash
curl -X POST "http://localhost:5000/notifications/bulk" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user1", "user2"],
    "title": "Test Bulk",
    "type": "system"
  }'

# Expected: List of created notifications
```

---

## 🔍 Debugging & Monitoring

### **Check MongoDB:**

```bash
mongosh

# Find user notifications
db.notifications.find({
  receiverId: ObjectId("user123")
}).sort({ createdAt: -1 }).limit(10)

# Count unread
db.notifications.countDocuments({
  receiverId: ObjectId("user123"),
  status: { $ne: 'read' }
})

# Find deleted
db.notifications.find({
  isDeleted: true
}).sort({ deletedAt: -1 }).limit(10)
```

---

### **Check Redis Cache:**

```bash
redis-cli

# Check unread count cache
GET notification:user:user123:unread-count
TTL notification:user:user123:unread-count

# Check notification list cache
GET notification:user:user123:notifications

# Check cache keys
KEYS notification:user:user123:*
```

---

### **Monitor API Performance:**

```typescript
// Add logging middleware
app.use('/notifications', (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  
  next();
});

// Expected response times:
// GET /notifications/my: <100ms (cached), <200ms (DB)
// GET /notifications/unread-count: <10ms (cached)
// POST /notifications/:id/read: <50ms
// DELETE /notifications/:id: <50ms
```

---

## 📝 Summary

### **What We Learned:**

1. ✅ **Retrieve**: Get notifications with pagination, caching
2. ✅ **Unread Count**: Cached count for badge display
3. ✅ **Mark as Read**: Single and bulk operations
4. ✅ **Delete**: Soft delete with retention policy
5. ✅ **Filter**: By status, type, priority
6. ✅ **Sort**: By date, priority
7. ✅ **Bulk**: Send to 1000 users (admin only)
8. ✅ **API**: All 13 endpoints documented

### **Quick Reference:**

```typescript
// API Endpoints
GET    /notifications/my                      // Get my notifications
GET    /notifications/unread-count            // Get unread count
POST   /notifications/:id/read                // Mark as read
POST   /notifications/read-all                // Mark all as read
DELETE /notifications/:id                     // Delete notification
POST   /notifications/bulk                    // Send bulk (Admin)

// Service Methods
await notificationService.getUserNotifications(userId, options)
await notificationService.getUnreadCount(userId)
await notificationService.markAsRead(notificationId, userId)
await notificationService.markAllAsRead(userId)
await notificationService.deleteNotification(notificationId, userId)
await notificationService.sendBulkNotification(payload)
```

### **Next Chapter:**

→ [Chapter 9: Live Activity Feed](./LEARN_NOTIFICATION_09_ACTIVITY_FEED.md)

---

**Created**: 26-03-23
**Author**: Qwen Code Assistant
**Status**: 📚 Educational Guide
