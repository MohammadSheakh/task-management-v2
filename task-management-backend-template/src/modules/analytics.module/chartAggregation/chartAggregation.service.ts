/**
 * Chart-Specific Aggregation Endpoints for Analytics Module
 * These endpoints provide data specifically formatted for Figma dashboard charts
 *
 * Figma Reference:
 * - main-admin-dashboard/dashboard-section-flow.png
 * - teacher-parent-dashboard/dashboard/dashboard-flow-01.png
 * - teacher-parent-dashboard/task-monitoring/
 *
 * @version 1.0.0
 * @date: 12-03-26
 */

//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import { Task } from '../../task.module/task/task.model';
import { User } from '../../user.module/user/user.model';
import { TaskProgress } from '../../taskProgress.module/taskProgress.model';
import { ChildrenBusinessUser } from '../../childrenBusinessUser.module/childrenBusinessUser.model';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import {
  subDays,
  subMonths,
  format,
  eachDayOfInterval
} from 'date-fns';
import { TaskStatus } from '../../task.module/task/task.constant';

/**
 * Chart Data Interfaces
 */
interface IChartSeries {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color?: string;
  }[];
}

interface ITaskStatusChart {
  total: number;
  distribution: {
    status: string;
    count: number;
    percentage: number;
  }[];
}

interface IActivityHeatmap {
  days: string[];
  hours: number[];
  activity: {
    day: string;
    hour: number;
    count: number;
  }[];
}

/**
 * Chart-Specific Aggregation Service
 */
