/**
 * TaskReminder Module Constants
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

import { NotificationChannel } from '../notification/notification.constant';

/**
 * Task Reminder Trigger Type Enum
 */
export enum TaskReminderTrigger {
  BEFORE_DEADLINE = 'before_deadline',
  AT_DEADLINE = 'at_deadline',
  AFTER_DEADLINE = 'after_deadline',
  CUSTOM_TIME = 'custom_time',
  RECURRING = 'recurring',
}

/**
 * Task Reminder Status Enum
 */
export enum TaskReminderStatus {
  PENDING = 'pending',
  SENT = 'sent',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
}

/**
 * Task Reminder Frequency Enum
 */
export enum TaskReminderFrequency {
  ONCE = 'once',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

/**
 * Type exports from enums
 */
export type TTaskReminderTrigger = `${TaskReminderTrigger}`;
export type TTaskReminderStatus = `${TaskReminderStatus}`;
export type TTaskReminderFrequency = `${TaskReminderFrequency}`;
export type TNotificationChannel = `${NotificationChannel}`;

/**
 * Legacy constant exports (for backward compatibility)
 * @deprecated Use TaskReminderTrigger, TaskReminderStatus, etc. enums instead
 */
export const TASK_REMINDER_TRIGGER = TaskReminderTrigger;
export const TASK_REMINDER_STATUS = TaskReminderStatus;
export const TASK_REMINDER_FREQUENCY = TaskReminderFrequency;

/**
 * Task Reminder Limits
 */
export const TASK_REMINDER_LIMITS = {
  /**
   * Maximum reminders per task
   */
  MAX_REMINDERS_PER_TASK: 10,

  /**
   * Maximum recurring occurrences
   */
  MAX_RECURRING_OCCURRENCES: 52, // 1 year of weekly reminders

  /**
   * Minimum time between reminders (minutes)
   */
  MIN_REMINDER_INTERVAL_MINUTES: 15,

  /**
   * Default reminder hours before deadline
   */
  DEFAULT_REMINDER_HOURS_BEFORE: [24, 1],

  /**
   * Maximum custom message length
   */
  MAX_CUSTOM_MESSAGE_LENGTH: 500,
} as const;

/**
 * BullMQ Queue Configuration
 */
export const REMINDER_QUEUE_CONFIG = {
  /**
   * Queue name for task reminders
   */
  QUEUE_NAME: 'task-reminders-queue',

  /**
   * Job attempts
   */
  JOB_ATTEMPTS: 3,

  /**
   * Backoff delay (ms)
   */
  BACKOFF_DELAY: 5000,

  /**
   * Default job timeout (ms)
   */
  JOB_TIMEOUT: 30000,

  /**
   * Remove job after completion (seconds)
   */
  REMOVE_ON_COMPLETE: 86400, // 24 hours
} as const;

/**
 * Default Channels by Priority
 */
export const DEFAULT_CHANNELS_BY_TRIGGER = {
  before_deadline: ['in_app', 'email'] as ('in_app' | 'email' | 'push' | 'sms')[],
  at_deadline: ['in_app', 'email', 'push'] as ('in_app' | 'email' | 'push' | 'sms')[],
  after_deadline: ['in_app', 'email', 'push'] as ('in_app' | 'email' | 'push' | 'sms')[],
  custom_time: ['in_app'] as ('in_app' | 'email' | 'push' | 'sms')[],
  recurring: ['in_app'] as ('in_app' | 'email' | 'push' | 'sms')[],
} as const;

/**
 * Reminder Templates
 */
export const REMINDER_TEMPLATES = {
  BEFORE_DEADLINE: {
    title: 'Task Reminder: Deadline Approaching',
    subTitle: 'Your task "{taskTitle}" is due {timeRemaining}',
  },
  AT_DEADLINE: {
    title: 'Task Due Now',
    subTitle: 'Your task "{taskTitle}" is due now',
  },
  AFTER_DEADLINE: {
    title: 'Task Overdue',
    subTitle: 'Your task "{taskTitle}" is overdue',
  },
  CUSTOM: {
    title: 'Task Reminder',
    subTitle: '{customMessage}',
  },
} as const;
