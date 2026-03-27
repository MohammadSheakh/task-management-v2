//@ts-ignore
import { Types } from 'mongoose';
import {
  TAnalyticsTimeRange,
  TAnalyticsTrendDirection,
  TAnalyticsPeriod,
  TAnalyticsReportPeriod,
  TAnalyticsImpactLevel,
  TChartInterval,
} from '../analytics.constant';

/**
 * Admin Analytics Interface
 * Platform-wide analytics for system administrators
 *
 * @see Figma: dashboard-section-flow.png, user-list-flow.png, subscription-flow.png
 */

// Platform Overview
export interface IPlatformOverview {
  totalUsers: number;
  totalGroups: number;
  totalTasks: number;
  activeUsersToday: number;
  activeUsersThisWeek: number;
  activeUsersThisMonth: number;
  dauMauRatio: number;  // Daily Active Users / Monthly Active Users
  usersByRole: {  // ✅ NEW: User count by role
    individual: number;
    child: number;
    business: number;
    admin: number;
  };
  monthlyRegisteredUsers: {  // ✅ NEW: Monthly registered users (current year)
    month: number;  // 1-12
    count: number;
  }[];
  annualRegisteredUsers: {  // ✅ NEW: Annual registered users (last 5 years)
    year: number;
    count: number;
  }[];
}

// User Growth Analytics
export interface IUserGrowthAnalytics {
  today: number;
  thisWeek: number;
  thisMonth: number;
  growthRate: {
    daily: number;      // percentage
    weekly: number;     // percentage
    monthly: number;    // percentage
  };
  history: {
    date: string;
    totalUsers: number;
    newUsers: number;
  }[];
}

// Revenue Analytics
export interface IRevenueAnalytics {
  mrr: number;  // Monthly Recurring Revenue
  arr: number;  // Annual Recurring Revenue
  thisMonth: number;
  lastMonth: number;
  growthRate: number;  // percentage
  bySubscriptionType: {
    individual: {
      count: number;
      revenue: number;
    };
    group: {
      count: number;
      revenue: number;
    };
  };
  history: {
    month: string;  // Format: "YYYY-MM"
    revenue: number;
    newSubscriptions: number;
    churnedSubscriptions: number;
  }[];
}

// Task Metrics (Platform-wide)
export interface IPlatformTaskMetrics {
  createdToday: number;
  completedToday: number;
  completionRate: number;
  averageTasksPerUser: number;
  byStatus: {
    pending: number;
    inProgress: number;
    completed: number;
  };
  byTaskType: {
    personal: number;
    singleAssignment: number;
    collaborative: number;
  };
  trend: {
    direction: TAnalyticsTrendDirection;
    percentageChange: number;
    period: TAnalyticsPeriod;
  };
}

// User Engagement Metrics
export interface IUserEngagementMetrics {
  dau: number;   // Daily Active Users
  mau: number;   // Monthly Active Users
  dauMauRatio: number;  // Stickiness ratio (target: > 20%)
  averageSessionDuration: number;  // in seconds
  sessionsPerUser: number;  // Average sessions per user per day
  retentionRate: {
    day1: number;   // % of users who return after 1 day
    day7: number;   // % of users who return after 7 days
    day30: number;  // % of users who return after 30 days
  };
}

// Admin Dashboard Overview (Main Response)
export interface IAdminDashboardAnalytics {
  overview: IPlatformOverview;
  userGrowth: IUserGrowthAnalytics;
  revenue: IRevenueAnalytics;
  taskMetrics: IPlatformTaskMetrics;
  engagement: IUserEngagementMetrics;
  topGroups: {
    groupId: Types.ObjectId;
    name: string;
    memberCount: number;
    tasksCompleted: number;
    completionRate: number;
  }[];
  recentUsers: {
    userId: Types.ObjectId;
    name: string;
    email: string;
    role: string;
    createdAt: Date;
  }[];
  lastUpdated: Date;
}

// Cohort Analysis Data
export interface ICohortData {
  cohort: string;  // Format: "YYYY-MM" (month of first task)
  totalUsers: number;
  retention: {
    month0: number;  // 100% (baseline)
    month1: number;  // % still active after 1 month
    month2: number;  // % still active after 2 months
    month3: number;  // % still active after 3 months
  };
  averageTasksPerUser: {
    month0: number;
    month1: number;
    month2: number;
    month3: number;
  };
}

// Churn Analysis Data
export interface IChurnAnalytics {
  period: TAnalyticsReportPeriod;
  totalChurnedUsers: number;
  churnRate: number;  // percentage
  byReason?: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  trends: {
    month: string;
    churnRate: number;
    churnedCount: number;
  }[];
}

// Predictive Analytics
export interface IPredictiveAnalytics {
  forecast: {
    period: string;  // Format: "YYYY-MM"
    predictedUsers: number;
    predictedRevenue: number;
    predictedTasks: number;
    confidence: number;  // 0-100
  }[];
  insights: {
    type: 'growth' | 'revenue' | 'engagement' | 'risk';
    title: string;
    description: string;
    impact: TAnalyticsImpactLevel;
    action?: string;
  }[];
}

// User Ratio Chart Data (for dashboard visualization)
export interface IUserRatioChartData {
  type: TChartInterval;
  data: {
    period: string;  // Format depends on type: "HH:mm" | "EEEE" | "MMM dd" | "MMM yyyy"
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    inactiveUsers: number;
    activityRate: number;  // percentage of active users
  }[];
  summary: {
    totalUsers: number;
    averageActiveUsers: number;
    averageActivityRate: number;
    trend: TAnalyticsTrendDirection;
    percentageChange: number;
  };
}

// Service Response Types
export interface IAdminAnalyticsService {
  getDashboardOverview(): Promise<IAdminDashboardAnalytics>;
  getUserGrowth(range?: TAnalyticsTimeRange): Promise<IUserGrowthAnalytics>;
  getRevenueAnalytics(): Promise<IRevenueAnalytics>;
  getTaskMetrics(): Promise<IPlatformTaskMetrics>;
  getEngagementMetrics(): Promise<IUserEngagementMetrics>;
  getUserRatioChartData(type?: TChartInterval): Promise<IUserRatioChartData>;
  getCohortAnalysis(months?: number): Promise<ICohortData[]>;
  getChurnAnalytics(period?: TAnalyticsReportPeriod): Promise<IChurnAnalytics>;
  getPredictiveAnalytics(months?: number): Promise<IPredictiveAnalytics>;
}
