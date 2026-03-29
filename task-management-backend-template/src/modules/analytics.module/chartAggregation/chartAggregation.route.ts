/**
 * Chart Aggregation Routes
 * Chart-specific endpoints for dashboard visualizations
 * 
 * Figma Reference:
 * - main-admin-dashboard/dashboard-section-flow.png
 * - teacher-parent-dashboard/dashboard/dashboard-flow-01.png
 * - teacher-parent-dashboard/task-monitoring/
 * 
 * @version 1.0.0
 * @date: 12-03-26
 */

//@ts-ignore
import express from 'express';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { rateLimiter } from '../../../middlewares/rateLimiterRedis';
import { ChartAggregationController } from './chartAggregation.controller';

const router = express.Router();

// ────────────────────────────────────────────────────────────────────────
// Admin Dashboard Charts
// Figma: main-admin-dashboard/dashboard-section-flow.png
// ────────────────────────────────────────────────────────────────────────

/*-─────────────────────────────────
|  Role: Admin | Module: Analytics | Dashboard: User Growth Chart
|  Action: Get user growth data for line chart (last 30 days)
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/user-growth',
  auth(TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getUserGrowthChart
);

/*-─────────────────────────────────
|  Role: Admin | Module: Analytics | Dashboard: Task Status Distribution
|  Action: Get task status breakdown for pie/donut chart
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/task-status',
  auth(TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getTaskStatusDistribution
);

/*-─────────────────────────────────
|  Role: Admin | Module: Analytics | Dashboard: Monthly Income Chart
|  Action: Get monthly revenue data for bar chart (last 12 months)
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/monthly-income',
  auth(TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getMonthlyIncomeChart
);

/*-─────────────────────────────────
|  Role: Admin | Module: Analytics | Dashboard: User Ratio Chart
|  Action: Get individual vs business user ratio for pie chart
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/user-ratio',
  auth(TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getUserRatioChart
);

// ────────────────────────────────────────────────────────────────────────
// Parent Dashboard Charts
// Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
// ────────────────────────────────────────────────────────────────────────

//-- same as getChildProgressComparison ✔️✔️
router.get(
  '/child-progress/as-parent',
  auth(TRole.business),
  rateLimiter('user'),
  ChartAggregationController.getChildProgressComparisonAsParent
);


/*-─────────────────────────────────
|  Role: Parent/Business | Module: Analytics | Dashboard: Family Activity
|  Action: Get family task completion data for bar chart (last 7 days)
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/family-activity/:businessUserId',
  auth(TRole.business, TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getFamilyTaskActivityChart
);

/*-─────────────────────────────────
|  Role: Parent/Business | Module: Analytics | Dashboard: Child Progress Comparison
|  Action: Compare all children's completion rates for radar/bar chart
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/child-progress/:businessUserId',
  auth(TRole.business, TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getChildProgressComparison
);




/*-─────────────────────────────────
|  Role: Parent/Business | Module: Analytics | Dashboard: Status by Child
|  Action: Get task status distribution by child for stacked bar chart
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/status-by-child/:businessUserId',
  auth(TRole.business, TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getTaskStatusByChild
);

// ────────────────────────────────────────────────────────────────────────
// Task Monitoring Charts
// Figma: teacher-parent-dashboard/task-monitoring/
// ────────────────────────────────────────────────────────────────────────

/*-─────────────────────────────────
|  Role: Parent/Business | Module: Analytics | Task Monitoring: Completion Trend
|  Action: Get task completion trend for line chart (last 30 days)
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/completion-trend/:userId',
  auth(TRole.business, TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getTaskCompletionTrend
);

/*-─────────────────────────────────
|  Role: Parent/Business | Module: Analytics | Task Monitoring: Activity Heatmap
|  Action: Get task activity heatmap by day/hour
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/activity-heatmap/:userId',
  auth(TRole.business, TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getActivityHeatmap
);

/*-─────────────────────────────────
|  Role: Parent/Business | Module: Analytics | Task Monitoring: Collaborative Progress
|  Action: Get each child's progress on collaborative task
|  Auth: Required
|  Rate Limit: 30 req/min
└──────────────────────────────────*/
router.get(
  '/collaborative-progress/:taskId',
  auth(TRole.business, TRole.admin),
  rateLimiter('user'),
  ChartAggregationController.getCollaborativeTaskProgress
);

export const ChartAggregationRoutes = router;
