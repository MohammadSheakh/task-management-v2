//@ts-ignore
import { model, Schema, Types, Document } from 'mongoose';
import { INotification, INotificationDocument, INotificationModel } from './notification.interface';
import { NotificationType, NotificationPriority, NotificationChannel, NotificationStatus } from './notification.constant';
import paginate from '../../../common/plugins/paginate';

/**
 * Notification Schema
 * Represents a notification for task reminders, assignments, and system events
 *
 * Design Principles:
 * - Multi-channel delivery (in-app, email, push, SMS)
 * - i18n support for title and subtitle
 * - Scheduled delivery for reminders
 * - Priority-based routing
 * - Optimized for high-volume notification workflows (100K+ users)
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
const notificationSchema = new Schema<INotificationDocument>(
  {
    // ─── Sender & Receiver ─────────────────────────────────────────────
    /**
     * Reference to the sender (optional for system notifications)
     */
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    /**
     * Reference to the receiver (optional for broadcast notifications)
     */
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    /**
     * Role-based targeting (for broadcast to specific roles)
     */
    receiverRole: {
      type: String,
      index: true,
    },

    // ─── Content ───────────────────────────────────────────────────────
    /**
     * Notification title (supports i18n)
     * Can be string or object with language codes
     */
    title: {
      type: Schema.Types.Mixed,
      required: [true, 'Notification title is required'],
    },

    /**
     * Notification body/subtitle (supports i18n)
     */
    subTitle: {
      type: Schema.Types.Mixed,
    },

    // ─── Classification ────────────────────────────────────────────────
    /**
     * Notification type
     */
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: [true, 'Notification type is required'],
      index: true,
    },

    /**
     * Notification priority
     * Determines delivery urgency
     */
    priority: {
      type: String,
      enum: Object.values(NotificationPriority),
      required: [true, 'Notification priority is required'],
      default: NotificationPriority.NORMAL,
      index: true,
    },

    /**
     * Delivery channels
     */
    channels: {
      type: [String],
      enum: Object.values(NotificationChannel),
      required: [true, 'At least one channel is required'],
      default: [NotificationChannel.IN_APP],
    },

    // ─── Status & Tracking ─────────────────────────────────────────────
    /**
     * Notification status
     */
    status: {
      type: String,
      enum: Object.values(NotificationStatus),
      required: [true, 'Notification status is required'],
      default: NotificationStatus.PENDING,
      index: true,
    },

    /**
     * Link type for navigation
     */
    linkFor: {
      type: String,
    },

    /**
     * Entity ID to link to (task, family/children, etc.)
     * Note: In childrenBusinessUser architecture, this links to task or other entities
     * managed by parent/teacher (business user) for their children/students
     */
    linkId: {
      type: Schema.Types.ObjectId,
    },

    /**
     * Reference type (for tracking source)
     */
    referenceFor: {
      type: String,
    },

    /**
     * Reference entity ID
     */
    referenceId: {
      type: Schema.Types.ObjectId,
    },

    // ─── Additional Data ───────────────────────────────────────────────
    /**
     * Additional data for the notification
     */
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },

    /**
     * Metadata for extensibility
     */
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },

    // ─── Timestamps ────────────────────────────────────────────────────
    /**
     * When the notification was read
     */
    readAt: {
      type: Date,
    },

    /**
     * When the notification was delivered
     */
    deliveredAt: {
      type: Date,
    },

    /**
     * Scheduled delivery time (for reminders)
     */
    scheduledFor: {
      type: Date,
      index: true,
    },

    // ─── System Fields ─────────────────────────────────────────────────
    /**
     * Soft delete flag
     */
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes for Performance ─────────────────────────────────────────
/**
 * Compound indexes optimized for notification queries
 * Critical for 100K+ users scale
 */

// Primary: Get user's notifications sorted by date
notificationSchema.index({ receiverId: 1, createdAt: -1, isDeleted: 1 });

// Get unread notifications for a user
notificationSchema.index({ receiverId: 1, status: 1, isDeleted: 1, createdAt: -1 });

// Get scheduled notifications pending delivery
notificationSchema.index({ scheduledFor: 1, status: 1, isDeleted: 1 });

// Get notifications by type for a user
notificationSchema.index({ receiverId: 1, type: 1, createdAt: -1 });

