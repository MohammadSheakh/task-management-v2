//@ts-ignore
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GenericController } from '../../_generic-module/generic.controller';
import { SubTaskProgress } from './subTaskProgress.model';
import { ISubTaskProgress, IToggleSubTaskProgressBody } from './subTaskProgress.interface';
import { SubTaskProgressService } from './subTaskProgress.service';
import ApiError from '../../../errors/ApiError';
import sendResponse from '../../../shared/sendResponse';
import { Types } from 'mongoose';
import { logger } from '../../../shared/logger';

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

  /** 🔍
   * Toggle my subtask completion
   * PUT /tasks/:taskId/subtasks/:subtaskId/toggle-status
   * 
   * ✨ SMART HANDLING:
   * - For COLLABORATIVE tasks: Updates SubTaskProgress (my personal completion)
   * - For SINGLE_ASSIGNMENT tasks: Updates SubTask.isCompleted (global completion)
   * - For PERSONAL tasks: Updates SubTask.isCompleted (global completion)
   */
  toggleMySubtask = async (req: Request, res: Response) => {
    const taskId = req.params.taskId;
    const subtaskId = req.params.subtaskId;
    const userId = req.user?.userId;
    const { isCompleted } = req.body as IToggleSubTaskProgressBody;

    console.log("🆕🆕🆕🆕🆕🆕")

    logger.info(
      `[SubTaskProgress] toggleMySubtask called: taskId=${taskId}, subtaskId=${subtaskId}, userId=${userId}, isCompleted=${isCompleted}`
    );

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (isCompleted === undefined) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'isCompleted status is required');
    }

    // ✨ SMART HANDLING: Check task type to determine which collection to update
    const { Task } = await import('../task/task.model');
    const task = await Task.findById(taskId).lean();

    if (!task || task.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    let progress: any;
    let message: string;

    if (task.taskType === 'collaborative') {
      // ✨ COLLABORATIVE: Update SubTaskProgress (my personal completion only)
      logger.info(
        `[SubTaskProgress] Task is COLLABORATIVE - updating SubTaskProgress collection`
      );

      progress = await this.subTaskProgressService.createOrUpdateProgress(
        taskId,
        subtaskId,
        new Types.ObjectId(userId),
        isCompleted
      );

      message = 'Subtask progress updated successfully (collaborative task)';
    } else {
      // ✨ SINGLE_ASSIGNMENT or PERSONAL: Update SubTask.isCompleted (global completion)
      logger.info(
        `[SubTaskProgress] Task is ${task.taskType.toUpperCase()} - updating SubTask.isCompleted directly`
      );

      // Directly update SubTask.isCompleted for singleAssignment/personal tasks
      const { SubTask } = await import('../subTask/subTask.model');
      const { Task } = await import('../task/task.model');
      const { TaskStatus } = await import('../task/task.constant');

      // Update the subtask
      progress = await SubTask.findByIdAndUpdate(
        subtaskId,
        {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
        { new: true }
      ).select('-__v').lean();

      if (!progress) {
        throw new ApiError(StatusCodes.NOT_FOUND, 'Subtask not found');
      }

      // Update parent task progress
      const allSubtasks = await SubTask.find({
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      }).lean();

      const totalSubtasks = allSubtasks.length;
      const completedSubtasksCount = allSubtasks.filter((s: any) => s.isCompleted).length;

      const updateData: any = {
        totalSubtasks,
        completedSubtasks: completedSubtasksCount,
      };

      // Auto-complete parent task if all subtasks are done
      if (totalSubtasks > 0 && completedSubtasksCount === totalSubtasks) {
        updateData.status = TaskStatus.COMPLETED;
        updateData.completedTime = new Date();
      } else if (completedSubtasksCount > 0 && completedSubtasksCount < totalSubtasks) {
        updateData.status = TaskStatus.IN_PROGRESS;
      }

      await Task.findByIdAndUpdate(taskId, updateData);

      message = 'Subtask status updated successfully';
    }

    // Get updated progress for this child (for collaborative tasks)
    // or get updated subtask (for singleAssignment/personal tasks)
    let allProgress: any[] = [];
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    let progressPercentage = 0;

    if (task.taskType === 'collaborative') {
      allProgress = await this.subTaskProgressService.getChildProgress(
        taskId,
        new Types.ObjectId(userId)
      );

      totalSubtasks = allProgress.length;
      completedSubtasks = allProgress.filter((p) => p.isCompleted).length;
      progressPercentage =
        totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    } else {
      // For singleAssignment/personal, get all subtasks for this task
      const { SubTask } = await import('../subTask/subTask.model');
      allProgress = await SubTask.find({
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      }).lean();

      totalSubtasks = allProgress.length;
      completedSubtasks = allProgress.filter((s: any) => s.isCompleted).length;
      progressPercentage =
        totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        progress: progress,
        taskType: task.taskType,
        myProgressPercentage: progressPercentage,
        completedSubtasks,
        totalSubtasks,
        allSubtasksCompleted: completedSubtasks === totalSubtasks && totalSubtasks > 0,
      },
      message,
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
