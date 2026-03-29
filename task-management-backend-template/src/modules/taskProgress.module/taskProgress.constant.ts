/**
 * TaskProgress Module Constants
 * Centralized configuration for task progress-related enums, limits, and defaults
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

/**
 * Task Progress Status Enum
 * Represents the current state of a child's progress on a task
 */
export enum TaskProgressStatus {
  NOT_STARTED = 'notStarted',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
}

/**
 * Type export from enum (for MongoDB schema validation and TypeScript)
 */
export type TTaskProgressStatus = `${TaskProgressStatus}`;

/**
 * Legacy constant exports (for backward compatibility)
 * @deprecated Use TaskProgressStatus enum instead
 */
export const TASK_PROGRESS_STATUS = TaskProgressStatus;
export const T_TASK_PROGRESS_STATUS = TaskProgressStatus;

/**
 * Default values for task progress
 */
export const TASK_PROGRESS_DEFAULTS = {
  STATUS: TASK_PROGRESS_STATUS.NOT_STARTED,
  PROGRESS_PERCENTAGE: 0,
  COMPLETED_SUBTASK_INDEXES: [] as number[],
  IS_DELETED: false,
} as const;

/**
 * Cache configuration for task progress operations
 */
export const TASK_PROGRESS_CACHE_CONFIG = {
  PREFIX: 'taskProgress',
  PROGRESS_DETAIL_TTL: 300,        // 5 minutes
  CHILDREN_PROGRESS_TTL: 180,      // 3 minutes
  TASKS_PROGRESS_TTL: 180,         // 3 minutes
  SUMMARY_TTL: 120,                // 2 minutes
} as const;

/**
 * Rate limits for task progress operations
 */
export const TASK_PROGRESS_RATE_LIMITS = {
  UPDATE_PROGRESS: {
    windowMs: 60000,               // 1 minute
    max: 30,                       // 30 updates per minute
    message: 'Too many progress updates, please slow down',
  },
  GENERAL: {
    windowMs: 60000,               // 1 minute
    max: 100,                      // 100 requests per minute
    message: 'Too many requests, please try again later',
  },
} as const;

/**
 * Progress update events for activity feed
 */
export const TASK_PROGRESS_EVENTS = {
  STARTED: 'task_started',
  SUBTASK_COMPLETED: 'subtask_completed',
  TASK_COMPLETED: 'task_completed',
} as const;
