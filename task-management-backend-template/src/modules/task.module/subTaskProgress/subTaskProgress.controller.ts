//@ts-ignore
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GenericController } from '../../_generic-module/generic.controller';
import { SubTaskProgress } from './subTaskProgress.model';
import { ISubTaskProgress } from './subTaskProgress.interface';
import { SubTaskProgressService } from './subTaskProgress.service';
import ApiError from '../../../errors/ApiError';
import sendResponse from '../../../shared/sendResponse';
import { Types } from 'mongoose';

/**
 * SubTask Progress Controller
 * Handles HTTP requests for per-child subtask completion tracking
 */
export class SubTaskProgressController extends GenericController<
  typeof SubTaskProgress,
  ISubTaskProgress
> {
  subTaskProgressService: SubTaskProgressService;

  constructor() {
    super(new SubTaskProgressService(), 'SubTaskProgress');
    this.subTaskProgressService = new SubTaskProgressService();
  }

  /**
   * Get my progress on a task
   * GET /tasks/:taskId/subtasks/my-progress
   */
  getMyProgress = async (req: Request, res: Response) => {
    const taskId = req.params.taskId;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const progress = await this.subTaskProgressService.getChildProgress(
      taskId,
      new Types.ObjectId(userId)
    );

    // Calculate progress percentage
    const totalSubtasks = progress.length;
    const completedSubtasks = progress.filter((p) => p.isCompleted).length;
    const progressPercentage =
      totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        taskId,
        userId,
        subtasks: progress,
        totalSubtasks,
        completedSubtasks,
        progressPercentage,
      },
      message: 'My progress retrieved successfully',
      success: true,
    });
  };

  /**
   * Get all children's progress for a task
   * GET /tasks/:taskId/subtasks/children-progress
   */
  getAllChildrenProgress = async (req: Request, res: Response) => {
    const taskId = req.params.taskId;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const progress = await SubTaskProgress.getAllChildrenProgress(taskId);

    // Group by child
    const childrenMap = new Map();
    progress.forEach((record: any) => {
      if (!childrenMap.has(record.userId.toString())) {
        childrenMap.set(record.userId.toString(), {
          userId: record.userId,
          userName: record.userName,
          userEmail: record.userEmail,
          subtasks: [],
        });
      }
      childrenMap.get(record.userId.toString()).subtasks.push({
        subtaskId: record.subtaskId,
        subtaskTitle: record.subtaskTitle,
        subtaskOrder: record.subtaskOrder,
        isCompleted: record.isCompleted,
        completedAt: record.completedAt,
      });
    });

    // Calculate stats per child
    const children = Array.from(childrenMap.values()).map((child: any) => {
      const completedSubtasks = child.subtasks.filter((s: any) => s.isCompleted).length;
      const totalSubtasks = child.subtasks.length;
      const progressPercentage =
        totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

      return {
        ...child,
        completedSubtasks,
        totalSubtasks,
        progressPercentage,
      };
    });

    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        taskId,
        children,
      },
      message: 'All children progress retrieved successfully',
      success: true,
    });
  };

  /**
   * Toggle my subtask completion
   * PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status
   */
  toggleMySubtask = async (req: Request, res: Response) => {
    const taskId = req.params.taskId;
    const subtaskId = req.params.subtaskId;
    const userId = req.user?.userId;
    const { isCompleted } = req.body;

    console.log("Hit .. toggleMySubtask with:", { taskId, subtaskId, userId, isCompleted });

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (isCompleted === undefined) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'isCompleted status is required');
    }

    const progress = await this.subTaskProgressService.createOrUpdateProgress(
      taskId,
      subtaskId,
      new Types.ObjectId(userId),
      isCompleted
    );

    // Get updated progress for this child
    const allProgress = await this.subTaskProgressService.getChildProgress(
      taskId,
      new Types.ObjectId(userId)
    );

    const totalSubtasks = allProgress.length;
    const completedSubtasks = allProgress.filter((p) => p.isCompleted).length;
    const progressPercentage =
      totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    sendResponse(res, {
      code: StatusCodes.OK,
      data: progress,
      meta: {
        myProgressPercentage: progressPercentage,
        completedSubtasks,
        totalSubtasks,
        allSubtasksCompleted: completedSubtasks === totalSubtasks && totalSubtasks > 0,
      },
      message: 'Subtask progress updated successfully',
      success: true,
    });
  };

  /**
   * Get subtask completion stats
   * GET /subtasks/:subtaskId/stats
   */
  getSubtaskStats = async (req: Request, res: Response) => {
    const subtaskId = req.params.subtaskId;

    const stats = await this.subTaskProgressService.getCompletionStats(subtaskId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: stats,
      message: 'Subtask completion stats retrieved successfully',
      success: true,
    });
  };
}
