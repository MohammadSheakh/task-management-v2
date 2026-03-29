import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../user.module/user/user.schema';
import { Task, TaskDocument } from '../../task.module/task/task.schema';
import { ANALYTICS_CACHE_CONFIG } from '../analytics.constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { startOfDay, subDays } from 'date-fns';

@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Task.name)
    private taskModel: Model<TaskDocument>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  private getCacheKey(type: string, userId?: string): string {
    const userPart = userId ? `:${userId}` : '';
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:user${userPart}:${type}`;
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

  async getUserOverview(userId: string): Promise<any> {
    const cacheKey = this.getCacheKey('overview', userId);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [totalTasks, completedTasks] = await Promise.all([
      this.taskModel.countDocuments({ ownerUserId: userId, isDeleted: false }),
      this.taskModel.countDocuments({ ownerUserId: userId, status: 'completed', isDeleted: false }),
    ]);

    const result = {
      totalTasks,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      lastUpdated: new Date(),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.USER_OVERVIEW);
    return result;
  }

  async getProductivityMetrics(userId: string, days: number = 7): Promise<any> {
    const cacheKey = this.getCacheKey(`productivity-${days}`, userId);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const endDate = new Date();
    const startDate = subDays(endDate, days);

    const tasks = await this.taskModel.aggregate([
      {
        $match: {
          ownerUserId: new globalThis.Types.ObjectId(userId),
          createdAt: { $gte: startDate },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const result = { dailyActivity: tasks, period: `${days} days`, lastUpdated: new Date() };
    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.USER_PRODUCTIVITY);
    return result;
  }

  async getStreak(userId: string): Promise<any> {
    const cacheKey = this.getCacheKey('streak', userId);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const today = startOfDay(new Date());
    const completedToday = await this.taskModel.countDocuments({
      ownerUserId: userId,
      status: 'completed',
      completedAt: { $gte: today },
      isDeleted: false,
    });

    // Simplified streak calculation
    const result = {
      currentStreak: completedToday > 0 ? 1 : 0,
      longestStreak: 0, // Would need historical data
      lastCompleted: completedToday > 0 ? new Date() : null,
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.USER_STREAK);
    return result;
  }
}
