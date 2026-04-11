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
import {
  verifyTaskAccess,
  verifyTaskOwnership,
  validateTaskTypeConsistency,
  validateStatusTransition,
  checkDailyTaskLimit,
  checkSecondaryUserPermission,
} from './task.middleware';
import { rateLimiter } from '../../../middlewares/rateLimiterRedis';
import { SubTaskRoute } from '../subTask/subTask.route';

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 * All rate limits are shared across server instances via Redis
 */
const createTaskLimiter = rateLimiter('user'); // 30 req/min
const taskLimiter = rateLimiter('user'); // 30 req/min

export const optionValidationChecking = <
  T extends
    | keyof ITask
    | 'sortBy'
    | 'page'
    | 'limit'
    | 'populate'
    | 'status'
    | 'taskType'
    | 'priority'
    | 'from'
    | 'to',
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
router
  .route('/dashboard/children-tasks')
  .get(
    auth(TRole.business),
    taskLimiter,
    validateFiltersForQuery(
      optionValidationChecking([
        'status',
        'taskType',
        'from',
        'to',
        ...paginationOptions,
      ]),
    ),
    controller.getChildrenTasksForDashboard,
  );

/*-─────────────────────────────────
|  Business (Parent/Teacher) | Task | dashboard-flow-01.png | Get all children's tasks with enhanced collaborative progress
|  @desc V3 ENHANCEMENT: Get paginated list of all children's tasks with INDIVIDUAL CHILD PROGRESS for collaborative tasks
|  @desc For COLLABORATIVE tasks only: each child in assignedTo array includes their personal progress from TaskProgress collection
|  @desc Progress includes: status, progressPercentage, startedAt, completedAt, completedSubtaskCount
|  @desc Supports filters: All | Not Started | In Progress | Completed | Personal Task
|  @auth Business users only (Parent/Teacher)
|  @rateLimit 100 requests per minute
|  @query status - Filter by status: 'all' | 'pending' | 'inProgress' | 'completed' (default: 'all')
|  @query taskType - Filter by type: 'children' | 'personal' (default: 'children')
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 20)
|  @query sortBy - Sort field (default: -startTime)
|  @version 3.0.0
|  @author Senior Engineering Team
|  @date 2026-03-28
└──────────────────────────────────*/
router
  .route('/dashboard/children-tasks/v3')
  .get(
    auth(TRole.business),
    taskLimiter,
    validateFiltersForQuery(
      optionValidationChecking([
        'status',
        'taskType',
        'from',
        'to',
        ...paginationOptions,
      ]),
    ),
    controller.getChildrenTasksForDashboardV3,
  );

/*-─────────────────────────────────
|  Business (Parent/Teacher) | Task | dashboard-flow-01.png | Get all children's tasks with enhanced subtask handling
|  @desc V4 ENHANCEMENT: Get paginated list of all children's tasks with ENHANCED SUBTASK HANDLING
|  @desc Shows subtasks for BOTH collaborative AND singleAssignment tasks
|  @desc For COLLABORATIVE tasks: includes myCompletion status per subtask (from SubTaskProgress collection)
|  @desc For singleAssignment tasks: includes global isCompleted status per subtask
|  @desc Includes all V3 features (child progress tracking for collaborative tasks)
|  @desc Supports filters: All | Not Started | In Progress | Completed | Personal Task
|  @auth Business users only (Parent/Teacher)
|  @rateLimit 100 requests per minute
|  @query status - Filter by status: 'all' | 'pending' | 'inProgress' | 'completed' (default: 'all')
|  @query taskType - Filter by type: 'children' | 'personal' (default: 'children')
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 20)
|  @query sortBy - Sort field (default: -startTime)
|  @version 4.0.0
|  @author Senior Engineering Team
|  @date 2026-03-28
└──────────────────────────────────*/
router
  .route('/dashboard/children-tasks/v4')
  .get(
    auth(TRole.business),
    taskLimiter,
    validateFiltersForQuery(
      optionValidationChecking([
        'status',
        'taskType',
        'from',
        'to',
        ...paginationOptions,
      ]),
    ),
    controller.getChildrenTasksForDashboardV4,
  );

