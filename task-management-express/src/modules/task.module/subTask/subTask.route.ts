//@ts-ignore
import express from 'express';
import { SubTaskController } from './subTask.controller';
import { ISubTask } from './subTask.interface';
import { validateFiltersForQuery } from '../../../middlewares/queryValidation/paginationQueryValidationMiddleware';
import validateRequest from '../../../shared/validateRequest';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { setQueryOptions } from '../../../middlewares/setQueryOptions';
import * as validation from './subTask.validation';

const router = express.Router();

export const optionValidationChecking = <T extends keyof ISubTask | 'sortBy' | 'page' | 'limit' | 'populate' | 'taskId' | 'isCompleted'>(
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

const controller = new SubTaskController();

/*-───────────────────────────────── ✔️
|  Child | Business | SubTask | edit-update-task-flow.png | Create a new subtask
|  @desc Create a subtask under a parent task
|  @auth All authenticated users (child, business)
|  @access Users with access to parent task
└──────────────────────────────────*/
router.route('/').post(
  auth(TRole.commonUser),
  validateRequest(validation.createSubTaskValidationSchema),
  controller.create
);

/*-───────────────────────────────── ✔️ 🐛 select and populate gula controller level e use kora hoy nai
|  Child | Business | SubTask | task-details-with-subTasks.png | Get all subtasks for a task
|  @desc Get all subtasks belonging to a specific task
|  @auth All authenticated users (child, business)
|  @access Users with access to parent task
└──────────────────────────────────*/
router.route('/task/:taskId').get(
  auth(TRole.commonUser),
  validateFiltersForQuery(optionValidationChecking(['isCompleted', ...paginationOptions])),
  setQueryOptions({
    populate: [
      { path: 'createdById', select: 'name email' },
    ],
    select: '-__v'
  }),
  controller.getSubTasksByTask
);

/*-─────────────────────────────────  🐛 select and populate gula controller level e use kora hoy nai
|  Child | Business | SubTask | task-details-with-subTasks.png | Get subtasks with pagination
|  @desc Paginated list of subtasks for a task
|  @auth All authenticated users (child, business)
|  @access Users with access to parent task
└──────────────────────────────────*/
router.route('/task/:taskId/paginate').get(
  auth(TRole.commonUser),
  validateFiltersForQuery(optionValidationChecking(['isCompleted', ...paginationOptions])),
  setQueryOptions({
    populate: [
      { path: 'createdById', select: 'name email' },
    ],
  }),
  controller.getSubTasksWithPagination
);

/*-─────────────────────────────────
|  Child | Business | SubTask | status-section-flow-01.png | Get subtask statistics
|  @desc Get subtask completion statistics for logged-in user
|  @auth All authenticated users (child, business)
└──────────────────────────────────*/
router.route('/statistics').get(
  auth(TRole.commonUser),
  controller.getStatistics
);

/*-───────────────────────────────── ✔️
|  Child | Business | SubTask | task-details-with-subTasks.png | Get subtask by ID
|  @desc Get single subtask details with populated user info
|  @auth All authenticated users (child, business)
|  @access Users with access to parent task
└──────────────────────────────────*/
router.route('/:id').get(
  auth(TRole.commonUser),
  setQueryOptions({
    populate: [
      { path: 'createdById', select: 'name email' },
      { path: 'taskId', select: 'title status' },
    ],
    select: '-__v'
  }),
  controller.getByIdV2
);

/*-───────────────────────────────── ✔️
|  Child | Business | SubTask | edit-update-task-flow.png | Update subtask by ID
|  @desc Update subtask details
|  @auth All authenticated users (child, business)
|  @access Subtask creator or task owner only
└──────────────────────────────────*/
router.route('/:id').put(
  auth(TRole.commonUser),
  validateRequest(validation.updateSubTaskValidationSchema),
  controller.updateById
);

/*-───────────────────────────────── ✔️ 
|  Child | Business | SubTask | edit-update-task-flow.png | Toggle subtask status
|  @desc Toggle subtask completion status (auto-updates parent task completion)
|  @auth All authenticated users (child, business)
|  @access Subtask creator or task owner only
└──────────────────────────────────*/
router.route('/:id/toggle-status').put(
  auth(TRole.commonUser),
  validateRequest(validation.toggleSubTaskStatusValidationSchema),
  controller.toggleStatus
);

/*-─────────────────────────────────
|  Child | Business | SubTask | edit-update-task-flow.png | Delete subtask by ID
|  @desc Delete a subtask (auto-updates parent task completion)
|  @auth All authenticated users (child, business)
|  @access Subtask creator or task owner only
└──────────────────────────────────*/
router.route('/:id').delete(
  auth(TRole.commonUser),
  controller.deleteById
);

export const SubTaskRoute = router;
