//@ts-ignore
import express from 'express';
import * as validation from './oauthAccount.validation';
import { OAuthAccountController} from './oauthAccount.controller';
import { IOAuthAccount } from './oauthAccount.interface';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import validateRequest from '../../../shared/validateRequest';
import auth from '../../../middlewares/auth';
//@ts-ignore
import multer from "multer";
import { TRole } from '../../../middlewares/roles';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = express.Router();

export const optionValidationChecking = <T extends keyof IOAuthAccount | 'sortBy' | 'page' | 'limit' | 'populate'>(
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
const controller = new OAuthAccountController();


// router.route('/paginate').get(
//   //auth('common'),
//   validateFiltersForQuery(optionValidationChecking(['_id', ...paginationOptions])),
//   controller.getAllWithPagination
// );


export const OAuthAccountRoute = router;
