/**
 * Task Monitoring Controller
 * Handles HTTP requests for task monitoring dashboard
 *
 * Figma Reference:
 * - teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png
 *
 * @version 1.0.0
 * @date: 17-03-26
 */

//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import { Request, Response } from 'express';
//@ts-ignore
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { TaskMonitoringService } from './taskMonitoring.service';
import { IUser } from '../../token/token.interface';

const taskMonitoringService = new TaskMonitoringService();

export class TaskMonitoringController {
  /**
   * Get task monitoring summary for parent dashboard
   * Returns counts for: Not Started, In Progress, My Tasks, Completed
   *
   * @route GET /v1/analytics/task-monitoring/summary/:businessUserId
   *
   * @description
   * This endpoint provides the data for the top 4 statistics cards:
   * 1. Not Started Tasks - Children's pending tasks
   * 2. In Progress - Children's in-progress tasks
   * 3. My Tasks - Parent's personal tasks
   * 4. Completed Tasks - Children's completed tasks
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getTaskMonitoringSummary = catchAsync(async (req: Request, res: Response) => {
    // const { businessUserId } = req.params;

    // Use logged-in user's ID if businessUserId not provided
    const userId = (req.user as IUser)?.userId; //  businessUserId || 

    if (!userId) {
      throw new Error('Business user ID is required');
    }

    const result = await taskMonitoringService.getTaskMonitoringSummary(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Task monitoring summary retrieved successfully',
      data: result,
      success: true,
    });
  });

  /**
   * Get task activity chart data for parent dashboard
   * Returns monthly or annual task creation data
   *
   * @route GET /v1/analytics/task-monitoring/activity/:businessUserId
   *
   * @description
   * This endpoint provides data for the Task Activity bar chart:
   * - Monthly view: Shows tasks per month for the current year
   * - Annual view: Shows tasks per year for the last 5 years
   * - Includes growth percentage calculation
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getTaskActivityChart = catchAsync(async (req: Request, res: Response) => {
    const { businessUserId } = req.params;
    const { period = 'monthly', year } = req.query;

    // Use logged-in user's ID if businessUserId not provided
    const userId = businessUserId || (req.user as IUser)?.userId;

    if (!userId) {
      throw new Error('Business user ID is required');
    }

    const result = await taskMonitoringService.getTaskActivityChart(
      userId,
      period as 'monthly' | 'annual',
      year ? parseInt(year as string) : undefined
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Task activity chart data retrieved successfully',
      data: result,
      success: true,
    });
  });
}
