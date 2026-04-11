import { Request, Response } from 'express'; // test
import { StatusCodes } from 'http-status-codes';
import { GenericController } from '../../_generic-module/generic.controller';
import { Task } from './task.model';
import { ITask, ICreateTaskBody, IUpdateTaskBody, IUpdateTaskStatusBody, IUpdateSubtaskProgressBody, IAddSubtaskBody, IBulkUpdateSubtasksBody } from './task.interface';
import { TaskService } from './task.service';
import { TRole } from '../../../middlewares/roles';
import ApiError from '../../../errors/ApiError';
// ❌ REMOVED: GroupMember not needed (using checkSecondaryUserPermission instead)
// import { GroupMember } from '../../group.module/groupMember/groupMember.model';
import { SubTaskService } from '../subTask/subTask.service';
import { logger, errorLogger } from '../../../shared/logger';
import { Types } from 'mongoose';
import sendResponse from '../../../shared/sendResponse';
import { TaskStatus } from './task.constant';
import catchAsync from '../../../shared/catchAsync';

/**
 * Task Controller
 * Handles HTTP requests for task operations
 * Extends GenericController for standard CRUD operations
 */
export class TaskController extends GenericController<typeof Task, ITask> {
  taskService: TaskService;
  subTaskService: SubTaskService;

  constructor() {
    super(new TaskService(), 'Task');
    this.taskService = new TaskService();
    this.subTaskService = new SubTaskService();
  }

  /** ✔️☑️
   * Create a new task
   * Overrides generic create to add user context
   * Includes permission check for group/collaborative tasks
   */
  create = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    console.log("hit create 🆕1️⃣")

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const taskData = req.body as ICreateTaskBody;

    // ────────────────────────────────────────────────────────────────────────
    // Permission Check: Handled by checkSecondaryUserPermission middleware
    // The middleware checks if user is Secondary User (can create tasks)
    // ────────────────────────────────────────────────────────────────────────

