import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { TaskReminder } from './taskReminder.model';
import { ITaskReminder, ITaskReminderDocument } from './taskReminder.interface';
import ApiError from '../../../errors/ApiError';
import { errorLogger, logger } from '../../../shared/logger';
import { TaskReminderStatus, TASK_REMINDER_LIMITS, REMINDER_QUEUE_CONFIG } from './taskReminder.constant';
import { Task } from '../../task.module/task/task.model';
import { NotificationService } from '../notification/notification.service';
// Import BullMQ queue
import { taskRemindersQueue } from '../../../helpers/bullmq/bullmq';
import { GenericService } from '../../_generic-module/generic.services';

/**
 * TaskReminder Service
 * Handles business logic for task reminder operations
 *
 * Features:
 * - One-time and recurring reminders
 * - BullMQ scheduled job processing
 * - Automatic rescheduling for recurring reminders
 * - Integration with NotificationService
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class TaskReminderService extends GenericService<typeof TaskReminder, ITaskReminderDocument> {
  notificationService: NotificationService;

  constructor() {
    super(TaskReminder);
    this.notificationService = new NotificationService();
  }

  /**
   * Create a task reminder
   *
   * @param data - Reminder data
   * @returns Created reminder
   */
  async createReminder(data: Partial<ITaskReminder>): Promise<ITaskReminderDocument> {
    const { taskId, userId, createdByUserId, reminderTime, triggerType } = data;

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    // Check reminder limit for this task
    const existingReminders = await TaskReminder.countRemindersForTask(new Types.ObjectId(taskId as string));
    if (existingReminders >= TASK_REMINDER_LIMITS.MAX_REMINDERS_PER_TASK) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `Maximum ${TASK_REMINDER_LIMITS.MAX_REMINDERS_PER_TASK} reminders allowed per task`
      );
    }

    // Validate reminder time is in the future
    if (new Date(reminderTime!) <= new Date()) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Reminder time must be in the future');
    }

    // Create reminder
    const reminder = await TaskReminder.create({
      ...data,
      status: TaskReminderStatus.PENDING,
      sentCount: 0,
    });

    // Schedule BullMQ job
    try {
      const job = await taskRemindersQueue.add(
        'processTaskReminder',
        {
          reminderId: reminder._id.toString(),
          taskId: reminder.taskId.toString(),
          userId: reminder.userId.toString(),
          reminderTime: reminder.reminderTime,
          triggerType: reminder.triggerType,
          channels: reminder.channels,
          customMessage: reminder.customMessage,
        },
        {
          delay: reminder.reminderTime.getTime() - Date.now(),
          attempts: REMINDER_QUEUE_CONFIG.JOB_ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: REMINDER_QUEUE_CONFIG.BACKOFF_DELAY,
          },
          removeOnComplete: {
            age: REMINDER_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
          },
        }
      );

      // Update reminder with job ID
      reminder.jobId = job.id;
      await reminder.save();

      logger.info(`⏰ Task reminder scheduled: ${reminder._id} for ${reminder.reminderTime}`);
    } catch (error) {
      errorLogger.error('Failed to schedule reminder job:', error);
      // Don't throw - reminder is still valid even if job scheduling fails
    }

    return reminder;
  }

  /**
   * Get reminders for a task
   *
   * @param taskId - Task ID
   * @param options - Query options
   * @returns Array of reminders
   */
  async getRemindersForTask(taskId: string, options?: any): Promise<ITaskReminderDocument[]> {
    const query = {
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    };

    let dbQuery = TaskReminder.find(query).sort({ reminderTime: -1 });

    if (options?.limit) {
      dbQuery = dbQuery.limit(options.limit);
    }

    return await dbQuery;
  }

  /**
   * Get reminders for a user
   *
   * @param userId - User ID
   * @param options - Query options
   * @returns Array of reminders
   */
  async getRemindersForUser(userId: string, options?: any): Promise<ITaskReminderDocument[]> {
    const query = {
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    };

    let dbQuery = TaskReminder.find(query)
      .populate('taskId', 'title description dueDate')
      .sort({ reminderTime: -1 });

    if (options?.limit) {
      dbQuery = dbQuery.limit(options.limit);
    }

    return await dbQuery;
  }

  /**
   * Cancel a reminder
   *
   * @param reminderId - Reminder ID
   * @param userId - User ID (for validation)
   * @returns Updated reminder
   */
  async cancelReminder(reminderId: string, userId: string): Promise<ITaskReminderDocument | null> {
    const reminder = await TaskReminder.findOne({
      _id: new Types.ObjectId(reminderId),
      userId: new Types.ObjectId(userId),
      isDeleted: false,
    });

    if (!reminder) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Reminder not found');
    }

    if (reminder.status === TaskReminderStatus.SENT) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot cancel a reminder that has already been sent');
    }

    reminder.status = TaskReminderStatus.CANCELLED;
    await reminder.save();

    // TODO: Remove from BullMQ queue if needed
    // await taskRemindersQueue.remove(reminder.jobId);

    logger.info(`❌ Task reminder cancelled: ${reminderId}`);

    return reminder;
  }

  /**
   * Cancel all reminders for a task
   *
   * @param taskId - Task ID
   * @param userId - User ID (for validation)
   * @returns Number of cancelled reminders
   */
  async cancelAllRemindersForTask(taskId: string, userId: string): Promise<number> {
    // Verify user has access to the task
    const task = await Task.findById(taskId);
    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    const count = await TaskReminder.cancelRemindersForTask(new Types.ObjectId(taskId));
    logger.info(`❌ Cancelled ${count} reminders for task: ${taskId}`);

    return count;
  }

  /**✔️
   * Process a due reminder (called by BullMQ worker)
   *
   * @param reminderId - Reminder ID
   * @returns Processed reminder
   */
  async processReminder(reminderId: string): Promise<ITaskReminderDocument | null> {
    const reminder = await TaskReminder.findById(reminderId).populate('taskId userId');

    if (!reminder) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Reminder not found');
    }

    if (reminder.status !== TaskReminderStatus.PENDING) {
      logger.warn(`⚠️ Reminder ${reminderId} already processed (status: ${reminder.status})`);
      return reminder;
    }

    // Get task details
    const task = reminder.taskId as any;

    // Send notification
    await this.notificationService.createNotification({
      receiverId: reminder.userId,
      title: this.getReminderTitle(reminder.triggerType, task?.title),
      subTitle: this.getReminderSubtitle(reminder.triggerType, reminder.customMessage, task?.title),
      type: 'reminder',
      priority: 'high',
      channels: reminder.channels,
      linkFor: 'task',
      linkId: reminder.taskId,
      referenceFor: 'task',
      referenceId: reminder.taskId,
      data: {
        taskId: reminder.taskId.toString(),
        reminderType: reminder.triggerType,
        reminderTime: reminder.reminderTime,
      },
    });

    // Mark as sent (and reschedule if recurring) // 🔂 Need to remove recurring feature .. client dont want that 
    await reminder.markAsSent();

    logger.info(`✅ Task reminder processed: ${reminderId}`);

    return reminder;
  }

  /**
   * Get reminder title based on trigger type
   */
  private getReminderTitle(triggerType: string, taskTitle?: string): string {
    const titles: Record<string, string> = {
      before_deadline: 'Task Reminder: Deadline Approaching',
      at_deadline: 'Task Due Now',
      after_deadline: 'Task Overdue',
      custom_time: 'Task Reminder',
      recurring: 'Recurring Task Reminder',
    };
    return titles[triggerType] || 'Task Reminder';
  }

  /**
   * Get reminder subtitle based on trigger type
   */
  private getReminderSubtitle(triggerType: string, customMessage?: string, taskTitle?: string): string {
    if (customMessage) {
      return customMessage;
    }

    const subtitles: Record<string, string> = {
      before_deadline: `Your task "${taskTitle}" is due soon`,
      at_deadline: `Your task "${taskTitle}" is due now`,
      after_deadline: `Your task "${taskTitle}" is overdue`,
      custom_time: `Reminder for task "${taskTitle}"`,
      recurring: `Recurring reminder for "${taskTitle}"`,
    };
    return subtitles[triggerType] || `Reminder for task "${taskTitle}"`;
  }

  /**
   * Get pending reminders (for manual processing if needed)
   */
  async getPendingReminders(): Promise<ITaskReminderDocument[]> {
    return await TaskReminder.getPendingReminders();
  }
}
