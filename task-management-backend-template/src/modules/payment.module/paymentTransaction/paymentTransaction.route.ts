import express from 'express';
import { PaymentTransactionController} from './paymentTransaction.controller';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import validateRequest from '../../../shared/validateRequest';
import auth from '../../../middlewares/auth';
import { PaymentTransaction } from './paymentTransaction.model';
import { IPaymentTransaction } from './paymentTransaction.interface';
import * as validation from './paymentTransaction.validation';

import multer from "multer";
import { TRole } from '../../../middlewares/roles';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

export const optionValidationChecking = <T extends keyof IPaymentTransaction | 'sortBy' | 'page' | 'limit' | 'populate'>(
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
const controller = new PaymentTransactionController();

router.route('/').get((req, res) => {
  console.log("🟢 test page");
});

/*-─────────────────────────────────  suplify - kaj bd 
|  Admin | get all payment transaction with pagination
└──────────────────────────────────*/
router.route('/paginate').get(
  //auth('common'),
  validateFiltersForQuery(optionValidationChecking([
    '_id',
    'userId', // who made the transaction
    'referenceFor', // UserSubscription-Order-DoctorPatientScheduleBooking-SpecialistPatientScheduleBooking-TrainingProgramPurchase-LabTestBooking
    'referenceId',
    'paymentGateway', //stripe-none
    'transactionId',
    'paymentIntent',
    'amount',
    'currency',
    'paymentStatus',// pending-processing-completed-failed-cancelled
    ...paginationOptions
  ])),
  controller.getAllWithPagination
);


router.route('/paginate/dev').get(
  //auth('common'),
  validateFiltersForQuery(optionValidationChecking([
    '_id',
    'userId', // who made the transaction
    'referenceFor', // UserSubscription-Order-DoctorPatientScheduleBooking-SpecialistPatientScheduleBooking-TrainingProgramPurchase-LabTestBooking
    'referenceId',
    'paymentGateway', //stripe-none
    'transactionId',
    'paymentIntent',
    'amount',
    'currency',
    'paymentStatus'// pending-processing-completed-failed-cancelled
  ])),
  controller.getAllWithPaginationForDev
);

/*-───────────────────────────────── suplify - kaj bd
|  Admin | Get Overview of Earnings
└──────────────────────────────────*/
router.route('/overview/admin').get(
  auth(TRole.admin),
  controller.getEarningsOverview
);

/*-───────────────────────────────── 🆕 V3
|  Admin | Earnings | earning-flow.png | Get all earning list with filters
|  @desc Get paginated list of all subscription payments with user details
|  @desc Matches Figma "All Earning list" table columns
|  @auth Admin only
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 20)
|  @query fromDate - Optional: Start date filter (YYYY-MM-DD)
|  @query toDate - Optional: End date filter (YYYY-MM-DD)
|  @query paymentGateway - Optional: Filter by gateway (stripe, revenuecat, etc.)
|  @query paymentStatus - Optional: Filter by status
|  @figma figma-asset/main-admin-dashboard/earning-flow.png
|  @version 3.0.0
└──────────────────────────────────*/
router
  .route('/earning-list')
  .get(
    auth(TRole.admin),
    controller.getAllEarningListV3,
  );

/*-───────────────────────────────── 🆕 V3
|  Admin | User Subscription | subscription-details-of-a-person.png | Get user subscription details
|  @desc Get detailed subscription and personal information for a specific user
|  @desc Matches Figma "User Details" page layout
|  @auth Admin only
|  @param userId - User ID to get subscription details for
|  @response User info, profile info, subscription buying information
|  @figma figma-asset/main-admin-dashboard/subscription-details-of-a-person.png
|  @version 3.0.0
└──────────────────────────────────*/
router
  .route('/user/:userId/subscription-details')
  .get(
    auth(TRole.admin),
    controller.getUserSubscriptionDetailsV3,
  );

/*-─────────────────────────────────
|  From kappes Backend For Stripe
└──────────────────────────────────*/
router.route('/success').get(controller.successPage)
router.route('/cancel').get(controller.cancelPage);

//---------------------------------
// For SSL
//---------------------------------
/***
 * /ssl/success
 * The gateway POSTs transaction result to you here
 * You can show a nice page or redirect to client app page
 * But still call validation API before marking paid
 * 
 * SSLCommerz will POST to the success_url and then 
 * redirect client. But do not mark as paid based only
 * on redirect—use IPN/validation.
 * 
 * ** */
// router.route('/ssl/success').get(controller.successPageForSSL); // not sure
// router.post('/ssl/fail', handleSSLFail); // not sure
// router.post('/ssl/cancel', handleSSLCancel); // not sure
// router.post('/ssl/ipn', handleSSLIPN); // not sure

//---------------- https://github.com/sslcommerz/SSLCommerz-NodeJS 
router.route('/initiate-refund').get(controller.initiateARefundThroughAPI);
router.route('/refund-query').get(controller.refundQuery);
router.route('/transaction-query-by-transaction-id')
        .get(controller.queryTheStatusOfATransactionByTxnId);
router.route('/transaction-query-by-session-id')
        .get(controller.queryTheStatusOfATransactionBySessionId);
        

router.route('/:id').get(
  // auth('common'),
  controller.getById
);

router.route('/update/:id').put(
  //auth('common'),
  // validateRequest(validation.createHelpMessageValidationSchema),
  controller.updateById
);

//[🚧][🧑‍💻✅][🧪] // 🆗
router.route('/').get(
  auth('commonAdmin'),
  controller.getAll
);

//[🚧][🧑‍💻✅][🧪] // 🆗
router.route('/create').post(
  // [
  //   upload.fields([
  //     { name: 'attachments', maxCount: 15 }, // Allow up to 5 cover photos
  //   ]),
  // ],
  auth(TRole.common),
  validateRequest(validation.createHelpMessageValidationSchema),
  controller.create
);

router.route('/delete/:id').delete(
  //auth('common'),
  controller.deleteById
); // FIXME : change to admin

router.route('/softDelete/:id').put(
  //auth('common'),
  controller.softDeleteById
);

export const PaymentTransactionRoute = router;
