//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types, Model } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { Task } from '../../task.module/task/task.model';
import { ITask } from '../../task.module/task/task.interface';
import {
  IUserOverviewAnalytics,
  IDailyProgress,
  IStreakData,
  IProductivityScore,
  ICompletionRateAnalytics,
  ITaskStatistics,
  ITrendAnalytics,
  ITrendDataPoint,
} from './userAnalytics.interface';
import {
  ANALYTICS_CACHE_CONFIG,
  PRODUCTIVITY_SCORE_WEIGHTS,
  STREAK_CONFIG,
  TAnalyticsTimeRange,
} from '../analytics.constant';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  format,
  isSameDay,
} from 'date-fns';
import { TaskStatus, TaskType, TaskPriority } from '../../task.module/task/task.constant';
import { TaskProgressStatus } from '../../taskProgress.module/taskProgress.constant';

/**
 * User Analytics Service
 * Handles all user-level analytics with Redis caching
 * 
 * Features:
 * - Cache-aside pattern for all queries
 * - Aggregation pipelines for complex calculations
 * - Streak tracking with grace period
 * - Productivity score calculation (0-100)
 * 
 * @version 1.0.0
 * @see Figma: home-flow.png, profile-permission-account-interface.png
 */
export class UserAnalyticsService {
  private getCacheKey(type: string, userId: string): string {
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:user:${userId}:${type}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error in UserAnalytics:', error);
      return null;
    }
  }

  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
      logger.info(`Cache set: ${key} (TTL: ${ttl}s)`);
    } catch (error) {
      errorLogger.error('Redis SET error in UserAnalytics:', error);
    }
  }

  private async invalidateCache(userId: string, types?: string[]): Promise<void> {
    try {
      const typesToInvalidate = types || [
        'overview',
        'daily-progress',
        'streak',
        'productivity',
        'completion-rate',
      ];

      const keysToDelete = typesToInvalidate.map(type =>
        this.getCacheKey(type, userId)
      );

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
        logger.info(`Invalidated ${keysToDelete.length} cache keys for user ${userId}`);
      }
    } catch (error) {
      errorLogger.error('Redis DELETE error in UserAnalytics:', error);
    }
  }

  /** ✔️
   * Get User Overview Analytics
   * Main analytics endpoint for user dashboard
   */
  async getUserOverview(userId: Types.ObjectId): Promise<IUserOverviewAnalytics> {
    const cacheKey = this.getCacheKey('overview', userId.toString());

    // Try cache first
    const cached = await this.getFromCache<IUserOverviewAnalytics>(cacheKey);
    if (cached) {
      logger.info(`Cache hit for user overview: ${userId}`);
      return cached;
    }

    // Cache miss - calculate analytics
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Parallel aggregation for performance
    const [todayStats, weekStats, monthStats, allTimeStats, streakData] = await Promise.all([
      this.getTaskStatsForPeriod(userId, todayStart, todayEnd),
      this.getTaskStatsForPeriod(userId, weekStart, weekEnd),
      this.getTaskStatsForPeriod(userId, monthStart, monthEnd),
      this.getTaskStatsForPeriod(userId, new Date(0), now),
      this.getStreak(userId),
    ]);

    const overview: IUserOverviewAnalytics = {
      userId,
      overview: {
        totalTasks: allTimeStats.total,
        completedTasks: allTimeStats.completed,
        pendingTasks: allTimeStats.pending,
        inProgressTasks: allTimeStats.inProgress,
        completionRate: allTimeStats.total > 0
          ? (allTimeStats.completed / allTimeStats.total) * 100
          : 0,
        currentStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
        productivityScore: await this.calculateProductivityScore(userId, allTimeStats),
      },
      today: {
        totalTasks: todayStats.total,
        completedTasks: todayStats.completed,
        pendingTasks: todayStats.pending,
        inProgressTasks: todayStats.inProgress,
        progress: `${todayStats.completed}/${todayStats.total}`,
        completionRate: todayStats.total > 0
          ? (todayStats.completed / todayStats.total) * 100
          : 0,
      },
      thisWeek: {
        totalTasks: weekStats.total,
        completedTasks: weekStats.completed,
        completionRate: weekStats.total > 0
          ? (weekStats.completed / weekStats.total) * 100
          : 0,
      },
      thisMonth: {
        totalTasks: monthStats.total,
        completedTasks: monthStats.completed,
        completionRate: monthStats.total > 0
          ? (monthStats.completed / monthStats.total) * 100
          : 0,
      },
      lastUpdated: new Date(),
    };

    // Cache the result
    await this.setInCache(
      cacheKey,
      overview,
      ANALYTICS_CACHE_CONFIG.USER_OVERVIEW
    );

    return overview;
  }

  /** ✔️
   * Get Daily Progress
   * Shows today's task progress (X/Y completed)
   */
  async getDailyProgress(userId: Types.ObjectId): Promise<IDailyProgress> {
    const cacheKey = this.getCacheKey('daily-progress', userId.toString());

    const cached = await this.getFromCache<IDailyProgress>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const now = new Date();
    const stats = await this.getTaskStatsForPeriod(userId, startOfDay(now), endOfDay(now));

    const progress: IDailyProgress = {
      totalTasks: stats.total,
      completedTasks: stats.completed,
      pendingTasks: stats.pending,
      inProgressTasks: stats.inProgress,
      progress: `${stats.completed}/${stats.total}`,
      completionRate: stats.total > 0
        ? (stats.completed / stats.total) * 100
        : 0,
    };

    await this.setInCache(
      cacheKey,
      progress,
      ANALYTICS_CACHE_CONFIG.USER_DAILY_PROGRESS
    );

    return progress;
  }

  /** 🔂
   * Get Streak Data
   * Calculates current and longest streak
   */
  async getStreak(userId: Types.ObjectId): Promise<IStreakData> {
    const cacheKey = this.getCacheKey('streak', userId.toString());

    const cached = await this.getFromCache<IStreakData>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all completed tasks with completion date
    const completedTasks = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          status: 'completed',
          completedTime: { $exists: true, $ne: null },
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
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 },
      },
    ]);

    if (completedTasks.length === 0) {
      const emptyStreak: IStreakData = {
        currentStreak: 0,
        longestStreak: 0,
        streakHistory: [],
      };

      await this.setInCache(cacheKey, emptyStreak, ANALYTICS_CACHE_CONFIG.USER_STREAK);
      return emptyStreak;
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const streakHistory: { date: Date; tasksCompleted: number; isActive: boolean }[] = [];

    const now = new Date();
    const today = startOfDay(now);
    const yesterday = startOfDay(subDays(now, 1));

    // Process tasks to calculate streaks
    for (let i = 0; i < completedTasks.length; i++) {
      const task = completedTasks[i];
      const taskDate = new Date(task._id.year, task._id.month - 1, task._id.day);

      streakHistory.push({
        date: taskDate,
        tasksCompleted: task.count,
        isActive: task.count >= STREAK_CONFIG.MIN_TASKS_PER_DAY,
      });

      if (task.count >= STREAK_CONFIG.MIN_TASKS_PER_DAY) {
        tempStreak++;

        // Check if this is the most recent day
        if (i === 0 && (isSameDay(taskDate, today) || isSameDay(taskDate, yesterday))) {
          currentStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }

      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // If no activity today but active yesterday, streak is still alive (grace period)
    const hasActivityToday = completedTasks.some(t =>
      isSameDay(new Date(t._id.year, t._id.month - 1, t._id.day), today)
    );

    if (!hasActivityToday && currentStreak > 0) {
      // Check if within grace period
      const lastActivity = new Date(completedTasks[0]._id.year, completedTasks[0]._id.month - 1, completedTasks[0]._id.day);
      const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastActivity > STREAK_CONFIG.GRACE_PERIOD_HOURS) {
        currentStreak = 0;
      }
    }

    const streakData: IStreakData = {
      currentStreak,
      longestStreak,
      streakHistory: streakHistory.slice(0, STREAK_CONFIG.MAX_STREAK_HISTORY_DAYS),
      lastActiveDate: completedTasks.length > 0
        ? new Date(completedTasks[0]._id.year, completedTasks[0]._id.month - 1, completedTasks[0]._id.day)
        : undefined,
    };

    await this.setInCache(cacheKey, streakData, ANALYTICS_CACHE_CONFIG.USER_STREAK);
    return streakData;
  }

  /**
   * Calculate Productivity Score (0-100)
   * Based on completion rate, streak, tasks completed, and on-time completion
   */
  private async calculateProductivityScore(
    userId: Types.ObjectId,
    stats: { total: number; completed: number }
  ): Promise<number> {
    // Completion Rate Score (40%)
    const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    const completionRateScore = completionRate * 0.4;

    // Streak Score (20%)
    const streakData = await this.getStreak(userId);
    const streakScore = Math.min(streakData.currentStreak * 2, 20); // Max 20 points

    // Tasks Completed Score (25%)
    const tasksScore = Math.min(stats.completed / 10, 25); // 1 task = 0.25 points, max 25

    // On-time Completion Score (15%) - Simplified for now
    const onTimeScore = 15 * 0.8; // Assume 80% on-time for now

    const totalScore = completionRateScore + streakScore + tasksScore + onTimeScore;
    return Math.min(Math.round(totalScore), 100);
  }

  /** ✔️
   * Helper: Get task statistics for a period
   */
  private async getTaskStatsForPeriod(
    userId: Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
  }> {
    const stats = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          startTime: {
            $gte: startDate,
            $lte: endDate,
          },
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

    const result = {
      total: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
    };

    stats.forEach((stat: any) => {
      const count = stat.count;
      result.total += count;

      if (stat._id === TaskStatus.COMPLETED) result.completed = count;
      else if (stat._id === TaskStatus.PENDING) result.pending = count;
      else if (stat._id === TaskStatus.IN_PROGRESS) result.inProgress = count;
    });

    return result;
  }

  /** 🔁
   * Get Completion Rate Analytics
   * Calculates completion rate with trend analysis
   */
  async getCompletionRate(
    userId: Types.ObjectId,
    range: TAnalyticsTimeRange = 'thisWeek'
  ): Promise<ICompletionRateAnalytics> {
    const cacheKey = this.getCacheKey('completion-rate', userId.toString());

    const cached = await this.getFromCache<ICompletionRateAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();

    // Calculate date ranges
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const lastWeekStart = subDays(weekStart, 7);
    const lastWeekEnd = subDays(weekEnd, 7);

    // Parallel aggregation for performance
    const [weekStats, monthStats, lastWeekStats] = await Promise.all([
      this.getTaskStatsForPeriod(userId, weekStart, weekEnd),
      this.getTaskStatsForPeriod(userId, monthStart, monthEnd),
      this.getTaskStatsForPeriod(userId, lastWeekStart, lastWeekEnd),
    ]);

    // Calculate completion rates
    const weekRate = weekStats.total > 0
      ? (weekStats.completed / weekStats.total) * 100
      : 0;

    const monthRate = monthStats.total > 0
      ? (monthStats.completed / monthStats.total) * 100
      : 0;

    const lastWeekRate = lastWeekStats.total > 0
      ? (lastWeekStats.completed / lastWeekStats.total) * 100
      : 0;

    // Calculate trend
    const rateChange = weekRate - lastWeekRate;
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(rateChange) < 2) {
      direction = 'stable';
    } else if (rateChange > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }

    const analytics: ICompletionRateAnalytics = {
      overall: monthRate,
      byTimeRange: {
        thisWeek: weekRate,
        thisMonth: monthRate,
      },
      trend: {
        direction,
        percentageChange: Math.abs(rateChange),
        period: 'week',
      },
    };

    await this.setInCache(
      cacheKey,
      analytics,
      ANALYTICS_CACHE_CONFIG.USER_COMPLETION_RATE
    );

    return analytics;
  }

  /**
   * Get Productivity Score
   */
  async getProductivityScore(userId: Types.ObjectId): Promise<IProductivityScore> {
    const cacheKey = this.getCacheKey('productivity', userId.toString());

    const cached = await this.getFromCache<IProductivityScore>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all-time stats
    const stats = await this.getTaskStatsForPeriod(userId, new Date(0), new Date());
    const score = await this.calculateProductivityScore(userId, stats);
    const streakData = await this.getStreak(userId);

    const productivityScore: IProductivityScore = {
      score,
      breakdown: {
        completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
        streak: Math.min(streakData.currentStreak * 2, 20),
        tasksCompleted: Math.min(stats.completed / 10, 25),
        onTimeCompletion: 12, // Simplified
      },
      trend: 'up',
      percentile: 75, // Would need comparison with all users
    };

    await this.setInCache(
      cacheKey,
      productivityScore,
      ANALYTICS_CACHE_CONFIG.USER_PRODUCTIVITY
    );

    return productivityScore;
  }

  /**
   * Get Task Statistics
   * Comprehensive task statistics by status, priority, and type
   */
  async getTaskStatistics(userId: Types.ObjectId): Promise<ITaskStatistics> {
    const cacheKey = this.getCacheKey('task-stats', userId.toString());

    const cached = await this.getFromCache<ITaskStatistics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get statistics by status
    const statusStats = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
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

    // Get statistics by priority
    const priorityStats = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
        },
      },
    ]);

    // Get statistics by task type
    const taskTypeStats = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$taskType',
          count: { $sum: 1 },
        },
      },
    ]);

    // Calculate average completion time (for completed tasks)
    const completionTimeStats = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          status: 'completed',
          completedTime: { $exists: true, $ne: null },
          startTime: { $exists: true, $ne: null },
          isDeleted: false,
        },
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$completedTime', '$startTime'] },
              1000 * 60 * 60 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgCompletionTime: { $avg: '$completionTime' },
        }
      }
    ]);

    // Process results
    const byStatus = { pending: 0, inProgress: 0, completed: 0 };
    statusStats.forEach((stat: any) => {
      if (stat._id === TaskStatus.PENDING) byStatus.pending = stat.count;
      else if (stat._id === TaskStatus.IN_PROGRESS) byStatus.inProgress = stat.count;
      else if (stat._id === TaskStatus.COMPLETED) byStatus.completed = stat.count;
    });

    const byPriority = { low: 0, medium: 0, high: 0 };
    priorityStats.forEach((stat: any) => {
      if (stat._id === TaskPriority.LOW) byPriority.low = stat.count;
      else if (stat._id === TaskPriority.MEDIUM) byPriority.medium = stat.count;
      else if (stat._id === TaskPriority.HIGH) byPriority.high = stat.count;
    });

    const byTaskType = { personal: 0, singleAssignment: 0, collaborative: 0 };
    taskTypeStats.forEach((stat: any) => {
      if (stat._id === TaskType.PERSONAL) byTaskType.personal = stat.count;
      else if (stat._id === TaskType.SINGLE_ASSIGNMENT) byTaskType.singleAssignment = stat.count;
      else if (stat._id === TaskType.COLLABORATIVE) byTaskType.collaborative = stat.count;
    });

    const totalTasks = byStatus.pending + byStatus.inProgress + byStatus.completed;
    const avgCompletionTime = completionTimeStats.length > 0
      ? completionTimeStats[0].avgCompletionTime
      : undefined;

    // Calculate on-time completion rate (tasks completed before due date)
    const onTimeStats = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          status: 'completed',
          dueDate: { $exists: true, $ne: null },
          completedTime: { $exists: true, $ne: null },
          isDeleted: false,
        },
      },
      {
        $project: {
          isOnTime: { $lte: ['$completedTime', '$dueDate'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          onTime: {
            $sum: { $cond: ['$isOnTime', 1, 0] }
          }
        }
      }
    ]);

    const onTimeCompletionRate = onTimeStats.length > 0
      ? (onTimeStats[0].onTime / onTimeStats[0].total) * 100
      : undefined;

    const statistics: ITaskStatistics = {
      totalTasks,
      byStatus,
      byPriority,
      byTaskType,
      averageCompletionTime: avgCompletionTime ? Math.round(avgCompletionTime * 10) / 10 : undefined,
      onTimeCompletionRate: onTimeCompletionRate ? Math.round(onTimeCompletionRate * 10) / 10 : undefined,
    };

    await this.setInCache(
      cacheKey,
      statistics,
      ANALYTICS_CACHE_CONFIG.USER_OVERVIEW // Reusing overview TTL
    );

    return statistics;
  }

  /**
   * Get Trend Analytics
   * Analyzes task completion trends over time
   */
  async getTrendAnalytics(
    userId: Types.ObjectId,
    range: TAnalyticsTimeRange
  ): Promise<ITrendAnalytics> {
    const cacheKey = this.getCacheKey(`trend-${range}`, userId.toString());

    const cached = await this.getFromCache<ITrendAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    let startDate: Date;
    let dateRange: Date[];

    // Determine date range based on type
    switch (range) {
      case 'today':
        startDate = startOfDay(now);
        dateRange = [startDate];
        break;
      case 'yesterday':
        startDate = subDays(startOfDay(now), 1);
        dateRange = [startDate];
        break;
      case 'thisWeek':
        startDate = startOfWeek(now);
        dateRange = eachDayOfInterval({ start: startDate, end: now });
        break;
      case 'lastWeek':
        startDate = subDays(startOfWeek(now), 7);
        dateRange = eachDayOfInterval({
          start: startDate,
          end: subDays(endOfWeek(now), 7)
        });
        break;
      case 'thisMonth':
        startDate = startOfMonth(now);
        dateRange = eachDayOfInterval({ start: startDate, end: now });
        break;
      case 'lastMonth':
        startDate = subDays(startOfMonth(now), 1);
        dateRange = eachDayOfInterval({
          start: startOfMonth(startDate),
          end: endOfMonth(startDate)
        });
        break;
      case 'thisYear':
        startDate = startOfYear(now);
        dateRange = eachMonthOfInterval({ start: startDate, end: now });
        break;
      case 'all':
      default:
        startDate = new Date(0);
        dateRange = eachDayOfInterval({
          start: subDays(now, 30), // Last 30 days for 'all'
          end: now
        });
        break;
    }

    // Get task data for the period
    const taskData = await Task.aggregate([
      {
        $match: {
          ownerUserId: userId,
          startTime: {
            $gte: startDate,
            $lte: now,
          },
          isDeleted: false,
        },
      },
      {
        $facet: {
          completed: [
            { $match: { status: 'completed' } },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$completedTime'
                  }
                },
                count: { $sum: 1 },
              },
            },
          ],
          created: [
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$startTime'
                  }
                },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    // Build trend data points
    const completedByDate = new Map<string, number>(
      (taskData[0].completed as Array<{ _id: string; count: number }>).map(item => [item._id, item.count])
    );
    const createdByDate = new Map<string, number>(
      (taskData[0].created as Array<{ _id: string; count: number }>).map(item => [item._id, item.count])
    );

    const data: ITrendDataPoint[] = dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const completed = completedByDate.get(dateStr) || 0;
      const created = createdByDate.get(dateStr) || 0;
      const total = created;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        date: format(date, range === 'thisYear' ? 'MMM yyyy' : 'MMM dd'),
        tasksCompleted: completed,
        tasksCreated: created,
        completionRate: Math.round(completionRate * 10) / 10,
      };
    });

    // Calculate summary
    const totalCompleted = data.reduce((sum, point) => sum + point.tasksCompleted, 0);
    const averagePerDay = data.length > 0 ? totalCompleted / data.length : 0;

    const bestDay = data.reduce((best, current) =>
      current.tasksCompleted > best.count
        ? { date: current.date, count: current.tasksCompleted }
        : best,
      { date: '', count: 0 }
    );

    const worstDayData = data.reduce((worst, current) =>
      (current.tasksCompleted < worst.count || worst.count === 0)
        ? { date: current.date, count: current.tasksCompleted }
        : worst,
      { date: '', count: 0 }
    );
    
    // Handle edge case where all days have 0 completions
    const worstDay = worstDayData.count === 0 && data.length > 0
      ? { date: data[0].date, count: 0 }
      : worstDayData;

    const trendAnalytics: ITrendAnalytics = {
      period: range,
      data,
      summary: {
        totalCompleted,
        averagePerDay: Math.round(averagePerDay * 10) / 10,
        bestDay,
        worstDay,
      },
    };

    await this.setInCache(
      cacheKey,
      trendAnalytics,
      ANALYTICS_CACHE_CONFIG.USER_OVERVIEW // Reusing overview TTL
    );

    return trendAnalytics;
  }
}

export const userAnalyticsService = new UserAnalyticsService();
