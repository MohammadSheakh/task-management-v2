//@ts-ignore
import express from 'express';
import fileUploadHandler from '../../../shared/fileUploadHandler';
import convertHeicToPngMiddleware from '../../../shared/convertHeicToPngMiddleware';
import { UserController } from './user.controller';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import auth from '../../../middlewares/auth';
import { IUser } from './user.interface';
import { TRole } from '../../../middlewares/roles';
import validateRequest from '../../../shared/validateRequest';
const UPLOADS_FOLDER = 'uploads/users';
const upload = fileUploadHandler(UPLOADS_FOLDER);
import * as validation from './user.validation';
import { setRequestFiltersV2, setRequstFilterAndValue } from '../../../middlewares/setRequstFilterAndValue';
import { imageUploadPipelineForUpdateUserProfile, verifyChildBelongsToBusinessUser } from './user.middleware';
import { IsProviderRejected } from '../../../middlewares/provider/IsProviderRejected';

export const optionValidationChecking = <T extends keyof IUser | 'sortBy' | 'page' | 'limit' | 'populate' | 'from' | 'to' | 'providerApprovalStatus'>(
  filters: T[]
) => {
  return filters;
};

const paginationOptions: Array<'sortBy' | 'page' | 'limit' | 'populate'> = [
  'sortBy',
  'page',
  'limit',
  'populate',
];

const router = express.Router();

// const taskService = new TaskService();
const controller = new UserController();

//--------------------------------- kaj-bd
// Admin | 02-01 | Get All Users from Users Table With Statistics
//---------------------------------
router.route('/paginate').get(
  auth(TRole.admin),
  validateFiltersForQuery(optionValidationChecking(['_id', 'name', 'createdAt', 'role', ...paginationOptions])),
  setRequstFilterAndValue('role', 'user'),
  controller.getAllWithPaginationV2WithStatistics
);

/*-───────────────────────────────── e-learning
|  Admin | 04-02 | Get All students from Users Table
└──────────────────────────────────*/
router.route('/paginate/for-student').get(
  auth(TRole.admin),
  validateFiltersForQuery(optionValidationChecking(['_id', 'name', 'createdAt', 'from', 'to', ...paginationOptions])),
  setRequstFilterAndValue('role', 'student'),
  controller.getAllWithPaginationV2
);

/*-───────────────────────────────── e-learning
|  Admin | 04-03 | Get All mentors from Users Table
└──────────────────────────────────*/
router.route('/paginate/for-mentor').get(
  auth(TRole.admin),
  validateFiltersForQuery(optionValidationChecking(['_id', 'name', 'createdAt', 'from', 'to', ...paginationOptions])),
  setRequstFilterAndValue('role', 'mentor'),
  controller.getAllWithPaginationV2
);

/*-───────────────────────────────── kaj-bd
|  Admin | 00-01 | Get All SubAdmin from Users Table
└──────────────────────────────────*/
router.route('/paginate/for-sub-admin').get(
  auth(TRole.admin),
  validateFiltersForQuery(optionValidationChecking(['_id', 'name', 'createdAt', 'from', 'to', ...paginationOptions])),

  setRequstFilterAndValue('role', 'subAdmin'),

  // setRequestFiltersV2(
  //   { 
  //     isDeleted: false,
  //     role: 'subAdmin'
  //   }
  // ),
  controller.getAllWithPaginationV2
);

/*-───────────────────────────────── fertie | kaj-bd
|  Admin | 00-02 | Create Sub Admin and send invitation email 
└──────────────────────────────────*/
router.post(
  "/send-invitation-link-to-admin-email",
  auth(TRole.admin),
  validateRequest(validation.sendInvitationToBeAdminValidationSchema),
  controller.sendInvitationLinkToAdminEmail
);

/*-─────────────────────────────────  kaj-bd
|  Admin | 00-02 | Remove Sub Admin
|  :id -> here id is subAdminId 
└──────────────────────────────────*/
router.put(
  "/remove-sub-admin/:id",
  auth(TRole.admin),
  controller.removeSubAdmin
);



// TODO : MUST : Get all providers who are not approved .. 

