import express from 'express';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import { ISubscriptionPlan } from './subscriptionPlan.interface';
import { SubscriptionController } from './subscriptionPlan.controller';
import auth from '../../../middlewares/auth';
import validateRequest from '../../../shared/validateRequest';
import * as validation from './subscriptionPlan.validation';
import { TRole } from '../../../middlewares/roles';
import multer from "multer";
import { setRequestFiltersV2 } from '../../../middlewares/setRequstFilterAndValue';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

export const optionValidationChecking = <T extends keyof ISubscriptionPlan | 'sortBy' | 'page' | 'limit' | 'populate'>(
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
const controller = new SubscriptionController();

/** ----------------------------------------------
 * @role Admin
 * @Section Subscription
 * @module |
 * @figmaIndex 0-0
 * @desc get all subscription plan which isActive is true 
 * 
 *----------------------------------------------*/
router.route('/paginate').get(
  //auth('common'),
  validateFiltersForQuery(optionValidationChecking(['_id', ...paginationOptions])),
  setRequestFiltersV2({
    isActive: true,
  }),
  controller.getAllWithPaginationV2 
);


router.route('/:id').get(
  // auth('common'),
  controller.getById 
);

router.route('/:id').put(
  //auth('common'), // FIXME: Change to admin
  // validateRequest(validation.createHelpMessageValidationSchema),
  controller.updateById
);

router.route('/').get(
  //auth('common'), // FIXME: maybe authentication lagbe na .. 
  controller.getAll 
);

//---------------------------------
// postman | create subscription plan .. 
// this api is for creating subscription plan form admin dashboard .. 
//---------------------------------
//[🚧][🧑‍💻✅][🧪] // 🆗
router.route('/').post(
  //auth('common'),
  validateRequest(validation.createSubscriptionPlanValidationSchema),
  controller.create
);

//---------------------------------
// Patient | Landing Page | Purchase Subscription by subscriptionPlanId
//---------------------------------

// Stripe Purchase (Web) - Returns Stripe Checkout URL
router.route('/purchase/:subscriptionPlanId').post(
  auth(TRole.business),
  controller.purchaseSubscriptionForSuplify
);

// 🆕 RevenueCat Purchase (Mobile) - Returns RevenueCat configuration
router.route('/revenuecat-purchase/:subscriptionPlanId').post(
  auth(TRole.child),
  controller.purchaseRevenueCatSubscription
);

//------------------------------// 💎✨🔍 -> V2 Found 
// Cancel subscription 
//------------------------------
router.route('/cancel').post(
  auth(TRole.individual),
  controller.cancelSubscription
);

router
  .route('/delete/:id')
  .delete(
   auth(TRole.admin),
    controller.deleteById); // FIXME : change to admin

router
.route('/softDelete/:id')
.put(
  //auth('common'),
  controller.softDeleteById);



export const SubscriptionPlanRoute = router;
