//@ts-ignore
import express from 'express';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { TaskAnalyticsController } from './taskAnalytics.controller';

const router = express.Router();
const controller = new TaskAnalyticsController();

/*-─────────────────────────────────
|  Admin | Task Analytics | dashboard-section-flow.png | Get platform-wide task overview
|  @desc Returns: total tasks, completion rates, platform-wide metrics
└──────────────────────────────────*/
router.get('/task/overview',
  auth(TRole.admin),
  controller.getOverview
);

/*-─────────────────────────────────
|  Admin | Task Analytics | dashboard-section-flow.png | Get task status distribution
|  @desc Returns: tasks grouped by status across platform
└──────────────────────────────────*/
router.get('/task/status-distribution',
  auth(TRole.admin),
  controller.getStatusDistribution
);

/*-─────────────────────────────────
|  Business | Task Analytics | dashboard-flow-01.png | Get group task analytics
|  @desc Returns: task metrics for specific group (owner/admin view)
└──────────────────────────────────*/
router.get('/task/group/:groupId',
  auth(TRole.business),
  controller.getGroupTaskAnalytics
);

/*-─────────────────────────────────
|  Admin | Task Analytics | dashboard-section-flow.png | Get daily task summary
|  @desc Returns: daily task creation/completion summary
└──────────────────────────────────*/
router.get('/task/daily-summary',
  auth(TRole.admin),
  controller.getDailySummary
);

/*-─────────────────────────────────
|  Business | Task Analytics | task-details-with-subTasks.png | Get collaborative task progress
|  @desc Returns: which children/team members completed/started/not started tasks
└──────────────────────────────────*/
router.get('/task/:taskId/collaborative-progress',
  auth(TRole.business),
  controller.getCollaborativeTaskProgress
);

/*-─────────────────────────────────
|  Business | Task Analytics | team-member-flow-01.png | Get child's performance analytics
|  @desc Returns: child's task performance metrics and analytics
└──────────────────────────────────*/
router.get('/child/:childId/performance',
  auth(TRole.business),
  controller.getChildPerformance
);

/*-─────────────────────────────────
|  Business | Task Analytics | dashboard-flow-01.png | Get parent dashboard overview
|  @desc Returns: all children's/team members' performance overview
└──────────────────────────────────*/
router.get('/parent/my-children/overview',
  auth(TRole.business),
  controller.getParentDashboardOverview
);

export const TaskAnalyticsRoutes = router;
