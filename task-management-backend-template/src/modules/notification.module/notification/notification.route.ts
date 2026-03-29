//@ts-ignore
import express from 'express';
import { NotificationController } from './notification.controller';
import { INotificationDocument } from './notification.interface';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { setQueryOptions } from '../../../middlewares/setQueryOptions';
import validateRequest from '../../../shared/validateRequest';
//@ts-ignore
import { z } from 'zod';
import {
  rateLimiter,
  createCustomRateLimiter,
} from '../../../middlewares/rateLimiterRedis';

const router = express.Router();

export const optionValidationChecking = <
  T extends
    | keyof INotificationDocument
    | 'sortBy'
    | 'page'
    | 'limit'
    | 'populate',
>(
  filters: T[],
) => {
  return filters;
};

const paginationOptions: Array<'sortBy' | 'page' | 'limit' | 'populate'> = [
  'sortBy',
  'page',
  'limit',
  'populate',
];

const controller = new NotificationController();

// ─── Rate Limiters (Redis-based) ─────────────────────────────────────────────────────
/**
 * Rate limiter for sending notifications
 * Prevents spam - 10 requests per minute
 */
const sendNotificationLimiter = createCustomRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 requests
  'Too many notification attempts, please try again later',
  'notification-send',
);

/**
 * Rate limiter for general notification operations
 * 100 requests per minute
 */
const notificationLimiter = rateLimiter('user');

// ─── Validation Schemas ────────────────────────────────────────────────
/**
 * Bulk notification validation
 * Updated: Removed 'group' from enum, use 'family' instead
 */
const sendBulkNotificationSchema = z
  .object({
    userIds: z.array(z.string()).optional(),
    receiverRole: z.string().optional(),
    title: z.union([z.string(), z.record(z.string())]),
    subTitle: z.union([z.string(), z.record(z.string())]).optional(),
    type: z.enum([
      'task',
      'family',         // ✅ Updated: 'family' replaces 'group'
      'system',
      'reminder',
      'mention',
      'assignment',
      'deadline',
      'custom',
    ]),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
    linkFor: z.string().optional(),
    linkId: z.string().optional(),
    data: z.record(z.any()).optional(),
  })
  .refine(data => data.userIds || data.receiverRole, {
    message: 'UserIds or receiverRole is required',
  });

/**
 * Schedule reminder validation
 */
const scheduleReminderSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  reminderTime: z.string().min(1, 'Reminder time is required'),
  reminderType: z
    .enum(['before_deadline', 'at_deadline', 'after_deadline', 'custom'])
    .optional(),
  message: z.string().max(500).optional(),
});

// ─── Routes ────────────────────────────────────────────────────────────

/*-─────────────────────────────────
|  Child | Business | Notification | home-flow.png | Get my notifications with pagination
|  @desc User retrieves their personal notifications
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/my')
  .get(
    auth(TRole.commonUser),
    notificationLimiter,
    validateFiltersForQuery(
      optionValidationChecking([
        'status',
        'type',
        'priority',
        ...paginationOptions,
      ]),
    ),
    controller.getMyNotifications,
  );

/*-─────────────────────────────────
|  Child | Business | Notification | home-flow.png | Get unread notification count
|  @desc Get count of unread notifications for badge display
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/unread-count')
  .get(auth(TRole.commonUser), notificationLimiter, controller.getUnreadCount);

/*-─────────────────────────────────
|  Child | Business | Notification | home-flow.png | Mark notification as read
|  @desc Mark a single notification as read
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/:id/read')
  .post(auth(TRole.commonUser), notificationLimiter, controller.markAsRead);

/*-─────────────────────────────────
|  Child | Business | Notification | home-flow.png | Mark all notifications as read
|  @desc Mark all user notifications as read
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/read-all')
  .post(auth(TRole.commonUser), notificationLimiter, controller.markAllAsRead);

/*-─────────────────────────────────
|  Child | Business | Notification | home-flow.png | Delete notification
|  @desc Delete a single notification
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/:id')
  .delete(
    auth(TRole.commonUser),
    notificationLimiter,
    controller.deleteNotification,
  );

/*-─────────────────────────────────
|  Admin | Notification | dashboard-section-flow.png | Send bulk notification
|  @desc Admin sends system-wide or targeted notifications
|  @auth Admin only
|  @rateLimit 10 requests per minute
└──────────────────────────────────*/
router
  .route('/bulk')
  .post(
    auth(TRole.admin),
    sendNotificationLimiter,
    validateRequest(sendBulkNotificationSchema),
    controller.sendBulkNotification,
  );

/*-─────────────────────────────────
|  Child | Business | Notification | home-flow.png | Schedule reminder
|  @desc User schedules a task reminder
|  @auth All authenticated users (child, business)
|  @rateLimit 10 requests per minute
└──────────────────────────────────*/
router
  .route('/schedule-reminder')
  .post(
    auth(TRole.commonUser),
    sendNotificationLimiter,
    validateRequest(scheduleReminderSchema),
    controller.scheduleReminder,
  );

// ────────────────────────────────────────────────────────────────────────
// Parent Dashboard: Live Activity Feed for Children/Family
// Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
// Architecture: childrenBusinessUser.module (parent/teacher → children relationship)
// ────────────────────────────────────────────────────────────────────────

/*-───────────────────────────────── 🆕
|  Business (Parent/Teacher) | Notification | dashboard-flow-01.png | Get live activity feed for parent dashboard
|  @desc Real-time feed showing all children's task activities (completions, starts, subtask completions)
|  @desc Uses childrenBusinessUser relationship to fetch activities from all children
|  @auth Business users only (Parent/Teacher)
|  @rateLimit 100 requests per minute
|  @query limit - Number of activities to return (default: 10)
└──────────────────────────────────*/
router
  .route('/dashboard/activity-feed')
  .get(
    auth(TRole.business),
    notificationLimiter,
    controller.getLiveActivityFeedForParentDashboard,
  );

export const NotificationFixedRoute = router;