/*-─────────────────────────────────
|  Business (Parent/Teacher) | Task | task-details-of-a-task.png | Get task details for parent dashboard
|  @desc Get complete task details optimized for parent dashboard
|  @desc For COLLABORATIVE: Shows all children with individual progress
|  @desc For SINGLE_ASSIGNMENT: Shows assigned child with progress
|  @desc Includes: Task info, assigned children, subtasks, progress, creator/owner info
|  @auth Business users only (Parent/Teacher)
|  @rateLimit 100 requests per minute
|  @param id - Task ID
|  @version 1.0.0
|  @author Senior Engineering Team
|  @date 2026-03-28
|  @figma teacher-parent-dashboard/dashboard/task-details-of-a-task.png
|  @figma teacher-parent-dashboard/dashboard/task-details-of-collaborative-tasks.png
└──────────────────────────────────*/
router
  .route('/:id/parent-details')
  .get(
    auth(TRole.business),
    taskLimiter,
    controller.getTaskDetailsForParent,
  );

/*-───────────────────────────────── ✔️☑️
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
  checkSecondaryUserPermission, // ⬅️ NEW: Check Secondary User status
  validateRequest(validation.createTaskValidationSchema),
  validateTaskTypeConsistency,
  // checkDailyTaskLimit,
  controller.create,
);

/*-───────────────────────────────── 🆕 V2
|  Child (Secondary) | Business | Task | edit-update-task-flow.png | Create a new task with notifications
|  @desc V2 ENHANCEMENT: Create personal, single assignment, or collaborative task with comprehensive notifications
|  @desc Sends notifications to all assigned users (children, parent, siblings)
|  @auth Business users always allowed
|  @auth Child users need Secondary User permission
|  @rateLimit 20 requests per hour (prevents spam)
|  @permission Only Secondary User children can create tasks
|  @version 2.0.0
└──────────────────────────────────*/
router.route('/v2').post(
  auth(TRole.commonUser),
  createTaskLimiter,
  checkSecondaryUserPermission,
  validateRequest(validation.createTaskValidationSchema),
  validateTaskTypeConsistency,
  checkDailyTaskLimit, //🔂 MUST TODO : must uncomment 
  controller.createV2,
);

/*-───────────────────────────────── ✔️🏁☑️
|  Child | Business | Task | home-flow.png | Get all my tasks with filtering
|  @desc Get tasks where user is creator, owner, or assigned
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/')
  .get(
    auth(TRole.commonUser),
    taskLimiter,
    validateFiltersForQuery(
      optionValidationChecking([
        'status',
        'taskType',
        'priority',
        'from',
        'to',
        ...paginationOptions,
      ]),
    ),
    controller.getMyTasks,
  );

  // Adds a completedTime: { $gte: twelveHoursAgo } filter to the query
  router
  .route('/v2')
  .get(
    auth(TRole.commonUser),
    taskLimiter,
    validateFiltersForQuery(
      optionValidationChecking([
        'status',
        'taskType',
        'priority',
        'from',
        'to',
        ...paginationOptions,
      ]),
    ),
    controller.getMyTasksV2,
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
  validateFiltersForQuery(
    optionValidationChecking([
      'status',
      'taskType',
      'priority',
      'from',
      'to',
      ...paginationOptions,
    ]),
  ),
  setQueryOptions({
    populate: [
      { path: 'createdById', select: 'name email profileImage' },
      { path: 'ownerUserId', select: 'name email profileImage' },
      { path: 'assignedUserIds', select: 'name email profileImage' },
    ],
  }),
  controller.getMyTasksWithPagination,
);

/*-───────────────────────────────── ✔️
|  Child | Business | Task | status-section-flow-01.png | Get task statistics
|  @desc Get count of tasks by status (pending, inProgress, completed)
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router
  .route('/statistics')
  .get(auth(TRole.commonUser), taskLimiter, controller.getStatistics);

/*-───────────────────────────────── ✔️✔️
|  Child | Business | Task | home-flow.png | Get daily progress (Figma aligned)
|  @desc Get daily task progress for dashboard display (Daily Progress card)
|  @desc Returns: total tasks, completed count, progress bar %, remaining tasks message
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
|  @query date - Optional: Date in YYYY-MM-DD format (default: today)
|  @example /tasks/daily-progress?date=2026-03-17
|  @figma app-user/group-children-user/home-flow.png (Daily Progress section)
└──────────────────────────────────*/
router
  .route('/daily-progress')
  .get(
    auth(TRole.commonUser),
    taskLimiter,
    validateFiltersForQuery(optionValidationChecking(['date'])),
    controller.getDailyProgress,
  );

/*-───────────────────────────────── ✔️✔️ V2
|  Child | Business | Task | home-flow.png | Get daily progress V2 (Enhanced Figma aligned)
|  @desc V2 ENHANCEMENT: Get daily task progress with Figma-aligned response format
|  @desc Returns: progress.display "1/5" format, statistics object, dynamic encouragement message
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
|  @query date - Optional: Date in YYYY-MM-DD format (default: today)
|  @example /tasks/daily-progress/v2?date=2026-03-17
|  @figma app-user/group-children-user/home-flow.png (Daily Progress section)
|  @version 2.0.0
|  @author Senior Engineering Team
|  @date 02-04-26
└──────────────────────────────────*/
router
  .route('/daily-progress/v2')
  .get(
    auth(TRole.commonUser),
    taskLimiter,
    validateFiltersForQuery(optionValidationChecking(['date'])),
    controller.getDailyProgressV2,
  );

