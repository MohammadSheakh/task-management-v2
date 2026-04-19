//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { UserAnalyticsService } from './userAnalytics.service';
import { GenericController } from '../../_generic-module/generic.controller';
//@ts-ignore
import { Request, Response } from 'express';
import { IUser } from '../../token/token.interface';
import { Types } from 'mongoose';

const userAnalyticsService = new UserAnalyticsService();

/**
 * User Analytics Controller
 * Handles HTTP requests for user analytics
 * 
 * @version 1.0.0
 */
export class UserAnalyticsController {
  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 03-01 (Home)
   * @desc Get complete user analytics overview
   *----------------------------------------------*/
  getUserOverview = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await userAnalyticsService.getUserOverview(new Types.ObjectId(userId.toString()));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User analytics overview retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 03-01 (Home - Daily Progress)
   * @desc Get today's task progress
   *----------------------------------------------*/
  getDailyProgress = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await userAnalyticsService.getDailyProgress(new Types.ObjectId(userId.toString()));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Daily progress retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 06-03 (Profile - Streak)
   * @desc Get user's streak data
   *----------------------------------------------*/
  getStreak = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await userAnalyticsService.getStreak(new Types.ObjectId(userId.toString()));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Streak data retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 06-03 (Profile - Productivity)
   * @desc Get user's productivity score
   *----------------------------------------------*/
  getProductivityScore = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await userAnalyticsService.getProductivityScore(new Types.ObjectId(userId.toString()));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Productivity score retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 06-03 (Profile - Completion Rate)
   * @desc Get user's completion rate analytics
   *----------------------------------------------*/
  getCompletionRate = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;
    const { range = 'thisWeek' } = req.query;

    const result = await userAnalyticsService.getCompletionRate(
      new Types.ObjectId(userId.toString()),
      range as any
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Completion rate analytics retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 03-01 (Status Section)
   * @desc Get user's task statistics
   *----------------------------------------------*/
  getTaskStatistics = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await userAnalyticsService.getTaskStatistics(new Types.ObjectId(userId.toString()));

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Task statistics retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Analytics
   * @module UserAnalytics
   * @figmaIndex 03-01 (History)
   * @desc Get user's trend analytics
   *----------------------------------------------*/
  getTrendAnalytics = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;
    const { range = 'thisWeek' } = req.query;

    const result = await userAnalyticsService.getTrendAnalytics(
      new Types.ObjectId(userId.toString()),
      range as any
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Trend analytics retrieved successfully',
      success: true,
    });
  });
}

export const userAnalyticsController = new UserAnalyticsController();