// Get notifications by priority
notificationSchema.index({ priority: 1, status: 1, scheduledFor: 1 });

// Broadcast to role
notificationSchema.index({ receiverRole: 1, status: 1, isDeleted: 1 });

// Cleanup: Find old notifications
notificationSchema.index({ readAt: 1, isDeleted: 1 });
notificationSchema.index({ createdAt: -1, isDeleted: 1 });

// ─── Virtuals ────────────────────────────────────────────────────────
/**
 * Virtual to check if notification is unread
 */
notificationSchema.virtual('isUnread').get(function () {
  const doc = this as INotificationDocument;
  return doc.status !== NotificationStatus.READ && !doc.readAt;
});

/**
 * Virtual to check if notification is scheduled
 */
notificationSchema.virtual('isScheduled').get(function () {
  const doc = this as INotificationDocument;
  return !!doc.scheduledFor && doc.scheduledFor > new Date();
});

/**
 * Virtual to check if notification is overdue
 */
notificationSchema.virtual('isOverdue').get(function () {
  const doc = this as INotificationDocument;
  return !!doc.scheduledFor && doc.scheduledFor < new Date() && doc.status === NotificationStatus.PENDING;
});

// ─── Instance Methods ────────────────────────────────────────────────
/**
 * Mark notification as read
 */
notificationSchema.methods.markAsRead = async function (): Promise<void> {
  this.status = NotificationStatus.READ;
  this.readAt = new Date();
  await this.save();
};

// ─── Static Methods ──────────────────────────────────────────────────
/**
 * Get unread count for a user
 */
notificationSchema.statics.getUnreadCount = async function (
  userId: Types.ObjectId
): Promise<number> {
  const count = await this.countDocuments({
    receiverId: userId,
    status: { $ne: NotificationStatus.READ },
    isDeleted: false,
  });
  return count;
};

/**
 * Mark all notifications as read for a user
 */
notificationSchema.statics.markAllAsRead = async function (
  userId: Types.ObjectId
): Promise<number> {
  const result = await this.updateMany(
    {
      receiverId: userId,
      status: { $ne: NotificationStatus.READ },
      isDeleted: false,
    },
    {
      $set: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    }
  );
  return result.modifiedCount;
};

/**
 * Get notifications for a user with pagination
 */
notificationSchema.statics.getUserNotifications = async function (
  userId: Types.ObjectId,
  options: any
): Promise<any> {
  const query = {
    receiverId: userId,
    isDeleted: false,
  };

  return await this.paginate(query, options);
};

/**
 * Get pending scheduled notifications
 */
notificationSchema.statics.getPendingScheduledNotifications = async function (
  beforeDate: Date = new Date()
): Promise<INotificationDocument[]> {
  const notifications = await this.find({
    scheduledFor: { $lte: beforeDate },
    status: NotificationStatus.PENDING,
    isDeleted: false,
  }).populate('receiverId senderId');

  return notifications;
};

/**
 * Cleanup old notifications
 */
notificationSchema.statics.cleanupOldNotifications = async function (
  readRetentionDays: number,
  unreadRetentionDays: number
): Promise<number> {
  const readCutoff = new Date();
  readCutoff.setDate(readCutoff.getDate() - readRetentionDays);

  const unreadCutoff = new Date();
  unreadCutoff.setDate(unreadCutoff.getDate() - unreadRetentionDays);

  // Delete old read notifications
  const readResult = await this.deleteMany({
    readAt: { $lt: readCutoff },
    isDeleted: false,
  });

  // Delete old unread notifications
  const unreadResult = await this.deleteMany({
    createdAt: { $lt: unreadCutoff },
    status: { $ne: NotificationStatus.READ },
    isDeleted: false,
  });

  return readResult.deletedCount + unreadResult.deletedCount;
};

// ─── Plugins ─────────────────────────────────────────────────────────
/**
 * Pagination plugin
 */
notificationSchema.plugin(paginate);

// ─── Transform ───────────────────────────────────────────────────────
/**
 * Transform output for API responses
 */
notificationSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret, options) {
    ret._notificationId = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

notificationSchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret, options) {
    ret._notificationId = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

// ─── Export Model ────────────────────────────────────────────────────
export const Notification = model<INotificationDocument, INotificationModel>(
  'notificationFixed',
  notificationSchema
);
