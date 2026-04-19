//@ts-ignore
import { model, Schema, Types, Document } from 'mongoose';
import { ITaskReminder, ITaskReminderDocument, ITaskReminderModel } from './taskReminder.interface';
import { TaskReminderTrigger, TaskReminderStatus, TaskReminderFrequency, TASK_REMINDER_LIMITS, DEFAULT_CHANNELS_BY_TRIGGER } from './taskReminder.constant';
import paginate from '../../../common/plugins/paginate';

/**
 * TaskReminder Schema
 * Represents a scheduled reminder for a task
 *
 * Design Principles:
 * - Supports one-time and recurring reminders
 * - BullMQ integration for scheduled delivery
 * - Automatic rescheduling for recurring reminders
 * - Optimized for high-volume reminder workflows
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
const taskReminderSchema = new Schema<ITaskReminderDocument>(
  {
    // ─── References ────────────────────────────────────────────────────
    /**
     * Reference to the task
     */
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task is required'],
      index: true,
    },

    /**
     * Reference to the user who will receive the reminder
     */
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },

    /**
     * Reference to the user who created the reminder
     */
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },

    // ─── Reminder Configuration ────────────────────────────────────────
    /**
     * Reminder trigger type
     */
    triggerType: {
      type: String,
      enum: Object.values(TaskReminderTrigger),
      required: [true, 'Trigger type is required'],
    },

    /**
     * When to send the reminder
     */
    reminderTime: {
      type: Date,
      required: [true, 'Reminder time is required'],
      index: true,
    },

    /**
     * Custom message (optional)
     */
    customMessage: {
      type: String,
      trim: true,
      maxlength: [TASK_REMINDER_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH, `Message cannot exceed ${TASK_REMINDER_LIMITS.MAX_CUSTOM_MESSAGE_LENGTH} characters`],
    },

    /**
     * Delivery channels
     */
    channels: {
      type: [String],
      enum: ['in_app', 'email', 'push', 'sms'],
      required: [true, 'At least one channel is required'],
      default: ['in_app'],
    },

    // ─── Status & Tracking ─────────────────────────────────────────────
    /**
     * Reminder status
     */
    status: {
      type: String,
      enum: Object.values(TaskReminderStatus),
      required: [true, 'Reminder status is required'],
      default: TaskReminderStatus.PENDING,
      index: true,
    },

    /**
     * Frequency for recurring reminders
     */
    frequency: {
      type: String,
      enum: Object.values(TaskReminderFrequency),
      required: [true, 'Frequency is required'],
      default: TaskReminderFrequency.ONCE,
    },

    /**
     * Next scheduled time (for recurring)
     */
    nextReminderTime: {
      type: Date,
      index: true,
    },

    /**
     * BullMQ job ID for tracking
     */
    jobId: {
      type: String,
    },

    /**
     * Number of times this reminder has been sent
     */
    sentCount: {
      type: Number,
      required: [true, 'Sent count is required'],
      default: 0,
    },

    /**
     * Maximum times to send (for recurring)
     */
    maxOccurrences: {
      type: Number,
      default: 1,
      min: [1, 'Minimum 1 occurrence required'],
      max: [TASK_REMINDER_LIMITS.MAX_RECURRING_OCCURRENCES, `Maximum ${TASK_REMINDER_LIMITS.MAX_RECURRING_OCCURRENCES} occurrences allowed`],
    },

    /**
     * Additional data
     */
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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
 * Compound indexes optimized for reminder queries
 */

// Find pending reminders due before a date
taskReminderSchema.index({ reminderTime: 1, status: 1, isDeleted: 1 });

// Find reminders for a task
taskReminderSchema.index({ taskId: 1, status: 1, isDeleted: 1 });

// Find reminders for a user
taskReminderSchema.index({ userId: 1, status: 1, reminderTime: -1 });

// Find recurring reminders needing rescheduling
taskReminderSchema.index({ nextReminderTime: 1, frequency: 1, status: 1, isDeleted: 1 });

// ─── Virtuals ────────────────────────────────────────────────────────
/**
 * Virtual to check if reminder is due
 */
taskReminderSchema.virtual('isDue').get(function () {
  const doc = this as ITaskReminderDocument;
  return doc.reminderTime <= new Date() && doc.status === TaskReminderStatus.PENDING;
});

