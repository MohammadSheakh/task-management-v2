import { Types, Document, Model } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { TaskProgressStatus } from './taskProgress.constant';

/**
 * Task Progress Status Type
 * Derived from TaskProgressStatus enum
 */
export type TTaskProgressStatus = `${TaskProgressStatus}`;

/**
 * Task Progress Interface
 * Tracks each child's independent progress on a collaborative task
 * 
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export interface ITaskProgress {
  /**
   * Reference to the task
   */
  taskId: Types.ObjectId;

  /**
   * Reference to the child user
   * This is the child whose progress we're tracking
   */
  userId: Types.ObjectId;

  /**
   * Current progress status
   * - notStarted: Child hasn't started the task yet
   * - inProgress: Child is actively working on the task
   * - completed: Child has completed all subtasks
   */
  status: TTaskProgressStatus;

  /**
   * When the child started working on the task
   * Set when status changes from 'notStarted' to 'inProgress'
   */
  startedAt?: Date;

  /**
   * When the child completed the task
   * Set when status becomes 'completed'
   */
  completedAt?: Date;

  /**
   * Array of subtask indexes completed by this child
   * For embedded subtasks in the parent Task document
   * Example: [0, 2, 3] means child completed subtasks at index 0, 2, and 3
   */
  completedSubtaskIndexes: number[];

  /**
   * Progress percentage (0-100)
   * Calculated as: (completedSubtaskIndexes.length / totalSubtasks) * 100
   */
  progressPercentage: number;

  /**
   * Optional note or comment from the child
   */
  note?: string;

  /**
   * Soft delete flag
   */
  isDeleted: boolean;

  /**
   * Creation timestamp
   */
  createdAt?: Date;

  /**
   * Last update timestamp
   */
  updatedAt?: Date;
}

/**
 * Task Progress Document Interface
 * Extends ITaskProgress with Mongoose Document methods
 */
export interface ITaskProgressDocument extends ITaskProgress, Document {
  _id: Types.ObjectId;
  
  /**
   * Check if this progress record is for a specific user
   */
  isForUser(userId: string): boolean;
  
  /**
   * Check if task is completed by this child
   */
  isCompleted(): boolean;
  
  /**
   * Update progress percentage based on completed subtasks
   */
  updateProgressPercentage(totalSubtasks: number): void;
}

/**
 * Task Progress Model Interface
 * Extends Model with custom static methods
 */
export interface ITaskProgressModel extends Model<ITaskProgressDocument> {
  /**
   * Get progress for a specific task and user
   */
  getProgress(
    taskId: Types.ObjectId,
    userId: Types.ObjectId
  ): Promise<ITaskProgressDocument | null>;
  
  /**
   * Get all children's progress for a task
   */
  getAllChildrenProgress(taskId: Types.ObjectId): Promise<ITaskProgressDocument[]>;
  
  /**
   * Get all tasks progress for a child
   */
  getAllTasksProgress(userId: Types.ObjectId): Promise<ITaskProgressDocument[]>;
  
  /**
   * Count children who completed a task
   */
  countCompleted(taskId: Types.ObjectId): Promise<number>;
  
  /**
   * Count children in progress
   */
  countInProgress(taskId: Types.ObjectId): Promise<number>;
  
  /**
   * Count children who haven't started
   */
  countNotStarted(taskId: Types.ObjectId): Promise<number>;
}

/**
 * Task Progress Query Options Interface
 * For typed pagination and filtering
 */
export interface ITaskProgressQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  populate?: Array<{ path: string; select?: string }>;
  select?: string;
  status?: TTaskProgressStatus;
}

/**
 * Task Progress Summary Interface
 * Aggregated progress data for parent dashboard
 */
export interface ITaskProgressSummary {
  taskId: Types.ObjectId;
  taskTitle: string;
  totalSubtasks: number;
  
  // Per-child breakdown
  childrenProgress: Array<{
    childId: Types.ObjectId;
    childName: string;
    status: TTaskProgressStatus;
    startedAt?: Date;
    completedAt?: Date;
    progressPercentage: number;
    completedSubtaskCount: number;
    totalSubtasks: number;
  }>;
  
  // Summary statistics
  summary: {
    totalChildren: number;
    notStarted: number;
    inProgress: number;
    completed: number;
    completionRate: number;
    averageProgress: number;
  };
}
