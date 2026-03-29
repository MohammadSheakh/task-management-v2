//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { AdminAnalyticsService } from './adminAnalytics.service';
//@ts-ignore
import { Request, Response } from 'express';
import { TRole } from '../../../middlewares/roles';
import auth from '../../../middlewares/auth';

const adminAnalyticsService = new AdminAnalyticsService();

export class AdminAnalyticsController {
  getDashboardOverview = catchAsync(async (req: Request, res: Response) => {
    const result = await adminAnalyticsService.getDashboardOverview();

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Admin dashboard overview retrieved successfully',
      success: true,
    });
  });

  getUserGrowth = catchAsync(async (req: Request, res: Response) => {
    const result = await adminAnalyticsService.getUserGrowth();

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User growth analytics retrieved successfully',
      success: true,
    });
  });

  getRevenueAnalytics = catchAsync(async (req: Request, res: Response) => {
    const result = await adminAnalyticsService.getRevenueAnalytics();

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Revenue analytics retrieved successfully',
      success: true,
    });
  });

  getTaskMetrics = catchAsync(async (req: Request, res: Response) => {
    const result = await adminAnalyticsService.getTaskMetrics();

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Platform task metrics retrieved successfully',
      success: true,
    });
  });

  getEngagementMetrics = catchAsync(async (req: Request, res: Response) => {
    const result = await adminAnalyticsService.getEngagementMetrics();

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User engagement metrics retrieved successfully',
      success: true,
    });
  });

  getUserRatioChartData = catchAsync(async (req: Request, res: Response) => {
    const { type = 'monthly' } = req.query;
    const result = await adminAnalyticsService.getUserRatioChartData(
      type as 'daily' | 'weekly' | 'monthly' | 'yearly'
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User ratio chart data retrieved successfully',
      success: true,
    });
  });

  /**
   * Get user registration chart data
   * Query: type='monthly' | 'yearly', year=optional
   */
  getUserRegistrationChart = catchAsync(async (req: Request, res: Response) => {
    const { type = 'monthly', year } = req.query;
    
    const result = await adminAnalyticsService.getUserRegistrationChartData(
      type as 'monthly' | 'yearly',
      year ? parseInt(year as string) : undefined
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User registration chart data retrieved successfully',
      success: true,
    });
  });

  /**
   * Get income/revenue chart data
   * Query: type='monthly' | 'yearly'
   */
  getIncomeChart = catchAsync(async (req: Request, res: Response) => {
    const { type = 'monthly' } = req.query;
    
    const result = await adminAnalyticsService.getIncomeChartData(
      type as 'monthly' | 'yearly'
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Income chart data retrieved successfully',
      success: true,
    });
  });
}

export const adminAnalyticsController = new AdminAnalyticsController();
