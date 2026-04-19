import ApiError from '../../../errors/ApiError';
import catchAsync from '../../../shared/catchAsync';
import omit from '../../../shared/omit';
import pick from '../../../shared/pick';
import sendResponse from '../../../shared/sendResponse';
import { GenericController } from '../../_generic-module/generic.controller';
import { TaskService } from '../../task.module/task/task.service';
import { IUser } from '../../token/token.interface';
import { SubscriptionPlan } from '../subscriptionPlan/subscriptionPlan.model';
import { IUserSubscription } from './userSubscription.interface';
import { UserSubscription } from './userSubscription.model';
import { UserSubscriptionService } from './userSubscription.service';
//@ts-ignore
import { Request, Response } from 'express';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';

export class UserSubscriptionController extends GenericController<
  typeof UserSubscription,
  IUserSubscription
> {

  userSubscriptionService: UserSubscriptionService;
  constructor() {
    super(new UserSubscriptionService(), 'Subscription');
    this.userSubscriptionService = new UserSubscriptionService();
  }

  startFreeTrial = catchAsync(async (req: Request, res: Response) => {
    const stripeCheckoutUrl =
      await new UserSubscriptionService().startFreeTrial(
        (req.user as IUser)?.userId,
        req.body.subscriptionPlanId,
      );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: stripeCheckoutUrl,
      message: `Stripe Checkout Url for Start Free Trial`,
      success: true,
    });
  });

  getAllWithPaginationV2 = catchAsync(async (req: Request, res: Response) => {
    //const filters = pick(req.query, ['_id', 'title']); // now this comes from middleware in router
    const filters = omit(req.query, ['sortBy', 'limit', 'page', 'populate']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

    // ✅ Default values
    let populateOptions: string | { path: string; select: string }[] = [];
    let select = '-isDeleted -createdAt -updatedAt -__v';

    // ✅ If middleware provided overrides → use them
    if (req.queryOptions) {
      if (req.queryOptions.populate) {
        populateOptions = req.queryOptions.populate;
      }
      if (req.queryOptions.select) {
        select = req.queryOptions.select;
      }
    }

    const result = await this.service.getAllWithPagination(
      filters,
      options,
      populateOptions,
      select,
    );

    const subscription = await SubscriptionPlan.find({
      isActive: true,
      isDeleted: false,
    });

    sendResponse(res, {
      code: StatusCodes.OK,
      data: { result, subscription },
      message: `All ${this.modelName} with pagination`,
      success: true,
    });
  });

  /**
   * Get my subscription history (V3)
   * Figma: subscription-flow-v1.png (Subscription History Table)
   * @route GET /user-subscriptions/my-history
   */
  getMySubscriptionHistory = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const history = await this.userSubscriptionService.getMySubscriptionHistory(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: history,
      message: 'Subscription history retrieved successfully',
      success: true,
    });
  });

  /**
   * Get my active subscription (V3)
   * Figma: subscription-flow-v1.png (Active Subscription Card)
   * @route GET /user-subscriptions/my-active
   */
  getMyActiveSubscription = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const activeSubscription = await this.userSubscriptionService.getMyActiveSubscription(userId);

    if (!activeSubscription) {
      sendResponse(res, {
        code: StatusCodes.OK,
        data: null,
        message: 'No active subscription found',
        success: true,
      });
      return;
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: activeSubscription,
      message: 'Active subscription retrieved successfully',
      success: true,
    });
  });

  /**
   * Cancel my subscription (V3)
   * Figma: subscription-flow-v1.png (Cancel Subscription Button)
   * @route POST /user-subscriptions/cancel
   */
  cancelMySubscription = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const { subscriptionId } = req.body;

    const result = await this.userSubscriptionService.cancelMySubscription(userId, subscriptionId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: result.message,
      success: true,
    });
  });

  /**
   * Admin | Get user subscription details (V3)
   * Figma: subscription-details-of-a-person.png
   * @route GET /user-subscriptions/admin/user/:userId/details
   */
  getUserSubscriptionDetailsForAdmin = catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (!userId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User ID is required');
    }

    const result = await this.userSubscriptionService.getUserSubscriptionDetailsForAdmin(userId);

    if (!result) {
      sendResponse(res, {
        code: StatusCodes.OK,
        data: null,
        message: 'No subscription found for this user',
        success: true,
      });
      return;
    }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User subscription details retrieved successfully',
      success: true,
    });
  });

  /**
   * Admin | Get all subscribed users (V3)
   * Figma: earning-flow.png (Subscribed users list)
   * @route GET /user-subscriptions/admin/subscribed-users
   */
  getSubscribedUsersV3 = catchAsync(async (req: Request, res: Response) => {
    const filters = omit(req.query, ['sortBy', 'limit', 'page', 'populate']);
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

    const result = await this.userSubscriptionService.getSubscribedUsersV3(filters, options);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Subscribed users retrieved successfully',
      success: true,
    });
  });

  // add more methods here if needed or override the existing ones
}
