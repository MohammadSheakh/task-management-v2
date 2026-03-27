//@ts-ignore
import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';

/**
 * SubTask Progress Interface
 * Tracks individual child's completion of each subtask
 * 
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export interface ISubTaskProgress {
  _id?: Types.ObjectId;
  
  // ─── References ──────────────────────────────────────────────────
  /**
   * Parent task ID
   */
  taskId: Types.ObjectId;
  
  /**
   * SubTask ID
   */
  subtaskId: Types.ObjectId;
  
  /**
   * Child user ID who completed the subtask
   */
  userId: Types.ObjectId;
  
  // ─── Completion Status ───────────────────────────────────────────
  /**
   * Whether the child completed this subtask
   */
  isCompleted: boolean;
  
  /**
   * Timestamp when completed
   */
  completedAt?: Date;
  
  /**
   * Optional note from the child
   */
  note?: string;
  
  // ─── Metadata ────────────────────────────────────────────────────
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * SubTask Progress Model Interface
 */
export interface ISubTaskProgressModel extends Model<ISubTaskProgress> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<ISubTaskProgress>>;
  
  /**
   * Get completion stats for a specific subtask
   */
  getSubtaskCompletionStats: (
    subtaskId: string
  ) => Promise<{
    total: number;
    completed: number;
    notCompleted: number;
    completionPercentage: number;
  }>;
  
  /**
   * Get all children's progress for a task
   */
  getAllChildrenProgress: (
    taskId: string
  ) => Promise<Array<{
    userId: Types.ObjectId;
    userName: string;
    userEmail: string;
    subtaskId: Types.ObjectId;
    subtaskTitle: string;
    subtaskOrder: number;
    isCompleted: boolean;
    completedAt?: Date;
    note?: string;
  }>>;
}
