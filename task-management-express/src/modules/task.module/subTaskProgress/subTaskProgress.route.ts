//@ts-ignore
import express from 'express';
import { SubTaskProgressController } from './subTaskProgress.controller';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { rateLimiter } from '../../../middlewares/rateLimiterRedis';

const router = express.Router();

const progressLimiter = rateLimiter('user'); // 30 req/min

const controller = new SubTaskProgressController();

/*-─────────────────────────────────
|  Child | SubTaskProgress | home-flow.png | Get my progress on a task
|  @desc Get my completion status for all subtasks in a collaborative task
|  @auth Child user (task assignee)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/:taskId/my-progress',
  auth(TRole.commonUser),
  progressLimiter,
  controller.getMyProgress,
);

/*-─────────────────────────────────
|  Business | SubTaskProgress | task-monitoring-flow-01.png | Get all children's progress
|  @desc View which children completed which subtasks
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/:taskId/children-progress',
  auth(TRole.business),
  progressLimiter,
  controller.getAllChildrenProgress,
);

/*-─────────────────────────────────
|  Child | SubTaskProgress | task-details-with-subTasks.png | Toggle my subtask completion
|  @desc Mark a subtask as completed or not completed by me
|  @auth Child user (task assignee)
|  @rateLimit 30 requests per minute (prevents spam)
└──────────────────────────────────*/
router.put(
  '/:taskId/subtasks/:subtaskId/toggle-status',
  auth(TRole.commonUser),
  progressLimiter,
  controller.toggleMySubtask,
);

/*-─────────────────────────────────
|  Business | SubTaskProgress | task-monitoring-flow-01.png | Get subtask completion stats
|  @desc View completion statistics for a specific subtask across all children
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/subtasks/:subtaskId/stats',
  auth(TRole.business),
  progressLimiter,
  controller.getSubtaskStats,
);

export const SubTaskProgressRoute = router;