/*-───────────────────────────────── kaj-bd
|  Admin | 04-01 | Get All Providers from Users Table 
└──────────────────────────────────*/
router.route('/paginate/for-provider').get(
  auth(TRole.admin),
  // providerApprovalStatus must pass kora lagbe .. 
  // from and to is for date range filter
  validateFiltersForQuery(optionValidationChecking(['_id', 'name', 'email', 'phoneNumber', 'role', 'providerApprovalStatus', 'from', 'to', ...paginationOptions])),
  // setRequstFilterAndValue('role', 'provider'),
  controller.getAllWithPaginationV3
);



/*-───────────────────────────────── suplify
|  Specialist | Get Profile Information as logged in user 
└──────────────────────────────────*/
router.route('/profile').get(
  auth(TRole.common), // any logged in user can see any user profile ..
  controller.getById
);

/*-───────────────────────────────── tas mgmt
|  Child  with have permission or not
└──────────────────────────────────*/
router.route('/profile/v2').get(
  auth(TRole.common), 
  controller.getByIdV2
);


router.route('/notification-test').get(
  auth(TRole.common), // any logged in user can see any user profile ..
  controller.sendTestingNotificationForAdmin
);


/*-───────────────────────────────── suplify
|  Admin | Get Profile Information by Id  to approve doctor / specialist 
└──────────────────────────────────*/
router.route('/profile/for-admin').get(
  auth(TRole.admin),
  validateFiltersForQuery(optionValidationChecking(['_id',
    ...paginationOptions])),
  controller.getAllWithPagination
);

/*-───────────────────────────────── suplify
|  Admin | change approvalStatus of a doctor / specialist profile
└──────────────────────────────────*/
router.route('/change-approval-status').put(
  auth(TRole.admin),
  // validateRequest(validation.changeApprovalStatusValidationSchema),
  controller.changeApprovalStatusByUserId
)

/*-───────────────────────────────── kaj bd
|  User | Home Page | 03-01 | get category and popular providers also banners 
└──────────────────────────────────*/
router.route('/home-page').get(
  // auth(TRole.user),
  controller.getCategoriesAndPopularProvidersForUser
)

/*-───────────────────────────────── kaj bd
|  User | Home Page |   get only popular providers  
└──────────────────────────────────*/
// TODO : MUST : Need to implement pagination .. 
router.route('/home-page/popular').get(
  // auth(TRole.user),
  controller.getPopularProvidersForUser
)


//--------------------------------- kaj bd
// Provider | Home Page | 03-01 | get earning by category, categorically booking count, all recent job request 
//
// As per Imtiaz vai .. when user pays for a booking .. as a user from app .. app dev needs to update this 
// providers API ... so .. we need to give permission to user also to access this API ..
//---------------------------------
router.route('/home-page/for-provider').get(
  auth(TRole.common),
  IsProviderRejected(),
  controller.getEarningAndCategoricallyBookingCountAndRecentJobRequest
)


/*-───────────────────────────────── kaj bd
|  User | Profile | 06-01 | get profile information of a user 
└──────────────────────────────────*/
router.route('/profile-info').get(
  auth(TRole.common),
  controller.getProfileInformationOfAUser
)

/** ----------------------------------------------
 * @role User
 * @Section Profile
 * @module User|UserProfile
 * @figmaIndex 06-02
 * @desc Update profile information of a user
 *----------------------------------------------*/
router.route('/profile-info').put(
  auth(TRole.common),
  // validateRequest(validation.updateProfileInfoValidationSchema), // TODO : MUST : add validation
  controller.updateProfileInformationOfAUser
)

router.route('/update-location-test').put(
  controller.updateLocationTest
)

/** ----------------------------------------------
 * @role Admin
 * @Section Profile
 * @module User|UserProfile
 * @figmaIndex 06-02
 * @desc Update Profile Info with profile Image of a admin
 *----------------------------------------------*/
router.route('/profile-info/for-admin').put(
  auth(TRole.common),
  ...imageUploadPipelineForUpdateUserProfile,
  controller.updateProfileInformationOfAdmin
)

/** ----------------------------------------------
 * @role User
 * @Section Profile
 * @module User|UserProfile
 * @figmaIndex 06-02
 * @desc Update profile Image of a user
 *----------------------------------------------*/
router.route('/profile-picture').put(
  auth(TRole.common),
  ...imageUploadPipelineForUpdateUserProfile,
  controller.updateProfileImageSeparately
)

/*-─────────────────────────────────
|  User | Profile | 06-03 | Get support mode preference
|  @module UserProfile
|  @figmaIndex 06-03
|  @desc Get user's support mode (calm/encouraging/logical)
└──────────────────────────────────*/
router.route('/support-mode').get(
  auth(TRole.common),
  controller.getSupportMode
);

