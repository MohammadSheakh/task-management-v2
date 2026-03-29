/**
 * SubTask Module Constants
 * Centralized configuration for subtask-related enums and defaults
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

/**
 * SubTask Status Enum
 * Represents the completion state of a subtask
 */
export enum SubTaskStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

/**
 * Type export from enum
 */
export type TSubTaskStatus = `${SubTaskStatus}`;

/**
 * Legacy export (for backward compatibility)
 * @deprecated Use SubTaskStatus enum instead
 */
export const T_SUBTASK_STATUS = SubTaskStatus;
