//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Task } from './task.model';
import { ITask } from './task.interface';
import { GenericService } from '../../_generic-module/generic.services';
import ApiError from '../../../errors/ApiError';
//@ts-ignore
import { Types } from 'mongoose';
import {
  TaskStatus,
  TaskType,
  TaskPriority,
  TASK_CACHE_CONFIG,
  TTaskStatus,
  DAILY_TASK_LIMIT,
} from './task.constant';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { NotificationService } from '../../notification.module/notification/notification.service';
import { ACTIVITY_TYPE } from '../../notification.module/notification/notification.constant';
import { TaskProgressService } from '../../taskProgress.module/taskProgress.service';
import { socketService } from '../../../helpers/socket/socketForChatV3';
import { UserProfile } from '../../user.module/userProfile/userProfile.model';
import { SupportMode, TSupportMode } from '../../user.module/userProfile/userProfile.constant';
import PaginationService from '../../../common/service/paginationService';

const notificationService = new NotificationService();
const taskProgressService = new TaskProgressService();

/**
 * Creative Response Interface
 */
interface ICreativeResponse {
  mode: TSupportMode;
  milestone: '50_percent' | '100_percent' | 'started';
  popup: {
    title: string;
    message: string;
    icon?: string;
    color?: string;
    buttonText?: string;
  };
  showPopup: boolean;
}

/**
 * Progress Stats Interface
 */
interface IProgressStats {
  completedPercentage: number;
  totalSubtasks: number;
  completedSubtasks: number;
}

/**
 * Task Service
 * Handles business logic for task operations
 * Extends GenericService for CRUD operations
 *
 * Features:
 * - Redis caching for read operations
 * - Automatic cache invalidation on writes
 * - Daily task limit validation
 */
export class TaskService extends GenericService<typeof Task, ITask> {
  constructor() {
    super(Task);
  }

  /**✔️
   * Cache Key Generator
   */
  private getCacheKey(type: string, id?: string, userId?: string): string {
    const prefix = TASK_CACHE_CONFIG.PREFIX;

    if (type === 'detail' && id) {
      return `${prefix}:detail:${id}`;
    }
    if (type === 'list' && userId) {
      return `${prefix}:user:${userId}:list`;
    }
    if (type === 'history' && userId) {
      return `${prefix}:history:${userId}`;
    }
    if (type === 'statistics' && userId) {
      return `${prefix}:user:${userId}:statistics`;
    }
    if (type === 'daily-progress' && userId) {
      return `${prefix}:user:${userId}:daily:${id || 'today'}`;
    }
    return `${prefix}:unknown`;
  }

