//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { GenericService } from '../_generic-module/generic.services';
import { ChildrenBusinessUser } from './childrenBusinessUser.model';
import {
  IChildrenBusinessUser,
  IChildrenBusinessUserDocument,
} from './childrenBusinessUser.interface';
import ApiError from '../../errors/ApiError';
import { User } from '../user.module/user/user.model';
import { Task } from '../task.module/task/task.model';
import { SubscriptionPlan } from '../subscription.module/subscriptionPlan/subscriptionPlan.model';
import { UserSubscription } from '../subscription.module/userSubscription/userSubscription.model';
import { UserSubscriptionStatusType } from '../subscription.module/userSubscription/userSubscription.constant';
import {
  CHILDREN_BUSINESS_USER_STATUS,
  CHILDREN_CACHE_CONFIG,
  ChildrenBusinessUserStatus,
} from './childrenBusinessUser.constant';
import { redisClient } from '../../helpers/redis/redis';
import { errorLogger, logger } from '../../shared/logger';
import bcryptjs from 'bcryptjs';
import { TaskStatus } from '../task.module/task/task.constant';

/**
 * Children Business User Service
 * Handles business logic for parent-child relationships
 *
 * Features:
 * - Create child accounts with subscription limit enforcement
 * - Auto-create family group if not exists
 * - Redis caching for children lists
 * - Automatic cache invalidation
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */
export class ChildrenBusinessUserService extends GenericService<
  typeof ChildrenBusinessUser,
  IChildrenBusinessUserDocument
