import { Types } from 'mongoose';
import { TaskProgressStatus } from './taskProgress.constants';

/**
 * Task Progress Entity
 * Represents a child's progress on a specific task
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 *
 * @example
 * // Child's progress on a collaborative task
 * const progress: TaskProgressEntity = {
 *   _id: new Types.ObjectId('...'),
 *   taskId: new Types.ObjectId('...'),
 *   userId: new Types.ObjectId('...'),
 *   status: TaskProgressStatus.IN_PROGRESS,
 *   startedAt: new Date('2024-03-26'),
 *   completedSubtaskIndexes: [0, 2],
 *   progressPercentage: 67,
 *   note: 'Working on it!',
 *   createdAt: new Date('2024-03-25'),
 *   updatedAt: new Date('2024-03-26'),
 * };
 */
export class TaskProgressEntity {
  /**
   * MongoDB document ID
   */
  _id?: Types.ObjectId;

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
  status: TaskProgressStatus;

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
   *
   * @example [0, 2, 3] - Child completed subtasks at index 0, 2, and 3
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
   * Creation timestamp
   */
  createdAt?: Date;

  /**
   * Last update timestamp
   */
  updatedAt?: Date;
}

/**
 * Task Progress Summary Entity
 * Aggregated progress data for parent dashboard
 *
 * @example
 * // Summary of all children's progress on a task
 * const summary: TaskProgressSummaryEntity = {
 *   taskId: new Types.ObjectId('...'),
 *   taskTitle: 'Clean the garage',
 *   totalSubtasks: 5,
 *   childrenProgress: [
 *     {
 *       childId: new Types.ObjectId('...'),
 *       childName: 'Alice',
 *       status: TaskProgressStatus.COMPLETED,
 *       progressPercentage: 100,
 *       completedSubtaskCount: 5,
 *     },
 *     {
 *       childId: new Types.ObjectId('...'),
 *       childName: 'Bob',
 *       status: TaskProgressStatus.IN_PROGRESS,
 *       progressPercentage: 60,
 *       completedSubtaskCount: 3,
 *     },
 *   ],
 *   summary: {
 *     totalChildren: 2,
 *     notStarted: 0,
 *     inProgress: 1,
 *     completed: 1,
 *     completionRate: 50,
 *     averageProgress: 80,
 *   },
 * };
 */
export class TaskProgressSummaryEntity {
  /**
   * Task ID
   */
  taskId: Types.ObjectId;

  /**
   * Task title
   */
  taskTitle: string;

  /**
   * Total number of subtasks in the task
   */
  totalSubtasks: number;

  /**
   * Per-child progress breakdown
   */
  childrenProgress: ChildProgressEntity[];

  /**
   * Summary statistics
   */
  summary: {
    /** Total number of children assigned to the task */
    totalChildren: number;

    /** Number of children who haven't started */
    notStarted: number;

    /** Number of children currently working */
    inProgress: number;

    /** Number of children who completed */
    completed: number;

    /** Percentage of children who completed (0-100) */
    completionRate: number;

    /** Average progress percentage across all children (0-100) */
    averageProgress: number;
  };
}

/**
 * Child Progress Entity
 * Individual child's progress within a summary
 */
export class ChildProgressEntity {
  /**
   * Child user ID
   */
  childId: Types.ObjectId;

  /**
   * Child's name
   */
  childName: string;

  /**
   * Child's profile image URL (optional)
   */
  childProfileImage?: string;

  /**
   * Current progress status
   */
  status: TaskProgressStatus;

  /**
   * When the child started working
   */
  startedAt?: Date;

  /**
   * When the child completed the task
   */
  completedAt?: Date;

  /**
   * Progress percentage (0-100)
   */
  progressPercentage: number;

  /**
   * Number of subtasks completed by this child
   */
  completedSubtaskCount: number;

  /**
   * Total number of subtasks in the task
   */
  totalSubtasks: number;
}

/**
 * Task with Progress Entity
 * Combines task details with child's progress
 * Used for child's task list view
 */
export class TaskWithProgressEntity {
  /**
   * Task ID
   */
  taskId: Types.ObjectId;

  /**
   * Task title
   */
  taskTitle: string;

  /**
   * Task type (personal, singleAssignment, collaborative)
   */
  taskType: string;

  /**
   * Overall task status
   */
  status: string;

  /**
   * Child's progress status
   */
  progressStatus: TaskProgressStatus;

  /**
   * Child's progress percentage
   */
  progressPercentage: number;

  /**
   * Number of subtasks completed by this child
   */
  completedSubtaskCount: number;

  /**
   * Total number of subtasks
   */
  totalSubtasks: number;

  /**
   * When the child started working
   */
  startedAt?: Date;

  /**
   * When the child completed the task
   */
  completedAt?: Date;
}
