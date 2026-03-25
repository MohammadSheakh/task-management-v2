//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { GenericService } from '../_generic-module/generic.services';
import { TaskProgress } from './taskProgress.model';
import { ITaskProgress, ITaskProgressDocument, ITaskProgressSummary } from './taskProgress.interface';
import ApiError from '../../errors/ApiError';
import { Task } from '../task.module/task/task.model';
import { TaskProgressStatus, TASK_PROGRESS_CACHE_CONFIG, TASK_PROGRESS_EVENTS, TTaskProgressStatus } from './taskProgress.constant';
import { redisClient } from '../../helpers/redis/redis';
import { errorLogger, logger } from '../../shared/logger';
import { User } from '../user.module/user/user.model';
import { TaskType } from '../task.module/task/task.constant';
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
export class TaskProgressService extends GenericService<typeof TaskProgress, ITaskProgressDocument> {
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
  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in TaskProgressService:', error);
    }
  }

  /**
   * Invalidate Cache
   */
  private async invalidateCache(taskId?: string, userId?: string): Promise<void> {
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

  /**✔️
   * Create or update task progress for a child
   * Called when child is assigned to a collaborative task
   */
  async createOrUpdateProgress(
    taskId: string,
    userId: string,
    status: TTaskProgressStatus = TaskProgressStatus.NOT_STARTED
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
    note?: string
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
    if (status === TaskProgressStatus.COMPLETED && oldStatus !== TaskProgressStatus.COMPLETED) {
      await this.notifyParentOnTaskCompletion(taskId, userId);
    }

    // 🚀 NEW: Emit real-time progress update to parent
    await this.emitProgressUpdateToParent(taskId, userId, status, oldStatus);

    // Invalidate cache
    await this.invalidateCache(taskId, userId);

    return progress;
  }

  /**
   * Mark a specific subtask as complete for a child
   */
  async completeSubtask(
    taskId: string,
    subtaskIndex: number,
    userId: string
  ): Promise<ITaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    // Verify task exists and has the subtask
    const task = await Task.findById(taskId);
    if (!task || !task.subtasks || task.subtasks.length <= subtaskIndex) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task or subtask not found');
    }

    // Find or create progress record
    let progress = await this.model.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (!progress) {
      progress = await this.createOrUpdateProgress(taskId, userId, TaskProgressStatus.IN_PROGRESS);
    }

    // Add subtask index to completed list (if not already there)
    if (!progress.completedSubtaskIndexes.includes(subtaskIndex)) {
      progress.completedSubtaskIndexes.push(subtaskIndex);
    }

    // Update progress percentage
    progress.updateProgressPercentage(task.subtasks.length);

    // Set startedAt if this is the first subtask
    if (progress.completedSubtaskIndexes.length === 1 && !progress.startedAt) {
      progress.startedAt = new Date();
      progress.status = TaskProgressStatus.IN_PROGRESS;
    }

    await progress.save();

    // Send notification if task completed
    if (progress.status === TaskProgressStatus.COMPLETED) {
      await this.notifyParentOnTaskCompletion(taskId, userId);
    }

    // 🚀 NEW: Emit real-time subtask completion to parent
    await this.emitSubtaskCompletionToParent(taskId, userId, subtaskIndex, progress.progressPercentage);

    // Invalidate cache
    await this.invalidateCache(taskId, userId);

    return progress;
  }

  /** ✔️
   * Get progress for a specific task and user
   */
  async getProgress(taskId: string, userId: string): Promise<ITaskProgressDocument | null> {
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
      await this.setInCache(cacheKey, progress, TASK_PROGRESS_CACHE_CONFIG.PROGRESS_DETAIL_TTL);
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
    const progressRecords: ITaskProgress[] = await this.model.find({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).populate('userId', 'name email profileImage');

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
      notStarted: childrenProgress.filter(c => c.status === TaskProgressStatus.NOT_STARTED).length,
      inProgress: childrenProgress.filter(c => c.status === TaskProgressStatus.IN_PROGRESS).length,
      completed: childrenProgress.filter(c => c.status === TaskProgressStatus.COMPLETED).length,
      completionRate: childrenProgress.length > 0
        ? Math.round((childrenProgress.filter(c => c.status === TaskProgressStatus.COMPLETED).length / childrenProgress.length) * 100)
        : 0,
      averageProgress: childrenProgress.length > 0
        ? Math.round(childrenProgress.reduce((sum, c) => sum + c.progressPercentage, 0) / childrenProgress.length)
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
    await this.setInCache(cacheKey, result, TASK_PROGRESS_CACHE_CONFIG.SUMMARY_TTL);

    return result;
  }

  /** 🔂
   * Get all tasks progress for a child
   */
  async getAllTasksProgress(
    userId: string,
    options?: { status?: TTaskProgressStatus; taskType?: string }
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
    const progressRecords = await this.model.find(query)
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
    await this.setInCache(cacheKey, tasks, TASK_PROGRESS_CACHE_CONFIG.TASKS_PROGRESS_TTL);

    return tasks;
  }

  /**
   * Notify parent when child completes a task
   */
  private async notifyParentOnTaskCompletion(taskId: string, childId: string): Promise<void> {
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
        taskId
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
    oldStatus: TTaskProgressStatus
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await Task.findById(taskId).select('createdById title taskType');
      if (!task) return;

      const parentId = task.createdById.toString();

      // Get child name
      const child = await User.findById(userId).select('name profileImage');
      if (!child) return;

      // Determine event type
      let eventType: string;
      let message: string;

      if (status === TaskProgressStatus.IN_PROGRESS && oldStatus === TaskProgressStatus.NOT_STARTED) {
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
          type: status === TaskProgressStatus.COMPLETED ? ACTIVITY_TYPE.TASK_COMPLETED : ACTIVITY_TYPE.TASK_STARTED,
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
    progressPercentage: number
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await Task.findById(taskId).select('createdById title subtasks taskType');
      if (!task || !task.subtasks || task.subtasks.length <= subtaskIndex) return;

      const parentId = task.createdById.toString();
      const subtaskTitle = task.subtasks[subtaskIndex].title;

      // Get child name
      const child = await User.findById(userId).select('name profileImage');
      if (!child) return;

      // Emit to parent
      await socketService.emitToTaskUsers([parentId], 'task-progress:subtask-completed', {
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
      });

      logger.info(`🚀 Emitted subtask-completed to parent ${parentId}`);

    } catch (error) {
      errorLogger.error('Error emitting subtask completion to parent:', error);
      // Don't throw - Socket.IO emission is optional
    }
  }

  /**✔️
   * Bulk create progress records for all assigned children
   * Called when a new collaborative task is created
   */
  async bulkCreateForTask(
    taskId: string,
    assignedUserIds: string[]
  ): Promise<ITaskProgressDocument[]> {
    const taskObjectId = new Types.ObjectId(taskId);

    const progressRecords = await Promise.all(
      assignedUserIds.map(async (userId) => {
        return await this.createOrUpdateProgress(taskId, userId, TaskProgressStatus.NOT_STARTED);
      })
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
      }
    );

    // Invalidate cache
    await this.invalidateCache(taskId, userId);
  }
}

export const taskProgressService = new TaskProgressService();