    const result = await this.taskService.createTask(taskData, userId);

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Task created successfully',
      success: true,
    });
  };

  /** ✔️☑️ 🆕 V2
   * Create a new task with comprehensive notifications
   * Overrides generic create to add user context
   * Includes permission check for group/collaborative tasks
   *
   * @description
   * V2 ENHANCEMENT: Creates notifications for all assigned users
   * - Parent→Child: Child receives assignment notification
   * - Secondary→Parent: Parent receives assignment notification
   * - Secondary→Sibling: Sibling receives assignment notification
   * - Personal: Creator receives self-confirmation
   *
   * @version 2.0.0
   */
  createV2 = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    // console.log("hit create 🆕2️⃣")

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const taskData = req.body as ICreateTaskBody;

    // ────────────────────────────────────────────────────────────────────────
    // Permission Check: Handled by checkSecondaryUserPermission middleware
    // The middleware checks if user is Secondary User (can create tasks)
    // ────────────────────────────────────────────────────────────────────────

    const result = await this.taskService.createTaskV2(taskData, userId);

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: `Task created successfully with notifications sent to ${result.notificationsSent} user(s)`,
      success: true,
    });
  };

  /** ✔️☑️
   * Get all tasks for the logged-in user
   * Supports filtering by status, type, priority, and date range
   */
  getMyTasks = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = req.query;
    const result = await this.taskService.getUserTasks(userId, filters);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Tasks retrieved successfully',
      success: true,
    });
  };


  /** ✔️☑️ as per  rakibul alam vai 
   * Get all tasks for the logged-in user
   * Supports filtering by status, type, priority, and date range
   * V2 ENHANCEMENT: for completed tasks return last 24 hours .. Adds a completedTime: { $gte: twelveHoursAgo } filter to the query 
   */
  getMyTasksV2 = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = req.query;
    const result = await this.taskService.getUserTasksV2(userId, filters);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Tasks retrieved successfully',
      success: true,
    });
  };

  /** ✔️
   * Get all tasks for the logged-in user with pagination
   */
  getMyTasksWithPagination = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = req.query;
    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: (req.query.sortBy as string) || '-startTime',
    };

    const result = await this.taskService.getUserTasksWithPagination(
      userId,
      filters,
      options,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Tasks retrieved successfully with pagination',
      success: true,
    });
  };

  /** ✔️
   * Get task statistics for the logged-in user
   */
  getStatistics = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.taskService.getTaskStatistics(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task statistics retrieved successfully',
      success: true,
    });
  };

  /** ✔️
   * Get daily progress for a specific date
   */
  getDailyProgress = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const date = req.query.date
      ? new Date(req.query.date as string)
      : new Date();
    const result = await this.taskService.getDailyProgress(userId, date);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Daily progress retrieved successfully',
      success: true,
    });
  };

  /** ✔️ V2
   * Get daily progress V2 - Figma aligned for home screen
   * Figma: app-user/group-children-user/home-flow.png
   *
   * V2 Response Format:
   * - progress.display: "1/5" format for UI
   * - statistics: Detailed breakdown
   * - message: Dynamic encouragement message
   *
   * @route GET /tasks/daily-progress/v2
   * @version 2.0.0
   */
  getDailyProgressV2 = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const date = req.query.date
      ? new Date(req.query.date as string)
      : new Date();
    const result = await this.taskService.getDailyProgressV2(userId, date);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Daily progress retrieved successfully',
      success: true,
    });
  };

  /** ✔️
   * Update task status
   * Specialized endpoint for status changes
   */
  updateStatus = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { status, completedTime } = req.body as IUpdateTaskStatusBody;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
    }

    const result = await this.taskService.updateTaskStatus(
      taskId,
      status,
      userId,
    );

    // ⏰ Trigger preferred time calculation if task is completed
    if (status === TaskStatus.COMPLETED) {
      try {
        // Import dynamically to avoid circular dependency
        const { preferredTimeQueue } =
          await import('../../../helpers/bullmq/bullmq');

        // Add job to queue (async, don't wait)
        preferredTimeQueue.add(
          'calculatePreferredTime',
          {
            userId: userId.toString(),
          },
          {
            jobId: `preferred-time:${userId}:${Date.now()}`,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );

        // Don't wait for completion - fire and forget
        logger.info(`⏰ Queued preferred time calculation for user ${userId}`);
      } catch (error) {
        errorLogger.error('Failed to queue preferred time calculation:', error);
        // Don't fail the request - preferred time calculation is non-critical
      }
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task status updated successfully',
      success: true,
    });
  };

  /**
   * Update task status with creative response based on support mode
   * Specialized V2 endpoint with personalized messaging
   *
   * @description
   * This endpoint provides creative, mode-specific responses based on:
   * - Child's support mode (calm, encouraging, logical)
   * - Task completion percentage (50%, 100%)
   *
   * @see Figma: response-based-on-mode.png
   */
  updateStatusV2 = catchAsync(async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { status } = req.body as IUpdateTaskStatusBody;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
    }

    const result = await this.taskService.updateTaskStatusV2(
      taskId,
      status,
      userId,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task status updated successfully with creative response',
      success: true,
    });
  });

  /**
   * Update task status V3 - Auto-complete subtasks for personal/singleAssignment tasks
   * Specialized V3 endpoint that marks all subtasks as completed when task is completed
   *
   * @description
   * This endpoint extends updateStatusV2 with additional logic:
   * - For personal/singleAssignment tasks with subtasks
   * - When status is changed to 'completed'
   * - Automatically marks all subtasks' isCompleted as true
   *
   * @route PATCH /tasks/:id/status/v3
   * @version 3.0.0
   */
  updateStatusV3 = catchAsync(async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { status } = req.body as IUpdateTaskStatusBody;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
    }

    const result = await this.taskService.updateTaskStatusV3(
      taskId,
      status,
      userId,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task status updated successfully with auto-completed subtasks',
      success: true,
    });
  });

  /** ✔️ V4
   * Update task status V4 - Unified endpoint for ALL task types
   * PUT /tasks/:id/status/v4
   *
   * @description
   * Handles personal, singleAssignment, and collaborative tasks with unified creative response
   * - Personal/SingleAssignment: Auto-completes subtasks + creative response
   * - Collaborative: Delegates to TaskProgress + creative response + parent sync detection
   *
   * @route PUT /tasks/:id/status/v4
   * @auth All authenticated users (child, business)
   * @access Task creator, owner, or assigned users only
   * @returns Unified response with creative messaging, task type, and milestone info
   * @version 4.0.0
   */
  updateStatusV4 = catchAsync(async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { status, note } = req.body as IUpdateTaskStatusBody;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
    }

    const result = await this.taskService.updateTaskStatusV4(
      taskId,
      status,
      userId,
      note,
    );

    // ⏰ Trigger preferred time calculation if task is completed
    if (status === TaskStatus.COMPLETED) {
      try {
        // Import dynamically to avoid circular dependency
        const { preferredTimeQueue } =
          await import('../../../helpers/bullmq/bullmq');

        // Add job to queue (async, don't wait)
        preferredTimeQueue.add(
          'calculatePreferredTime',
          {
            userId: userId.toString(),
          },
          {
            jobId: `preferred-time:${userId}:${Date.now()}`,
            removeOnComplete: true,
            removeOnFail: true,
          },
        );

        // Don't wait for completion - fire and forget
        logger.info(`⏰ Queued preferred time calculation for user ${userId}`);
      } catch (error) {
        errorLogger.error('Failed to queue preferred time calculation:', error);
        // Don't fail the request - preferred time calculation is non-critical
      }
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task status updated successfully',
      success: true,
    });
  });

  /** ✔️
   * Update subtask progress
   * Automatically recalculates completion percentage
   */
  updateSubtaskProgress = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { subtasks } = req.body as IUpdateSubtaskProgressBody;

    if (!subtasks || !Array.isArray(subtasks)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Subtasks array is required');
    }

    const result = await this.taskService.updateSubtaskProgress(
      taskId,
      subtasks,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subtask progress updated successfully',
      success: true,
    });
  };

  /**
   * Get a single task by ID with ownership validation
   * Includes subtasks with progress information
   * Figma: home-flow.png (Task Details screen)
   */
  /**
   * Get Task by ID
   *
   * Figma: home-flow.png (Task Details screen)
   * Shows: Task details + SubTask list (5 subtasks in screenshot)
   */
  getTaskById = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    // Use the generic getById with proper population
    // ⭐ IMPORTANT: Populate subtasks via VIRTUAL POPULATE from SubTask collection
    const populateOptions = [
      { path: 'createdById', select: 'name email profileImage' },
      { path: 'ownerUserId', select: 'name email profileImage' },
      { path: 'assignedUserIds', select: 'name email profileImage' },
      { path: 'subtasks', select: '-__v -isDeleted' }, // ⭐ VIRTUAL POPULATE
    ];

    const select = '-__v';
    const result = await this.service.getById(taskId, populateOptions, select);


    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Verify user has access to this task
    // Convert userId to string for comparison
    const userIdStr = userId.toString();
    
    const createdByIdStr = result.createdById?._id 
      ? result.createdById._id.toString() 
      : result.createdById?.toString();
    
    const ownerUserIdStr = result.ownerUserId 
      ? result.ownerUserId.toString() 
      : result.ownerUserId?.toString();
    
    const assignedUserIdsStr = (result.assignedUserIds || []).map((id: any) => 
      id._id ? id._id.toString() : id.toString()
    );

    const hasAccess =
      createdByIdStr === userIdStr ||
      ownerUserIdStr === userIdStr ||
      assignedUserIdsStr.includes(userIdStr);

    if (!hasAccess) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You do not have access to this task',
      );
    }

    // 🆕 NEW: For collaborative tasks, get personal progress
    let myProgress = null;
    let subtaskCompletionMap = new Map();

    if (result.taskType === 'collaborative') {
      // Get my TaskProgress
      const { TaskProgress } = await import('../../taskProgress.module/taskProgress.model');
      const taskProgress = await TaskProgress.findOne({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      }).lean();

      if (taskProgress) {
        myProgress = {
          status: taskProgress.status,
          progressPercentage: taskProgress.progressPercentage,
          completedAt: taskProgress.completedAt,
          startedAt: taskProgress.startedAt,
          completedSubtaskCount: taskProgress.completedSubtaskIndexes?.length || 0,
        };
      }

      // Get my SubTaskProgress for all subtasks
      const { SubTaskProgress } = await import('../subTaskProgress/subTaskProgress.model');
      const subtaskProgressRecords = await SubTaskProgress.find({
        taskId: new Types.ObjectId(taskId),
        userId: new Types.ObjectId(userId),
        isDeleted: false,
      }).lean();

      // Create map for quick lookup
      subtaskProgressRecords.forEach(record => {
        subtaskCompletionMap.set(record.subtaskId.toString(), {
          isCompleted: record.isCompleted,
          completedAt: record.completedAt,
        });
      });
    }

    // Format subtasks with progress information
    const formattedSubtasks = (result.subtasks || []).map(
      (subtask: any, index: number) => {
        const subtaskObj = {
          _id: subtask._id,
          title: subtask.title,
          order: subtask.order || index + 1,
          duration: subtask.duration || null,
        };

        // 🆕 NEW: For collaborative tasks, add my completion status
        if (result.taskType === 'collaborative') {
          const myCompletion = subtaskCompletionMap.get(subtask._id.toString());
          subtaskObj.myCompletion = myCompletion || {
            isCompleted: false,
            completedAt: null,
          };
        } else {
          // For personal/single-assignment tasks, use global isCompleted
          subtaskObj.isCompleted = subtask.isCompleted || false;
          subtaskObj.completedAt = subtask.completedAt || null;
        }

        return subtaskObj;
      },
    );

    // Calculate subtask progress (for personal/single-assignment tasks)
    const totalSubtasks = formattedSubtasks.length;
    const completedSubtasks = formattedSubtasks.filter(
      (st: any) => st.isCompleted,
    ).length;
    const subtaskProgressPercentage =
      totalSubtasks > 0
        ? Math.round((completedSubtasks / totalSubtasks) * 100)
        : 0;

    // Build response
    const responseData = {
      ...result.toObject(),
      subtasks: formattedSubtasks,
      subtaskProgress: {
        total: totalSubtasks,
        completed: completedSubtasks,
        percentage: subtaskProgressPercentage,
      },
    };

    // 🆕 NEW: Add myProgress for collaborative tasks only
    if (result.taskType === 'collaborative' && myProgress) {
      responseData.myProgress = myProgress;
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: responseData,
      message: 'Task retrieved successfully',
      success: true,
    });
  };

  // ─── SubTask Handlers (delegated to SubTaskService) ───────────────────────────

  /**
   * Add a subtask to a task
   * User | SubTask #01 | Add subtask
   */
  addSubtask = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { title, duration } = req.body as IAddSubtaskBody;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.subTaskService.addSubtask(
      taskId,
      { title, duration },
      userId,
    );

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Subtask added successfully',
      success: true,
    });
  };

  /**
   * Get all subtasks for a task
   * User | SubTask #02 | Get all subtasks
   */
  getSubtasksForTask = async (req: Request, res: Response) => {
    const taskId = req.params.id;

    const result = await this.subTaskService.getSubtasksForTask(taskId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subtasks retrieved successfully',
      success: true,
    });
  };

  /**
   * Get a single subtask
   * User | SubTask #03 | Get subtask details
   */
  getSubtask = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const subtaskId = req.params.subtaskId;

    const result = await this.subTaskService.getSubtask(taskId, subtaskId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subtask retrieved successfully',
      success: true,
    });
  };

  /**
   * Update a subtask
   * User | SubTask #04 | Update subtask
   */
  updateSubtask = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const subtaskId = req.params.subtaskId;
    const updateData = req.body as IUpdateTaskBody;

    const result = await this.subTaskService.updateSubtask(
      taskId,
      subtaskId,
      updateData,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subtask updated successfully',
      success: true,
    });
  };

  /**
   * Toggle subtask completion
   * User | SubTask #05 | Toggle subtask status
   */
  toggleSubtask = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const subtaskId = req.params.subtaskId;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.subTaskService.toggleSubtask(
      taskId,
      subtaskId,
      userId,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: result.isCompleted
        ? 'Subtask marked as completed'
        : 'Subtask marked as incomplete',
      success: true,
    });
  };

  /**
   * Delete a subtask
   * User | SubTask #06 | Delete subtask
   */
  deleteSubtask = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const subtaskId = req.params.subtaskId;

    const result = await this.subTaskService.deleteSubtask(taskId, subtaskId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subtask deleted successfully',
      success: true,
    });
  };

  /**
   * Bulk update subtasks (replaces entire list)
   * User | SubTask #07 | Bulk update subtasks
   */
  bulkUpdateSubtasks = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { subtasks } = req.body as IBulkUpdateSubtasksBody;

    const result = await this.subTaskService.bulkUpdateSubtasks(
      taskId,
      subtasks,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        subtasks: result.subtasks,
        totalSubtasks: result.totalSubtasks,
        completedSubtasks: result.completedSubtasks,
      },
      message: 'Subtasks updated successfully',
      success: true,
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  // Figma-Aligned Controllers: Daily Progress
  // ────────────────────────────────────────────────────────────────────────

  /** ----------------------------------------------
   * @role User (Primary/Secondary) Same endpoint found .. so comment this one 
   * @Section Home
   * @module Task
   * @figmaIndex 01
   * @desc Get daily progress (Figma: home-flow.png)
   *----------------------------------------------*/
  // getDailyProgress = async (req: Request, res: Response) => {
  //   const userId = req.user?.userId;

  //   if (!userId) {
  //     throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  //   }

  //   const dateParam = req.query.date as string;
  //   const date = dateParam ? new Date(dateParam) : new Date();

  //   const result = await this.taskService.getDailyProgress(userId, date);

  //   sendResponse(res, {
  //     code: StatusCodes.OK,
  //     data: result,
  //     message: 'Daily progress retrieved successfully',
  //     success: true,
  //   });
  // };

  // ────────────────────────────────────────────────────────────────────────
  // Parent Dashboard: Get All Children's Tasks
  // ────────────────────────────────────────────────────────────────────────

  /** ----------------------------------------------
   * @role Business (Parent/Teacher)
   * @Section Dashboard
   * @module Task
   * @figmaIndex dashboard-flow-01.png, dashboard-flow-02.png
   * @desc Get all children's tasks for parent dashboard with status filtering
   * @query status - Filter by status: 'all' | 'pending' | 'inProgress' | 'completed'
   * @query taskType - Filter by type: 'children' | 'personal'
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 20)
   * @query sortBy - Sort field (default: -startTime)
   *----------------------------------------------*/
  getChildrenTasksForDashboard = async (req: Request, res: Response) => {
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = {
      status: (req.query.status as string) || 'all',
      taskType: (req.query.taskType as string) || 'children',
      from: req.query.from as string,
      to: req.query.to as string,
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || '-startTime',
    };

    const result = await this.taskService.getChildrenTasksForDashboard(
      new Types.ObjectId(businessUserId),
      filters,
      options,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Children tasks retrieved successfully for dashboard',
      success: true,
    });
  };

  /** ----------------------------------------------
   * @role Business (Parent/Teacher)
   * @Section Dashboard
   * @module Task
   * @figmaIndex dashboard-flow-01.png, dashboard-flow-02.png
   * @desc Get all children's tasks with enhanced collaborative progress tracking
   * @desc V3 ENHANCEMENT: For COLLABORATIVE tasks, includes individual child progress from TaskProgress collection
   * @desc Each child in assignedTo array has their personal progress status, percentage, and timestamps
   * @query status - Filter by status: 'all' | 'pending' | 'inProgress' | 'completed'
   * @query taskType - Filter by type: 'children' | 'personal'
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 20)
   * @query sortBy - Sort field (default: -startTime)
   * @version 3.0.0
   * @author Senior Engineering Team
   * @date 2026-03-28
   *----------------------------------------------*/
  getChildrenTasksForDashboardV3 = async (req: Request, res: Response) => {
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = {
      status: (req.query.status as string) || 'all',
      taskType: (req.query.taskType as string) || 'children',
      from: req.query.from as string,
      to: req.query.to as string,
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || '-startTime',
    };

    const result = await this.taskService.getChildrenTasksForDashboardV3(
      new Types.ObjectId(businessUserId),
      filters,
      options,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Children tasks with progress retrieved successfully for dashboard',
      success: true,
    });
  };

  /** ----------------------------------------------
   * @role Business (Parent/Teacher)
   * @Section Dashboard
   * @module Task
   * @figmaIndex dashboard-flow-01.png, dashboard-flow-02.png
   * @desc Get all children's tasks with enhanced subtask handling for collaborative and singleAssignment tasks
   * @desc V4 ENHANCEMENT: 
   * @desc - Shows subtasks for BOTH collaborative AND singleAssignment tasks
   * @desc - For COLLABORATIVE: includes myCompletion status per subtask (from SubTaskProgress)
   * @desc - For singleAssignment: includes global isCompleted status per subtask
   * @desc - Includes all V3 features (child progress tracking for collaborative tasks)
   * @query status - Filter by status: 'all' | 'pending' | 'inProgress' | 'completed'
   * @query taskType - Filter by type: 'children' | 'personal'
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 20)
   * @query sortBy - Sort field (default: -startTime)
   * @version 4.0.0
   * @author Senior Engineering Team
   * @date 2026-03-28
   *----------------------------------------------*/
  getChildrenTasksForDashboardV4 = async (req: Request, res: Response) => {
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = {
      status: (req.query.status as string) || 'all',
      taskType: (req.query.taskType as string) || 'children',
      from: req.query.from as string,
      to: req.query.to as string,
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || '-startTime',
    };

    const result = await this.taskService.getChildrenTasksForDashboardV4(
      new Types.ObjectId(businessUserId),
      filters,
      options,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Children tasks with subtask progress retrieved successfully for dashboard',
      success: true,
    });
  };

  /** ----------------------------------------------
   * @role Business (Parent/Teacher)
   * @Section Dashboard
   * @module Task
   * @figmaIndex task-details-of-a-task.png, task-details-of-collaborative-tasks.png
   * @desc Get complete task details optimized for parent dashboard
   * @desc For COLLABORATIVE: Shows all children with individual progress
   * @desc For SINGLE_ASSIGNMENT: Shows assigned child with progress
   * @query taskId - Task ID from params
   * @version 1.0.0
   * @author Senior Engineering Team
   * @date 2026-03-28
   *----------------------------------------------*/
  getTaskDetailsForParent = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.taskService.getTaskDetailsForParent(
      taskId,
      new Types.ObjectId(businessUserId)
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task details retrieved successfully for parent dashboard',
      success: true,
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  // Preferred Time Suggestion for Task Scheduling
  // ────────────────────────────────────────────────────────────────────────

  /** ----------------------------------------------
   * @role Child | Business | User
   * @Section Task Creation
   * @module Task
   * @figmaIndex create-task-flow.png
   * @desc Get preferred time suggestion for task scheduling
   * @query assignedUserId - Optional: Get suggestion for assignee (parent creating for child)
   *----------------------------------------------*/
  getPreferredTimeSuggestion = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const assignedUserId = req.query.assignedUserId as string;

    const assignedUserIds = assignedUserId
      ? [new Types.ObjectId(assignedUserId)]
      : undefined;

    const result = await this.taskService.getPreferredTimeSuggestion(
      new Types.ObjectId(userId),
      assignedUserIds,
    );

    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Unable to calculate preferred time suggestion',
      );
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Preferred time suggestion retrieved successfully',
      success: true,
    });
  };

  /** ---------------------------------------------- 🔍 Reviewed manually
   * @role Individual User
   * @Section Task History
   * @module Task
   * @figmaIndex task-history-filter-by-date-range.png
   * @desc Get task history with date range filtering
   * @desc Returns all completed tasks within specified date range with subtask progress
   * @desc Defaults to last 30 days if no date range provided
   * @query from - Start date (YYYY-MM-DD format, optional, defaults to 30 days ago)
   * @query to - End date (YYYY-MM-DD format, optional, defaults to today)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 20)
   * @query sortBy - Sort field (default: -completedTime)
   *----------------------------------------------*/
  getTaskHistory = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const filters = {
      from: req.query.from as string,
      to: req.query.to as string,
      taskType: req.query.taskType as string, // ✅ Optional taskType filter
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: (req.query.sortBy as string) || '-completedTime',
    };

    const result = await this.taskService.getTaskHistory(
      new Types.ObjectId(userId),
      filters,
      options,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task history retrieved successfully',
      success: true,
    });
  });
}
