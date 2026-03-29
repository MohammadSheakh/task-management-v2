/**
 * TaskProgress Module Constants
 * Centralized configuration for task progress-related enums, limits, and defaults
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 * @migration-date 26-03-29
 */

/**
 * Task Progress Status Enum
 * Represents the current state of a child's progress on a task
 *
 * @example
 * // Child hasn't started yet
 * const status = TaskProgressStatus.NOT_STARTED;
 *
 * // Child is actively working
 * const status = TaskProgressStatus.IN_PROGRESS;
 *
 * // Child finished all subtasks
 * const status = TaskProgressStatus.COMPLETED;
 */
export enum TaskProgressStatus {
  /** Child hasn't started the task yet */
  NOT_STARTED = 'notStarted',

  /** Child is actively working on the task */
  IN_PROGRESS = 'inProgress',

  /** Child has completed all subtasks */
  COMPLETED = 'completed',
}

/**
 * Type export from enum (for MongoDB schema validation and TypeScript)
 */
export type TTaskProgressStatus = `${TaskProgressStatus}`;

/**
 * Default values for task progress
 * Used when creating new progress records
 */
export const TASK_PROGRESS_DEFAULTS = {
  /** Default status when progress is created */
  STATUS: TaskProgressStatus.NOT_STARTED,

  /** Default progress percentage (0%) */
  PROGRESS_PERCENTAGE: 0,

  /** Default empty array of completed subtask indexes */
  COMPLETED_SUBTASK_INDEXES: [] as number[],

  /** Soft delete flag (false = active) */
  IS_DELETED: false,
} as const;

/**
 * Cache configuration for task progress operations
 * Optimized for parent dashboard monitoring use case
 *
 * @note Cache TTLs are tuned for real-time monitoring:
 * - Progress detail: 5 min (frequently accessed per child)
 * - Children summary: 2 min (parent dashboard, needs freshness)
 * - Tasks progress: 3 min (child's task list)
 */
export const TASK_PROGRESS_CACHE_CONFIG = {
  /** Redis key prefix for all task progress caches */
  PREFIX: 'taskProgress',

  /** Cache TTL: Individual progress detail (5 minutes) */
  PROGRESS_DETAIL_TTL: 300,

  /** Cache TTL: All children's progress for a task (2 minutes) */
  CHILDREN_PROGRESS_TTL: 120,

  /** Cache TTL: All tasks progress for a child (3 minutes) */
  TASKS_PROGRESS_TTL: 180,

  /** Cache TTL: Summary statistics (2 minutes) */
  SUMMARY_TTL: 120,
} as const;

/**
 * Rate limits for task progress operations
 * Prevents spam and protects against abuse
 *
 * @note Uses Redis-backed sliding window rate limiting
 */
export const TASK_PROGRESS_RATE_LIMITS = {
  /** Strict limit for status updates (prevents spam) */
  UPDATE_PROGRESS: {
    windowMs: 60000, // 1 minute
    max: 30, // 30 updates per minute
    message: 'Too many progress updates, please slow down',
  },

  /** General API calls (reads, queries) */
  GENERAL: {
    windowMs: 60000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
  },
} as const;

/**
 * Progress update events for activity feed and real-time notifications
 * Used for Socket.IO event naming
 */
export const TASK_PROGRESS_EVENTS = {
  /** Child started working on task */
  STARTED: 'task_started',

  /** Child completed a subtask */
  SUBTASK_COMPLETED: 'subtask_completed',

  /** Child completed entire task */
  TASK_COMPLETED: 'task_completed',
} as const;

/**
 * Socket.IO event names for real-time parent notifications
 * Follows convention: `domain:action`
 */
export const TASK_PROGRESS_SOCKET_EVENTS = {
  /** Progress update: child started task */
  PROGRESS_STARTED: 'task-progress:started',

  /** Progress update: child completed task */
  PROGRESS_COMPLETED: 'task-progress:completed',

  /** Subtask completion event */
  SUBTASK_COMPLETED: 'task-progress:subtask-completed',

  /** Parent task status synced from children */
  PARENT_TASK_SYNCED: 'task:status-synced',
} as const;

/**
 * Activity types for family activity feed
 * Used in notification.module for activity tracking
 */
export const TASK_PROGRESS_ACTIVITY_TYPES = {
  /** Child started task */
  TASK_STARTED: 'task_started',

  /** Child completed task */
  TASK_COMPLETED: 'task_completed',

  /** Child completed subtask */
  SUBTASK_COMPLETED: 'subtask_completed',
} as const;
