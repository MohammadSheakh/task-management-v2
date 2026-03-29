//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { GroupAnalyticsService } from './groupAnalytics.service';
//@ts-ignore
import { Request, Response } from 'express';
import { Types } from 'mongoose';

const groupAnalyticsService = new GroupAnalyticsService();

export class GroupAnalyticsController {
  getGroupOverview = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const result = await groupAnalyticsService.getGroupOverview(new Types.ObjectId(groupId));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Group overview retrieved successfully',
      success: true,
    });
  });

  getMemberStats = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const result = await groupAnalyticsService.getMemberStats(new Types.ObjectId(groupId));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Member statistics retrieved successfully',
      success: true,
    });
  });

  getLeaderboard = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { limit = 10 } = req.query;
    const result = await groupAnalyticsService.getLeaderboard(
      new Types.ObjectId(groupId),
      parseInt(limit as string)
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Leaderboard retrieved successfully',
      success: true,
    });
  });

  getPerformanceMetrics = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { period = 'week' } = req.query;
    const result = await groupAnalyticsService.getPerformanceMetrics(
      new Types.ObjectId(groupId),
      period as any
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Performance metrics retrieved successfully',
      success: true,
    });
  });

  getActivityFeed = catchAsync(async (req: Request, res: Response) => {
    const { groupId } = req.params;
    const { limit = 50 } = req.query;
    const result = await groupAnalyticsService.getActivityFeed(
      new Types.ObjectId(groupId),
      parseInt(limit as string)
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Activity feed retrieved successfully',
      success: true,
    });
  });
}

export const groupAnalyticsController = new GroupAnalyticsController();
