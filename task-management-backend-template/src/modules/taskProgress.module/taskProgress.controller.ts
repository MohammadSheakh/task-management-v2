import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { TaskProgressService } from './taskProgress.service';
import ApiError from '../../errors/ApiError';
import sendResponse from '../../shared/sendResponse';

/**
 * Task Progress Controller
 * Handles HTTP requests for task progress operations
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class TaskProgressController {
  private service: TaskProgressService;

  constructor() {
    this.service = new TaskProgressService();
  }

  /** ✔️
   * Get progress for a specific task and user
   * GET /task-progress/:taskId/user/:userId
   */
  getProgress = async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.service.getProgress(taskId, userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Progress retrieved successfully',
      success: true,
    });
  };

  /**✔️
   * Get all children's progress for a task (Parent Dashboard)
   * GET /task-progress/:taskId/children
   */
  getAllChildrenProgress = async (req: Request, res: Response) => {
    const { taskId } = req.params;

    const result = await this.service.getAllChildrenProgress(taskId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Children progress retrieved successfully',
      success: true,
    });
  };

  /**
   * Get all tasks progress for a child
   * GET /task-progress/child/:childId/tasks
   */
  getAllTasksProgress = async (req: Request, res: Response) => {
    const { childId } = req.params;
    const { status, taskType } = req.query;

    const result = await this.service.getAllTasksProgress(childId, { status, taskType });

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Tasks progress retrieved successfully',
      success: true,
    });
  };

  /** ✔️
   * Update progress status (start/complete task)
   * PUT /task-progress/:taskId/status
   */
  updateProgressStatus = async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const { status, note } = req.body;

    if (!status) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Status is required');
    }

    const result = await this.service.updateProgressStatus(taskId, userId, status, note);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `Task ${status} successfully`,
      success: true,
    });
  };

  /**
   * Mark a subtask as complete
   * PUT /task-progress/:taskId/subtasks/:subtaskIndex/complete
   */
  completeSubtask = async (req: Request, res: Response) => {
    const { taskId, subtaskIndex } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.service.completeSubtask(taskId, parseInt(subtaskIndex), userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subtask completed successfully',
      success: true,
    });
  };

  /**
   * Create or update progress (internal use)
   * POST /task-progress/:taskId
   */
  createOrUpdateProgress = async (req: Request, res: Response) => {
    const { taskId } = req.params;
    const { userId, status } = req.body;

    if (!userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID is required');
    }

    const result = await this.service.createOrUpdateProgress(taskId, userId, status);

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Progress created successfully',
      success: true,
    });
  };
}

export const taskProgressController = new TaskProgressController();
