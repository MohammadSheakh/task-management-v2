import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ChildrenBusinessUserService } from './childrenBusinessUser.service';
import { IChildrenBusinessUserQueryOptions } from './childrenBusinessUser.interface';
import { CHILDREN_BUSINESS_USER_STATUS } from './childrenBusinessUser.constant';
import catchAsync from '../../shared/catchAsync';
import ApiError from '../../errors/ApiError';
import pick from '../../shared/pick';
import { IUser } from '../token/token.interface';

import sendResponse from '../../shared/sendResponse';

/**
 * Children Business User Controller
 * Handles HTTP requests for children business user operations
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class ChildrenBusinessUserController {
  private service: ChildrenBusinessUserService;

  constructor() {
    this.service = new ChildrenBusinessUserService();
  }

  /** ✔️
   * Create child account
   * POST /children-business-users/children
   *
   * @description Business user creates a child account and adds to family
   * @auth Business user with active business subscription
   */
  createChild = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID from request
    └──────────────────────────────────*/
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Extract child data from request body
    └──────────────────────────────────*/
    const childData = pick(req.body, ['name', 'email', 'password', 'phoneNumber']);

    /*-─────────────────────────────────
    |  Step 3: Call service to create child account
    └──────────────────────────────────*/
    const result = await this.service.createChildAccount(businessUserId, childData);

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: 'Child account created successfully and added to family',
      success: true,
    });
  });

  /** ✔️
   * Get all children of business user
   * GET /children-business-users/my-children
   *
   * @description Get all children accounts for the authenticated business user
   * @auth Business user
   */
  getMyChildren = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID from request
    └──────────────────────────────────*/
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Extract query parameters
    └──────────────────────────────────*/
    const options: IChildrenBusinessUserQueryOptions = {
      status: req.query.status as any,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy || '-addedAt',
    };

    /*-─────────────────────────────────
    |  Step 3: Get children from service
    └──────────────────────────────────*/
    const children = await this.service.getChildrenOfBusinessUser(
      businessUserId,
      options
    );


    //  Step 4: Get children count
    const count = await this.service.getChildrenCount(businessUserId);


    //  Step 5: Send success response
    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        children,
        count,
      },
      message: 'Children retrieved successfully',
      success: true,
    });
  });

  /** ✔️
   * Get parent business user (for children)
   * GET /children-business-users/my-parent
   *
   * @description Get the parent business user for the authenticated child
   * @auth Child user
   */
  getParentBusinessUser = catchAsync(async (req: Request, res: Response) => {
    // Step 1: Get child user ID from request
    const childUserId = req.user?.userId;

    if (!childUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    // Step 2: Get parent business user
    const parentInfo = await this.service.getParentBusinessUser(childUserId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: parentInfo,
      message: 'Parent business user retrieved successfully',
      success: true,
    });
  });

  /** ✔️
   * Remove child from family
   * DELETE /children-business-users/children/:childId
   *
   * @description Remove a child account from the family (soft delete)
   * @auth Business user
   */
  removeChild = catchAsync(async (req: Request, res: Response) => {

    //  Step 1: Get business user ID and child ID
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const childUserId = req.params.childId;

    //  Step 2: Extract optional note
    const note = req.body.note;

    /*-─────────────────────────────────
    |  Step 3: Remove child from family
    └──────────────────────────────────*/
    await this.service.removeChildFromFamily(businessUserId, childUserId, note);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: null,
      message: 'Child removed from family successfully',
      success: true,
    });
  });

  /** ✔️
   * Reactivate child account
   * POST /children-business-users/children/:childId/reactivate
   *
   * @description Reactivate a previously removed child account
   * @auth Business user
   */
  reactivateChild = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and child ID
    └──────────────────────────────────*/
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    const childUserId = req.params.childId;

    /*-─────────────────────────────────
    |  Step 2: Reactivate child
    └──────────────────────────────────*/
    await this.service.reactivateChild(businessUserId, childUserId);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: null,
      message: 'Child account reactivated successfully',
      success: true,
    });
  });

  /**
   * Get children statistics
   * GET /children-business-users/statistics
   *
   * @description Get statistics about children accounts
   * @auth Business user
   */
  getStatistics = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID
    └──────────────────────────────────*/
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get counts for each status
    └──────────────────────────────────*/
    const [activeCount, inactiveCount, removedCount] = await Promise.all([
      this.service.getChildrenCount(businessUserId),
      this.service.model.countDocuments({
        parentBusinessUserId: businessUserId,
        status: CHILDREN_BUSINESS_USER_STATUS.INACTIVE,
        isDeleted: false,
      }),
      this.service.model.countDocuments({
        parentBusinessUserId: businessUserId,
        status: CHILDREN_BUSINESS_USER_STATUS.REMOVED,
        isDeleted: true,
      }),
    ]);

    /*-─────────────────────────────────
    |  Step 3: Get subscription limit
    └──────────────────────────────────*/
    const { UserSubscription } = await import('../../modules/subscription.module/userSubscription/userSubscription.model');

    const subscription = await UserSubscription.findOne({
      userId: businessUserId,
      status: 'active',
    }).populate('subscriptionPlanId', 'maxChildrenAccount subscriptionName');

    const maxChildren = subscription?.subscriptionPlanId ?
      (subscription.subscriptionPlanId as any).maxChildrenAccount : 0;

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: {
        active: activeCount,
        inactive: inactiveCount,
        removed: removedCount,
        total: activeCount + inactiveCount + removedCount,
        maxAllowed: maxChildren,
        remaining: maxChildren - activeCount,
      },
      message: 'Statistics retrieved successfully',
      success: true,
    });
  });


  // ────────────────────────────────────────────────────────────────────────
  // Secondary User Management
  // Figma: dashboard-flow-03.png (Permissions section)
  // Only ONE child per business user can be Secondary User
  // ────────────────────────────────────────────────────────────────────────


  /** ✔️
   * Set/Unset child as Secondary User
   * PUT /children-business-users/children/:childId/secondary-user
   *
   * @description Designate a child as Secondary User (Task Manager)
   *              Only ONE child per business user can be Secondary User
   * @auth Business user (Parent/Teacher) only
   * @figmaIndex dashboard-flow-03.png
   */
  setSecondaryUser = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and child ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;
    const { childId } = req.params;
    const { isSecondaryUser } = req.body;

    /*-─────────────────────────────────
    |  Step 2: Set/Unset as Secondary User
    └──────────────────────────────────*/
    const result = await this.service.setSecondaryUser(
      businessUserId as string,
      childId,
      isSecondaryUser
    );

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: isSecondaryUser
        ? 'Child set as Secondary User successfully'
        : 'Child removed as Secondary User successfully',
      success: true,
    });
  });

  /** ✔️
   * Get Secondary User for current business user
   * GET /children-business-users/secondary-user
   *
   * @description Get the current Secondary User (Task Manager)
   * @auth Business user (Parent/Teacher) only
   * @figmaIndex dashboard-flow-03.png
   */
  getSecondaryUser = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;

    /*-─────────────────────────────────
    |  Step 2: Get Secondary User
    └──────────────────────────────────*/
    const result = await this.service.getSecondaryUser(businessUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result || { childUserId: null, isSecondaryUser: false },
      message: 'Secondary user retrieved successfully',
      success: true,
    });
  });

  /**
   * Get children with active task counts for Team Member sidebar
   * GET /children-business-users/team-members
   *
   * @description Get all children with their active task counts for Task Monitoring sidebar
   * @auth Business user (Parent/Teacher)
   * @figmaIndex task-monitoring-flow-01.png (Team Member section)
   */
  getChildrenWithActiveTaskCounts = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID from request
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get children with task counts from service
    └──────────────────────────────────*/
    const result = await this.service.getChildrenWithActiveTaskCounts(businessUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Team members with active task counts retrieved successfully',
      success: true,
    });
  });

  /**
   * Get team members statistics for Team Members dashboard
   * GET /children-business-users/team-members/statistics
   *
   * @description Get statistics for Team Members dashboard (Team Size, Total Tasks, Active Tasks, Completed Tasks)
   * @auth Business user (Parent/Teacher)
   * @figmaIndex team-member-flow-01.png (Top statistics cards)
   */
  getTeamMembersStatistics = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID from request
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get statistics from service
    └──────────────────────────────────*/
    const result = await this.service.getTeamMembersStatistics(businessUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Team members statistics retrieved successfully',
      success: true,
    });
  });

  /**
   * Get team members list with task progress for Team Members dashboard
   * GET /children-business-users/team-members/list
   *
   * @description Get paginated list of children with task progress percentage
   * @auth Business user (Parent/Teacher)
   * @figmaIndex team-member-flow-01.png (Team Members table)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10)
   * @query sortBy - Sort field (default: -addedAt)
   */
  getTeamMembersList = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID from request
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Extract query parameters
    └──────────────────────────────────*/
    const options = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sortBy: req.query.sortBy as string || '-addedAt',
    };

    /*-─────────────────────────────────
    |  Step 3: Get team members list from service
    └──────────────────────────────────*/
    const result = await this.service.getTeamMembersListWithTaskProgress(
      businessUserId as string,
      options
    );

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Team members list with task progress retrieved successfully',
      success: true,
    });
  });

  /**
   * Get child's own permission status
   * GET /children-business-users/my-permission
   *
   * @description Get the authenticated child user's permission status
   * @auth Child user
   * @returns Permission info including isSecondaryUser status and capabilities
   */
  getMyPermission = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get child user ID from request
    └──────────────────────────────────*/
    const childUserId = (req.user as IUser).userId;

    if (!childUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get permission status from service
    └──────────────────────────────────*/
    const result = await this.service.getChildPermissionStatus(childUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Permission status retrieved successfully',
      success: true,
    });
  });

  /**
   * Get child's family members (siblings)
   * GET /children-business-users/my-family-members
   *
   * @description Get other children under the same parent business user
   * @auth Child user
   * @returns List of family members (other children with same parent)
   */
  getMyFamilyMembers = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get child user ID from request
    └──────────────────────────────────*/
    const childUserId = (req.user as IUser).userId;

    if (!childUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get family members from service
    └──────────────────────────────────*/
    const result = await this.service.getChildFamilyMembers(childUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Family members retrieved successfully',
      success: true,
    });
  });
}

export const childrenBusinessUserController = new ChildrenBusinessUserController();
