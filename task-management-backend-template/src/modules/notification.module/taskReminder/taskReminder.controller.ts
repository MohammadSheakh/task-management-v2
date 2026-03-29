import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { GenericController } from '../../_generic-module/generic.controller';
import { TaskReminder } from './taskReminder.model';
import { ITaskReminderDocument } from './taskReminder.interface';
import { TaskReminderService } from './taskReminder.service';
import { TRole } from '../../../middlewares/roles';
import ApiError from '../../../errors/ApiError';
import { TaskReminderTrigger, TaskReminderFrequency } from './taskReminder.constant';
import sendResponse from '../../../shared/sendResponse';
import { Types } from 'mongoose';
/**
 * TaskReminder Controller
 * Handles HTTP requests for task reminder operations
 *
 * Features:
 * - One-time and recurring reminders
 * - BullMQ scheduled processing
 * - Comprehensive reminder management
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class TaskReminderController extends GenericController<typeof TaskReminder, ITaskReminderDocument> {
  taskReminderService: TaskReminderService;

  constructor() {
    super(new TaskReminderService(), 'TaskReminder');
    this.taskReminderService = new TaskReminderService();
  }

  /**
   * Create a task reminder
   * User | TaskReminder #01 | Create task reminder
   *
   * @body {string} taskId - Task ID
   * @body {string} reminderTime - ISO date string
   * @body {string} triggerType - Type of trigger
   * @body {string} frequency - once|daily|weekly|monthly
   * @body {string} customMessage - Optional message
   * @body {string[]} channels - Delivery channels
   */
  createReminder = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const {
      taskId,
      reminderTime,
      triggerType = 'custom_time',
      frequency = 'once',
      customMessage,
      channels,
    } = req.body;

    if (!taskId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Task ID is required');
    }

    if (!reminderTime) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Reminder time is required');
    }

    const scheduledDate = new Date(reminderTime);
    if (scheduledDate <= new Date()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Reminder time must be in the future');
    }

    const result = await this.taskReminderService.createReminder({
      taskId: new Types.ObjectId(taskId),
      userId: new Types.ObjectId(userId),
      createdByUserId: new Types.ObjectId(userId),
      reminderTime: scheduledDate,
      triggerType,
      frequency,
      customMessage,
      channels,
    });

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Reminder scheduled successfully',
      success: true,
    });
  };

  /**
   * Get reminders for a task
   * User | TaskReminder #02 | Get task reminders
   *
   * @param {string} id - Task ID
   */
  getRemindersForTask = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const options = {
      limit: parseInt(req.query.limit as string) || 10,
    };

    const result = await this.taskReminderService.getRemindersForTask(taskId, options);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task reminders retrieved successfully',
      success: true,
    });
  };

  /**
   * Get my reminders
   * User | TaskReminder #03 | Get my reminders
   */
  getMyReminders = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const options = {
      limit: parseInt(req.query.limit as string) || 20,
    };

    const result = await this.taskReminderService.getRemindersForUser(userId, options);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'My reminders retrieved successfully',
      success: true,
    });
  };

  /**
   * Cancel a reminder
   * User | TaskReminder #04 | Cancel reminder
   *
   * @param {string} id - Reminder ID
   */
  cancelReminder = async (req: Request, res: Response) => {
    const reminderId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.taskReminderService.cancelReminder(reminderId, userId);

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Reminder not found');
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Reminder cancelled successfully',
      success: true,
    });
  };

  /**
   * Cancel all reminders for a task
   * User | TaskReminder #05 | Cancel all task reminders
   *
   * @param {string} id - Task ID
   */
  cancelAllReminders = async (req: Request, res: Response) => {
    const taskId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const count = await this.taskReminderService.cancelAllRemindersForTask(taskId, userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: { count },
      message: `${count} reminders cancelled successfully`,
      success: true,
    });
  };
}

