//@ts-ignore
import express from 'express';
import { ChildrenBusinessUserController } from './childrenBusinessUser.controller';
import auth from '../../middlewares/auth';
import { TRole } from '../../middlewares/roles';
import validateRequest from '../../shared/validateRequest';
import * as validation from './childrenBusinessUser.validation';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';

const router = express.Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 */
const createChildLimiter = rateLimiter('strict');  // 3 req/hour (prevents abuse)
const childrenLimiter = rateLimiter('user');       // 30 req/min

const controller = new ChildrenBusinessUserController();

/*-─────────────────────────────────✔️
|  Business | ChildrenBusinessUser | create-child-flow.png | Create child account
|  @desc Business user creates a child account and adds to family
|  @auth Business user with active subscription
|  @rateLimit 10 requests per hour (prevents abuse)
└──────────────────────────────────*/
router.post(
  '/children',
  auth(TRole.business),
  createChildLimiter,
  validateRequest(validation.createChildValidationSchema),
  controller.createChild
);

/*-───────────────────────────────── ✔️
|  Business | ChildrenBusinessUser | team-member-flow-01.png | Get all my children
|  @desc Get all children accounts with pagination
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/my-children',
  auth(TRole.business),
  childrenLimiter,
  validateRequest(validation.getChildrenValidationSchema),
  controller.getMyChildren
);

/*-───────────────────────────────── ✔️
|  Child | ChildrenBusinessUser | profile-permission-account-interface.png | Get my parent business user
|  @desc Child user retrieves their parent business user details
|  @auth Child user (commonUser role)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/my-parent',
  auth(TRole.commonUser),
  childrenLimiter,
  controller.getParentBusinessUser
);

/*-───────────────────────────────── ✔️
|  Business | ChildrenBusinessUser | edit-child-flow.png | Remove child from family
|  @desc Remove a child account from family (soft delete)
|  @auth Business user (parent/teacher)
|  @rateLimit 20 requests per hour
└──────────────────────────────────*/
router.delete(
  '/children/:childId',
  auth(TRole.business),
  childrenLimiter,
  validateRequest(validation.removeChildValidationSchema),
  controller.removeChild
);

/*-───────────────────────────────── ✔️
|  Business | ChildrenBusinessUser | edit-child-flow.png | Reactivate child account
|  @desc Reactivate a previously removed child account
|  @auth Business user (parent/teacher)
|  @rateLimit 20 requests per hour
└──────────────────────────────────*/
router.post(
  '/children/:childId/reactivate',
  auth(TRole.business),
  childrenLimiter,
  controller.reactivateChild
);

/*-─────────────────────────────────
|  Business | ChildrenBusinessUser | dashboard-flow-01.png | Get children statistics
|  @desc Get statistics about children accounts (active, inactive, removed)
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/statistics',
  auth(TRole.business),
  childrenLimiter,
  controller.getStatistics
);

/*-───────────────────────────────── ✔️
|  Business | ChildrenBusinessUser | dashboard-flow-03.png | Set Secondary User
|  @desc Designate a child as Secondary User (Task Manager)
|        Only ONE child per business user can be Secondary User
|        Secondary User can create tasks and assign to family members
|  @auth Business user (parent/teacher) only
|  @rateLimit 20 requests per hour (prevent frequent changes)
└──────────────────────────────────*/
router.put(
  '/children/:childId/secondary-user',
  auth(TRole.business),
  childrenLimiter,
  validateRequest(validation.updateChildPermissionsValidationSchema),
  controller.setSecondaryUser
);

/*-───────────────────────────────── ✔️
|  Business | ChildrenBusinessUser | dashboard-flow-03.png | Get Secondary User
|  @desc Get the current Secondary User (Task Manager) for this business user
|  @auth Business user (parent/teacher) only
|  @rateLimit 100 requests per minute
└──────────────────────────────────*/
router.get(
  '/secondary-user',
  auth(TRole.business),
  childrenLimiter,
  controller.getSecondaryUser
);

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | task-monitoring-flow-01.png | Get team members with active task counts
|  @desc Get all children with their active task counts for Team Member sidebar
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @response Array of children with activeTaskCount field
└──────────────────────────────────*/
router.get(
  '/team-members',
  auth(TRole.business),
  childrenLimiter,
  controller.getChildrenWithActiveTaskCounts
);

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | team-member-flow-01.png | Get team members statistics
|  @desc Get statistics for Team Members dashboard (Team Size, Total Tasks, Active Tasks, Completed Tasks)
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @response { teamSize, totalTasks, activeTasks, completedTasks }
└──────────────────────────────────*/
router.get(
  '/team-members/statistics',
  auth(TRole.business),
  childrenLimiter,
  controller.getTeamMembersStatistics
);

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | team-member-flow-01.png | Get team members list with task progress
|  @desc Get paginated list of children with task progress percentage
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 10)
|  @query sortBy - Sort field (default: -addedAt)
|  @response Paginated list with taskProgress (totalTasks, completedTasks, progressPercentage)
└──────────────────────────────────*/
router.get(
  '/team-members/list',
  auth(TRole.business),
  childrenLimiter,
  controller.getTeamMembersList
);

