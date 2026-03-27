import { Document, Types } from 'mongoose';
import { TTaskReminderTrigger, TTaskReminderStatus, TTaskReminderFrequency, TNotificationChannel } from './taskReminder.constant';

/**
 * Task Reminder Interface
 * Defines the structure of a TaskReminder document
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export interface ITaskReminder {
  /**
   * Reference to the task
   */
  taskId: Types.ObjectId;

  /**
   * Reference to the user who will receive the reminder
   */
  userId: Types.ObjectId;

  /**
   * Reference to the user who created the reminder
   */
  createdByUserId: Types.ObjectId;

  /**
   * Reminder trigger type
   */
  triggerType: TTaskReminderTrigger;

  /**
   * When to send the reminder
   */
  reminderTime: Date;

  /**
   * Custom message (optional)
   */
  customMessage?: string;

  /**
   * Delivery channels
   */
  channels: TNotificationChannel[];

  /**
   * Reminder status
   */
  status: TTaskReminderStatus;

  /**
   * Frequency for recurring reminders
   */
  frequency: TTaskReminderFrequency;

  /**
   * Next scheduled time (for recurring)
   */
  nextReminderTime?: Date;

  /**
   * BullMQ job ID for tracking
   */
  jobId?: string;

  /**
   * Number of times this reminder has been sent
   */
  sentCount: number;

  /**
   * Maximum times to send (for recurring)
   */
  maxOccurrences?: number;

  /**
   * Additional data
   */
  metadata?: Record<string, any>;

  /**
   * Soft delete flag
   */
  isDeleted: boolean;
}

/**
 * Task Reminder Document Interface
 */
export interface ITaskReminderDocument extends ITaskReminder, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task Reminder Model Interface
 */
export interface ITaskReminderModel extends Document {
  /**
   * Get pending reminders due before a date
   */
  getPendingReminders(beforeDate?: Date): Promise<ITaskReminderDocument[]>;

  /**
   * Count reminders for a task
   */
  countRemindersForTask(taskId: Types.ObjectId): Promise<number>;

  /**
   * Cancel all reminders for a task
   */
  cancelRemindersForTask(taskId: Types.ObjectId): Promise<number>;
}
