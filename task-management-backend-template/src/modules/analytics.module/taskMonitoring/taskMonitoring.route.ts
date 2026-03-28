/**
 * Task Monitoring Routes
 * Task monitoring dashboard endpoints for parent/teacher analytics
 *
 * Figma Reference:
 * - teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png
 *
 * @version 1.0.0
 * @date: 17-03-26
 */

//@ts-ignore
import express from 'express';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { rateLimiter } from '../../../middlewares/rateLimiterRedis';
import { TaskMonitoringController } from './taskMonitoring.controller';

const router = express.Router();

// Create controller instance
const controller = new TaskMonitoringController();

// ────────────────────────────────────────────────────────────────────────
// Task Monitoring Dashboard Routes
// Figma: teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png
// ────────────────────────────────────────────────────────────────────────

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 * All rate limits are shared across server instances via Redis
 */
const monitoringLimiter = rateLimiter('user'); // 30 req/min


/*-─────────────────────────────────
|  Role: Business (Parent/Teacher) | Module: Analytics | Task Monitoring: Summary Cards
|  Action: Get task monitoring summary (Not Started, In Progress, My Tasks, Completed)
|  Auth: Required
|  Rate Limit: 30 req/min per userId
|  @param businessUserId - Parent/Teacher business user ID (or use logged-in user)
|
|  @response {
|    notStartedTasks: number,      // Children's pending tasks
|    inProgressTasks: number,      // Children's in-progress tasks
|    myTasks: number,              // Parent's personal tasks
|    completedTasks: number,       // Children's completed tasks
|    totalTasks: number
|  }
└──────────────────────────────────*/
router.get(
  '/summary', // /:businessUserId?
  auth(TRole.business, TRole.admin),
  monitoringLimiter,
  controller.getTaskMonitoringSummary
);


/*-─────────────────────────────────
|  Role: Business (Parent/Teacher) | Module: Analytics | Task Monitoring: Activity Chart
|  Action: Get task activity chart data (monthly/annual bar chart)
|  Auth: Required
|  Rate Limit: 30 req/min per userId
|        for Parent/Teacher  use logged-in user)
|  @query period - 'monthly' (last 12 months) | 'annual' (last 5 years) [default: 'monthly']
|  @query year - Specific year (optional, defaults to current year)
|
|  @response {
|    period: 'monthly' | 'annual',
|    year: number,
|    chartData: {
|      labels: string[],           // Month names or Year strings
|      datasets: [{
|        label: string,            // 'Tasks Created'
|        data: number[],           // Task counts per period
|        color?: string            // '#3B82F6'
|      }]
|    },
|    statistics: {
|      totalTasks: number,
|      averagePerPeriod: number,
|      peakPeriod: string,         // Month name or Year
|      growthPercentage: number    // Percentage vs previous period
|    }
|  }
└──────────────────────────────────*/
router.get(
  '/activity', // /:businessUserId?
  auth(TRole.business, TRole.admin),
  monitoringLimiter,
  controller.getTaskActivityChart
);


export const TaskMonitoringRoutes = router;
