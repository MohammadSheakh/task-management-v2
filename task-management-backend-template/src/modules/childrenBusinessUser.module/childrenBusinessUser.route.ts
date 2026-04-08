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

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | edit-child-flow.png | Update child profile
|  @desc Update child account details (name, email, phone, gender, supportMode, location, dob, password)
|  @auth Business user (parent/teacher)
|  @rateLimit 20 requests per hour (prevents abuse)
|  @request PATCH /children-business-users/children/:childId
|  @body name, email, phoneNumber, gender, supportMode, location, dateOfBirth, password
|  @response Updated child user data with profile information
└──────────────────────────────────*/
router.patch(
  '/children/:childId',
  auth(TRole.business),
  childrenLimiter,
  validateRequest(validation.updateChildValidationSchema),
  controller.updateChild
);

/*-───────────────────────────────── ✔️ NEW V2
|  Business | ChildrenBusinessUser | edit-child-flow.png | Update child profile V2
|  @desc V2 ENHANCEMENT: Update child profile and return complete data for edit form
|  @desc No need for separate GET call after update - returns all fields needed for form
|  @auth Business user (parent/teacher)
|  @rateLimit 20 requests per hour (prevents abuse)
|  @request PATCH /children-business-users/children/:childId/v2
|  @body name, email, phoneNumber, gender, supportMode, location, dateOfBirth, password
|  @response Complete child data (same as GET /team-members/:childId/edit)
|  @version 2.0.0
|  @author Senior Engineering Team
|  @date 02-04-26
└──────────────────────────────────*/
router.patch(
  '/children/:childId/v2',
  auth(TRole.business),
  childrenLimiter,
  validateRequest(validation.updateChildValidationSchema),
  controller.updateChildV2
);

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | edit-child-flow.png | Get child details for edit form
|  @desc Get child profile data to populate edit form fields
|  @desc Returns: name, email, phone, gender, dob, age, location, address, supportMode, roleType
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @param childId - Child user ID to edit
|  @response Child profile data for edit form
└──────────────────────────────────*/
router.get(
  '/team-members/:childId/edit',
  auth(TRole.business),
  childrenLimiter,
  controller.getChildForEdit
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

/*-───────────────────────────────── ✔️ NEW V2
|  Business | ChildrenBusinessUser | dashboard-flow-03.png, permission-flow-02.png | Set Secondary User (Auto-switch)
|  @desc Designate a child as Secondary User (automatically removes existing secondary user)
|  @desc Smooth transition - no need to manually remove previous user
|  @auth Business user (parent/teacher) only
|  @rateLimit 20 requests per hour (prevent frequent changes)
|  @request PUT /children-business-users/children/:childId/secondary-user/v2
|  @body { isSecondaryUser: true }
|  @response Updated secondary user + info about previous user (if replaced)
└──────────────────────────────────*/
router.put(
  '/children/:childId/secondary-user/v2',
  auth(TRole.business),
  childrenLimiter,
  validateRequest(validation.updateChildPermissionsValidationSchema),
  controller.setSecondaryUserV2
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
|  Business | ChildrenBusinessUser | permission-flow.png | Get all users with permissions
|  @desc Get all children who have secondary user permissions (isSecondaryUser = true)
|  @desc Shows in "Permissions access" page - list of users who can create tasks
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @response Array of children with secondary user permissions
└──────────────────────────────────*/
router.get(
  '/secondary-users',
  auth(TRole.business),
  childrenLimiter,
  controller.getAllSecondaryUsers
);

/*-───────────────────────────────── ✔️ NEW
|  Business | ChildrenBusinessUser | permission-flow-02.png | Get available users for permission
|  @desc Get all children who don't have secondary user permissions yet
|  @desc Shows in "Permission Member" modal - users available to grant permissions
|  @auth Business user (parent/teacher)
|  @rateLimit 100 requests per minute
|  @response Array of children available to grant permissions
└──────────────────────────────────*/
router.get(
  '/available-secondary-users',
  auth(TRole.business),
  childrenLimiter,
  controller.getAvailableSecondaryUsers
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

/*-───────────────────────────────── 🆕 V2
|  Child | ChildrenBusinessUser | family-members-flow.png | Get my family members with parent info
|  @desc Get parent information + other children (siblings) under the same parent
|  @desc Parent is returned at the top, followed by siblings array
|  @auth Child user (commonUser role)
|  @rateLimit 100 requests per minute
|  @response Object with parent and siblings, with parent first
|  @version 2.0.0
└──────────────────────────────────*/
router.get(
  '/my-family-members/v2',
  auth(TRole.commonUser),
  childrenLimiter,
  controller.getMyFamilyMembersV2
);

/*-───────────────────────────────── 🎓 LEARNING PURPOSE ONLY
|  Business | ChildrenBusinessUser | create-child-flow.png | Send invitation to child
|  @desc Parent sends invitation to child (child sets own password via deep link)
|  @auth Business user (parent/teacher)
|  @rateLimit 5 requests per hour (prevents spam)
|  @request POST /children-business-users/children/invite
|  @response Invitation confirmation with expiration time
└──────────────────────────────────*/
router.post(
  '/children/invite',
  auth(TRole.business),
  rateLimiter('strict'),
  validateRequest(validation.inviteChildValidationSchema),
  controller.inviteChild
);

export const ChildrenBusinessUserRoute = router;