/*-─────────────────────────────────
|  User | Profile | 06-03 | Update support mode preference
|  @module UserProfile
|  @figmaIndex 06-03
|  @desc Update user's support mode (calm/encouraging/logical)
└──────────────────────────────────*/
router.route('/support-mode').put(
  auth(TRole.common),
  validateRequest(validation.updateSupportModeValidationSchema),
  controller.updateSupportMode
);

/*-───────────────────────────────── ✔️
|  Business | Parent | Task Details | task-details-flow-apis.png | Update child's support mode
|  @module UserProfile
|  @figmaIndex task-details-flow-apis.png
|  @desc Parent updates their child's support mode (calm/encouraging/logical)
|  @auth Business users only
|  @permission Can only update support mode for own children
└──────────────────────────────────*/
router.route('/child-support-mode').put(
  auth(TRole.business),
  validateRequest(validation.updateChildSupportModeValidationSchema),
  verifyChildBelongsToBusinessUser,
  controller.updateChildSupportMode
);

/*-─────────────────────────────────
|  User | Profile | 06-03 | Update notification style preference
|  @module UserProfile
|  @figmaIndex 06-03
|  @desc Update user's notification style (gentle/firm/xyz)
└──────────────────────────────────*/
router.route('/notification-style').put(
  auth(TRole.common),
  validateRequest(validation.updateNotificationStyleValidationSchema),
  controller.updateNotificationStyle
);

/*-─────────────────────────────────
|  Child | Business | User | Profile | profile-permission-account-interface.png | Get preferred working time
|  @module User
|  @figmaIndex profile-permission-account-interface.png
|  @desc Get user's preferred time for working on tasks (HH:mm format)
|  @auth All authenticated users (child, business)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.route('/preferred-time').get(
  auth(TRole.commonUser),
  controller.getPreferredTime
);

/*-─────────────────────────────────
|  Child | Business | User | Profile | profile-permission-account-interface.png | Update preferred working time
|  @module User
|  @figmaIndex profile-permission-account-interface.png
|  @desc Update user's preferred time for working on tasks (HH:mm 24-hour format)
|  @auth All authenticated users (child, business)
|  @rateLimit 20 requests per hour (prevent frequent changes)
|  @validation HH:mm format (24-hour), range: 05:00-23:00
└──────────────────────────────────*/
router.route('/preferred-time').put(
  auth(TRole.commonUser),
  validateRequest(validation.updatePreferredTimeValidationSchema),
  controller.updatePreferredTime
);

router.route('/update/:id').put(
  //auth('common'),
  // validateRequest(validation.createHelpMessageValidationSchema),
  controller.updateById
);

//[🚧][🧑‍💻✅][🧪] // 🆗
router.route('/').get(
  auth(TRole.common),
  controller.getAll
);

router.route('/delete/:id').delete(
  //auth('common'),
  controller.deleteById
); // FIXME : change to admin

/*-─────────────────────────────────
|  As per toky vai's requirement..
└──────────────────────────────────*/
router.route('/softDelete/:id').put(
  auth(TRole.commonUser),
  controller.softDeleteById
);

////////////
//[🚧][🧑‍💻✅][🧪] // 🆗

/*-─────────────────────────────────
|  Admin | User Management | user-list-flow.png | Get all users with pagination and filters
|  @desc Get paginated list of all users with search, role filter, and date range
|  @auth Admin only
|  @query search - Search by username or email
|  @query role - Filter by role: 'individual' | 'child' | 'business' | 'admin' | 'all'
|  @query from - Start date (ISO format)
|  @query to - End date (ISO format)
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 20)
|  @query sortBy - Sort field (default: -createdAt)
└──────────────────────────────────*/
router.route('/admin/all-users').get(
  auth(TRole.admin),
  controller.getAllUsersForAdminDashboard
);

/*-─────────────────────────────────
|  Admin | User Management | user-list-flow.png | Get user registration count for chart
|  @desc Get user registration count by month/year for bar chart
|  @auth Admin only
|  @query type - 'monthly' (current year) or 'yearly' (last 5 years)
└──────────────────────────────────*/
router.route('/admin/user-registration-count').get(
  auth(TRole.admin),
  controller.getUserRegistrationCountForChart
);

export const UserRoutes = router;

