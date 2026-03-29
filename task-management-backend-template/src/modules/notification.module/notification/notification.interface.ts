import { Document, Types } from 'mongoose';
import { NotificationType, NotificationPriority, NotificationChannel, NotificationStatus, ReminderType } from './notification.constant';

/**
 * Notification Type
 * Derived from NotificationType enum
 */
export type TNotificationType = `${NotificationType}`;

/**
 * Notification Priority
 * Derived from NotificationPriority enum
 */
export type TNotificationPriority = `${NotificationPriority}`;

/**
 * Notification Channel
 * Derived from NotificationChannel enum
 */
export type TNotificationChannel = `${NotificationChannel}`;

/**
 * Notification Status
 * Derived from NotificationStatus enum
 */
export type TNotificationStatus = `${NotificationStatus}`;

/**
 * Reminder Type
 * Derived from ReminderType enum
 */
export type TReminderType = `${ReminderType}`;

/**
 * Notification Interface
 * Defines the structure of a Notification document
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export interface INotification {
  /**
   * Reference to the sender (optional for system notifications)
   */
  senderId?: Types.ObjectId;

  /**
   * Reference to the receiver (optional for broadcast notifications)
   */
  receiverId?: Types.ObjectId;

  /**
   * Role-based targeting (for broadcast to specific roles)
   */
  receiverRole?: string;

  /**
   * Notification title (supports i18n)
   */
  title: string | Record<string, string>;

  /**
   * Notification body/subtitle (supports i18n)
   */
  subTitle?: string | Record<string, string>;

  /**
   * Notification type
   */
  type: TNotificationType;

  /**
   * Notification priority
   */
  priority: TNotificationPriority;

  /**
   * Delivery channels
   */
  channels: TNotificationChannel[];

  /**
   * Notification status
   */
  status: TNotificationStatus;

  /**
   * Link type for navigation
   */
  linkFor?: string;

  /**
   * Entity ID to link to (task, family/children, etc.)
   * Note: In childrenBusinessUser architecture, this links to task or other entities
   * managed by parent/teacher (business user) for their children/students
   */
  linkId?: Types.ObjectId;

  /**
   * Reference type (for tracking source)
   */
  referenceFor?: string;

  /**
   * Reference entity ID
   */
  referenceId?: Types.ObjectId;

  /**
   * Additional data for the notification
   */
  data?: Record<string, any>;

  /**
   * Metadata for extensibility
   */
  metadata?: Record<string, any>;

  /**
   * When the notification was read
   */
  readAt?: Date;

  /**
   * When the notification was delivered
   */
  deliveredAt?: Date;

  /**
   * Scheduled delivery time (for reminders)
   */
  scheduledFor?: Date;

  /**
   * Soft delete flag
   */
  isDeleted: boolean;
}

/**
 * Notification Document Interface
 * Extends INotification with Mongoose Document methods
 */
export interface INotificationDocument extends INotification, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  /**
   * Mark notification as read
   */
  markAsRead(): Promise<void>;

  /**
   * Check if notification is unread
   */
  isUnread(): boolean;

  /**
   * Check if notification is scheduled
   */
  isScheduled(): boolean;
}

/**
 * Notification Model Interface
 * Extends Model with custom static methods
 */
export interface INotificationModel extends Document {
  /**
   * Get unread count for a user
   */
  getUnreadCount(userId: Types.ObjectId): Promise<number>;

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead(userId: Types.ObjectId): Promise<number>;

  /**
   * Get notifications for a user with pagination
   */
  getUserNotifications(
    userId: Types.ObjectId,
    options: any
  ): Promise<any>;
}

/**
 * Notification Query Options Interface
 */
export interface INotificationQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  populate?: Array<{ path: string; select?: string }>;
  select?: string;
  status?: TNotificationStatus;
  type?: TNotificationType;
  priority?: TNotificationPriority;
}

/**
 * Bulk Notification Payload
 */
export interface IBulkNotificationPayload {
  userIds?: string[];
  receiverRole?: string;
  title: string | Record<string, string>;
  subTitle?: string | Record<string, string>;
  type: TNotificationType;
  priority?: TNotificationPriority;
  channels?: TNotificationChannel[];
  linkFor?: string;
  linkId?: string;
  data?: Record<string, any>;
}

/**
 * Task Reminder Configuration
 */
export interface ITaskReminderConfig {
  taskId: string;
  userId: string;
  reminderTime: Date;
  reminderType: TReminderType;
  message?: string;
  channels?: TNotificationChannel[];
}
