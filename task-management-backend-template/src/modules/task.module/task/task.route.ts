//@ts-ignore
import express from 'express';
import { TaskController } from './task.controller';
import { ITask } from './task.interface';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import validateRequest from '../../../shared/validateRequest';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { setQueryOptions } from '../../../middlewares/setQueryOptions';
import { getLoggedInUserAndSetReferenceToUser } from '../../../middlewares/getLoggedInUserAndSetReferenceToUser';
import * as validation from './task.validation';
import { verifyTaskAccess, verifyTaskOwnership, validateTaskTypeConsistency, validateStatusTransition, checkDailyTaskLimit, checkSecondaryUserPermission } from './task.middleware';
import { rateLimiter } from '../../../middlewares/rateLimiterRedis';
import { SubTaskRoute } from '../subTask/subTask.route';

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 * All rate limits are shared across server instances via Redis
 */
const createTaskLimiter = rateLimiter('user');  // 30 req/min
const taskLimiter = rateLimiter('user');        // 30 req/min

export const optionValidationChecking = <T extends keyof ITask | 'sortBy' | 'page' | 'limit' | 'populate' | 'status' | 'taskType' | 'priority' | 'from' | 'to'>(
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

const controller = new TaskController();

/*-─────────────────────────────────
|  Business (Parent/Teacher) | Task | dashboard-flow-01.png | Get all children's tasks for dashboard
|  @desc Get paginated list of all children's tasks with status filtering for parent dashboard
|  @desc Supports filters: All | Not Started | In Progress | Completed | Personal Task
|  @auth Business users only (Parent/Teacher)
|  @rateLimit 100 requests per minute
|  @query status - Filter by status: 'all' | 'pending' | 'inProgress' | 'completed' (default: 'all')
|  @query taskType - Filter by type: 'children' | 'personal' (default: 'children')
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 20)
|  @query sortBy - Sort field (default: -startTime)
└──────────────────────────────────*/
router.route('/dashboard/children-tasks').get(
  auth(TRole.business),
  taskLimiter,
  validateFiltersForQuery(optionValidationChecking(['status', 'taskType', 'from', 'to', ...paginationOptions])),
  controller.getChildrenTasksForDashboard
);

/*-───────────────────────────────── ✔️
|  Child (Secondary) | Business | Task | edit-update-task-flow.png | Create a new task
|  @desc Create personal, single assignment, or collaborative task
|  @auth Business users always allowed
|  @auth Child users need Secondary User permission
|  @rateLimit 20 requests per hour (prevents spam)
|  @permission Only Secondary User children can create tasks
└──────────────────────────────────*/
router.route('/').post(
  auth(TRole.commonUser),
  createTaskLimiter,
  checkSecondaryUserPermission,  // ⬅️ NEW: Check Secondary User status
  validateRequest(validation.createTaskValidationSchema),
  validateTaskTypeConsistency,
  checkDailyTaskLimit,
  controller.create
);

/*-───────────────────────────────── ✔️
|  Child | Business | Task | home-flow.png | Get all my tasks with filtering
|  @desc Get tasks where user is creator, owner, or assigned
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/').get(
  auth(TRole.commonUser),
  taskLimiter,
  validateFiltersForQuery(optionValidationChecking(['status', 'taskType', 'priority', 'from', 'to', ...paginationOptions])),
  controller.getMyTasks
);

/*-─────────────────────────────────✔️
|  Child | Business | Task | home-flow.png | Get all my tasks with pagination
|  @desc Paginated list of tasks with advanced filtering
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/paginate').get(
  auth(TRole.commonUser),
  taskLimiter,
  validateFiltersForQuery(optionValidationChecking(['status', 'taskType', 'priority', 'from', 'to', ...paginationOptions])),
  setQueryOptions({
    populate: [
      { path: 'createdById', select: 'name email profileImage' },
      { path: 'ownerUserId', select: 'name email profileImage' },
      { path: 'assignedUserIds', select: 'name email profileImage' },
    ],
  }),
  controller.getMyTasksWithPagination
);

/*-───────────────────────────────── ✔️
|  Child | Business | Task | status-section-flow-01.png | Get task statistics
|  @desc Get count of tasks by status (pending, inProgress, completed)
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/statistics').get(
  auth(TRole.commonUser),
  taskLimiter,
  controller.getStatistics
);

/*-─────────────────────────────────
|  Child | Business | Task | home-flow.png | Get daily progress
|  @desc Get task completion progress for a specific date
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/daily-progress').get(
  auth(TRole.commonUser),
  taskLimiter,
  controller.getDailyProgress
);

/*-───────────────────────────────── ✔️
|  Child | Business | Task | home-flow.png | Get task details by ID
|  @desc Get single task with populated user details and subtasks (VIRTUAL POPULATE)
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
|  @access Task creator, owner, or assigned users only
|  @figma app-user/group-children-user/home-flow.png (Task Details screen)
|  @response Task details + subtasks array (5 subtasks in screenshot)
└──────────────────────────────────*/
router.route('/:id').get(
  auth(TRole.commonUser),
  taskLimiter,
  verifyTaskAccess, // 🔁 need to verify this implementation
  setQueryOptions({
    populate: [
      { path: 'createdById', select: 'name email profileImage' },
      { path: 'ownerUserId', select: 'name email profileImage' },
      { path: 'assignedUserIds', select: 'name email profileImage' },
      { path: 'subtasks', select: '-__v -isDeleted' }, // ⭐ VIRTUAL POPULATE from SubTask collection
    ],
    select: '-__v'
  }),
  controller.getTaskById
);

/*-─────────────────────────────────
|  Child | Business | Task | edit-update-task-flow.png | Update task by ID
|  @desc Update task details (creator/owner only)
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
|  @access Task creator or owner only
└──────────────────────────────────*/
router.route('/:id').put(
  auth(TRole.commonUser),
  taskLimiter,
  verifyTaskAccess,
  verifyTaskOwnership,
  validateRequest(validation.updateTaskValidationSchema),
  validateTaskTypeConsistency,
  controller.updateById
);

/*-───────────────────────────────── ✔️
|  Child | Business | Task | edit-update-task-flow.png | Update task status
|  @desc Update task status with automatic timestamp handling
|  @auth All authenticated users (child, business)
|  @access Task creator, owner, or assigned users only
└──────────────────────────────────*/
router.route('/:id/status').put(
  auth(TRole.commonUser),
  verifyTaskAccess,
  verifyTaskOwnership,
  validateRequest(validation.updateTaskStatusValidationSchema),
  validateStatusTransition,
  controller.updateStatus
);

/*-───────────────────────────────── ✔️
|  Child | Business | Task | edit-update-task-flow.png | Update subtask progress
|  @desc Update subtask list and auto-calculate completion percentage
|  @auth All authenticated users (child, business)
|  @access Task creator or owner only
└──────────────────────────────────*/
router.route('/:id/subtasks/progress').put(
  auth(TRole.commonUser),
  verifyTaskAccess,
  verifyTaskOwnership,
  controller.updateSubtaskProgress
);

/*-─────────────────────────────────
|  Child | Business | Task | edit-update-task-flow.png | Soft delete task by ID
|  @desc Soft delete a task (creator/owner only)
|  @auth All authenticated users (child, business)
|  @access Task creator or owner only
└──────────────────────────────────*/
router.route('/:id').delete(
  auth(TRole.commonUser),
  verifyTaskAccess,
  verifyTaskOwnership,
  controller.softDeleteById
);

/*-─────────────────────────────────
|  Admin | Task | dashboard-section-flow.png | Permanently delete task by ID
|  @desc Permanently delete a task (admin only)
|  @auth Admin only
|  @access System administrators only
└──────────────────────────────────*/
router.route('/:id/permanent').delete(
  auth(TRole.admin),
  verifyTaskAccess,
  controller.deleteById
);

/*-─────────────────────────────────
|  SubTask Routes
|  @module SubTask
|  @desc Nested routes for subtask CRUD operations
|  @routes POST /tasks/:id/subtasks - Add subtask
|  @routes GET /tasks/:id/subtasks - Get all subtasks
|  @routes GET /tasks/:id/subtasks/:subtaskId - Get single subtask
|  @routes PUT /tasks/:id/subtasks/:subtaskId - Update subtask
|  @routes POST /tasks/:id/subtasks/:subtaskId/toggle - Toggle subtask
|  @routes DELETE /tasks/:id/subtasks/:subtaskId - Delete subtask
└──────────────────────────────────*/
router.use('/:id', SubTaskRoute);

// ────────────────────────────────────────────────────────────────────────
// Figma-Aligned Routes: Daily Progress
// Figma: app-user/group-children-user/home-flow.png
//        teacher-parent-dashboard/dashboard/dashboard-flow-01.png
// ────────────────────────────────────────────────────────────────────────

/*-─────────────────────────────────
|  Child | Business | Task | home-flow.png | Get daily progress (Figma aligned)
|  @desc Get daily task progress for dashboard display
|  @auth All authenticated users (child, business)
└──────────────────────────────────*/
router.route('/daily-progress').get(
  auth(TRole.commonUser),
  controller.getDailyProgress
);

/*-─────────────────────────────────
|  Child | Business | User | Task | create-task-flow.png | Get preferred time suggestion
|  @desc Get AI-powered time suggestion for task scheduling based on user's task history
|  @auth All authenticated users (child, business)
|  @query assignedUserId - Optional: Get suggestion for assignee (parent creating for child)
|  @returns Suggested time with confidence level and explanation
└──────────────────────────────────*/
router.route('/suggest-preferred-time').get(
  auth(TRole.commonUser),
  controller.getPreferredTimeSuggestion
);

// ────────────────────────────────────────────────────────────────────────
// Parent Dashboard: Children's Tasks
// Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
//        teacher-parent-dashboard/dashboard/dashboard-flow-02.png
// ────────────────────────────────────────────────────────────────────────



export const TaskRoute = router;
