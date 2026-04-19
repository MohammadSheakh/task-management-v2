/**
 * Chart Aggregation Controller
 * Handles chart-specific data endpoints for dashboards
 *
 * Figma Reference:
 * - main-admin-dashboard/dashboard-section-flow.png
 * - teacher-parent-dashboard/dashboard/dashboard-flow-01.png
 *
 * @version 1.0.0
 * @date: 12-03-26
 */

//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import { Request, Response } from 'express';
import { chartAggregationService } from './chartAggregation.service';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

/**
 * Chart Aggregation Controller Class
 */
class ChartAggregationControllerClass {
  /**
   * Get User Growth Chart Data
   * GET /analytics/charts/user-growth
   */
  getUserGrowthChart = catchAsync(async (req: Request, res: Response) => {
    const { days = 30 } = req.query;

    const chartData = await chartAggregationService.getUserGrowthChart(Number(days));

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'User growth chart data retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get Task Status Distribution
   * GET /analytics/charts/task-status
   */
  getTaskStatusDistribution = catchAsync(async (req: Request, res: Response) => {
    const chartData = await chartAggregationService.getTaskStatusDistribution();

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Task status distribution retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get Monthly Income Chart
   * GET /analytics/charts/monthly-income
   */
  getMonthlyIncomeChart = catchAsync(async (req: Request, res: Response) => {
    const { months = 12 } = req.query;

    const chartData = await chartAggregationService.getMonthlyIncomeChart(Number(months));

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Monthly income chart data retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get User Ratio Chart (Individual vs Business)
   * GET /analytics/charts/user-ratio
   */
  getUserRatioChart = catchAsync(async (req: Request, res: Response) => {
    const chartData = await chartAggregationService.getUserRatioChart();

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'User ratio chart data retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get Family Task Activity Chart
   * GET /analytics/charts/family-activity/:businessUserId
   */
  getFamilyTaskActivityChart = catchAsync(async (req: Request, res: Response) => {
    const { businessUserId } = req.params;
    const { days = 7 } = req.query;

    const chartData = await chartAggregationService.getFamilyTaskActivityChart(
      businessUserId,
      Number(days)
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Family task activity chart data retrieved successfully',
      data: chartData,
    });
  });

  /** ✔️✔️
   * Get Child Progress Comparison
   * GET /analytics/charts/child-progress/:businessUserId
   * 
   * Updated: 16-03-26 - Now returns full task statistics for Team Overview cards
   * Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
   */
  getChildProgressComparison = catchAsync(async (req: Request, res: Response) => {
    const { businessUserId } = req.params;

    const result = await chartAggregationService.getChildProgressComparison(businessUserId);

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Child progress comparison with full statistics retrieved successfully',
      data: result,
    });
  });

  /*-─────────────────────────────────
  |  logged in as parent / teacher ✔️✔️
  └──────────────────────────────────*/
  getChildProgressComparisonAsParent = catchAsync(async (req: Request, res: Response) => {
    
    const result = await chartAggregationService.getChildProgressComparison(req.user.userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Child progress comparison with full statistics retrieved successfully',
      data: result,
    });
  });

  /**
   * Get Task Status by Child (Stacked Bar)
   * GET /analytics/charts/status-by-child/:businessUserId
   */
  getTaskStatusByChild = catchAsync(async (req: Request, res: Response) => {
    const { businessUserId } = req.params;

    const chartData = await chartAggregationService.getTaskStatusByChild(businessUserId);

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Task status by child retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get Task Completion Trend
   * GET /analytics/charts/completion-trend/:userId
   */
  getTaskCompletionTrend = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const chartData = await chartAggregationService.getTaskCompletionTrend(
      userId,
      Number(days)
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Task completion trend retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get Activity Heatmap
   * GET /analytics/charts/activity-heatmap/:userId
   */
  getActivityHeatmap = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const chartData = await chartAggregationService.getActivityHeatmap(
      userId,
      Number(days)
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Activity heatmap retrieved successfully',
      data: chartData,
    });
  });

  /**
   * Get Collaborative Task Progress
   * GET /analytics/charts/collaborative-progress/:taskId
   */
  getCollaborativeTaskProgress = catchAsync(async (req: Request, res: Response) => {
    const { taskId } = req.params;

    const progressData = await chartAggregationService.getCollaborativeTaskProgress(taskId);

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Collaborative task progress retrieved successfully',
      data: progressData,
    });
  });
}

export const ChartAggregationController = new ChartAggregationControllerClass();
