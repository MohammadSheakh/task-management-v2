//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { GenericService } from '../_generic-module/generic.services';
import { TaskProgress } from './taskProgress.model';
import {
  ITaskProgress,
  ITaskProgressDocument,
  ITaskProgressSummary,
} from './taskProgress.interface';
import ApiError from '../../errors/ApiError';
import { Task } from '../task.module/task/task.model';
import {
  TaskProgressStatus,
  TASK_PROGRESS_CACHE_CONFIG,
  TASK_PROGRESS_EVENTS,
  TTaskProgressStatus,
} from './taskProgress.constant';
import { redisClient } from '../../helpers/redis/redis';
import { errorLogger, logger } from '../../shared/logger';
import { User } from '../user.module/user/user.model';
import { TaskType, TaskStatus } from '../task.module/task/task.constant';
import { NotificationService } from '../notification.module/notification/notification.service';
import { socketService } from '../../helpers/socket/socketForChatV3';
import { ACTIVITY_TYPE } from '../notification.module/notification/notification.constant';

const notificationService = new NotificationService();

/**
 * Task Progress Service
 * Tracks each child's independent progress on collaborative tasks
 *
 * Features:
 * - Per-child progress tracking
 * - Subtask completion tracking
 * - Redis caching for performance
 * - Automatic notifications to parents
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class TaskProgressService extends GenericService<
  typeof TaskProgress,
  ITaskProgressDocument
> {
  constructor() {
    super(TaskProgress);
  }

  /**
   * Cache Key Generator
   */
  private getCacheKey(type: string, taskId?: string, userId?: string): string {
    const prefix = TASK_PROGRESS_CACHE_CONFIG.PREFIX;
    if (type === 'detail' && taskId && userId) {
      return `${prefix}:task:${taskId}:user:${userId}`;
    }
    if (type === 'children' && taskId) {
      return `${prefix}:task:${taskId}:children`;
    }
    if (type === 'tasks' && userId) {
      return `${prefix}:user:${userId}:tasks`;
    }
    if (type === 'summary' && taskId) {
      return `${prefix}:task:${taskId}:summary`;
    }
    return `${prefix}:unknown`;
  }

  /**
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error in TaskProgressService:', error);
      return null;
    }
  }

  /**
   * Set in Cache
   */
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in TaskProgressService:', error);
    }
  }

  /**
   * Invalidate Cache
   */
  private async invalidateCache(
    taskId?: string,
    userId?: string,
  ): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      if (taskId && userId) {
        keysToDelete.push(this.getCacheKey('detail', taskId, userId));
      }
      if (taskId) {
        keysToDelete.push(this.getCacheKey('children', taskId));
        keysToDelete.push(this.getCacheKey('summary', taskId));
      }
      if (userId) {
        keysToDelete.push(this.getCacheKey('tasks', userId));
      }

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
        logger.info(`Invalidated ${keysToDelete.length} cache keys`);
      }
    } catch (error) {
      errorLogger.error('Cache invalidation error:', error);
    }
  }

  /**✔️☑️
   * Create or update task progress for a child
   * Called when child is assigned to a collaborative task
   * Also called internally when child starts or completes a task (to auto-create progress record if it doesn't exist)
   * task.service.ts -> createTask -> if collaborative -> taskProgressService.bulkCreateForTask(taskId, assignedUserIds)
   * taskProgress.controller.ts -> updateProgressStatus -> if progress record doesn't exist
   *  -> taskProgressService.createOrUpdateProgress(taskId, userId, status)
   * This ensures that progress tracking is always set up for children on collaborative tasks, and simplifies the
   *  logic in the controller by auto-handling progress record creation.
   */
  async createOrUpdateProgress(
    taskId: string,
    userId: string,
    status: TTaskProgressStatus = TaskProgressStatus.NOT_STARTED,
  ): Promise<ITaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    // Check if progress record already exists
    const existingProgress = await this.model.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (existingProgress) {
      // Update existing progress
      existingProgress.status = status;
      await existingProgress.save();
      return existingProgress;
    }

    // Create new progress record
    const progress = await this.model.create({
      taskId: taskObjectId,
      userId: userObjectId,
      status,
      completedSubtaskIndexes: [],
      progressPercentage: 0,
    });

    return progress;
  }

  /**
   * Update progress status (started, completed)
   */
  async updateProgressStatus(
    taskId: string,
    userId: string,
    status: TTaskProgressStatus,
    note?: string,
  ): Promise<ITaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    // Find or create progress record
    let progress = await this.model.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (!progress) {
      // Auto-create if doesn't exist
      progress = await this.createOrUpdateProgress(taskId, userId, status);
    }

    // Update status
    const oldStatus = progress.status;
    progress.status = status;

    if (note) {
      progress.note = note;
    }

    // Set timestamps based on status
    if (status === TaskProgressStatus.IN_PROGRESS && !progress.startedAt) {
      progress.startedAt = new Date();
    }

    if (status === TaskProgressStatus.COMPLETED && !progress.completedAt) {
      progress.completedAt = new Date();
    }

    await progress.save();

    // Send notification to parent if task completed
    if (
      status === TaskProgressStatus.COMPLETED &&
      oldStatus !== TaskProgressStatus.COMPLETED
    ) {
      await this.notifyParentOnTaskCompletion(taskId, userId);
    }

    // 🚀 NEW: Emit real-time progress update to parent
    await this.emitProgressUpdateToParent(taskId, userId, status, oldStatus);

    // 🆕 NEW: Sync parent task status based on all children's progress
    if (
      status === TaskProgressStatus.COMPLETED &&
      oldStatus !== TaskProgressStatus.COMPLETED
    ) {
      await this.syncParentTaskStatusWithChildrenProgress(taskId);
    } else if (
      status === TaskProgressStatus.IN_PROGRESS &&
      oldStatus === TaskProgressStatus.NOT_STARTED
    ) {
      // Child started working → update parent to "inProgress"
      await this.syncParentTaskStatusWithChildrenProgress(taskId);
    }

    // Invalidate cache
    await this.invalidateCache(taskId, userId);

    return progress;
  }

  /** ✔️
   * Check if all children completed a collaborative task
   * If yes, auto-complete the parent task
   * Also checks if ANY child started → update parent to "inProgress"
   * @param taskId - The task ID to check
   * @private
   */
  private async syncParentTaskStatusWithChildrenProgress(taskId: string): Promise<void> {
    try {
      // 1. Get task to verify it's collaborative
      const task = await Task.findById(taskId).lean();
      if (!task || task.taskType !== TaskType.COLLABORATIVE) {
        return; // Only for collaborative tasks
      }

      // 2. Get all assigned users for this collaborative task
      const assignedUserIds = task.assignedUserIds || [];
      if (assignedUserIds.length === 0) {
        return; // No assigned users
      }

      // 3. Get all progress records for this task
      const allProgress = await this.model
        .find({
          taskId: new Types.ObjectId(taskId),
          userId: { $in: assignedUserIds.map(id => new Types.ObjectId(id)) },
          isDeleted: false,
        })
        .lean();

      // 4. Count by status
      const notStartedCount = allProgress.filter(
        p => p.status === TaskProgressStatus.NOT_STARTED,
      ).length;
      
      const completedCount = allProgress.filter(
        p => p.status === TaskProgressStatus.COMPLETED,
      ).length;

      const totalAssignedUsers = assignedUserIds.length;

      // 5. Determine parent task status
      let newParentStatus: TaskStatus | null = null;

      if (completedCount === totalAssignedUsers) {
        // ALL completed → Parent: "completed"
        newParentStatus = TaskStatus.COMPLETED;
      } else if (notStartedCount < totalAssignedUsers) {
        // At least ONE started → Parent: "inProgress"
        newParentStatus = TaskStatus.IN_PROGRESS;
      }
      // else: All notStarted → Keep parent as "pending"

      // 6. Update parent task if needed
      if (newParentStatus && task.status !== newParentStatus) {
        await Task.findByIdAndUpdate(
          new Types.ObjectId(taskId),
          {
            status: newParentStatus,
            ...(newParentStatus === TaskStatus.COMPLETED && {
              completedAt: new Date(),
            }),
            ...(newParentStatus === TaskStatus.IN_PROGRESS && {
              startTime: task.startTime || new Date(),
            }),
          },
          { new: true },
        );

        // Log for observability
        logger.info(
          `[TaskProgress] Synced parent task ${taskId} status to ${newParentStatus} - ` +
          `Completed: ${completedCount}/${totalAssignedUsers}, NotStarted: ${notStartedCount}/${totalAssignedUsers}`,
        );

        // Invalidate task cache
        await this.invalidateParentTaskCache(taskId);

        // Emit event for real-time update
        socketService.emitToRoom(`task:${taskId}`, 'task:status-synced', {
          taskId,
          status: newParentStatus,
          completedCount,
          totalAssignedUsers,
          syncedAt: new Date(),
          syncedBy: 'system',
          reason: 'children_progress_updated',
        });
      }
    } catch (error) {
      errorLogger.error('[TaskProgress] Error in syncParentTaskStatusWithChildrenProgress:', error);
      // Don't throw - this is a background check, shouldn't break main flow
    }
  }

  /**
   * Invalidate parent task cache
   */
  private async invalidateParentTaskCache(taskId: string): Promise<void> {
    try {
      const cacheKey = `task:detail:${taskId}`;
      await redisClient.del(cacheKey);
      
      // Also invalidate list caches
      await redisClient.del('task:list');
      await redisClient.del('task:statistics');
    } catch (error) {
      errorLogger.error('[TaskProgress] Error invalidating parent task cache:', error);
    }
  }

  /**
   * Mark a specific subtask as complete for a child
   */
  async completeSubtask(
    taskId: string,
    subtaskIndex: number,
    userId: string,
  ): Promise<ITaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    // ✅ FIX: Get subtask from SubTask collection (not embedded in Task)
    const { SubTask } = await import('../task.module/subTask/subTask.model');
    const subtasks = await SubTask.find({
      taskId: taskObjectId,
      isDeleted: false,
    }).sort({ order: 1 });

    if (!subtasks || subtasks.length <= subtaskIndex) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task or subtask not found');
    }

    // Find or create progress record
    let progress = await this.model.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (!progress) {
      progress = await this.createOrUpdateProgress(
        taskId,
        userId,
        TaskProgressStatus.IN_PROGRESS,
      );
    }

    // Add subtask index to completed list (if not already there)
    if (!progress.completedSubtaskIndexes.includes(subtaskIndex)) {
      progress.completedSubtaskIndexes.push(subtaskIndex);
    }

    // Update progress percentage
    progress.updateProgressPercentage(subtasks.length);

    // Set startedAt if this is the first subtask
    if (progress.completedSubtaskIndexes.length === 1 && !progress.startedAt) {
      progress.startedAt = new Date();
      progress.status = TaskProgressStatus.IN_PROGRESS;
    }

    // 🆕 NEW: Check if ALL subtasks completed → auto-complete child's task progress
    const totalSubtasks = subtasks.length;
    const completedSubtasks = progress.completedSubtaskIndexes.length;

    if (completedSubtasks === totalSubtasks && totalSubtasks > 0) {
      // All subtasks completed → mark task as completed
      progress.status = TaskProgressStatus.COMPLETED;
      progress.completedAt = new Date();
      progress.progressPercentage = 100;
    }

    await progress.save();

    // Send notification if task completed
    if (progress.status === TaskProgressStatus.COMPLETED) {
      await this.notifyParentOnTaskCompletion(taskId, userId);
    }

    // 🆕 NEW: Sync parent task status based on all children's progress
    if (progress.status === TaskProgressStatus.COMPLETED) {
      await this.syncParentTaskStatusWithChildrenProgress(taskId);
    } else if (progress.status === TaskProgressStatus.IN_PROGRESS) {
      // Child started working via subtasks → update parent to "inProgress"
      await this.syncParentTaskStatusWithChildrenProgress(taskId);
    }

    // Invalidate cache
    await this.invalidateCache(taskId, userId);

    return progress;
  }

  /** ✔️
   * Get progress for a specific task and user
   */
  async getProgress(
    taskId: string,
    userId: string,
  ): Promise<ITaskProgressDocument | null> {
    const cacheKey = this.getCacheKey('detail', taskId, userId);

    // Try cache first
    const cached = await this.getFromCache<ITaskProgressDocument>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const progress = await this.model.findOne({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    // Cache the result
    if (progress) {
      await this.setInCache(
        cacheKey,
        progress,
        TASK_PROGRESS_CACHE_CONFIG.PROGRESS_DETAIL_TTL,
      );
    }

    return progress;
  }

  /** 🔂
   * Get all children's progress for a task (for parent dashboard)
   */
  async getAllChildrenProgress(taskId: string): Promise<ITaskProgressSummary> {
    const cacheKey = this.getCacheKey('summary', taskId);

    // Try cache first
    const cached = await this.getFromCache<ITaskProgressSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get task details
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Get all children's progress
    const progressRecords: ITaskProgress[] = await this.model
      .find({
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      })
      .populate('userId', 'name email profileImage');

    // Build children progress array
    const childrenProgress = progressRecords.map(record => {
      const userDoc = record.userId as any;
      return {
        childId: record.userId,
        childName: userDoc?.name || 'Unknown',
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        progressPercentage: record.progressPercentage,
        completedSubtaskCount: record.completedSubtaskIndexes.length,
        totalSubtasks: task.subtasks?.length || 0,
      };
    });

    // Calculate summary
    const summary = {
      totalChildren: childrenProgress.length,
      notStarted: childrenProgress.filter(
        c => c.status === TaskProgressStatus.NOT_STARTED,
      ).length,
      inProgress: childrenProgress.filter(
        c => c.status === TaskProgressStatus.IN_PROGRESS,
      ).length,
      completed: childrenProgress.filter(
        c => c.status === TaskProgressStatus.COMPLETED,
      ).length,
      completionRate:
        childrenProgress.length > 0
          ? Math.round(
              (childrenProgress.filter(
                c => c.status === TaskProgressStatus.COMPLETED,
              ).length /
                childrenProgress.length) *
                100,
            )
          : 0,
      averageProgress:
        childrenProgress.length > 0
          ? Math.round(
              childrenProgress.reduce(
                (sum, c) => sum + c.progressPercentage,
                0,
              ) / childrenProgress.length,
            )
          : 0,
    };

    const result: ITaskProgressSummary = {
      taskId: task._id,
      taskTitle: task.title,
      totalSubtasks: task.subtasks?.length || 0,
      childrenProgress,
      summary,
    };

    // Cache the result
    await this.setInCache(
      cacheKey,
      result,
      TASK_PROGRESS_CACHE_CONFIG.SUMMARY_TTL,
    );

    return result;
  }

  /** 🔂
   * Get all tasks progress for a child
   */
  async getAllTasksProgress(
    userId: string,
    options?: { status?: TTaskProgressStatus; taskType?: string },
  ): Promise<any[]> {
    const cacheKey = this.getCacheKey('tasks', userId);

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query
    const query: any = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    if (options?.status) {
      query.status = options.status;
    }

    // Get progress records
    const progressRecords = await this.model
      .find(query)
      .populate({
        path: 'taskId',
        select: 'title taskType status totalSubtasks completedSubtasks',
      })
      .sort({ updatedAt: -1 });

    // Format results
    const tasks = progressRecords.map((record: ITaskProgress) => {
      const taskDoc = record.taskId as any;
      return {
        taskId: record.taskId,
        taskTitle: taskDoc?.title || 'Unknown',
        taskType: taskDoc?.taskType || 'personal',
        status: record.status,
        progressPercentage: record.progressPercentage,
        completedSubtaskCount: record.completedSubtaskIndexes.length,
        totalSubtasks: taskDoc?.subtasks?.length || 0,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
      };
    });

    // Cache the result
    await this.setInCache(
      cacheKey,
      tasks,
      TASK_PROGRESS_CACHE_CONFIG.TASKS_PROGRESS_TTL,
    );

    return tasks;
  }

  /**
   * Notify parent when child completes a task
   */
  private async notifyParentOnTaskCompletion(
    taskId: string,
    childId: string,
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await Task.findById(taskId).select('createdById title');
      if (!task) return;

      // Get child name
      const child = await User.findById(childId).select('name');
      if (!child) return;

      // Send notification
      await notificationService.createWebNotification(
        `${child.name} completed the task: "${task.title}"`,
        childId, // sender
        task.createdById.toString(), // receiver (parent)
        'task_completed',
        null,
        taskId,
      );
    } catch (error) {
      errorLogger.error('Error sending parent notification:', error);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Socket.IO Real-Time Updates to Parent
  // Figma: dashboard-flow-01.png (Task Monitoring section)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Emit progress update to parent via Socket.IO
   * Called when child starts or completes task
   *
   * @param taskId - Task ID
   * @param userId - Child user ID
   * @param status - New status
   * @param oldStatus - Previous status
   */
  private async emitProgressUpdateToParent(
    taskId: string,
    userId: string,
    status: TTaskProgressStatus,
    oldStatus: TTaskProgressStatus,
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await Task.findById(taskId).select(
        'createdById title taskType',
      );
      if (!task) return;

      const parentId = task.createdById.toString();

      // Get child name
      const child = await User.findById(userId).select('name profileImage');
      if (!child) return;

      // Determine event type
      let eventType: string;
      let message: string;

      if (
        status === TaskProgressStatus.IN_PROGRESS &&
        oldStatus === TaskProgressStatus.NOT_STARTED
      ) {
        eventType = 'task-progress:started';
        message = `${child.name} started working on "${task.title}"`;
      } else if (status === TaskProgressStatus.COMPLETED) {
        eventType = 'task-progress:completed';
        message = `${child.name} completed "${task.title}"`;
      } else {
        return; // Skip other status changes
      }

      // Emit to parent via Socket.IO
      // Parent is auto-joined to family room, but we also emit to personal room for specific updates
      await socketService.emitToTaskUsers([parentId], eventType, {
        taskId,
        taskTitle: task.title,
        childId: userId,
        childName: child.name,
        childProfileImage: child.profileImage?.imageUrl,
        status,
        oldStatus,
        timestamp: new Date(),
        message,
      });

      // Also broadcast to family room (for live activity feed)
      if (task.taskType === TaskType.COLLABORATIVE) {
        await socketService.broadcastGroupActivity(parentId, {
          type:
            status === TaskProgressStatus.COMPLETED
              ? ACTIVITY_TYPE.TASK_COMPLETED
              : ACTIVITY_TYPE.TASK_STARTED,
          actor: {
            userId,
            name: child.name,
            profileImage: child.profileImage?.imageUrl,
          },
          task: {
            taskId,
            title: task.title,
          },
          timestamp: new Date(),
        });
      }

      logger.info(`🚀 Emitted ${eventType} to parent ${parentId}`);
    } catch (error) {
      errorLogger.error('Error emitting progress update to parent:', error);
      // Don't throw - Socket.IO emission is optional
    }
  }

  /**
   * Emit subtask completion to parent via Socket.IO
   * Called when child completes a subtask
   *
   * @param taskId - Task ID
   * @param userId - Child user ID
   * @param subtaskIndex - Completed subtask index
   * @param progressPercentage - Current progress percentage
   */
  private async emitSubtaskCompletionToParent(
    taskId: string,
    userId: string,
    subtaskIndex: number,
    progressPercentage: number,
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await Task.findById(taskId).select(
        'createdById title subtasks taskType',
      );
      if (!task || !task.subtasks || task.subtasks.length <= subtaskIndex)
        return;

      const parentId = task.createdById.toString();
      const subtaskTitle = task.subtasks[subtaskIndex].title;

      // Get child name
      const child = await User.findById(userId).select('name profileImage');
      if (!child) return;

      // Emit to parent
      await socketService.emitToTaskUsers(
        [parentId],
        'task-progress:subtask-completed',
        {
          taskId,
          taskTitle: task.title,
          subtaskIndex,
          subtaskTitle,
          childId: userId,
          childName: child.name,
          childProfileImage: child.profileImage?.imageUrl,
          progressPercentage,
          timestamp: new Date(),
          message: `${child.name} completed "${subtaskTitle}" (${progressPercentage}% done)`,
        },
      );

      logger.info(`🚀 Emitted subtask-completed to parent ${parentId}`);
    } catch (error) {
      errorLogger.error('Error emitting subtask completion to parent:', error);
      // Don't throw - Socket.IO emission is optional
    }
  }

  /**✔️☑️
   * Bulk create progress records for all assigned children
   * Called when a new collaborative task is created
   * task.service.ts -> createTask -> if collaborative -> taskProgressService.bulkCreateForTask(taskId, assignedUserIds)
   * This ensures progress tracking is set up for all children from the start
   */
  async bulkCreateForTask(
    taskId: string,
    assignedUserIds: string[],
  ): Promise<ITaskProgressDocument[]> {
    const taskObjectId = new Types.ObjectId(taskId);

    const progressRecords = await Promise.all(
      assignedUserIds.map(async userId => {
        return await this.createOrUpdateProgress(
          taskId,
          userId,
          TaskProgressStatus.NOT_STARTED,
        );
      }),
    );

    return progressRecords;
  }

  /**
   * Delete progress record (soft delete)
   */
  async deleteProgress(taskId: string, userId: string): Promise<void> {
    await this.model.findOneAndUpdate(
      {
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      },
      {
        isDeleted: true,
      },
    );

    // Invalidate cache
    await this.invalidateCache(taskId, userId);
  }

  /**
   * Update progress status V2 - With creative response (like /tasks/:id/status/v3)
   * PUT /task-progress/:taskId/status/v2
   *
   * @description
   * Same as updateProgressStatus but returns creative response with support mode-based messaging
   * Perfect for showing celebratory popups when child completes tasks
   *
   * @param taskId - Task ID
   * @param userId - User ID
   * @param status - New status (in_progress or completed)
   * @param note - Optional note
   * @returns Progress record with creative response and milestone info
   */
  async updateProgressStatusV2(
    taskId: string,
    userId: string,
    status: TTaskProgressStatus,
    note?: string,
  ): Promise<{
    progress: ITaskProgressDocument;
    creativeResponse: ICreativeResponse;
    milestone: 'started' | '50_percent' | '100_percent';
    isParentTaskCompleted?: boolean;
  }> {
    // 1. Update progress status (reuse existing logic)
    const progress = await this.updateProgressStatus(taskId, userId, status, note);

    // 2. Get user's support mode for creative response
    const { UserProfile } = await import('../user.module/userProfile/userProfile.model');
    const userProfile = await UserProfile.findOne({ userId: new Types.ObjectId(userId) })
      .select('supportMode')
      .lean();

    const supportMode = userProfile?.supportMode || 'calm';

    // 3. Determine milestone
    let milestone: 'started' | '50_percent' | '100_percent' = 'started';

    if (status === TaskProgressStatus.COMPLETED) {
      milestone = '100_percent';
    } else if (status === TaskProgressStatus.IN_PROGRESS && progress.progressPercentage >= 50) {
      milestone = '50_percent';
    }

    // 4. Generate creative response
    const creativeResponse = this.generateCreativeResponse(supportMode, milestone);

    // 5. Check if parent task was auto-completed (for collaborative tasks)
    let isParentTaskCompleted = false;
    if (status === TaskProgressStatus.COMPLETED) {
      const task = await Task.findById(taskId).lean();
      if (task && task.taskType === TaskType.COLLABORATIVE) {
        // Check if all children completed
        const allProgress = await this.model
          .find({
            taskId: new Types.ObjectId(taskId),
            isDeleted: false,
          })
          .lean();

        const assignedUserIds = task.assignedUserIds || [];
        const completedCount = allProgress.filter(
          p => p.status === TaskProgressStatus.COMPLETED,
        ).length;

        isParentTaskCompleted = completedCount === assignedUserIds.length;
      }
    }

    return {
      progress,
      creativeResponse,
      milestone,
      ...(isParentTaskCompleted && { isParentTaskCompleted: true }),
    };
  }

  /**
   * Generate creative response based on support mode and milestone
   * Same logic as task.service.ts generateCreativeResponse
   *
   * @param supportMode - User's support mode preference
   * @param milestone - Completion milestone (50%, 100%, started)
   * @returns Creative response with mode-specific messaging
   *
   * @see Figma: response-based-on-mode.png
   */
  private generateCreativeResponse(
    supportMode: string,
    milestone: 'started' | '50_percent' | '100_percent',
  ): ICreativeResponse {
    // Messages configuration by support mode and milestone
    const messages = {
      logical: {
        '50_percent': {
          title: 'Progress update',
          message: '50% of the assigned work has been completed.',
          icon: '📋',
          buttonText: 'Continue',
        },
        '100_percent': {
          title: 'Task completed',
          message: "All scheduled tasks have been completed. Today's productivity goal has been achieved.",
          icon: '🐧',
          buttonText: 'Well done',
        },
      },
      calm: {
        '50_percent': {
          title: 'Good job! 🌸',
          message: "You're halfway there. Take it step by step — you're doing just fine.",
          icon: '📊',
          buttonText: 'Continue',
        },
        '100_percent': {
          title: 'Task completed',
          message: "You've completed all your tasks for today. Take a moment to breathe — you did well.",
          icon: '🐧',
          buttonText: 'Continue',
        },
      },
      encouraging: {
        '50_percent': {
          title: 'Great job! 🌟',
          message: "You've completed 50% of your work — keep going!",
          icon: '📝',
          buttonText: 'Keep it up!',
        },
        '100_percent': {
          title: 'Amazing work! 🎊',
          message: "You completed all your tasks today. Keep the momentum going — you're on fire! 🔥",
          icon: '🐧',
          buttonText: 'Awesome!',
        },
      },
    };

    // Mode-specific colors
    const colors = {
      logical: '#4ADE80',    // Green
      calm: '#93C5FD',       // Light blue
      encouraging: '#C4B5FD', // Purple
    };

    const modeMessages = messages[supportMode] || messages.calm;
    const selectedMessage = modeMessages[milestone] || modeMessages['50_percent'];

    return {
      mode: supportMode,
      milestone,
      popup: {
        title: selectedMessage.title,
        message: selectedMessage.message,
        icon: selectedMessage.icon,
        color: colors[supportMode] || colors.calm,
        buttonText: selectedMessage.buttonText,
      },
      showPopup: milestone !== 'started',
    };
  }
}

export const taskProgressService = new TaskProgressService();

/**
 * Creative Response Interface
 * Same as task.service.ts ICreativeResponse
 */
interface ICreativeResponse {
  mode: string;
  milestone: 'started' | '50_percent' | '100_percent';
  popup: {
    title: string;
    message: string;
    icon?: string;
    color?: string;
    buttonText?: string;
  };
  showPopup: boolean;
}
