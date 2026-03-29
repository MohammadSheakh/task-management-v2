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
  auth(TRole.patient),
  controller.startFreeTrial
);

export const UserSubscriptionRoute = router;
