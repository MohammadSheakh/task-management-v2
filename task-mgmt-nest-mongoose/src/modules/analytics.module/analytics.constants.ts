/**
 * Analytics Module Constants
 * Cache configuration, enums, and analytics settings
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 */

/**
 * Analytics Cache Configuration
 * TTL values for different analytics data types
 */
export const ANALYTICS_CACHE_CONFIG = {
  // Cache key prefix
  PREFIX: 'analytics',

  // User Analytics TTL (seconds)
  USER_OVERVIEW: 300,
  USER_DAILY_PROGRESS: 120,
  USER_STREAK: 900,
  USER_PRODUCTIVITY: 600,
  USER_COMPLETION_RATE: 600,

  // Task Analytics TTL (seconds)
  TASK_OVERVIEW: 300,
  TASK_STATUS_DIST: 300,
  TASK_COMPLETION_TREND: 600,
  TASK_DAILY_SUMMARY: 120,

  // Admin Analytics TTL (seconds)
  ADMIN_DASHBOARD: 600,
  ADMIN_REVENUE: 900,
  ADMIN_USER_GROWTH: 900,
  ADMIN_TASK_METRICS: 600,
  ADMIN_ENGAGEMENT: 900,

  // Group Analytics TTL (seconds)
  GROUP_OVERVIEW: 300,
  GROUP_MEMBERS: 600,
  GROUP_ACTIVITY: 120,
  GROUP_LEADERBOARD: 900,
  GROUP_PERFORMANCE: 600,
} as const;

/**
 * Analytics Time Range Type
 */
export type AnalyticsTimeRange =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'all';

/**
 * Analytics Trend Direction Enum
 */
export enum AnalyticsTrendDirection {
  INCREASING = 'increasing',
  DECREASING = 'decreasing',
  STABLE = 'stable',
}

/**
 * Analytics Period Enum
 */
export enum AnalyticsPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

/**
 * Admin dashboard config
 */
export const ADMIN_METRICS_CONFIG = {
  /** Default date range for dashboard (days) */
  DEFAULT_RANGE_DAYS: 30,

  /** Maximum date range (days) */
  MAX_RANGE_DAYS: 365,

  /** Chart data points */
  CHART_POINTS: {
    WEEK: 7,
    MONTH: 30,
    YEAR: 12,
  },
} as const;

/**
 * Export legacy constants
 */
export const TAnalyticsTimeRange = AnalyticsTimeRange;
export const AnalyticsTrend = AnalyticsTrendDirection;
