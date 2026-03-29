//@ts-ignore
import express from 'express';
import auth from '../../../middlewares/auth';
import { TRole } from '../../../middlewares/roles';
import { UserAnalyticsController } from './userAnalytics.controller';

const router = express.Router();

const controller = new UserAnalyticsController();

/*-───────────────────────────────── ✔️
|  Child | Individual | User Analytics | home-flow.png | Get complete user analytics overview
|  @desc Returns: overview, today's progress, weekly/monthly stats, streak, productivity score
└──────────────────────────────────*/
router.get('/user/my/overview',
  auth(TRole.commonUser),
  controller.getUserOverview
);

/*-───────────────────────────────── ✔️
|  Child | Individual | User Analytics | home-flow.png | Get today's task progress
|  @desc Returns: X/Y completed format, completion rate
└──────────────────────────────────*/
router.get('/user/my/daily-progress',
  auth(TRole.commonUser),
  controller.getDailyProgress
);

/*-─────────────────────────────────
|  Child | Individual | User Analytics | profile-permission-account-interface.png | Get user's streak data
|  @desc Returns: current streak, longest streak, streak history
└──────────────────────────────────*/
router.get('/user/my/weekly-streak',
  auth(TRole.commonUser),
  controller.getStreak
);

/*-─────────────────────────────────
|  Child | Individual | User Analytics | profile-permission-account-interface.png | Get user's productivity score
|  @desc Returns: score (0-100), breakdown, trend, percentile
└──────────────────────────────────*/
router.get('/user/my/productivity-score',
  auth(TRole.commonUser),
  controller.getProductivityScore
);

/*-───────────────────────────────── 🔁 MUST NEED IMPLEMENTATION || HARD CODE VALUE FOUND 
|  Child | Individual | User Analytics | profile-permission-account-interface.png | Get user's completion rate analytics
|  @desc Returns: overall rate, by time range, trend
└──────────────────────────────────*/
router.get('/user/my/completion-rate',
  auth(TRole.commonUser),
  controller.getCompletionRate
);

/*-───────────────────────────────── 🔁 MUST NEED IMPLEMENTATION || HARD CODE VALUE FOUND 
|  Child | Individual | User Analytics | status-section-flow-01.png | Get user's task statistics
|  @desc Returns: tasks by status, priority, task type
└──────────────────────────────────*/
router.get('/user/my/task-statistics',
  auth(TRole.commonUser),
  controller.getTaskStatistics
);

/*-───────────────────────────────── 🔁 MUST NEED IMPLEMENTATION || HARD CODE VALUE FOUND 
|  Child | Individual | User Analytics | history_screen.dart | Get user's trend analytics
|  @desc Returns: daily/weekly/monthly trend data
└──────────────────────────────────*/
router.get('/user/my/trend',
  auth(TRole.commonUser),
  controller.getTrendAnalytics
);

export const UserAnalyticsRoutes = router;
