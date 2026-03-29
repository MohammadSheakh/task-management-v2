import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../user.module/user/user.schema';
import { Task, TaskDocument } from '../../task.module/task/task.schema';
import { ANALYTICS_CACHE_CONFIG, ADMIN_METRICS_CONFIG } from '../analytics.constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  format,
} from 'date-fns';

/**
 * Admin Analytics Service
 * Platform-wide analytics for administrators
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 */
@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,

    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  /**
   * Get cache key
   */
  private getCacheKey(type: string): string {
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:admin:${type}`;
  }

  /**
   * Get from cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache GET error: ${error.message}`);
      return null;
    }
  }

  /**
   * Set in cache
   */
  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await this.cacheManager.set(key, data, ttl * 1000);
    } catch (error) {
      this.logger.error(`Cache SET error: ${error.message}`);
    }
  }

  /**
   * Get dashboard overview
   * Platform-wide metrics for admin dashboard
   */
  async getDashboardOverview(): Promise<any> {
    const cacheKey = this.getCacheKey('dashboard');

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log('Calculating admin dashboard overview...');

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);

    // Get platform totals
    const [totalUsers, totalTasks] = await Promise.all([
      this.userModel.countDocuments({ isDeleted: false }),
      this.taskModel.countDocuments({ isDeleted: false }),
    ]);

    // Get user count by role
    const usersByRole = await this.userModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    const roleCounts: any = {};
    usersByRole.forEach((r: any) => {
      roleCounts[r._id] = r.count;
    });

    // Get today's new users
    const todayNewUsers = await this.userModel.countDocuments({
      createdAt: { $gte: todayStart },
      isDeleted: false,
    });

    // Get this week's new users
    const weekNewUsers = await this.userModel.countDocuments({
      createdAt: { $gte: weekStart },
      isDeleted: false,
    });

    // Get this month's new users
    const monthNewUsers = await this.userModel.countDocuments({
      createdAt: { $gte: monthStart },
      isDeleted: false,
    });

    const result = {
      totalUsers,
      totalTasks,
      usersByRole: {
        individual: roleCounts.individual || 0,
        child: roleCounts.child || 0,
        business: roleCounts.business || 0,
        admin: roleCounts.admin || 0,
      },
      newUsers: {
        today: todayNewUsers,
        thisWeek: weekNewUsers,
        thisMonth: monthNewUsers,
      },
      lastUpdated: new Date(),
    };

    // Cache the result
    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.ADMIN_DASHBOARD);

    return result;
  }

  /**
   * Get user growth analytics
   * User registration trends over time
   */
  async getUserGrowthAnalytics(): Promise<any> {
    const cacheKey = this.getCacheKey('user-growth');

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log('Calculating user growth analytics...');

    const now = new Date();
    const yearStart = startOfMonth(now);

    // Get monthly registered users for current year
    const monthlyUsers = await this.userModel.aggregate([
      {
        $match: {
          createdAt: { $gte: yearStart },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];

    const chartData = monthlyUsers.map((m: any) => ({
      month: monthNames[m._id - 1],
      count: m.count,
    }));

    const result = {
      monthlyGrowth: chartData,
      totalGrowth: chartData.reduce((sum: number, m: any) => sum + m.count, 0),
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.ADMIN_USER_GROWTH);

    return result;
  }

  /**
   * Get task metrics
   * Platform-wide task statistics
   */
  async getTaskMetrics(): Promise<any> {
    const cacheKey = this.getCacheKey('task-metrics');

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    this.logger.log('Calculating task metrics...');

    // Get task status distribution
    const statusDistribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusCounts: any = {};
    statusDistribution.forEach((s: any) => {
      statusCounts[s._id] = s.count;
    });

    // Get task type distribution
    const typeDistribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$taskType', count: { $sum: 1 } } },
    ]);

    const typeCounts: any = {};
    typeDistribution.forEach((t: any) => {
      typeCounts[t._id] = t.count;
    });

    const result = {
      byStatus: {
        pending: statusCounts.pending || 0,
        inProgress: statusCounts.inProgress || 0,
        completed: statusCounts.completed || 0,
      },
      byType: {
        personal: typeCounts.personal || 0,
        singleAssignment: typeCounts.singleAssignment || 0,
        collaborative: typeCounts.collaborative || 0,
      },
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.ADMIN_TASK_METRICS);

    return result;
  }
}
