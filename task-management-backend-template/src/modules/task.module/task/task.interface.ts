import { Model, Types, Document } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { TaskStatus, TaskType, TaskPriority } from './task.constant';

/**
 * SubTask Interface (SEPARATE COLLECTION)
 * Subtasks are now stored in a separate SubTask collection
 * and virtually populated when retrieving tasks
 * 
 * Matches Flutter model:
 * ```dart
 * class SubTask {
 *   final String title;
 *   final bool isCompleted;
 * }
 * ```
 */
export interface ISubTask {
  _id?: Types.ObjectId;
  title: string;
  isCompleted: boolean;
  completedAt?: Date;
  order: number;
}

/**
 * Task Interface
 * Represents a task entity in the task management system
 */
export interface ITask {
  _id?: Types.ObjectId;

  // ─── Ownership & Assignment ────────────────────────────────────────
  /** User who created this task */
  createdById: Types.ObjectId;

  /** User who owns this task (for personal tasks) */
  ownerUserId?: Types.ObjectId;

  /** Type of task: personal, single assignment, or collaborative */
  taskType: `${TaskType}`;

  /** Users assigned to this task (for collaborative/single assignment) */
  assignedUserIds?: Types.ObjectId[];

  // ─── Task Details ──────────────────────────────────────────────────
  /** Title of the task (required) */
  title: string;

  /** Detailed description of what needs to be done */
  description?: string;

  /** Scheduled time for the task (e.g., "10:30 AM") */
  scheduledTime?: string;

  /** Priority level of the task */
  priority?: `${TaskPriority}`;

  // ─── Task Progress ─────────────────────────────────────────────────
  /** Current status of the task */
  status: `${TaskStatus}`;

  /** Total number of subtasks */
  totalSubtasks?: number;

  /** Number of completed subtasks */
  completedSubtasks?: number;

  /** 
   * Subtasks list (VIRTUALLY POPULATED from SubTask collection)
   * Not stored in Task document - populated via MongoDB virtual populate
   */
  subtasks?: ISubTask[];

  // ─── Timestamps ────────────────────────────────────────────────────
  /** When the task was created */
  createdAt?: Date;

  /** When the task is scheduled to start (parent sets this) */
  scheduledTime?: string;

  /** When the task was actually started by user (used for preferred time calculation) */
  startTime: Date;

  /** When the task was actually completed */
  completedTime?: Date;

  /** When the task is due */
  dueDate?: Date;

  // ─── System Fields ─────────────────────────────────────────────────
  /** Soft delete flag */
  isDeleted?: boolean;

  /** Last update timestamp */
  updatedAt?: Date;
}

/**
 * Task Document Interface
 */
export interface ITaskDocument extends ITask, Document {}

/**
 * Task Model Interface
 * Extends Mongoose Model with pagination support
 */
export interface ITaskModel extends Model<ITask> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<ITask>>;
}
