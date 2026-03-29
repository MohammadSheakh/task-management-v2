import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from '../../task.module/task/task.schema';
import { ANALYTICS_CACHE_CONFIG } from '../analytics.constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { startOfDay, endOfDay, subDays } from 'date-fns';

@Injectable()
export class TaskAnalyticsService {
  private readonly logger = new Logger(TaskAnalyticsService.name);

  constructor(
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private getCacheKey(type: string): string {
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:task:${type}`;
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

  async getOverview(): Promise<any> {
    const cacheKey = this.getCacheKey('overview');
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const todayStart = startOfDay(now);

    const [totalTasks, todayTasks] = await Promise.all([
      this.taskModel.countDocuments({ isDeleted: false }),
      this.taskModel.countDocuments({ startTime: { $gte: todayStart }, isDeleted: false }),
    ]);

    const statusDistribution = await this.taskModel.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result = {
      totalTasks,
      todayTasks,
      byStatus: Object.fromEntries(statusDistribution.map((s: any) => [s._id, s.count])),
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_OVERVIEW);
    return result;
  }

  async getCompletionTrend(days: number = 7): Promise<any> {
    const cacheKey = this.getCacheKey(`completion-trend-${days}`);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const trend = await this.taskModel.aggregate([
      {
        $match: {
          completedAt: { $gte: startDate, $lte: endDate },
          isDeleted: false,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = { trend, period: `${days} days`, lastUpdated: new Date() };
    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_COMPLETION_TREND);
    return result;
  }
}
