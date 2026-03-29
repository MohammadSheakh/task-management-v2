import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TaskProgress, TaskProgressDocument } from './taskProgress.schema';
import { TaskProgressStatus, TASK_PROGRESS_CACHE_CONFIG, TASK_PROGRESS_SOCKET_EVENTS, TASK_PROGRESS_ACTIVITY_TYPES } from './taskProgress.constants';
import { UpdateTaskProgressDto } from './dto/taskProgress.dto';
import { TaskProgressEntity, TaskProgressSummaryEntity, ChildProgressEntity } from './entities/taskProgress.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { Task, TaskDocument } from '../task/task.schema';
import { TaskType, TaskStatus } from '../task/task.constants';
import { User, UserDocument } from '../../user.module/user/user.schema';
import { SocketService } from '../../socket.gateway/services/socket.service';
import { NotificationService } from '../../notification.module/notification.service';

/**
 * TaskProgress Service
 * Tracks each child's independent progress on collaborative tasks
 *
 * Features:
 * - Per-child progress tracking
 * - Subtask completion tracking
 * - Redis caching for performance
 * - Automatic notifications to parents
 * - Real-time Socket.IO updates
 * - Parent task auto-sync based on children's progress
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 *
 * @example
 * // Inject service
 * constructor(private taskProgressService: TaskProgressService) {}
 *
 * // Get child's progress
 * const progress = await this.taskProgressService.getProgress(taskId, userId);
 *
 * // Update status
 * const updated = await this.taskProgressService.updateProgressStatus(
 *   taskId,
 *   userId,
 *   TaskProgressStatus.IN_PROGRESS,
 * );
 */
@Injectable()
export class TaskProgressService {
  private readonly logger = new Logger(TaskProgressService.name);

  constructor(
    @InjectModel(TaskProgress.name)
    private taskProgressModel: Model<TaskProgressDocument>,

    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,

    private socketService: SocketService,

    private notificationService: NotificationService,
  ) {}

  /**
   * Cache Key Generator
   * Follows convention: module:type:identifiers
   *
   * @param type - Cache type (detail, children, tasks, summary)
   * @param taskId - Task ID (optional)
   * @param userId - User ID (optional)
   * @returns Redis cache key
   *
   * @example
   * getCacheKey('detail', 'taskId', 'userId')
   * // Returns: "taskProgress:detail:task:taskId:user:userId"
   */
  private getCacheKey(type: string, taskId?: string, userId?: string): string {
    const prefix = TASK_PROGRESS_CACHE_CONFIG.PREFIX;
    if (type === 'detail' && taskId && userId) {
      return `${prefix}:detail:task:${taskId}:user:${userId}`;
    }
    if (type === 'children' && taskId) {
      return `${prefix}:children:task:${taskId}`;
    }
    if (type === 'tasks' && userId) {
      return `${prefix}:tasks:user:${userId}`;
    }
    if (type === 'summary' && taskId) {
      return `${prefix}:summary:task:${taskId}`;
    }
    return `${prefix}:unknown`;
  }

