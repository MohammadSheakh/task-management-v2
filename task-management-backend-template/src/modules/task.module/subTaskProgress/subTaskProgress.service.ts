//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { GenericService } from '../../_generic-module/generic.services';
import { SubTaskProgress } from './subTaskProgress.model';
import { ISubTaskProgress } from './subTaskProgress.interface';
import ApiError from '../../../errors/ApiError';
import { SubTask } from '../subTask/subTask.model';
import { Task } from '../task/task.model';
import { TaskType } from '../task/task.constant';
import { logger, errorLogger } from '../../../shared/logger';

/**
 * SubTask Progress Service
 * Tracks individual child's completion of each subtask in collaborative tasks
 * 
 * Features:
 * - Per-child subtask completion tracking
 * - Independent progress for each child
 * - Parent visibility into who completed what
 * - Auto-cleanup when tasks/subtasks deleted
 * 
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class SubTaskProgressService extends GenericService<
  typeof SubTaskProgress,
  ISubTaskProgress
> {
  constructor() {
    super(SubTaskProgress);
  }

  /**
   * Create or update subtask progress for a child
   * @param taskId - Parent task ID
   * @param subtaskId - SubTask ID
   * @param userId - Child user ID
   * @param isCompleted - Completion status
   * @returns Created/updated progress record
   */
  async createOrUpdateProgress(
    taskId: string,
    subtaskId: string,
    userId: Types.ObjectId,
    isCompleted: boolean
  ): Promise<ISubTaskProgress> {
    // Verify task and subtask exist
    const [task, subtask] = await Promise.all([
      Task.findById(taskId),
      SubTask.findById(subtaskId),
    ]);

    if (!task || task.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    if (!subtask || subtask.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    // Find existing progress or create new
    let progress = await this.model.findOne({
      taskId: new Types.ObjectId(taskId),
      subtaskId: new Types.ObjectId(subtaskId),
      userId: userId,
      isDeleted: false,
    });

    if (progress) {
      // Update existing
      progress.isCompleted = isCompleted;
      progress.completedAt = isCompleted ? new Date() : undefined;
      await progress.save();
      
      logger.info(
        `[SubTaskProgress] Updated progress for child ${userId} on subtask ${subtaskId}: ${isCompleted ? 'completed' : 'not completed'}`
      );
    } else {
      // Create new
      progress = await this.model.create({
        taskId: new Types.ObjectId(taskId),
        subtaskId: new Types.ObjectId(subtaskId),
        userId: userId,
        isCompleted,
        completedAt: isCompleted ? new Date() : undefined,
      });
      
      logger.info(
        `[SubTaskProgress] Created progress for child ${userId} on subtask ${subtaskId}: ${isCompleted ? 'completed' : 'not completed'}`
      );
    }

    return progress;
  }

  /**
   * Get child's progress on all subtasks for a task
   * @param taskId - Parent task ID
   * @param userId - Child user ID
   * @returns Array of progress records
   */
  async getChildProgress(taskId: string, userId: Types.ObjectId): Promise<ISubTaskProgress[]> {
    return await this.model.find({
      taskId: new Types.ObjectId(taskId),
      userId: userId,
      isDeleted: false,
    }).populate('subtaskId', 'title order duration');
  }

  /**
   * Get all children's progress for a specific subtask
   * @param subtaskId - SubTask ID
   * @returns Progress records with user info
   */
  async getSubtaskProgress(subtaskId: string): Promise<any[]> {
    return await SubTaskProgress.getAllChildrenProgressForSubtask(subtaskId);
  }

  /**
   * Get completion stats for a subtask
   * @param subtaskId - SubTask ID
   * @returns Completion statistics
   */
  async getCompletionStats(subtaskId: string) {
    return await SubTaskProgress.getSubtaskCompletionStats(subtaskId);
  }

  /**
   * Mark subtask as completed by child
   * @param taskId - Parent task ID
   * @param subtaskId - SubTask ID
   * @param userId - Child user ID
   * @returns Updated progress record
   */
  async completeSubtask(
    taskId: string,
    subtaskId: string,
    userId: Types.ObjectId
  ): Promise<ISubTaskProgress> {
    return this.createOrUpdateProgress(taskId, subtaskId, userId, true);
  }

  /**
   * Mark subtask as not completed by child
   * @param taskId - Parent task ID
   * @param subtaskId - SubTask ID
   * @param userId - Child user ID
   * @returns Updated progress record
   */
  async uncompleteSubtask(
    taskId: string,
    subtaskId: string,
    userId: Types.ObjectId
  ): Promise<ISubTaskProgress> {
    return this.createOrUpdateProgress(taskId, subtaskId, userId, false);
  }

  /**
   * Get count of completed subtasks by a child
   * @param taskId - Parent task ID
   * @param userId - Child user ID
   * @returns Count of completed subtasks
   */
  async getCompletedCount(taskId: string, userId: Types.ObjectId): Promise<number> {
    return await this.model.countDocuments({
      taskId: new Types.ObjectId(taskId),
      userId: userId,
      isCompleted: true,
      isDeleted: false,
    });
  }

  /**
   * Check if child completed all subtasks
   * @param taskId - Parent task ID
   * @param userId - Child user ID
   * @returns True if all subtasks completed
   */
  async hasChildCompletedAllSubtasks(
    taskId: string,
    userId: Types.ObjectId
  ): Promise<boolean> {
    // Get total subtasks for the task
    const totalSubtasks = await SubTask.countDocuments({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    });

    if (totalSubtasks === 0) {
      return false;
    }

    // Get completed count
    const completedCount = await this.getCompletedCount(taskId, userId);

    return completedCount === totalSubtasks;
  }
}
