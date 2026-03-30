//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
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
import { SupportMode } from '../user.module/userProfile/userProfile.constant';

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
   * Figma: create-child-flow.png (Create Member screen)
   * This is the main method for business users to add children
   *
   * @param businessUserId - The business user creating the child
   * @param childData - Child account details (all fields from Figma)
   * @returns Created child user and relationship
   *
   * @description
   * Creates User account with role 'child'
   * Creates UserProfile with supportMode, location, dob, gender
   * Creates ChildrenBusinessUser relationship
   * Sends email with login credentials to child
   * Invalidates Redis cache
   */
  async createChildAccount(
    businessUserId: string,
    childData: {
      name: string;
      email: string;
      password: string;
      phoneNumber?: string;
      location?: string;
      gender?: 'male' | 'female' ;
      dateOfBirth?: string;
      supportMode?: SupportMode; 
    },
  ): Promise<{
    childUser: any;
    relationship: IChildrenBusinessUserDocument;
    message: string;
  }> {
    /*-─────────────────────────────────
    |  Step 1: Verify business user exists and get name
    └──────────────────────────────────*/
    const businessUser = await User.findById(businessUserId).select('name email');

    if (!businessUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Business user not found');
    }

    /*-─────────────────────────────────
    |  Step 2: Check if email already exists
    └──────────────────────────────────*/
    const existingUser = await User.findOne({
      email: childData.email.toLowerCase(),
      isDeleted: false,
    });

    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists');
    }

    /*-─────────────────────────────────
    |  Step 3: Hash password
    └──────────────────────────────────*/
    const hashedPassword = await bcryptjs.hash(childData.password, 12);

    /*-─────────────────────────────────
    |  Step 4: Create UserProfile first
    |  Contains: supportMode, location, dob, gender
    └──────────────────────────────────*/
    const { UserProfile } = await import('../user.module/userProfile/userProfile.model');
    
    const userProfile = await UserProfile.create({
      acceptTOC: true, // Auto-accept for child accounts created by parent
      supportMode: childData.supportMode || SupportMode.CALM,
      location: childData.location,
      dob: childData.dateOfBirth ? new Date(childData.dateOfBirth) : undefined,
      gender: childData.gender,
    });

    /*-─────────────────────────────────
    |  Step 5: Create child user account
    |  Sets accountCreatorId = businessUserId (as per your requirement)
    └──────────────────────────────────*/
    const childUser = await User.create({
      name: childData.name,
      email: childData.email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: childData.phoneNumber,
      role: 'child',
      accountCreatorId: new Types.ObjectId(businessUserId), // ✅ KEY FIELD
      profileId: userProfile._id,
      subscriptionType: 'none', // Children don't need individual subscription
      isEmailVerified: true, // Child should verify email
      preferredTime: '07:00', // Default preferred time
    });

    /*-─────────────────────────────────
    |  Step 6: Create parent-child relationship record
    └──────────────────────────────────*/
    const relationship = await this.model.create({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: childUser._id,
      addedBy: new Types.ObjectId(businessUserId),
      status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
      isSecondaryUser: false, // Default: not secondary user
    });

    /*-─────────────────────────────────
    |  Step 7: Send email with login credentials
    |  Figma: create-child-flow.png
    └──────────────────────────────────*/
    try {
      const { sendChildAccountCredentialsEmail } = await import('../../helpers/emailService');
      
      // Send email asynchronously (don't block response)
      sendChildAccountCredentialsEmail(
        childUser.email,
        childUser.name,
        childData.password, // Plain text password for email
        businessUser.name // Parent/Teacher name
      ).catch((emailError) => {
        errorLogger.error('Failed to send child account credentials email:', emailError);
        // Don't throw - account creation should succeed even if email fails
      });

      logger.info(`Credentials email sent to child: ${childUser.email}`);
    } catch (error) {
      errorLogger.error('Email service error:', error);
      // Don't throw - account creation should succeed even if email fails
    }

    /*-─────────────────────────────────
    |  Step 8: Invalidate cache
    └──────────────────────────────────*/
    await this.invalidateCache(businessUserId);

    /*-─────────────────────────────────
    |  Step 9: Return result
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
        isSecondaryUser: relationship.isSecondaryUser,
      },
      message: 'Child account created successfully. Login credentials have been sent to the child\'s email.',
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
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   logger.debug(`Cache hit for team members statistics: ${cacheKey}`);
    //   return cached;
    // }

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
          select: 'name email phoneNumber profileImage',
          // populate: {
          //   path: 'profileId',
          //   select: 'location dob',
          // },
        },
      ],
      // lean: true,
    };

    const childrenResult = await this.model.paginate(query, paginateOptions);

    console.log("✔️✔️ ", childrenResult);

    
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

  /** ✔️🔁 V2
   * Get team members list with task progress for Team Members dashboard - V2
   * Uses aggregation pipeline for better population control
   * Figma: teacher-parent-dashboard/team-members/team-member-flow-01.png
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param options - Pagination options (page, limit, sortBy)
   * @returns Paginated list of children with task progress percentage
   */
  async getTeamMembersListWithTaskProgressV2(
    businessUserId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
    } = {},
  ): Promise<any> {
    const cacheKey = this.getCacheKey(
      'team-list-v2',
      businessUserId,
      `page-${options.page || 1}-limit-${options.limit || 10}`,
    );

    const page = options.page || 1;
    const limit = options.limit || 10;
    const sortBy = options.sortBy || '-addedAt';

    // Parse sortBy to MongoDB sort format
    const sortField = sortBy.replace('-', '');
    const sortOrder = sortBy.startsWith('-') ? -1 : 1;

    // ✅ Use aggregation pipeline for full control over population
    const pipeline: any[] = [
      {
        $match: {
          parentBusinessUserId: new Types.ObjectId(businessUserId),
          status: ChildrenBusinessUserStatus.ACTIVE,
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
      {
        $unwind: '$childUser',
      },
      {
        $lookup: {
          from: 'userprofiles',
          localField: 'childUser.profileId',
          foreignField: '_id',
          as: 'childUserProfile',
        },
      },
      {
        $unwind: {
          path: '$childUserProfile',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          childUserId: '$childUser._id',
          name: '$childUser.name',
          role : '$childUser.role',
          email: '$childUser.email',
          phoneNumber: '$childUser.phoneNumber',
          gender: '$childUser.gender',
          profileImage: '$childUser.profileImage',
          // location: '$childUserProfile.location',
          // dob: '$childUserProfile.dob',
          addedAt: 1,
          status: 1,
          isSecondaryUser: 1,
        },
      },
      {
        $sort: { [sortField]: sortOrder },
      },
      {
        $skip: (page - 1) * limit,
      },
      {
        $limit: limit,
      },
    ];

    // Execute aggregation
    const childrenResult = await this.model.aggregate(pipeline);

    // Get total count for pagination
    const totalPipeline = pipeline.filter(
      (stage: any) => !stage.$skip && !stage.$limit,
    );
    const totalCountResult = await this.model.aggregate(totalPipeline);
    const total = totalCountResult.length;

    // Handle empty results
    if (childrenResult.length === 0) {
      const result = {
        docs: [],
        page: page,
        limit: limit,
        total: 0,
        totalPages: 0,
      };

      // Cache the result
      await this.setInCache(cacheKey, result, 180);
      return result;
    }

    // Extract child user IDs for task progress calculation
    const childUserIds = childrenResult.map((child: any) => child.childUserId);

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

    // Build response with task progress
    const docs = childrenResult.map((child: any) => {
      const childUserIdStr = child.childUserId.toString();
      const progress = progressMap.get(childUserIdStr) || {
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        inProgressTasks: 0,
        progressPercentage: 0,
      };

      return {
        _id: child._id.toString(),
        childUserId: childUserIdStr,
        name: child.name || 'Unknown',
        email: child.email || '',
        role : child.role || 'child',
        phoneNumber: child.phoneNumber || '',
        // gender: child.gender || '',
        profileImage: child.profileImage || { imageUrl: '/uploads/users/user.png' },
        // location: child.location || '',
        // dob: child.dob || null,
        roleType: child.isSecondaryUser ? 'Secondary' : 'Primary',
        taskProgress: progress,
        addedAt: child.addedAt,
      };
    });

    const result = {
      docs,
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
    };

    // Cache the result
    await this.setInCache(cacheKey, result, 180); // 3 minutes

    logger.info(
      `Team members list with task progress V2 retrieved for business user: ${businessUserId}`,
    );
    return result;
  }

  /** ✔️🔁 V3
   * Get team members list with task progress V3 - Fixed pagination with manual populate
   * Uses paginate plugin but manually populates childUserId for reliability
   * Figma: teacher-parent-dashboard/team-members/team-member-flow-01.png
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param options - Pagination options (page, limit, sortBy)
   * @returns Paginated list of children with task progress percentage
   */
  async getTeamMembersListWithTaskProgressV3(
    businessUserId: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
    } = {},
  ): Promise<any> {
    const cacheKey = this.getCacheKey(
      'team-list-v3',
      businessUserId,
      `page-${options.page || 1}-limit-${options.limit || 10}`,
    );

    const page = options.page || 1;
    const limit = options.limit || 10;
    const sortBy = options.sortBy || '-addedAt';

    // Build filter query
    const query = {
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    };

    // ✅ Step 1: Use paginate plugin WITHOUT populate (more reliable)
    const paginateOptions = {
      page,
      limit,
      sortBy,
      // Don't use populate in paginate options (can be unreliable)
    };

    const childrenResult = await this.model.paginate(query, paginateOptions);

    // Handle empty results
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

    // ✅ Step 2: Manually populate childUserId using populate() on the results
    await this.model.populate(childrenResult.results, [
      {
        path: 'childUserId',
        select: 'name email phoneNumber profileImage gender profileId',
        model: 'User',
      },
    ]);

    // ✅ Step 3: Manually populate profileId for each child
    // Need to do this separately because nested populate doesn't work well
    for (const rel of childrenResult.results) {
      if (rel.childUserId?.profileId) {
        await (rel.childUserId as any).populate({
          path: 'profileId',
          select: 'location dob',
          model: 'UserProfile',
        });
      }
    }

    logger.info(`V3 populated results: ${JSON.stringify(childrenResult.results[0], null, 2)}`);

    // Extract child user IDs for task progress calculation
    const childUserIds = childrenResult.results.map(
      (rel: any) => rel.childUserId?._id || rel.childUserId,
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
      const childUserIdStr = childUser?._id?.toString() || rel.childUserId?.toString();
      
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
        name: childUser?.name || 'Unknown',
        email: childUser?.email || '',
        phoneNumber: childUser?.phoneNumber || '',
        gender: childUser?.gender || '',
        profileImage: childUser?.profileImage || { imageUrl: '/uploads/users/user.png' },
        location: childUser?.profileId?.location || '',
        dob: childUser?.profileId?.dob || null,
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
      `Team members list with task progress V3 retrieved for business user: ${businessUserId}`,
    );
    return result;
  }

  /** ✔️🔁 NEW
   * Get member details with all tasks for member profile page
   * Figma: teacher-parent-dashboard/team-members/all-task-of-a-member-flow.png
   *
   * @param memberId - Child user ID (member to get details for)
   * @param businessUserId - Parent/Teacher business user ID (for authorization)
   * @returns Member profile with all tasks and statistics
   */
  async getMemberDetailsWithTasks(
    memberId: string,
    businessUserId: string,
  ): Promise<any> {
    const cacheKey = this.getCacheKey(
      'member-details',
      businessUserId,
      memberId,
    );

    // Try cache first (3 minutes for member details)
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   logger.debug(`Cache hit for member details: ${cacheKey}`);
    //   return cached;
    // }

    // ✅ Step 1: Verify member belongs to this business user
    const relationship = await this.model.findOne({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: new Types.ObjectId(memberId),
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    }).lean();

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Member not found or not part of your team',
      );
    }

    // ✅ Step 2: Get member user details with profile
    const memberUser = await User.findById(memberId)
      .select('name email phoneNumber gender profileImage profileId role supportMode')
      .populate('profileId', 'location dob address')
      .lean();

    if (!memberUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Member not found');
    }

    // Calculate age from DOB
    const age = memberUser.profileId?.dob
      ? Math.floor((new Date().getTime() - new Date(memberUser.profileId.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // ✅ Step 3: Get all tasks for this member with subtasks
    const tasks = await Task.find({
      assignedUserIds: memberId,
      isDeleted: false,
    })
      .select('title description status priority taskType startTime dueDate completionPercentage totalSubtasks completedSubtasks')
      .populate('assignedUserIds', 'name profileImage')
      .populate('createdById', 'name profileImage')
      .sort({ startTime: -1 })
      .lean();

    // ✅ Step 4: Get subtasks for each task
    const { SubTask } = await import('../task.module/subTask/subTask.model');
    const { SubTaskProgress } = await import('../task.module/subTaskProgress/subTaskProgress.model');

    const tasksWithSubtasks = await Promise.all(
      tasks.map(async (task: any) => {
        // Get subtasks for this task (no completedBy in SubTask schema)
        const subtasks = await SubTask.find({
          taskId: task._id,
          isDeleted: false,
        })
          .select('title isCompleted order duration completedAt')
          .sort({ order: 1 })
          .lean();

        // Get subtask progress for this child (tracks individual child's progress)
        const subtaskProgress = await SubTaskProgress.find({
          subtaskId: { $in: subtasks.map((s: any) => s._id) },
          userId: memberId,
          isDeleted: false,
        })
          .select('subtaskId isCompleted completedAt')
          .lean();

        // Create map of subtask progress
        const progressMap = new Map();
        subtaskProgress.forEach((sp: any) => {
          progressMap.set(sp.subtaskId.toString(), sp);
        });

        // Merge subtask progress
        const subtasksWithProgress = subtasks.map((subtask: any) => {
          const progress = progressMap.get(subtask._id.toString());
          return {
            ...subtask,
            isCompleted: progress?.isCompleted || subtask.isCompleted,
            completedAt: progress?.completedAt || subtask.completedAt,
          };
        });

        return {
          ...task,
          subtasks: subtasksWithProgress,
        };
      })
    );

    // ✅ Step 5: Calculate statistics
    const statistics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
      pendingTasks: tasks.filter((t: any) => t.status === 'pending').length,
      inProgressTasks: tasks.filter((t: any) => t.status === 'inProgress').length,
    };

    // ✅ Step 6: Build response
    const result = {
      member: {
        _id: memberUser._id,
        name: memberUser.name,
        email: memberUser.email,
        phoneNumber: memberUser.phoneNumber,
        gender: memberUser.gender,
        profileImage: memberUser.profileImage || { imageUrl: '/uploads/users/user.png' },
        address: memberUser.profileId?.address || '',
        dob: memberUser.profileId?.dob || null,
        age: age,
        supportMode: memberUser.supportMode || 'calm',
        roleType: relationship.isSecondaryUser ? 'Secondary' : 'Primary',
      },
      tasks: tasksWithSubtasks,
      statistics,
    };

    // ✅ Step 7: Cache the result
    await this.setInCache(cacheKey, result, 180); // 3 minutes

    logger.info(
      `Member details with tasks retrieved for member: ${memberId}`,
    );
    return result;
  }

  /** ✔️🔁 V2 NEW
   * Get member details with all tasks for member profile page - V2
   * Improved subtask handling: Uses SubTaskProgress for collaborative tasks, SubTask for personal tasks
   * Figma: teacher-parent-dashboard/team-members/all-task-of-a-member-flow.png
   *
   * @param memberId - Child user ID (member to get details for)
   * @param businessUserId - Parent/Teacher business user ID (for authorization)
   * @returns Member profile with all tasks and statistics
   */
  async getMemberDetailsWithTasksV2(
    memberId: string,
    businessUserId: string,
  ): Promise<any> {
    const cacheKey = this.getCacheKey(
      'member-details-v2',
      businessUserId,
      memberId,
    );

    // Try cache first (3 minutes for member details)
    // const cached = await this.getFromCache(cacheKey);
    // if (cached) {
    //   logger.debug(`Cache hit for member details V2: ${cacheKey}`);
    //   return cached;
    // }

    // ✅ Step 1: Verify member belongs to this business user
    const relationship = await this.model.findOne({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: new Types.ObjectId(memberId),
      status: ChildrenBusinessUserStatus.ACTIVE,
      isDeleted: false,
    }).lean();

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Member not found or not part of your team',
      );
    }

    // ✅ Step 2: Get member user details with profile
    const memberUser = await User.findById(memberId)
      .select('name email phoneNumber gender profileImage profileId role supportMode')
      .populate('profileId', 'location dob address')
      .lean();

    if (!memberUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Member not found');
    }

    // Calculate age from DOB
    const age = memberUser.profileId?.dob
      ? Math.floor((new Date().getTime() - new Date(memberUser.profileId.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;

    // ✅ Step 3: Get all tasks for this member with subtasks
    const tasks = await Task.find({
      assignedUserIds: memberId,
      isDeleted: false,
    })
      .select('title description status priority taskType startTime dueDate completionPercentage totalSubtasks completedSubtasks')
      .populate('assignedUserIds', 'name profileImage')
      .populate('createdById', 'name profileImage')
      .sort({ startTime: -1 })
      .lean();

    // ✅ Step 4: Get subtasks with smart handling based on task type
    const { SubTask } = await import('../task.module/subTask/subTask.model');
    const { SubTaskProgress } = await import('../task.module/subTaskProgress/subTaskProgress.model');

    const tasksWithSubtasks = await Promise.all(
      tasks.map(async (task: any) => {
        // Get subtasks for this task
        const subtasks = await SubTask.find({
          taskId: task._id,
          isDeleted: false,
        })
          .select('title isCompleted order duration completedAt')
          .sort({ order: 1 })
          .lean();

        // ✅ Smart subtask handling:
        // - For collaborative tasks: Use SubTaskProgress (individual progress)
        // - For personal/non-collaborative tasks: Use SubTask.isCompleted (global status)
        let subtasksWithProgress = subtasks;

        if (task.taskType === 'collaborative') {
          // Get subtask progress for this child (collaborative task)
          const subtaskProgress = await SubTaskProgress.find({
            subtaskId: { $in: subtasks.map((s: any) => s._id) },
            userId: memberId,
            isDeleted: false,
          })
            .select('subtaskId isCompleted completedAt')
            .lean();

          // Create map of subtask progress
          const progressMap = new Map();
          subtaskProgress.forEach((sp: any) => {
            progressMap.set(sp.subtaskId.toString(), sp);
          });

          // Merge subtask progress for collaborative tasks
          subtasksWithProgress = subtasks.map((subtask: any) => {
            const progress = progressMap.get(subtask._id.toString());
            return {
              ...subtask,
              isCompleted: progress?.isCompleted || false,  // Use individual progress
              completedAt: progress?.completedAt || null,
            };
          });
        } else {
          // For personal tasks, use global subtask completion status
          subtasksWithProgress = subtasks.map((subtask: any) => ({
            ...subtask,
            isCompleted: subtask.isCompleted,  // Use global status
            completedAt: subtask.completedAt,
          }));
        }

        return {
          ...task,
          subtasks: subtasksWithProgress,
        };
      })
    );

    // ✅ Step 5: Calculate statistics
    const statistics = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t: any) => t.status === 'completed').length,
      pendingTasks: tasks.filter((t: any) => t.status === 'pending').length,
      inProgressTasks: tasks.filter((t: any) => t.status === 'inProgress').length,
    };

    // ✅ Step 6: Build response
    const result = {
      member: {
        _id: memberUser._id,
        name: memberUser.name,
        email: memberUser.email,
        phoneNumber: memberUser.phoneNumber,
        gender: memberUser.gender,
        profileImage: memberUser.profileImage || { imageUrl: '/uploads/users/user.png' },
        address: memberUser.profileId?.address || '',
        dob: memberUser.profileId?.dob || null,
        age: age,
        supportMode: memberUser.supportMode || 'calm',
        roleType: relationship.isSecondaryUser ? 'Secondary' : 'Primary',
      },
      tasks: tasksWithSubtasks,
      statistics,
    };

    // ✅ Step 7: Cache the result
    await this.setInCache(cacheKey, result, 180); // 3 minutes

    logger.info(
      `Member details with tasks V2 retrieved for member: ${memberId}`,
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

  /**
   * Update child profile
   * Figma: edit-child-flow.png (Update Profile form)
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param childUserId - Child user ID to update
   * @param updateData - Fields to update (name, email, phone, gender, supportMode, location, dob, password)
   * @returns Updated child user data
   *
   * @description
   * Updates both User model fields and UserProfile model fields
   * Handles password hashing if provided
   * Invalidates Redis cache after update
   */
  async updateChildProfile(
    businessUserId: string,
    childUserId: string,
    updateData: {
      name?: string;
      email?: string;
      phoneNumber?: string;
      gender?: 'male' | 'female' | 'other';
      supportMode?: 'calm' | 'encouraging' | 'logical';
      location?: string;
      dateOfBirth?: string;
      password?: string;
      note?: string;
    },
  ): Promise<{
    user: any;
    profile: any;
    relationship: any;
  }> {
    /*-─────────────────────────────────
    |  Step 1: Verify child exists under this business user
    └──────────────────────────────────*/
    const relationship = await this.model.findOne({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      childUserId: new Types.ObjectId(childUserId),
      isDeleted: false,
    });

    if (!relationship) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'Child account not found or not associated with this business user',
      );
    }

    /*-─────────────────────────────────
    |  Step 2: Check if email already exists (if email is being updated)
    └──────────────────────────────────*/
    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email.toLowerCase(),
        _id: { $ne: new Types.ObjectId(childUserId) },
        isDeleted: false,
      });

      if (existingUser) {
        throw new ApiError(
          StatusCodes.BAD_REQUEST,
          'Email already exists. Please use a different email address.',
        );
      }
    }

    /*-─────────────────────────────────
    |  Step 3: Prepare user update data
    └──────────────────────────────────*/
    const userUpdateData: any = {};

    if (updateData.name) userUpdateData.name = updateData.name;
    if (updateData.email) userUpdateData.email = updateData.email.toLowerCase();
    if (updateData.phoneNumber) userUpdateData.phoneNumber = updateData.phoneNumber;
    if (updateData.gender) userUpdateData.gender = updateData.gender;

    // Hash password if provided
    if (updateData.password) {
      userUpdateData.password = await bcryptjs.hash(updateData.password, 12);
    }

    /*-─────────────────────────────────
    |  Step 4: Update User model
    └──────────────────────────────────*/
    const updatedUser = await User.findByIdAndUpdate(
      new Types.ObjectId(childUserId),
      userUpdateData,
      { new: true, runValidators: true },
    ).select('-password');

    if (!updatedUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    /*-─────────────────────────────────
    |  Step 5: Update UserProfile if needed
    └──────────────────────────────────*/
    let updatedProfile = null;
    const profileUpdateData: any = {};

    if (updateData.supportMode) profileUpdateData.supportMode = updateData.supportMode;
    if (updateData.location) profileUpdateData.location = updateData.location;
    if (updateData.dateOfBirth) profileUpdateData.dob = updateData.dateOfBirth;

    // Only update profile if there are profile fields to update
    if (Object.keys(profileUpdateData).length > 0) {
      updatedProfile = await (await import('../user.module/userProfile/userProfile.model')).UserProfile.findOneAndUpdate(
        { userId: new Types.ObjectId(childUserId) },
        profileUpdateData,
        { new: true, upsert: true, runValidators: true },
      );
    }

    /*-─────────────────────────────────
    |  Step 6: Update relationship note if provided
    └──────────────────────────────────*/
    if (updateData.note) {
      await this.model.findByIdAndUpdate(
        relationship._id,
        { note: updateData.note },
        { new: true },
      );
    }

    /*-─────────────────────────────────
    |  Step 7: Invalidate cache
    └──────────────────────────────────*/
    await this.invalidateCache(businessUserId, childUserId);

    logger.info(`Child profile updated: ${childUserId} by business user: ${businessUserId}`);

    /*-─────────────────────────────────
    |  Step 8: Return updated data
    └──────────────────────────────────*/
    return {
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        gender: updatedUser.gender,
        profileImage: updatedUser.profileImage,
      },
      profile: updatedProfile ? {
        supportMode: updatedProfile.supportMode,
        location: updatedProfile.location,
        dob: updatedProfile.dob,
      } : null,
      relationship: {
        _id: relationship._id,
        note: relationship.note,
        isSecondaryUser: relationship.isSecondaryUser,
        status: relationship.status,
      },
    };
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

  /** 🎓 LEARNING PURPOSE ONLY
   * Send invitation to child (child sets own password)
   * Figma: create-child-flow.png (Invitation flow variant)
   *
   * @param businessUserId - The business user sending invitation
   * @param invitationData - Child account details (without password)
   * @returns Invitation confirmation
   *
   * @description
   * 1. Verify business user exists
   * 2. Check email uniqueness
   * 3. Generate activation token
   * 4. Store token in Redis (24h TTL)
   * 5. Send invitation email with deep link
   * 6. Return confirmation
   */
  async inviteChildAccount(
    businessUserId: string,
    invitationData: {
      name: string;
      email: string;
      phoneNumber?: string;
      location?: string;
      gender?: 'male' | 'female' | 'other';
      dateOfBirth?: string;
      supportMode?: 'calm' | 'encouraging' | 'logical';
    },
  ): Promise<{
    message: string;
    expiresAt: string;
  }> {
    /*-─────────────────────────────────
    |  Step 1: Verify business user exists
    └──────────────────────────────────*/
    const businessUser = await User.findById(businessUserId).select('name email');

    if (!businessUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Business user not found');
    }

    /*-─────────────────────────────────
    |  Step 2: Check if email already exists
    └──────────────────────────────────*/
    const existingUser = await User.findOne({
      email: invitationData.email.toLowerCase(),
      isDeleted: false,
    });

    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists');
    }

    /*-─────────────────────────────────
    |  Step 3: Generate activation token
    └──────────────────────────────────*/
    const { ActivationTokenService } = await import('./activation/activation.token.service');
    const tokenService = new ActivationTokenService();

    const token = await tokenService.generateToken({
      email: invitationData.email.toLowerCase(),
      name: invitationData.name,
      businessUserId,
      childData: {
        phoneNumber: invitationData.phoneNumber,
        location: invitationData.location,
        gender: invitationData.gender,
        dateOfBirth: invitationData.dateOfBirth,
        supportMode: invitationData.supportMode,
      },
    });

    /*-─────────────────────────────────
    |  Step 4: Send invitation email
    └──────────────────────────────────*/
    try {
      const { sendInvitationEmail } = await import('../../helpers/emailService');
      
      // Send email asynchronously (don't block response)
      sendInvitationEmail(
        invitationData.email,
        invitationData.name,
        token,
        businessUser.name
      ).catch((emailError) => {
        errorLogger.error('Failed to send invitation email:', emailError);
        // Don't throw - invitation should succeed even if email fails
      });

      logger.info(`Invitation email sent to: ${invitationData.email}`);
    } catch (error) {
      errorLogger.error('Email service error:', error);
      // Don't throw - invitation should succeed even if email fails
    }

    /*-─────────────────────────────────
    |  Step 5: Return confirmation
    └──────────────────────────────────*/
    const expiresAt = new Date(Date.now() + 86400000).toISOString(); // 24 hours

    return {
      message: `Invitation sent to ${invitationData.email}. Token expires in 24 hours.`,
      expiresAt,
    };
  }
}
