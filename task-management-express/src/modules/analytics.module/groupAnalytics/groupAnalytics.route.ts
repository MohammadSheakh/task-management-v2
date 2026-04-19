//@ts-ignore
import express from 'express';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { GroupAnalyticsController } from './groupAnalytics.controller';

const router = express.Router();
const controller = new GroupAnalyticsController();

/*-─────────────────────────────────
|  Business | Group Analytics | dashboard-flow-01.png | Get group overview
|  @desc Returns: group summary, task completion rates, member activity overview
└──────────────────────────────────*/
router.get('/group/:groupId/overview',
  auth(TRole.business),
  controller.getGroupOverview
);

/*-─────────────────────────────────
|  Business | Group Analytics | team-member-flow-01.png | Get member statistics
|  @desc Returns: individual member stats, task counts, completion rates
└──────────────────────────────────*/
router.get('/group/:groupId/members',
  auth(TRole.business),
  controller.getMemberStats
);

/*-─────────────────────────────────
|  Business | Group Analytics | dashboard-flow-01.png | Get group leaderboard
|  @desc Returns: ranked list of members by productivity/completion
└──────────────────────────────────*/
router.get('/group/:groupId/leaderboard',
  auth(TRole.business),
  controller.getLeaderboard
);

/*-─────────────────────────────────
|  Business | Group Analytics | dashboard-flow-01.png | Get performance metrics
|  @desc Returns: group-level performance KPIs and trends
└──────────────────────────────────*/
router.get('/group/:groupId/performance',
  auth(TRole.business),
  controller.getPerformanceMetrics
);

/*-─────────────────────────────────
|  Business | Group Analytics | dashboard-flow-01.png | Get activity feed
|  @desc Returns: real-time feed of member task completions and activities
└──────────────────────────────────*/
router.get('/group/:groupId/activity',
  auth(TRole.business),
  controller.getActivityFeed
);

export const GroupAnalyticsRoutes = router;
