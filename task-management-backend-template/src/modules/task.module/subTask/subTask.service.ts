import { StatusCodes } from 'http-status-codes';

import { ISubTask } from './subTask.interface';
import { GenericService } from '../../_generic-module/generic.services';
import ApiError from '../../../errors/ApiError';
import { Types } from 'mongoose';
import { Task } from '../task/task.model';
import { SubTask } from './subTask.model';
import { TaskStatus } from '../task/task.constant';

/**
 * SubTask Service
 * Handles business logic for subtask operations
 */
export class SubTaskService extends GenericService<typeof SubTask, ISubTask> {
  constructor() {
    super(SubTask);
  }

  /**
   * Create a subtask and update parent task progress
   * @param data - SubTask data
   * @param userId - User creating the subtask
   * @returns Created subtask
   */
  async createSubTask(data: Partial<ISubTask>, userId: Types.ObjectId): Promise<ISubTask> {
    // Verify parent task exists
    const parentTask = await Task.findById(data.taskId);
    if (!parentTask || parentTask.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Parent task not found');
    }

    // Create subtask
    const subtask = await this.model.create({
      ...data,
      createdById: userId,
    });

    // Update parent task's subtask count
    await this.updateParentTaskProgress(data.taskId);

    return subtask;
  }

  /** ✔️
   * Get all subtasks for a task
   * @param taskId - Parent task ID
   * @param filters - Query filters
   * @returns Array of subtasks
   */
  async getSubTasksByTaskId(taskId: string, filters: any): Promise<ISubTask[]> {
    const query: any = {
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    };

    if (filters.isCompleted !== undefined) {
      query.isCompleted = filters.isCompleted === 'true';
    }

    const subtasks = await this.model
      .find(query)
      .select('-__v')
      .sort({ order: 1 });

    return subtasks;
  }

  /**
   * Toggle subtask completion status
   * @param subtaskId - SubTask ID
   * @param isCompleted - New completion status
   * @param userId - User performing the update
   * @returns Updated subtask
   */
  async toggleSubTaskStatus(
    subtaskId: string,
    isCompleted: boolean,
    userId: Types.ObjectId
  ): Promise<ISubTask> {
    const updateData: any = {
      isCompleted,
      completedAt: isCompleted ? new Date() : undefined,
    };

    const updatedSubtask = await this.model.findByIdAndUpdate(
      subtaskId,
      updateData,
      { new: true }
    ).select('-__v');

    if (!updatedSubtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    // Update parent task progress
    await this.updateParentTaskProgress(updatedSubtask.taskId.toString());

    return updatedSubtask;
  }

  /** ✔️
   * Update subtask and recalculate parent task progress
   * @param subtaskId - SubTask ID
   * @param data - Update data
   * @returns Updated subtask
   */
  async updateSubTask(
    subtaskId: string,
    data: Partial<ISubTask>
  ): Promise<ISubTask> {
    const subtask = await this.model.findById(subtaskId);

    if (!subtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    const updatedSubtask = await this.model.findByIdAndUpdate(
      subtaskId,
      data,
      { new: true }
    ).select('-__v');

    // Update parent task progress
    await this.updateParentTaskProgress(subtask.taskId.toString());

    return updatedSubtask;
  }

  /**
   * Delete a subtask and update parent task
   * @param subtaskId - SubTask ID
   * @returns Deleted subtask
   */
  async deleteSubTask(subtaskId: string): Promise<ISubTask | null> {
    const subtask = await this.model.findById(subtaskId);

    if (!subtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    const deletedSubtask = await this.model.findByIdAndDelete(subtaskId);

    // Update parent task progress
    if (subtask.taskId) {
      await this.updateParentTaskProgress(subtask.taskId.toString());
    }

    return deletedSubtask;
  }

  /** ✔️ 🔂
   * Update parent task's subtask statistics
   * @param taskId - Parent task ID
   */
  private async updateParentTaskProgress(taskId: string): Promise<void> {
    const stats = await SubTask.getTaskCompletionStats(taskId);

    await Task.findByIdAndUpdate(taskId, {
      totalSubtasks: stats.total,
      completedSubtasks: stats.completed,
      // Auto-complete task if all subtasks are done
      status: stats.total > 0 && stats.completed === stats.total ? TaskStatus.COMPLETED : undefined,
      completedTime: stats.total > 0 && stats.completed === stats.total ? new Date() : undefined,
    });
  }

  /** 🔂
   * Get subtask statistics for a user
   * @param userId - User ID
   * @returns Subtask statistics
   * 
   * Note: This counts subtasks created by the user, not assigned to them
   * because subtasks don't have individual assignments - they belong to the task
   */
  async getUserSubTaskStatistics(userId: Types.ObjectId) {
    const stats = await this.model.aggregate([
      {
        $match: {
          createdById: new Types.ObjectId(userId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$isCompleted',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const completed = stats.find((s) => s._id === true)?.count || 0;

    return {
      total,
      completed,
      pending: total - completed,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  /** ✔️
   * Get subtasks with pagination
   * @param taskId - Parent task ID
   * @param filters - Query filters
   * @param options - Pagination options
   * @returns Paginated subtasks
   */
  async getSubTasksWithPagination(
    taskId: string,
    filters: any,
    options: any
  ) {
    const query: any = {
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    };

    if (filters.isCompleted !== undefined) {
      query.isCompleted = filters.isCompleted === 'true';
    }

    const result = await this.model.paginate(query, options);
    return result;
  }
}
