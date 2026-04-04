//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import {  UserService } from './user.service';
import { User } from './user.model';
import { GenericController } from '../../_generic-module/generic.controller';
//@ts-ignore
import { Request, Response } from 'express';
import { IUser } from '../../token/token.interface';
import omit from '../../../shared/omit';
import pick from '../../../shared/pick';
import { UserProfile } from '../userProfile/userProfile.model';
import { TokenService } from '../../token/token.service';
import { AuthService } from '../../auth/auth.service';
import ApiError from '../../../errors/ApiError';
import { TRole } from '../../../middlewares/roles';
// import { enqueueWebNotification } from '../../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
// import { TNotificationType } from '../../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { NotificationService } from '../../notification.module/notification/notification.service';
import { NotificationType, NotificationChannel, NotificationPriority } from '../../notification.module/notification/notification.constant';
//@ts-ignore
import { Types } from 'mongoose';
import { ChildrenBusinessUser } from '../../childrenBusinessUser.module/childrenBusinessUser.model';

const userService = new UserService();

// TODO : IUser should be import from user.interface
export class UserController extends GenericController<
  typeof User,
  IUser
> {
  userService = new UserService();

  constructor() {
    super(new UserService(), 'User');
  }

  softDeleteById = catchAsync(async (req: Request, res: Response) => {
    // if (!req.params.id) {  //----- Better approach: validate ObjectId
    //   throw new ApiError(
    //     StatusCodes.BAD_REQUEST,
    //     `id is required for delete ${this.modelName}`
    //   );
    // }

    const id = req.params.id;
    const deletedObject = await this.userService.softDeleteById(id);
    if (!deletedObject) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Object with ID ${id} not found`
      );
    }
    //   return res.status(StatusCodes.NO_CONTENT).json({});
    sendResponse(res, {
      code: StatusCodes.OK,
      data: deletedObject,
      message: `${this.modelName} soft deleted successfully`,
    });
  });

//---------------------------------
// from previous codebase
//---------------------------------
  createAdminOrSuperAdmin = catchAsync(async (req: Request, res: Response) => {
    const payload = req.body;
    const result = await this.userService.createAdminOrSuperAdmin(payload);
    sendResponse(res, {
      code: StatusCodes.CREATED,
      data: result,
      message: `${
        payload.role === 'admin' ? 'Admin' : 'Super Admin'
      } created successfully`,
    });
  });

  sendTestingNotificationForAdmin = catchAsync(async (req: Request, res: Response) => {
    const id = (req.user as IUser).userId;

    /*-─────────────────────────────────
    |  ❌ OLD: enqueueWebNotification (Deprecated)
    |  await enqueueWebNotification(
    |    `Test notification send to admin from user id : ${id} : ${req.user.userName}`,
    |    id, // senderId
    |    null, // receiverId
    |    TRole.admin, // receiverRole
    |    TNotificationType.payment, // type
    |    null, // idOfType
    |    null, // linkFor
    |    null // linkId
    |  );
    └──────────────────────────────────*/

    // ✅ NEW: Scalable notification.module implementation
    const notificationService = new NotificationService();
    await notificationService.createNotification({
      senderId: new Types.ObjectId(id as string),
      receiverRole: 'admin',
      title: 'Test Notification',
      subTitle: `Test notification from user ${id} (${req.user.userName})`,
      type: NotificationType.SYSTEM,
      priority: NotificationPriority.NORMAL,
      channels: [NotificationChannel.IN_APP],
    });

    sendResponse(res, {
      code: StatusCodes.OK,
      data: null,
      message: `${this.modelName} retrieved successfully`,
    });
  });


  /** ---------------------------------------------- kaj Bd nd Task Management askfemi
   * @role Admin
   * @Section Settings
   * @module |
   * @figmaIndex 08-01
   * @desc Get Profile Information as logged in user
   *----------------------------------------------*/
  getById = catchAsync(async (req: Request, res: Response) => {
    const id = (req.user as IUser).userId;

    // TODO : ⚠️ need to optimize this populate options ..
    const populateOptions = [
      'profileId',
      {
        path: 'profileId',
        select: '-attachments -__v', // TODO MUST : when create profile .. must initiate address and description
        // populate: {
        //   path: 'profileId',
        // }
      }
    ];

    const select = 'name profileImage email phoneNumber role';

    const result = await this.service.getById(id, populateOptions, select);

    // if (!result) {
    //   throw new ApiError(
    //     StatusCodes.NOT_FOUND,
    //     `Object with ID ${id} not found`
    //   );
    // }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `${this.modelName} retrieved successfully`,
    });
  });


  /** ---------------------------------------------- kaj Bd nd Task Management askfemi
   * @role Admin
   * @Section Settings
   * @module |
   * @figmaIndex 08-01
   * @desc Get Profile Information as logged in user
   *----------------------------------------------*/
  getByIdV2 = catchAsync(async (req: Request, res: Response) => {
    const id = (req.user as IUser).userId;

    // TODO : ⚠️ need to optimize this populate options ..
    const populateOptions = [
      'profileId',
      {
        path: 'profileId',
        select: '-attachments -__v', // TODO MUST : when create profile .. must initiate address and description
        // populate: {
        //   path: 'profileId',
        // }
      }
    ];

    const select = 'name profileImage email phoneNumber role accountCreatorId';

    const result : any = await this.service.getById(id, populateOptions, select);

    if (!result) {
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        `Object with ID ${id} not found`
      );
    }

    const isAccountSecondary = !!(await ChildrenBusinessUser.exists({
      childUserId: id,
      parentBusinessUserId : new Types.ObjectId(result.accountCreatorId as string),
      isDeleted: false,
      isSecondaryUser : true,
    }));

    console.log(result, isAccountSecondary);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: { result, isAccountSecondary },
      message: `${this.modelName} retrieved successfully`,
    });
  });



  // send Invitation Link for a admin
  sendInvitationLinkToAdminEmail = catchAsync(async (req:Request, res:Response) => {

    const user = await User.findOne({ email : req.body.email });

    /**
     *
     * req.body.email er email jodi already taken
     * if ----
     * then we check isEmailVerified .. if false .. we make that true
     *
     * if isDeleted true then we make it false
     *
     * else ---
     *  we create new admin and send email
     *
     */

    if (user && user.isEmailVerified === false) { // previously isEmailVerified was true
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
    } else if (user && user.isDeleted === true) {
      user.isDeleted = false;
      await user.save();
    } else if (user && user.isEmailVerified === false) {
      user.isEmailVerified = true;
      await user.save();
      const token = await TokenService.createVerifyEmailToken(user);
      
    } else {
      // create new user
      if (req.body.role == TRole.subAdmin) {

        console.log("⚡ Hit because req.body.role = TRole.subAdmin");

        const response = await this.userService.createAdminOrSuperAdmin({
          email: req.body.email,
          password: req.body.password,
          role: req.body.role,
          name: req.body.name,
          phoneNumber: req.body.phoneNumber,
        });

        sendResponse(res, {
          code: StatusCodes.OK,
          data: response,
          message: `New admin created and invitation link sent successfully`,
        });
      }
    }
  });

  removeSubAdmin = catchAsync(async (req:Request, res:Response) => {

    const response = await this.userService.removeSubAdmin(req.params.id);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: response,
      message: `Account removed successfully`,
    });
  });

//---------------------------------
// Admin | Get Profile Information by Id  to approve doctor / specialist 
//---------------------------------
  getByIdForAdmin = catchAsync(async (req: Request, res: Response) => {
    const id = (req.user as IUser).userId;

    // TODO : ⚠️ need to optimize this populate options ..
    const populateOptions = [
      'profileId',
      {
        path: 'profileId',
        select: '-attachments -__v', // TODO MUST : when create profile .. must initiate address and description
        // populate: {
        //   path: 'profileId',
        // }
      }
    ];
    
    const select = 'name profileImage';

    const result = await this.service.getById(id, populateOptions, select);

    // if (!result) {
    //   throw new ApiError(
    //     StatusCodes.NOT_FOUND,
    //     `Object with ID ${id} not found`
    //   );
    // }

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `${this.modelName} retrieved successfully`,
    });
  });

//---------------------------------
// Admin | User Management With Statistics 💎✨🔍 V2 Found
//---------------------------------
  getAllWithPagination = catchAsync(async (req: Request, res: Response) => {
    const filters =  omit(req.query, ['sortBy', 'limit', 'page', 'populate']); ;
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

    const populateOptions: (string | {path: string, select: string}[]) = [
      {
        path: 'profileId',
        select: 'approvalStatus attachments',
        populate: {
          path: 'attachments',
          select: 'attachment attachmentType'
        }
      }
    ];

    const query = {};

    // Create a copy of filter without isPreview to handle separately
    const mainFilter = { ...filters };

    // Loop through each filter field and add conditions if they exist
    for (const key of Object.keys(mainFilter)) {
      if (key === 'name' && mainFilter[key] !== '') {
        query[key] = { $regex: mainFilter[key], $options: 'i' }; // Case-insensitive regex search for name
      // } else {
      } else if (mainFilter[key] !== '' && mainFilter[key] !== null && mainFilter[key] !== undefined){
        
        //---------------------------------
        // In pagination in filters when we pass empty string  it retuns all data
        //---------------------------------
        query[key] = mainFilter[key];
      }
    }

    const select = 'name email role profileImage subscriptionType'; 

    const result = await this.service.getAllWithPagination(query, options, populateOptions , select);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `All ${this.modelName} with pagination`,
      success: true,
    });
  });


  //---------------------------------
  // 🥇 This Is for User Pagination
  //---------------------------------
  getAllWithPaginationV2 = catchAsync(async (req: Request, res: Response) => {
    const filters =  omit(req.query, ['sortBy', 'limit', 'page', 'populate']); ;
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

    const result = await this.userService.getAllWithAggregation(filters, options);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `All ${this.modelName} with pagination`,
      success: true,
    });
  });

  //---------------------------------
  // 🥇 This Is for User Pagination
  //---------------------------------
  getAllWithPaginationV2WithStatistics = catchAsync(async (req: Request, res: Response) => {
    const filters =  omit(req.query, ['sortBy', 'limit', 'page', 'populate']); ;
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);
    
    const query = {};

    // Create a copy of filter without isPreview to handle separately
    const mainFilter = { ...filters };

    // Loop through each filter field and add conditions if they exist
    for (const key of Object.keys(mainFilter)) {
      if (key === 'name' && mainFilter[key] !== '') {
        query[key] = { $regex: mainFilter[key], $options: 'i' }; // Case-insensitive regex search for name
      // } else {
      } else if (mainFilter[key] !== '' && mainFilter[key] !== null && mainFilter[key] !== undefined){
        
        //---------------------------------
        // In pagination in filters when we pass empty string  it retuns all data
        //---------------------------------
        query[key] = mainFilter[key];
      }
    }

    const select = 'name email phoneNumber createdAt'; 

    // const result = await this.userService.getAllWithAggregationWithStatistics(query, options, req.user.userId/*, profileFilter*/);

    
    const result = await this.userService.getAllWithAggregationWithStatistics_V2_ProviderCountFix(query, options, req.user.userId/*, profileFilter*/);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `All ${this.modelName} with pagination`,
      success: true,
    });
  });

  // TODO : MUST : Get all providers who are not approved ..  

  //---------------------------------
  // 📈⚙️ This Is for Provider Pagination
  //---------------------------------
  getAllWithPaginationV3 = catchAsync(async (req: Request, res: Response) => {
    const filters =  omit(req.query, ['sortBy', 'limit', 'page', 'populate']); ;
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

    /*-------------------------- We done this part in service ..  using matchStage

    const query = {};

    // Create a copy of filter without isPreview to handle separately
    const mainFilter = { ...filters };

    // Loop through each filter field and add conditions if they exist
    for (const key of Object.keys(mainFilter)) {
      if (key === 'name' && mainFilter[key] !== '') {
        query[key] = { $regex: mainFilter[key], $options: 'i' }; // Case-insensitive regex search for name
      // } else {
      } else if (mainFilter[key] !== '' && mainFilter[key] !== null && mainFilter[key] !== undefined){
        
        //---------------------------------
        // In pagination in filters when we pass empty string  it retuns all data
        //---------------------------------
        query[key] = mainFilter[key];
      }
    }

    */

    const result = await this.userService.getAllWithAggregationV2(filters, /*query,*/ options/*, profileFilter*/);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `All ${this.modelName} with pagination`,
      success: true,
    });
  });


  //---------------------------------
  // Admin | Change Approval Status of Doctor / Specialist by UserId
  //---------------------------------
  changeApprovalStatusByUserId = catchAsync(async (req: Request, res: Response) => {
    // const userId = req.params.id;
    const { approvalStatus, userId } = req.query;

    const result = await this.userService.changeApprovalStatusByUserId(userId, String(approvalStatus));

    sendResponse(res, {
      code: StatusCodes.OK,
      success: true,
      message: 'Approval status updated successfully',
      data: result,
    });
  })

  //--------------------------------- kaj bd
  // User | Home Page | 03-01 | get category and popular providers also banners 
  //---------------------------------
  getCategoriesAndPopularProvidersForUser = catchAsync(async (req: Request, res: Response) => {
    const result = await this.userService.getCategoriesAndPopularProvidersForUser();
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Categories and popular providers fetched successfully',
      success: true,
    });
  })

  getPopularProvidersForUser = catchAsync(async (req: Request, res: Response) => {
    const result = await this.userService.getPopularProvidersForUser();
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Categories and popular providers fetched successfully',
      success: true,
    });
  })

  //--------------------------------- kaj bd
  // User | Home Page | 03-01 | get category and popular providers also banners 
  //---------------------------------
  getEarningAndCategoricallyBookingCountAndRecentJobRequest = catchAsync(async (req: Request, res: Response) => {
    const result = await this.userService.getEarningAndCategoricallyBookingCountAndRecentJobRequest(req.user.userId, req.query.type);
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Categories and popular providers fetched successfully',
      success: true,
    });
  })
 
  //--------------------------------- kaj bd
  // User | Profile | 06-01 | get profile information of a user 
  //---------------------------------
  getProfileInformationOfAUser = catchAsync(async (req: Request, res: Response) => {
    
    const result = await this.userService.getProfileInformationOfAUser(req.user as IUser);
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Profile information fetched successfully',
      success: true,
    });
  })
  

  updateProfileInformationOfAUser = catchAsync(async (req: Request, res: Response) => {
    
    // await UserProfile.updateMany(
    //   { "locationV2.coordinates": { $size: 0 } },
    //   { $set: { locationV2: { type: "Point", coordinates: [0, 0] } } }
    // );

    const result = await this.userService.updateProfileInformationOfAUser((req.user as IUser).userId  as string, req.body);
    
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Profile information fetched successfully',
      success: true,
    });
  })

  updateLocationTest  = catchAsync(async (req: Request, res: Response) => {
    
    // await UserProfile.updateMany(
    //   { "locationV2.coordinates": { $size: 0 } },
    //   { $set: { locationV2: { type: "Point", coordinates: [0, 0] } } }
    // );

    await UserProfile.updateMany(
      { "locationV2.coordinates": { $size: 0 } },
      { $unset: { locationV2: "" } }
    )

    
    sendResponse(res, {
      code: StatusCodes.OK,
      data: null,
      message: 'done',
      success: true,
    });
  })

  updateProfileInformationOfAdmin = catchAsync(async (req: Request, res: Response) => {
    
    req.body.profileImage = req.uploadedFiles.profileImage; // it actually returns array of string

    const data = req.body;
    
    const result = await this.userService.updateProfileInformationOfAdmin((req.user as IUser).userId  as string, data);
    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Profile information fetched successfully',
      success: true,
    });
  })

  updateProfileImageSeparately = catchAsync(async (req: Request, res: Response) => {
    const id = req.user.userId;
    req.body.profileImage = req.uploadedFiles.profileImage; // it actually returns array of string

    const data = req.body;

    const result = await this.userService.updateProfileImageSeperately(id, data);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: `${this.modelName} updated successfully`,
      success: true,
    });

  });

  // ────────────────────────────────────────────────────────────────────────
  // Support Mode & Notification Preferences
  // ────────────────────────────────────────────────────────────────────────

  /** ----------------------------------------------
   * @role User
   * @Section Profile
   * @module UserProfile
   * @figmaIndex 06-03
   * @desc Get user's support mode preference
   *----------------------------------------------*/
  getSupportMode = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await this.userService.getSupportMode(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Support mode retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Profile
   * @module UserProfile
   * @figmaIndex 06-03
   * @desc Update user's support mode preference
   *----------------------------------------------*/
  updateSupportMode = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;
    const { supportMode } = req.body;

    const result = await this.userService.updateSupportMode(userId, supportMode);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Support mode updated successfully',
      success: true,
    });
  });

  /** ----------------------------------------------✔️
   * @role Business | Parent | Task Details | task-details-flow-apis.png | Update child's support mode
   * @Section Profile
   * @module UserProfile
   * @figmaIndex task-details-flow-apis.png
   * @desc Parent updates their child's support mode preference
   *----------------------------------------------*/
  updateChildSupportMode = catchAsync(async (req: Request, res: Response) => {
    const { childUserId, supportMode } = req.body;

    const result = await this.userService.updateChildSupportMode(childUserId, supportMode);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Child support mode updated successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role User
   * @Section Profile
   * @module UserProfile
   * @figmaIndex 06-03
   * @desc Update user's notification style preference
   *----------------------------------------------*/
  updateNotificationStyle = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;
    const { notificationStyle } = req.body;

    const result = await this.userService.updateNotificationStyle(userId, notificationStyle);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Notification style updated successfully',
      success: true,
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // Preferred Time Management
  // ────────────────────────────────────────────────────────────────────────

  /** ----------------------------------------------
   * @role Child | Business | User
   * @Section Profile
   * @module User
   * @figmaIndex profile-permission-account-interface.png
   * @desc Get user's preferred working time for tasks
   *----------------------------------------------*/
  getPreferredTime = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;

    const result = await this.userService.getPreferredTime(userId);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Preferred time retrieved successfully',
      success: true,
    });
  });

  /** ----------------------------------------------
   * @role Child | Business | User
   * @Section Profile
   * @module User
   * @figmaIndex profile-permission-account-interface.png
   * @desc Update user's preferred working time for tasks
   * @validation HH:mm format (24-hour), range: 05:00-23:00
   *----------------------------------------------*/
  updatePreferredTime = catchAsync(async (req: Request, res: Response) => {
    const userId = (req.user as IUser).userId;
    const { preferredTime } = req.body;

    const result = await this.userService.updatePreferredTime(userId, preferredTime);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Preferred time updated successfully',
      success: true,
    });
  });

  /**
   * Get all users for admin dashboard with pagination, search, and filters
   * Figma: main-admin-dashboard/user-list-flow.png
   */
  getAllUsersForAdminDashboard = catchAsync(async (req: Request, res: Response) => {
    const filters = {
      search: req.query.search as string,
      role: req.query.role as string,
      from: req.query.from as string,
      to: req.query.to as string,
    };

    const options = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      sortBy: req.query.sortBy as string || '-createdAt',
    };

    const result = await this.userService.getAllUsersForAdminDashboard(filters, options);

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'Users retrieved successfully for admin dashboard',
      success: true,
    });
  });

  /**
   * Get user registration count for chart (monthly or yearly)
   * Figma: main-admin-dashboard/user-list-flow.png
   */
  getUserRegistrationCountForChart = catchAsync(async (req: Request, res: Response) => {
    const { type = 'monthly' } = req.query;
    
    const result = await this.userService.getUserRegistrationCountForChart(
      type as 'monthly' | 'yearly'
    );

    sendResponse(res, {
      code: StatusCodes.OK,
      data: result,
      message: 'User registration count retrieved successfully',
      success: true,
    });
  });
}


