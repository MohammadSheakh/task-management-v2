import { Request, Response } from 'express';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { StatusCodes } from 'http-status-codes';
import { RevenueCatService } from './revenueCat.service';
import { IUser } from '../../token/token.interface';
import ApiError from '../../../errors/ApiError';
import { UserSubscription } from '../userSubscription/userSubscription.model';

/**
 * RevenueCat Controller
 * 
 * Handles admin operations for RevenueCat subscriptions:
 * - Create manual subscriptions
 * - View RevenueCat subscriptions
 * - Cancel subscriptions
 * - Sync user data
 */
export class RevenueCatController {
  private revenueCatService: RevenueCatService;

  constructor() {
    this.revenueCatService = new RevenueCatService();
  }

  /**
   * Create manual RevenueCat subscription from admin dashboard
   * POST /api/v1/revenuecat/manual-subscription
   */
  createManualSubscription = catchAsync(async (req: Request, res: Response) => {
    const { userId, subscriptionPlanId, platform } = req.body;
    const admin = req.user as IUser;

    if (!userId || !subscriptionPlanId || !platform) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId, subscriptionPlanId, and platform are required'
      );
    }

    if (!['ios', 'android', 'web'].includes(platform)) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Platform must be ios, android, or web'
      );
    }

    const result = await this.revenueCatService.createManualSubscription(
      userId,
      subscriptionPlanId,
      platform as 'ios' | 'android' | 'web',
      admin.userId
    );

    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Manual RevenueCat subscription created successfully',
      success: true,
    });
  });

  /**
   * Get user's RevenueCat subscriptions
   * GET /api/v1/revenuecat/user/:userId
   */
  getUserSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;

    const subscriptions = await this.revenueCatService.getUserRevenueCatSubscriptions(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: subscriptions,
      message: 'User RevenueCat subscriptions retrieved successfully',
      success: true,
    });
  });

  /**
   * Sync RevenueCat user ID to user profile
   * POST /api/v1/revenuecat/sync-user-id
   */
  syncUserId = catchAsync(async (req: Request, res: Response) => {
    const { userId, revenueCatUserId } = req.body;

    if (!userId || !revenueCatUserId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'userId and revenueCatUserId are required'
      );
    }

    const result = await this.revenueCatService.syncRevenueCatUserId(
      userId,
      revenueCatUserId
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'RevenueCat user ID synced successfully',
      success: true,
    });
  });

  /**
   * Cancel RevenueCat subscription (admin action)
   * POST /api/v1/revenuecat/cancel/:subscriptionId
   */
  cancelSubscription = catchAsync(async (req: Request, res: Response) => {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    const result = await this.revenueCatService.cancelRevenueCatSubscription(
      subscriptionId,
      reason
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'RevenueCat subscription cancelled successfully',
      success: true,
    });
  });

  /**
   * Get all RevenueCat subscriptions with pagination
   * GET /api/v1/revenuecat/subscriptions
   */
  getAllSubscriptions = catchAsync(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, status } = req.query;

    const filter: any = {
      paymentGateway: 'revenuecat',
      isDeleted: false,
    };

    if (status) {
      filter.status = status;
    }

    const options = {
      page: Number(page),
      limit: Number(limit),
      sortBy: '-createdAt',
    };

    const result = await UserSubscription.find(filter)
      .populate('userId', 'name email')
      .populate('subscriptionPlanId', 'subscriptionName amount')
      .sort({ createdAt: -1 })
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);

    const count = await UserSubscription.countDocuments(filter);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        docs: result,
        total: count,
        page: options.page,
        pages: Math.ceil(count / options.limit),
      },
      message: 'RevenueCat subscriptions retrieved successfully',
      success: true,
    });
  });
}
