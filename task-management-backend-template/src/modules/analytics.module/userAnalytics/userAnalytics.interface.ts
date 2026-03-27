//@ts-ignore
import { Types } from 'mongoose';
import { TAnalyticsTimeRange, TAnalyticsTrendDirection, TAnalyticsPeriod, TProductivityTrend } from '../analytics.constant';

/**
 * User Analytics Interface
 * Comprehensive analytics for individual users
 *
 * @see Figma: home-flow.png, profile-permission-account-interface.png
 */

// Daily Progress Data
export interface IDailyProgress {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  progress: string; // Format: "X/Y"
  completionRate: number;
}

// Streak Data
export interface IStreakData {
  currentStreak: number;
  longestStreak: number;
  streakHistory: {
    date: Date;
    tasksCompleted: number;
    isActive: boolean;
  }[];
  lastActiveDate?: Date;
}

// Productivity Score
export interface IProductivityScore {
  score: number;           // 0-100
  breakdown: {
    completionRate: number;
    streak: number;
    tasksCompleted: number;
    onTimeCompletion: number;
  };
  trend: TProductivityTrend;
  percentile: number;      // User's percentile among all users
}

// Completion Rate Analytics
export interface ICompletionRateAnalytics {
  overall: number;
  byTimeRange: {
    today?: number;
    thisWeek: number;
    thisMonth: number;
    thisYear?: number;
  };
  trend: {
    direction: TAnalyticsTrendDirection;
    percentageChange: number;
    period: TAnalyticsPeriod;
  };
}

// Task Statistics
export interface ITaskStatistics {
  totalTasks: number;
  byStatus: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
  };
  byTaskType: {
    personal: number;
    singleAssignment: number;
    collaborative: number;
  };
  averageCompletionTime?: number; // in hours
  onTimeCompletionRate?: number;  // percentage
}

// Weekly/Monthly Trend Data
export interface ITrendDataPoint {
  date: string;  // Format: "YYYY-MM-DD" or "MMM DD"
  tasksCompleted: number;
  tasksCreated: number;
  completionRate: number;
}

export interface ITrendAnalytics {
  period: TAnalyticsTimeRange;
  data: ITrendDataPoint[];
  summary: {
    totalCompleted: number;
    averagePerDay: number;
    bestDay: {
      date: string;
      count: number;
    };
    worstDay: {
      date: string;
      count: number;
    };
  };
}

// User Overview Analytics (Main Response)
export interface IUserOverviewAnalytics {
  userId: Types.ObjectId;
  overview: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    productivityScore: number;
  };
  today: IDailyProgress;
  thisWeek: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  thisMonth: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
  lastUpdated: Date;
}

// Service Response Types
export interface IUserAnalyticsService {
  getUserOverview(userId: Types.ObjectId): Promise<IUserOverviewAnalytics>;
  getDailyProgress(userId: Types.ObjectId): Promise<IDailyProgress>;
  getStreak(userId: Types.ObjectId): Promise<IStreakData>;
  getCompletionRate(userId: Types.ObjectId, range?: TAnalyticsTimeRange): Promise<ICompletionRateAnalytics>;
  getProductivityScore(userId: Types.ObjectId): Promise<IProductivityScore>;
  getTaskStatistics(userId: Types.ObjectId): Promise<ITaskStatistics>;
  getTrendAnalytics(userId: Types.ObjectId, range: TAnalyticsTimeRange): Promise<ITrendAnalytics>;
}
