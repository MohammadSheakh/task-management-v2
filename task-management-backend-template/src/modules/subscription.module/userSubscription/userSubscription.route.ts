//@ts-ignore
import express from 'express';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import { IUserSubscription } from './userSubscription.interface';
import { UserSubscriptionController } from './userSubscription.controller';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
//@ts-ignore
import multer from "multer";
import { getLoggedInUserAndSetReferenceToUser } from '../../../middlewares/getLoggedInUserAndSetReferenceToUser';
import { setQueryOptions } from '../../../middlewares/setQueryOptions';
import { defaultExcludes } from '../../../constants/queryOptions';
import { setRequestFiltersV2 } from '../../../middlewares/setRequstFilterAndValue';
import { UserSubscriptionStatusType } from './userSubscription.constant';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

export const optionValidationChecking = <T extends keyof IUserSubscription | 'sortBy' | 'page' | 'limit' | 'populate'>(
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


// const taskService = new TaskService();
const controller = new UserSubscriptionController();

//
router.route('/paginate').get(
  auth(TRole.common),
  validateFiltersForQuery(optionValidationChecking(['_id', 'userId'])),
  getLoggedInUserAndSetReferenceToUser('userId'),
  setRequestFiltersV2({
    sortBy: '-createdAt',
    limit : 6,
  }),
  setQueryOptions({
    populate: [{
      path: 'subscriptionPlanId', // coverPhotos attachments
      select: 'subscriptionName subscriptionType amount currency',
      // populate: { path: 'subscriptionPlanId', select: 'subscriptionName attachments' }
    },
    {
      path: "userId",
      select: `name email subscriptionType`
    }
    ],
    select: `${defaultExcludes}`
    // // ${defaultExcludes}
  }),
  setRequestFiltersV2({
    status: { $nin: [UserSubscriptionStatusType.processing] },
  }),
  controller.getAllWithPaginationV2 
);

router.route('/:id').get(
  // auth('common'),
  controller.getById 
);

router.route('/update/:id').put(
  //auth('common'), // FIXME: Change to admin
  // validateRequest(validation.createHelpMessageValidationSchema),
  controller.updateById
);

router.route('/').get(
  //auth('common'), // FIXME: maybe authentication lagbe na .. 
  controller.getAll 
);

router.route('/create').post(
  
  // validateRequest(validation.createHelpMessageValidationSchema),
  controller.create
);

router
  .route('/delete/:id')
  .delete(
    //auth('common'),
    controller.deleteById); // FIXME : change to admin

router
.route('/softDelete/:id')
.put(
  //auth('common'),
  controller.softDeleteById);

//---------------------------------
// Patient  | Landing Page | Start Free Trial
//---------------------------------
router.route('/free-trial/start').post(
  auth(TRole.business),
  controller.startFreeTrial
);

/*-───────────────────────────────── 🆕 V3
|  Business User | Subscription | subscription-flow-v1.png | Get my subscription history
|  @desc Get all purchased subscriptions for the authenticated user
|  @desc Returns subscription list with plan details (name, price, dates, status)
|  @auth All authenticated users (business, individual)
|  @response Array of subscriptions with formatted fields matching Figma table
|  @figma figma-asset/teacher-parent-dashboard/subscription/subscription-flow-v1.png
|  @version 3.0.0
└──────────────────────────────────*/
router
  .route('/my-history')
  .get(
    auth(TRole.common),
    controller.getMySubscriptionHistory,
  );

/*-───────────────────────────────── 🆕 V3
|  Business User | Subscription | subscription-flow-v1.png | Get my active subscription
|  @desc Get current active/trialing subscription with full details
|  @desc Returns subscription card data (price, status, account structure, dates)
|  @auth All authenticated users (business, individual)
|  @response Active subscription object or null if no active subscription
|  @figma figma-asset/teacher-parent-dashboard/subscription/subscription-flow-v1.png
|  @version 3.0.0
└──────────────────────────────────*/
router
  .route('/my-active')
  .get(
    auth(TRole.common),
    controller.getMyActiveSubscription,
  );

/*-───────────────────────────────── 🆕 V3
|  Business User | Subscription | subscription-flow-v1.png | Cancel my subscription
|  @desc Cancel active subscription (sets cancel_at_period_end in Stripe)
|  @desc Subscription remains active until end of billing cycle
|  @auth All authenticated users (business, individual)
|  @body subscriptionId - Optional: Specific subscription ID to cancel (defaults to most recent active)
|  @response Cancellation details with effective date
|  @figma figma-asset/teacher-parent-dashboard/subscription/subscription-flow-v1.png
|  @version 3.0.0
└──────────────────────────────────*/
router
  .route('/cancel')
  .post(
    auth(TRole.common),
    controller.cancelMySubscription,
  );

/*-───────────────────────────────── 🆕 V3
|  Admin | User Subscription | subscription-details-of-a-person.png | Get user subscription details
|  @desc Get detailed subscription buying information and personal information for admin dashboard
|  @desc Matches Figma "User Details" page with Subscription Buying Information and Personal Information sections
|  @auth Admin only
|  @param userId - User ID to get subscription details for
|  @response User info, profile info, subscription buying information (type, dates, transaction ID, amount, status)
|  @figma figma-asset/main-admin-dashboard/subscription-details-of-a-person.png
|  @version 3.0.0
└──────────────────────────────────*/
router
  .route('/admin/user/:userId/details')
  .get(
    auth(TRole.admin),
    controller.getUserSubscriptionDetailsForAdmin,
  );

export const UserSubscriptionRoute = router;
