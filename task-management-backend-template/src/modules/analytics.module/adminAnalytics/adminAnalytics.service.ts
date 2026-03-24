//@ts-ignore
import { Types } from 'mongoose';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { User } from '../../user.module/user/user.model';
import { Task } from '../../task.module/task/task.model';
// ❌ REMOVED: Group module not needed
// import { Group } from '../../group.module/group/group.model';
import {
  IAdminDashboardAnalytics,
  IPlatformOverview,
  IUserGrowthAnalytics,
  IRevenueAnalytics,
  IPlatformTaskMetrics,
  IUserEngagementMetrics,
  IUserRatioChartData,
} from './adminAnalytics.interface';
import { ANALYTICS_CACHE_CONFIG, ADMIN_METRICS_CONFIG } from '../analytics.constant';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
  subYears,
  format,
  eachDayOfInterval,
} from 'date-fns';

/**
 * Admin Analytics Service
 * Platform-wide analytics for administrators
 */
export class AdminAnalyticsService {
  private getCacheKey(type: string): string {
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:admin:${type}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      return cachedData ? JSON.parse(cachedData) as T : null;
    } catch (error) {
      errorLogger.error('Redis GET error in AdminAnalytics:', error);
      return null;
    }
  }

  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in AdminAnalytics:', error);
    }
  }

  async getDashboardOverview(): Promise<IAdminDashboardAnalytics> {
    const cacheKey = this.getCacheKey('dashboard');

    const cached = await this.getFromCache<IAdminDashboardAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    // Get platform overview
    const [totalUsers, totalTasks] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      Task.countDocuments({ isDeleted: false }),
    ]);

    // ✅ NEW: Get user count by role
    const usersByRole = await User.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const roleCounts = {
      individual: usersByRole.find((r: any) => r._id === 'individual')?.count || 0,
      child: usersByRole.find((r: any) => r._id === 'child')?.count || 0,
      business: usersByRole.find((r: any) => r._id === 'business')?.count || 0,
      admin: usersByRole.find((r: any) => r._id === 'admin')?.count || 0,
    };

    // ✅ NEW: Get monthly registered users (current year)
    const yearStart = startOfMonth(now);
    const monthlyRegisteredUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: yearStart },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    const monthlyData = monthlyRegisteredUsers.map((m: any) => ({
      month: m._id.month,
      count: m.count,
    }));

    // ✅ NEW: Get annual registered users (last 5 years)
    const annualRegisteredUsers = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: subYears(now, 5) },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1 } },
    ]);

    const annualData = annualRegisteredUsers.map((a: any) => ({
      year: a._id.year,
      count: a.count,
    }));

    const overview: IPlatformOverview = {
      totalUsers,
      totalGroups: 0, // ❌ REMOVED: Group module not needed
      totalTasks,
      activeUsersToday: 0,
      activeUsersThisWeek: 0,
      activeUsersThisMonth: 0,
      dauMauRatio: 0,
      usersByRole: roleCounts, // ✅ NEW
      monthlyRegisteredUsers: monthlyData, // ✅ NEW
      annualRegisteredUsers: annualData, // ✅ NEW
    };

    const dashboard: IAdminDashboardAnalytics = {
      overview,
      userGrowth: await this.getUserGrowth(),
      revenue: await this.getRevenueAnalytics(),
      taskMetrics: await this.getTaskMetrics(),
      engagement: await this.getEngagementMetrics(),
      topGroups: [],
      recentUsers: [],
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, dashboard, ANALYTICS_CACHE_CONFIG.ADMIN_DASHBOARD);
    return dashboard;
  }

  async getUserGrowth(): Promise<IUserGrowthAnalytics> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    const [todayCount, weekCount, monthCount] = await Promise.all([
      User.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd },
        isDeleted: false,
      }),
      User.countDocuments({
        createdAt: { $gte: weekStart, $lte: now },
        isDeleted: false,
      }),
      User.countDocuments({
        createdAt: { $gte: monthStart, $lte: now },
        isDeleted: false,
      }),
    ]);

    // Get historical data (last 30 days)
    const history = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: subDays(now, 30), $lte: now },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const historyData = history.map((h: any) => ({
      date: format(new Date(h._id.year, h._id.month - 1, h._id.day), 'yyyy-MM-dd'),
      totalUsers: 0,
      newUsers: h.newUsers,
    }));

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      growthRate: {
        daily: 0,
        weekly: 0,
        monthly: 0,
      },
      history: historyData,
    };
  }

  async getRevenueAnalytics(): Promise<IRevenueAnalytics> {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Import PaymentTransaction model
    const { PaymentTransaction } = await import('../../payment.module/paymentTransaction/paymentTransaction.model');

    // Get revenue from successful payments
    const [thisMonthRevenue, lastMonthRevenue] = await Promise.all([
      PaymentTransaction.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart },
            paymentStatus: 'success',
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
      PaymentTransaction.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
            paymentStatus: 'success',
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const thisMonth = thisMonthRevenue[0]?.total || 0;
    const lastMonth = lastMonthRevenue[0]?.total || 0;
    const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0;

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = thisMonth;
    const arr = mrr * 12; // Annual Recurring Revenue

    // Get revenue by subscription type
    const { UserSubscription } = await import('../../subscription.module/userSubscription/userSubscription.model');

    const activeSubscriptions = await UserSubscription.aggregate([
      {
        $match: {
          status: 'active',
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'subscriptionplans',
          localField: 'subscriptionPlanId',
          foreignField: '_id',
          as: 'plan',
        },
      },
      { $unwind: '$plan' },
      {
        $group: {
          _id: '$plan.subscriptionType',
          count: { $sum: 1 },
          revenue: { $sum: '$plan.price' },
        },
      },
    ]);

    const individual = activeSubscriptions.find((s: any) => s._id === 'individual') || { count: 0, revenue: 0 };
    const group = activeSubscriptions.find((s: any) => s._id === 'group') || { count: 0, revenue: 0 };

    // Get monthly revenue history (last 12 months)
    const revenueHistory = await PaymentTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: subMonths(now, 12) },
          paymentStatus: 'success',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const history = revenueHistory.map((h: any) => ({
      month: `${h._id.year}-${String(h._id.month).padStart(2, '0')}`,
      revenue: h.revenue,
      newSubscriptions: 0, // Can be enhanced with subscription data
      churnedSubscriptions: 0, // Can be enhanced with subscription data
    }));

    return {
      mrr,
      arr,
      thisMonth,
      lastMonth,
      growthRate,
      bySubscriptionType: {
        individual: {
          count: individual.count || 0,
          revenue: individual.revenue || 0,
        },
        group: {
          count: group.count || 0,
          revenue: group.revenue || 0,
        },
      },
      history,
    };
  }

  async getTaskMetrics(): Promise<IPlatformTaskMetrics> {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const todayStats = await Task.aggregate([
      {
        $match: {
          startTime: { $gte: todayStart, $lte: todayEnd },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const allTimeStats = await Task.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
    ]);

    const createdToday = todayStats.reduce((sum: number, s: any) => sum + s.count, 0);
    const completedToday = todayStats.find((s: any) => s._id === 'completed')?.count || 0;

    return {
      createdToday,
      completedToday,
      completionRate: createdToday > 0 ? (completedToday / createdToday) * 100 : 0,
      averageTasksPerUser: 0,
      byStatus: {
        pending: 0,
        inProgress: 0,
        completed: allTimeStats[0]?.completed || 0,
      },
      byTaskType: {
        personal: 0,
        singleAssignment: 0,
        collaborative: 0,
      },
      trend: {
        direction: 'stable',
        percentageChange: 0,
        period: 'day',
      },
    };
  }

  async getEngagementMetrics(): Promise<IUserEngagementMetrics> {
    return {
      dau: 0,
      mau: 0,
      dauMauRatio: 0,
      averageSessionDuration: 0,
      sessionsPerUser: 0,
      retentionRate: {
        day1: 0,
        day7: 0,
        day30: 0,
      },
    };
  }

  /**
   * Get user registration data for chart
   * @param type - 'monthly' or 'yearly'
   * @param year - Optional year filter (defaults to current year for monthly)
   * @returns User count data for bar chart
   */
  async getUserRegistrationChartData(
    type: 'monthly' | 'yearly' = 'monthly',
    year?: number
  ): Promise<{
    type: 'monthly' | 'yearly';
    data: {
      period: string;
      label: string;
      count: number;
    }[];
    totalUsers: number;
    growthRate: number;
  }> {
    const now = new Date();
    const currentYear = year || now.getFullYear();

    if (type === 'monthly') {
      // Get monthly data for current year (or specified year)
      const yearStart = new Date(currentYear, 0, 1);
      const yearEnd = new Date(currentYear, 11, 31);

      const monthlyData = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart, $lte: yearEnd },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]);

      // Fill in missing months with 0
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dataMap = new Map(monthlyData.map((d: any) => [d._id.month, d.count]));
      
      const data = monthNames.map((name, index) => ({
        period: (index + 1).toString(),
        label: name,
        count: dataMap.get(index + 1) || 0,
      }));

      const totalUsers = data.reduce((sum, d) => sum + d.count, 0);
      
      // Calculate growth rate (this year vs last year)
      const lastYearStart = new Date(currentYear - 1, 0, 1);
      const lastYearEnd = new Date(currentYear - 1, 11, 31);
      const lastYearTotal = await User.countDocuments({
        createdAt: { $gte: lastYearStart, $lte: lastYearEnd },
        isDeleted: false,
      });
      
      const growthRate = lastYearTotal > 0 
        ? ((totalUsers - lastYearTotal) / lastYearTotal) * 100 
        : 0;

      return {
        type: 'monthly',
        data,
        totalUsers,
        growthRate,
      };
    } else {
      // Get yearly data (last 5 years)
      const fiveYearsAgo = subYears(now, 5);

      const yearlyData = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: fiveYearsAgo },
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1 } },
      ]);

      const data = yearlyData.map((d: any) => ({
        period: d._id.year.toString(),
        label: d._id.year.toString(),
        count: d.count,
      }));

      const totalUsers = data.reduce((sum, d) => sum + d.count, 0);
      
      // Calculate growth rate (this year vs last year)
      const thisYear = data.find(d => d.period === now.getFullYear().toString())?.count || 0;
      const lastYear = data.find(d => d.period === (now.getFullYear() - 1).toString())?.count || 0;
      const growthRate = lastYear > 0 ? ((thisYear - lastYear) / lastYear) * 100 : 0;

      return {
        type: 'yearly',
        data,
        totalUsers,
        growthRate,
      };
    }
  }

  /**
   * Get income/revenue data for chart
   * @param type - 'monthly' or 'yearly'
   * @returns Revenue data for bar chart
   */
  async getIncomeChartData(
    type: 'monthly' | 'yearly' = 'monthly'
  ): Promise<{
    type: 'monthly' | 'yearly';
    data: {
      period: string;
      label: string;
      amount: number;
    }[];
    todayAmount: number;
    weeklyAmount: number;
    monthlyAmount: number;
    growthRate: number;
  }> {
    const now = new Date();
    const { PaymentTransaction } = await import('../../payment.module/paymentTransaction/paymentTransaction.model');

    if (type === 'monthly') {
      // Get monthly revenue for current year
      const yearStart = startOfYear(now);
      
      const monthlyRevenue = await PaymentTransaction.aggregate([
        {
          $match: {
            createdAt: { $gte: yearStart },
            paymentStatus: 'success',
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: {
              month: { $month: '$createdAt' },
            },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.month': 1 } },
      ]);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dataMap = new Map(monthlyRevenue.map((d: any) => [d._id.month, d.amount]));
      
      const data = monthNames.map((name, index) => ({
        period: (index + 1).toString(),
        label: name,
        amount: dataMap.get(index + 1) || 0,
      }));

      // Calculate today, weekly, monthly amounts
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);

      const [todayData, weekData, monthData] = await Promise.all([
        PaymentTransaction.aggregate([
          {
            $match: {
              createdAt: { $gte: todayStart },
              paymentStatus: 'success',
              isDeleted: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PaymentTransaction.aggregate([
          {
            $match: {
              createdAt: { $gte: weekStart },
              paymentStatus: 'success',
              isDeleted: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PaymentTransaction.aggregate([
          {
            $match: {
              createdAt: { $gte: monthStart },
              paymentStatus: 'success',
              isDeleted: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const todayAmount = todayData[0]?.total || 0;
      const weeklyAmount = weekData[0]?.total || 0;
      const monthlyAmount = monthData[0]?.total || 0;

      // Calculate growth rate (this month vs last month)
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const lastMonthData = await PaymentTransaction.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
            paymentStatus: 'success',
            isDeleted: false,
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const lastMonthAmount = lastMonthData[0]?.total || 0;
      const growthRate = lastMonthAmount > 0 
        ? ((monthlyAmount - lastMonthAmount) / lastMonthAmount) * 100 
        : 0;

      return {
        type: 'monthly',
        data,
        todayAmount,
        weeklyAmount,
        monthlyAmount,
        growthRate,
      };
    } else {
      // Get yearly revenue (last 5 years)
      const fiveYearsAgo = subYears(now, 5);

      const yearlyRevenue = await PaymentTransaction.aggregate([
        {
          $match: {
            createdAt: { $gte: fiveYearsAgo },
            paymentStatus: 'success',
            isDeleted: false,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
            },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': 1 } },
      ]);

      const data = yearlyRevenue.map((d: any) => ({
        period: d._id.year.toString(),
        label: d._id.year.toString(),
        amount: d.amount,
      }));

      // Calculate today, weekly, monthly amounts (same as monthly)
      const todayStart = startOfDay(now);
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);

      const [todayData, weekData, monthData] = await Promise.all([
        PaymentTransaction.aggregate([
          {
            $match: {
              createdAt: { $gte: todayStart },
              paymentStatus: 'success',
              isDeleted: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PaymentTransaction.aggregate([
          {
            $match: {
              createdAt: { $gte: weekStart },
              paymentStatus: 'success',
              isDeleted: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        PaymentTransaction.aggregate([
          {
            $match: {
              createdAt: { $gte: monthStart },
              paymentStatus: 'success',
              isDeleted: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
      ]);

      const todayAmount = todayData[0]?.total || 0;
      const weeklyAmount = weekData[0]?.total || 0;
      const monthlyAmount = monthData[0]?.total || 0;

      // Calculate growth rate
      const thisYear = data.find(d => d.period === now.getFullYear().toString())?.amount || 0;
      const lastYear = data.find(d => d.period === (now.getFullYear() - 1).toString())?.amount || 0;
      const growthRate = lastYear > 0 ? ((thisYear - lastYear) / lastYear) * 100 : 0;

      return {
        type: 'yearly',
        data,
        todayAmount,
        weeklyAmount,
        monthlyAmount,
        growthRate,
      };
    }
  }

  async getUserRatioChartData(
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<IUserRatioChartData> {
    const now = new Date();
    let startDate: Date;
    let dateFormat: string;
    let groupBy: any;

    // Determine date range and grouping based on type
    switch (type) {
      case 'daily':
        startDate = subDays(now, 7);
        dateFormat = 'HH:mm';
        groupBy = {
          hour: { $hour: '$createdAt' },
          minute: { $minute: '$createdAt' },
        };
        break;
      case 'weekly':
        startDate = subDays(now, 28); // 4 weeks
        dateFormat = 'EEEE';
        groupBy = {
          dayOfWeek: { $dayOfWeek: '$createdAt' },
        };
        break;
      case 'yearly':
        startDate = subMonths(now, 12);
        dateFormat = 'MMM yyyy';
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case 'monthly':
      default:
        startDate = subMonths(now, 6); // 6 months
        dateFormat = 'MMM dd';
        groupBy = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
    }

    // Aggregate user data
    const aggregationPipeline = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: groupBy,
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $gt: ['$lastActiveAt', startDate] }, 1, 0] },
          },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
    ]);

    // Transform aggregation results
    const data = aggregationPipeline.map((item: any) => {
      const date = new Date(
        item._id.year || now.getFullYear(),
        item._id.month ? item._id.month - 1 : now.getMonth(),
        item._id.day || now.getDate(),
        item._id.hour || 0,
        item._id.minute || 0
      );

      const totalUsers = item.totalUsers || 0;
      const activeUsers = item.activeUsers || 0;
      const inactiveUsers = totalUsers - activeUsers;
      const activityRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;

      return {
        period: format(date, dateFormat),
        totalUsers,
        activeUsers,
        newUsers: item.newUsers || 0,
        inactiveUsers,
        activityRate: Math.round(activityRate * 100) / 100,
      };
    });

    // Calculate summary statistics
    const totalUsers = data.reduce((sum, item) => sum + item.totalUsers, 0);
    const avgActiveUsers =
      data.length > 0
        ? data.reduce((sum, item) => sum + item.activeUsers, 0) / data.length
        : 0;
    const avgActivityRate =
      data.length > 0
        ? data.reduce((sum, item) => sum + item.activityRate, 0) / data.length
        : 0;

    // Determine trend (compare first half vs second half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalfAvg =
      midpoint > 0
        ? data.slice(0, midpoint).reduce((sum, item) => sum + item.activityRate, 0) / midpoint
        : 0;
    const secondHalfAvg =
      midpoint > 0
        ? data.slice(midpoint).reduce((sum, item) => sum + item.activityRate, 0) /
          (data.length - midpoint)
        : avgActivityRate;

    const percentageChange =
      firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
    const trend: 'increasing' | 'decreasing' | 'stable' =
      percentageChange > 5 ? 'increasing' : percentageChange < -5 ? 'decreasing' : 'stable';

    return {
      type,
      data,
      summary: {
        totalUsers,
        averageActiveUsers: Math.round(avgActiveUsers * 100) / 100,
        averageActivityRate: Math.round(avgActivityRate * 100) / 100,
        trend,
        percentageChange: Math.round(percentageChange * 100) / 100,
      },
    };
  }

  async getCohortAnalysis(months: number = 6): Promise<any[]> {
    return [];
  }

  async getChurnAnalytics(period: 'month' | 'quarter' | 'year' = 'month'): Promise<any> {
    return { period, totalChurnedUsers: 0, churnRate: 0, trends: [] };
  }

  async getPredictiveAnalytics(months: number = 3): Promise<any> {
    return { forecast: [], insights: [] };
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
