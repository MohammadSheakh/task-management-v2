//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { PaginateOptions } from '../../../types/paginate';
import { IUpdateUserInfo, IUser } from './user.interface';
import { IUser as IUserFromToken } from '../../token/token.interface';
import { User } from './user.model';
import { sendAdminOrSuperAdminCreationEmail } from '../../../helpers/emailService';
import { GenericService } from '../../_generic-module/generic.services';
import PaginationService from '../../../common/service/paginationService';
import omit from '../../../shared/omit';
import pick from '../../../shared/pick';
import { UserProfile } from '../userProfile/userProfile.model';
import { IUserProfile } from '../userProfile/userProfile.interface';
//@ts-ignore
import mongoose from 'mongoose';
import {
  startOfWeek,
  startOfMonth,
  startOfYear,
  getDaysInMonth,
  format,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';

import {
  endOfMonth,
  subMonths
} from 'date-fns';

//@ts-ignore
import bcryptjs from 'bcryptjs';

import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';

// User cache configuration
const USER_CACHE_CONFIG = {
  PROFILE_TTL: 300,        // 5 minutes
  STATISTICS_TTL: 600,     // 10 minutes
  OVERVIEW_TTL: 300,       // 5 minutes
} as const;

import { Attachment } from '../../attachments/attachment.model';
import { IAttachment } from '../../attachments/attachment.interface';
import { TAdminStatus } from '../userRoleData/userRoleData.constant';


interface IAdminOrSuperAdminPayload {
  email: string;
  password: string;
  name : string;
  role: string;
  message?: string;
  phoneNumber : string;
}

export class UserService extends GenericService<typeof User, IUser> {
  constructor() {
    super(User);
  }

  async softDeleteById(id: string) {

    const object = await this.model.findById(id).select('-__v');

    if (!object) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'No Object Found');
      //   return null;
    }

    if (object.isDeleted === true) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Item already deleted');
    }

    return await this.model.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt : new Date() },
      { new: true }
    );
  }

  createAdminOrSuperAdmin = async (payload: IAdminOrSuperAdminPayload): Promise<IUser> => {

    const existingUser = await User.findOne({ email: payload.email });

    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This email already exists');
    }

    const createProfile:IUserProfile = await UserProfile.create({
      acceptTOC: true
    })

    //send email for the new admin or super admin via email service
    
    sendAdminOrSuperAdminCreationEmail(
      payload.email,
      payload.role,
      payload.password,
      payload.message
    );

    payload.password = await bcryptjs.hash(payload.password, 12);

    const result:IUser = await User.create({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      isEmailVerified: true,
      phoneNumber: payload.phoneNumber,
      profileId: createProfile._id
    });

    await UserProfile.create({
      adminStatus: TAdminStatus.active,
      userId: result._id,
    })

    return result;
  };

  removeSubAdmin = async (subAdminId: string): Promise<IUser> => {

    const existingUser:IUser | null = await User.findByIdAndUpdate(
      { _id: subAdminId },
      {
        isEmailVerified: false,
        isDeleted: true,
      },
      {
        new: true
      }
    );

    if (!existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This User is not found');
    }

    await UserProfile.findOneAndUpdate(
      { userId: existingUser._id },
      {
        adminStatus: TAdminStatus.inactive,
      },
      {
        new: true
      }
    )
    return existingUser;
  };

  //--------------------------------- kaj bd
  // User | Profile | 06-01 | get profile information of a user
  //---------------------------------
  getProfileInformationOfAUser = async (loggedInUser: IUserFromToken) => {
    //-- name, email, phoneNumber from User table ..
    //-- location, dob and gender from UserProfile table

    //-- serviceName and rating from Service Provider Or Service Provider Details table
    const id = loggedInUser.userId
    const cacheKey = `user:${id}:profile`;

    // 🔒 Try cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        logger.debug(`Cache hit for user profile: ${cacheKey}`);
        return JSON.parse(cached);
      }
    } catch (error) {
      errorLogger.error('Redis GET error in getProfileInformationOfAUser:', error);
      // Continue without cache
    }

    // Cache miss - query database
    const user = await User.findById(id).select('name email phoneNumber profileImage').lean();
    const userProfile =  await UserProfile.findOne({
      userId: id
    }).select('location dob gender').lean();

    const result = {
      ...user,
      ...userProfile
    };

    // 🔒 Cache the result
    try {
      await redisClient.setEx(
        cacheKey,
        USER_CACHE_CONFIG.PROFILE_TTL,  // 5 minutes
        JSON.stringify(result)
      );
      logger.debug(`User profile cached: ${cacheKey}`);
    } catch (error) {
      errorLogger.error('Redis SET error in getProfileInformationOfAUser:', error);
      // Don't throw - profile retrieval should succeed even if caching fails
    }

    return result;
  };



  

  // ☑️☑️☑️☑️☑️☑️☑️☑️
  async getAllWithAggregationWithStatistics_V2_ProviderCountFix(
      filters: any, 
      options: PaginateOptions,
      userId: String, // logged in User .. For this case .. Admin Id
      
    ) {

       // Separate general filters and profile-specific filters
  const generalFilters = omit(filters, ['approvalStatus']); // Exclude profile-specific fields
      
    // 📈⚙️ OPTIMIZATION:
    const pipeline = [
        // Step 1: Match users based on filters
        ...(Object.keys(filters).length > 0 ? [{ $match: generalFilters }] : []),
        
        // Step 2: Lookup profile information
        {
            $lookup: {
                from: 'userprofiles', // Collection name (adjust if different)
                localField: 'profileId',
                foreignField: '_id',
                as: 'profileInfo'
            }
        },
        
        // Step 3: Unwind profile array (convert array to object)
        {
            $unwind: {
                path: '$profileInfo',
                preserveNullAndEmptyArrays: true // Keep users without profiles
            }
        },

        // Step 5: Project the required fields
        {
            $project: {
                _id: 1,
                name: 1,
                email: 1,
                phoneNumber: 1,
                role: 1,
                profileId: 1,
                createdAt: 1,
                // Add approval status from profile
                dob: '$profileInfo.dob',
                // Optionally include other profile fields
                gender: '$profileInfo.gender',
                location: '$profileInfo.location'
            }
        },
    ];

    // 📈⚙️ OPTIMIZATION: Get role-based statistics first
    const statisticsPipeline = [
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        }
    ];


    // 📈⚙️ OPTIMIZATION: Get total service booking count
    const serviceBookingStatPipeline = [
      {
        $group: {
            _id: null,
            count: { $sum: 1 }
        }
      }
    ];
  }




  updateProfileInformationOfAUser = async (id: string, data:IUpdateUserInfo) => {
    //-- name, email, phoneNumber from User table ..
    //-- location, dob and gender from UserProfile table

    const updateUser:IUser | null  = await User.findByIdAndUpdate(id, {
      name: data.name,
      // email: data.email, // email can not be updated
      phoneNumber: data.phoneNumber
    },{ new: true }).lean()

    const updateUserProfile:IUserProfile | any = await UserProfile.findOne(
      {
        userId: id
      }
    );

    if(data.dob){
      updateUserProfile.dob = data.dob;
    }

    if(data.location){
      updateUserProfile.location = data.location;
    }

    const res =  await updateUserProfile.save();

    // 🔒 Invalidate cache after update
    try {
      const cacheKey = `user:${id}:profile`;
      await redisClient.del(cacheKey);
      logger.info(`User profile cache invalidated: ${cacheKey}`);
    } catch (error) {
      errorLogger.error('Cache invalidation error:', error);
    }

    return {
      ...updateUser,
      ...res.toObject()
    };
  };

  updateProfileInformationOfAdmin = async (id: string, data:IUpdateUserInfo) => {
    //-- name, email, phoneNumber from User table ..

    const user:IUser = await User.findById(id).select("name profileImage");

    // if (!data?.profileImage[0]) {
    //   throw new ApiError(StatusCodes.NOT_FOUND, 'You have to upload an image to update');
    // }

    const attachmentUrl:IAttachment | null = await Attachment.findById(data?.profileImage[0]);


    const updateUser:IUser | null  = await User.findByIdAndUpdate(id, {
      name: data.name,
      profileImage : {
        imageUrl: attachmentUrl?.attachment ? attachmentUrl?.attachment : user?.profileImage?.imageUrl,
      },
      phoneNumber: data.phoneNumber
    },{ new: true }).lean()

    
    return {
      ...updateUser
    };
  };


  async updateProfileImageSeperately(userId: string, data: any): Promise<any> {
    
    const user:IUser = await User.findById(userId).select("name profileImage");

    console.log("data service  data?.profileImage[0] -> ", data?.profileImage[0]);

    if (!data?.profileImage[0]) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'You have to upload an image to update');
    }

    const attachmentUrl:IAttachment | null = await Attachment.findById(data?.profileImage[0]);
    // console.log("user -> ", user);
  
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        profileImage : {
          imageUrl: attachmentUrl?.attachment ? attachmentUrl?.attachment : user?.profileImage?.imageUrl,
        }
      }, 
      { new: true }
    );

    if (!updatedUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found while update');
    }

    return {
      updatedUser
    }

  }


  async getAllWithPagination(
    filters: any, // Partial<INotification> // FixMe : fix type
    options: PaginateOptions,
    populateOptions?: any,
    select ? : string | string[]
  ) {
    const result = await this.model.paginate(filters, options, populateOptions, select);

    return result;
  }

  //---------------------------------kaj bd
  //  Admin | User Management With Statistics
  //---------------------------------
  async getAllWithAggregationWithStatistics(
      filters: any, 
      options: PaginateOptions,
      userId: String, // logged in User .. For this case .. Admin Id
      
    ) {

       // Separate general filters and profile-specific filters
  const generalFilters = omit(filters, ['approvalStatus']); // Exclude profile-specific fields
      
    // 📈⚙️ OPTIMIZATION:
    const pipeline = [
        // Step 1: Match users based on filters
        ...(Object.keys(filters).length > 0 ? [{ $match: generalFilters }] : []),
        
        // Step 2: Lookup profile information
        {
            $lookup: {
                from: 'userprofiles', // Collection name (adjust if different)
                localField: 'profileId',
                foreignField: '_id',
                as: 'profileInfo'
            }
        },
        
        // Step 3: Unwind profile array (convert array to object)
        {
            $unwind: {
                path: '$profileInfo',
                preserveNullAndEmptyArrays: true // Keep users without profiles
            }
        },

        // Step 5: Project the required fields
        {
            $project: {
                _id: 1,
                name: 1,
                email: 1,
                phoneNumber: 1,
                role: 1,
                profileId: 1,
                createdAt: 1,
                // Add approval status from profile
                dob: '$profileInfo.dob',
                // Optionally include other profile fields
                gender: '$profileInfo.gender',
                location: '$profileInfo.location'
            }
        },
    ];

    // 📈⚙️ OPTIMIZATION: Get role-based statistics first
    const statisticsPipeline = [
        {
            $group: {
                _id: '$role',
                count: { $sum: 1 }
            }
        }
    ];


    // 📈⚙️ OPTIMIZATION: Get total service booking count
    const serviceBookingStatPipeline = [
      {
        $group: {
            _id: null,
            count: { $sum: 1 }
        }
      }
    ];

    // lets calculate total revenue for admin

    //------- calculate this months and last months providers count
    // also calculate percentage { (newVal - oldVal) / old } * 100
    // result minus means decreased , positive means increment
    //------ do same thing for user also .. 

    async function calculateCurrentAndLastMonthsUserCountByRole(role : string) {
        const now = new Date();
        const monthStart = startOfMonth(now);

        const lastMonthStart = startOfMonth(subMonths(now, 1));
        const lastMonthEnd = endOfMonth(subMonths(now, 1));

        const baseQuery = { isDeleted: false, role };
        
            const [
              allCount,
              thisMonthEarnings,
              lastMonthEarnings,
            ] = await Promise.all([

              // All Count
              User.aggregate([
                { $match: { ...baseQuery } },
                {
                  $group: {
                    _id: null,
                    // total: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),
              
              // This month earnings
              User.aggregate([
                { $match: { ...baseQuery, createdAt: { $gte: monthStart } } },
                {
                  $group: {
                    _id: null,
                    // total: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),
        
              // Last month earnings
              User.aggregate([
                {
                  $match: {
                    ...baseQuery,
                    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
                  },
                },
                {
                  $group: {
                    _id: null,
                    // total: { $sum: '$amount' },
                    count: { $sum: 1 },
                  },
                },
              ]),
            ]);
        
            // Calculate growth percentages
            
            
            const thisMonthTotal = thisMonthEarnings[0]?.count || 0;
            const lastMonthTotal = lastMonthEarnings[0]?.count || 0;
            const monthlyGrowth =
              lastMonthTotal > 0
                ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
                : 0;

        return {
            allCount : allCount[0]?.count || 0,
            thisMonthTotal,
            lastMonthTotal,
            monthlyGrowth
        };
    }
  }

  //---------------------------------kaj bd
  //  Admin | User Management
  //---------------------------------
  async getAllWithAggregation(
      filters: any, // Partial<INotification> // FixMe : fix type
      options: PaginateOptions,
      // profileFilter: any = {}
    ) {

    const userMatchStage: any = {};

    userMatchStage.createdAt = {};


    // Dynamically apply filters
    for (const key in filters) {
      const value = filters[key];
      if (value === '' || value === null || value === undefined) continue;
      // --- Match for Users collection ---
      if (['_id', 'from', 'to', 'role', 'name', 'isDeleted'].includes(key)) {
        if (key == '_id') {
          userMatchStage[key] = new mongoose.Types.ObjectId(value);
        }else if (key.trim() === "from") {
          userMatchStage.createdAt.$gte = new Date(filters[key]);
        }
        else if (key == 'to') {
          userMatchStage.createdAt.$lte = new Date(filters[key]);
        }else if (key === 'name') {
          userMatchStage[key] = { $regex: value, $options: 'i' }; // case-insensitive
        }
        else {
          userMatchStage[key] = value;
        }
      }
    }  

    if (Object.keys(userMatchStage.createdAt).length === 0) {
      delete userMatchStage.createdAt;
    }

    // 📈⚙️ OPTIMIZATION:
    const pipeline = [
      // ✅ Step 1: Filter users before lookup
      { $match: userMatchStage },

      // Step 2: Lookup profile information
      {
          $lookup: {
              from: 'userprofiles', // Collection name (adjust if different)
              localField: 'profileId',
              foreignField: '_id',
              as: 'profileInfo'
          }
      },
      
      // Step 3: Unwind profile array (convert array to object)
      {
          $unwind: {
              path: '$profileInfo',
              preserveNullAndEmptyArrays: true // Keep users without profiles
          }
      },

      // Step 5: Project the required fields
      {
          $project: {
              _id: 1,
              name: 1,
              email: 1,
              profileImage: 1,
              phoneNumber: 1,
              role: 1,
              profileId: 1,
              createdAt: 1,
              // Add approval status from profile
              dob: '$profileInfo.dob',
              // Optionally include other profile fields
              gender: '$profileInfo.gender',
              location: '$profileInfo.location'
          }
      },        
    ];

    // Use pagination service for aggregation
     const res =
      await PaginationService.aggregationPaginate(
      User, 
      pipeline,
      options
    );

    return {
      ...res
    }
  }


  //--------------------------------- kaj bd
  //  Admin | Provider Management
  //---------------------------------
  async getAllWithAggregationV2(
      filters: any,
      options: PaginateOptions,
    ) {

   /*-----------------------------------------   
   const matchStage: any = {};

   // TODO : MUST : created At filter add korte hobe ..

    // Dynamically apply filters
    for (const key in filters) {
      if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
        if (key === 'name') {
          matchStage[key] = { $regex: filters[key], $options: 'i' }; // Case-insensitive search
        } else if (Array.isArray(filters[key])) {
          // Allow multiple values, e.g. role=['admin','user']
          matchStage[key] = { $in: filters[key] };
        } else {
          matchStage[key] = filters[key];
        }
      }
    }
    --------------------------------------------*/

    const userMatchStage: any = {};
    userMatchStage.createdAt = {};
    const roleDataMatchStage: any = {};

    // Dynamically apply filters
    for (const key in filters) {

      const value = filters[key];

      if (value === '' || value === null || value === undefined) continue;

      // --- Match for Users collection ---
      if (['name', 'email', 'phoneNumber', 'role', '_id', 'from', 'to'].includes(key)) {
        if (key === 'name') {
          userMatchStage[key] = { $regex: value, $options: 'i' }; // case-insensitive
        }  // --- (optional) Handle date filtering ---
        else if (key.trim() === "from") {
          userMatchStage.createdAt.$gte = new Date(filters[key]);
        }
        else if (key == 'to') {
          userMatchStage.createdAt.$lte = new Date(filters[key]);
        }
        else if (Array.isArray(value)) {
          userMatchStage[key] = { $in: value };
        }else if (key == '_id') {
          userMatchStage[key] = new mongoose.Types.ObjectId(value);
        } else {
          userMatchStage[key] = value;
        }
      }

      // --- Match for userroledatas (joined collection) ---
      else if (key === 'providerApprovalStatus') {
        if (Array.isArray(value)) {
          roleDataMatchStage['userRoleDataInfo.providerApprovalStatus'] = { $in: value };
        } else {
          roleDataMatchStage['userRoleDataInfo.providerApprovalStatus'] = value;
        }
      }
    }

    if (Object.keys(userMatchStage.createdAt).length === 0) {
      delete userMatchStage.createdAt;
    }

    // console.log("userMatchStage :: ", userMatchStage)
   
    // 📈⚙️ OPTIMIZATION:
    const pipeline = [
      
      // ✅ Step 1: Filter users before lookup
      // { $match: matchStage },
      { $match: userMatchStage },

        // Step 2: Lookup profile information
        {
          $lookup: {
            from: 'userprofiles', // Collection name (adjust if different)
            localField: 'profileId',
            foreignField: '_id',
            as: 'profileInfo'
          }
        },
        
        // Step 3: Unwind profile array (convert array to object)
        {
          $unwind: {
            path: '$profileInfo',
            preserveNullAndEmptyArrays: true // Keep users without profiles
          }
        },

        //---------------------------------

        // Step 2: Lookup ServiceProviderDetails information
        {
          $lookup: {
            from: 'serviceproviders', // Collection name (adjust if different)
            localField: '_id',
            foreignField: 'providerId',
            as: 'serviceProviderDetails'
          }
        },
        
        // Step 3: Unwind profile array (convert array to object)
        {
          $unwind: {
            path: '$serviceProviderDetails',
            preserveNullAndEmptyArrays: true // Keep users without profiles
          }
        },

        //--------- look up user role data for providerApprovalStatus -----
        {
          $lookup: {
            from: 'userroledatas', // Collection name (adjust if different)
            localField: '_id',
            foreignField: 'userId',
            as: 'userRoleDataInfo'
          }
        },
        
        // Step 3: Unwind profile array (convert array to object)
        {
          $unwind: {
            path: '$userRoleDataInfo',
            preserveNullAndEmptyArrays: true // Keep users without profiles
          }
        },

        // ✅ Step 4: Match joined userRoleDataInfo fields
        ...(Object.keys(roleDataMatchStage).length > 0 ? [{ $match: roleDataMatchStage }] : []),


        // 2. Lookup front-side certificate attachments
        {
          $lookup: {
            from: 'attachments',
            localField: 'profileInfo.frontSideCertificateImage',
            foreignField: '_id',
            as: 'frontAttachments'
          }
        },
        // 3. Lookup back-side
        {
          $lookup: {
            from: 'attachments',
            localField: 'profileInfo.backSideCertificateImage',
            foreignField: '_id',
            as: 'backAttachments'
          }
        },
        // 4. Lookup face images
        {
          $lookup: {
            from: 'attachments',
            localField: 'profileInfo.faceImageFromFrontCam',
            foreignField: '_id',
            as: 'faceAttachments'
          }
        },


        // Step 5: Project the required fields
        {
            $project: {
                _id: 1,
                name: 1,
                email: 1,
                phoneNumber: 1,
                profileImage:1,
                role: 1,
                profileId: 1,
                createdAt: 1,


                serviceName: '$serviceProviderDetails.serviceName',

                // Add approval status from profile
                dob: '$profileInfo.dob',
                // Optionally include other profile fields
                gender: '$profileInfo.gender',
                location: '$profileInfo.location',
                providerApprovalStatus: '$userRoleDataInfo.providerApprovalStatus',  // -------------
                // frontSideCertificateImage: '$profileInfo.frontSideCertificateImage',
                // backSideCertificateImage: '$profileInfo.backSideCertificateImage',
                // faceImageFromFrontCam: '$profileInfo.faceImageFromFrontCam'

                frontSideCertificateImage: {
                  $map: { input: '$frontAttachments', as: 'att', in: '$$att.attachment' }
                },
                backSideCertificateImage: {
                  $map: { input: '$backAttachments', as: 'att', in: '$$att.attachment' }
                },
                faceImageFromFrontCam: {
                  $map: { input: '$faceAttachments', as: 'att', in: '$$att.attachment' }
                }
            }
        },
    ];


    // Use pagination service for aggregation
     const res =
      await PaginationService.aggregationPaginate(
      User, 
      pipeline,
      options
    );


    // console.log("res :: ", res)




    return {
      // statistics,
      ...res
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Support Mode & Notification Preferences
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get user's support mode
   * @param userId - User ID
   * @returns Support mode and notification preferences
   */
  async getSupportMode(userId: string) {
    const userProfile = await UserProfile.findOne({ userId }).select(
      'supportMode notificationStyle updatedAt'
    );

    if (!userProfile) {
      // Create default profile if not exists
      const newProfile = await UserProfile.create({
        userId,
        supportMode: 'calm',
        notificationStyle: 'gentle',
      });

      return {
        userId,
        supportMode: newProfile.supportMode,
        notificationStyle: newProfile.notificationStyle,
        updatedAt: newProfile.updatedAt,
      };
    }

    return {
      userId,
      supportMode: userProfile.supportMode || 'calm',
      notificationStyle: userProfile.notificationStyle || 'gentle',
      updatedAt: userProfile.updatedAt,
    };
  }

  /**
   * Update user's support mode
   * @param userId - User ID
   * @param supportMode - New support mode
   * @returns Updated support mode info
   */
  async updateSupportMode(userId: string, supportMode: string) {
    const userProfile = await UserProfile.findOneAndUpdate(
      { userId },
      { supportMode },
      { new: true, upsert: true }
    ).select('supportMode notificationStyle updatedAt');

    return {
      userId,
      supportMode: userProfile.supportMode,
      notificationStyle: userProfile.notificationStyle,
      updatedAt: userProfile.updatedAt,
    };
  }

  /**
   * Update child's support mode (for parent/teacher)
   * @param childUserId - Child user ID
   * @param supportMode - New support mode
   * @returns Updated support mode info
   * @access Parent/Business users only
   */
  async updateChildSupportMode(childUserId: string, supportMode: string) {
    const userProfile = await UserProfile.findOneAndUpdate(
      { userId: childUserId },
      { supportMode },
      { new: true, upsert: true }
    ).select('userId supportMode notificationStyle updatedAt');

    return {
      userId: userProfile.userId,
      supportMode: userProfile.supportMode,
      notificationStyle: userProfile.notificationStyle,
      updatedAt: userProfile.updatedAt,
    };
  }

  /**
   * Update user's notification style
   * @param userId - User ID
   * @param notificationStyle - New notification style
   * @returns Updated notification preferences
   */
  async updateNotificationStyle(userId: string, notificationStyle: string) {
    const userProfile = await UserProfile.findOneAndUpdate(
      { userId },
      { notificationStyle },
      { new: true, upsert: true }
    ).select('supportMode notificationStyle updatedAt');

    return {
      userId,
      supportMode: userProfile.supportMode,
      notificationStyle: userProfile.notificationStyle,
      updatedAt: userProfile.updatedAt,
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // Preferred Time Management
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get user's preferred working time
   * @param userId - User ID
   * @returns Preferred time in HH:mm format
   * @see Figma: profile-permission-account-interface.png (Preferred Time section)
   */
  async getPreferredTime(userId: string) {
    const user = await User.findById(userId).select('preferredTime').lean();

    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'User not found'
      );
    }

    return {
      userId,
      preferredTime: user.preferredTime || '07:00',
    };
  }

  /**
   * Update user's preferred working time
   * @param userId - User ID
   * @param preferredTime - New preferred time in HH:mm format (24-hour)
   * @returns Updated preferred time info
   * @see Figma: profile-permission-account-interface.png (Preferred Time section)
   */
  async updatePreferredTime(userId: string, preferredTime: string) {
    const user = await User.findByIdAndUpdate(
      userId,
      { preferredTime },
      { new: true, runValidators: true }
    ).select('preferredTime updatedAt');

    if (!user) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        'User not found'
      );
    }

    return {
      userId,
      preferredTime: user.preferredTime,
      updatedAt: user.updatedAt,
    };
  }



/*********
const getAllUsers = async (
  filters: Record<string, any>,
  options: PaginateOptions
): Promise<PaginateResult<IUser>> => {
  const query: Record<string, any> = {};
  if (filters.userName) {
    query['first_name'] = { $regex: filters.userName, $options: 'i' };
  }
  if (filters.email) {
    query['email'] = { $regex: filters.email, $options: 'i' };
  }
  if (filters.role) {
    query['role'] = filters.role;
  }
  return await User.paginate(query, options);
};

********** */

  /**
   * Get all users with pagination, search, and filters for admin dashboard
   * Figma: main-admin-dashboard/user-list-flow.png
   * 
   * @param filters - Query filters
   * @param options - Pagination options
   * @returns Paginated users with statistics
   */
  async getAllUsersForAdminDashboard(
    filters: {
      search?: string;           // Search by username or email
      role?: string;             // Filter by role: 'individual' | 'child' | 'business' | 'admin'
      from?: string;             // Start date (ISO format)
      to?: string;               // End date (ISO format)
    },
    options: {
      page: number;
      limit: number;
      sortBy?: string;
    }
  ) {
    const query: any = { isDeleted: false };

    // Search by username or email
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Filter by role
    if (filters.role && filters.role !== 'all') {
      query.role = filters.role;
    }

    // Filter by date range
    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) {
        query.createdAt.$gte = new Date(filters.from);
      }
      if (filters.to) {
        query.createdAt.$lte = new Date(filters.to);
      }
    }

    const result = await User.paginate(query, {
      page: options.page,
      limit: options.limit,
      sortBy: options.sortBy || '-createdAt',
      populate: [
        { path: 'profileId', select: 'location phoneNumber' },
      ],
      lean: true,
    });

    return result;
  }

  /**
   * Get user registration count for chart (monthly or yearly)
   * Figma: main-admin-dashboard/user-list-flow.png (User ratio chart)
   * 
   * @param type - 'monthly' or 'yearly'
   * @returns Chart data with user counts
   */
  async getUserRegistrationCountForChart(
    type: 'monthly' | 'yearly' = 'monthly'
  ) {
    const now = new Date();

    if (type === 'monthly') {
      // Get monthly data for current year
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);

      const monthlyData = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart, $lte: yearEnd },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]);

      // Fill in missing months with 0
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dataMap = new Map(monthlyData.map((d: any) => [d._id.month, d.count]));
      
      const data = monthNames.map((name, index) => ({
        period: (index + 1).toString(),
        label: name,
        count: dataMap.get(index + 1) || 0,
      }));

      const totalUsers = data.reduce((sum, d) => sum + d.count, 0);
      
      // Calculate growth rate
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      const lastYearTotal = await User.countDocuments({
        createdAt: { $gte: lastYearStart, $lte: lastYearEnd },
        isDeleted: false,
      });
      
      const growthRate = lastYearTotal > 0 
        ? ((totalUsers - lastYearTotal) / lastYearTotal) * 100 
        : 0;

      return {
        type: 'monthly',
        data,
        totalUsers,
        growthRate,
      };
    } else {
      // Get yearly data (last 5 years)
      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

      const yearlyData = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: fiveYearsAgo },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1 } },
      ]);

      const data = yearlyData.map((d: any) => ({
        period: d._id.year.toString(),
        label: d._id.year.toString(),
        count: d.count,
      }));

      const totalUsers = data.reduce((sum, d) => sum + d.count, 0);
      
      // Calculate growth rate
      const thisYear = data.find(d => d.period === now.getFullYear().toString())?.count || 0;
      const lastYear = data.find(d => d.period === (now.getFullYear() - 1).toString())?.count || 0;
      const growthRate = lastYear > 0 ? ((thisYear - lastYear) / lastYear) * 100 : 0;

      return {
        type: 'yearly',
        data,
        totalUsers,
        growthRate,
      };
    }
  }
}

