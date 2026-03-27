/**
 * Analytics Cache Configuration
 * TTL values for different analytics data types
 * 
 * @see Figma: dashboard-section-flow.png, home-flow.png
 */

export const ANALYTICS_CACHE_CONFIG = {
  // Cache key prefix for all analytics
  PREFIX: 'analytics',

  // User Analytics TTL (in seconds)
  USER_OVERVIEW: 300,        // 5 minutes
  USER_DAILY_PROGRESS: 120,  // 2 minutes
  USER_STREAK: 900,          // 15 minutes
  USER_PRODUCTIVITY: 600,    // 10 minutes
  USER_COMPLETION_RATE: 600, // 10 minutes

  // Task Analytics TTL (in seconds)
  TASK_OVERVIEW: 300,        // 5 minutes
  TASK_STATUS_DIST: 300,     // 5 minutes
  TASK_COMPLETION_TREND: 600,// 10 minutes
  TASK_DAILY_SUMMARY: 120,   // 2 minutes

  // Group Analytics TTL (in seconds)
  GROUP_OVERVIEW: 300,       // 5 minutes
  GROUP_MEMBERS: 600,        // 10 minutes
  GROUP_ACTIVITY: 120,       // 2 minutes
  GROUP_LEADERBOARD: 900,    // 15 minutes
  GROUP_PERFORMANCE: 600,    // 10 minutes

  // Admin Analytics TTL (in seconds)
  ADMIN_DASHBOARD: 600,      // 10 minutes
  ADMIN_REVENUE: 900,        // 15 minutes
  ADMIN_USER_GROWTH: 900,    // 15 minutes
  ADMIN_TASK_METRICS: 600,   // 10 minutes
  ADMIN_ENGAGEMENT: 900,     // 15 minutes
} as const;

/**
 * Analytics Queue Configuration
 * BullMQ job settings for analytics pre-computation
 */
export const ANALYTICS_QUEUE_CONFIG = {
  QUEUE_NAME: 'analytics-jobs',

  // Job retry configuration
  JOB_ATTEMPTS: 3,
  BACKOFF_DELAY: 5000,  // 5 seconds

  // Job cleanup configuration
  REMOVE_ON_COMPLETE: { count: 100 },
  REMOVE_ON_FAIL: { count: 500 },

  // Concurrency limits
  CONCURRENCY: 5,  // Max 5 concurrent analytics jobs
} as const;

/**
 * Analytics Time Range Types
 * Used for filtering analytics data
 */
export type TAnalyticsTimeRange = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'all';

/**
 * Analytics Data Types
 * Types of analytics that can be requested
 */
export type TAnalyticsType =
  | 'overview'
  | 'progress'
  | 'streak'
  | 'productivity'
  | 'completion-rate'
  | 'status-distribution'
  | 'trend'
  | 'leaderboard'
  | 'activity'
  | 'performance';

/**
 * Analytics Trend Direction Enum
 * Defines the direction of a metric trend
 */
export enum AnalyticsTrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
}

/**
 * Analytics Period Enum
 * Defines the time period for analytics
 */
export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Analytics Report Period Enum
 * Defines the period for cohort and churn analysis
 */
export enum AnalyticsReportPeriod {
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

/**
 * Analytics Impact Level Enum
 * Defines the impact level of insights
 */
export enum AnalyticsImpactLevel {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Chart Interval Enum
 * Defines the interval type for chart data
 */
export enum ChartInterval {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/**
 * Analytics Job Status Enum
 * Defines the status of analytics jobs
 */
export enum AnalyticsJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Export Format Enum
 * Defines the format for analytics exports
 */
export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
  JSON = 'json',
}

/**
 * Analytics Module Type Enum
 * Defines the type of analytics module
 */
export enum AnalyticsModuleType {
  USER = 'user',
  TASK = 'task',
  GROUP = 'group',
  ADMIN = 'admin',
}

/**
 * Export Status Enum
 * Defines the status of export jobs
 */
export enum ExportStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Type exports from enums
 */
export type TAnalyticsTrendDirection = `${AnalyticsTrendDirection}`;
export type TAnalyticsPeriod = `${AnalyticsPeriod}`;
export type TAnalyticsReportPeriod = `${AnalyticsReportPeriod}`;
export type TAnalyticsImpactLevel = `${AnalyticsImpactLevel}`;
export type TChartInterval = `${ChartInterval}`;
export type TAnalyticsJobStatus = `${AnalyticsJobStatus}`;
export type TExportFormat = `${ExportFormat}`;
export type TAnalyticsModuleType = `${AnalyticsModuleType}`;
export type TExportStatus = `${ExportStatus}`;

/**
 * Productivity Trend Enum
 * Defines the trend direction for productivity scores
 */
export enum ProductivityTrend {
  UP = 'up',
  DOWN = 'down',
  STABLE = 'stable',
}

/**
 * Type export from enum
 */
export type TProductivityTrend = `${ProductivityTrend}`;

/**
 * Productivity Score Configuration
 * Weights for calculating user productivity score (0-100)
 */
export const PRODUCTIVITY_SCORE_WEIGHTS = {
  COMPLETION_RATE: 0.4,      // 40% weight
  STREAK: 0.2,               // 20% weight
  TASKS_COMPLETED: 0.25,     // 25% weight
  ON_TIME_COMPLETION: 0.15,  // 15% weight
} as const;

/**
 * Streak Configuration
 * Rules for calculating and maintaining streaks
 */
export const STREAK_CONFIG = {
  MIN_TASKS_PER_DAY: 1,      // Minimum tasks to count as active day
  GRACE_PERIOD_HOURS: 24,    // Grace period before streak breaks
  MAX_STREAK_HISTORY_DAYS: 365, // How far back to track streaks
} as const;

/**
 * Leaderboard Configuration
 * Settings for group leaderboards
 */
export const LEADERBOARD_CONFIG = {
  MAX_ENTRIES: 10,           // Top 10 members
  MIN_TASKS_TO_QUALIFY: 5,   // Minimum tasks to appear on leaderboard
  UPDATE_INTERVAL_MINUTES: 15, // How often to recalculate
} as const;

/**
 * Activity Feed Configuration
 */
export const ACTIVITY_FEED_CONFIG = {
  MAX_ACTIVITIES: 50,        // Max activities to return
  LOOKBACK_HOURS: 24,        // How far back to look (24 hours)
  CACHE_TTL_SECONDS: 120,    // Cache for 2 minutes
} as const;

/**
 * Admin Dashboard Metrics Configuration
 */
export const ADMIN_METRICS_CONFIG = {
  TOP_GROUPS_LIMIT: 10,      // Show top 10 groups
  RECENT_USERS_LIMIT: 20,    // Show 20 recent users
  GROWTH_HISTORY_DAYS: 30,   // 30 days of growth data
  REVENUE_HISTORY_MONTHS: 12,// 12 months of revenue data
} as const;
