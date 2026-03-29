//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { Task } from '../../task.module/task/task.model';
import { TaskProgress } from '../../taskProgress.module/taskProgress.model';
// ❌ REMOVED: Group module not needed
// import { Group } from '../../group.module/group/group.model';
// import { GroupMember } from '../../group.module/groupMember/groupMember.model';
import {
  IStatusDistribution,
  ITaskOverviewAnalytics,
  IGroupTaskAnalytics,
  IDailyTaskSummary,
  ICompletionTrendPoint,
} from './taskAnalytics.interface';
import {
  ANALYTICS_CACHE_CONFIG,
  TAnalyticsTimeRange,
} from '../analytics.constant';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
} from 'date-fns';
import { TaskStatus, TaskType } from '../../task.module/task/task.constant';
import { TaskProgressStatus } from '../../taskProgress.module/taskProgress.constant';

/**
 * Task Analytics Service
 * Handles task-level analytics with Redis caching
 * 
 * @version 1.0.0
 */
export class TaskAnalyticsService {
  private getCacheKey(type: string, id?: string): string {
    if (id) {
      return `${ANALYTICS_CACHE_CONFIG.PREFIX}:task:${id}:${type}`;
    }
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:task:${type}`;
  }

  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error in TaskAnalytics:', error);
      return null;
    }
  }

  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in TaskAnalytics:', error);
    }
  }

  /**
   * Get Platform-wide Task Overview
   */
  async getOverview(): Promise<ITaskOverviewAnalytics> {
    const cacheKey = this.getCacheKey('overview');
    
    const cached = await this.getFromCache<ITaskOverviewAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    // Get today's stats
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

    // Get all-time stats for averages
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

    const totalToday = todayStats.reduce((sum: number, s: any) => sum + s.count, 0);
    const completedToday = todayStats.find((s: any) => s._id === TaskStatus.COMPLETED)?.count || 0;
    const pendingToday = todayStats.find((s: any) => s._id === TaskStatus.PENDING)?.count || 0;

    const allTimeTotal = allTimeStats[0]?.total || 0;
    const allTimeCompleted = allTimeStats[0]?.completed || 0;
    const daysSinceStart = Math.max(1, Math.ceil((now.getTime() - new Date('2024-01-01').getTime()) / (1000 * 60 * 60 * 24)));

    const analytics: ITaskOverviewAnalytics = {
      totalTasks: allTimeTotal,
      completedToday,
      pendingToday,
      completionRate: totalToday > 0 ? (completedToday / totalToday) * 100 : 0,
      averageTasksPerDay: Math.round(allTimeTotal / daysSinceStart),
      streak: {
        current: 0,  // Would calculate from historical data
        longest: 0,
      },
    };

    await this.setInCache(cacheKey, analytics, ANALYTICS_CACHE_CONFIG.TASK_OVERVIEW);
    return analytics;
  }

  /**
   * Get Status Distribution
   */
  async getStatusDistribution(filters?: any): Promise<IStatusDistribution> {
    const cacheKey = this.getCacheKey('status-dist', filters?.groupId || 'global');
    
    const cached = await this.getFromCache<IStatusDistribution>(cacheKey);
    if (cached) {
      return cached;
    }

    const matchStage: any = { isDeleted: false };
    
    if (filters?.groupId) {
      matchStage.groupId = new Types.ObjectId(filters.groupId);
    }
    
    if (filters?.userId) {
      matchStage.$or = [
        { ownerUserId: new Types.ObjectId(filters.userId) },
        { assignedUserIds: new Types.ObjectId(filters.userId) },
      ];
    }

    const stats = await Task.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = stats.reduce((sum: number, s: any) => sum + s.count, 0);

    const notStarted = stats.find((s: any) => s._id === TaskStatus.PENDING)?.count || 0;
    const inProgress = stats.find((s: any) => s._id === TaskStatus.IN_PROGRESS)?.count || 0;
    const completed = stats.find((s: any) => s._id === TaskStatus.COMPLETED)?.count || 0;

    const distribution: IStatusDistribution = {
      totalTasks: total,
      distribution: {
        notStarted: {
          count: notStarted,
          percentage: total > 0 ? (notStarted / total) * 100 : 0,
        },
        inProgress: {
          count: inProgress,
          percentage: total > 0 ? (inProgress / total) * 100 : 0,
        },
        completed: {
          count: completed,
          percentage: total > 0 ? (completed / total) * 100 : 0,
        },
      },
      overdueTasks: 0,  // Would calculate from due dates
      dueToday: 0,
    };

    await this.setInCache(cacheKey, distribution, ANALYTICS_CACHE_CONFIG.TASK_STATUS_DIST);
    return distribution;
  }

  /**
   * ❌ REMOVED: Group analytics not needed
   * Use childrenBusinessUser analytics instead
   */
  // async getGroupTaskAnalytics(groupId: Types.ObjectId): Promise<IGroupTaskAnalytics> {
  //   const cacheKey = this.getCacheKey('group', groupId.toString());
  //   ... (entire method removed - it's all group-related code)
  // }

  /**
   * Get Completion Trend
   */
  async getCompletionTrend(range: TAnalyticsTimeRange): Promise<ICompletionTrendPoint[]> {
    // Implementation for trend data
    return [];
  }

  /**
   * Get Daily Summary
   */
  async getDailySummary(date?: Date): Promise<IDailyTaskSummary> {
    const targetDate = date || new Date();
    const cacheKey = this.getCacheKey('daily-summary', format(targetDate, 'yyyy-MM-dd'));
    
    const cached = await this.getFromCache<IDailyTaskSummary>(cacheKey);
    if (cached) {
      return cached;
    }

    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const stats = await Task.aggregate([
      {
        $match: {
          startTime: { $gte: dayStart, $lte: dayEnd },
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
    const completed = stats.find((s: any) => s._id === TaskStatus.COMPLETED)?.count || 0;

    const summary: IDailyTaskSummary = {
      date: format(targetDate, 'yyyy-MM-dd'),
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: stats.find((s: any) => s._id === TaskStatus.PENDING)?.count || 0,
      inProgressTasks: stats.find((s: any) => s._id === TaskStatus.IN_PROGRESS)?.count || 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };

    await this.setInCache(cacheKey, summary, ANALYTICS_CACHE_CONFIG.TASK_DAILY_SUMMARY);
    return summary;
  }

  /**
   * Get Task Activity
   */
  async getTaskActivity(range: TAnalyticsTimeRange): Promise<any[]> {
    return [];
  }

  /**
   * NEW: Get collaborative task progress analytics (for parent dashboard)
   * Shows which children completed/started/not started a collaborative task
   */
  async getCollaborativeTaskProgress(taskId: string): Promise<any> {
    const cacheKey = this.getCacheKey('collaborative-progress', taskId);

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get task details
    const task = await Task.findById(taskId).select('title subtasks taskType');
    if (!task) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Task not found');
    }

    if (task.taskType !== 'collaborative') {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'This is not a collaborative task');
    }

    // Get all children's progress
    const progressRecords = await TaskProgress.find({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).populate('userId', 'name email profileImage');

    // Build children progress array
    const childrenProgress = progressRecords.map((record: any) => {
      const userDoc = record.userId as any;
      return {
        childId: record.userId,
        childName: userDoc?.name || 'Unknown',
        email: userDoc?.email,
        status: record.status,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        progressPercentage: record.progressPercentage,
        completedSubtaskCount: record.completedSubtaskIndexes.length,
        totalSubtasks: task.subtasks?.length || 0,
      };
    });

    // Calculate summary
    const summary = {
      totalChildren: childrenProgress.length,
      notStarted: childrenProgress.filter((c: any) => c.status === TaskProgressStatus.NOT_STARTED).length,
      inProgress: childrenProgress.filter((c: any) => c.status === TaskProgressStatus.IN_PROGRESS).length,
      completed: childrenProgress.filter((c: any) => c.status === TaskProgressStatus.COMPLETED).length,
      completionRate: childrenProgress.length > 0
        ? Math.round((childrenProgress.filter((c: any) => c.status === TaskProgressStatus.COMPLETED).length / childrenProgress.length) * 100)
        : 0,
      averageProgress: childrenProgress.length > 0
        ? Math.round(childrenProgress.reduce((sum: number, c: any) => sum + c.progressPercentage, 0) / childrenProgress.length)
        : 0,
    };

    const result = {
      taskId: task._id,
      taskTitle: task.title,
      taskType: task.taskType,
      totalSubtasks: task.subtasks?.length || 0,
      childrenProgress,
      summary,
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_DETAIL);
    return result;
  }

  /**
   * NEW: Get child's performance analytics
   * Shows task completion, streaks, and productivity for a specific child
   */
  async getChildPerformance(childId: string, timeRange: TAnalyticsTimeRange = 'all'): Promise<any> {
    const cacheKey = this.getCacheKey('child-performance', childId);

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all tasks progress for this child
    const progressRecords = await TaskProgress.find({
      userId: new Types.ObjectId(childId),
      isDeleted: false,
    }).populate('taskId', 'title taskType status totalSubtasks');

    // Calculate task statistics
    const tasks = progressRecords.map((record: any) => {
      const taskDoc = record.taskId as any;
      return {
        taskId: record.taskId,
        taskTitle: taskDoc?.title || 'Unknown',
        taskType: taskDoc?.taskType || 'personal',
        status: record.status,
        progressPercentage: record.progressPercentage,
        completedSubtaskCount: record.completedSubtaskIndexes.length,
        totalSubtasks: taskDoc?.totalSubtasks || 0,
      };
    });

    const stats = {
      total: tasks.length,
      completed: tasks.filter((t: any) => t.status === TaskProgressStatus.COMPLETED).length,
      inProgress: tasks.filter((t: any) => t.status === TaskProgressStatus.IN_PROGRESS).length,
      notStarted: tasks.filter((t: any) => t.status === TaskProgressStatus.NOT_STARTED).length,
      completionRate: tasks.length > 0
        ? Math.round((tasks.filter((t: any) => t.status === TaskProgressStatus.COMPLETED).length / tasks.length) * 100)
        : 0,
    };

    // Calculate streak
    const streak = await this.calculateChildStreak(childId);

    // Calculate productivity score
    const productivityScore = this.calculateProductivityScore(stats, streak);

    const result = {
      childId,
      tasks: stats,
      streak,
      productivity: {
        score: productivityScore,
        rank: this.getProductivityRank(productivityScore),
      },
      recentTasks: tasks.slice(0, 10),
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.USER_PERFORMANCE);
    return result;
  }

  /**
   * NEW: Get parent dashboard overview (all children's performance)
   */
  async getParentDashboardOverview(parentId: string): Promise<any> {
    const cacheKey = this.getCacheKey('parent-dashboard', parentId);

    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all children's progress for tasks created by parent
    const childrenTasks = await TaskProgress.aggregate([
      {
        $lookup: {
          from: 'tasks',
          localField: 'taskId',
          foreignField: '_id',
          as: 'task',
        },
      },
      { $unwind: '$task' },
      {
        $match: {
          'task.createdById': new Types.ObjectId(parentId),
          'task.taskType': 'collaborative',
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'child',
        },
      },
      { $unwind: '$child' },
      {
        $group: {
          _id: '$userId',
          childName: { $first: '$child.name' },
          childEmail: { $first: '$child.email' },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'inProgress'] }, 1, 0] },
          },
          notStartedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'notStarted'] }, 1, 0] },
          },
          averageProgress: { $avg: '$progressPercentage' },
          lastActive: { $max: '$updatedAt' },
        },
      },
    ]);

    // Format children data
    const children = childrenTasks.map((child: any) => ({
      childId: child._id,
      childName: child.childName,
      childEmail: child.childEmail,
      tasks: {
        total: child.totalTasks,
        completed: child.completedTasks,
        inProgress: child.inProgressTasks,
        notStarted: child.notStartedTasks,
        completionRate: child.totalTasks > 0
          ? Math.round((child.completedTasks / child.totalTasks) * 100)
          : 0,
      },
      averageProgress: Math.round(child.averageProgress),
      lastActive: child.lastActive,
    }));

    // Calculate overall statistics
    const overall = {
      totalChildren: children.length,
      totalTasksCompleted: children.reduce((sum: number, c: any) => sum + c.tasks.completed, 0),
      totalTasks: children.reduce((sum: number, c: any) => sum + c.tasks.total, 0),
      averageCompletionRate: children.length > 0
        ? Math.round(children.reduce((sum: number, c: any) => sum + c.tasks.completionRate, 0) / children.length)
        : 0,
    };

    const result = {
      parentId,
      children,
      overall,
    };

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.TASK_OVERVIEW);
    return result;
  }

  /**
   * Helper: Calculate child's streak
   */
  private async calculateChildStreak(childId: string): Promise<any> {
    const completedTasks = await TaskProgress.find({
      userId: new Types.ObjectId(childId),
      status: 'completed',
      isDeleted: false,
    }).select('completedAt').sort({ completedAt: -1 });

    if (completedTasks.length === 0) {
      return { current: 0, longest: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;
    const today = startOfDay(new Date());

    for (const task of completedTasks) {
      if (!task.completedAt) continue;

      const completedDate = startOfDay(task.completedAt);
      const daysDiff = lastDate ? (lastDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24) : 0;

      if (!lastDate || daysDiff <= 1) {
        tempStreak++;
        if (isSameDay(completedDate, today)) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }

      lastDate = completedDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    if (currentStreak === 0) {
      currentStreak = isSameDay(startOfDay(completedTasks[0].completedAt!), today) ? tempStreak : 0;
    }

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Helper: Calculate productivity score (0-100)
   */
  private calculateProductivityScore(stats: any, streak: any): number {
    const completionScore = stats.completionRate * 0.5;
    const streakScore = Math.min(streak.current * 5, 100) * 0.3;
    const volumeScore = Math.min(stats.total * 2, 100) * 0.2;
    return Math.round(completionScore + streakScore + volumeScore);
  }

  /**
   * Helper: Get productivity rank based on score
   */
  private getProductivityRank(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Very Good';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Average';
    if (score >= 20) return 'Below Average';
    return 'Needs Improvement';
  }
}

export const taskAnalyticsService = new TaskAnalyticsService();