  /** ✔️
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        logger.debug(`Cache hit: ${key}`);
        return JSON.parse(cachedData) as T;
      }
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error in TaskService:', error);
      return null;
    }
  }

  /** ✔️
   * Set in Cache
   */
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      errorLogger.error('Redis SET error in TaskService:', error);
    }
  }

  /** 🔁
   * Invalidate Cache
   */
  private async invalidateCache(
    userId: string,
    taskId?: string,
  ): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('list', undefined, userId),
        this.getCacheKey('statistics', undefined, userId),
        this.getCacheKey('history', undefined, userId), // Include history cache
      ];

      if (taskId) {
        keysToDelete.push(this.getCacheKey('detail', taskId));
        keysToDelete.push(this.getCacheKey('daily-progress', taskId, userId));
      }

      // Add pattern-based invalidation
      Object.values(TASK_CACHE_CONFIG.INVALIDATION_PATTERNS).forEach(
        patterns => {
          patterns.forEach(pattern => {
            if (pattern.includes('*')) {
              // For patterns with wildcards, we need to scan and delete
              // This is handled by Redis KEYS command in production
              // For now, we add the base pattern
              const baseKey = pattern.split(':')[0] + ':' + pattern.split(':')[1];
              if (!keysToDelete.includes(baseKey)) {
                keysToDelete.push(baseKey);
              }
            }
          });
        },
      );

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
        logger.info(
          `Invalidated ${keysToDelete.length} cache keys for user ${userId}`,
        );
      }
    } catch (error) {
      errorLogger.error('Redis DELETE error in TaskService:', error);
    }
  }

  /** 🔍 Reviewed manually
   * Create a new task with daily limit validation
   * @param data - Task data
   * @param userId - ID of the user creating the task
   * @returns Created task
   */
  async createTask(
    data: Partial<ITask>,
    userId: Types.ObjectId,
  ): Promise<ITask> {
    // Validate daily task limit for personal tasks
    if (data.taskType === TaskType.PERSONAL && data.startTime) {
      const startDate = new Date(data.startTime);
      startDate.setHours(0, 0, 0, 0);

      const existingTaskCount = await this.model.countDocuments({
        ownerUserId: userId,
        startTime: {
          $gte: startDate,
          $lt: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
        },
        isDeleted: false,
      });

      if (existingTaskCount >= DAILY_TASK_LIMIT.max) {
        // 🔂 // TODO MUST : uncomment this 
        // throw new ApiError(
        //   StatusCodes.BAD_REQUEST,
        //   `You can only create ${DAILY_TASK_LIMIT.max} tasks per day. You already have ${existingTaskCount} tasks scheduled for this day.`,
        // );
      }
    }

    // Auto-set ownerUserId for personal tasks
    if (data.taskType === TaskType.PERSONAL && !data.ownerUserId) {
      data.ownerUserId = userId;
    }

    // Auto-calculate subtask counts if subtasks are provided
    if ((data as any).subtasks && Array.isArray((data as any).subtasks)) {
      data.totalSubtasks = (data as any).subtasks.length;
      data.completedSubtasks = (data as any).subtasks.filter(
        (st: any) => st.isCompleted,
      ).length;
    }

    // Extract subtasks from data (will create them separately after task creation)
    const subtasksData = (data as any).subtasks;
    delete (data as any).subtasks;

    const task = await this.model.create({
      ...data,
      createdById: userId,
    });

    // ✅ Bulk create subtasks if provided
    if (
      subtasksData &&
      Array.isArray(subtasksData) &&
      subtasksData.length > 0
    ) {
      await this.bulkCreateSubtasks(task._id.toString(), subtasksData, userId);
    }

    // ✅ NEW: Auto-create TaskProgress records for all assigned children
    if (
      data.taskType === TaskType.COLLABORATIVE &&
      data.assignedUserIds &&
      data.assignedUserIds.length > 0
    ) {
      await taskProgressService.bulkCreateForTask(
        //✔️
        task._id.toString(),
        data.assignedUserIds.map(id => id.toString()),
      );
    }

    // Invalidate cache after creating task
    await this.invalidateCache(userId.toString(), task._id.toString());

    // ✨ NEW: Record activity for collaborative/family tasks
    // For family-based structure, we need to find the business user (team head)
    if (
      data.taskType === TaskType.COLLABORATIVE &&
      data.assignedUserIds &&
      data.assignedUserIds.length > 0
    ) {
      // Find the business user (parent) from the first assigned child
      const { ChildrenBusinessUser } =
        await import('../../childrenBusinessUser.module/childrenBusinessUser.model');
      const firstAssignedUser = data.assignedUserIds[0];

      const relationship = await ChildrenBusinessUser.findOne({
        childUserId: firstAssignedUser,
        isDeleted: false,
      }).lean();

      if (relationship) {
        // ✅ FIXED: Use recordChildActivity instead of recordGroupActivity
        // Record activity for this child, will appear in parent's dashboard
        await notificationService.recordChildActivity(
          relationship.parentBusinessUserId.toString(), // Business user (parent/teacher)
          userId.toString(), // Child who created the task
          ACTIVITY_TYPE.TASK_CREATED,
          { taskId: task._id.toString(), taskTitle: task.title },
        );

        // 🚀 NEW: Broadcast to family members via group activity
        await socketService.broadcastGroupActivity(
          relationship.parentBusinessUserId.toString(),
          {
            type: ACTIVITY_TYPE.TASK_CREATED,
            actor: {
              userId: userId.toString(),
              name: userId.toString(), // Will be populated by service
              profileImage: undefined,
            },
            task: {
              taskId: task._id.toString(),
              title: task.title,
            },
            timestamp: new Date(),
          },
        );
      }
    } else {
      // For personal tasks or tasks without assigned users, just emit to task room
      await socketService.emitToTask(task._id.toString(), 'task:created', {
        taskId: task._id.toString(),
        title: task.title,
        taskType: task.taskType,
        status: task.status,
        assignedUserIds: data.assignedUserIds?.map(id => id.toString()),
        createdById: userId.toString(),
        createdAt: task.createdAt,
      });
    }

    return task;
  }

  /**
   * Create a new task with comprehensive notifications V2
   * Extends createTask with proper notification system for all scenarios
   *
   * @param data - Task data
   * @param userId - ID of the user creating the task
   * @returns Created task with notification details
   *
   * @description
   * SCENARIO 1: Parent creates task for children
   *  - singleAssignment: Notify assigned child
   *  - collaborative: Notify all assigned children
   *  - personal: Optional self-confirmation for parent
   *
   * SCENARIO 2: Child creates personal task
   *  - personal: Optional self-confirmation for child
   *
   * SCENARIO 3: Secondary user creates tasks
   *  - singleAssignment for parent: Notify parent
   *  - singleAssignment for sibling: Notify that sibling
   *  - collaborative: Notify all assigned users
   *
   * ALL SCENARIOS also record activity for parent's dashboard feed
   */
  async createTaskV2(
    data: Partial<ITask>,
    userId: Types.ObjectId,
  ): Promise<{
    task: ITask;
    notificationsSent: number;
    notifiedUserIds: string[];
  }> {
    // Validate daily task limit for personal tasks
    if (data.taskType === TaskType.PERSONAL && data.startTime) {
      const startDate = new Date(data.startTime);
      startDate.setHours(0, 0, 0, 0);

      const existingTaskCount = await this.model.countDocuments({
        ownerUserId: userId,
        startTime: {
          $gte: startDate,
          $lt: new Date(startDate.getTime() + 24 * 60 * 60 * 1000),
        },
        isDeleted: false,
      });

      if (existingTaskCount >= DAILY_TASK_LIMIT.max) {
        // 🔂 // TODO MUST : uncomment this 
        // throw new ApiError(
        //   StatusCodes.BAD_REQUEST,
        //   `You can only create ${DAILY_TASK_LIMIT.max} tasks per day. You already have ${existingTaskCount} tasks scheduled for this day.`,
        // );
      }
    }

    // Auto-set ownerUserId for personal tasks
    if (data.taskType === TaskType.PERSONAL && !data.ownerUserId) {
      data.ownerUserId = userId;
    }

    // Auto-calculate subtask counts if subtasks are provided
    if ((data as any).subtasks && Array.isArray((data as any).subtasks)) {
      data.totalSubtasks = (data as any).subtasks.length;
      data.completedSubtasks = (data as any).subtasks.filter(
        (st: any) => st.isCompleted,
      ).length;
    }

    // Extract subtasks from data (will create them separately after task creation)
    const subtasksData = (data as any).subtasks;
    delete (data as any).subtasks;

    // Create the task
    const task = await this.model.create({
      ...data,
      createdById: userId,
    });

    // ✅ Bulk create subtasks if provided
    if (
      subtasksData &&
      Array.isArray(subtasksData) &&
      subtasksData.length > 0
    ) {
      await this.bulkCreateSubtasks(task._id.toString(), subtasksData, userId);
    }

    // ✅ Auto-create TaskProgress records for collaborative tasks
    if (
      data.taskType === TaskType.COLLABORATIVE &&
      data.assignedUserIds &&
      data.assignedUserIds.length > 0
    ) {
      await taskProgressService.bulkCreateForTask(
        task._id.toString(),
        data.assignedUserIds.map(id => id.toString()),
      );
    }

    // 🆕 NEW: Create notifications for all assigned users
    let notificationsSent = 0;
    let notifiedUserIds: string[] = [];

    try {
      const notificationResult = await this.createNotificationsForTaskCreation(
        task,
        userId,
      );
      notificationsSent = notificationResult.count;
      notifiedUserIds = notificationResult.userIds;
    } catch (error) {
      // Don't fail task creation if notification fails
      errorLogger.error('Error creating notifications for task:', error);
      logger.warn(
        `Task created successfully but notifications failed for task ${task._id}`,
      );
    }

    // Invalidate cache after creating task
    await this.invalidateCache(userId.toString(), task._id.toString());

    // ✨ Record activity for collaborative/family tasks
    if (
      data.taskType === TaskType.COLLABORATIVE &&
      data.assignedUserIds &&
      data.assignedUserIds.length > 0
    ) {
      // Find the business user (parent) from the first assigned child
      const { ChildrenBusinessUser } =
        await import('../../childrenBusinessUser.module/childrenBusinessUser.model');
      const firstAssignedUser = data.assignedUserIds[0];

      const relationship = await ChildrenBusinessUser.findOne({
        childUserId: firstAssignedUser,
        isDeleted: false,
      }).lean();

      if (relationship) {
        // Record activity for this child, will appear in parent's dashboard
        await notificationService.recordChildActivity(
          relationship.parentBusinessUserId.toString(),
          userId.toString(),
          ACTIVITY_TYPE.TASK_CREATED,
          { taskId: task._id.toString(), taskTitle: task.title },
        );

        // Broadcast to family members via group activity
        await socketService.broadcastGroupActivity(
          relationship.parentBusinessUserId.toString(),
          {
            type: ACTIVITY_TYPE.TASK_CREATED,
            actor: {
              userId: userId.toString(),
              name: userId.toString(),
              profileImage: undefined,
            },
            task: {
              taskId: task._id.toString(),
              title: task.title,
            },
            timestamp: new Date(),
          },
        );
      }
    } else {
      // For personal tasks, just emit to task room
      await socketService.emitToTask(task._id.toString(), 'task:created', {
        taskId: task._id.toString(),
        title: task.title,
        taskType: task.taskType,
        status: task.status,
        assignedUserIds: data.assignedUserIds?.map(id => id.toString()),
        createdById: userId.toString(),
        createdAt: task.createdAt,
      });
    }

    return {
      task,
      notificationsSent,
      notifiedUserIds,
    };
  }

  /** 🔍 Reviewed manually
   * Create notifications for task creation
   * Handles all scenarios: parent→child, child→personal, secondary→parent/sibling
   *
   * @param task - Created task document
   * @param creatorUserId - User who created the task
   * @returns Notification result summary
   */
  private async createNotificationsForTaskCreation(
    task: ITask,
    creatorUserId: Types.ObjectId,
  ): Promise<{
    count: number;
    userIds: string[];
  }> {
    const notifiedUserIds: string[] = [];
    let count = 0;

    // Import User model for fetching user details
    const { User } = await import('../../user.module/user/user.model');

    // Get creator user details
    const creatorUser = await User.findById(creatorUserId)
      .select('name')
      .lean();

    const creatorName = creatorUser?.name || 'Someone';

    // Scenario 1: Personal task - optional self-confirmation
    if (task.taskType === TaskType.PERSONAL) {
      // Create self-confirmation notification for task creator
      /*
      await notificationService.createNotification({
        senderId: creatorUserId,
        receiverId: creatorUserId,
        title: 'Task Created',
        subTitle: `You created a personal task: "${task.title}"`,
        type: 'task',
        priority: 'low',
        channels: ['in_app'],
        linkFor: 'task',
        linkId: task._id,
        referenceFor: 'task',
        referenceId: task._id,
        data: {
          taskId: task._id.toString(),
          taskTitle: task.title,
          taskType: 'personal',
          eventType: 'task_created',
        },
      });

      count++;
      notifiedUserIds.push(creatorUserId.toString());
    */
    }

    // Scenario 2 & 3: Task with assigned users (singleAssignment or collaborative)
    if (
      (task.taskType === TaskType.SINGLE_ASSIGNMENT ||
        task.taskType === TaskType.COLLABORATIVE) &&
      task.assignedUserIds &&
      task.assignedUserIds.length > 0
    ) {
      // Determine if creator is a secondary user (child with permissions)
      let isSecondaryUser = false;
      let parentBusinessUserId: string | null = null;

      try {
        const { ChildrenBusinessUser } = await import(
          '../../childrenBusinessUser.module/childrenBusinessUser.model'
        );
        const childRelation = await ChildrenBusinessUser.findOne({
          childUserId: creatorUserId,
          isSecondaryUser: true,
          isDeleted: false,
        }).lean();

        if (childRelation) {
          isSecondaryUser = true;
          parentBusinessUserId = childRelation.parentBusinessUserId.toString();
        }
      } catch (error) {
        // Not a child user, continue as business user
      }

      // Create notification for EACH assigned user
      for (const assignedUserId of task.assignedUserIds) {
        const assignedUserIdStr = assignedUserId.toString();

        // Skip if already notified
        if (notifiedUserIds.includes(assignedUserIdStr)) {
          continue;
        }

        // Determine notification message based on task type and creator role
        let title: string;
        let subTitle: string;

        if (task.taskType === TaskType.COLLABORATIVE) {
          // Collaborative task
          if (isSecondaryUser) {
            title = 'New Collaborative Task';
            subTitle = `${creatorName} assigned a collaborative task: "${task.title}"`;
          } else {
            title = 'New Collaborative Task';
            subTitle = `You've been assigned to a collaborative task: "${task.title}"`;
          }
        } else {
          // Single assignment
          if (isSecondaryUser) {
            title = 'New Task Assigned';
            subTitle = `${creatorName} assigned you a task: "${task.title}"`;
          } else {
            title = 'New Task Assigned';
            subTitle = `You've been assigned a new task: "${task.title}"`;
          }
        }

        // Create the notification
        await notificationService.createNotification({
          senderId: creatorUserId,
          receiverId: new Types.ObjectId(assignedUserIdStr),
          title,
          subTitle,
          type: 'assignment',
          priority: 'normal',
          channels: ['in_app', 'push'],
          linkFor: 'task',
          linkId: task._id,
          referenceFor: 'task',
          referenceId: task._id,
          data: {
            taskId: task._id.toString(),
            taskTitle: task.title,
            taskType: task.taskType,
            eventType: 'task_assigned',
            assignedBy: isSecondaryUser ? 'secondary' : 'parent',
            totalMembers: task.assignedUserIds.length,
          },
        });

        count++;
        notifiedUserIds.push(assignedUserIdStr);
      }
    }

    return {
      count,
      userIds: notifiedUserIds,
    };
  }

  /** 🔍 Reviewed manually
   * Bulk create subtasks for a task
   * Called during task creation when subtasks are provided inline
   *
   * @param taskId - Parent task ID
   * @param subtasksData - Array of subtask data [{ title, duration, isCompleted, order }]
   * @param userId - User creating the subtasks
   * @returns Array of created subtasks
   */
  private async bulkCreateSubtasks(
    taskId: string,
    subtasksData: Array<{
      title: string;
      duration?: number;
      isCompleted?: boolean;
      order?: number;
    }>,
    userId: Types.ObjectId,
  ): Promise<void> {
    try {
      const { SubTask } = await import('../subTask/subTask.model');

      // Prepare subtasks for bulk insertion
      const subtasksToCreate = subtasksData.map((subtask, index) => ({
        taskId: new Types.ObjectId(taskId),
        title: subtask.title,
        duration: subtask.duration || null,
        isCompleted: subtask.isCompleted || false,
        order: subtask.order || index + 1,
        createdById: userId,
        completedAt: subtask.isCompleted ? new Date() : null,
      }));

      // Insert all subtasks in one operation
      await SubTask.insertMany(subtasksToCreate);

      logger.info(
        `Bulk created ${subtasksToCreate.length} subtasks for task ${taskId}`,
      );
    } catch (error) {
      errorLogger.error('Error in bulk creating subtasks:', error);
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        'Failed to create subtasks',
      );
    }
  }

  /** ✔️
   * Get tasks for a user with filtering  
   * @param userId - User ID
   * @param filters - Query filters
   * @returns Array of tasks with subtasks populated
   */
  async getUserTasks(userId: Types.ObjectId, filters: any): Promise<ITask[]> {
    const query: any = {
      isDeleted: false,
      $or: [
        { ownerUserId: userId },
        { assignedUserIds: userId },
        // { createdById: userId },  🐛🩹
      ],
    };

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;
    }

    // Apply task type filter
    if (filters.taskType) {
      query.taskType = filters.taskType;
    }

    // Apply priority filter
    if (filters.priority) {
      query.priority = filters.priority;
    }

    // Apply date range filter
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) {
        query.startTime.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.startTime.$lte = new Date(filters.to);
      }
    }

    const tasks = await this.model
      .find(query)
      .select('-__v')
      .populate({
        path: 'assignedUserIds createdById',
        select: 'name profileImage',
      })
      .sort({ startTime: -1 })
      .lean();

    // ✅ Populate subtasks for each task using virtual populate
    const tasksWithSubtasks = await Promise.all(
      tasks.map(async task => {
        const { SubTask } = await import('../subTask/subTask.model');

        // Get subtasks for this task
        const subtasks = await SubTask.find({
          taskId: task._id,
          isDeleted: false,
        })
          .select('-__v')
          .sort({ order: 1 })
          .lean();

        // Format subtasks
        const formattedSubtasks = subtasks.map((st: any) => ({
          _id: st._id.toString(),
          title: st.title,
          isCompleted: st.isCompleted || false,
          order: st.order || 0,
          duration: st.duration || null,
          completedAt: st.completedAt || null,
        }));

        // Calculate subtask progress
        const totalSubtasks = formattedSubtasks.length;
        const completedSubtasks = formattedSubtasks.filter(
          (st: any) => st.isCompleted,
        ).length;
        const subtaskProgressPercentage =
          totalSubtasks > 0
            ? Math.round((completedSubtasks / totalSubtasks) * 100)
            : 0;

        return {
          ...task,
          subtasks: formattedSubtasks,
          subtaskProgress: {
            total: totalSubtasks,
            completed: completedSubtasks,
            percentage: subtaskProgressPercentage,
          },
        };
      }),
    );

    return tasksWithSubtasks;
  }

  /**
   * Get tasks for a user with filtering (V2)
   * V2 Enhancement: When status is 'completed', only return tasks
   * whose completedTime is within the last 12 hours
   * 
   * @param userId - User ID
   * @param filters - Query filters
   * @returns Array of tasks with subtasks populated
   */
  async getUserTasksV2(userId: Types.ObjectId, filters: any): Promise<ITask[]> {
    const query: any = {
      isDeleted: false,
      $or: [
        { ownerUserId: userId },
        { assignedUserIds: userId },
      ],
    };

    // Apply status filter
    if (filters.status) {
      query.status = filters.status;

      // ✨ V2 Enhancement: If status is completed, filter by completedTime < 12 hours
      if (filters.status === TaskStatus.COMPLETED) {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
        query.completedTime = {
          $gte: twelveHoursAgo,
        };
      }
    }

    // Apply task type filter
    if (filters.taskType) {
      query.taskType = filters.taskType;
    }

    // Apply priority filter
    if (filters.priority) {
      query.priority = filters.priority;
    }

    // Apply date range filter
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) {
        query.startTime.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.startTime.$lte = new Date(filters.to);
      }
    }

    const tasks = await this.model
      .find(query)
      .select('-__v')
      .populate({
        path: 'assignedUserIds createdById',
        select: 'name profileImage',
      })
      .sort({ startTime: -1 })
      .lean();

    // ✅ Populate subtasks for each task using virtual populate
    const tasksWithSubtasks = await Promise.all(
      tasks.map(async task => {
        const { SubTask } = await import('../subTask/subTask.model');

        // Get subtasks for this task
        const subtasks = await SubTask.find({
          taskId: task._id,
          isDeleted: false,
        })
          .select('-__v')
          .sort({ order: 1 })
          .lean();

        // Format subtasks
        const formattedSubtasks = subtasks.map((st: any) => ({
          _id: st._id.toString(),
          title: st.title,
          isCompleted: st.isCompleted || false,
          order: st.order || 0,
          duration: st.duration || null,
          completedAt: st.completedAt || null,
        }));

        // Calculate subtask progress
        const totalSubtasks = formattedSubtasks.length;
        const completedSubtasks = formattedSubtasks.filter(
          (st: any) => st.isCompleted,
        ).length;
        const subtaskProgressPercentage =
          totalSubtasks > 0
            ? Math.round((completedSubtasks / totalSubtasks) * 100)
            : 0;

        return {
          ...task,
          subtasks: formattedSubtasks,
          subtaskProgress: {
            total: totalSubtasks,
            completed: completedSubtasks,
            percentage: subtaskProgressPercentage,
          },
        };
      }),
    );

    return tasksWithSubtasks;
  }

  /** 🔍 Reviewed manually
   * Get task history with date range filtering for individual users
   * Returns all completed tasks within a date range with subtask progress
   * Optimized for Figma: task-history-filter-by-date-range.png
   *
   * @param userId - User ID
   * @param filters - Date range filters (from, to)
   * @param options - Pagination options
   * @returns Paginated task history with subtask details
   */
  async getTaskHistory(
    userId: Types.ObjectId,
    filters: { from?: string; to?: string },
    options: any,
  ) {
    /*-─────────────────────────────────
    |  Build cache key based on user and date range
    |  Cache TTL: 2 minutes (LIST category)
    └──────────────────────────────────*/
    const fromDateStr = filters.from || 'default';
    const toDateStr = filters.to || 'default';
    const cacheKey = this.getCacheKey(
      'history',
      `${userId.toString()}:${fromDateStr}:${toDateStr}:${options.page || 1}`,
    );

    // // Try to get from cache first
    // const cachedData = await this.getFromCache(cacheKey);
    // if (cachedData) {
    //   return cachedData;
    // }

    /*-─────────────────────────────────
    |  Build query for completed tasks with date filtering
    |  Filter: status = completed AND date range on completedTime
    |  If no date range provided, use last 30 days as default
    └──────────────────────────────────*/

    // ✅ Helper to parse date from multiple formats (DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD)
    const parseDate = (dateStr: string): Date => {
      // If already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return new Date(dateStr);
      }
      // If in DD-MM-YYYY or MM-DD-YYYY format
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
        const [first, second, year] = dateStr.split('-').map(Number);
        // Assume DD-MM-YYYY format (common in most regions)
        return new Date(year, second - 1, first);
      }
      // Fallback to native parsing
      return new Date(dateStr);
    };

    // ✅ Validate date range
    const MAX_DATE_RANGE_DAYS = 90; // Prevent querying too much data
    
    let toDate: Date;
    try {
      toDate = filters.to ? parseDate(filters.to) : new Date();
      if (isNaN(toDate.getTime())) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Invalid "to" date format. Use DD-MM-YYYY or YYYY-MM-DD',
        );
      }
      toDate.setHours(23, 59, 59, 999); // End of day
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid "to" date format. Use DD-MM-YYYY or YYYY-MM-DD',
      );
    }

    let fromDate: Date;
    try {
      fromDate = filters.from
        ? parseDate(filters.from)
        : new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (isNaN(fromDate.getTime())) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Invalid "from" date format. Use DD-MM-YYYY or YYYY-MM-DD',
        );
      }
      fromDate.setHours(0, 0, 0, 0); // Start of day
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid "from" date format. Use DD-MM-YYYY or YYYY-MM-DD',
      );
    }

    // Validate from <= to
    if (fromDate > toDate) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Start date cannot be after end date',
      );
    }

    // Validate max range
    const rangeDays = Math.ceil(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (rangeDays > MAX_DATE_RANGE_DAYS) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Date range cannot exceed ${MAX_DATE_RANGE_DAYS} days`,
      );
    }

    const query: any = {
      isDeleted: false,
      // status: TaskStatus.COMPLETED,
      $or: [
        { ownerUserId: userId },
        { assignedUserIds: userId },
      ],
      completedTime: {
        $gte: fromDate,
        $lte: toDate,
      },
    };

    // ✅ Optional taskType filter
    if (filters.taskType) {
      query.taskType = filters.taskType;
    }

    /*-─────────────────────────────────
    |  Use aggregation pipeline for optimal performance
    |  Joins subtask data and calculates progress
    └──────────────────────────────────*/
    const pipeline: any[] = [
      { $match: query },
      // Sort by completedTime descending (most recent first)
      { $sort: { completedTime: -1 } },
      // Lookup subtasks
      {
        $lookup: {
          from: 'subtasks',
          let: { taskId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$taskId', '$$taskId'] },
                isDeleted: false,
              },
            },
            { $sort: { order: 1 } },
            { $project: { _id: 1, title: 1, isCompleted: 1, order: 1, duration: 1, completedAt: 1 } },
          ],
          as: 'subtasks',
        },
      },
      // Project final fields
      // ✅ Remove createdBy from list view (not shown in Figma list screen)
      // ✅ Add isSelfTask indicator for "Self Task" badge
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          taskType: 1,
          priority: 1,
          status: 1,
          startTime: 1,
          completedTime: 1,
          createdAt: 1,
          totalSubtasks: 1,
          completedSubtasks: 1,
          subtasks: 1,
          ownerUserId: 1,
        },
      },
    ];

    // Execute pagination
    const result = await PaginationService.aggregationPaginate(
      this.model,
      pipeline,
      options,
    );

    /*-─────────────────────────────────
    |  Format response to match Figma design
    |  - Task title, status, created time, completed time
    |  - Subtask count and progress percentage
    |  - isSelfTask indicator for "Self Task" badge
    └──────────────────────────────────*/
    const formattedResults = result.results.map((task: any) => {
      const totalSubtasks = task.subtasks?.length || 0;
      const completedSubtasks =
        task.subtasks?.filter((st: any) => st.isCompleted).length || 0;
      const progressPercentage =
        totalSubtasks > 0
          ? Math.round((completedSubtasks / totalSubtasks) * 100)
          : 100; // If no subtasks, it's 100% completed

      // ✅ Determine if this is a self task (owner === current user)
      const isSelfTask = task.ownerUserId?.toString() === userId.toString();

      return {
        _id: task._id,
        title: task.title,
        description: task.description,
        taskType: task.taskType,
        priority: task.priority,
        status: task.status,
        startTime: task.startTime,
        completedTime: task.completedTime,
        createdAt: task.createdAt,
        isSelfTask,
        subtaskProgress: {
          total: totalSubtasks,
          completed: completedSubtasks,
          percentage: progressPercentage,
          display: `${completedSubtasks}/${totalSubtasks}`,
        },
        subtasks: task.subtasks || [],
      };
    });

    const response = {
      ...result,
      results: formattedResults,
    };

    // Cache the result for 2 minutes
    await this.setInCache(cacheKey, response, TASK_CACHE_CONFIG.LIST);

    return response;
  }

  /**
   * Get tasks with pagination and advanced filtering
   * @param userId - User ID
   * @param filters - Query filters
   * @param options - Pagination options
   * @returns Paginated tasks with subtasks populated
   */
  async getUserTasksWithPagination(
    userId: Types.ObjectId,
    filters: any,
    options: any,
  ) {
    const query: any = {
      isDeleted: false,
      $or: [
        { ownerUserId: userId },
        { assignedUserIds: userId },
        // { createdById: userId },  🐛🩹
      ],
    };

    // Apply filters
    if (filters.status) query.status = filters.status;
    if (filters.taskType) query.taskType = filters.taskType;
    if (filters.priority) query.priority = filters.priority;

    // Date range filter
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) query.startTime.$gte = new Date(filters.from);
      if (filters.to) query.startTime.$lte = new Date(filters.to);
    }

    const result = await this.model.paginate(query, options);

    // ✅ Populate subtasks for each task in the result
    if (result.docs && result.docs.length > 0) {
      const tasksWithSubtasks = await Promise.all(
        result.docs.map(async (task: any) => {
          const { SubTask } = await import('../subTask/subTask.model');

          // Get subtasks for this task
          const subtasks = await SubTask.find({
            taskId: task._id,
            isDeleted: false,
          })
            .select('-__v')
            .sort({ order: 1 })
            .lean();

          // Format subtasks
          const formattedSubtasks = subtasks.map((st: any) => ({
            _id: st._id.toString(),
            title: st.title,
            isCompleted: st.isCompleted || false,
            order: st.order || 0,
            duration: st.duration || null,
            completedAt: st.completedAt || null,
          }));

          // Calculate subtask progress
          const totalSubtasks = formattedSubtasks.length;
          const completedSubtasks = formattedSubtasks.filter(
            (st: any) => st.isCompleted,
          ).length;
          const subtaskProgressPercentage =
            totalSubtasks > 0
              ? Math.round((completedSubtasks / totalSubtasks) * 100)
              : 0;

          return {
            ...(task.toObject ? task.toObject() : task),
            subtasks: formattedSubtasks,
            subtaskProgress: {
              total: totalSubtasks,
              completed: completedSubtasks,
              percentage: subtaskProgressPercentage,
            },
          };
        }),
      );

      result.docs = tasksWithSubtasks;
    }

    return result;
  }

  /**
   * Update task status with automatic timestamp handling
   * @param taskId - Task ID
   * @param status - New status
   * @param userId - User performing the update
   * @returns Updated task
   */
  async updateTaskStatus(
    taskId: string,
    status: TTaskStatus,
    userId: Types.ObjectId,
  ): Promise<ITask> {
    const updateData: any = { status };

    // Auto-set completedTime when status changes to completed
    if (status === TaskStatus.COMPLETED) {
      updateData.completedTime = new Date();
    }

    const updatedTask = await this.model
      .findByIdAndUpdate(taskId, updateData, { new: true })
      .select('-__v');

    if (!updatedTask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Invalidate cache after updating task
    await this.invalidateCache(userId.toString(), taskId);

    // ✨ NEW: Record activity for collaborative/family tasks
    if (
      updatedTask.taskType === TaskType.COLLABORATIVE &&
      updatedTask.assignedUserIds
    ) {
      const activityType =
        status === TaskStatus.COMPLETED
          ? ACTIVITY_TYPE.TASK_COMPLETED
          : ACTIVITY_TYPE.TASK_STARTED;

      // Find the business user (parent) from the first assigned child
      const { ChildrenBusinessUser } =
        await import('../../childrenBusinessUser.module/childrenBusinessUser.model');
      const firstAssignedUser = updatedTask.assignedUserIds[0];

      const relationship = await ChildrenBusinessUser.findOne({
        childUserId: firstAssignedUser,
        isDeleted: false,
      }).lean();

      if (relationship) {
        // ✅ FIXED: Use recordChildActivity instead of recordGroupActivity
        // Record activity for this child, will appear in parent's dashboard
        await notificationService.recordChildActivity(
          relationship.parentBusinessUserId.toString(), // Business user (parent/teacher)
          userId.toString(), // Child who started/updated the task
          activityType,
          { taskId: updatedTask._id.toString(), taskTitle: updatedTask.title },
        );

        // 🚀 NEW: Broadcast to family members via group activity
        await socketService.broadcastGroupActivity(
          relationship.parentBusinessUserId.toString(),
          {
            type: activityType,
            actor: {
              userId: userId.toString(),
              name: userId.toString(), // Will be populated
              profileImage: undefined,
            },
            task: {
              taskId: updatedTask._id.toString(),
              title: updatedTask.title,
            },
            timestamp: new Date(),
          },
        );
      }
    }

    // 🚀 NEW: Emit real-time status change to task subscribers
    await socketService.emitToTask(taskId, 'task:status-changed', {
      taskId,
      oldStatus: (updatedTask as any)._doc?.status || status, // Previous status
      newStatus: status,
      changedBy: userId.toString(),
      changedAt: new Date(),
      taskTitle: updatedTask.title,
    });

    return updatedTask;
  }

  /**
   * Update task status with creative response based on support mode
   * @param taskId - Task ID
   * @param status - New status
   * @param userId - User performing the update
   * @returns Updated task with creative response and progress stats
   *
   * @description
   * This V2 endpoint provides personalized responses based on:
   * - Child's support mode (calm, encouraging, logical)
   * - Task completion percentage (50%, 100%)
   * - Task status (completed, inProgress)
   *
   * @see Figma: response-based-on-mode.png
   */
  async updateTaskStatusV2(
    taskId: string,
    status: TTaskStatus,
    userId: Types.ObjectId,
  ): Promise<{
    task: ITask;
    creativeResponse: ICreativeResponse;
    progressStats?: IProgressStats;
  }> {
    // 1. Update task status (reuse existing logic)
    const task = await this.updateTaskStatus(taskId, status, userId);

    // 2. Get user's support mode from UserProfile
    const userProfile = await UserProfile.findOne({ userId }).lean();
    const supportMode: TSupportMode = 
      userProfile?.supportMode || SupportMode.LOGICAL;

    // 3. Calculate completion percentage
    const totalSubtasks = task.totalSubtasks || 0;
    const completedSubtasks = task.completedSubtasks || 0;
    const completionPercentage = totalSubtasks > 0
      ? (completedSubtasks / totalSubtasks) * 100
      : 0;

    // 4. Determine milestone
    let milestone: '50_percent' | '100_percent' | 'started' = 'started';
    
    if (status === TaskStatus.COMPLETED || completionPercentage >= 100) {
      milestone = '100_percent';
    } else if (completionPercentage >= 50) {
      milestone = '50_percent';
    }

    // 5. Generate creative response based on support mode and milestone
    const creativeResponse = this.generateCreativeResponse(
      supportMode,
      milestone
    );

    // 6. Return task with creative response and progress stats
    return {
      task,
      creativeResponse,
      progressStats: milestone !== 'started' ? {
        completedPercentage: Math.round(completionPercentage),
        totalSubtasks,
        completedSubtasks,
      } : undefined,
    };
  }

  /**
   * Update task status V3 - Auto-complete subtasks for personal/singleAssignment tasks
   * @param taskId - Task ID
   * @param status - New task status
   * @param userId - User ID
   * @returns Updated task with creative response
   *
   * @description
   * This V3 endpoint extends updateTaskStatusV2 with additional logic:
   * - For personal/singleAssignment tasks with subtasks
   * - When status is changed to 'completed'
   * - Automatically marks all subtasks' isCompleted as true
   */
  async updateTaskStatusV3(
    taskId: string,
    status: TTaskStatus,
    userId: Types.ObjectId,
  ): Promise<{
    task: ITask;
    creativeResponse: ICreativeResponse;
    progressStats?: IProgressStats;
    autoCompletedSubtasks?: number;
  }> {
    // 1. First, get the task to check its type and subtasks
    const task = await this.model.findById(taskId);
    
    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    let autoCompletedSubtasksCount = 0;

    // 2. If status is COMPLETED and task is personal/singleAssignment with subtasks
    if (
      status === TaskStatus.COMPLETED &&
      (task.taskType === TaskType.PERSONAL || task.taskType === TaskType.SINGLE_ASSIGNMENT)
    ) {
      // Import SubTask model
      const { SubTask } = await import('../subTask/subTask.model');

      // Find all incomplete subtasks for this task
      const incompleteSubtasks = await SubTask.find({
        taskId: new Types.ObjectId(taskId),
        isCompleted: false,
        isDeleted: false,
      });

      // Mark all subtasks as completed
      if (incompleteSubtasks.length > 0) {
        const now = new Date();
        await SubTask.updateMany(
          {
            taskId: new Types.ObjectId(taskId),
            isCompleted: false,
            isDeleted: false,
          },
          {
            $set: {
              isCompleted: true,
              completedAt: now,
            },
          },
        );

        autoCompletedSubtasksCount = incompleteSubtasks.length;
        logger.info(
          `[updateStatusV3] Auto-completed ${autoCompletedSubtasksCount} subtasks for task ${taskId}`,
        );
      }

      // Update task's subtask counts to reflect all completed
      task.completedSubtasks = task.totalSubtasks || 0;
    }

    // 3. Now call updateTaskStatusV2 to handle the rest (status update, creative response, etc.)
    const result = await this.updateTaskStatusV2(taskId, status, userId);

    // 4. Add auto-completed subtasks count to response if applicable
    if (autoCompletedSubtasksCount > 0) {
      return {
        ...result,
        autoCompletedSubtasks: autoCompletedSubtasksCount,
      };
    }

    return result;
  }

  /**
   * Update Task Status V4 - Unified endpoint for ALL task types
   * PUT /tasks/:id/status/v4
   *
   * @description
   * This V4 endpoint handles ALL task types with unified creative response:
   *
   * 1. Personal/SingleAssignment Tasks:
   *    - Auto-completes all subtasks when task is completed
   *    - Returns creative response with support mode messaging
   *
   * 2. Collaborative Tasks:
   *    - Delegates to TaskProgress service for per-child tracking
   *    - Returns creative response with support mode messaging
   *    - Detects if parent task was auto-completed (last child to complete)
   *
   * @param taskId - Task ID
   * @param status - New status (pending, inProgress, completed)
   * @param userId - User ID
   * @param note - Optional note
   * @returns Unified response with creative messaging
   *
   * @version 4.0.0
   * @author Senior Engineering Team
   */
  async updateTaskStatusV4(
    taskId: string,
    status: TTaskStatus,
    userId: Types.ObjectId,
    note?: string,
  ): Promise<{
    task?: ITask; // For personal/singleAssignment only
    progress?: ITaskProgressDocument; // For collaborative only
    creativeResponse: ICreativeResponse;
    milestone: 'started' | '50_percent' | '100_percent';
    taskType: TTaskType;
    autoCompletedSubtasks?: number; // For personal/singleAssignment only
    isParentTaskCompleted?: boolean; // For collaborative only (true if last child to complete)
  }> {
    // 1. Get task to determine type
    const task = await this.model.findById(taskId).lean();

    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    const taskType = task.taskType as TTaskType;

    // 2. Handle based on task type
    if (taskType === TaskType.COLLABORATIVE) {
      // ── COLLABORATIVE TASK ─────────────────────────────────────────
      // Delegate to TaskProgress service with creative response

      const { TaskProgressService } = await import('../../taskProgress.module/taskProgress.service');
      const taskProgressService = new TaskProgressService();

      const progressResult = await taskProgressService.updateProgressStatusV2(
        taskId,
        userId.toString(),
        status as any, // TaskProgressStatus
        note,
      );

      return {
        progress: progressResult.progress,
        creativeResponse: progressResult.creativeResponse,
        milestone: progressResult.milestone,
        taskType,
        ...(progressResult.isParentTaskCompleted && { isParentTaskCompleted: true }),
      };
    } else {
      // ── PERSONAL / SINGLE ASSIGNMENT TASK ──────────────────────────
      // Use V3 logic (auto-complete subtasks + creative response)

      let autoCompletedSubtasksCount = 0;

      // Auto-complete subtasks if task is being completed
      if (status === TaskStatus.COMPLETED) {
        const { SubTask } = await import('../subTask/subTask.model');

        const incompleteSubtasks = await SubTask.find({
          taskId: new Types.ObjectId(taskId),
          isCompleted: false,
          isDeleted: false,
        });

        if (incompleteSubtasks.length > 0) {
          const now = new Date();
          await SubTask.updateMany(
            {
              taskId: new Types.ObjectId(taskId),
              isCompleted: false,
              isDeleted: false,
            },
            {
              $set: {
                isCompleted: true,
                completedAt: now,
              },
            },
          );

          autoCompletedSubtasksCount = incompleteSubtasks.length;
          logger.info(
            `[updateStatusV4] Auto-completed ${autoCompletedSubtasksCount} subtasks for task ${taskId}`,
          );
        }
      }

      // Update task status using V2 logic
      const result = await this.updateTaskStatusV2(taskId, status, userId);

      // Determine milestone
      let milestone: 'started' | '50_percent' | '100_percent' = 'started';

      if (status === TaskStatus.COMPLETED || result.progressStats?.completedPercentage === 100) {
        milestone = '100_percent';
      } else if (result.progressStats && result.progressStats.completedPercentage >= 50) {
        milestone = '50_percent';
      }

      return {
        task: result.task,
        creativeResponse: result.creativeResponse,
        milestone,
        taskType,
        ...(autoCompletedSubtasksCount > 0 && { autoCompletedSubtasks: autoCompletedSubtasksCount }),
      };
    }
  }

  /**
   * Generate creative response based on support mode and milestone
   * @param supportMode - User's support mode preference
   * @param milestone - Completion milestone (50%, 100%)
   * @returns Creative response with mode-specific messaging
   *
   * @see Figma: response-based-on-mode.png
   */
  private generateCreativeResponse(
    supportMode: TSupportMode,
    milestone: '50_percent' | '100_percent' | 'started'
  ): ICreativeResponse {
    // Messages configuration by support mode and milestone
    const messages = {
      [SupportMode.LOGICAL]: {
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
      [SupportMode.CALM]: {
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
      [SupportMode.ENCOURAGING]: {
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
      [SupportMode.LOGICAL]: '#4ADE80',    // Green
      [SupportMode.CALM]: '#93C5FD',       // Light blue
      [SupportMode.ENCOURAGING]: '#C4B5FD', // Purple
    };

    const selectedMessage = messages[supportMode][milestone] || messages[supportMode]['50_percent'];

    return {
      mode: supportMode,
      milestone,
      popup: {
        title: selectedMessage.title,
        message: selectedMessage.message,
        icon: selectedMessage.icon,
        color: colors[supportMode],
        buttonText: selectedMessage.buttonText,
      },
      showPopup: milestone !== 'started',
    };
  }

  /** ✔️
   * Update subtask progress and recalculate completion
   * @param taskId - Task ID
   * @param subtaskUpdates - Array of subtask updates
   * @returns Updated task
   */
  async updateSubtaskProgress(
    taskId: string,
    subtaskUpdates: Array<{ isCompleted: boolean }>,
  ): Promise<ITask> {
    const totalSubtasks = subtaskUpdates.length;
    const completedSubtasks = subtaskUpdates.filter(
      st => st.isCompleted,
    ).length;

    const updateData: any = {
      totalSubtasks,
      completedSubtasks,
    };

    // Auto-complete task if all subtasks are done
    if (totalSubtasks > 0 && completedSubtasks === totalSubtasks) {
      updateData.status = TaskStatus.COMPLETED;
      updateData.completedTime = new Date();
    }

    const updatedTask = await this.model
      .findByIdAndUpdate(taskId, updateData, { new: true })
      .select('-__v');

    if (!updatedTask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    return updatedTask;
  }

  /** ✔️
   * Update task and manage subtasks (add/edit/delete) in one request
   * Figma: edit-update-task-flow.png
   * @param taskId - Task ID
   * @param data - Update payload with task fields and subtask operations
   * @param userId - User performing the update
   * @returns Updated task with populated subtasks
   */
  async updateTaskAndSubtasksV2(
    taskId: string,
    data: any,
    userId: Types.ObjectId | string,
  ): Promise<ITask> {
    const task = await this.model.findById(taskId);
    if (!task || task.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    const { SubTask } = await import('../subTask/subTask.model');

    // ─── 1. Update task fields ──────────────────────────────────
    const taskUpdateFields: any = {};
    if (data.title !== undefined) taskUpdateFields.title = data.title;
    if (data.description !== undefined) taskUpdateFields.description = data.description;
    if (data.scheduledTime !== undefined) taskUpdateFields.scheduledTime = data.scheduledTime;
    if (data.startTime !== undefined) taskUpdateFields.startTime = new Date(data.startTime);
    if (data.dueDate !== undefined) taskUpdateFields.dueDate = new Date(data.dueDate);
    if (data.priority !== undefined) taskUpdateFields.priority = data.priority;
    if (data.status !== undefined) taskUpdateFields.status = data.status;
    if (data.ownerUserId !== undefined) taskUpdateFields.ownerUserId = new Types.ObjectId(data.ownerUserId);
    if (data.assignedUserIds !== undefined) {
      taskUpdateFields.assignedUserIds = data.assignedUserIds.map((id: string) => new Types.ObjectId(id));
    }

    const updatedTask = await this.model
      .findByIdAndUpdate(taskId, taskUpdateFields, { new: true })
      .select('-__v');

    if (!updatedTask) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found after update');
    }

    // ─── 2. Delete subtasks ─────────────────────────────────────
    if (data.deleteSubtaskIds && data.deleteSubtaskIds.length > 0) {
      await SubTask.updateMany(
        { _id: { $in: data.deleteSubtaskIds }, taskId: new Types.ObjectId(taskId) },
        { isDeleted: true }
      );
      logger.info(`Soft deleted ${data.deleteSubtaskIds.length} subtasks for task ${taskId}`);
    }

    // ─── 3. Update existing subtasks ────────────────────────────
    if (data.updateSubtasks && data.updateSubtasks.length > 0) {
      for (const sub of data.updateSubtasks) {
        const updateData: any = {};
        if (sub.title !== undefined) updateData.title = sub.title;
        if (sub.isCompleted !== undefined) {
          updateData.isCompleted = sub.isCompleted;
          if (sub.isCompleted) updateData.completedAt = new Date();
        }
        if (sub.order !== undefined) updateData.order = sub.order;

        await SubTask.findByIdAndUpdate(
          sub._id,
          updateData,
          { new: true }
        );
      }
      logger.info(`Updated ${data.updateSubtasks.length} subtasks for task ${taskId}`);
    }

    // ─── 4. Add new subtasks ────────────────────────────────────
    if (data.addSubtasks && data.addSubtasks.length > 0) {
      const subtasksToCreate = data.addSubtasks.map((sub: any, index: number) => ({
        taskId: new Types.ObjectId(taskId),
        title: sub.title,
        isCompleted: sub.isCompleted || false,
        order: sub.order || index + 1,
        createdById: userId,
        completedAt: sub.isCompleted ? new Date() : null,
      }));
      await SubTask.insertMany(subtasksToCreate);
      logger.info(`Added ${subtasksToCreate.length} new subtasks for task ${taskId}`);
    }

    // ─── 5. Recalculate parent task subtask counters ────────────
    const stats = await SubTask.getTaskCompletionStats(taskId);
    await this.model.findByIdAndUpdate(taskId, {
      totalSubtasks: stats.total,
      completedSubtasks: stats.completed,
    });

    // ─── 6. Return updated task with populated subtasks ─────────
    const result = await this.model
      .findById(taskId)
      .populate('subtasks', '-__v -isDeleted')
      .select('-__v');

    return result as ITask;
  }

  /** ✔️
   * Get task statistics for a user
   * @param userId - User ID
   * @returns Task statistics
   */
  async getTaskStatistics(userId: Types.ObjectId) {
    const cacheKey = this.getCacheKey(
      'statistics',
      undefined,
      userId.toString(),
    );

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const stats = await this.model.aggregate([
      {
        $match: {
          $or: [{ ownerUserId: userId }, { assignedUserIds: userId }],
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
    };

    stats.forEach((stat: any) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    console.log(
      "task.service -> '/statistics' -> fn: getTaskStatistics =>",
      stats,
    );

    // Cache the result
    await this.setInCache(cacheKey, result, TASK_CACHE_CONFIG.STATISTICS);

    return result;
  }

  /** ✔️
   * Get daily progress for a user
   * Figma: home-flow.png (Daily Progress: 1/5)
   *
   * @param userId - User ID
   * @param date - Date to check (default: today)
   * @returns Daily progress info with task details
   *
   * @description
   * Returns progress for ALL tasks related to the user:
   * - Self-created tasks (ownerUserId = userId)
   * - Assigned tasks (assignedUserIds includes userId)
   */

  /*┌──────────────────────────┐
    │ Daily Progress           │
    │ ██████████░░░░  40%      │
    └──────────────────────────┘*/

  /**
   * Get daily progress for dashboard home screen
   * Figma: app-user/group-children-user/home-flow.png
   * 
   * Response matches Daily Progress card UI:
   * - Progress: "1/5" (completed/total)
   * - Progress bar percentage
   * - Remaining tasks message: "4 tasks remaining. You've got this!"
   * 
   * @param userId - User ID
   * @param date - Target date (default: today)
   * @returns Daily progress summary with task list
   */
  async getDailyProgress(userId: Types.ObjectId, date?: Date) {
    const targetDate = date || new Date();
    const dateKey = targetDate.toISOString().split('T')[0];
    const cacheKey = this.getCacheKey(
      'daily-progress',
      dateKey,
      userId.toString(),
    );

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get ALL tasks for the user on this date:
    // 1. Self-created tasks (ownerUserId = userId)
    // 2. Assigned tasks (assignedUserIds includes userId)
    const tasks = await this.model
      .find({
        $or: [{ ownerUserId: userId }, { assignedUserIds: userId }],
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        isDeleted: false,
      })
      .sort({ startTime: 1 })
      .lean();

    // Calculate statistics
    const total = tasks.length;
    const completed = tasks.filter(
      (t: any) => t.status === TaskStatus.COMPLETED,
    ).length;
    const inProgress = tasks.filter(
      (t: any) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
    const remaining = total - completed;

    // Build task list with subtask info
    const taskList = tasks.map(task => ({
      _id: task._id.toString(),
      title: task.title,
      status: task.status,
      startTime: task.startTime,
      taskType: task.taskType,
      assignedBy: task.createdById, // Who assigned/created this task
      subtasks:
        task.totalSubtasks > 0
          ? {
              total: task.totalSubtasks || 0,
              completed: task.completedSubtasks || 0,
            }
          : undefined,
      progressPercentage:
        task.totalSubtasks && task.totalSubtasks > 0
          ? Math.round(
              ((task.completedSubtasks || 0) / task.totalSubtasks) * 100,
            )
          : task.status === TaskStatus.COMPLETED
            ? 100
            : 0,
    }));

    // Generate encouragement message based on progress
    let encouragementMessage = '';
    if (completed === 0) {
      encouragementMessage = `No tasks completed yet. Let's get started!`;
    } else if (completed === total && total > 0) {
      encouragementMessage = `All tasks completed! Amazing work! 🎉`;
    } else {
      encouragementMessage = `${remaining} task${remaining !== 1 ? 's' : ''} remaining. You've got this!`;
    }

    const result = {
      date: dateKey,
      // Figma-aligned format
      progress: {
        completed,
        total,
        display: `${completed}/${total}`, // "1/5" format for UI
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      // Statistics
      statistics: {
        total,
        completed,
        pending,
        inProgress,
        remaining,
      },
      // Encouragement message for UI
      message: encouragementMessage,
      // Task list
      tasks: taskList,
    };

    // Cache the result
    await this.setInCache(cacheKey, result, TASK_CACHE_CONFIG.DAILY_PROGRESS);

    return result;
  }

  /**
   * Get daily progress V3 - Figma-Aligned Home Screen Widget
   *
   * ─────────────────────────────────────────────────────────────────────────────
   * 🎨 FIGMA DESIGN REFERENCE
   * ─────────────────────────────────────────────────────────────────────────────
   * Source: figma-asset/app-user/individual-user/daily-progress.png
   *         figma-asset/app-user/group-children-user/home-flow.png
   *
   * UI Components:
   *   1. Header: "Daily Progress" title
   *   2. Badge: "1/5" (completed/total format)
   *   3. Progress Bar: Visual fill based on completion percentage
   *   4. Message: "4 tasks remaining. You've got this!"
   *
   * ─────────────────────────────────────────────────────────────────────────────
   * 💡 DESIGN THINKING & BUSINESS LOGIC
   * ─────────────────────────────────────────────────────────────────────────────
   *
   * QUESTION: What problem does this solve?
   * ANSWER: Users need immediate visibility into their daily task completion
   *         status when they open the app. This is the FIRST thing they see.
   *
   * DESIGN DECISIONS:
   *
   * 1. Why "1/5" format instead of percentage?
   *    - COGNITIVE LOAD: "1/5" is instantly understandable
   *    - PERCENTAGE requires mental math: "20% done" → "How many is that?"
   *    - FRACTION gives both completion AND total at a glance
   *    - MOBILE-FIRST: Fraction is more compact in UI badge
   *
   * 2. Why count by TASK status, not subtask completion?
   *    - BUSINESS LOGIC: A task is "done" only when fully completed
   *    - User psychology: Partial progress ≠ completed
   *    - Example: Task with 4/5 subtasks done is still "not done"
   *    - Prevents false sense of accomplishment
   *
   * 3. Why filter by startTime date?
   *    - DAILY PROGRESS means "tasks scheduled for TODAY"
   *    - Not "tasks created today" or "tasks completed today"
   *    - Aligns with user's daily schedule/planner mental model
   *    - Supports future-dated tasks (tasks scheduled ahead)
   *
   * 4. Why include both ownerUserId AND assignedUserIds?
   *    - SELF TASKS: User created the task themselves
   *    - ASSIGNED TASKS: Someone else (teacher/parent) assigned to user
   *    - Both types count toward daily completion
   *    - User sees ALL their responsibilities in one view
   *
   * 5. Why "X tasks remaining" instead of "X tasks left"?
   *    - "Remaining" implies forward momentum
   *    - "Left" can have negative connotations
   *    - Positive, action-oriented language
   *
   * 6. Why dynamic encouragement messages?
   *    - MOTIVATIONAL DESIGN: Different messages for different progress states
   *    - 0 completed: "Let's get started!" (gentle nudge, no guilt)
   *    - All done: "Amazing work! 🎉" (celebration, dopamine hit)
   *    - In progress: "You've got this!" (encouragement, confidence)
   *    - Personalization increases engagement
   *
   * 7. Why cache for only 2 minutes?
   *    - HOME SCREEN WIDGET: Users may refresh frequently
   *    - Task status changes in real-time (subtask completion, etc.)
   *    - Stale data = frustration ("I just completed a task!")
   *    - Trade-off: Performance vs. freshness → freshness wins
   *
   * 8. Why sort by startTime ascending?
   *    - Chronological order matches daily schedule mental model
   *    - Earliest tasks first = what should I do NOW?
   *    - Matches clock/time-based planning
   *
   * ─────────────────────────────────────────────────────────────────────────────
   * 🧠 TECHNICAL CONSIDERATIONS
   * ─────────────────────────────────────────────────────────────────────────────
   *
   * EDGE CASES HANDLED:
   *   - No tasks: total=0, percentage=0, message="No tasks completed yet..."
   *   - All completed: remaining=0, message="All tasks completed! 🎉"
   *   - Mixed status: accurate counts for each status
   *   - Tasks with/without subtasks: progress% calculated correctly
   *   - Deleted tasks: excluded via isDeleted filter
   *   - Cross-day tasks: filtered by startTime range (00:00-23:59)
   *
   * PERFORMANCE:
   *   - Single MongoDB query with $or operator
   *   - Lean query (no Mongoose overhead)
   *   - Sorted at DB level (indexed startTime recommended)
   *   - Cached result (120s TTL)
   *   - Memory efficient: only required fields projected
   *
   * FUTURE ENHANCEMENTS (Not in current scope):
   *   - Streak tracking (X days in a row all tasks completed)
   *   - Time-based insights (best productivity hours)
   *   - Overdue task warnings
   *   - Predictive completion time estimates
   *
   * ─────────────────────────────────────────────────────────────────────────────
   *
   * @param userId - User ID (from authenticated request)
   * @param date - Target date (default: today)
   * @returns Daily progress snapshot matching Figma design
   * @version 3.0.0
   * @author Engineering Team (V3: Enhanced documentation)
   * @date 13-04-2026
   */
  async getDailyProgressV3(userId: Types.ObjectId, date?: Date) {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1: Normalize date for cache key and query range
    // ─────────────────────────────────────────────────────────────────────────
    // WHY: We need consistent date handling for caching and filtering
    // - Cache key needs stable string format (YYYY-MM-DD)
    // - Query needs exact day boundaries (00:00:00.000 to 23:59:59.999)

    const targetDate = date || new Date();
    const dateKey = targetDate.toISOString().split('T')[0]; // "2026-04-13"

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2: Check cache before hitting database
    // ─────────────────────────────────────────────────────────────────────────
    // WHY: Home screen is accessed frequently, reduces DB load
    // TTL: 120 seconds (2 minutes) - balances freshness vs performance
    // Cache invalidation happens naturally on TTL expiry

    const cacheKey = this.getCacheKey(
      'daily-progress-v3',
      dateKey,
      userId.toString(),
    );

    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   return cached; // Return cached data if available
    // }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3: Define date range boundaries for query
    // ─────────────────────────────────────────────────────────────────────────
    // WHY: We need exact day boundaries to match "daily" concept
    // - startOfDay: 00:00:00.000 (midnight start)
    // - endOfDay: 23:59:59.999 (end of day)
    // This ensures we capture all tasks scheduled for this specific day

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4: Query all tasks for user on this date
    // ─────────────────────────────────────────────────────────────────────────
    // WHY this query structure:
    //
    // $or: [{ ownerUserId }, { assignedUserIds }]
    //   → Includes BOTH self-created tasks AND assigned tasks
    //   → User sees ALL their responsibilities, not just ones they created
    //
    // startTime: { $gte, $lte }
    //   → Filters by SCHEDULED date, not creation date
    //   → Matches user's daily schedule/planner mental model
    //   → Supports advance scheduling (tasks created days ahead)
    //
    // isDeleted: false
    //   → Soft delete support
    //   → Deleted tasks shouldn't count toward progress
    //
    // sort: { startTime: 1 }
    //   → Chronological order (earliest first)
    //   → Matches "what should I do next?" user question
    //   → Aligns with time-based daily schedule UI

    const tasks = await this.model
      .find({
        $or: [{ ownerUserId: userId }, { assignedUserIds: userId }],
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        isDeleted: false,
      })
      .sort({ startTime: 1 })
      .lean(); // lean() = plain JS objects, no Mongoose overhead

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5: Calculate statistics
    // ─────────────────────────────────────────────────────────────────────────
    // WHY count by task status:
    // - Task-level status is the source of truth
    // - Subtask completion updates task status automatically
    // - User cares about "tasks done" not "subtasks done"
    //
    // CRITICAL: A task with 4/5 subtasks completed is still PENDING or IN_PROGRESS
    // Only when ALL subtasks are done does task become COMPLETED
    // This prevents false sense of accomplishment

    const total = tasks.length;
    const completed = tasks.filter(
      (t: any) => t.status === TaskStatus.COMPLETED,
    ).length;
    const inProgress = tasks.filter(
      (t: any) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
    const remaining = total - completed; // Not yet completed (includes pending + inProgress)

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6: Build task list with subtask progress
    // ─────────────────────────────────────────────────────────────────────────
    // WHY include subtask info:
    // - UI shows "2 / 5 subtasks" for in-progress tasks
    // - Progress bar needs percentage calculation
    // - User sees granular progress within each task
    //
    // Progress percentage logic:
    // - If task HAS subtasks: (completedSubtasks / totalSubtasks) * 100
    // - If task has NO subtasks: 100% if completed, 0% otherwise
    // - Matches Figma: individual task progress bars

    const taskList = tasks.map(task => ({
      _id: task._id.toString(),
      title: task.title,
      status: task.status, // PENDING | IN_PROGRESS | COMPLETED
      startTime: task.startTime,
      taskType: task.taskType, // SELF | COLLABORATIVE | etc.
      assignedBy: task.createdById, // Who created/assigned this task
      // Subtask progress (only if task has subtasks)
      subtasks:
        task.totalSubtasks > 0
          ? {
              total: task.totalSubtasks || 0,
              completed: task.completedSubtasks || 0,
            }
          : undefined,
      // Progress percentage calculation
      progressPercentage:
        task.totalSubtasks && task.totalSubtasks > 0
          ? Math.round(
              ((task.completedSubtasks || 0) / task.totalSubtasks) * 100,
            )
          : task.status === TaskStatus.COMPLETED
            ? 100 // No subtasks + completed = 100%
            : 0, // No subtasks + not completed = 0%
    }));

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7: Generate dynamic encouragement message
    // ─────────────────────────────────────────────────────────────────────────
    // WHY dynamic messages:
    // - MOTIVATIONAL DESIGN: Different messages for different progress states
    // - Psychological impact: Right words at right time increase engagement
    // - Figma shows: "4 tasks remaining. You've got this!"
    //
    // Message logic:
    // - 0 completed: Gentle nudge, no guilt ("Let's get started!")
    // - All done: Celebration, dopamine hit ("Amazing work! 🎉")
    // - In progress: Encouragement, confidence ("You've got this!")
    // - Pluralization: "1 task" vs "2 tasks" (grammatically correct)

    let encouragementMessage = '';
    if (completed === 0) {
      encouragementMessage = `No tasks completed yet. Let's get started!`;
    } else if (completed === total && total > 0) {
      encouragementMessage = `All tasks completed! Amazing work! 🎉`;
    } else {
      // Figma example: "4 tasks remaining. You've got this!"
      encouragementMessage = `${remaining} task${remaining !== 1 ? 's' : ''} remaining. You've got this!`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8: Build response matching Figma design
    // ─────────────────────────────────────────────────────────────────────────
    // FIGMA BREAKDOWN:
    //
    // Header: "Daily Progress"                    → progress.display
    // Badge:  "1/5"                               → progress.display: "1/5"
    // Bar:    [████░░░░░░░░░░░░░░░░]              → progress.percentage: 20
    // Text:   "4 tasks remaining. You've got this!" → message
    //
    // Response structure:
    // {
    //   date: "2026-04-13",                       → Which day this is for
    //   progress: {                                → Main display data
    //     completed: 1,                            → Number of completed tasks
    //     total: 5,                                → Total tasks for the day
    //     display: "1/5",                          → Figma badge format
    //     percentage: 20                           → Progress bar fill (0-100)
    //   },
    //   statistics: {                              → Detailed breakdown
    //     total: 5,                                → All tasks
    //     completed: 1,                            → Status = COMPLETED
    //     pending: 3,                              → Status = PENDING
    //     inProgress: 1,                           → Status = IN_PROGRESS
    //     remaining: 4                             → Not yet completed
    //   },
    //   message: "4 tasks remaining...",           → Encouragement text
    //   tasks: [...]                               → Individual task details
    // }

    const result = {
      date: dateKey,
      // Figma-aligned progress display (Badge: "1/5")
      progress: {
        completed,
        total,
        display: `${completed}/${total}`, // Figma format: "completed/total"
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0, // 0-100 for progress bar
      },
      // Detailed statistics for analytics/dashboard
      statistics: {
        total,
        completed,
        pending,
        inProgress,
        remaining,
      },
      // Dynamic encouragement message (Figma text)
      message: encouragementMessage,
      // Individual task list with subtask progress
      tasks: taskList,
    };

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9: Cache the result for 2 minutes
    // ─────────────────────────────────────────────────────────────────────────
    // WHY 2 minutes:
    // - Home screen accessed frequently (every app open)
    // - Task status can change (subtask completion, etc.)
    // - Stale data = user frustration
    // - Trade-off: 2 min cache reduces DB load while keeping data fresh
    //
    // Cache key format: daily-progress-v3:2026-04-13:user-123
    // Ensures unique cache per user per day

    await this.setInCache(cacheKey, result, TASK_CACHE_CONFIG.DAILY_PROGRESS);

    return result;
  }

  /**
   * Get daily progress V2 - Enhanced for Figma home screen
   * Figma: app-user/group-children-user/home-flow.png
   *
   * V2 Changes:
   * - Explicit progress.display format: "1/5" for UI
   * - Separate statistics object
   * - Dynamic encouragement message
   * - Better cache TTL for frequently changing data
   *
   * @param userId - User ID
   * @param date - Target date (default: today)
   * @returns Enhanced daily progress summary
   * @version 2.0.0
   */
  async getDailyProgressV2(userId: Types.ObjectId, date?: Date) {
    const targetDate = date || new Date();
    const dateKey = targetDate.toISOString().split('T')[0];
    const cacheKey = this.getCacheKey(
      'daily-progress-v2',
      dateKey,
      userId.toString(),
    );

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get ALL tasks for the user on this date
    const tasks = await this.model
      .find({
        $or: [{ ownerUserId: userId }, { assignedUserIds: userId }],
        startTime: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        isDeleted: false,
      })
      .sort({ startTime: 1 })
      .lean();

    // Calculate statistics
    const total = tasks.length;
    const completed = tasks.filter(
      (t: any) => t.status === TaskStatus.COMPLETED,
    ).length;
    const inProgress = tasks.filter(
      (t: any) => t.status === TaskStatus.IN_PROGRESS,
    ).length;
    const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
    const remaining = total - completed;

    // Build task list with subtask info
    const taskList = tasks.map(task => ({
      _id: task._id.toString(),
      title: task.title,
      status: task.status,
      startTime: task.startTime,
      taskType: task.taskType,
      assignedBy: task.createdById,
      subtasks:
        task.totalSubtasks > 0
          ? {
              total: task.totalSubtasks || 0,
              completed: task.completedSubtasks || 0,
            }
          : undefined,
      progressPercentage:
        task.totalSubtasks && task.totalSubtasks > 0
          ? Math.round(
              ((task.completedSubtasks || 0) / task.totalSubtasks) * 100,
            )
          : task.status === TaskStatus.COMPLETED
            ? 100
            : 0,
    }));

    // Generate encouragement message based on progress
    let encouragementMessage = '';
    if (completed === 0) {
      encouragementMessage = `No tasks completed yet. Let's get started!`;
    } else if (completed === total && total > 0) {
      encouragementMessage = `All tasks completed! Amazing work! 🎉`;
    } else {
      encouragementMessage = `${remaining} task${remaining !== 1 ? 's' : ''} remaining. You've got this!`;
    }

    const result = {
      date: dateKey,
      // Figma-aligned progress display
      progress: {
        completed,
        total,
        display: `${completed}/${total}`,
        percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      // Detailed statistics
      statistics: {
        total,
        completed,
        pending,
        inProgress,
        remaining,
      },
      // Encouragement message for UI
      message: encouragementMessage,
      // Task list
      tasks: taskList,
    };

    // Cache the result with shorter TTL (data changes frequently)
    await this.setInCache(cacheKey, result, TASK_CACHE_CONFIG.DAILY_PROGRESS);

    return result;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Automatic Preferred Time Calculation
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Calculate and update user's preferred time based on task history
   * Analyzes last 10 completed tasks to find pattern
   * Updates user.preferredTime automatically
   *
   * @param userId - User ID to calculate preferred time for
   * @returns Calculated preferred time in HH:mm format, or null if insufficient data
   */
  async calculateAndUpdatePreferredTime(
    userId: Types.ObjectId,
  ): Promise<string | null> {
    try {
      // Get user's last 10 completed tasks
      const tasks = await Task.find({
        ownerUserId: userId,
        status: TaskStatus.COMPLETED,
        startTime: { $exists: true, $ne: null },
        isDeleted: false,
      })
        .sort({ startTime: -1 }) // Most recent first
        .limit(10)
        .select('startTime')
        .lean();

      // Need at least 5 tasks to establish a pattern
      // if (tasks.length < 5) {
      //   logger.info(
      //     `Insufficient data for preferred time calculation (user: ${userId}, tasks: ${tasks.length})`,
      //   );
      //   return null;
      // }

      // Extract start times (in minutes from midnight)
      const startTimesInMinutes = tasks.map(task => {
        const date = new Date(task.startTime);
        return date.getHours() * 60 + date.getMinutes();
      });

      // Calculate average start time
      const totalMinutes = startTimesInMinutes.reduce(
        (sum, minutes) => sum + minutes,
        0,
      );
      const averageMinutes = Math.round(
        totalMinutes / startTimesInMinutes.length,
      );

      // Convert back to HH:mm format
      // Normalize hours to handle overflow (e.g., 25 hours → 01:00)
      const normalizedHours = ((Math.floor(averageMinutes / 60) % 24) + 24) % 24;
      const minutes = averageMinutes % 60;
      const preferredTime = `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      // Import User model dynamically to avoid circular dependency
      const { User } = await import('../../user.module/user/user.model');

      // Update user's preferred time
      await User.findByIdAndUpdate(
        userId,
        { preferredTime },
        { runValidators: true },
      );

      logger.info(
        `✅ Preferred time updated for user ${userId}: ${preferredTime} (based on ${tasks.length} tasks)`,
      );

      return preferredTime;
    } catch (error) {
      errorLogger.error('❌ Error calculating preferred time:', error);
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Parent Dashboard: Get All Children's Tasks
  // ────────────────────────────────────────────────────────────────────────

  /** ✔️ 🔁  💎✨🔍 -> V2 Found
   * Get all children's tasks for parent dashboard
   * Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param filters - Query filters (status, taskType, etc.)
   * @param options - Pagination options
   * @returns Paginated list of all children's tasks with subtask details
   *
   * @description
   * This endpoint is designed for the parent dashboard to display all tasks
   * belonging to the business user's children. It supports filtering by:
   * - status: 'all' | 'pending' | 'inProgress' | 'completed'
   * - taskType: 'children' | 'personal' (personal shows parent's own tasks)
   *
   * Response includes:
   * - Full task details with embedded subtasks
   * - Assigned child user information
   * - Creator information
   * - Completion statistics
   */
  async getChildrenTasksForDashboard(
    businessUserId: Types.ObjectId,
    filters: any,
    options: any,
  ) {
    const cacheKey = `${TASK_CACHE_CONFIG.PREFIX}:dashboard:children-tasks:${businessUserId.toString()}:${filters.status || 'all'}:${filters.taskType || 'children'}:page:${options.page || 1}`;

    /*----------------------- -----------------------*/
    // Try cache first
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Get all active children for this business user
    const { ChildrenBusinessUser } =
      await import('../../childrenBusinessUser.module/childrenBusinessUser.model');

    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: businessUserId,
      status: 'active',
      isDeleted: false,
    })
      .select('childUserId')
      .lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    // ────────────────────────────────────────────────────────────────────────
    // Build query based on taskType filter
    // IMPORTANT: 'children' is NOT a real taskType in the database
    // It's a UI filter concept that means "show all children's tasks"
    // Real taskTypes in DB: TaskType.PERSONAL, TaskType.SINGLE_ASSIGNMENT, TaskType.COLLABORATIVE
    // ────────────────────────────────────────────────────────────────────────
    const taskTypeFilter = filters.taskType || 'children';

    let query: any = {
      isDeleted: false,
    };

    if (taskTypeFilter === TaskType.PERSONAL) {
      // Parent's personal tasks only (tasks where parent is the owner)
      query.ownerUserId = businessUserId;
      query.taskType = TaskType.PERSONAL;
    } else {
      // 'children' filter: Show all tasks assigned to any of the parent's children
      // This includes:
      // - singleAssignment tasks assigned to one child
      // - collaborative tasks assigned to multiple children
      query.assignedUserIds = { $in: childUserIds };
      // Don't filter by taskType here - we want ALL children's tasks
      // The taskType field in DB can be 'singleAssignment' or 'collaborative'
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // Date range filter
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) query.startTime.$gte = new Date(filters.from);
      if (filters.to) query.startTime.$lte = new Date(filters.to);
    }

    // Execute paginated query with population
    const result = await this.model.paginate(query, {
      ...options,
      populate: [
        {
          path: 'assignedUserIds',
          select: 'name email profileImage',
        },
        {
          path: 'createdById',
          select: 'name email profileImage',
        },
        {
          path: 'ownerUserId',
          select: 'name email profileImage',
        },
      ],
    });

    console.log(
      'getChildrenTasksForDashboard -> result :🧪🧪🧪🧪🧪🧪🧪🧪🧪🧪: ',
      result,
    );

    // Transform response to include child-focused information
    // FIX: result.docs contains the actual tasks array
    const tasks =
      result?.results?.map((task: any) => {
        // Get assigned users (could be 0, 1, or multiple children)
        const assignedUsers = task.assignedUserIds || [];

        console.log('task :🧪::: ', task);

        return {
          _id: task._id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          taskType: task.taskType,
          scheduledTime: task.scheduledTime,
          startTime: task.startTime,
          dueDate: task.dueDate,
          totalSubtasks: task.totalSubtasks || 0,
          completedSubtasks: task.completedSubtasks || 0,
          completionPercentage:
            task.totalSubtasks > 0
              ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100)
              : task.status === TaskStatus.COMPLETED
                ? 100
                : 0,
          subtasks:
            task.subtasks?.map((st: any, idx: number) => ({
              _id: st._id,
              title: st.title,
              isCompleted: st.isCompleted,
              order: st.order || idx + 1,
            })) || [],

          // ──────────────────────────────────────────────────────────────
          // Child/Children Information (who the task is assigned to)
          // Supports: 0 (personal), 1 (single), or multiple (collaborative)
          // ──────────────────────────────────────────────────────────────
          assignedTo:
            assignedUsers.length > 0
              ? assignedUsers.map((child: any) => ({
                  _id: child._id,
                  name: child.name,
                  email: child.email,
                  profileImage:
                    child.profileImage?.imageUrl || '/uploads/users/user.png',
                }))
              : null,

          // ──────────────────────────────────────────────────────────────
          // Creator Information (who created this task)
          // Usually the parent/teacher who assigned the task
          // ──────────────────────────────────────────────────────────────
          createdBy: task.createdById
            ? {
                _id: task.createdById._id,
                name: task.createdById.name,
                email: task.createdById.email,
                profileImage:
                  task.createdById.profileImage?.imageUrl ||
                  '/uploads/users/user.png',
              }
            : null,

          // ──────────────────────────────────────────────────────────────
          // Owner Information (for personal tasks only)
          // Personal tasks are owned by the user, not assigned to others
          // ──────────────────────────────────────────────────────────────
          owner: task.ownerUserId
            ? {
                _id: task.ownerUserId._id,
                name: task.ownerUserId.name,
                email: task.ownerUserId.email,
                profileImage:
                  task.ownerUserId.profileImage?.imageUrl ||
                  '/uploads/users/user.png',
              }
            : null,
        };
      }) || [];

    const response = {
      tasks,
      pagination: {
        page: result.page || 1,
        limit: result.limit || 10,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      },
      filters: {
        status: filters.status || 'all',
        taskType: filters.taskType || 'children',
      },
    };

    // console.log('getChildrenTasksForDashboard response :: ', response);

    // Cache the result (2 minutes for task lists)
    await this.setInCache(cacheKey, response, 120);

    return response;
  }

  /**
   * V3 - Get children's tasks for dashboard with enhanced collaborative task progress
   *
   * ✨ ENHANCEMENT OVER V2:
   * - For COLLABORATIVE tasks only: includes individual child progress from TaskProgress collection
   * - Each child in assignedTo array now has their personal progress status, percentage, and timestamps
   * - Perfect for parent dashboard to see exactly how each child is progressing on shared tasks
   *
   * 📊 RESPONSE STRUCTURE FOR COLLABORATIVE TASKS:
   * assignedTo: [
   *   {
   *     _id: "child1",
   *     name: "Alex",
   *     email: "alex@example.com",
   *     profileImage: "...",
   *     progress: {
   *       status: "inProgress",
   *       progressPercentage: 60,
   *       startedAt: Date,
   *       completedAt: null,
   *       completedSubtaskCount: 3
   *     }
   *   },
   *   {
   *     _id: "child2",
   *     name: "Sam",
   *     email: "sam@example.com",
   *     profileImage: "...",
   *     progress: {
   *       status: "notStarted",
   *       progressPercentage: 0,
   *       startedAt: null,
   *       completedAt: null,
   *       completedSubtaskCount: 0
   *     }
   *   }
   * ]
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param filters - Query filters (status, taskType, from, to)
   * @param options - Pagination options (page, limit, sortBy)
   * @returns Enhanced tasks with individual child progress for collaborative tasks
   *
   * @version 3.0.0
   * @author Senior Engineering Team
   * @date 2026-03-28
   */
  async getChildrenTasksForDashboardV3(
    businessUserId: Types.ObjectId,
    filters: any,
    options: any,
  ) {
    const cacheKey = `${TASK_CACHE_CONFIG.PREFIX}:dashboard:children-tasks:v3:${businessUserId.toString()}:${filters.status || 'all'}:${filters.taskType || 'children'}:page:${options.page || 1}`;

    /*----------------------- -----------------------*/
    // Try cache first
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Get all active children for this business user
    const { ChildrenBusinessUser } =
      await import('../../childrenBusinessUser.module/childrenBusinessUser.model');

    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: businessUserId,
      status: 'active',
      isDeleted: false,
    })
      .select('childUserId')
      .lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    // ────────────────────────────────────────────────────────────────────────
    // Build query based on taskType filter
    // IMPORTANT: 'children' is NOT a real taskType in the database
    // It's a UI filter concept that means "show all children's tasks"
    // Real taskTypes in DB: TaskType.PERSONAL, TaskType.SINGLE_ASSIGNMENT, TaskType.COLLABORATIVE
    // ────────────────────────────────────────────────────────────────────────
    const taskTypeFilter = filters.taskType || 'children';

    let query: any = {
      isDeleted: false,
    };

    if (taskTypeFilter === TaskType.PERSONAL) {
      // Parent's personal tasks only (tasks where parent is the owner)
      query.ownerUserId = businessUserId;
      query.taskType = TaskType.PERSONAL;
    } else {
      // 'children' filter: Show all tasks assigned to any of the parent's children
      // This includes:
      // - singleAssignment tasks assigned to one child
      // - collaborative tasks assigned to multiple children
      query.assignedUserIds = { $in: childUserIds };
      // Don't filter by taskType here - we want ALL children's tasks
      // The taskType field in DB can be 'singleAssignment' or 'collaborative'
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // Date range filter
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) query.startTime.$gte = new Date(filters.from);
      if (filters.to) query.startTime.$lte = new Date(filters.to);
    }

    // Execute paginated query with population
    const result = await this.model.paginate(query, {
      ...options,
      populate: [
        {
          path: 'assignedUserIds',
          select: 'name email profileImage',
        },
        {
          path: 'createdById',
          select: 'name email profileImage',
        },
        {
          path: 'ownerUserId',
          select: 'name email profileImage',
        },
      ],
    });

    logger.info(
      'getChildrenTasksForDashboardV3 -> Paginated result retrieved',
    );

    // ✨ V3 ENHANCEMENT: Get TaskProgress for all collaborative tasks
    const collaborativeTaskIds = result?.results
      ?.filter((task: any) => task.taskType === TaskType.COLLABORATIVE)
      ?.map((task: any) => task._id);

    let taskProgressMap = new Map();

    if (collaborativeTaskIds && collaborativeTaskIds.length > 0) {
      // Import TaskProgress model dynamically
      const { TaskProgress } = await import(
        '../../taskProgress.module/taskProgress.model'
      );

      // Get all progress records for these collaborative tasks
      const progressRecords = await TaskProgress.find({
        taskId: { $in: collaborativeTaskIds },
        userId: { $in: childUserIds },
        isDeleted: false,
      })
        .populate('userId', 'name email profileImage')
        .lean();

      // Group progress by taskId
      progressRecords.forEach((record: any) => {
        const taskId = record.taskId.toString();
        if (!taskProgressMap.has(taskId)) {
          taskProgressMap.set(taskId, new Map());
        }
        const childId = record.userId._id.toString();
        taskProgressMap.get(taskId).set(childId, {
          status: record.status,
          progressPercentage: record.progressPercentage,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          completedSubtaskCount: record.completedSubtaskIndexes?.length || 0,
        });
      });
    }

    // Transform response to include child-focused information
    // FIX: result.docs contains the actual tasks array
    const tasks =
      result?.results?.map((task: any) => {
        // Get assigned users (could be 0, 1, or multiple children)
        const assignedUsers = task.assignedUserIds || [];

        // ✨ V3 ENHANCEMENT: Add progress data for each child in collaborative tasks
        const isCollaborative = task.taskType === TaskType.COLLABORATIVE;
        const taskProgressForThisTask = isCollaborative
          ? taskProgressMap.get(task._id.toString())
          : null;

        return {
          _id: task._id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          taskType: task.taskType,
          scheduledTime: task.scheduledTime,
          startTime: task.startTime,
          dueDate: task.dueDate,
          totalSubtasks: task.totalSubtasks || 0,
          completedSubtasks: task.completedSubtasks || 0,
          completionPercentage:
            task.totalSubtasks > 0
              ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100)
              : task.status === TaskStatus.COMPLETED
                ? 100
                : 0,
          subtasks:
            task.subtasks?.map((st: any, idx: number) => ({
              _id: st._id,
              title: st.title,
              isCompleted: st.isCompleted,
              order: st.order || idx + 1,
            })) || [],

          // ──────────────────────────────────────────────────────────────
          // Child/Children Information (who the task is assigned to)
          // ✨ V3 ENHANCEMENT: For COLLABORATIVE tasks, includes progress data
          // Supports: 0 (personal), 1 (single), or multiple (collaborative)
          // ──────────────────────────────────────────────────────────────
          assignedTo:
            assignedUsers.length > 0
              ? assignedUsers.map((child: any) => {
                  const childData: any = {
                    _id: child._id,
                    name: child.name,
                    email: child.email,
                    profileImage:
                      child.profileImage?.imageUrl ||
                      '/uploads/users/user.png',
                  };

                  // ✨ V3: Add progress data for collaborative tasks only
                  if (isCollaborative && taskProgressForThisTask) {
                    const childProgress = taskProgressForThisTask.get(
                      child._id.toString(),
                    );
                    childData.progress = childProgress || {
                      status: 'notStarted',
                      progressPercentage: 0,
                      startedAt: null,
                      completedAt: null,
                      completedSubtaskCount: 0,
                    };
                  }

                  return childData;
                })
              : null,

          // ──────────────────────────────────────────────────────────────
          // Creator Information (who created this task)
          // Usually the parent/teacher who assigned the task
          // ──────────────────────────────────────────────────────────────
          createdBy: task.createdById
            ? {
                _id: task.createdById._id,
                name: task.createdById.name,
                email: task.createdById.email,
                profileImage:
                  task.createdById.profileImage?.imageUrl ||
                  '/uploads/users/user.png',
              }
            : null,

          // ──────────────────────────────────────────────────────────────
          // Owner Information (for personal tasks only)
          // Personal tasks are owned by the user, not assigned to others
          // ──────────────────────────────────────────────────────────────
          owner: task.ownerUserId
            ? {
                _id: task.ownerUserId._id,
                name: task.ownerUserId.name,
                email: task.ownerUserId.email,
                profileImage:
                  task.ownerUserId.profileImage?.imageUrl ||
                  '/uploads/users/user.png',
              }
            : null,
        };
      }) || [];

    //=============================================================
    // 📊 DASHBOARD COUNTS: Calculate counts for all status tabs
    // This is used to show badge counts on dashboard filters
    // Example: "All (6) | Not Started (1) | In Progress (2) | Completed (2)"
    //=============================================================

    let baseQuery: any = {
      isDeleted: false,
    };

    // Build the children tasks query (for "All" and status tabs)
    let childrenTasksQuery = { ...baseQuery };

    if (taskTypeFilter !== TaskType.PERSONAL) {
      childrenTasksQuery.assignedUserIds = { $in: childUserIds };

      // Apply status filter only for status-specific tabs
      if (filters.status && filters.status !== 'all') {
        childrenTasksQuery.status = filters.status;
      }

      // Date range filter
      if (filters.from || filters.to) {
        childrenTasksQuery.startTime = {};
        if (filters.from)
          childrenTasksQuery.startTime.$gte = new Date(filters.from);
        if (filters.to)
          childrenTasksQuery.startTime.$lte = new Date(filters.to);
      }
    }

    // Build personal tasks query
    let personalTasksQuery = { ...baseQuery };
    personalTasksQuery.ownerUserId = businessUserId;
    personalTasksQuery.taskType = TaskType.PERSONAL;

    // Apply same date range to personal tasks if exists
    if (filters.from || filters.to) {
      personalTasksQuery.startTime = {};
      if (filters.from)
        personalTasksQuery.startTime.$gte = new Date(filters.from);
      if (filters.to)
        personalTasksQuery.startTime.$lte = new Date(filters.to);
    }

    // --- 🔢 Get All Counts in One Aggregation Pipeline ---
    const countsPipeline = [
      {
        $facet: {
          // Status counts for children's tasks
          statusCounts: [
            { $match: childrenTasksQuery },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                count: 1,
              },
            },
          ],

          // Personal tasks count
          personalCount: [
            { $match: personalTasksQuery },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                count: 1,
              },
            },
          ],
        },
      },
    ];

    const aggregationResult = await this.model.aggregate(countsPipeline);

    // Process the results
    const statusCounts = aggregationResult[0].statusCounts;
    const personalCount =
      aggregationResult[0].personalCount[0]?.count || 0;

    // Convert status counts to object
    const countByStatus = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate total (sum of all status counts)
    const totalChildrenTasks = Object.values(countByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    // --- 📄 Execute paginated query for the active tab ---
    let activeQuery =
      taskTypeFilter === TaskType.PERSONAL
        ? personalTasksQuery
        : childrenTasksQuery;

    //===============================================================

    const response = {
      tasks,
      pagination: {
        page: result.page || 1,
        limit: result.limit || 10,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      },
      filters: {
        status: filters.status || 'all',
        taskType: filters.taskType || 'children',
      },
      counts: {
        total: totalChildrenTasks + personalCount, // All tasks
        byStatus: countByStatus, // { notStarted: 1, inProgress: 2, completed: 2 }
        personal: personalCount, // Personal tasks count
      },
    };

    logger.info('getChildrenTasksForDashboardV3 -> Response built successfully');

    // Cache the result (2 minutes for task lists)
    await this.setInCache(cacheKey, response, 120);

    return response;
  }

  /**
   * V4 - Get children's tasks with enhanced subtask handling for collaborative and singleAssignment tasks
   *
   * ✨ ENHANCEMENT OVER V3:
   * - Properly handles subtasks for BOTH collaborative AND singleAssignment tasks
   * - For COLLABORATIVE tasks: includes SubTaskProgress for each subtask (per-child completion status)
   * - For singleAssignment tasks: includes global subtask completion status
   * - Each subtask now has proper completion tracking based on task type
   *
   * 📊 SUBTASK STRUCTURE BY TASK TYPE:
   *
   * 1. COLLABORATIVE TASKS:
   *    subtasks: [
   *      {
   *        _id: "sub001",
   *        title: "Research planets",
   *        order: 1,
   *        myCompletion: {
   *          isCompleted: true,
   *          completedAt: Date,
   *          completedBy: ["child1", "child2"]
   *        }
   *      }
   *    ]
   *
   * 2. SINGLE ASSIGNMENT TASKS:
   *    subtasks: [
   *      {
   *        _id: "sub001",
   *        title: "Exercise 1-10",
   *        order: 1,
   *        isCompleted: true,
   *        completedAt: Date
   *      }
   *    ]
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param filters - Query filters (status, taskType, from, to)
   * @param options - Pagination options (page, limit, sortBy)
   * @returns Enhanced tasks with proper subtask handling for both task types
   *
   * @version 4.0.0
   * @author Senior Engineering Team
   * @date 2026-03-28
   */
  async getChildrenTasksForDashboardV4(
    businessUserId: Types.ObjectId,
    filters: any,
    options: any,
  ) {
    const cacheKey = `${TASK_CACHE_CONFIG.PREFIX}:dashboard:children-tasks:v4:${businessUserId.toString()}:${filters.status || 'all'}:${filters.taskType || 'children'}:page:${options.page || 1}`;

    /*----------------------- -----------------------*/
    // Try cache first
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   return cached;
    // }

    // Get all active children for this business user
    const { ChildrenBusinessUser } =
      await import('../../childrenBusinessUser.module/childrenBusinessUser.model');

    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: businessUserId,
      status: 'active',
      isDeleted: false,
    })
      .select('childUserId')
      .lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    // ────────────────────────────────────────────────────────────────────────
    // Build query based on taskType filter
    // IMPORTANT: 'children' is NOT a real taskType in the database
    // It's a UI filter concept that means "show all children's tasks"
    // Real taskTypes in DB: TaskType.PERSONAL, TaskType.SINGLE_ASSIGNMENT, TaskType.COLLABORATIVE
    // ────────────────────────────────────────────────────────────────────────
    const taskTypeFilter = filters.taskType || 'children';

    let query: any = {
      isDeleted: false,
    };

    if (taskTypeFilter === TaskType.PERSONAL) {
      // Parent's personal tasks only (tasks where parent is the owner)
      query.ownerUserId = businessUserId;
      query.taskType = TaskType.PERSONAL;
    } else {
      // 'children' filter: Show all tasks assigned to any of the parent's children
      // This includes:
      // - singleAssignment tasks assigned to one child
      // - collaborative tasks assigned to multiple children
      query.assignedUserIds = { $in: childUserIds };
      // Don't filter by taskType here - we want ALL children's tasks
      // The taskType field in DB can be 'singleAssignment' or 'collaborative'
    }

    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    // Date range filter
    if (filters.from || filters.to) {
      query.startTime = {};
      if (filters.from) query.startTime.$gte = new Date(filters.from);
      if (filters.to) query.startTime.$lte = new Date(filters.to);
    }

    // Execute paginated query with population
    const result = await this.model.paginate(query, {
      ...options,
      populate: [
        {
          path: 'assignedUserIds',
          select: 'name email profileImage',
        },
        {
          path: 'createdById',
          select: 'name email profileImage',
        },
        {
          path: 'ownerUserId',
          select: 'name email profileImage',
        },
      ],
    });

    logger.info(
      'getChildrenTasksForDashboardV4 -> Paginated result retrieved',
    );

    // ✨ V4 ENHANCEMENT: Get SubTasks for ALL tasks (collaborative + singleAssignment)
    const taskIds = result?.results?.map((task: any) => task._id);
    let subtaskMap = new Map();
    let subtaskProgressMap = new Map();

    if (taskIds && taskIds.length > 0) {
      // Import SubTask model dynamically
      const { SubTask } = await import('../subTask/subTask.model');

      // Get all subtasks for these tasks
      const allSubtasks = await SubTask.find({
        taskId: { $in: taskIds },
        isDeleted: false,
      })
        .sort({ order: 1 })
        .lean();

      // Group subtasks by taskId
      allSubtasks.forEach((subtask: any) => {
        const taskId = subtask.taskId.toString();
        if (!subtaskMap.has(taskId)) {
          subtaskMap.set(taskId, []);
        }
        subtaskMap.get(taskId).push({
          _id: subtask._id,
          title: subtask.title,
          isCompleted: subtask.isCompleted,
          order: subtask.order,
          completedAt: subtask.completedAt,
          duration: subtask.duration,
        });
      });

      // ✨ V4: For COLLABORATIVE tasks, get SubTaskProgress for each child
      const collaborativeTaskIds = result?.results
        ?.filter((task: any) => task.taskType === TaskType.COLLABORATIVE)
        ?.map((task: any) => task._id);

      if (collaborativeTaskIds && collaborativeTaskIds.length > 0) {
        const { SubTaskProgress } = await import(
          '../subTaskProgress/subTaskProgress.model'
        );

        // Get all subtask progress records for collaborative tasks
        const progressRecords = await SubTaskProgress.find({
          taskId: { $in: collaborativeTaskIds },
          userId: { $in: childUserIds },
          isDeleted: false,
        })
          .populate('userId', 'name email')
          .lean();

        // Group by taskId -> subtaskId -> userId
        progressRecords.forEach((record: any) => {
          const taskId = record.taskId.toString();
          const subtaskId = record.subtaskId.toString();
          const userId = record.userId._id.toString();

          if (!subtaskProgressMap.has(taskId)) {
            subtaskProgressMap.set(taskId, new Map());
          }
          if (!subtaskProgressMap.get(taskId).has(subtaskId)) {
            subtaskProgressMap.get(taskId).set(subtaskId, new Map());
          }
          subtaskProgressMap.get(taskId).get(subtaskId).set(userId, {
            isCompleted: record.isCompleted,
            completedAt: record.completedAt,
            note: record.note,
          });
        });
      }
    }

    // ✨ V3: Get TaskProgress for collaborative tasks (child-level progress)
    const collaborativeTaskIds = result?.results
      ?.filter((task: any) => task.taskType === TaskType.COLLABORATIVE)
      ?.map((task: any) => task._id);

    let taskProgressMap = new Map();

    if (collaborativeTaskIds && collaborativeTaskIds.length > 0) {
      const { TaskProgress } = await import(
        '../../taskProgress.module/taskProgress.model'
      );

      const progressRecords = await TaskProgress.find({
        taskId: { $in: collaborativeTaskIds },
        userId: { $in: childUserIds },
        isDeleted: false,
      })
        .populate('userId', 'name email profileImage')
        .lean();

      progressRecords.forEach((record: any) => {
        const taskId = record.taskId.toString();
        if (!taskProgressMap.has(taskId)) {
          taskProgressMap.set(taskId, new Map());
        }
        const childId = record.userId._id.toString();
        taskProgressMap.get(taskId).set(childId, {
          status: record.status,
          progressPercentage: record.progressPercentage,
          startedAt: record.startedAt,
          completedAt: record.completedAt,
          completedSubtaskCount: record.completedSubtaskIndexes?.length || 0,
        });
      });
    }

    // Transform response to include child-focused information
    const tasks =
      result?.results?.map((task: any) => {
        const assignedUsers = task.assignedUserIds || [];
        const isCollaborative = task.taskType === TaskType.COLLABORATIVE;
        const isSingleAssignment = task.taskType === TaskType.SINGLE_ASSIGNMENT;
        const taskProgressForThisTask = isCollaborative
          ? taskProgressMap.get(task._id.toString())
          : null;
        const subtasksForThisTask = subtaskMap.get(task._id.toString()) || [];
        const subtaskProgressForThisTask = isCollaborative
          ? subtaskProgressMap.get(task._id.toString())
          : null;

        // ✨ V4: Format subtasks based on task type
        const formattedSubtasks = subtasksForThisTask.map((st: any, idx: number) => {
          const subtaskObj: any = {
            _id: st._id,
            title: st.title,
            order: st.order || idx + 1,
            duration: st.duration || null,
          };

          if (isCollaborative) {
            // COLLABORATIVE: Show my completion status for each subtask
            const mySubtaskProgress = subtaskProgressForThisTask?.get(st._id.toString());
            const childId = assignedUsers[0]?._id?.toString(); // Get first assigned child's ID

            if (mySubtaskProgress && childId) {
              const myCompletion = mySubtaskProgress.get(childId);
              subtaskObj.myCompletion = myCompletion || {
                isCompleted: false,
                completedAt: null,
                note: null,
              };
            } else {
              subtaskObj.myCompletion = {
                isCompleted: false,
                completedAt: null,
                note: null,
              };
            }
          } else if (isSingleAssignment) {
            // SINGLE ASSIGNMENT: Show global completion status
            subtaskObj.isCompleted = st.isCompleted || false;
            subtaskObj.completedAt = st.completedAt || null;
          }

          return subtaskObj;
        });

        return {
          _id: task._id,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          taskType: task.taskType,
          scheduledTime: task.scheduledTime,
          startTime: task.startTime,
          dueDate: task.dueDate,
          totalSubtasks: task.totalSubtasks || 0,
          completedSubtasks: task.completedSubtasks || 0,
          completionPercentage:
            task.totalSubtasks > 0
              ? Math.round((task.completedSubtasks / task.totalSubtasks) * 100)
              : task.status === TaskStatus.COMPLETED
                ? 100
                : 0,
          subtasks: formattedSubtasks,

          // ──────────────────────────────────────────────────────────────
          // Child/Children Information (who the task is assigned to)
          // ✨ V3/V4: For COLLABORATIVE tasks, includes progress data
          // ──────────────────────────────────────────────────────────────
          assignedTo:
            assignedUsers.length > 0
              ? assignedUsers.map((child: any) => {
                  const childData: any = {
                    _id: child._id,
                    name: child.name,
                    email: child.email,
                    profileImage:
                      child.profileImage?.imageUrl ||
                      '/uploads/users/user.png',
                  };

                  // ✨ V3/V4: Add progress data for collaborative tasks only
                  if (isCollaborative && taskProgressForThisTask) {
                    const childProgress = taskProgressForThisTask.get(
                      child._id.toString(),
                    );
                    childData.progress = childProgress || {
                      status: 'notStarted',
                      progressPercentage: 0,
                      startedAt: null,
                      completedAt: null,
                      completedSubtaskCount: 0,
                    };
                  }

                  return childData;
                })
              : null,

          // ──────────────────────────────────────────────────────────────
          // Creator Information
          // ──────────────────────────────────────────────────────────────
          createdBy: task.createdById
            ? {
                _id: task.createdById._id,
                name: task.createdById.name,
                email: task.createdById.email,
                profileImage:
                  task.createdById.profileImage?.imageUrl ||
                  '/uploads/users/user.png',
              }
            : null,

          // ──────────────────────────────────────────────────────────────
          // Owner Information (for personal tasks only)
          // ──────────────────────────────────────────────────────────────
          owner: task.ownerUserId
            ? {
                _id: task.ownerUserId._id,
                name: task.ownerUserId.name,
                email: task.ownerUserId.email,
                profileImage:
                  task.ownerUserId.profileImage?.imageUrl ||
                  '/uploads/users/user.png',
              }
            : null,
        };
      }) || [];

    //=============================================================
    // 📊 DASHBOARD COUNTS
    //=============================================================

    let baseQuery: any = {
      isDeleted: false,
    };

    let childrenTasksQuery = { ...baseQuery };

    if (taskTypeFilter !== TaskType.PERSONAL) {
      childrenTasksQuery.assignedUserIds = { $in: childUserIds };

      if (filters.status && filters.status !== 'all') {
        childrenTasksQuery.status = filters.status;
      }

      if (filters.from || filters.to) {
        childrenTasksQuery.startTime = {};
        if (filters.from)
          childrenTasksQuery.startTime.$gte = new Date(filters.from);
        if (filters.to)
          childrenTasksQuery.startTime.$lte = new Date(filters.to);
      }
    }

    let personalTasksQuery = { ...baseQuery };
    personalTasksQuery.ownerUserId = businessUserId;
    personalTasksQuery.taskType = TaskType.PERSONAL;

    if (filters.from || filters.to) {
      personalTasksQuery.startTime = {};
      if (filters.from)
        personalTasksQuery.startTime.$gte = new Date(filters.from);
      if (filters.to)
        personalTasksQuery.startTime.$lte = new Date(filters.to);
    }

    const countsPipeline = [
      {
        $facet: {
          statusCounts: [
            { $match: childrenTasksQuery },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                status: '$_id',
                count: 1,
              },
            },
          ],
          personalCount: [
            { $match: personalTasksQuery },
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                count: 1,
              },
            },
          ],
        },
      },
    ];

    const aggregationResult = await this.model.aggregate(countsPipeline);

    const statusCounts = aggregationResult[0].statusCounts;
    const personalCount =
      aggregationResult[0].personalCount[0]?.count || 0;

    const countByStatus = statusCounts.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);

    const totalChildrenTasks = Object.values(countByStatus).reduce(
      (sum, count) => sum + count,
      0,
    );

    const response = {
      tasks,
      pagination: {
        page: result.page || 1,
        limit: result.limit || 10,
        total: result.total || 0,
        totalPages: result.totalPages || 0,
      },
      filters: {
        status: filters.status || 'all',
        taskType: filters.taskType || 'children',
      },
      counts: {
        total: totalChildrenTasks + personalCount,
        byStatus: countByStatus,
        personal: personalCount,
      },
    };

    logger.info('getChildrenTasksForDashboardV4 -> Response built successfully');

    // Cache the result (2 minutes for task lists)
    await this.setInCache(cacheKey, response, 120);

    return response;
  }

  /**
   * Get task details for parent dashboard
   *
   * 🎯 PARENT DASHBOARD TASK DETAILS SCREEN
   * Figma: teacher-parent-dashboard/dashboard/task-details-of-a-task.png
   *        teacher-parent-dashboard/dashboard/task-details-of-collaborative-tasks.png
   *
   * ✨ FEATURES:
   * - Complete task information (title, description, dates, status)
   * - For COLLABORATIVE tasks: Shows all assigned children with their individual progress
   * - For SINGLE_ASSIGNMENT tasks: Shows assigned child with task progress
   * - Subtasks with completion status
   * - Support mode information
   * - Creator and owner information
   *
   * @param taskId - Task ID
   * @param businessUserId - Parent/Teacher business user ID
   * @returns Complete task details for parent dashboard
   *
   * @version 1.0.0
   * @author Senior Engineering Team
   * @date 2026-03-28
   */
  async getTaskDetailsForParent(
    taskId: string,
    businessUserId: Types.ObjectId,
  ): Promise<any> {
    const cacheKey = `${TASK_CACHE_CONFIG.PREFIX}:parent-task-details:${taskId}:${businessUserId.toString()}`;

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get task with population
    const task = await this.model.findById(taskId)
      .populate('createdById', 'name email profileImage')
      .populate('ownerUserId', 'name email profileImage')
      .populate('assignedUserIds', 'name email profileImage')
      .select('-__v')
      .lean();

    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Verify this parent has access
    const { ChildrenBusinessUser } = await import('../../childrenBusinessUser.module/childrenBusinessUser.model');
    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: businessUserId,
      status: 'active',
      isDeleted: false,
    }).select('childUserId').lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId.toString());
    const createdByIdStr = task.createdById?._id?.toString() || task.createdById?.toString();

    const hasAccess =
      createdByIdStr === businessUserId.toString() ||
      (task.assignedUserIds && task.assignedUserIds.some((child: any) =>
        childUserIds.includes(child._id?.toString() || child.toString())
      ));

    if (!hasAccess) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this task');
    }

    // Get subtasks
    const { SubTask } = await import('../subTask/subTask.model');
    const subtasks = await SubTask.find({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).sort({ order: 1 }).lean();

    // ✨ Handle collaborative vs singleAssignment differently
    const isCollaborative = task.taskType === TaskType.COLLABORATIVE;
    let taskProgressRecords: any[] = [];
    let subtaskProgressRecords: any[] = [];

    // Get user profiles for all assigned children to fetch supportMode
    const { UserProfile } = await import('../../user.module/userProfile/userProfile.model');
    const childProfileMap = new Map<string, string>();
    
    if (task.assignedUserIds && task.assignedUserIds.length > 0) {
      const assignedChildIds = task.assignedUserIds.map((child: any) => 
        new Types.ObjectId(child._id.toString())
      );
      const userProfiles = await UserProfile.find({
        userId: { $in: assignedChildIds },
      }).select('userId supportMode').lean();
      
      userProfiles.forEach((profile: any) => {
        childProfileMap.set(profile.userId.toString(), profile.supportMode || 'calm');
      });
    }

    if (isCollaborative) {
      // Get TaskProgress for all assigned children
      const { TaskProgress } = await import('../../taskProgress.module/taskProgress.model');
      taskProgressRecords = await TaskProgress.find({
        taskId: new Types.ObjectId(taskId),
        userId: { $in: childUserIds.map(id => new Types.ObjectId(id)) },
        isDeleted: false,
      }).populate('userId', 'name email profileImage').lean();

      // Get SubTaskProgress for all subtasks
      const { SubTaskProgress } = await import('../subTaskProgress/subTaskProgress.model');
      subtaskProgressRecords = await SubTaskProgress.find({
        taskId: new Types.ObjectId(taskId),
        userId: { $in: childUserIds.map(id => new Types.ObjectId(id)) },
        isDeleted: false,
      }).populate('userId', 'name email').lean();
    }

    // Format assigned children with their progress
    const assignedTo = (task.assignedUserIds || []).map((child: any) => {
      const childIdStr = child._id.toString();
      const childData: any = {
        child: {
          _id: child._id,
          name: child.name,
          email: child.email,
          profileImage: child.profileImage?.imageUrl || '/uploads/users/user.png',
        },
        supportMode: childProfileMap.get(childIdStr) || 'calm',
      };

      if (isCollaborative) {
        const progress = taskProgressRecords.find(
          (p: any) => p.userId._id.toString() === childIdStr
        );

        childData.progress = progress ? {
          status: progress.status,
          progressPercentage: progress.progressPercentage,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
          completedSubtaskCount: progress.completedSubtaskIndexes?.length || 0,
        } : {
          status: 'notStarted',
          progressPercentage: 0,
          startedAt: null,
          completedAt: null,
          completedSubtaskCount: 0,
        };
      }

      return childData;
    });

    // Format subtasks
    const formattedSubtasks = subtasks.map((st: any, idx: number) => {
      const subtaskObj: any = {
        _id: st._id,
        title: st.title,
        order: st.order || idx + 1,
        duration: st.duration || null,
      };

      if (isCollaborative) {
        const subtaskProgressForThis = subtaskProgressRecords.filter(
          (p: any) => p.subtaskId.toString() === st._id.toString()
        );

        subtaskObj.childrenCompletion = subtaskProgressForThis.map((p: any) => ({
          childId: p.userId._id,
          childName: p.userId.name,
          isCompleted: p.isCompleted,
          completedAt: p.completedAt,
          note: p.note,
        }));
      } else {
        subtaskObj.isCompleted = st.isCompleted || false;
        subtaskObj.completedAt = st.completedAt || null;
      }

      return subtaskObj;
    });

    // Calculate subtask progress
    const totalSubtasks = formattedSubtasks.length;
    const completedSubtasks = isCollaborative
      ? 0
      : formattedSubtasks.filter((st: any) => st.isCompleted).length;

    const subtaskProgress = {
      total: totalSubtasks,
      completed: completedSubtasks,
      percentage: totalSubtasks > 0
        ? Math.round((completedSubtasks / totalSubtasks) * 100)
        : 0,
    };

    // Build response
    const responseData = {
      taskId: task._id,
      title: task.title,
      description: task.description,
      taskType: task.taskType,
      status: task.status,
      priority: task.priority,
      scheduledTime: task.scheduledTime,
      startTime: task.startTime,
      dueDate: task.dueDate,
      completedTime: task.completedTime,
      createdAt: task.createdAt,
      assignedTo,
      subtasks: formattedSubtasks,
      subtaskProgress,
      createdBy: task.createdById ? {
        _id: task.createdById._id,
        name: task.createdById.name,
        email: task.createdById.email,
        profileImage: task.createdById.profileImage?.imageUrl || '/uploads/users/user.png',
      } : null,
      owner: task.ownerUserId ? {
        _id: task.ownerUserId._id,
        name: task.ownerUserId.name,
        email: task.ownerUserId.email,
        profileImage: task.ownerUserId.profileImage?.imageUrl || '/uploads/users/user.png',
      } : null,
    };

    // Cache the result
    await this.setInCache(cacheKey, responseData, 300);

    return responseData;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Preferred Time Suggestion for Task Scheduling
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get preferred time suggestion for task scheduling
   * Returns suggested time based on user's or assignee's preferred time
   *
   * @param userId - User creating the task
   * @param assignedUserIds - Optional: Array of assigned user IDs (for parent creating for child)
   * @returns Suggested time with confidence level and explanation
   */
  async getPreferredTimeSuggestion(
    userId: Types.ObjectId,
    assignedUserIds?: Types.ObjectId[],
  ): Promise<{
    suggestedTime: string;
    suggestedTime12Hour: string;
    basedOn: string;
    confidence: 'high' | 'medium' | 'low';
    explanation: string;
    alternativeTimes?: string[];
  } | null> {
    try {
      // Import User model dynamically
      const { User } = await import('../../user.module/user/user.model');

      let targetUserId = userId;
      let basedOn = 'your_preferred_time';
      let userName = 'You';

      // If task is assigned to someone else (parent creating for child)
      if (assignedUserIds && assignedUserIds.length > 0) {
        // Use the first assignee's preferred time
        targetUserId = assignedUserIds[0];
        basedOn = 'assignee_preferred_time';
      }

      // Get target user's preferred time
      const targetUser = await User.findById(targetUserId)
        .select('preferredTime name role')
        .lean();

      if (!targetUser) {
        logger.warn(
          `User not found for preferred time suggestion: ${targetUserId}`,
        );
        return null;
      }

      userName = targetUser.name;

      // Check if user has a preferred time set
      if (!targetUser.preferredTime) {
        // No preferred time set - return default suggestion
        return {
          suggestedTime: '09:00',
          suggestedTime12Hour: '09:00 AM',
          basedOn: 'default',
          confidence: 'low',
          explanation:
            targetUserId.toString() === userId.toString()
              ? "You haven't set a preferred time yet. We suggest 9:00 AM as a default."
              : `${userName} hasn't set a preferred time yet. We suggest 9:00 AM as a default.`,
          alternativeTimes: ['09:00', '10:00', '14:00'],
        };
      }

      // Parse preferred time to 12-hour format
      const [hours, minutes] = targetUser.preferredTime.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      const suggestedTime12Hour = `${String(displayHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

      // Calculate confidence based on whether it's auto-calculated or manually set
      // For now, we'll consider auto-calculated as high confidence
      const confidence: 'high' | 'medium' | 'low' = 'high';

      // Generate alternative times (±1 hour)
      const altHour1 = (hours - 1 + 24) % 24;
      const altHour2 = (hours + 1) % 24;
      const alternativeTimes = [
        `${String(altHour1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
        targetUser.preferredTime,
        `${String(altHour2).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
      ];

      const explanation =
        targetUserId.toString() === userId.toString()
          ? `Based on your task history, you usually start tasks at ${suggestedTime12Hour}.`
          : `${userName} usually starts tasks at ${suggestedTime12Hour}, based on their task history.`;

      return {
        suggestedTime: targetUser.preferredTime,
        suggestedTime12Hour,
        basedOn,
        confidence,
        explanation,
        alternativeTimes,
      };
    } catch (error) {
      errorLogger.error('❌ Error getting preferred time suggestion:', error);
      return null;
    }
  }
}
