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
   * @figmaIndex create-child-flow.png
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
    |  Step 2: Extract ALL child data from request body
    |  Figma: create-child-flow.png (all fields)
    └──────────────────────────────────*/
    const childData = pick(req.body, [
      'name',
      'email',
      'password',
      'phoneNumber',
      'location',        // Address field from Figma
      'gender',          // Gender dropdown (Male/Female)
      'dateOfBirth',     // Date of Birth field
      'supportMode',     // Support Mode (Calm/Encouraging/Logical)
    ]);

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
      message: result.message || 'Child account created successfully and added to family',
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
   * Update child profile
   * PATCH /children-business-users/children/:childId
   *
   * @description Update child account details (name, email, phone, gender, supportMode, location, dob, password)
   * @auth Business user (Parent/Teacher)
   * @figmaIndex edit-child-flow.png
   */
  updateChild = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and child ID
    └──────────────────────────────────*/
    const businessUserId = req.user?.userId;
    const { childId } = req.params;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Extract update data from request body
    └──────────────────────────────────*/
    const updateData = req.body;

    /*-─────────────────────────────────
    |  Step 3: Update child profile
    └──────────────────────────────────*/
    const result = await this.service.updateChildProfile(
      businessUserId as string,
      childId,
      updateData
    );

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Child profile updated successfully',
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
   * Set/Unset child as Secondary User (V2 - Auto-switch)
   * PUT /children-business-users/children/:childId/secondary-user/v2
   *
   * @description Designate a child as Secondary User (automatically removes existing)
   * @auth Business user (Parent/Teacher) only
   * @figmaIndex dashboard-flow-03.png, permission-flow-02.png
   */
  setSecondaryUserV2 = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and child ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;
    const { childId } = req.params;
    const { isSecondaryUser } = req.body;

    /*-─────────────────────────────────
    |  Step 2: Set as Secondary User (auto-switch)
    └──────────────────────────────────*/
    const result = await this.service.setSecondaryUserV2(
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
      message: result.previousSecondaryUser
        ? `Secondary user updated. Previous user (${result.previousSecondaryUser.name}) permissions revoked.`
        : 'Child set as Secondary User successfully',
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

  /*-─────────────────────────────────
  |  NEW: Get ALL children who ARE secondary users (have permissions)
  |  GET /children-business-users/secondary-users
  |  For: permission-flow.png - showing users with permissions
  └──────────────────────────────────*/
  /**
   * Get all secondary users
   * GET /children-business-users/secondary-users
   *
   * @description Get all children who have secondary user permissions
   * @auth Business user (Parent/Teacher)
   * @figmaIndex permission-flow.png
   */
  getAllSecondaryUsers = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get all secondary users
    └──────────────────────────────────*/
    const result = await this.service.getAllSecondaryUsers(businessUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Secondary users retrieved successfully',
      success: true,
    });
  });

  /*-─────────────────────────────────
  |  NEW: Get ALL children who are NOT secondary users (available to grant permission)
  |  GET /children-business-users/available-secondary-users
  |  For: permission-flow-02.png - modal showing available users to select
  └──────────────────────────────────*/
  /**
   * Get all available secondary users
   * GET /children-business-users/available-secondary-users
   *
   * @description Get all children who don't have secondary user permissions yet
   * @auth Business user (Parent/Teacher)
   * @figmaIndex permission-flow-02.png
   */
  getAvailableSecondaryUsers = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get available secondary users
    └──────────────────────────────────*/
    const result = await this.service.getAvailableSecondaryUsers(businessUserId as string);

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Available secondary users retrieved successfully',
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
   * Get team members list with task progress V2
   * GET /children-business-users/team-members/list/v2
   *
   * @description Get paginated list of children with task progress percentage (V2 with aggregation pipeline)
   *              Uses aggregation for better population control (name, email, profileImage, location, dob)
   * @auth Business user (parent/teacher)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10)
   * @query sortBy - Sort field (default: -addedAt)
   */
  getTeamMembersListV2 = catchAsync(async (req: Request, res: Response) => {
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
    |  Step 3: Get team members list V2 from service
    └──────────────────────────────────*/
    const result = await this.service.getTeamMembersListWithTaskProgressV2(
      businessUserId as string,
      options
    );

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Team members list with task progress V2 retrieved successfully',
      success: true,
    });
  });

  /**
   * Get team members list with task progress V3
   * GET /children-business-users/team-members/list/v3
   *
   * @description Get paginated list of children with task progress percentage (V3 with paginate + manual populate)
   *              Uses paginate plugin with manual population for reliability
   * @auth Business user (parent/teacher)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10)
   * @query sortBy - Sort field (default: -addedAt)
   */
  getTeamMembersListV3 = catchAsync(async (req: Request, res: Response) => {
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
    |  Step 3: Get team members list V3 from service
    └──────────────────────────────────*/
    const result = await this.service.getTeamMembersListWithTaskProgressV3(
      businessUserId as string,
      options
    );

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Team members list with task progress V3 retrieved successfully',
      success: true,
    });
  });

  /**
   * Get member details with all tasks
   * GET /children-business-users/team-members/:memberId
   *
   * @description Get detailed member profile with all tasks for member details page
   * @auth Business user (parent/teacher)
   * @figmaIndex all-task-of-a-member-flow.png
   */
  getMemberDetails = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and member ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;
    const { memberId } = req.params;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get member details from service
    └──────────────────────────────────*/
    const result = await this.service.getMemberDetailsWithTasks(
      memberId,
      businessUserId as string,
    );

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Member details retrieved successfully',
      success: true,
    });
  });

  /**
   * Get member details with all tasks V2
   * GET /children-business-users/team-members/:memberId/v2
   *
   * @description Get detailed member profile with all tasks (V2 with smart subtask handling)
   * @auth Business user (parent/teacher)
   * @figmaIndex all-task-of-a-member-flow.png
   */
  getMemberDetailsV2 = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and member ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;
    const { memberId } = req.params;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get member details V2 from service
    └──────────────────────────────────*/
    const result = await this.service.getMemberDetailsWithTasksV2(
      memberId,
      businessUserId as string,
    );

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Member details V2 retrieved successfully',
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

  /** 🎓 LEARNING PURPOSE ONLY
   * Send invitation to child
   * POST /children-business-users/children/invite
   *
   * @description Parent sends invitation to child (child sets own password)
   * @auth Business user (Parent/Teacher)
   * @figmaIndex create-child-flow.png (Invitation flow variant)
   */
  inviteChild = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID from request
    └──────────────────────────────────*/
    const businessUserId = req.user?.userId;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Extract invitation data from request body
    └──────────────────────────────────*/
    const invitationData = pick(req.body, [
      'name',
      'email',
      'phoneNumber',
      'location',
      'gender',
      'dateOfBirth',
      'supportMode',
    ]);

    /*-─────────────────────────────────
    |  Step 3: Send invitation
    └──────────────────────────────────*/
    const result = await this.service.inviteChildAccount(businessUserId, invitationData);

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.ACCEPTED,
      data: result,
      message: result.message || 'Invitation sent successfully',
      success: true,
    });
  });

  /**
   * Get child details for edit form
   * GET /children-business-users/team-members/:childId/edit
   *
   * @description Get child profile data to populate edit form
   * @auth Business user (parent/teacher)
   * @figmaIndex edit-child-flow.png
   */
  getChildForEdit = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and child ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;
    const { childId } = req.params;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Get child details from service
    └──────────────────────────────────*/
    const result = await this.service.getChildForEdit(
      childId,
      businessUserId as string,
    );

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Child details retrieved successfully',
      success: true,
    });
  });

  /**
   * Update child profile V2 - Returns complete data for edit form
   * PATCH /children-business-users/children/:childId/v2
   *
   * @description Update child profile and return complete data (no need for separate GET)
   * @auth Business user (parent/teacher)
   * @figmaIndex edit-child-flow.png
   * @version 2.0.0
   */
  updateChildV2 = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get business user ID and child ID
    └──────────────────────────────────*/
    const businessUserId = (req.user as IUser).userId;
    const { childId } = req.params;

    if (!businessUserId) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
    }

    /*-─────────────────────────────────
    |  Step 2: Update child profile from service
    └──────────────────────────────────*/
    const result = await this.service.updateChildProfileV2(
      businessUserId as string,
      childId,
      req.body,
    );

    /*-─────────────────────────────────
    |  Step 3: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Child profile updated successfully',
      success: true,
    });
  });
}

export const childrenBusinessUserController = new ChildrenBusinessUserController();