  /**
   * Get from Cache
   *
   * @param key - Redis cache key
   * @returns Cached data or null
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await this.cacheManager.get<T>(key);
      if (cachedData) {
        this.logger.debug(`Cache HIT: ${key}`);
        return cachedData;
      }
      this.logger.debug(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      this.logger.error(`Redis GET error: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * Set in Cache
   *
   * @param key - Redis cache key
   * @param data - Data to cache
   * @param ttl - Time to live in seconds
   */
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    try {
      await this.cacheManager.set(key, data, ttl * 1000);
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      this.logger.error(`Redis SET error: ${error.message}`, error.stack);
    }
  }

  /**
   * Invalidate Cache
   * Called after writes to ensure cache consistency
   *
   * @param taskId - Task ID (optional)
   * @param userId - User ID (optional)
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
        await Promise.all(keysToDelete.map(key => this.cacheManager.del(key)));
        this.logger.log(`Invalidated ${keysToDelete.length} cache keys`);
      }
    } catch (error) {
      this.logger.error(`Cache invalidation error: ${error.message}`, error.stack);
    }
  }

  /**
   * Create or update task progress for a child
   * Called when child is assigned to a collaborative task
   *
   * @param taskId - Task ID
   * @param userId - User ID (child)
   * @param status - Initial status (default: NOT_STARTED)
   * @returns Created/updated progress record
   *
   * @example
   * // Auto-create progress when child assigned to task
   * const progress = await this.createOrUpdateProgress(
   *   '507f1f77bcf86cd799439011',
   *   '507f191e810c19729de860ea',
   *   TaskProgressStatus.NOT_STARTED
   * );
   */
  async createOrUpdateProgress(
    taskId: string,
    userId: string,
    status: TaskProgressStatus = TaskProgressStatus.NOT_STARTED,
  ): Promise<TaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    this.logger.log(`Creating/updating progress for task ${taskId} user ${userId}`);

    // Check if progress record already exists
    const existingProgress = await this.taskProgressModel.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (existingProgress) {
      // Update existing progress
      existingProgress.status = status;
      await existingProgress.save();
      this.logger.log(`Updated existing progress record`);
      return existingProgress;
    }

    // Create new progress record
    const progress = await this.taskProgressModel.create({
      taskId: taskObjectId,
      userId: userObjectId,
      status,
      completedSubtaskIndexes: [],
      progressPercentage: 0,
    });

    this.logger.log(`Created new progress record`);
    return progress;
  }

  /**
   * Update progress status (started, completed)
   * Main entry point for child to update their progress
   *
   * @param taskId - Task ID
   * @param userId - User ID (child)
   * @param status - New status
   * @param note - Optional note
   * @returns Updated progress record
   *
   * @example
   * // Child starts task
   * const progress = await this.updateProgressStatus(
   *   taskId,
   *   userId,
   *   TaskProgressStatus.IN_PROGRESS,
   *   'Starting now!'
   * );
   */
  async updateProgressStatus(
    taskId: string,
    userId: string,
    status: TaskProgressStatus,
    note?: string,
  ): Promise<TaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    this.logger.log(`Updating progress status: ${status} for task ${taskId}`);

    // Find or create progress record
    let progress = await this.taskProgressModel.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (!progress) {
      // Auto-create if doesn't exist
      this.logger.log('Progress record not found, creating...');
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

    // 🚀 Emit real-time progress update to parent
    await this.emitProgressUpdateToParent(taskId, userId, status, oldStatus);

    // 🆕 Sync parent task status based on all children's progress
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

  /**
   * Check if all children completed a collaborative task
   * If yes, auto-complete the parent task
   * Also checks if ANY child started → update parent to "inProgress"
   *
   * @param taskId - The task ID to check
   *
   * @private
   */
  private async syncParentTaskStatusWithChildrenProgress(
    taskId: string,
  ): Promise<void> {
    try {
      // 1. Get task to verify it's collaborative
      const task = await this.taskModel.findById(taskId).lean();
      if (!task || task.taskType !== TaskType.COLLABORATIVE) {
        this.logger.debug(`Task ${taskId} is not collaborative, skipping sync`);
        return; // Only for collaborative tasks
      }

      // 2. Get all assigned users for this collaborative task
      const assignedUserIds = task.assignedUserIds || [];
      if (assignedUserIds.length === 0) {
        this.logger.warn(`Task ${taskId} has no assigned users`);
        return; // No assigned users
      }

      // 3. Get all progress records for this task
      const allProgress = await this.taskProgressModel
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
        await this.taskModel.findByIdAndUpdate(
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
        this.logger.log(
          `[TaskProgress] Synced parent task ${taskId} status to ${newParentStatus} - ` +
          `Completed: ${completedCount}/${totalAssignedUsers}, NotStarted: ${notStartedCount}/${totalAssignedUsers}`,
        );

        // Invalidate task cache
        await this.invalidateParentTaskCache(taskId);

        // Emit event for real-time update
        this.socketService.emitToRoom(`task:${taskId}`, 'task:status-synced', {
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
      this.logger.error(
        `[TaskProgress] Error in syncParentTaskStatusWithChildrenProgress: ${error.message}`,
        error.stack,
      );
      // Don't throw - this is a background check, shouldn't break main flow
    }
  }

  /**
   * Invalidate parent task cache
   *
   * @param taskId - Task ID
   */
  private async invalidateParentTaskCache(taskId: string): Promise<void> {
    try {
      const cacheKey = `task:detail:${taskId}`;
      await this.cacheManager.del(cacheKey);

      // Also invalidate list caches
      await this.cacheManager.del('task:list');
      await this.cacheManager.del('task:statistics');
    } catch (error) {
      this.logger.error(
        `[TaskProgress] Error invalidating parent task cache: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Mark a specific subtask as complete for a child
   * Updates progress percentage and auto-completes task if all subtasks done
   *
   * @param taskId - Task ID
   * @param subtaskIndex - Subtask index (0-based)
   * @param userId - User ID (child)
   * @returns Updated progress record
   *
   * @example
   * // Child completes subtask at index 2
   * const progress = await this.completeSubtask(taskId, 2, userId);
   */
  async completeSubtask(
    taskId: string,
    subtaskIndex: number,
    userId: string,
  ): Promise<TaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    this.logger.log(`Marking subtask ${subtaskIndex} complete for task ${taskId}`);

    // ✅ Get subtasks from SubTask collection (not embedded in Task)
    const { SubTask, SubTaskDocument } = await import('../subTask/subTask.schema');
    const subtasks = await this.taskModel
      .findById(taskId)
      .select('subtasks')
      .lean();

    if (!subtasks || !subtasks.subtasks || subtasks.subtasks.length <= subtaskIndex) {
      throw new NotFoundException('Task or subtask not found');
    }

    // Find or create progress record
    let progress = await this.taskProgressModel.findOne({
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
    progress.updateProgressPercentage(subtasks.subtasks.length);

    // Set startedAt if this is the first subtask
    if (progress.completedSubtaskIndexes.length === 1 && !progress.startedAt) {
      progress.startedAt = new Date();
      progress.status = TaskProgressStatus.IN_PROGRESS;
    }

    // 🆕 Check if ALL subtasks completed → auto-complete child's task progress
    const totalSubtasks = subtasks.subtasks.length;
    const completedSubtasks = progress.completedSubtaskIndexes.length;

    if (completedSubtasks === totalSubtasks && totalSubtasks > 0) {
      // All subtasks completed → mark task as completed
      progress.status = TaskProgressStatus.COMPLETED;
      progress.completedAt = new Date();
      progress.progressPercentage = 100;
      this.logger.log(`All subtasks completed! Auto-completed task for user ${userId}`);
    }

    await progress.save();

    // Send notification if task completed
    if (progress.status === TaskProgressStatus.COMPLETED) {
      await this.notifyParentOnTaskCompletion(taskId, userId);
    }

    // 🆕 Sync parent task status based on all children's progress
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

  /**
   * Get progress for a specific task and user
   * Uses Redis caching for performance
   *
   * @param taskId - Task ID
   * @param userId - User ID
   * @returns Progress record or null
   *
   * @example
   * // Get child's progress on a task
   * const progress = await this.getProgress(taskId, userId);
   */
  async getProgress(
    taskId: string,
    userId: string,
  ): Promise<TaskProgressDocument | null> {
    const cacheKey = this.getCacheKey('detail', taskId, userId);

    // Try cache first
    const cached = await this.getFromCache<TaskProgressDocument>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const progress = await this.taskProgressModel
      .findOne({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      })
      .lean();

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

  /**
   * Get all children's progress for a task (for parent dashboard)
   * Returns comprehensive summary with statistics
   *
   * @param taskId - Task ID
   * @returns Progress summary with all children's data
   *
   * @example
   * // Parent views all children's progress
   * const summary = await this.getAllChildrenProgress(taskId);
   * // Returns: { taskTitle, childrenProgress[], summary: { totalChildren, completed, ... } }
   */
  async getAllChildrenProgress(taskId: string): Promise<TaskProgressSummaryEntity> {
    const cacheKey = this.getCacheKey('summary', taskId);

    // Try cache first
    const cached = await this.getFromCache<TaskProgressSummaryEntity>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get task details
    const task = await this.taskModel.findById(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get all children's progress with user details
    const progressRecords = await this.taskProgressModel
      .find({
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      })
      .populate('userId', 'name email profileImage')
      .lean();

    // Build children progress array
    const childrenProgress: ChildProgressEntity[] = progressRecords.map(record => {
      const userDoc = record.userId as any;
      return {
        childId: record.userId as Types.ObjectId,
        childName: userDoc?.name || 'Unknown',
        childProfileImage: userDoc?.profileImage?.imageUrl || undefined,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        progressPercentage: record.progressPercentage,
        completedSubtaskCount: record.completedSubtaskIndexes.length,
        totalSubtasks: task.subtasks?.length || 0,
      };
    });

    // Calculate summary statistics
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
              (childrenProgress.filter(c => c.status === TaskProgressStatus.COMPLETED)
                .length /
                childrenProgress.length) *
                100,
            )
          : 0,
      averageProgress:
        childrenProgress.length > 0
          ? Math.round(
              childrenProgress.reduce((sum, c) => sum + c.progressPercentage, 0) /
                childrenProgress.length,
            )
          : 0,
    };

    const result: TaskProgressSummaryEntity = {
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

  /**
   * Get all tasks progress for a child
   * Used for child's task list view
   *
   * @param userId - User ID (child)
   * @param options - Optional filters (status, taskType)
   * @returns Array of tasks with progress
   *
   * @example
   * // Get all tasks for a child
   * const tasks = await this.getAllTasksProgress(userId);
   *
   * // Filter by status
   * const inProgressTasks = await this.getAllTasksProgress(userId, {
   *   status: TaskProgressStatus.IN_PROGRESS,
   * });
   */
  async getAllTasksProgress(
    userId: string,
    options?: { status?: TaskProgressStatus; taskType?: string },
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

    // Get progress records with task details
    const progressRecords = await this.taskProgressModel
      .find(query)
      .populate({
        path: 'taskId',
        select: 'title taskType status totalSubtasks completedSubtasks',
      })
      .sort({ updatedAt: -1 })
      .lean();

    // Format results
    const tasks = progressRecords.map((record: any) => {
      const taskDoc = record.taskId;
      return {
        taskId: record.taskId._id,
        taskTitle: taskDoc?.title || 'Unknown',
        taskType: taskDoc?.taskType || 'personal',
        taskStatus: taskDoc?.status || 'pending',
        progressStatus: record.status,
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
   * Sends web notification
   *
   * @param taskId - Task ID
   * @param childId - Child user ID
   *
   * @private
   */
  private async notifyParentOnTaskCompletion(
    taskId: string,
    childId: string,
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await this.taskModel.findById(taskId).select('createdById title');
      if (!task) {
        this.logger.warn(`Task ${taskId} not found for notification`);
        return;
      }

      // Get child name
      const child = await this.userModel.findById(childId).select('name');
      if (!child) {
        this.logger.warn(`Child ${childId} not found for notification`);
        return;
      }

      const parentId = task.createdById.toString();

      // Send notification
      await this.notificationService.createWebNotification(
        `${child.name} completed the task: "${task.title}"`,
        childId, // sender
        parentId, // receiver (parent)
        'task_completed',
        null,
        taskId,
      );

      this.logger.log(`Sent notification to parent ${parentId}`);
    } catch (error) {
      this.logger.error(
        `Error sending parent notification: ${error.message}`,
        error.stack,
      );
      // Don't throw - notification is optional
    }
  }

  /**
   * Emit progress update to parent via Socket.IO
   * Called when child starts or completes task
   *
   * @param taskId - Task ID
   * @param userId - Child user ID
   * @param status - New status
   * @param oldStatus - Previous status
   *
   * @private
   */
  private async emitProgressUpdateToParent(
    taskId: string,
    userId: string,
    status: TaskProgressStatus,
    oldStatus: TaskProgressStatus,
  ): Promise<void> {
    try {
      // Get task to find parent (creator)
      const task = await this.taskModel
        .findById(taskId)
        .select('createdById title taskType');
      if (!task) return;

      const parentId = task.createdById.toString();

      // Get child name and profile image
      const child = await this.userModel.findById(userId).select('name profileImage');
      if (!child) return;

      // Determine event type and message
      let eventType: string;
      let message: string;

      if (
        status === TaskProgressStatus.IN_PROGRESS &&
        oldStatus === TaskProgressStatus.NOT_STARTED
      ) {
        eventType = TASK_PROGRESS_SOCKET_EVENTS.PROGRESS_STARTED;
        message = `${child.name} started working on "${task.title}"`;
      } else if (status === TaskProgressStatus.COMPLETED) {
        eventType = TASK_PROGRESS_SOCKET_EVENTS.PROGRESS_COMPLETED;
        message = `${child.name} completed "${task.title}"`;
      } else {
        this.logger.debug(`Skipping event for status change: ${oldStatus} → ${status}`);
        return; // Skip other status changes
      }

      // Emit to parent via Socket.IO
      await this.socketService.emitToTaskUsers([parentId], eventType, {
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
        await this.socketService.broadcastGroupActivity(parentId, {
          type:
            status === TaskProgressStatus.COMPLETED
              ? TASK_PROGRESS_ACTIVITY_TYPES.TASK_COMPLETED
              : TASK_PROGRESS_ACTIVITY_TYPES.TASK_STARTED,
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

      this.logger.log(`🚀 Emitted ${eventType} to parent ${parentId}`);
    } catch (error) {
      this.logger.error(
        `Error emitting progress update to parent: ${error.message}`,
        error.stack,
      );
      // Don't throw - Socket.IO emission is optional
    }
  }

  /**
   * Bulk create progress records for all assigned children
   * Called when a new collaborative task is created
   *
   * @param taskId - Task ID
   * @param assignedUserIds - Array of child user IDs
   * @returns Array of created progress records
   *
   * @example
   * // Create progress for all assigned children
   * const progressRecords = await this.bulkCreateForTask(
   *   taskId,
   *   ['userId1', 'userId2', 'userId3']
   * );
   */
  async bulkCreateForTask(
    taskId: string,
    assignedUserIds: string[],
  ): Promise<TaskProgressDocument[]> {
    const taskObjectId = new Types.ObjectId(taskId);

    this.logger.log(`Bulk creating progress for ${assignedUserIds.length} children`);

    const progressRecords = await Promise.all(
      assignedUserIds.map(async (userId) => {
        const userObjectId = new Types.ObjectId(userId);

        // Check if already exists
        const existing = await this.taskProgressModel.findOne({
          taskId: taskObjectId,
          userId: userObjectId,
          isDeleted: false,
        });

        if (existing) {
          return existing;
        }

        // Create new progress record
        return this.taskProgressModel.create({
          taskId: taskObjectId,
          userId: userObjectId,
          status: TaskProgressStatus.NOT_STARTED,
          completedSubtaskIndexes: [],
          progressPercentage: 0,
        });
      }),
    );

    this.logger.log(`Created ${progressRecords.length} progress records`);
    return progressRecords;
  }

  /**
   * Delete progress record (soft delete)
   *
   * @param taskId - Task ID
   * @param userId - User ID
   * @returns Deleted progress record
   */
  async deleteProgress(
    taskId: string,
    userId: string,
  ): Promise<TaskProgressDocument> {
    const taskObjectId = new Types.ObjectId(taskId);
    const userObjectId = new Types.ObjectId(userId);

    const progress = await this.taskProgressModel.findOne({
      taskId: taskObjectId,
      userId: userObjectId,
      isDeleted: false,
    });

    if (!progress) {
      throw new NotFoundException('Progress record not found');
    }

    progress.isDeleted = true;
    await progress.save();

    // Invalidate cache
    await this.invalidateCache(taskId, userId);

    this.logger.log(`Soft deleted progress for task ${taskId} user ${userId}`);
    return progress;
  }
}