/*-───────────────────────────────── ✔️ NEW V2
|  Business | ChildrenBusinessUser | team-member-flow-01.png | Get team members list with task progress V2
|  @desc Get paginated list of children with task progress percentage (V2 with aggregation pipeline)
|  @desc Uses aggregation for better population control (name, email, profileImage, location, dob)
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 10)
|  @query sortBy - Sort field (default: -addedAt)
|  @response Paginated list with taskProgress (totalTasks, completedTasks, progressPercentage)
└──────────────────────────────────*/
router.get(
  '/team-members/list/v2',
  auth(TRole.business),
  childrenLimiter,
  controller.getTeamMembersListV2
);

/*-───────────────────────────────── ✔️ NEW V3
|  Business | ChildrenBusinessUser | team-member-flow-01.png | Get team members list with task progress V3
|  @desc Get paginated list of children with task progress percentage (V3 with paginate + manual populate)
|  @desc Uses paginate plugin with manual population for reliability
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @query page - Page number (default: 1)
|  @query limit - Items per page (default: 10)
|  @query sortBy - Sort field (default: -addedAt)
|  @response Paginated list with taskProgress (totalTasks, completedTasks, progressPercentage)
└──────────────────────────────────*/
router.get(
  '/team-members/list/v3',
  auth(TRole.business),
  childrenLimiter,
  controller.getTeamMembersListV3
);

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | all-task-of-a-member-flow.png | Get member details with all tasks
|  @desc Get detailed member profile with all tasks for member details page
|  @desc Shows personal info, all tasks with subtasks, and statistics
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @param memberId - Child user ID
|  @response Member profile with tasks and statistics
└──────────────────────────────────*/
router.get(
  '/team-members/:memberId',
  auth(TRole.business),
  childrenLimiter,
  controller.getMemberDetails
);

/*-───────────────────────────────── ✔️ NEW V2
|  Business | ChildrenBusinessUser | all-task-of-a-member-flow.png | Get member details with all tasks V2
|  @desc Get detailed member profile with all tasks (V2 with smart subtask handling)
|  @desc For collaborative tasks: uses SubTaskProgress (individual progress)
|  @desc For personal tasks: uses SubTask.isCompleted (global status)
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @param memberId - Child user ID
|  @response Member profile with tasks and statistics
└──────────────────────────────────*/
router.get(
  '/team-members/:memberId/v2',
  auth(TRole.business),
  childrenLimiter,
  controller.getMemberDetailsV2
);

/*-───────────────────────────────── ✔️ NEW
|  Child | ChildrenBusinessUser | add-task-flow-for-permission-account-interface.png | Get my permission status
|  @desc Get the authenticated child user's permission status (isSecondaryUser, capabilities)
|  @auth Child user (commonUser role)
|  @rateLimit 100 requests per minute
|  @response { isSecondaryUser, parentBusinessUserId, parentName, permissions }
└──────────────────────────────────*/
router.get(
  '/my-permission',
  auth(TRole.commonUser),
  childrenLimiter,
  controller.getMyPermission
);

/*-───────────────────────────────── ✔️ NEW
|  Child | ChildrenBusinessUser | add-task-flow-for-permission-account-interface.png | Get my family members
|  @desc Get other children (siblings) under the same parent business user
|  @auth Child user (commonUser role)
|  @rateLimit 100 requests per minute
|  @response Array of family members with name, email, roleType, isSecondaryUser
└──────────────────────────────────*/
router.get(
  '/my-family-members',
  auth(TRole.commonUser),
  childrenLimiter,
  controller.getMyFamilyMembers
);

export const ChildrenBusinessUserRoute = router;