/**
 * Virtual to check if reminder is recurring
 */
taskReminderSchema.virtual('isRecurring').get(function () {
  const doc = this as ITaskReminderDocument;
  return doc.frequency !== TaskReminderFrequency.ONCE;
});

/**
 * Virtual to check if reminder can be sent again
 */
taskReminderSchema.virtual('canSendAgain').get(function () {
  const doc = this as ITaskReminderDocument;
  return doc.isRecurring && doc.sentCount < doc.maxOccurrences!;
});

// ─── Instance Methods ────────────────────────────────────────────────
/**
 * Calculate next occurrence for recurring reminder
 */
taskReminderSchema.methods.calculateNextOccurrence = function (): Date | null {
  const doc = this as ITaskReminderDocument;

  if (!doc.isRecurring) {
    return null;
  }

  const currentDate = doc.nextReminderTime || doc.reminderTime;
  const nextDate = new Date(currentDate);

  switch (doc.frequency) {
    case TaskReminderFrequency.DAILY:
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case TaskReminderFrequency.WEEKLY:
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case TaskReminderFrequency.MONTHLY:
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    default:
      return null;
  }

  return nextDate;
};

/**
 * Mark reminder as sent and reschedule if recurring
 */
taskReminderSchema.methods.markAsSent = async function (): Promise<void> {
  const doc = this as ITaskReminderDocument;
  
  doc.status = TaskReminderStatus.SENT;
  doc.sentCount += 1;

  /*--------------- 🧹🪄🎩
  if (doc.isRecurring && doc.sentCount < doc.maxOccurrences!) {
    const nextOccurrence = doc.calculateNextOccurrence();
    if (nextOccurrence) {
      doc.nextReminderTime = nextOccurrence;
      doc.reminderTime = nextOccurrence;
      doc.status = TaskReminderStatus.PENDING;
    }
  }
  ----------------*/

  await this.save();
};

// ─── Static Methods ──────────────────────────────────────────────────
/**
 * Get pending reminders due before a date
 */
taskReminderSchema.statics.getPendingReminders = async function (
  beforeDate: Date = new Date()
): Promise<ITaskReminderDocument[]> {
  const reminders = await this.find({
    reminderTime: { $lte: beforeDate },
    status: TaskReminderStatus.PENDING,
    isDeleted: false,
  }).populate('taskId userId createdByUserId');

  return reminders;
};

/**
 * Count reminders for a task
 */
taskReminderSchema.statics.countRemindersForTask = async function (
  taskId: Types.ObjectId
): Promise<number> {
  const count = await this.countDocuments({
    taskId,
    isDeleted: false,
  });
  return count;
};

/**
 * Cancel all reminders for a task
 */
taskReminderSchema.statics.cancelRemindersForTask = async function (
  taskId: Types.ObjectId
): Promise<number> {
  const result = await this.updateMany(
    {
      taskId,
      status: TaskReminderStatus.PENDING,
      isDeleted: false,
    },
    {
      $set: {
        status: TaskReminderStatus.CANCELLED,
      },
    }
  );
  return result.modifiedCount;
};

// ─── Pre-save Hook ───────────────────────────────────────────────────
/**
 * Set default channels based on trigger type
 */
taskReminderSchema.pre('save', function (next) {
  const doc = this as ITaskReminderDocument;
  
  // Set default channels if not provided
  if (!this.isModified('channels') && !doc.channels.length) {
    doc.channels = DEFAULT_CHANNELS_BY_TRIGGER[doc.triggerType as keyof typeof DEFAULT_CHANNELS_BY_TRIGGER] || ['in_app'];
  }

  // Set maxOccurrences for one-time reminders
  if (doc.frequency === TaskReminderFrequency.ONCE && !doc.maxOccurrences) {
    doc.maxOccurrences = 1;
  }

  next();
});

// ─── Plugins ─────────────────────────────────────────────────────────
/**
 * Pagination plugin
 */
taskReminderSchema.plugin(paginate);

// ─── Transform ───────────────────────────────────────────────────────
/**
 * Transform output for API responses
 */
taskReminderSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret, options) {
    ret._reminderId = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

// ─── Export Model ────────────────────────────────────────────────────
export const TaskReminder = model<ITaskReminderDocument, ITaskReminderModel>(
  'TaskReminder',
  taskReminderSchema
);
