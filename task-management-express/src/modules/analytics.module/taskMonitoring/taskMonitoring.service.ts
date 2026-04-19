/**
 * Task Monitoring Service
 * Provides analytics data for parent/teacher task monitoring dashboard
 *
 * Figma Reference:
 * - teacher-parent-dashboard/task-monitoring/task-monitoring-flow-01.png
 *
 * @version 1.0.0
 * @date: 17-03-26
 */

//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import { Types } from 'mongoose';
import { Task } from '../../task.module/task/task.model';
import { ChildrenBusinessUser } from '../../childrenBusinessUser.module/childrenBusinessUser.model';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  subYears,
  format,
} from 'date-fns';

/**
 * Task Monitoring Service
 * Handles business logic for task monitoring dashboard
 */
export class TaskMonitoringService {
  /**
   * Cache Key Generator
   */
  private getCacheKey(type: string, businessUserId?: string, period?: string): string {
    return `analytics:task-monitoring:${type}:${businessUserId || 'global'}:${period || 'monthly'}`;
  }

  /**
   * Get from Cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error in TaskMonitoringService:', error);
      return null;
    }
  }

  /**
   * Set in Cache
   */
  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in TaskMonitoringService:', error);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Task Monitoring Summary (Top Statistics Cards)
  // Figma: task-monitoring-flow-01.png (Top 4 cards)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get task monitoring summary for parent dashboard
   * Returns counts for: Not Started, In Progress, My Tasks, Completed
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @returns Summary statistics for all 4 cards
   *
   * @description
   * This endpoint provides the data for the top 4 statistics cards:
   * 1. Not Started Tasks - Children's pending tasks
   * 2. In Progress - Children's in-progress tasks
   * 3. My Tasks - Parent's personal tasks
   * 4. Completed Tasks - Children's completed tasks
   */
  async getTaskMonitoringSummary(businessUserId: string): Promise<{
    notStartedTasks: number;
    inProgressTasks: number;
    myTasks: number;
    completedTasks: number;
    totalTasks: number;
  }> {
    const cacheKey = this.getCacheKey('summary', businessUserId);

    // Try cache first (5 minutes for summary data)
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for task monitoring summary: ${cacheKey}`);
      return cached;
    }

    // Get all active children for this business user
    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: 'active',
      isDeleted: false,
    })
      .select('childUserId')
      .lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    // If no children, return zeros for children's tasks
    if (childUserIds.length === 0) {
      // Still return parent's personal tasks
      const myTasksCount = await Task.countDocuments({
        ownerUserId: new Types.ObjectId(businessUserId),
        taskType: 'personal',
        isDeleted: false,
      });

      const result = {
        notStartedTasks: 0,
        inProgressTasks: 0,
        myTasks: myTasksCount,
        completedTasks: 0,
        totalTasks: myTasksCount,
      };

      // Cache the result
      await this.setInCache(cacheKey, result, 300); // 5 minutes
      return result;
    }

    // Get task counts in parallel for better performance
    const [notStartedCount, inProgressCount, completedCount, myTasksCount] =
      await Promise.all([
        // Not Started (pending tasks assigned to children)
        Task.countDocuments({
          assignedUserIds: { $in: childUserIds },
          status: 'pending',
          isDeleted: false,
        }),

        // In Progress (tasks assigned to children)
        Task.countDocuments({
          assignedUserIds: { $in: childUserIds },
          status: 'inProgress',
          isDeleted: false,
        }),

        // Completed (tasks assigned to children)
        Task.countDocuments({
          assignedUserIds: { $in: childUserIds },
          status: 'completed',
          isDeleted: false,
        }),

        // My Tasks (parent's personal tasks)
        Task.countDocuments({
          ownerUserId: new Types.ObjectId(businessUserId),
          taskType: 'personal',
          isDeleted: false,
        }),
      ]);

    const result = {
      notStartedTasks: notStartedCount,
      inProgressTasks: inProgressCount,
      myTasks: myTasksCount,
      completedTasks: completedCount,
      totalTasks: notStartedCount + inProgressCount + completedCount + myTasksCount,
    };

    // Cache the result
    await this.setInCache(cacheKey, result, 300); // 5 minutes

    logger.info(`Task monitoring summary calculated for business user: ${businessUserId}`);
    return result;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Task Activity Chart (Monthly/Annual)
  // Figma: task-monitoring-flow-01.png (Task Activity bar chart)
  // ────────────────────────────────────────────────────────────────────────

  /**
   * Get task activity chart data for parent dashboard
   * Returns monthly or annual task creation data
   *
   * @param businessUserId - Parent/Teacher business user ID
   * @param period - 'monthly' (last 12 months) or 'annual' (last 5 years)
   * @param year - Specific year (optional, defaults to current year)
   * @returns Chart data with labels, datasets, and statistics
   *
   * @description
   * This endpoint provides data for the Task Activity bar chart:
   * - Monthly view: Shows tasks per month for the current year
   * - Annual view: Shows tasks per year for the last 5 years
   * - Includes growth percentage calculation
   */
  async getTaskActivityChart(
    businessUserId: string,
    period: 'monthly' | 'annual' = 'monthly',
    year?: number
  ): Promise<{
    period: string;
    year: number;
    chartData: {
      labels: string[];
      datasets: {
        label: string;
        data: number[];
        color?: string;
      }[];
    };
    statistics: {
      totalTasks: number;
      averagePerPeriod: number;
      peakPeriod: string;
      growthPercentage: number;
    };
  }> {
    const cacheKey = this.getCacheKey('activity', businessUserId, period);

    // Try cache first (10 minutes for chart data)
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for task activity chart: ${cacheKey}`);
      return cached;
    }

    const currentYear = year || new Date().getFullYear();

    // Get all active children for this business user
    const childrenRelations = await ChildrenBusinessUser.find({
      parentBusinessUserId: new Types.ObjectId(businessUserId),
      status: 'active',
      isDeleted: false,
    })
      .select('childUserId')
      .lean();

    const childUserIds = childrenRelations.map((rel: any) => rel.childUserId);

    // If no children, return empty chart
    if (childUserIds.length === 0) {
      const emptyResult = {
        period,
        year: currentYear,
        chartData: {
          labels: period === 'monthly' 
            ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
            : [`${currentYear - 4}`, `${currentYear - 3}`, `${currentYear - 2}`, `${currentYear - 1}`, `${currentYear}`],
          datasets: [
            {
              label: 'Tasks Created',
              data: period === 'monthly' ? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0],
              color: '#3B82F6',
            },
          ],
        },
        statistics: {
          totalTasks: 0,
          averagePerPeriod: 0,
          peakPeriod: 'N/A',
          growthPercentage: 0,
        },
      };

      // Cache the result
      await this.setInCache(cacheKey, emptyResult, 600); // 10 minutes
      return emptyResult;
    }

    // Build aggregation pipeline based on period
    const pipeline: any[] = [];

    if (period === 'monthly') {
      // Monthly view: Group by month for the specified year
      pipeline.push(
        {
          $match: {
            assignedUserIds: { $in: childUserIds },
            isDeleted: false,
            createdAt: {
              $gte: startOfMonth(new Date(currentYear, 0, 1)),
              $lte: endOfMonth(new Date(currentYear, 11, 31)),
            },
          },
        },
        {
          $group: {
            _id: { $month: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        }
      );
    } else {
      // Annual view: Group by year for the last 5 years
      pipeline.push(
        {
          $match: {
            assignedUserIds: { $in: childUserIds },
            isDeleted: false,
            createdAt: {
              $gte: startOfYear(subYears(new Date(), 4)),
              $lte: endOfYear(new Date()),
            },
          },
        },
        {
          $group: {
            _id: { $year: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        }
      );
    }

    const taskCounts = await Task.aggregate(pipeline);

    // Create labels and fill in missing periods with 0
    let labels: string[] = [];
    let data: number[] = [];

    if (period === 'monthly') {
      labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      data = labels.map((_, index) => {
        const monthData = taskCounts.find((t: any) => t._id === index + 1);
        return monthData ? monthData.count : 0;
      });
    } else {
      const years = [];
      for (let i = currentYear - 4; i <= currentYear; i++) {
        years.push(`${i}`);
      }
      labels = years;
      data = years.map((yearStr) => {
        const yearData = taskCounts.find((t: any) => t._id === parseInt(yearStr));
        return yearData ? yearData.count : 0;
      });
    }

    // Calculate statistics
    const totalTasks = data.reduce((sum, count) => sum + count, 0);
    const averagePerPeriod = Math.round(totalTasks / (period === 'monthly' ? 12 : 5));
    const maxCount = Math.max(...data, 0);
    const peakPeriodIndex = data.indexOf(maxCount);
    const peakPeriod = peakPeriodIndex >= 0 ? labels[peakPeriodIndex] : 'N/A';

    // Calculate growth percentage
    const growthPercentage = await this.calculateGrowthPercentage(
      childUserIds,
      currentYear,
      period
    );

    const result = {
      period,
      year: currentYear,
      chartData: {
        labels,
        datasets: [
          {
            label: 'Tasks Created',
            data,
            color: '#3B82F6',
          },
        ],
      },
      statistics: {
        totalTasks,
        averagePerPeriod,
        peakPeriod,
        growthPercentage,
      },
    };

    // Cache the result
    await this.setInCache(cacheKey, result, 600); // 10 minutes

    logger.info(`Task activity chart calculated for business user: ${businessUserId} (period: ${period})`);
    return result;
  }

  /**
   * Calculate growth percentage compared to previous period
   */
  private async calculateGrowthPercentage(
    childUserIds: Types.ObjectId[],
    currentYear: number,
    period: 'monthly' | 'annual'
  ): Promise<number> {
    try {
      if (period === 'monthly') {
        // Compare current year to previous year
        const [currentYearTasks, previousYearTasks] = await Promise.all([
          Task.countDocuments({
            assignedUserIds: { $in: childUserIds },
            isDeleted: false,
            createdAt: {
              $gte: startOfYear(new Date(currentYear, 0, 1)),
              $lte: endOfYear(new Date(currentYear, 11, 31)),
            },
          }),
          Task.countDocuments({
            assignedUserIds: { $in: childUserIds },
            isDeleted: false,
            createdAt: {
              $gte: startOfYear(new Date(currentYear - 1, 0, 1)),
              $lte: endOfYear(new Date(currentYear - 1, 11, 31)),
            },
          }),
        ]);

        if (previousYearTasks === 0) return currentYearTasks > 0 ? 100 : 0;

        return Math.round(((currentYearTasks - previousYearTasks) / previousYearTasks) * 100);
      } else {
        // For annual view, compare last 5 years average to previous 5 years
        const fiveYearsAgo = currentYear - 5;
        const [recent5Years, previous5Years] = await Promise.all([
          Task.countDocuments({
            assignedUserIds: { $in: childUserIds },
            isDeleted: false,
            createdAt: {
              $gte: startOfYear(new Date(fiveYearsAgo, 0, 1)),
              $lte: endOfYear(new Date(currentYear, 11, 31)),
            },
          }),
          Task.countDocuments({
            assignedUserIds: { $in: childUserIds },
            isDeleted: false,
            createdAt: {
              $gte: startOfYear(new Date(fiveYearsAgo - 5, 0, 1)),
              $lte: endOfYear(new Date(fiveYearsAgo - 1, 11, 31)),
            },
          }),
        ]);

        if (previous5Years === 0) return recent5Years > 0 ? 100 : 0;

        return Math.round(((recent5Years - previous5Years) / previous5Years) * 100);
      }
    } catch (error) {
      errorLogger.error('Error calculating growth percentage:', error);
      return 0;
    }
  }
}
