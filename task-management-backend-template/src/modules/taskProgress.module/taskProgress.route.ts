//@ts-ignore
import express from 'express';
import { taskProgressController } from './taskProgress.controller';
import auth from '../../middlewares/auth';
import { TRole } from '../../middlewares/roles';
import validateRequest from '../../shared/validateRequest';
import * as validation from './taskProgress.validation';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 */
const progressLimiter = rateLimiter('user'); // 30 req/min
const updateProgressLimiter = rateLimiter('user'); // 30 req/min

/*-───────────────────────────────── ✔️
|  Child | TaskProgress | status-section-flow-01.png | Get my progress on a task
|  @desc Get personal progress on specific task (status, subtasks completed)
|  @auth Child user (task assignee)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/:taskId/user/:userId',
  auth(TRole.commonUser),
  progressLimiter,
  taskProgressController.getProgress,
);

/*-───────────────────────────────── 🔂
|  Business | TaskProgress | task-monitoring-flow-01.png | Get all children's progress on a task
|  @desc View which children completed/started/not started a task
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @figma task-details-with-subTasks.png
└──────────────────────────────────*/
router.get(
  '/:taskId/children',
  auth(TRole.business),
  progressLimiter,
  taskProgressController.getAllChildrenProgress,
);

/*-─────────────────────────────────
|  Business | TaskProgress | task-monitoring-flow-01.png | Get all tasks progress for a child
|  @desc View child's overall task performance across all tasks
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @figma team-member-flow-01.png
└──────────────────────────────────*/
router.get(
  '/child/:childId/tasks',
  auth(TRole.business),
  progressLimiter,
  taskProgressController.getAllTasksProgress,
);

/*-───────────────────────────────── 2️⃣🔂
|  Child | TaskProgress | edit-update-task-flow.png | Update progress status (start/complete)
|  @desc Mark task as started or completed (for COLLABORATIVE tasks only)
|  @desc Auto-completes parent task when ALL assigned children complete
|  @auth Child user (task assignee)
|  @rateLimit 30 requests per minute (prevents spam)
|  @note For personal/singleAssignment tasks, use /tasks/:id/status instead
|  @note When last child completes → parent task auto-marked as completed
└──────────────────────────────────*/
router.put(
  '/:taskId/status',
  auth(TRole.commonUser),
  updateProgressLimiter,
  validateRequest(validation.updateTaskProgressValidationSchema),
  taskProgressController.updateProgressStatus,
);

/*-───────────────────────────────── 2️⃣ V2
|  Child | TaskProgress | edit-update-task-flow.png, response-based-on-mode.png | Update progress status with creative response
|  @desc Mark task as started or completed with creative popup response (same style as /tasks/:id/status/v3)
|  @desc Returns support mode-based messaging for celebratory popups
|  @auth Child user (task assignee)
|  @rateLimit 30 requests per minute (prevents spam)
|  @returns { progress, creativeResponse: { mode, milestone, popup, showPopup }, milestone, isParentTaskCompleted }
|  @note For personal/singleAssignment tasks, use /tasks/:id/status/v3 instead
|  @see Figma: response-based-on-mode.png for message templates
└──────────────────────────────────*/
router.put(
  '/:taskId/status/v2',
  auth(TRole.commonUser),
  updateProgressLimiter,
  validateRequest(validation.updateTaskProgressValidationSchema),
  taskProgressController.updateProgressStatusV2,
);

/*-─────────────────────────────────
|  Child | TaskProgress | edit-update-task-flow.png | Mark subtask as complete
|  @desc Complete a specific subtask and update progress percentage
|  @auth Child user (task assignee)
|  @rateLimit 30 requests per minute (prevents spam)
└──────────────────────────────────*/
router.put(
  '/:taskId/subtasks/:subtaskIndex/complete',
  auth(TRole.commonUser),
  updateProgressLimiter,
  validateRequest(validation.completeSubtaskValidationSchema),
  taskProgressController.completeSubtask,
);

/*-─────────────────────────────────
|  System | TaskProgress | internal | Create or update progress (internal)
|  @desc Auto-create progress when child assigned to collaborative task
|  @auth System internal use (called from task creation)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.post(
  '/:taskId',
  auth(TRole.commonUser),
  progressLimiter,
  validateRequest(validation.createTaskProgressValidationSchema),
  taskProgressController.createOrUpdateProgress,
);

export const TaskProgressRoute = router;