export class ChartAggregationService {
  private getCacheKey(type: string, userId?: string): string {
    return `analytics:charts:${type}:${userId || 'global'}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await redisClient.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (error) {
      errorLogger.error('Redis GET error in ChartAggregation:', error);
      return null;
    }
  }

  private async setInCache<T>(
    key: string,
    data: T,
    ttl: number = 300,
  ): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in ChartAggregation:', error);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Admin Dashboard Charts
  // Figma: main-admin-dashboard/dashboard-section-flow.png
  // ────────────────────────────────────────────────────────────────────────

  /**
   * User Growth Chart (Line Chart)
   * Last 30 days of new user registrations
   */
  async getUserGrowthChart(days: number = 30): Promise<IChartSeries> {
    const cacheKey = this.getCacheKey(`user-growth-${days}`);

    const cached = await this.getFromCache<IChartSeries>(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Aggregate new users per day
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
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

    // Fill in missing days with 0
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const growthMap = new Map(
      userGrowth.map((g: any) => [
        format(new Date(g._id.year, g._id.month - 1, g._id.day), 'yyyy-MM-dd'),
        g.newUsers,
      ]),
    );

    const labels = allDays.map(day => format(day, 'MMM dd'));
    const data = allDays.map(
      day => growthMap.get(format(day, 'yyyy-MM-dd')) || 0,
    );

    const result: IChartSeries = {
      labels,
      datasets: [
        {
          label: 'New Users',
          data,
          color: '#4F46E5',
        },
      ],
    };

    await this.setInCache(cacheKey, result, 300); // 5 min TTL
    return result;
  }

  /**
   * Task Status Distribution (Pie/Donut Chart)
   * Platform-wide task status breakdown
   */
  async getTaskStatusDistribution(): Promise<ITaskStatusChart> {
    const cacheKey = this.getCacheKey('task-status-dist');

    const cached = await this.getFromCache<ITaskStatusChart>(cacheKey);
    if (cached) return cached;

    const distribution = await Task.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = distribution.reduce(
      (sum: number, d: any) => sum + d.count,
      0,
    );

    const result: ITaskStatusChart = {
      total,
      distribution: distribution.map((d: any) => ({
        status: d._id,
        count: d.count,
        percentage: total > 0 ? (d.count / total) * 100 : 0,
      })),
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }

  /**
   * Monthly Income Chart (Bar Chart)
   * Last 12 months revenue from subscriptions
   */
  async getMonthlyIncomeChart(months: number = 12): Promise<IChartSeries> {
    const cacheKey = this.getCacheKey(`monthly-income-${months}`);

    const cached = await this.getFromCache<IChartSeries>(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    // Note: This requires payment/subscription transaction data
    // Placeholder - implement based on actual payment collection
    const labels = [];
    const data = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(endDate, i);
      labels.push(format(date, 'MMM yyyy'));
      data.push(0); // Replace with actual revenue data
    }

    const result: IChartSeries = {
      labels,
      datasets: [
        {
          label: 'Revenue ($)',
          data,
          color: '#10B981',
        },
      ],
    };

    await this.setInCache(cacheKey, result, 600); // 10 min TTL
    return result;
  }

  /**
   * User Ratio Chart (Pie Chart)
   * Individual vs Business users
   */
  async getUserRatioChart(): Promise<ITaskStatusChart> {
    const cacheKey = this.getCacheKey('user-ratio');

    const cached = await this.getFromCache<ITaskStatusChart>(cacheKey);
    if (cached) return cached;

    const distribution = await User.aggregate([
      {
        $match: {
          isDeleted: false,
          subscriptionType: {
            $in: [
              'individual',
              'business_starter',
              'business_level1',
              'business_level2',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$subscriptionType',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = distribution.reduce(
      (sum: number, d: any) => sum + d.count,
      0,
    );

    // Group business subscriptions
    const individualCount =
      distribution.find((d: any) => d._id === 'individual')?.count || 0;
    const businessCount = distribution
      .filter((d: any) => d._id?.includes('business'))
      .reduce((sum: number, d: any) => sum + d.count, 0);

    const result: ITaskStatusChart = {
      total,
      distribution: [
        {
          status: 'Individual',
          count: individualCount,
          percentage: total > 0 ? (individualCount / total) * 100 : 0,
        },
        {
          status: 'Business',
          count: businessCount,
          percentage: total > 0 ? (businessCount / total) * 100 : 0,
        },
      ],
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Parent Dashboard Charts
  // Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Family Task Activity Chart (Bar Chart)
   * Daily task completion for family members
   */
  async getFamilyTaskActivityChart(
    businessUserId: string,
    days: number = 7,
  ): Promise<IChartSeries> {
    const cacheKey = this.getCacheKey(
      `family-activity-${businessUserId}-${days}`,
    );

    const cached = await this.getFromCache<IChartSeries>(cacheKey);
    if (cached) return cached;

    // Get all children of this business user
    const children = await ChildrenBusinessUser.find({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: 'active',
      isDeleted: false,
    }).select('childUserId');

    const childIds = children.map(c => c.childUserId);

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Get task completions per day
    const taskCompletions = await Task.aggregate([
      {
        $match: {
          ownerUserId: { $in: childIds },
          status: 'completed',
          completedTime: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedTime' },
            month: { $month: '$completedTime' },
            day: { $dayOfMonth: '$completedTime' },
          },
          completed: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const completionMap = new Map(
      taskCompletions.map((t: any) => [
        format(new Date(t._id.year, t._id.month - 1, t._id.day), 'yyyy-MM-dd'),
        t.completed,
      ]),
    );

    const labels = allDays.map(day => format(day, 'MMM dd'));
    const data = allDays.map(
      day => completionMap.get(format(day, 'yyyy-MM-dd')) || 0,
    );

    const result: IChartSeries = {
      labels,
      datasets: [
        {
          label: 'Tasks Completed',
          data,
          color: '#3B82F6',
        },
      ],
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }

  /** ✔️✔️
   * Child Progress Comparison (Radar/Bar Chart) [ NOT NEEDED FOR PARENT DASHBOARD ]
   * Compare all children's task completion rates
   *
   * Updated: 16-03-26 - Now returns full task statistics for Team Overview cards
   * Figma: teacher-parent-dashboard/dashboard/dashboard-flow-01.png
   */
  async getChildProgressComparison(businessUserId: string): Promise<any> {
    const cacheKey = this.getCacheKey(`child-comparison-${businessUserId}`);

    // const cached = await this.getFromCache<any>(cacheKey);
    // if (cached) return cached;

    // Get all children with their user details
    const children = await ChildrenBusinessUser.find({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: 'active',
      isDeleted: false,
    }).populate('childUserId', 'name profileImage email');

    // Get task statistics for each child
    const childrenWithStats = await Promise.all(
      children.map(async child => {
        const childId = child.childUserId;
        const childUser = child.childUserId as any;

        // Get task status distribution for this child
        const stats = await Task.aggregate([
          {
            $match: {
              ownerUserId: new Types.ObjectId(childId),
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

        const total = stats.reduce((sum: number, s: any) => sum + s.count, 0);
        const pending = stats.find((s: any) => s._id === TaskStatus.PENDING)?.count || 0;
        const inProgress =
          stats.find((s: any) => s._id === TaskStatus.IN_PROGRESS)?.count || 0;
        const completed =
          stats.find((s: any) => s._id === TaskStatus.COMPLETED)?.count || 0;

        return {
          // childId: childId, //.toString()
          childName: childUser.name || 'Child',
          profileImage: childUser.profileImage || null,
          email: childUser.email || null,
          isSecondaryUser: child.isSecondaryUser || false,
          totalTasks: total,
          pendingTasks: pending,
          inProgressTasks: inProgress,
          completedTasks: completed,
          completionRate:
            total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0,
        };
      }),
    );


    /*--------------------*/

    // Get task status distribution for Parent
    const stats = await Task.aggregate([
      {
        $match: {
          ownerUserId: new Types.ObjectId(businessUserId),
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
    
    console.log("businessUserId :: ", businessUserId)

    // Get parents name, email and profile image
    const parentBasicInfo = await User.findById(businessUserId).select("name email profileImage")

    console.log("parentBasicInfo", parentBasicInfo);

    const total = stats.reduce((sum: number, s: any) => sum + s.count, 0);
    const pending = stats.find((s: any) => s._id === TaskStatus.PENDING)?.count || 0;
    const inProgress =
      stats.find((s: any) => s._id === TaskStatus.IN_PROGRESS)?.count || 0;
    const completed =
      stats.find((s: any) => s._id === TaskStatus.COMPLETED)?.count || 0;

    const parentInfo = {
      childName: parentBasicInfo.name,
      profileImage: parentBasicInfo.profileImage,
      email: parentBasicInfo.email,
      isPrimaryUser: true,
      totalTasks: total,
      pendingTasks: pending,
      inProgressTasks: inProgress,
      completedTasks: completed,
      completionRate:
        total > 0 ? Math.round((completed / total) * 100 * 10) / 10 : 0,
    };


    /*--------------------*/



    // Sort by completion rate (highest first)
    childrenWithStats.sort((a, b) => b.completionRate - a.completionRate);

    // Format for chart (backward compatibility)
    const chartData: IChartSeries = {
      labels: childrenWithStats.map(c => c.childName),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: childrenWithStats.map(c => c.completionRate),
          color: '#8B5CF6',
        },
      ],
    };

    // Return both chart data and full children statistics
    const result = {
      chart: chartData,
      parentInfo : parentInfo,
      children: childrenWithStats,
      totalMembers: childrenWithStats.length,
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }

  /**
   * Task Status by Child (Stacked Bar Chart)
   */
  async getTaskStatusByChild(businessUserId: string): Promise<any> {
    const cacheKey = this.getCacheKey(`status-by-child-${businessUserId}`);

    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    // Get all children
    const children = await ChildrenBusinessUser.find({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: 'active',
      isDeleted: false,
    }).populate('childUserId', 'name');

    const childIds = children.map(c => c.childUserId);
    const childNames = children.map(
      c => (c.childUserId as any).name || 'Child',
    );

    // Get status distribution for each child
    const statusData = await Task.aggregate([
      {
        $match: {
          ownerUserId: { $in: childIds },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            owner: '$ownerUserId',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Organize data by status
    const statuses = ['pending', 'inProgress', 'completed'];
    const datasets = statuses.map((status, index) => ({
      label: status,
      data: childIds.map((childId, childIndex) => {
        const found = statusData.find(
          (s: any) =>
            s._id.owner.toString() === childId.toString() &&
            s._id.status === status,
        );
        return found ? found.count : 0;
      }),
      color: ['#F59E0B', '#3B82F6', '#10B981'][index],
    }));

    const result = {
      labels: childNames,
      datasets,
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Task Monitoring Charts
  // Figma: teacher-parent-dashboard/task-monitoring/
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Task Completion Trend (Line Chart)
   * Shows completion trend over time
   */
  async getTaskCompletionTrend(
    userId: string,
    days: number = 30,
  ): Promise<IChartSeries> {
    const cacheKey = this.getCacheKey(`completion-trend-${userId}-${days}`);

    const cached = await this.getFromCache<IChartSeries>(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const completions = await Task.aggregate([
      {
        $match: {
          ownerUserId: new Types.ObjectId(userId),
          status: 'completed',
          completedTime: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedTime' },
            month: { $month: '$completedTime' },
            day: { $dayOfMonth: '$completedTime' },
          },
          completed: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const completionMap = new Map(
      completions.map((c: any) => [
        format(new Date(c._id.year, c._id.month - 1, c._id.day), 'yyyy-MM-dd'),
        c.completed,
      ]),
    );

    // Calculate cumulative total
    let cumulative = 0;
    const cumulativeData = allDays.map(day => {
      const daily = completionMap.get(format(day, 'yyyy-MM-dd')) || 0;
      cumulative += daily;
      return cumulative;
    });

    const labels = allDays.map(day => format(day, 'MMM dd'));

    const result: IChartSeries = {
      labels,
      datasets: [
        {
          label: 'Cumulative Completed',
          data: cumulativeData,
          color: '#10B981',
        },
      ],
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }

  /**
   * Activity Heatmap (Calendar Heatmap)
   * Shows task activity by day and hour
   */
  async getActivityHeatmap(
    userId: string,
    days: number = 30,
  ): Promise<IActivityHeatmap> {
    const cacheKey = this.getCacheKey(`heatmap-${userId}-${days}`);

    const cached = await this.getFromCache<IActivityHeatmap>(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const activity = await Task.aggregate([
      {
        $match: {
          ownerUserId: new Types.ObjectId(userId),
          startTime: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: {
            day: { $dayOfWeek: '$startTime' },
            hour: { $hour: '$startTime' },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const result: IActivityHeatmap = {
      days: dayNames,
      hours,
      activity: activity.map((a: any) => ({
        day: dayNames[a._id.day - 1] || 'Unknown',
        hour: a._id.hour,
        count: a.count,
      })),
    };

    await this.setInCache(cacheKey, result, 600);
    return result;
  }

  /**
   * Collaborative Task Progress (Progress Bars)
   * Shows each child's progress on collaborative tasks
   */
  async getCollaborativeTaskProgress(taskId: string): Promise<any> {
    const cacheKey = this.getCacheKey(`collab-progress-${taskId}`);

    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const progressRecords = await TaskProgress.find({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).populate('userId', 'name profileImage');

    const result = {
      taskId,
      children: progressRecords.map((record: any) => ({
        childId: record.userId._id,
        childName: record.userId.name,
        profileImage: record.userId.profileImage?.imageUrl,
        status: record.status,
        progressPercentage: record.progressPercentage,
        completedSubtasks: record.completedSubtaskIndexes.length,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
      })),
    };

    await this.setInCache(cacheKey, result, 300);
    return result;
  }
}

export const chartAggregationService = new ChartAggregationService();
