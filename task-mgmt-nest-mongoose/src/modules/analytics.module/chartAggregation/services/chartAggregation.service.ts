import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../../task.module/task/task.schema';
import { ANALYTICS_CACHE_CONFIG } from '../analytics.constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import {
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  subMonths,
} from 'date-fns';

/**
 * Chart Aggregation Service
 * Pre-computed chart data for performance
 */
@Injectable()
export class ChartAggregationService {
  private readonly logger = new Logger(ChartAggregationService.name);

  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private getCacheKey(chartType: string, period?: string): string {
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:chart:${chartType}:${period || 'all'}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      return await this.cacheManager.get<T>(key);
    } catch (error) {
      this.logger.error(`Cache GET error: ${error.message}`);
      return null;
    }
  }

  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await this.cacheManager.set(key, data, ttl * 1000);
    } catch (error) {
      this.logger.error(`Cache SET error: ${error.message}`);
    }
  }

  /**
   * Get task status distribution chart data
   */
  async getStatusDistributionChart(): Promise<any> {
    const cacheKey = this.getCacheKey('status-distribution');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const distribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result = {
      labels: distribution.map((d: any) => d._id),
      data: distribution.map((d: any) => d.count),
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_OVERVIEW);
    return result;
  }

  /**
   * Get daily task creation chart data
   */
  async getDailyTaskChart(days: number = 30): Promise<any> {
    const cacheKey = this.getCacheKey('daily-tasks', `${days}`);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const dailyData = await this.taskModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = {
      labels: dailyData.map((d: any) => d._id),
      created: dailyData.map((d: any) => d.count),
      completed: dailyData.map((d: any) => d.completed),
      period: `${days} days`,
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_DAILY_SUMMARY);
    return result;
  }

  /**
   * Get monthly task summary chart data
   */
  async getMonthlyTaskChart(months: number = 12): Promise<any> {
    const cacheKey = this.getCacheKey('monthly-tasks', `${months}`);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subMonths(endDate, months);

    const monthlyData = await this.taskModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const result = {
      labels: monthlyData.map((m: any) => monthNames[m._id - 1]),
      created: monthlyData.map((m: any) => m.count),
      completed: monthlyData.map((m: any) => m.completed),
      period: `${months} months`,
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_DAILY_SUMMARY);
    return result;
  }
}
