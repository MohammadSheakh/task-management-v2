import { Request, Response } from 'express'; // test
import { StatusCodes } from 'http-status-codes';
import { GenericController } from '../../_generic-module/generic.controller';
import { Task } from './task.model';
import { ITask } from './task.interface';
import { TaskService } from './task.service';
import { TRole } from '../../../middlewares/roles';
import ApiError from '../../../errors/ApiError';
// ❌ REMOVED: GroupMember not needed (using checkSecondaryUserPermission instead)
// import { GroupMember } from '../../group.module/groupMember/groupMember.model';
import { SubTaskService } from '../subTask/subTask.service';
import { logger, errorLogger } from '../../../shared/logger';
import { Types } from 'mongoose';
import sendResponse from '../../../shared/sendResponse';

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

  /** ✔️
   * Create a new task
   * Overrides generic create to add user context
   * Includes permission check for group/collaborative tasks
   */
  create = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const taskData = req.body;

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

  /** ✔️
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
      sortBy: req.query.sortBy as string || '-startTime',
    };

    const result = await this.taskService.getUserTasksWithPagination(
      userId,
      filters,
      options
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

    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const result = await this.taskService.getDailyProgress(userId, date);

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
    const { status, completedTime } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
    }

    const result = await this.taskService.updateTaskStatus(taskId, status, userId);

    // ⏰ Trigger preferred time calculation if task is completed
    if (status === 'completed') {
      try {
        // Import dynamically to avoid circular dependency
        const { preferredTimeQueue } = await import('../../../helpers/bullmq/bullmq');

        // Add job to queue (async, don't wait)
        preferredTimeQueue.add('calculatePreferredTime', {
          userId: userId.toString()
        }, {
          jobId: `preferred-time:${userId}:${Date.now()}`,
          removeOnComplete: true,
          removeOnFail: true,
        });

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

  /** ✔️
   * Update subtask progress 
   * Automatically recalculates completion percentage
   */
  updateSubtaskProgress = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const { subtasks } = req.body;

    if (!subtasks || !Array.isArray(subtasks)) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Subtasks array is required');
    }

    const result = await this.taskService.updateSubtaskProgress(taskId, subtasks);

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

    console.log("result :: ", result);

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Verify user has access to this task
    const hasAccess =
      result.createdById?._id?.toString() === userId ||
      result.ownerUserId?.toString() === userId ||
      (result.assignedUserIds || []).some((id: any) => id.toString() === userId);

    if (!hasAccess) {
      throw new ApiError(StatusCodes.FORBIDDEN, 'You do not have access to this task');
    }

    // Format subtasks with progress information
    const formattedSubtasks = (result.subtasks || []).map((subtask: any, index: number) => ({
      _id: subtask._id,
      title: subtask.title,
      isCompleted: subtask.isCompleted || false,
      order: subtask.order || (index + 1),
      duration: subtask.duration || null,
      completedAt: subtask.completedAt || null,
    }));

    // Calculate subtask progress
    const totalSubtasks = formattedSubtasks.length;
    const completedSubtasks = formattedSubtasks.filter((st: any) => st.isCompleted).length;
    const subtaskProgressPercentage = totalSubtasks > 0
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : 0;

    // Build response with subtask progress
    const responseData = {
      ...result.toObject(),
      subtasks: formattedSubtasks,
      subtaskProgress: {
        total: totalSubtasks,
        completed: completedSubtasks,
        percentage: subtaskProgressPercentage,
      },
    };

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
    const { title, duration } = req.body;

    // TODO : MUST : add sub task issue 
    const result = await this.subTaskService.addSubtask(taskId, { title, duration });

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
    const updateData = req.body;

    const result = await this.subTaskService.updateSubtask(taskId, subtaskId, updateData);

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

    const result = await this.subTaskService.toggleSubtask(taskId, subtaskId);

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
    const { subtasks } = req.body;

    const result = await this.subTaskService.bulkUpdateSubtasks(taskId, subtasks);

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
   * @role User (Primary/Secondary)
   * @Section Home
   * @module Task
   * @figmaIndex 01
   * @desc Get daily progress (Figma: home-flow.png)
   *----------------------------------------------*/
  getDailyProgress = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    const result = await this.taskService.getDailyProgress(userId, date);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Daily progress retrieved successfully',
      success: true,
    });
  };

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
      status: req.query.status as string || 'all',
      taskType: req.query.taskType as string || 'children',
      from: req.query.from as string,
      to: req.query.to as string,
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || '-startTime',
    };

    const result = await this.taskService.getChildrenTasksForDashboard(
      new Types.ObjectId(businessUserId),
      filters,
      options
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Children tasks retrieved successfully for dashboard',
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
      assignedUserIds
    );

    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Unable to calculate preferred time suggestion'
      );
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Preferred time suggestion retrieved successfully',
      success: true,
    });
  };
}