/*-───────────────────────────────── 🆕
|  Individual User | Task | task-history-filter-by-date-range.png | Get task history with date range filtering
|  @desc Get all completed tasks within a date range for task history view
|  @desc Returns tasks with subtask progress, completion time, and task details
|  @desc Defaults to last 30 days if no date range provided
|  @auth All authenticated users (child, business, individual)
|  @rateLimit 100 requests per minute
|  @query from - Optional: Start date in YYYY-MM-DD format (default: 30 days ago)
|  @query to - Optional: End date in YYYY-MM-DD format (default: today)
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 20)
|  @query sortBy - Sort field (default: -completedTime)
|  @figma figma-asset/app-user/individual-user/task-history-filter-by-date-range.png
└──────────────────────────────────*/
router
  .route('/history')
  .get(
    auth(TRole.commonUser),
    taskLimiter,
    validateRequest(validation.taskHistoryQueryValidationSchema),
    validateFiltersForQuery(
      optionValidationChecking(['from', 'to', ...paginationOptions]),
    ),
    setQueryOptions({
      populate: [
        { path: 'createdById', select: 'name email profileImage' },
      ],
      select: '-__v',
    }),
    controller.getTaskHistory,
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
    select: '-__v',
  }),
  controller.getTaskById,
);

/*-─────────────────────────────────
|  Child | Business | Task | edit-update-task-flow.png | Update task by ID
|  @desc Update task details (creator/owner only)
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
|  @access Task creator or owner only
└──────────────────────────────────*/
router
  .route('/:id')
  .put(
    auth(TRole.commonUser),
    taskLimiter,
    verifyTaskAccess,
    verifyTaskOwnership,
    validateRequest(validation.updateTaskValidationSchema),
    validateTaskTypeConsistency,
    controller.updateById,
  );

/*-───────────────────────────────── ✔️
|  Child | Business | Task | edit-update-task-flow.png | Update task status
|  @desc Update task status with automatic timestamp handling
|  @auth All authenticated users (child, business)
|  @access Task creator, owner, or assigned users only
|  @note For COLLABORATIVE tasks, use /task-progress/:taskId/status instead
|  @note This endpoint directly updates parent task status (personal & singleAssignment only)
└──────────────────────────────────*/
router
  .route('/:id/status')
  .put(
    auth(TRole.commonUser),
    verifyTaskAccess,
    verifyTaskOwnership,
    validateRequest(validation.updateTaskStatusValidationSchema),
    validateStatusTransition,
    controller.updateStatus,
  );

/*-───────────────────────────────── 🆕 V2
|  Child | Business | Task | edit-update-task-flow.png, response-based-on-mode.png | Update task status with creative response
|  @desc Update task status and receive personalized response based on support mode and completion percentage
|  @auth All authenticated users (child, business)
|  @access Task creator, owner, or assigned users only
|  @returns Creative response with mode-specific messaging (calm, encouraging, logical)
|  @note Triggers popup at 50% and 100% completion milestones
|  @see Figma: response-based-on-mode.png for message templates
└──────────────────────────────────*/
router
  .route('/:id/status/v2')
  .put(
    auth(TRole.commonUser),
    verifyTaskAccess,
    verifyTaskOwnership,
    validateRequest(validation.updateTaskStatusValidationSchema),
    validateStatusTransition,
    controller.updateStatusV2,
  );

/*-───────────────────────────────── 🆕 V3
|  Child | Business | Task | edit-update-task-flow.png | Update task status with auto-completed subtasks
|  @desc Update task status V3: For personal/singleAssignment tasks, automatically marks all subtasks as completed when task is completed
|  @auth All authenticated users (child, business)
|  @access Task creator, owner, or assigned users only
|  @returns Updated task with creative response and count of auto-completed subtasks
|  @note Only applies to personal/singleAssignment tasks with subtasks when status is set to 'completed'
|  @version 3.0.0
|  @author Senior Engineering Team
└──────────────────────────────────*/
router
  .route('/:id/status/v3')
  .put(
    auth(TRole.commonUser),
    verifyTaskAccess,
    verifyTaskOwnership,
    validateRequest(validation.updateTaskStatusValidationSchema),
    validateStatusTransition,
    controller.updateStatusV3,
  );

