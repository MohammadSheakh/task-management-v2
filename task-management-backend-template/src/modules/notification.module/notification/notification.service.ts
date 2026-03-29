//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import { Types } from 'mongoose';
import { Notification } from './notification.model';
import { INotification, INotificationDocument, INotificationQueryOptions, IBulkNotificationPayload } from './notification.interface';
import ApiError from '../../../errors/ApiError';
import { redisClient } from '../../../helpers/redis/redis';
import { NotificationStatus, NotificationPriority, NotificationChannel, NotificationType, NOTIFICATION_CACHE_CONFIG, QUEUE_CONFIG, ACTIVITY_TYPE, TActivityType } from './notification.constant';
import { errorLogger, logger } from '../../../shared/logger';
import { notificationQueue } from '../../../helpers/bullmq/bullmq';
import PaginationService from '../../../common/service/paginationService';
import { GenericService } from '../../_generic-module/generic.services';
import { User } from '../../user.module/user/user.model';

/**
 * Notification Service
 * Handles business logic for notification operations
 *
 * Features:
 * - Multi-channel delivery (in-app, email, push, SMS)
 * - BullMQ for async notification processing
 * - Redis caching for unread counts
 * - Scheduled notifications for reminders
 * - Bulk notification support
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class NotificationService extends GenericService<typeof Notification, INotificationDocument> {
  constructor() {
    super(Notification);
  }

  /**
   * Cache Key Generator
   */
  private getCacheKey(type: 'unread' | 'notifications' | 'notification', userId?: string, notificationId?: string): string {
    const prefix = NOTIFICATION_CACHE_CONFIG.PREFIX;
    if (type === 'unread' && userId) {
      return `${prefix}:user:${userId}:unread-count`;
    }
    if (type === 'notifications' && userId) {
      return `${prefix}:user:${userId}:notifications`;
    }
    if (type === 'notification' && notificationId) {
      return `${prefix}:${notificationId}`;
    }
    return `${prefix}:unknown`;
  }

  /**
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * Set in Cache
   */
  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error:', error);
    }
  }

  /**
   * Invalidate Cache
   */
  private async invalidateCache(userId: string, notificationId?: string): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('unread', userId),
        this.getCacheKey('notifications', userId),
      ];

      if (notificationId) {
        keysToDelete.push(this.getCacheKey('notification', undefined, notificationId));
      }

      await redisClient.del(keysToDelete);
    } catch (error) {
      errorLogger.error('Redis DELETE error:', error);
    }
  }

  /**
   * Queue Notification for Async Processing
   */
  private async queueNotification(notification: INotificationDocument): Promise<void> {
    try {
      await notificationQueue.add(
        'sendNotification',
        {
          notificationId: notification._id.toString(),
          receiverId: notification.receiverId?.toString(),
          receiverRole: notification.receiverRole,
          channels: notification.channels,
          priority: notification.priority,
          title: notification.title,
          subTitle: notification.subTitle,
          type: notification.type,
          linkFor: notification.linkFor,
          linkId: notification.linkId?.toString(),
        },
        {
          attempts: QUEUE_CONFIG.JOB_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: QUEUE_CONFIG.BACKOFF_DELAY,
          },
          delay: notification.scheduledFor
            ? notification.scheduledFor.getTime() - Date.now()
            : 0,
        }
      );
      logger.info(`📧 Notification queued for ${notification.receiverId || notification.receiverRole}`);
    } catch (error) {
      errorLogger.error('Failed to queue notification:', error);
      // Don't throw - notification is still valid even if queue fails
    }
  }

  /**
   * Create a single notification
   *
   * @param data - Notification data
   * @param scheduledFor - Optional scheduled delivery time
   * @returns Created notification
   */
  async createNotification(
    data: Partial<INotification>,
    scheduledFor?: Date
  ): Promise<INotificationDocument> {
    const notification = await Notification.create({
      ...data,
      scheduledFor: scheduledFor || data.scheduledFor,
      status: scheduledFor && scheduledFor > new Date()
        ? NotificationStatus.PENDING
        : NotificationStatus.PENDING,
    });

    // Queue for async processing
    await this.queueNotification(notification);

    // Invalidate cache
    if (notification.receiverId) {
      await this.invalidateCache(notification.receiverId.toString());
    }

    return notification;
  }

  /**
   * Send bulk notifications
   *
   * @param payload - Bulk notification payload
   * @returns Array of created notifications
   */
  async sendBulkNotification(payload: IBulkNotificationPayload): Promise<INotificationDocument[]> {
    const {
      userIds,
      receiverRole,
      title,
      subTitle,
      type,
      priority = NotificationPriority.NORMAL, 
      channels = [NotificationChannel.IN_APP],
      linkFor,
      linkId,
      data 
    } = payload;

    // Validate bulk limit
    if (userIds && userIds.length > 1000) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Maximum 1000 notifications allowed per bulk request`
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
            linkFor,
            linkId: linkId ? new Types.ObjectId(linkId) : undefined,
            data,
          });
          notifications.push(notification);
        } catch (error) {
          errorLogger.error(`Failed to send notification to user ${userId}:`, error);
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
        linkFor,
        linkId: linkId ? new Types.ObjectId(linkId) : undefined,
        data,
      });
      notifications.push(notification);
    }

    if (notifications.length === 0) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'No notifications could be sent. Check recipient list.'
      );
    }

    return notifications;
  }

  /**
   * Get user notifications with pagination
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Paginated notifications
   */
  async getUserNotifications(
    userId: string,
    options: INotificationQueryOptions
  ): Promise<any> {
    const cacheKey = this.getCacheKey('notifications', userId);

    // Try cache first (only for first page)
    if (options.page === 1) {
      const cachedNotifications = await this.getFromCache<any>(cacheKey);
      if (cachedNotifications) {
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
      query.status = options.status;
    }

    if (options.type) {
      query.type = options.type;
    }

    if (options.priority) {
      query.priority = options.priority;
    }

    // Use pagination service for aggregation-based pagination
    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
    ];

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
      await this.setInCache(cacheKey, result, NOTIFICATION_CACHE_CONFIG.RECENT_NOTIFICATIONS_TTL);
    }

    return result;
  }

  /**
   * Get unread notification count with caching
   *
   * @param userId - User ID
   * @returns Unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const cacheKey = this.getCacheKey('unread', userId);

    // Try cache first
    const cachedCount = await this.getFromCache<number>(cacheKey);
    if (cachedCount !== null) {
      return cachedCount;
    }

    // Fallback to database
    const count = await Notification.getUnreadCount(new Types.ObjectId(userId));

    // Cache the count
    await this.setInCache(cacheKey, count, NOTIFICATION_CACHE_CONFIG.UNREAD_COUNT_TTL);

    return count;
  }

  /**
   * Mark notification as read
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for validation)
   * @returns Updated notification
   */
  async markAsRead(notificationId: string, userId: string): Promise<INotificationDocument | null> {
    const notification = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      receiverId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!notification) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    if (notification.status === NotificationStatus.READ) {
      return notification; // Already read
    }

    notification.status = NotificationStatus.READ;
    notification.readAt = new Date();
    await notification.save();

    // Invalidate cache
    await this.invalidateCache(userId, notificationId);

    return notification;
  }

  /**
   * Mark all notifications as read for a user
   *
   * @param userId - User ID
   * @returns Number of notifications marked as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const count = await Notification.markAllAsRead(new Types.ObjectId(userId));

    // Invalidate cache
    await this.invalidateCache(userId);

    return count;
  }

  /**
   * Delete notification (soft delete)
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for validation)
   * @returns Deleted notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<INotificationDocument | null> {
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isDeleted: true },
      { new: true }
    );

    if (!notification) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    // Invalidate cache
    await this.invalidateCache(userId, notificationId);

    return notification;
  }

  /**
   * Create task reminder notification
   *
   * @param taskId - Task ID
   * @param userId - User ID
   * @param reminderTime - When to send the reminder
   * @param reminderType - Type of reminder
   * @param message - Custom message
   * @returns Created notification
   */
  async createTaskReminder(
    taskId: string,
    userId: string,
    reminderTime: Date,
    reminderType: 'before_deadline' | 'at_deadline' | 'after_deadline' | 'custom' = 'before_deadline',
    message?: string
  ): Promise<INotificationDocument> {
    const title = reminderType === 'before_deadline'
      ? 'Task Reminder: Deadline Approaching'
      : reminderType === 'at_deadline'
        ? 'Task Due Now'
        : reminderType === 'after_deadline'
          ? 'Task Overdue'
          : 'Task Reminder';

    return await this.createNotification(
      {
        receiverId: new Types.ObjectId(userId),
        title,
        subTitle: message || `Your task is ${reminderType.replace('_', ' ')}`,
        type: 'reminder',
        priority: NotificationPriority.HIGH,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        linkFor: 'task',
        linkId: new Types.ObjectId(taskId),
        referenceFor: 'task',
        referenceId: new Types.ObjectId(taskId),
        data: {
          taskId,
          reminderType,
          reminderTime,
        },
      },
      reminderTime
    );
  }

  /**
   * Create task assignment notification
   *
   * @param taskId - Task ID
   * @param userId - User ID (assignee)
   * @param assignedByUserId - User who assigned
   * @returns Created notification
   */
  async createTaskAssignmentNotification(
    taskId: string,
    userId: string,
    assignedByUserId: string
  ): Promise<INotificationDocument> {
    return await this.createNotification({
      receiverId: new Types.ObjectId(userId),
      senderId: new Types.ObjectId(assignedByUserId),
      title: 'New Task Assigned',
      subTitle: 'You have been assigned a new task',
      type: 'assignment',
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'task',
      linkId: new Types.ObjectId(taskId),
      referenceFor: 'task',
      referenceId: new Types.ObjectId(taskId),
      data: {
        taskId,
        assignedBy: assignedByUserId,
      },
    });
  }

  /**
   * Create deadline notification
   *
   * @param taskId - Task ID
   * @param userId - User ID
   * @param isOverdue - Whether deadline has passed
   * @returns Created notification
   */
  async createDeadlineNotification(
    taskId: string,
    userId: string,
    isOverdue: boolean = false
  ): Promise<INotificationDocument> {
    return await this.createNotification({
      receiverId: new Types.ObjectId(userId),
      title: isOverdue ? 'Task Overdue' : 'Task Due Soon',
      subTitle: isOverdue ? 'The deadline for your task has passed' : 'Your task deadline is approaching',
      type: 'deadline',
      priority: isOverdue ? NotificationPriority.URGENT : NotificationPriority.HIGH,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      linkFor: 'task',
      linkId: new Types.ObjectId(taskId),
      referenceFor: 'task',
      referenceId: new Types.ObjectId(taskId),
      data: {
        taskId,
        isOverdue,
      },
    });
  }

  /**
   * Cleanup old notifications (cron job)
   * Should be called daily
   */
  async cleanupOldNotifications(): Promise<number> {
    const count = await Notification.cleanupOldNotifications(30, 90);
    logger.info(`🧹 Cleaned up ${count} old notifications`);
    return count;
  }

  /**
   * Get pending scheduled notifications
   * Used by worker to process due notifications
   */
  async getPendingScheduledNotifications(): Promise<INotificationDocument[]> {
    return await Notification.getPendingScheduledNotifications();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Figma-Aligned Methods: Live Activity Feed for Children/Family
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get Live Activity Feed for Children Business User
   * Figma: dashboard-flow-01.png (Live Activity section)
   *
   * Returns recent activities from children/students including task completions,
   * task starts, subtask completions, and new children joining the family/school.
   *
   * @param businessUserId - Business user (parent/teacher) ID
   * @param limit - Number of activities to return (default: 10)
   * @returns Array of recent activities from all children
   *
   * @description
   * This endpoint fetches recent task-related activities from all children
   * belonging to the business user (parent or teacher). Activities include:
   * - Task completions
   * - Task starts
   * - Subtask completions
   * - Task creations
   *
   * Response is formatted for the Live Activity section showing:
   * - Child name and profile image
   * - Activity description (e.g., "completed 'Math Homework'")
   * - Timestamp
   */
  async getLiveActivityFeedForChildren(
    businessUserId: string,
    limit: number = 10
  ) {
    const businessUserObjectId = new Types.ObjectId(businessUserId);
    const cacheKey = `${NOTIFICATION_CACHE_CONFIG.PREFIX}:dashboard:activity-feed:children:${businessUserId.toString()}:${limit}`;

    // Try cache first (30 seconds for activity feed)
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get all active children for this business user
    const { ChildrenBusinessUser } = await import('../../childrenBusinessUser.module/childrenBusinessUser.model');

    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: businessUserObjectId,
      status: 'active',
      isDeleted: false,
    }).select('childUserId').lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    if (childUserIds.length === 0) {
      return [];
    }

    // Get recent notifications for all children
    const notifications = await this.model.find({
      receiverId: { $in: childUserIds },
      type: NotificationType.TASK,
      'data.activityType': {
        $in: [
          ACTIVITY_TYPE.TASK_CREATED,
          ACTIVITY_TYPE.TASK_STARTED,
          ACTIVITY_TYPE.TASK_UPDATED,
          ACTIVITY_TYPE.TASK_COMPLETED,
          ACTIVITY_TYPE.SUBTASK_COMPLETED,
          ACTIVITY_TYPE.TASK_ASSIGNED,
        ],
      },
      isDeleted: false,
    })
      .populate('receiverId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Transform notifications into activity feed format
    const activities = notifications.map((notification:any) => {
      const child = notification.receiverId as any;

      return {
        _id: notification._id.toString(),
        type: notification.type,
        actor: {
          _id: child?._id.toString(),
          name: child?.name || 'Unknown',
          profileImage: child?.profileImage?.imageUrl || '/uploads/users/user.png',
        },
        task: notification.data?.taskId
          ? {
              _id: notification.data.taskId,
              title: notification.data?.taskTitle || 'Task',
            }
          : undefined,
        timestamp: notification.createdAt,
        timeAgo: this.getTimeAgo(notification.createdAt),
        message: this.generateActivityMessage(notification),
      };
    });

    // Cache the result (30 seconds for real-time feel)
    await redisClient.setEx(cacheKey, 30, JSON.stringify(activities));

    return activities;
  }

  /**
   * Get Live Activity Feed for Parent Dashboard
   * Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png (Live Activity section)
   *
   * Returns recent activities from all children of a business user (parent/teacher).
   * This endpoint is specifically designed for the parent dashboard without requiring groupId.
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param limit - Number of activities to return (default: 10)
   * @returns Array of recent activities from all children
   *
   * @description
   * This endpoint fetches recent task-related activities from all children
   * belonging to the business user. Activities include:
   * - Task completions
   * - Task starts
   * - Subtask completions
   * - Task creations
   *
   * Response is formatted for the Live Activity section showing:
   * - Child name and profile image
   * - Activity description (e.g., "completed 'Math Homework'")
   * - Timestamp
   */
  async getLiveActivityFeedForParentDashboard(
    businessUserId: Types.ObjectId,
    limit: number = 10
  ) {
    const cacheKey = `${NOTIFICATION_CACHE_CONFIG.PREFIX}:dashboard:activity-feed:${businessUserId.toString()}:${limit}`;

    // Try cache first (30 seconds for activity feed)
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get all active children for this business user
    const { ChildrenBusinessUser } = await import('../../childrenBusinessUser.module/childrenBusinessUser.model');

    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: businessUserId,
      status: 'active',
      isDeleted: false,
    }).select('childUserId').lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    if (childUserIds.length === 0) {
      return [];
    }

    // Get recent notifications for all children
    const notifications = await this.model.find({
      receiverId: { $in: childUserIds },
      type: NotificationType.TASK,  // ✅ FIXED: Filter by valid NotificationType
      'data.activityType': {
        $in: [
          ACTIVITY_TYPE.TASK_CREATED,
          ACTIVITY_TYPE.TASK_STARTED,
          ACTIVITY_TYPE.TASK_UPDATED,
          ACTIVITY_TYPE.TASK_COMPLETED,
          ACTIVITY_TYPE.SUBTASK_COMPLETED,
          ACTIVITY_TYPE.TASK_ASSIGNED,
        ],
      },
      isDeleted: false,
    })
      .populate('receiverId', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Transform notifications into activity feed format
    const activities = notifications.map((notification:any) => {
      const child = notification.receiverId as any;

      return {
        _id: notification._id.toString(),
        type: notification.type,
        actor: {
          _id: child?._id.toString(),
          name: child?.name || 'Unknown',
          profileImage: child?.profileImage?.imageUrl || '/uploads/users/user.png',
        },
        task: notification.data?.taskId
          ? {
              _id: notification.data.taskId,
              title: notification.data?.taskTitle || 'Task',
            }
          : undefined,
        timestamp: notification.createdAt,
        timeAgo: this.getTimeAgo(notification.createdAt),
        message: this.generateActivityMessage(notification),
      };
    });

    // Cache the result (30 seconds for real-time feel)
    await redisClient.setEx(cacheKey, 30, JSON.stringify(activities));

    return activities;
  }

  /**
   * Get time ago string from date
   */
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  /**
   * Generate activity message based on notification type
   * Updated to reflect actual Figma use cases - task activities only
   */
  private generateActivityMessage(notification: any): string {
    const actorName = (notification.receiverId as any)?.name || 'Someone';
    const taskTitle = notification.data?.taskTitle || 'a task';

    switch (notification.data?.activityType) {
      case ACTIVITY_TYPE.TASK_CREATED:
        return `${actorName} created '${taskTitle}'`;
      case ACTIVITY_TYPE.TASK_STARTED:
        return `${actorName} started working on '${taskTitle}'`;
      case ACTIVITY_TYPE.TASK_UPDATED:
        return `${actorName} updated '${taskTitle}'`;
      case ACTIVITY_TYPE.TASK_COMPLETED:
        return `${actorName} completed '${taskTitle}'`;
      case ACTIVITY_TYPE.TASK_DELETED:
        return `${actorName} deleted '${taskTitle}'`;
      case ACTIVITY_TYPE.SUBTASK_COMPLETED:
        return `${actorName} completed a subtask in '${taskTitle}'`;
      case ACTIVITY_TYPE.TASK_ASSIGNED:
        return `${actorName} was assigned '${taskTitle}'`;
      default:
        return `${actorName} performed an action on '${taskTitle}'`;
    }
  }

  /** 🔁
   * Record activity for child
   * Creates a notification entry for live activity feed in parent/teacher dashboard
   *
   * @param businessUserId - Business user (parent/teacher) ID
   * @param childUserId - Child user performing the action
   * @param activityType - Type of activity
   * @param taskData - Optional task information
   *
   * @description
   * This method records activities from children/students that will appear
   * in the parent/teacher dashboard's Live Activity section.
   *
   * Example use cases:
   * - Child completes a task
   * - Child starts a new task
   * - Child completes a subtask
   */
  async recordChildActivity(
    businessUserId: string,
    childUserId: string,
    activityType: TActivityType,
    taskData?: {
      taskId: string;
      taskTitle: string;
    }
  ) {
    const user = await User.findById(childUserId).select('name profileImage');

    await this.model.create({
      receiverId: new Types.ObjectId(childUserId),
      title: activityType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: NotificationType.TASK,  // ✅ Use valid NotificationType
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
      linkFor: 'task',
      linkId: taskData ? new Types.ObjectId(taskData.taskId) : undefined,
      referenceFor: 'task',
      referenceId: taskData ? new Types.ObjectId(taskData.taskId) : undefined,
      data: {
        businessUserId,  // ✅ Track which business user this belongs to
        taskId: taskData?.taskId,
        taskTitle: taskData?.taskTitle,
        activityType,  // ✅ Store activity type in data field
      },
      isDeleted: false,
    });

    // Invalidate activity feed cache for this business user
    const cacheKey = `${NOTIFICATION_CACHE_CONFIG.PREFIX}:dashboard:activity-feed:children:${businessUserId}:10`;
    await redisClient.del(cacheKey);
  }
}
