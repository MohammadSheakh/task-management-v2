//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { redisClient } from '../../../helpers/redis/redis';
import { logger, errorLogger } from '../../../shared/logger';
import { ChildrenBusinessUser } from '../../childrenBusinessUser.module/childrenBusinessUser.model';
import { User } from '../../user.module/user/user.model';
import { Task } from '../../task.module/task/task.model';
import { TaskProgress } from '../../taskProgress.module/taskProgress.model';
import {
  IGroupOverviewAnalytics,
  IMemberStats,
  ILeaderboardEntry,
  IGroupPerformanceMetrics,
  IGroupActivity,
} from './groupAnalytics.interface';
import {
  ANALYTICS_CACHE_CONFIG,
  LEADERBOARD_CONFIG,
  ACTIVITY_FEED_CONFIG,
} from '../analytics.constant';
import { startOfDay, subDays } from 'date-fns';
import { TaskStatus, TaskType } from '../../task.module/task/task.constant';
import { TaskProgressStatus } from '../../taskProgress.module/taskProgress.constant';

/**
 * Group Analytics Service
 * Handles analytics for team/group (family) performance, member statistics, and leaderboards
 *
 * This service uses the childrenBusinessUser module to manage family/team members
 * instead of a separate group module
 *
 * @version 1.0.0
 */
export class GroupAnalyticsService {
  /**
   * Get cache key for group analytics
   */
  private getCacheKey(type: string, groupId?: string): string {
    if (groupId) {
      return `${ANALYTICS_CACHE_CONFIG.PREFIX}:group:${groupId}:${type}`;
    }
    return `${ANALYTICS_CACHE_CONFIG.PREFIX}:group:${type}`;
  }

