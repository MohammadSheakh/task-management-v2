import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { Task } from './task.model';
import { Types } from 'mongoose';
import { TaskType, TaskStatus } from './task.constant';
import { ITask } from './task.interface';

/**
 * Task Middleware
 * Custom validation and authorization checks for task operations
 */

/** ✔️
 * Verify that the user has permission to access/modify a task
 * Checks if user is the creator, owner, or assigned user
 */
export const verifyTaskAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const taskId = req.params.id;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    if (!taskId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Task ID is required');
    }

    const task = await Task.findById(taskId);

    if (!task || task.isDeleted) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Convert to strings for reliable comparison
    const userIdStr = userId.toString();
    const createdByIdStr = task.createdById.toString();
    const ownerUserIdStr = task.ownerUserId?.toString();
    const assignedUserIdsStr = (task.assignedUserIds || []).map((id: any) => id.toString());

    // Check if user has access
    const hasAccess =
      createdByIdStr === userIdStr ||
      ownerUserIdStr === userIdStr ||
      assignedUserIdsStr.includes(userIdStr);

    if (!hasAccess) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'You do not have access to this task'
      );
    }

    // Attach task to request for downstream use
    (req as any).task = task;
    next();
  } catch (error) {
    next(error);
  }
};

/** 🔁
 * Verify task ownership for modification
 * Only creator or owner can modify the task
 */
export const verifyTaskOwnership = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const taskId = req.params.id;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const task:ITask = (req as any).task || await Task.findById(taskId);

    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    console.log("task in ownership middleware", task);

    // Only creator or owner can modify
    // Handle both populated and non-populated fields
    const createdById = task.createdById?._id || task.createdById;
    const ownerUserId = task.ownerUserId?._id || task.ownerUserId;
    

    console.log("createdById in ownership middleware", createdById);
    console.log("ownerUserId in ownership middleware", ownerUserId);


    console.log("userId in ownership middleware", userId);

    const isOwner =
      createdById.toString() === userId.toString() ||
      ownerUserId?.toString() === userId.toString() ||
      task.assignedUserIds?.some((id: any) => id.toString() === userId.toString())
      ;


    console.log("isOwner in ownership middleware", isOwner);
    if (!isOwner) {
      throw new ApiError(
        StatusCodes.FORBIDDEN,
        'Only the task creator or owner can modify this task'
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user is Secondary User (has task management privileges)
 * Secondary User can create/assign tasks for family members
 * Business users always have permission
 *
 * Family Structure (via ChildrenBusinessUser relationship):
 * - Business User: Family owner/parent, full task management rights
 * - Secondary User: Trusted child with permission to create/assign tasks
 * - Regular Child: Can only create personal tasks for self
 *
 * @figmaIndex dashboard-flow-03.png
 * @figmaIndex add-task-flow-for-permission-account-interface.png
 */
export const checkSecondaryUserPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const { User } = await import('../../user.module/user/user.model');
    const user = await User.findById(userId).select('role').lean();

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // If business user → always allow
    if (user.role === 'business') {
      return next();
    }

    if (user.role === 'individual') {
      return next();
    }

    // If child user → check if they are Secondary User
    if (user.role === 'child') {
      const { ChildrenBusinessUser } = await import(
        '../../childrenBusinessUser.module/childrenBusinessUser.model'
      );

      /*----------- comment by sheakh .. need to recheck this logic .. 
      const relationship = await ChildrenBusinessUser.findOne({
        childUserId: new Types.ObjectId(userId),
        isSecondaryUser: true,
        isDeleted: false,
        status: 'active',
      });

      if (!relationship) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          'Only Secondary Users can create tasks. Ask your parent to grant permission.'
        );
      }
      ----------------*/


      // User is Secondary User → allow
      return next();
    }

    throw new ApiError(
      StatusCodes.FORBIDDEN,
      'Unauthorized to perform this action'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Validate task type and assigned users consistency
 * - Personal tasks should not have assigned users
 * - Collaborative tasks must have multiple assigned users
 * - Single assignment tasks must have exactly one assigned user
 */
export const validateTaskTypeConsistency = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { taskType, assignedUserIds, ownerUserId } = req.body;

    if (taskType === TaskType.PERSONAL) {
      if (assignedUserIds && assignedUserIds.length > 0) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Personal tasks cannot have assigned users'
        );
      }
    }

    if (taskType === TaskType.SINGLE_ASSIGNMENT) {
      if (!assignedUserIds || assignedUserIds.length !== 1) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Single assignment tasks must have exactly one assigned user'
        );
      }
    }

    if (taskType === TaskType.COLLABORATIVE) {
      if (!assignedUserIds || assignedUserIds.length < 2) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Collaborative tasks must have at least two assigned users'
        );
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate task status transition
 * Ensures valid status changes
 */
export const validateStatusTransition = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.body;
    const task = (req as any).task;

    if (!task) {
      next();
      return;
    }

    const currentStatus = task.status;
    const validTransitions: Record<string, string[]> = {
      [TaskStatus.PENDING]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
      [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.PENDING],
      [TaskStatus.COMPLETED]: [], // Completed tasks cannot change status
    };

    if (
      currentStatus === TaskStatus.COMPLETED &&
      status !== TaskStatus.COMPLETED
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Cannot change status of a completed task'
      );
    }

    if (
      status &&
      !validTransitions[currentStatus].includes(status)
    ) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Invalid status transition from ${currentStatus} to ${status}`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * - Check if user has reached daily task limit
 * Only applies to personal tasks
 */
export const checkDailyTaskLimit = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.userId;
    const { taskType, startTime } = req.body;

    if (!userId || taskType !== 'personal' || !startTime) {
      next();
      return;
    }

    const startDate = new Date(startTime);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(23, 59, 59, 999);

    const taskCount = await Task.countDocuments({
      ownerUserId: new Types.ObjectId(userId),
      startTime: {
        $gte: startDate,
        $lte: endDate,
      },
      isDeleted: false,
    });

    const DAILY_TASK_LIMIT = 5;

    if (taskCount >= DAILY_TASK_LIMIT) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Daily task limit reached. You already have ${taskCount} tasks scheduled for this day (max: ${DAILY_TASK_LIMIT})`
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
