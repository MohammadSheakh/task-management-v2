//@ts-ignore
import { Types } from 'mongoose';
import {
  TGroupMemberRole,
  TGroupActivityType,
  TGroupPerformancePeriod,
  TGroupTrendDirection,
  TGroupTrendsPeriod,
} from './groupAnalytics.constant';

/**
 * Group Analytics Interface
 * Analytics for team/group performance, member statistics, and leaderboards
 *
 * @see Figma: dashboard-flow-01.png, team-member-flow-01.png
 */

// Member Statistics
export interface IMemberStats {
  memberId: Types.ObjectId;
  memberName: string;
  memberEmail: string;
  role: TGroupMemberRole;
  joinedDate: Date;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  completionRate: number;
  currentStreak: number;
  averageCompletionTime: number; // in hours
  lastActiveDate?: Date;
}

// Group Overview Analytics
export interface IGroupOverviewAnalytics {
  groupId: Types.ObjectId;
  groupName: string;
  memberCount: number;
  activeMembersToday: number;
  overview: {
    totalTasks: number;
    completedToday: number;
    pendingToday: number;
    completionRate: number;
    averageTasksPerMember: number;
  };
  topPerformers: {
    memberId: Types.ObjectId;
    memberName: string;
    tasksCompleted: number;
    streak: number;
  }[];
  recentActivity: IGroupActivity[];
}

// Group Activity Feed Item
export interface IGroupActivity {
  type: TGroupActivityType;
  memberId: Types.ObjectId;
  memberName: string;
  taskTitle?: string;
  taskId?: Types.ObjectId;
  timestamp: Date;
  metadata?: {
    [key: string]: any;
  };
}

// Leaderboard Entry
export interface ILeaderboardEntry {
  rank: number;
  memberId: Types.ObjectId;
  memberName: string;
  tasksCompleted: number;
  completionRate: number;
  streak: number;
  points: number;  // Calculated score
}

// Group Performance Metrics
export interface IGroupPerformanceMetrics {
  groupId: Types.ObjectId;
  period: TGroupPerformancePeriod;
  totalTasksCompleted: number;
  averageCompletionRate: number;
  averageResponseTime: number;  // Time from assignment to first action (hours)
  memberEngagement: {
    highlyEngaged: number;   // > 75% completion rate
    moderatelyEngaged: number; // 50-75% completion rate
    lowEngagement: number;    // < 50% completion rate
  };
  trend: {
    direction: TGroupTrendDirection;
    percentageChange: number;
  };
}

// Member Comparison Data
export interface IMemberComparison {
  memberId: Types.ObjectId;
  memberName: string;
  vsGroupAverage: {
    completionRate: number;  // percentage points above/below average
    tasksCompleted: number;  // tasks above/below average
    streak: number;          // days above/below average
  };
  ranking: {
    byCompletionRate: number;
    byTasksCompleted: number;
    byStreak: number;
  };
}

// Group Trends Data
export interface IGroupTrendsData {
  period: TGroupTrendsPeriod;
  data: {
    date: string;
    tasksCompleted: number;
    activeMembers: number;
    completionRate: number;
  }[];
  summary: {
    bestDay: {
      date: string;
      tasksCompleted: number;
    };
    averageDailyTasks: number;
    averageDailyActiveMembers: number;
  };
}

// Service Response Types
export interface IGroupAnalyticsService {
  getGroupOverview(groupId: Types.ObjectId): Promise<IGroupOverviewAnalytics>;
  getMemberStats(groupId: Types.ObjectId): Promise<IMemberStats[]>;
  getLeaderboard(groupId: Types.ObjectId, limit?: number): Promise<ILeaderboardEntry[]>;
  getPerformanceMetrics(groupId: Types.ObjectId, period?: TGroupPerformancePeriod): Promise<IGroupPerformanceMetrics>;
  getMemberComparison(groupId: Types.ObjectId, memberId: Types.ObjectId): Promise<IMemberComparison>;
  getGroupTrends(groupId: Types.ObjectId, period?: TGroupTrendsPeriod): Promise<IGroupTrendsData>;
  getActivityFeed(groupId: Types.ObjectId, limit?: number): Promise<IGroupActivity[]>;
}
