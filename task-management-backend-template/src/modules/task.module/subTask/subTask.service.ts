import { StatusCodes } from 'http-status-codes';

import { ISubTask } from './subTask.interface';
import { GenericService } from '../../_generic-module/generic.services';
import ApiError from '../../../errors/ApiError';
import { Types } from 'mongoose';
import { Task } from '../task/task.model';
import { SubTask } from './subTask.model';
import { TaskStatus, TaskType } from '../task/task.constant';
import { TaskProgress } from '../../taskProgress.module/taskProgress.model';
import { TaskProgressStatus } from '../../taskProgress.module/taskProgress.constant';
import { SubTaskProgress } from '../subTaskProgress/subTaskProgress.model';
import { logger, errorLogger } from '../../../shared/logger';

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

  /** ✔️
   * Toggle subtask completion status
   * @param subtaskId - SubTask ID
   * @param isCompleted - New completion status
   * @param userId - User performing the update
   * @returns Updated subtask
   *
   * NOTE: This method now ONLY creates/updates SubTaskProgress for the child.
   * It does NOT modify the global SubTask.isCompleted field.
   * Each child's completion is tracked independently in SubTaskProgress collection.
   */
  async toggleSubTaskStatus(
    subtaskId: string,
    isCompleted: boolean,
    userId: Types.ObjectId
  ): Promise<ISubTask> {

    console.log("hit service 🪄🪄");

    // 🆕 NEW: ONLY create/update SubTaskProgress for this child
    // Do NOT update the global SubTask document
    await this.createSubTaskProgress(
      subtaskId,
      userId,
      isCompleted
    );

    // Update parent task progress (based on this child's progress)
    await this.updateParentTaskProgressFromChildProgress(subtaskId, userId);

    // 🆕 NEW: For collaborative tasks, check if child completed ALL subtasks
    // This will update TaskProgress for this child
    const subtask = await this.model.findById(subtaskId);
    if (subtask) {
      await this.checkAndSyncChildTaskProgress(
        subtask.taskId.toString(),
        userId
      );
    }

    // Return the subtask definition (read-only)
    const updatedSubtask = await this.model.findById(subtaskId).select('-__v');

    if (!updatedSubtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    console.log("updatedSubtask :: 🧪 ", updatedSubtask);

    return updatedSubtask;
  }

  /** ✔️🆕
   * Toggle subtask completion status - V2 with improved error handling
   * @param subtaskId - SubTask ID
   * @param isCompleted - New completion status
   * @param userId - User performing the update
   * @returns Updated subtask
   *
   * IMPROVEMENTS:
   * - Better error handling for SubTaskProgress creation
   * - Validates subtask exists before processing
   * - Graceful degradation if progress tracking fails
   */
  async toggleSubTaskStatusV2(
    subtaskId: string,
    isCompleted: boolean,
    userId: Types.ObjectId
  ): Promise<ISubTask> {
    // 1. Validate subtask exists first (CRITICAL - throw if not found)
    const subtask = await this.model.findById(subtaskId);
    
    if (!subtask) {
      const errorMsg = `Subtask not found: ${subtaskId}`;
      console.error(`[SubTask V2] ${errorMsg}`);
      throw new ApiError(StatusCodes.NOT_FOUND, errorMsg);
    }

    if (subtask.isDeleted) {
      const errorMsg = `Subtask has been deleted: ${subtaskId}`;
      console.error(`[SubTask V2] ${errorMsg}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, errorMsg);
    }

    console.log("toggleSubTaskStatusV2 hit service 🪄🪄");
    console.log(`Toggling subtask ${subtaskId} to ${isCompleted} for user ${userId}`);

    // 2. Create/update SubTaskProgress for this child (with error handling)
    try {
      await this.createSubTaskProgressV2(
        subtaskId,
        userId,
        isCompleted
      );
    } catch (progressError) {
      console.error('[SubTask V2] Error creating SubTaskProgress:', progressError);
      // Don't throw - continue with main flow (graceful degradation)
    }

    // 3. Update parent task progress (based on this child's progress)
    try {
      await this.updateParentTaskProgressFromChildProgress(subtaskId, userId);
    } catch (progressUpdateError) {
      console.error('[SubTask V2] Error updating parent task progress:', progressUpdateError);
      // Don't throw - continue with main flow
    }

    // 4. For collaborative tasks, check if child completed ALL subtasks
    try {
      await this.checkAndSyncChildTaskProgress(
        subtask.taskId.toString(),
        userId
      );
    } catch (syncError) {
      console.error('[SubTask V2] Error syncing child task progress:', syncError);
      // Don't throw - continue with main flow
    }

    // 5. Return the subtask definition (read-only)
    const updatedSubtask = await this.model.findById(subtaskId).select('-__v');

    if (!updatedSubtask) {
      const errorMsg = `Subtask not found after update: ${subtaskId}`;
      console.error(`[SubTask V2] ${errorMsg}`);
      throw new ApiError(StatusCodes.NOT_FOUND, errorMsg);
    }

    console.log("updatedSubtask V2 :: 🧪 ", updatedSubtask);

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

  // ────────────────────────────────────────────────────────────────────────
  // Wrapper methods for TaskController delegation
  // These methods provide a consistent API for task.controller.ts
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Add a subtask to a task (wrapper for createSubTask)
   * @param taskId - Parent task ID
   * @param data - Subtask data (title, duration)
   * @param userId - User creating the subtask
   * @returns Created subtask
   */
  async addSubtask(
    taskId: string,
    data: { title: string; duration?: number },
    userId: Types.ObjectId
  ): Promise<ISubTask> {
    return this.createSubTask({ ...data, taskId }, userId);
  }

  /**
   * Get all subtasks for a task (alias for getSubTasksByTaskId)
   * @param taskId - Parent task ID
   * @returns Array of subtasks
   */
  async getSubtasksForTask(taskId: string): Promise<ISubTask[]> {
    return this.getSubTasksByTaskId(taskId, {});
  }

  /**
   * Get a single subtask by ID
   * @param taskId - Parent task ID (for validation)
   * @param subtaskId - Subtask ID
   * @returns Subtask details
   */
  async getSubtask(taskId: string, subtaskId: string): Promise<ISubTask | null> {
    const subtask = await this.model.findOne({
      _id: subtaskId,
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).select('-__v');

    if (!subtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    return subtask;
  }

  /**
   * Update a subtask (alias for updateSubTask)
   * @param taskId - Parent task ID (for validation)
   * @param subtaskId - Subtask ID
   * @param updateData - Update data
   * @returns Updated subtask
   */
  async updateSubtask(
    taskId: string,
    subtaskId: string,
    updateData: Partial<ISubTask>
  ): Promise<ISubTask> {
    // Validate that subtask belongs to the specified task
    const subtask = await this.model.findOne({
      _id: subtaskId,
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    });

    if (!subtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    return this.updateSubTask(subtaskId, updateData);
  }

  /**
   * Toggle subtask completion (wrapper for toggleSubTaskStatus)
   * @param taskId - Parent task ID (for validation)
   * @param subtaskId - Subtask ID
   * @param userId - User performing the toggle
   * @returns Updated subtask
   */
  async toggleSubtask(taskId: string, subtaskId: string, userId: Types.ObjectId): Promise<ISubTask> {
    // Validate that subtask belongs to the specified task
    const subtask = await this.model.findOne({
      _id: subtaskId,
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    });

    if (!subtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    return this.toggleSubTaskStatus(subtaskId, !subtask.isCompleted, userId);
  }

  /**
   * Delete a subtask (alias for deleteSubTask)
   * @param taskId - Parent task ID (for validation)
   * @param subtaskId - Subtask ID
   * @returns Deleted subtask
   */
  async deleteSubtask(taskId: string, subtaskId: string): Promise<ISubTask | null> {
    // Validate that subtask belongs to the specified task
    const subtask = await this.model.findOne({
      _id: subtaskId,
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    });

    if (!subtask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
    }

    return this.deleteSubTask(subtaskId);
  }

  /**
   * Bulk update subtasks (replaces entire list)
   * @param taskId - Parent task ID
   * @param subtasks - Array of subtask updates
   * @returns Updated subtasks with statistics
   */
  async bulkUpdateSubtasks(
    taskId: string,
    subtasks: Array<{
      _id?: string;
      title?: string;
      isCompleted?: boolean;
      order?: number;
      duration?: number;
    }>
  ): Promise<{
    subtasks: ISubTask[];
    totalSubtasks: number;
    completedSubtasks: number;
  }> {
    const { SubTask } = await import('./subTask.model');

    // Update each subtask
    const updatedSubtasks: ISubTask[] = [];

    for (const subtaskData of subtasks) {
      if (subtaskData._id) {
        const updated = await this.model.findByIdAndUpdate(
          subtaskData._id,
          {
            title: subtaskData.title,
            isCompleted: subtaskData.isCompleted,
            order: subtaskData.order,
            duration: subtaskData.duration,
            completedAt: subtaskData.isCompleted ? new Date() : undefined,
          },
          { new: true }
        ).select('-__v');

        if (updated) {
          updatedSubtasks.push(updated);
        }
      }
    }

    // Calculate statistics
    const totalSubtasks = updatedSubtasks.length;
    const completedSubtasks = updatedSubtasks.filter(st => st.isCompleted).length;

    // Update parent task progress
    await this.updateParentTaskProgress(taskId);

    return {
      subtasks: updatedSubtasks,
      totalSubtasks,
      completedSubtasks,
    };
  }

  /**
   * Check if child completed all subtasks of a collaborative task
   * If yes, update their TaskProgress to "completed"
   * @param taskId - Parent task ID
   * @param userId - Child user ID
   * @private
   */
  private async checkAndSyncChildTaskProgress(
    taskId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    try {
      // 1. Get task to verify it's collaborative
      const task = await Task.findById(taskId).lean();
      if (!task || task.taskType !== TaskType.COLLABORATIVE) {
        return; // Only for collaborative tasks
      }

      // 2. Get all subtasks for this task
      const allSubtasks = await SubTask.find({
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      }).lean();

      if (allSubtasks.length === 0) {
        return; // No subtasks
      }

      // 3. Count completed subtasks
      const completedSubtasks = allSubtasks.filter(st => st.isCompleted).length;
      const totalSubtasks = allSubtasks.length;

      // 4. Check if ALL subtasks are completed
      if (completedSubtasks === totalSubtasks) {
        // 5. Find or create TaskProgress for this child
        let taskProgress = await TaskProgress.findOne({
          taskId: new Types.ObjectId(taskId),
          userId: userId,
          isDeleted: false,
        });

        if (!taskProgress) {
          // Create new progress record
          taskProgress = new TaskProgress({
            taskId: new Types.ObjectId(taskId),
            userId: userId,
            status: TaskProgressStatus.COMPLETED,
            completedAt: new Date(),
            progressPercentage: 100,
            completedSubtaskIndexes: allSubtasks.map((_, index) => index),
          });
          await taskProgress.save();
          
          logger.info(
            `[SubTask] Created TaskProgress for child ${userId} - All ${completedSubtasks}/${totalSubtasks} subtasks completed`
          );
        } else {
          // Update existing progress
          taskProgress.status = TaskProgressStatus.COMPLETED;
          taskProgress.completedAt = new Date();
          taskProgress.progressPercentage = 100;
          taskProgress.completedSubtaskIndexes = allSubtasks.map((_, index) => index);
          await taskProgress.save();
          
          logger.info(
            `[SubTask] Updated TaskProgress for child ${userId} - All ${completedSubtasks}/${totalSubtasks} subtasks completed`
          );
        }

        // 6. Sync parent task status (check if ALL children completed)
        await this.syncParentTaskStatusWithChildrenProgress(taskId);
      }
    } catch (error) {
      errorLogger.error('[SubTask] Error in checkAndSyncChildTaskProgress:', error);
      // Don't throw - this is a background check, shouldn't break main flow
    }
  }

  /**
   * Sync parent task status based on all children's TaskProgress
   * @param taskId - Parent task ID
   * @private
   */
  private async syncParentTaskStatusWithChildrenProgress(taskId: string): Promise<void> {
    try {
      // Import TaskProgress service to reuse logic
      const { TaskProgressService } = await import('../../taskProgress.module/taskProgress.service');
      const taskProgressService = new TaskProgressService();
      
      // Use the existing sync method from TaskProgressService
      await (taskProgressService as any).syncParentTaskStatusWithChildrenProgress(taskId);
    } catch (error) {
      errorLogger.error('[SubTask] Error in syncParentTaskStatusWithChildrenProgress:', error);
      // Don't throw - this is a background check
    }
  }

  /**
   * Create or update SubTaskProgress for a child - V2 with better error handling
   * Tracks per-child subtask completion independently
   * @param subtaskId - SubTask ID
   * @param userId - Child user ID
   * @param isCompleted - Completion status
   * @private
   */
  private async createSubTaskProgressV2(
    subtaskId: string,
    userId: Types.ObjectId,
    isCompleted: boolean
  ): Promise<void> {
    // 1. Validate subtask exists
    const subtask = await this.model.findById(subtaskId);
    
    if (!subtask) {
      const errorMsg = `Subtask not found in createSubTaskProgressV2: ${subtaskId}`;
      console.error(`[SubTask V2] ${errorMsg}`);
      throw new ApiError(StatusCodes.NOT_FOUND, errorMsg);
    }

    if (subtask.isDeleted) {
      const errorMsg = `Subtask has been deleted: ${subtaskId}`;
      console.error(`[SubTask V2] ${errorMsg}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, errorMsg);
    }

    // 2. Create or update SubTaskProgress
    try {
      await SubTaskProgress.findOneAndUpdate(
        {
          taskId: new Types.ObjectId(subtask.taskId),
          subtaskId: new Types.ObjectId(subtaskId),
          userId: userId,
          isDeleted: false,
        },
        {
          taskId: new Types.ObjectId(subtask.taskId),
          subtaskId: new Types.ObjectId(subtaskId),
          userId: userId,
          isCompleted,
          completedAt: isCompleted ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );

      console.log(
        `[SubTask V2] SubTaskProgress ${isCompleted ? 'created/updated' : 'reset'} for child ${userId} on subtask ${subtaskId}`
      );
    } catch (error) {
      console.error('[SubTask V2] Error in createSubTaskProgressV2:', error);
      throw error; // Re-throw to be handled by caller
    }
  }

  /**
   * Create or update SubTaskProgress for a child
   * Tracks per-child subtask completion independently
   * @param subtaskId - SubTask ID
   * @param userId - Child user ID
   * @param isCompleted - Completion status
   * @private
   */
  private async createSubTaskProgress(
    subtaskId: string,
    userId: Types.ObjectId,
    isCompleted: boolean
  ): Promise<void> {
    try {
      const subtask = await this.model.findById(subtaskId);
      if (!subtask) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
      }

      await SubTaskProgress.findOneAndUpdate(
        {
          taskId: new Types.ObjectId(subtask.taskId),
          subtaskId: new Types.ObjectId(subtaskId),
          userId: userId,
          isDeleted: false,
        },
        {
          taskId: new Types.ObjectId(subtask.taskId),
          subtaskId: new Types.ObjectId(subtaskId),
          userId: userId,
          isCompleted,
          completedAt: isCompleted ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );

      logger.info(
        `[SubTask] SubTaskProgress ${isCompleted ? 'created/updated' : 'reset'} for child ${userId} on subtask ${subtaskId}`
      );
    } catch (error) {
      errorLogger.error('[SubTask] Error in createSubTaskProgress:', error);
      // Don't throw - background operation
    }
  }

  /**
   * Update parent task progress based on child's subtask completion
   * @param subtaskId - SubTask ID
   * @param userId - Child user ID who completed the subtask
   * @private
   */
  private async updateParentTaskProgressFromChildProgress(
    subtaskId: string,
    userId: Types.ObjectId
  ): Promise<void> {
    try {
      const subtask = await this.model.findById(subtaskId);
      if (!subtask) {
        return;
      }

      const taskId = subtask.taskId.toString();
      
      // For collaborative tasks, update based on this child's progress
      const task = await Task.findById(taskId).lean();
      if (!task || task.taskType !== TaskType.COLLABORATIVE) {
        // For non-collaborative tasks, use old logic (global subtask completion)
        await this.updateParentTaskProgressOld(taskId);
        return;
      }

      // Count completed subtasks by this child
      const completedCount = await SubTaskProgress.countDocuments({
        taskId: new Types.ObjectId(taskId),
        userId: userId,
        isCompleted: true,
        isDeleted: false,
      });

      const totalSubtasks = await SubTask.countDocuments({
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      });

      // Update TaskProgress for this child
      const taskProgress = await TaskProgress.findOne({
        taskId: new Types.ObjectId(taskId),
        userId: userId,
        isDeleted: false,
      });

      if (taskProgress) {
        const progressPercentage = totalSubtasks > 0 
          ? Math.round((completedCount / totalSubtasks) * 100) 
          : 0;

        taskProgress.progressPercentage = progressPercentage;
        
        // If all subtasks completed by this child
        if (completedCount === totalSubtasks && totalSubtasks > 0) {
          taskProgress.status = TaskProgressStatus.COMPLETED;
          taskProgress.completedAt = new Date();
          taskProgress.completedSubtaskIndexes = Array.from({ length: totalSubtasks }, (_, i) => i);
        } else if (completedCount > 0) {
          taskProgress.status = TaskProgressStatus.IN_PROGRESS;
        }

        await taskProgress.save();

        // Sync parent task status
        await this.syncParentTaskStatusWithChildrenProgress(taskId);
      }
    } catch (error) {
      errorLogger.error('[SubTask] Error in updateParentTaskProgressFromChildProgress:', error);
      // Don't throw - background operation
    }
  }

  /**
   * Old method for non-collaborative tasks
   * @param taskId - Parent task ID
   * @private
   */
  private async updateParentTaskProgressOld(taskId: string): Promise<void> {
    const stats = await SubTask.getTaskCompletionStats(taskId);

    await Task.findByIdAndUpdate(taskId, {
      totalSubtasks: stats.total,
      completedSubtasks: stats.completed,
      // Auto-complete task if all subtasks are done
      status: stats.total > 0 && stats.completed === stats.total ? TaskStatus.COMPLETED : undefined,
      completedTime: stats.total > 0 && stats.completed === stats.total ? new Date() : undefined,
    });
  }
}
