/**
 * Notification Module Constants
 * Centralized configuration for notification-related limits and defaults
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

/**
 * Notification Type Enum
 * Defines the category of notification
 *
 * Note: FAMILY type replaced GROUP to align with childrenBusinessUser architecture
 * where parent/teacher (business user) manages children/students
 */
export enum NotificationType {
  TASK = 'task',
  FAMILY = 'family',           // Family/children activities (replaces 'group')
  SYSTEM = 'system',
  REMINDER = 'reminder',
  MENTION = 'mention',
  ASSIGNMENT = 'assignment',
  DEADLINE = 'deadline',
  CUSTOM = 'custom',
}

/**
 * Notification Priority Enum
 * Determines notification urgency and delivery method
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification Channel Enum
 * Defines how the notification should be delivered
 */
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  PUSH = 'push',
  SMS = 'sms',
}

/**
 * Notification Status Enum
 * Tracks the delivery and read status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Reminder Type Enum
 * Defines when the reminder should be triggered relative to deadline
 */
export enum ReminderType {
  BEFORE_DEADLINE = 'before_deadline',
  AT_DEADLINE = 'at_deadline',
  AFTER_DEADLINE = 'after_deadline',
  CUSTOM = 'custom',
}

/**
 * Type exports from enums (for MongoDB schema validation and TypeScript)
 */
export type TNotificationType = `${NotificationType}`;
export type TNotificationPriority = `${NotificationPriority}`;
export type TNotificationChannel = `${NotificationChannel}`;
export type TNotificationStatus = `${NotificationStatus}`;
export type TReminderType = `${ReminderType}`;

/**
 * Legacy constant exports (for backward compatibility)
 * @deprecated Use NotificationType, NotificationPriority, etc. enums instead
 */
export const NOTIFICATION_TYPE = NotificationType;
export const NOTIFICATION_PRIORITY = NotificationPriority;
export const NOTIFICATION_CHANNEL = NotificationChannel;
export const NOTIFICATION_STATUS = NotificationStatus;
export const REMINDER_TYPE = ReminderType;

/**
 * Notification Limits Configuration
 */
export const NOTIFICATION_LIMITS = {
  /**
   * Maximum notifications to fetch per request
   */
  MAX_NOTIFICATIONS_PER_REQUEST: 100,

  /**
   * Maximum bulk notifications per request
   */
  MAX_BULK_NOTIFICATIONS: 1000,

  /**
   * Maximum title length
   */
  MAX_TITLE_LENGTH: 200,

  /**
   * Maximum subtitle length
   */
  MAX_SUBTITLE_LENGTH: 500,

  /**
   * Maximum notifications to keep per user (cleanup old ones)
   */
  MAX_NOTIFICATIONS_PER_USER: 1000,

  /**
   * Days to keep read notifications
   */
  READ_NOTIFICATION_RETENTION_DAYS: 30,

  /**
   * Days to keep unread notifications
   */
  UNREAD_NOTIFICATION_RETENTION_DAYS: 90,
} as const;

/**
 * Cache Configuration for Redis
 */
export const NOTIFICATION_CACHE_CONFIG = {
  /**
   * Cache TTL for unread count (seconds)
   */
  UNREAD_COUNT_TTL: 30, // 30 seconds

  /**
   * Cache TTL for recent notifications (seconds)
   */
  RECENT_NOTIFICATIONS_TTL: 60, // 1 minute

  /**
   * Cache key prefix
   */
  PREFIX: 'notification',
} as const;

/**
 * BullMQ Queue Configuration
 */
export const QUEUE_CONFIG = {
  /**
   * Queue name for sending notifications
   */
  NOTIFICATION_QUEUE_NAME: 'notifications-queue',

  /**
   * Queue name for scheduled reminders
   */
  REMINDER_QUEUE_NAME: 'task-reminders-queue',

  /**
   * Queue name for email notifications
   */
  EMAIL_QUEUE_NAME: 'notification-emails-queue',

  /**
   * Queue name for push notifications
   */
  PUSH_QUEUE_NAME: 'notification-push-queue',

  /**
   * Job attempts before failure
   */
  JOB_ATTEMPTS: 3,

  /**
   * Backoff delay in milliseconds
   */
  BACKOFF_DELAY: 5000,

  /**
   * Default delay for scheduled notifications (milliseconds)
   */
  DEFAULT_SCHEDULE_DELAY: 60000, // 1 minute
} as const;

/**
 * Activity Types for Children/Family Activity Feed
 * Figma: dashboard-flow-01.png (Live Activity section)
 *
 * Note: These represent TASK-RELATED activities only
 * Parent/teacher sees when children complete/start/update tasks
 *
 * NOT included: Child joined/left (these are admin CRUD operations, not activities)
 */
export const ACTIVITY_TYPE = {
  TASK_CREATED: 'task_created',           // ✅ Child created a task
  TASK_STARTED: 'task_started',           // ✅ Child started working on a task
  TASK_UPDATED: 'task_updated',           // ✅ Child updated a task
  TASK_COMPLETED: 'task_completed',       // ✅ Child completed a task (MAIN USE CASE)
  TASK_DELETED: 'task_deleted',           // ✅ Child deleted a task
  SUBTASK_COMPLETED: 'subtask_completed', // ✅ Child completed a subtask
  TASK_ASSIGNED: 'task_assigned',         // ✅ Task was assigned to child
} as const;

/**
 * Activity Type Union Type
 */
export type TActivityType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE];

/**
 * Reminder Configuration
 */
export const REMINDER_CONFIG = {
  /**
   * Default reminder times before deadline (in hours)
   */
  DEFAULT_REMINDER_HOURS: [24, 1], // 24 hours and 1 hour before

  /**
   * Maximum reminders per task
   */
  MAX_REMINDERS_PER_TASK: 5,

  /**
   * Minimum time between reminders (in minutes)
   */
  MIN_REMINDER_INTERVAL_MINUTES: 15,

  /**
   * Cron expression for cleanup job (daily at 2 AM)
   */
  CLEANUP_CRON: '0 2 * * *',
} as const;

/**
 * Email Template Configuration
 */
export const EMAIL_CONFIG = {
  /**
   * Template for task reminder email
   */
  TASK_REMINDER_TEMPLATE: 'task-reminder',

  /**
   * Template for assignment notification
   */
  ASSIGNMENT_TEMPLATE: 'task-assignment',

  /**
   * Template for deadline notification
   */
  DEADLINE_TEMPLATE: 'task-deadline',

  /**
   * Template for family/child joined notification
   */
  CHILD_JOINED_TEMPLATE: 'child-joined',

  /**
   * Default sender email
   */
  DEFAULT_SENDER: 'noreply@taskmanagement.com',
} as const;

/**
 * Push Notification Configuration
 */
export const PUSH_CONFIG = {
  /**
   * TTL for push notifications (seconds)
   */
  TTL: 86400, // 24 hours

  /**
   * Urgency levels for push
   */
  URGENCY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
  },
} as const;
