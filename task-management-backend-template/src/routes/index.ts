//@ts-ignore
import express from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { AttachmentRoutes } from '../modules/attachments/attachment.route';
// import { NotificationRoutes } from '../modules/notification/notification.routes';
import { ConversationRoute } from '../modules/chatting.module/conversation/conversation.route';
import { MessageRoute } from '../modules/chatting.module/message/message.route';
import { PaymentTransactionRoute } from '../modules/payment.module/paymentTransaction/paymentTransaction.route';
import stripeAccountRoutes from '../modules/payment.module/stripeAccount/stripeAccount.route';
import { UserRoutes } from '../modules/user.module/user/user.route';
import { SettingsRoutes } from '../modules/settings.module/settings/settings.routes';

import { TaskRoute } from '../modules/task.module/task/task.route';
// ❌ REMOVED: Group module not needed (using childrenBusinessUser instead)
// import { GroupRoute } from '../modules/group.module/group/group.route';
// import { GroupMemberRoute } from '../modules/group.module/groupMember/groupMember.route';


import { NotificationFixedRoute } from '../modules/notification.module/notification/notification.route';
import { TaskReminderRoute } from '../modules/notification.module/taskReminder/taskReminder.route';
import { AnalyticsRoutes } from '../modules/analytics.module/analytics.route';
import { ChildrenBusinessUserRoute } from '../modules/childrenBusinessUser.module/childrenBusinessUser.route';
import { TaskProgressRoute } from '../modules/taskProgress.module/taskProgress.route';
import { SubTaskRoute } from '../modules/task.module/subTask/subTask.route';
import { SubTaskProgressRoute } from '../modules/task.module/subTaskProgress/subTaskProgress.route';
import { activationRoutes } from '../modules/childrenBusinessUser.module/activation/activation.routes';

// 🆕 RevenueCat Routes
import revenueCatRoutes from '../modules/subscription.module/revenueCat/revenueCat.route';
import { SubscriptionPlanRoute } from '../modules/subscription.module/subscriptionPlan/subscriptionPlan.route';

// import { ChatRoutes } from '../modules/chat/chat.routes';
// import { MessageRoutes } from '../modules/message/message.routes';
const router = express.Router();

const apiRoutes = [
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/users',
    route: UserRoutes,
  },
  {
    path: '/notifications',
    route: NotificationFixedRoute,
  },

  /////////////////////////////////////////  Task Management
  { // 🟢
    path: '/tasks',
    route: TaskRoute,
  },
  { // 🟢
    path: '/subtasks',
    route: SubTaskRoute,
  },


  /////////////////////////////////////////  Notification & Reminders
  // { // 🟢 //--------------------------------------------------------------
  //   path: '/notifications',
  //   route: NotificationRoute,
  // },
  { // 🟢
    path: '/task-reminders',
    route: TaskReminderRoute,
  },

  /////////////////////////////////////////  Analytics
  { // 🟢 NEW
    path: '/analytics',
    route: AnalyticsRoutes,
  },

  /////////////////////////////////////////  Children Business User
  { // 🟢 NEW - Business user can manage children accounts
    path: '/children-business-users',
    route: ChildrenBusinessUserRoute,
  },

  /////////////////////////////////////////  Account Activation (Invitation Flow - Learning)
  { // 🎓 LEARNING PURPOSE - Activation endpoints for invitation flow
    path: '',
    route: activationRoutes,
  },

  /////////////////////////////////////////  Task Progress Tracking
  { // 🟢 NEW - Track per-child progress on collaborative tasks
    path: '/task-progress',
    route: TaskProgressRoute,
  },
  { // 🟢 NEW - SubTask Progress Tracking (per-child subtask completion)
    path: '/sub-task-progress',
    route: SubTaskProgressRoute,
  },

  ////////////////////// Created By Mohammad Sheakh

  ///////////////////////////////////////// Payment Transaction
  { // 🟢
    path: '/payment-transactions',
    route: PaymentTransactionRoute,
  },

  ///////////////////////////////////////////// Settings And Contact Us
  {
    path: '/settings',
    route: SettingsRoutes,
  },
  ///////////////////////////////////////////// Reviews

  {
    path: '/attachments',
    route: AttachmentRoutes,
  },
  {
    path: '/activitys',
    route: NotificationFixedRoute,
  },

  {
    path: '/payments',
    route: PaymentTransactionRoute,
  },

  //////////////////////////////////////// Subscription Or Purchase
  // {  // 🟢 from kappes
  //   path: '/stripe',
  //   route: stripeAccountRoutes,
  // },
  {  //
    path: '/subscription-plan',
    route: SubscriptionPlanRoute,
  },

  // 🆕 RevenueCat Routes (Admin operations for Individual subscriptions)
  {
    path: '/revenuecat',
    route: revenueCatRoutes,
  },
];

apiRoutes.forEach(route => router.use(route.path, route.route));

export default router;