> {
  constructor() {
    super(ChildrenBusinessUser);
  }

  /**
   * Cache Key Generator
   */
  private getCacheKey(
    type: 'children' | 'count' | 'parent',
    businessUserId?: string,
    childUserId?: string,
  ): string {
    const prefix = CHILDREN_CACHE_CONFIG.PREFIX;
    if (type === 'children' && businessUserId) {
      return `${prefix}:business:${businessUserId}:children`;
    }
    if (type === 'count' && businessUserId) {
      return `${prefix}:business:${businessUserId}:count`;
    }
    if (type === 'parent' && childUserId) {
      return `${prefix}:child:${childUserId}:parent`;
    }
    return `${prefix}:unknown`;
  }

  /**
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error(
        'Redis GET error in ChildrenBusinessUserService:',
        error,
      );
      return null;
    }
  }

  /**
   * Set in Cache
   */
  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number,
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error(
        'Redis SET error in ChildrenBusinessUserService:',
        error,
      );
    }
  }

  /**
   * Invalidate Cache
   */
  private async invalidateCache(
    businessUserId: string,
    childUserId?: string,
  ): Promise<void> {
    try {
      const keysToDelete = [
        this.getCacheKey('children', businessUserId),
        this.getCacheKey('count', businessUserId),
      ];

      if (childUserId) {
        keysToDelete.push(this.getCacheKey('parent', undefined, childUserId));
      }

      await redisClient.del(keysToDelete);
      logger.info(`Cache invalidated for business user: ${businessUserId}`);
    } catch (error) {
      errorLogger.error('Cache invalidation error:', error);
    }
  }

  /**
   * Create child account and add to family
   * This is the main method for business users to add children
   *
   * @param businessUserId - The business user creating the child
   * @param childData - Child account details
   * @returns Created child user and relationship
   */
  async createChildAccount(
    businessUserId: string,
    childData: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
    },
  ): Promise<{
    childUser: any;
    relationship: IChildrenBusinessUserDocument;
    familyGroup?: any;
  }> {
    /*-─────────────────────────────────
    |  Step 1: Verify business user exists and is a business user
    └──────────────────────────────────*/
    const businessUser = await User.findById(businessUserId);

    if (!businessUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Business user not found');
    }

    /*-─────────────────────────────────
    |  Step 2: Check if business user has active business subscription
    └──────────────────────────────────*/
    // const subscription = await UserSubscription.findOne({
    //   userId: new Types.ObjectId(businessUserId),
    //   status: UserSubscriptionStatusType.active,
    //   isDeleted: false,
    // });

    // if (!subscription) {
    //   throw new ApiError(
    //     StatusCodes.BAD_REQUEST,
    //     'You must have an active business subscription to add children accounts'
    //   );
    // }

    /*-─────────────────────────────────
    |  Step 3: Get subscription plan to check max children limit
    └──────────────────────────────────*/
    // const plan = await SubscriptionPlan.findById(subscription.subscriptionPlanId);

    // if (!plan) {
    //   throw new ApiError(StatusCodes.NOT_FOUND, 'Subscription plan not found');
    // }

    // // Verify this is a business subscription
    // const businessSubscriptionTypes = ['business_starter', 'business_level1', 'business_level2'];
    // if (!businessSubscriptionTypes.includes(plan.subscriptionType)) {
    //   throw new ApiError(
    //     StatusCodes.BAD_REQUEST,
    //     'Only business subscriptions can add children accounts'
    //   );
    // }

    /*-─────────────────────────────────
    |  Step 4: Check current children count against subscription limit
    └──────────────────────────────────*/
    // const currentChildrenCount = await this.getChildrenCount(businessUserId);

    // if (currentChildrenCount >= plan.maxChildrenAccount) {
    //   throw new ApiError(
    //     StatusCodes.BAD_REQUEST,
    //     `You have reached the maximum limit of ${plan.maxChildrenAccount} children accounts for your ${plan.subscriptionName} subscription. Please upgrade your subscription to add more children.`
    //   );
    // }

    /*-─────────────────────────────────
    |  Step 5: Check if email already exists
    └──────────────────────────────────*/
    const existingUser = await User.findOne({
      email: childData.email.toLowerCase(),
      isDeleted: false,
    });

    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists');
    }

    /*-─────────────────────────────────
    |  Step 6: Hash password
    └──────────────────────────────────*/
    const hashedPassword = await bcryptjs.hash(childData.password, 12);

    /*-─────────────────────────────────
    |  Step 7: Create child user account
    |  Sets accountCreatorId = businessUserId (as per your requirement)
    └──────────────────────────────────*/
    const childUser = await User.create({
      name: childData.name,
      email: childData.email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: childData.phoneNumber,
      role: 'child',
      accountCreatorId: new Types.ObjectId(businessUserId), // ✅ KEY FIELD
      profileId: businessUser.profileId, // Use same profile template
      subscriptionType: 'none', // Children don't need individual subscription
      isEmailVerified: false, // Child should verify email
    });

    /*-─────────────────────────────────
    |  Step 8: Create parent-child relationship record
    └──────────────────────────────────*/
    const relationship = await this.model.create({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: childUser._id,
      addedBy: new Types.ObjectId(businessUserId),
      status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
    });

    /*-─────────────────────────────────
    |  Step 9: Invalidate cache
    └──────────────────────────────────*/
    await this.invalidateCache(businessUserId);

    /*-─────────────────────────────────
    |  Step 10: Return result (simplified - no group integration)
    └──────────────────────────────────*/
    return {
      childUser: {
        _id: childUser._id,
        name: childUser.name,
        email: childUser.email,
        phoneNumber: childUser.phoneNumber,
        accountCreatorId: childUser.accountCreatorId,
      },
      relationship: {
        _id: relationship._id,
        parentBusinessUserId: relationship.parentBusinessUserId,
        childUserId: relationship.childUserId,
        addedAt: relationship.addedAt,
        status: relationship.status,
      },
    };
  }

  /**
   * Get or create family group for business user
   * REMOVED: No longer using group integration
   * Parent-child relationship is direct via ChildrenBusinessUser model
   */
  // private async getOrCreateFamilyGroup - REMOVED

  /**
   * Add child to family group
   * REMOVED: No longer using group integration
   */
  // private async addChildToGroup - REMOVED

  /** ✔️
   * Get all children of a business user
   */
  async getChildrenOfBusinessUser(
    businessUserId: string,
    options?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<any> {
    const cacheKey = this.getCacheKey('children', businessUserId);

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for children list: ${cacheKey}`);
      return cached;
    }

    /*-─────────────────────────────────
    |  Build aggregation pipeline
    └──────────────────────────────────*/
    const matchStage: any = {
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      isDeleted: false,
    };

    if (options?.status) {
      matchStage.status = options.status;
    }

    const children = await this.model.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'users',
          localField: 'childUserId',
          foreignField: '_id',
          as: 'childUser',
        },
      },
      { $unwind: '$childUser' },
      {
        $project: {
          _id: 1,
          relationshipId: '$_id',
          childUserId: '$childUser._id',
          name: '$childUser.name',
          email: '$childUser.email',
          phoneNumber: '$childUser.phoneNumber',
          profileImage: '$childUser.profileImage',
          accountCreatorId: '$childUser.accountCreatorId',
          addedAt: 1,
          status: 1,
          note: 1,
        },
      },
      { $sort: { addedAt: -1 } },
    ]);

    // Cache the result
    await this.setInCache(
      cacheKey,
      children,
      CHILDREN_CACHE_CONFIG.CHILDREN_LIST_TTL,
    );

    return children;
  }

  /**
   * Get children with active task counts for Team Member sidebar
   * Figma: teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @returns List of children with their active task counts
   *
   * @description
   * This endpoint is specifically designed for the Team Member sidebar
   * in the Task Monitoring page. It returns each child with their count
   * of active tasks (pending + inProgress).
   */
  async getChildrenWithActiveTaskCounts(businessUserId: string): Promise<
    Array<{
      _id: string;
      childUserId: string;
      name: string;
      email: string;
      profileImage?: { imageUrl: string };
      activeTaskCount: number;
      isSecondaryUser: boolean;
    }>
  > {
    const cacheKey = this.getCacheKey('team-members', businessUserId);

    // Try cache first (3 minutes for team members with task counts)
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for team members with task counts: ${cacheKey}`);
      return cached;
    }

    // Get all active children for this business user
    const childrenRelations = await this.model
      .find({
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        status: ChildrenBusinessUserStatus.ACTIVE,
        isDeleted: false,
      })
      .populate('childUserId', 'name email profileImage')
      .lean();

    if (childrenRelations.length === 0) {
      return [];
    }

    const childUserIds = childrenRelations.map(
      (rel: any) => rel.childUserId._id,
    );

    // Get active task counts for each child (pending + inProgress)
    const taskCounts = await Task.aggregate([
      {
        $match: {
          assignedUserIds: { $in: childUserIds },
          status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          isDeleted: false,
        },
      },
      {
        $unwind: '$assignedUserIds',
      },
      {
        $group: {
          _id: '$assignedUserIds',
          activeTaskCount: { $sum: 1 },
        },
      },
    ]);

    // Create a map of childUserId to task count
    const taskCountMap = new Map();
    taskCounts.forEach((tc: any) => {
      taskCountMap.set(tc._id.toString(), tc.activeTaskCount);
    });

    // Check which children are Secondary Users
    const secondaryUserIds = await this.model
      .find({
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        isSecondaryUser: true,
        isDeleted: false,
      })
      .distinct('childUserId');

    // Build response with task counts
    const result = childrenRelations.map((rel: any) => {
      const childUser = rel.childUserId as any;
      const childUserIdStr = childUser._id.toString();

      return {
        _id: rel._id.toString(),
        childUserId: childUserIdStr,
        name: childUser.name,
        email: childUser.email,
        profileImage: childUser.profileImage,
        activeTaskCount: taskCountMap.get(childUserIdStr) || 0,
        isSecondaryUser: secondaryUserIds.some(
          (id: any) => id.toString() === childUserIdStr,
        ),
      };
    });

    // Cache the result (3 minutes for team members)
    await this.setInCache(cacheKey, result, 180);

    logger.info(
      `Team members with task counts retrieved for business user: ${businessUserId}`,
    );
    return result;
  }

  /**
   * Get team members statistics for Team Members dashboard
   * Figma: teacher-parent-dashboard/team-members/team-member-flow-01.png
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @returns Statistics: teamSize, totalTasks, activeTasks, completedTasks
   */
  async getTeamMembersStatistics(businessUserId: string): Promise<{
    teamSize: number;
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
  }> {
    const cacheKey = this.getCacheKey('team-statistics', businessUserId);

    // Try cache first (5 minutes for statistics)
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for team members statistics: ${cacheKey}`);
      return cached;
    }

    // Get all active children for this business user
    const childrenRelations = await this.model
      .find({
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        status: ChildrenBusinessUserStatus.ACTIVE,
        isDeleted: false,
      })
      .select('childUserId')
      .lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    // If no children, return zeros
    if (childUserIds.length === 0) {
      const result = {
        teamSize: 0,
        totalTasks: 0,
        activeTasks: 0,
        completedTasks: 0,
      };

      // Cache the result
      await this.setInCache(cacheKey, result, 300);
      return result;
    }

    // Get task counts in parallel
    const [totalTasks, activeTasks, completedTasks] = await Promise.all([
      // Total tasks assigned to all children
      Task.countDocuments({
        assignedUserIds: { $in: childUserIds },
        isDeleted: false,
      }),

      // Active tasks (pending + inProgress)
      Task.countDocuments({
        assignedUserIds: { $in: childUserIds },
        status: { $in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        isDeleted: false,
      }),

      // Completed tasks
      Task.countDocuments({
        assignedUserIds: { $in: childUserIds },
        status: TaskStatus.COMPLETED,
        isDeleted: false,
      }),
    ]);

    const result = {
      teamSize: childrenRelations.length,
      totalTasks,
      activeTasks,
      completedTasks,
    };

    // Cache the result
    await this.setInCache(cacheKey, result, 300); // 5 minutes

    logger.info(
      `Team members statistics retrieved for business user: ${businessUserId}`,
    );
    return result;
  }

  /** ✔️🔁
   * Get team members list with task progress for Team Members dashboard
   * Figma: teacher-parent-dashboard/team-members/team-member-flow-01.png
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param options - Pagination options (page, limit, sortBy)
   * @returns Paginated list of children with task progress percentage
   */
  async getTeamMembersListWithTaskProgress(
    businessUserId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
    } = {},
  ): Promise<any> {
    const cacheKey = this.getCacheKey(
      'team-list',
      businessUserId,
      `page-${options.page || 1}-limit-${options.limit || 10}`,
    );

    // Try cache first (3 minutes for list data)
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   logger.debug(`Cache hit for team members list: ${cacheKey}`);
    //   return cached;
    // }

    const page = options.page || 1;
    const limit = options.limit || 10;
    const sortBy = options.sortBy || '-addedAt';

    // Build filter query
    const query = {
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    };

    // Use paginate plugin for proper pagination
    const paginateOptions = {
      page,
      limit,
      sortBy,
      populate: [
        {
          path: 'childUserId',
          select: 'name email phoneNumber profileImage gender',
          populate: {
            path: 'profileId',
            select: 'location dob',
          },
        },
      ],
      lean: true,
    };

    const childrenResult = await this.model.paginate(query, paginateOptions);

    
    // Add null check for childrenResult
    if (
      !childrenResult ||
      !childrenResult.results ||
      childrenResult.results.length === 0
    ) {
      const result = {
        docs: [],
        page: childrenResult?.page || page,
        limit: childrenResult?.limit || limit,
        total: childrenResult?.total || 0,
        totalPages: childrenResult?.totalPages || 0,
      };

      // Cache the result
      await this.setInCache(cacheKey, result, 180);
      return result;
    }

    const childUserIds = childrenResult.results.map(
      (rel: any) => rel.childUserId._id,
    );

    // Get task progress for each child using aggregation
    const taskProgress = await Task.aggregate([
      {
        $match: {
          assignedUserIds: { $in: childUserIds },
          isDeleted: false,
        },
      },
      {
        $unwind: '$assignedUserIds',
      },
      {
        $group: {
          _id: '$assignedUserIds',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', TaskStatus.COMPLETED] }, 1, 0] },
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', TaskStatus.PENDING] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', TaskStatus.IN_PROGRESS] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          childUserId: '$_id',
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          inProgressTasks: 1,
          progressPercentage: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $eq: ['$totalTasks', 0] },
                      0,
                      { $divide: ['$completedTasks', '$totalTasks'] },
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    // Create a map of childUserId to task progress
    const progressMap = new Map();
    taskProgress.forEach((tp: any) => {
      progressMap.set(tp.childUserId.toString(), {
        totalTasks: tp.totalTasks,
        completedTasks: tp.completedTasks,
        pendingTasks: tp.pendingTasks,
        inProgressTasks: tp.inProgressTasks,
        progressPercentage: tp.progressPercentage,
      });
    });

    // Check which children are Secondary Users
    const secondaryUserIds = await this.model
      .find({
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        isSecondaryUser: true,
        isDeleted: false,
      })
      .distinct('childUserId');

    // Build response with task progress
    const docs = childrenResult.results.map((rel: any) => {
      const childUser = rel.childUserId;
      const childUserIdStr = childUser._id.toString();
      const progress = progressMap.get(childUserIdStr) || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        progressPercentage: 0,
      };

      return {
        _id: rel._id.toString(),
        childUserId: childUserIdStr,
        name: childUser.name,
        email: childUser.email,
        phoneNumber: childUser.phoneNumber,
        gender: childUser.gender,
        profileImage: childUser.profileImage,
        location: childUser.profileId?.location,
        dob: childUser.profileId?.dob,
        roleType: secondaryUserIds.some(
          (id: any) => id.toString() === childUserIdStr,
        )
          ? 'Secondary'
          : 'Primary',
        taskProgress: progress,
        addedAt: rel.addedAt,
      };
    });

    const result = {
      docs,
      page: childrenResult.page,
      limit: childrenResult.limit,
      total: childrenResult.total,
      totalPages: childrenResult.totalPages,
    };

    // Cache the result
    await this.setInCache(cacheKey, result, 180); // 3 minutes

    logger.info(
      `Team members list with task progress retrieved for business user: ${businessUserId}`,
    );
    return result;
  }

  /** ✔️
   * Get children count for business user
   */
  async getChildrenCount(businessUserId: string): Promise<number> {
    const cacheKey = this.getCacheKey('count', businessUserId);

    // Try cache first
    const cached = await this.getFromCache<number>(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for children count: ${cacheKey}`);
      return cached;
    }

    const count = await this.model.countDocuments({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
      isDeleted: false,
    });

    // Cache the result
    await this.setInCache(cacheKey, count, CHILDREN_CACHE_CONFIG.COUNT_TTL);

    return count;
  }

  /** ✔️
   * Get parent business user for a child
   */
  async getParentBusinessUser(childUserId: string): Promise<any> {
    const cacheKey = this.getCacheKey('parent', undefined, childUserId);

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for parent info: ${cacheKey}`);
      return cached;
    }

    const relationship: IChildrenBusinessUser = await this.model
      .findOne({
        childUserId: new Types.ObjectId(childUserId),
        status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
        isDeleted: false,
      })
      .populate(
        'parentBusinessUserId',
        'name email phoneNumber profileImage subscriptionType',
      );

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No parent business user found for this child',
      );
    }

    const parentInfo = {
      _id: (relationship.parentBusinessUserId as any)._id,
      name: (relationship.parentBusinessUserId as any).name,
      email: (relationship.parentBusinessUserId as any).email,
      phoneNumber: (relationship.parentBusinessUserId as any).phoneNumber,
      profileImage: (relationship.parentBusinessUserId as any).profileImage,
      subscriptionType: (relationship.parentBusinessUserId as any)
        .subscriptionType,
    };

    // Cache the result
    await this.setInCache(
      cacheKey,
      parentInfo,
      CHILDREN_CACHE_CONFIG.PARENT_INFO_TTL,
    );

    return parentInfo;
  }

  /** ✔️
   * Remove child from family (soft delete)
   */
  async removeChildFromFamily(
    businessUserId: string,
    childUserId: string,
    note?: string,
  ): Promise<void> {
    // Find and update relationship
    const relationship = await this.model.findOneAndUpdate(
      {
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        childUserId: new Types.ObjectId(childUserId),
        isDeleted: false,
      },
      {
        status: CHILDREN_BUSINESS_USER_STATUS.REMOVED,
        isDeleted: true,
        note: note,
      },
      { new: true },
    );

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No active relationship found between this business user and child',
      );
    }

    // REMOVED: No group integration
    // Parent-child relationship is direct via ChildrenBusinessUser model

    /*-─────────────────────────────────
    |  NEED TO THINK : what should be the flow after softDelete the relationship
    └──────────────────────────────────*/

    // Invalidate cache
    await this.invalidateCache(businessUserId, childUserId);

    logger.info(
      `Removed child ${childUserId} from business user ${businessUserId}`,
    );
  }

  /**
   * Reactivate child account
   */
  async reactivateChild(
    businessUserId: string,
    childUserId: string,
  ): Promise<void> {
    await this.model.findOneAndUpdate(
      {
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        childUserId: new Types.ObjectId(childUserId),
        isDeleted: true,
      },
      {
        status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
        isDeleted: false,
        note: 'Reactivated',
      },
    );

    // REMOVED: No group integration
    // Parent-child relationship is direct via ChildrenBusinessUser model

    await this.invalidateCache(businessUserId, childUserId);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Secondary User Management
  // Figma: dashboard-flow-03.png (Permissions section)
  // Only ONE child per business user can be Secondary User
  // ────────────────────────────────────────────────────────────────────────

  /**✔️
   * Set/Unset child as Secondary User
   * Only ONE child per business user can be Secondary User
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param childUserId - Child user ID
   * @param isSecondaryUser - true to set, false to unset
   * @returns Updated secondary user status
   */
  async setSecondaryUser(
    businessUserId: string,
    childUserId: string,
    isSecondaryUser: boolean,
  ): Promise<{
    childUserId: string;
    isSecondaryUser: boolean;
    updatedAt: Date;
  }> {
    console.log('childId :: ', childUserId);

    // If setting as secondary user, ensure no other child is already secondary
    if (isSecondaryUser) {
      const existingSecondary = await this.model.findOne({
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        isSecondaryUser: true,
        childUserId: { $ne: new Types.ObjectId(childUserId) },
        isDeleted: false,
      });

      if (existingSecondary) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Another child is already the Secondary User. Please remove them first.',
        );
      }
    }

    const result = await this.model
      .findOneAndUpdate(
        {
          parentBusinessUserId: new Types.ObjectId(businessUserId),
          childUserId: new Types.ObjectId(childUserId),
          isDeleted: false,
        },
        { isSecondaryUser },
        { new: true, runValidators: true },
      )
      .select('isSecondaryUser updatedAt');

    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Child account not found or not associated with this business user',
      );
    }

    // Invalidate cache
    await this.invalidateCache(businessUserId, childUserId);

    logger.info(
      `Set child ${childUserId} as Secondary User: ${isSecondaryUser}`,
    );

    return {
      childUserId,
      isSecondaryUser,
      updatedAt: result.updatedAt,
    };
  }

  /** ✔️
   * Get Secondary User for a business user
   *
   * @param businessUserId - Business user ID
   * @returns Secondary user info or null if none
   */
  async getSecondaryUser(businessUserId: string): Promise<{
    childUserId: string | null;
    isSecondaryUser: boolean;
  } | null> {
    const relationship = await this.model
      .findOne({
        parentBusinessUserId: new Types.ObjectId(businessUserId),
        isSecondaryUser: true,
        isDeleted: false,
        status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
      })
      .select('childUserId')
      .lean();

    if (!relationship) {
      return null;
    }

    return {
      childUserId: relationship.childUserId.toString(),
      isSecondaryUser: true,
    };
  }

  /**✔️
   * Check if a child is Secondary User
   *
   * @param childUserId - Child user ID
   * @returns true if child is Secondary User
   */
  async isChildSecondaryUser(childUserId: string): Promise<boolean> {
    const relationship = await this.model.exists({
      childUserId: new Types.ObjectId(childUserId),
      isSecondaryUser: true,
      isDeleted: false,
      status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
    });

    return !!relationship;
  }

  /**
   * Get child's permission status (for child user themselves)
   * GET /children-business-users/my-permission
   *
   * @description Returns the logged-in child's permission status
   * @param childUserId - The child user ID (from authenticated request)
   * @returns Permission info including isSecondaryUser status and parent info
   */
  async getChildPermissionStatus(childUserId: string): Promise<{
    isSecondaryUser: boolean;
    parentBusinessUserId: string;
    parentName: string;
    permissions: {
      canCreateTasksForOthers: boolean;
      canViewTeamTasks: boolean;
      canAssignToTeamMembers: boolean;
    };
  }> {
    const relationship = await this.model
      .findOne({
        childUserId: new Types.ObjectId(childUserId),
        status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
        isDeleted: false,
      })
      .select('isSecondaryUser parentBusinessUserId')
      .populate('parentBusinessUserId', 'name')
      .lean();

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No parent-child relationship found for this child',
      );
    }

    const isSecondaryUser = relationship.isSecondaryUser || false;
    const parentBusinessUserId = (relationship.parentBusinessUserId as any)._id.toString();
    const parentName = (relationship.parentBusinessUserId as any).name;

    return {
      isSecondaryUser,
      parentBusinessUserId,
      parentName,
      permissions: {
        canCreateTasksForOthers: isSecondaryUser,
        canViewTeamTasks: isSecondaryUser,
        canAssignToTeamMembers: isSecondaryUser,
      },
    };
  }

  /**
   * Get family members for a child user
   * GET /children-business-users/my-family-members
   *
   * @description Returns other children (siblings) under the same parent
   * @param childUserId - The child user ID (from authenticated request)
   * @returns List of family members (other children with same parent)
   */
  async getChildFamilyMembers(childUserId: string): Promise<
    Array<{
      _id: string;
      childUserId: string;
      name: string;
      email: string;
      phoneNumber?: string;
      profileImage?: { imageUrl: string };
      isSecondaryUser: boolean;
      roleType: 'Primary' | 'Secondary';
      addedAt: Date;
    }>
  > {
    // Find the parent business user for this child
    const relationship = await this.model
      .findOne({
        childUserId: new Types.ObjectId(childUserId),
        status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
        isDeleted: false,
      })
      .select('parentBusinessUserId')
      .lean();

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'No parent-child relationship found for this child',
      );
    }

    const parentBusinessUserId = (relationship.parentBusinessUserId as any)._id;

    // Get all active children of this parent (excluding the current child)
    const familyMembers = await this.model.aggregate([
      {
        $match: {
          parentBusinessUserId,
          childUserId: { $ne: new Types.ObjectId(childUserId) },
          status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'childUserId',
          foreignField: '_id',
          as: 'childUser',
        },
      },
      { $unwind: '$childUser' },
      {
        $project: {
          _id: 1,
          childUserId: { $toString: '$childUser._id' },
          name: '$childUser.name',
          email: '$childUser.email',
          phoneNumber: '$childUser.phoneNumber',
          profileImage: '$childUser.profileImage',
          isSecondaryUser: 1,
          roleType: {
            $cond: ['$isSecondaryUser', 'Secondary', 'Primary'],
          },
          addedAt: 1,
        },
      },
      { $sort: { addedAt: -1 } },
    ]);

    return familyMembers;
  }
}
