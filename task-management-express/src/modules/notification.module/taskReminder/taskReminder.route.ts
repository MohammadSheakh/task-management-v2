//@ts-ignore
import express from 'express';
import { TaskReminderController } from './taskReminder.controller';
import { ITaskReminderDocument } from './taskReminder.interface';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import rateLimit from 'express-rate-limit';
import validateRequest from '../../../shared/validateRequest';
import { z } from 'zod';

const router = express.Router();

export const optionValidationChecking = <T extends keyof ITaskReminderDocument | 'sortBy' | 'page' | 'limit' | 'populate'>(
  filters: T[]
) => {
  return filters;
};

const paginationOptions: Array<'sortBy' | 'page' | 'limit' | 'populate'> = [
  'sortBy',
  'page',
  'limit',
  'populate',
];

const controller = new TaskReminderController();

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiter for creating reminders
 */
const createReminderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many reminder creation attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general reminder operations
 */
const reminderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Validation Schemas ────────────────────────────────────────────────
/**
 * Create reminder validation
 */
const createReminderSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  reminderTime: z.string().min(1, 'Reminder time is required'),
  triggerType: z.enum(['before_deadline', 'at_deadline', 'after_deadline', 'custom_time', 'recurring']).optional(),
  frequency: z.enum(['once', 'daily', 'weekly', 'monthly']).optional(),
  customMessage: z.string().max(500).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'push', 'sms'])).optional(),
});

// ─── Routes ────────────────────────────────────────────────────────────

/*-─────────────────────────────────
|  Child | Business | TaskReminder | edit-update-task-flow.png | Create task reminder
|  @desc User creates a reminder for a task (deadline, custom time)
|  @auth All authenticated users (child, business)
|  @rateLimit 10 requests per minute
└──────────────────────────────────*/
router.route('/').post(
  auth(TRole.commonUser),
  createReminderLimiter,
  validateRequest(createReminderSchema),
  controller.createReminder
);

/*-─────────────────────────────────
|  Child | Business | TaskReminder | edit-update-task-flow.png | Get reminders for a task
|  @desc Get all reminders associated with a specific task
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/task/:id').get(
  auth(TRole.commonUser),
  reminderLimiter,
  validateFiltersForQuery(optionValidationChecking([...paginationOptions])),
  controller.getRemindersForTask
);

/*-─────────────────────────────────
|  Child | Business | TaskReminder | home-flow.png | Get my reminders
|  @desc Get all reminders for the authenticated user
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/my').get(
  auth(TRole.commonUser),
  reminderLimiter,
  validateFiltersForQuery(optionValidationChecking(['status', 'frequency', ...paginationOptions])),
  controller.getMyReminders
);

/*-─────────────────────────────────
|  Child | Business | TaskReminder | edit-update-task-flow.png | Cancel a reminder
|  @desc Cancel/delete a specific reminder
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/:id').delete(
  auth(TRole.commonUser),
  reminderLimiter,
  controller.cancelReminder
);

/*-─────────────────────────────────
|  Child | Business | TaskReminder | edit-update-task-flow.png | Cancel all reminders for a task
|  @desc Remove all reminders associated with a task
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/task/:id/cancel-all').post(
  auth(TRole.commonUser),
  reminderLimiter,
  controller.cancelAllReminders
);

export const TaskReminderRoute = router;