/*-───────────────────────────────── 🆕 V4
|  Child | Business | Task | edit-update-task-flow.png, response-based-on-mode.png | Update task status V4 - Unified for ALL task types
|  @desc Unified endpoint handling personal, singleAssignment, and collaborative tasks with creative response
|  @desc Personal/SingleAssignment: Auto-completes subtasks + creative response
|  @desc Collaborative: Delegates to TaskProgress + creative response + parent sync detection
|  @auth All authenticated users (child, business)
|  @access Task creator, owner, or assigned users only
|  @returns Unified response: { task/progress, creativeResponse, milestone, taskType, autoCompletedSubtasks?, isParentTaskCompleted? }
|  @see Figma: response-based-on-mode.png for message templates
|  @version 4.0.0
|  @author Senior Engineering Team
└──────────────────────────────────*/
router
  .route('/:id/status/v4')
  .put(
    auth(TRole.commonUser),
    verifyTaskAccess,
    verifyTaskOwnership,
    validateRequest(validation.updateTaskStatusValidationSchema),
    validateStatusTransition,
    controller.updateStatusV4,
  );

/*-───────────────────────────────── ✔️
|  Child | Business | Task | edit-update-task-flow.png | Update subtask progress
|  @desc Update subtask list and auto-calculate completion percentage
|  @auth All authenticated users (child, business)
|  @access Task creator or owner only
└──────────────────────────────────*/
router
  .route('/:id/subtasks/progress')
  .put(
    auth(TRole.commonUser),
    verifyTaskAccess,
    verifyTaskOwnership,
    controller.updateSubtaskProgress,
  );

/*-─────────────────────────────────
|  Child | Business | Task | edit-update-task-flow.png | Soft delete task by ID
|  @desc Soft delete a task (creator/owner only)
|  @auth All authenticated users (child, business)
|  @access Task creator or owner only
└──────────────────────────────────*/
router
  .route('/:id')
  .delete(
    auth(TRole.commonUser),
    verifyTaskAccess,
    verifyTaskOwnership,
    controller.softDeleteById,
  );

/*-─────────────────────────────────
|  Admin | Task | dashboard-section-flow.png | Permanently delete task by ID
|  @desc Permanently delete a task (admin only)
|  @auth Admin only
|  @access System administrators only
└──────────────────────────────────*/
router
  .route('/:id/permanent')
  .delete(auth(TRole.admin), verifyTaskAccess, controller.deleteById);

/*-─────────────────────────────────
|  SubTask Routes
|  @module SubTask
|  @desc Nested routes for subtask CRUD operations
|  @routes POST /tasks/:id/subtasks - Add subtask
|  @routes GET /tasks/:id/subtasks - Get all subtasks
|  @routes GET /tasks/:id/subtasks/:subtaskId - Get single subtask
|  @routes PUT /tasks/:id/subtasks/:subtaskId - Update subtask
|  @routes PUT /tasks/:id/subtasks/:subtaskId/toggle-status - Toggle subtask
|  @routes DELETE /tasks/:id/subtasks/:subtaskId - Delete subtask
└──────────────────────────────────*/
router.use('/:id/subtasks', SubTaskRoute);

// ────────────────────────────────────────────────────────────────────────
// Figma-Aligned Routes: Preferred Time Suggestion
// Figma: app-user/group-children-user/create-task-flow.png
// ────────────────────────────────────────────────────────────────────────

/*-─────────────────────────────────
|  Child | Business | User | Task | create-task-flow.png | Get preferred time suggestion
|  @desc Get AI-powered time suggestion for task scheduling based on user's task history
|  @auth All authenticated users (child, business)
|  @query assignedUserId - Optional: Get suggestion for assignee (parent creating for child)
|  @returns Suggested time with confidence level and explanation
└──────────────────────────────────*/
router
  .route('/suggest-preferred-time')
  .get(auth(TRole.commonUser), controller.getPreferredTimeSuggestion);

// ────────────────────────────────────────────────────────────────────────
// SubTask Progress Routes (Per-Child Subtask Completion Tracking)
// NEW: For collaborative tasks, each child has independent subtask progress
// Figma: app-user/group-children-user/home-flow.png
//        task-details-with-subTasks.png
// ────────────────────────────────────────────────────────────────────────
import { SubTaskProgressRoute } from '../subTaskProgress/subTaskProgress.route';

router.use('/subtask-progress', SubTaskProgressRoute);

// ────────────────────────────────────────────────────────────────────────
// Parent Dashboard: Children's Tasks
// Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
//        teacher-parent-dashboard/dashboard/dashboard-flow-02.png
// ────────────────────────────────────────────────────────────────────────

export const TaskRoute = router;
