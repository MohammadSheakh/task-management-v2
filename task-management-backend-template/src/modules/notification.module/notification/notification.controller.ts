//@ts-ignore
import { Request, Response } from 'express';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import { Types } from 'mongoose';
import { GenericController } from '../../_generic-module/generic.controller';
import { Notification } from './notification.model';
import { INotificationDocument } from './notification.interface';
import { NotificationService } from './notification.service';
import ApiError from '../../../errors/ApiError';
import {
  NotificationPriority,
  NotificationChannel,
} from './notification.constant';
import sendResponse from '../../../shared/sendResponse';


/**
 * Notification Controller
 * Handles HTTP requests for notification operations
 *
 * Features:
 * - Multi-channel notification delivery
 * - BullMQ async processing
 * - Redis-cached unread counts
 * - Scheduled notifications for reminders
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class NotificationController extends GenericController<
  typeof Notification,
  INotificationDocument
> {
  notificationService: NotificationService;

  constructor() {
    super(new NotificationService(), 'Notification');
    this.notificationService = new NotificationService();
  }

  /**
   * Get my notifications with pagination
   * User | Notification #01 | Get my notifications
   *
   * @query {number} page - Page number
   * @query {number} limit - Items per page
   * @query {string} status - Filter by status
   * @query {string} type - Filter by type
   * @query {string} priority - Filter by priority
   */
  getMyNotifications = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      status: req.query.status as any,
      type: req.query.type as any,
      priority: req.query.priority as any,
    };

    const result = await this.notificationService.getUserNotifications(
      userId,
      options,
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Notifications retrieved successfully',
      success: true,
    });
  };

  /**
   * Get unread notification count
   * User | Notification #02 | Get unread count
   */
  getUnreadCount = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const count = await this.notificationService.getUnreadCount(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: { count },
      message: 'Unread count retrieved successfully',
      success: true,
    });
  };

  /**
   * Mark notification as read
   * User | Notification #03 | Mark as read
   *
   * @param {string} id - Notification ID
   */
  markAsRead = async (req: Request, res: Response) => {
    const notificationId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.notificationService.markAsRead(
      notificationId,
      userId,
    );

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Notification marked as read',
      success: true,
    });
  };

  /**
   * Mark all notifications as read
   * User | Notification #04 | Mark all as read
   */
  markAllAsRead = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const count = await this.notificationService.markAllAsRead(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: { count },
      message: `All ${count} notifications marked as read`,
      success: true,
    });
  };

  /**
   * Delete notification
   * User | Notification #05 | Delete notification
   *
   * @param {string} id - Notification ID
   */
  deleteNotification = async (req: Request, res: Response) => {
    const notificationId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const result = await this.notificationService.deleteNotification(
      notificationId,
      userId,
    );

    if (!result) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Notification not found');
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Notification deleted successfully',
      success: true,
    });
  };

  /**
   * Send bulk notification (Admin only)
   * Admin | Notification #06 | Send bulk notification
   *
   * @body {string[]} userIds - Array of user IDs
   * @body {string} receiverRole - Or target by role
   * @body {string} title - Notification title
   * @body {string} subTitle - Notification subtitle
   * @body {string} type - Notification type
   * @body {string} priority - Priority (low|normal|high|urgent)
   * @body {string[]} channels - Delivery channels
   */
  sendBulkNotification = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const {
      userIds,
      receiverRole,
      title,
      subTitle,
      type,
      priority,
      channels,
      linkFor,
      linkId,
      data,
    } = req.body;

    if (!title) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Title is required');
    }

    if (!type) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Type is required');
    }

    if (!userIds && !receiverRole) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'UserIds or receiverRole is required',
      );
    }

    const result = await this.notificationService.sendBulkNotification({
      userIds,
      receiverRole,
      title,
      subTitle,
      type,
      priority: priority || NotificationPriority.NORMAL,
      channels: channels || [NotificationChannel.IN_APP],
      linkFor,
      linkId,
      data,
    });

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: `${result.length} notifications sent successfully`,
      success: true,
    });
  };

  /**
   * Schedule a reminder (for task reminders)
   * User | Notification #07 | Schedule reminder
   *
   * @body {string} taskId - Task ID
   * @body {string} reminderTime - ISO date string
   * @body {string} reminderType - Type of reminder
   * @body {string} message - Custom message
   */
  scheduleReminder = async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const {
      taskId,
      reminderTime,
      reminderType = 'before_deadline',
      message,
    } = req.body;

    if (!taskId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Task ID is required');
    }

    if (!reminderTime) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Reminder time is required');
    }

    const scheduledDate = new Date(reminderTime);

    if (scheduledDate <= new Date()) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Reminder time must be in the future',
      );
    }

    const result = await this.notificationService.createTaskReminder(
      taskId,
      userId,
      scheduledDate,
      reminderType,
      message,
    );

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Reminder scheduled successfully',
      success: true,
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  // Figma-Aligned Controllers: Live Activity Feed for Children/Family
  // ────────────────────────────────────────────────────────────────────────

  /** ----------------------------------------------
   * @role Business (Parent/Teacher)
   * @Section Dashboard
   * @module Notification
   * @figmaIndex dashboard-flow-01.png (Live Activity section)
   * @desc Get live activity feed for parent/teacher dashboard - shows all children's activities
   * @query limit - Number of activities to return (default: 10)
   *----------------------------------------------*/
  getLiveActivityFeedForParentDashboard = async (
    req: Request,
    res: Response,
  ) => {
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const limit = parseInt(req.query.limit as string) || 10;

    const result =
      await this.notificationService.getLiveActivityFeedForChildren(
        businessUserId,
        limit,
      );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Live activity feed retrieved successfully for parent dashboard',
      success: true,
    });
  };
}