  /**
   * Get data from Redis cache
   */
  private async getFromCache<T>(key: string): Promise<T | null> {
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }
      return null;
    } catch (error) {
      errorLogger.error('Redis GET error in GroupAnalytics:', error);
      return null;
    }
  }

  /**
   * Set data in Redis cache
   */
  private async setInCache<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      errorLogger.error('Redis SET error in GroupAnalytics:', error);
    }
  }

  /**
   * Get Group Overview Analytics
   * Shows overall group stats, top performers, and recent activity
   */
  async getGroupOverview(groupId: Types.ObjectId): Promise<IGroupOverviewAnalytics> {
    const cacheKey = this.getCacheKey('overview', groupId.toString());

    const cached = await this.getFromCache<IGroupOverviewAnalytics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all children/business users for this group (primary user)
    const groupMembers = await ChildrenBusinessUser.find({
      businessUserId: groupId,
      isDeleted: false,
    }).populate('childUserId', 'name email profileImage');

    const memberIds = groupMembers.map((member: any) => member.childUserId);

    // Get member count
    const memberCount = memberIds.length;

    // Get tasks for this group
    const groupTasks = await Task.find({
      $or: [
        { createdById: groupId },
        { ownerUserId: groupId },
        ...memberIds.map((id: any) => ({ ownerUserId: id })),
        ...memberIds.map((id: any) => ({ assignedUserIds: id })),
      ],
      isDeleted: false,
    });

    // Calculate overview stats
    const totalTasks = groupTasks.length;
    const today = startOfDay(new Date());
    const completedToday = groupTasks.filter(
      (task: any) => task.status === TaskStatus.COMPLETED && task.completedAt && new Date(task.completedAt) >= today
    ).length;
    const pendingToday = groupTasks.filter(
      (task: any) => task.status === TaskStatus.PENDING
    ).length;

    // Get active members today (members who completed at least one task today)
    const activeMemberIds = new Set(
      groupTasks
        .filter((task: any) => {
          if (task.status !== TaskStatus.COMPLETED || !task.completedAt) return false;
          const completedDate = new Date(task.completedAt);
          return completedDate >= today;
        })
        .map((task: any) => task.ownerUserId?.toString())
    );
    const activeMembersToday = activeMemberIds.size;

    // Get top performers (members with most completions)
    const memberCompletions = await TaskProgress.aggregate([
      {
        $match: {
          userId: { $in: memberIds },
          status: 'completed',
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$userId',
          tasksCompleted: { $sum: 1 },
        },
      },
      { $sort: { tasksCompleted: -1 } },
      { $limit: 5 },
    ]);

    const topPerformers = await Promise.all(
      memberCompletions.map(async (completion: any) => {
        const user = await User.findById(completion._id).select('name');
        const streak = await this.calculateMemberStreak(completion._id);
        return {
          memberId: completion._id,
          memberName: user?.name || 'Unknown',
          tasksCompleted: completion.tasksCompleted,
          streak: streak.current,
        };
      })
    );

    // Get recent activity
    const recentActivity = await this.getActivityFeed(groupId, ACTIVITY_FEED_CONFIG.MAX_ACTIVITIES);

    const analytics: IGroupOverviewAnalytics = {
      groupId,
      groupName: 'Family Group', // Default name for family group
      memberCount,
      activeMembersToday,
      overview: {
        totalTasks,
        completedToday,
        pendingToday,
        completionRate: totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0,
        averageTasksPerMember: memberCount > 0 ? Math.round(totalTasks / memberCount) : 0,
      },
      topPerformers,
      recentActivity,
    };

    await this.setInCache(cacheKey, analytics, ANALYTICS_CACHE_CONFIG.GROUP_OVERVIEW);
    return analytics;
  }

  /**
   * Get Member Statistics
   * Returns detailed stats for each group member
   */
  async getMemberStats(groupId: Types.ObjectId): Promise<IMemberStats[]> {
    const cacheKey = this.getCacheKey('member-stats', groupId.toString());

    const cached = await this.getFromCache<IMemberStats[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all children/business users for this group
    const groupMembers = await ChildrenBusinessUser.find({
      businessUserId: groupId,
      isDeleted: false,
    }).populate('childUserId', 'name email profileImage createdAt');

    const memberStats: IMemberStats[] = [];

    for (const member of groupMembers) {
      const childUser = member.childUserId as any;
      const memberId = childUser._id;

      // Get all tasks for this member
      const memberTasks = await Task.find({
        $or: [{ ownerUserId: memberId }, { assignedUserIds: memberId }],
        isDeleted: false,
      });

      const totalTasks = memberTasks.length;
      const completedTasks = memberTasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length;
      const pendingTasks = memberTasks.filter((t: any) => t.status === TaskStatus.PENDING).length;

      // Get completion rate
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get current streak
      const streak = await this.calculateMemberStreak(memberId);

      // Get average completion time
      const avgCompletionTime = await this.calculateAverageCompletionTime(memberId);

      // Get last active date
      const lastTask = await TaskProgress.findOne({
        userId: memberId,
        isDeleted: false,
      }).sort({ updatedAt: -1 });

      memberStats.push({
        memberId,
        memberName: childUser.name || 'Unknown',
        memberEmail: childUser.email,
        role: 'member', // All children are members
        joinedDate: member.createdAt || new Date(),
        tasksAssigned: totalTasks,
        tasksCompleted: completedTasks,
        tasksPending: pendingTasks,
        completionRate,
        currentStreak: streak.current,
        averageCompletionTime: avgCompletionTime,
        lastActiveDate: lastTask?.updatedAt,
      });
    }

    await this.setInCache(cacheKey, memberStats, ANALYTICS_CACHE_CONFIG.GROUP_MEMBERS);
    return memberStats;
  }

  /**
   * Get Leaderboard
   * Returns top performing members ranked by points
   */
  async getLeaderboard(groupId: Types.ObjectId, limit: number = LEADERBOARD_CONFIG.MAX_ENTRIES): Promise<ILeaderboardEntry[]> {
    const cacheKey = this.getCacheKey('leaderboard', groupId.toString());

    const cached = await this.getFromCache<ILeaderboardEntry[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all children/business users for this group
    const groupMembers = await ChildrenBusinessUser.find({
      businessUserId: groupId,
      isDeleted: false,
    }).populate('childUserId', 'name email');

    const memberIds = groupMembers.map((member: any) => member.childUserId);

    // Get task statistics for each member
    const memberStats = await TaskProgress.aggregate([
      {
        $match: {
          userId: { $in: memberIds },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$userId',
          tasksCompleted: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalTasks: { $sum: 1 },
        },
      },
    ]);

    const leaderboard: ILeaderboardEntry[] = [];

    for (const stat of memberStats) {
      const memberId = stat._id;
      const completionRate = stat.totalTasks > 0 ? (stat.tasksCompleted / stat.totalTasks) * 100 : 0;
      const streak = await this.calculateMemberStreak(memberId);

      // Calculate points: tasks completed * 10 + streak * 5 + completion rate bonus
      const points = Math.round(
        stat.tasksCompleted * 10 + streak.current * 5 + (completionRate / 10)
      );

      const user = await User.findById(memberId).select('name');

      leaderboard.push({
        rank: 0, // Will be set after sorting
        memberId,
        memberName: user?.name || 'Unknown',
        tasksCompleted: stat.tasksCompleted,
        completionRate: Math.round(completionRate),
        streak: streak.current,
        points,
      });
    }

    // Sort by points and assign ranks
    leaderboard.sort((a, b) => b.points - a.points);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Return only top entries
    const result = leaderboard.slice(0, limit);

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.GROUP_LEADERBOARD);
    return result;
  }

  /**
   * Get Performance Metrics
   * Returns group performance data with trends
   */
  async getPerformanceMetrics(
    groupId: Types.ObjectId,
    period: 'week' | 'month' | 'all' = 'week'
  ): Promise<IGroupPerformanceMetrics> {
    const cacheKey = this.getCacheKey('performance', `${groupId.toString()}:${period}`);

    const cached = await this.getFromCache<IGroupPerformanceMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all children/business users for this group
    const groupMembers = await ChildrenBusinessUser.find({
      businessUserId: groupId,
      isDeleted: false,
    }).populate('childUserId');

    const memberIds = groupMembers.map((member: any) => member.childUserId);

    // Calculate date range
    const now = new Date();
    const startDate = period === 'week' ? subDays(now, 7) : period === 'month' ? subDays(now, 30) : new Date(0);

    // Get tasks for this period
    const periodTasks = await Task.find({
      $or: [
        { ownerUserId: { $in: memberIds } },
        { assignedUserIds: { $in: memberIds } },
      ],
      isDeleted: false,
      createdAt: { $gte: startDate },
    });

    const totalTasksCompleted = periodTasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length;

    // Calculate average completion rate
    const completionRates = memberIds.map(() => {
      const memberTasks = periodTasks.filter(
        (t: any) => t.ownerUserId?.toString() === memberIds.find(id => id.toString() === t.ownerUserId?.toString())?.toString()
      );
      const completed = memberTasks.filter((t: any) => t.status === TaskStatus.COMPLETED).length;
      return memberTasks.length > 0 ? (completed / memberTasks.length) * 100 : 0;
    });

    const averageCompletionRate =
      completionRates.length > 0
        ? Math.round(completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length)
        : 0;

    // Calculate member engagement
    const highlyEngaged = completionRates.filter((rate) => rate > 75).length;
    const moderatelyEngaged = completionRates.filter((rate) => rate >= 50 && rate <= 75).length;
    const lowEngagement = completionRates.filter((rate) => rate < 50).length;

    // Calculate trend (compare with previous period)
    const previousStartDate = period === 'week' ? subDays(startDate, 7) : period === 'month' ? subDays(startDate, 30) : new Date(0);
    const previousTasks = await Task.countDocuments({
      $or: [
        { ownerUserId: { $in: memberIds } },
        { assignedUserIds: { $in: memberIds } },
      ],
      isDeleted: false,
      createdAt: { $gte: previousStartDate, $lt: startDate },
    });

    const percentageChange = previousTasks > 0
      ? Math.round(((totalTasksCompleted - previousTasks) / previousTasks) * 100)
      : 0;

    const trend = {
      direction: percentageChange > 10 ? 'improving' as const : percentageChange < -10 ? 'declining' as const : 'stable' as const,
      percentageChange,
    };

    const metrics: IGroupPerformanceMetrics = {
      groupId,
      period,
      totalTasksCompleted,
      averageCompletionRate,
      averageResponseTime: 0, // Would need task progress timestamps
      memberEngagement: {
        highlyEngaged,
        moderatelyEngaged,
        lowEngagement,
      },
      trend,
    };

    await this.setInCache(cacheKey, metrics, ANALYTICS_CACHE_CONFIG.GROUP_PERFORMANCE);
    return metrics;
  }

  /**
   * Get Activity Feed
   * Returns recent group activities
   */
  async getActivityFeed(groupId: Types.ObjectId, limit: number = ACTIVITY_FEED_CONFIG.MAX_ACTIVITIES): Promise<IGroupActivity[]> {
    const cacheKey = this.getCacheKey('activity', groupId.toString());

    const cached = await this.getFromCache<IGroupActivity[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get all children/business users for this group
    const groupMembers = await ChildrenBusinessUser.find({
      businessUserId: groupId,
      isDeleted: false,
    }).populate('childUserId', 'name email');

    const memberIds = groupMembers.map((member: any) => member.childUserId);

    // Get recent task activities
    const recentTasks = await Task.find({
      $or: [
        { ownerUserId: { $in: memberIds } },
        { assignedUserIds: { $in: memberIds } },
        { createdById: groupId },
      ],
      isDeleted: false,
    })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .populate('ownerUserId', 'name');

    const activities: IGroupActivity[] = [];

    for (const task of recentTasks) {
      const owner = task.ownerUserId as any;
      const activity: IGroupActivity = {
        type: task.status === TaskStatus.COMPLETED ? 'task_completed' : 'task_created',
        memberId: task.ownerUserId as Types.ObjectId,
        memberName: owner?.name || 'Unknown',
        taskTitle: task.title,
        taskId: task._id,
        timestamp: task.updatedAt,
        metadata: {
          status: task.status,
          taskType: task.taskType,
        },
      };

      activities.push(activity);
    }

    const result = activities.slice(0, limit);

    await this.setInCache(cacheKey, result, ANALYTICS_CACHE_CONFIG.GROUP_ACTIVITY);
    return result;
  }

  /**
   * Helper: Calculate member's current streak
   */
  private async calculateMemberStreak(memberId: Types.ObjectId): Promise<{ current: number; longest: number }> {
    const completedTasks = await TaskProgress.find({
      userId: memberId,
      status: 'completed',
      isDeleted: false,
    })
      .select('completedAt')
      .sort({ completedAt: -1 });

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
      const daysDiff = lastDate
        ? (lastDate.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24)
        : 1;

      if (!lastDate || daysDiff <= 1.5) {
        // Allow some margin for timezone differences
        tempStreak++;
        if (completedDate >= today) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 0;
      }

      lastDate = completedDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);
    if (currentStreak === 0 && lastDate && lastDate >= today) {
      currentStreak = tempStreak;
    }

    return { current: currentStreak, longest: longestStreak };
  }

  /**
   * Helper: Calculate average completion time for a member
   */
  private async calculateAverageCompletionTime(memberId: Types.ObjectId): Promise<number> {
    const completedTasks = await TaskProgress.find({
      userId: memberId,
      status: 'completed',
      completedAt: { $exists: true },
      isDeleted: false,
    }).select('createdAt completedAt');

    if (completedTasks.length === 0) {
      return 0;
    }

    let totalTime = 0;
    let validTasks = 0;

    for (const task of completedTasks) {
      if (task.createdAt && task.completedAt) {
        const startTime = new Date(task.createdAt).getTime();
        const endTime = new Date(task.completedAt).getTime();
        const durationHours = (endTime - startTime) / (1000 * 60 * 60);
        totalTime += durationHours;
        validTasks++;
      }
    }

    return validTasks > 0 ? Math.round(totalTime / validTasks) : 0;
  }
}

export const groupAnalyticsService = new GroupAnalyticsService();
