/**
 * Group Analytics Module Constants
 * Centralized configuration for group analytics-related enums and limits
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

/**
 * Group Member Role Enum
 * Defines the role of a member within a group
 */
export enum GroupMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

/**
 * Group Activity Type Enum
 * Defines the type of activity in a group
 */
export enum GroupActivityType {
  TASK_COMPLETED = 'task_completed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
}

/**
 * Group Performance Period Enum
 * Defines the period for group performance metrics
 */
export enum GroupPerformancePeriod {
  WEEK = 'week',
  MONTH = 'month',
  ALL = 'all',
}

/**
 * Group Trend Direction Enum
 * Defines the direction of group performance trend
 */
export enum GroupTrendDirection {
  IMPROVING = 'improving',
  DECLINING = 'declining',
  STABLE = 'stable',
}

/**
 * Group Trends Period Enum
 * Defines the period for group trends analysis
 */
export enum GroupTrendsPeriod {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
}

/**
 * Type exports from enums
 */
export type TGroupMemberRole = `${GroupMemberRole}`;
export type TGroupActivityType = `${GroupActivityType}`;
export type TGroupPerformancePeriod = `${GroupPerformancePeriod}`;
export type TGroupTrendDirection = `${GroupTrendDirection}`;
export type TGroupTrendsPeriod = `${GroupTrendsPeriod}`;

/**
 * Legacy constant exports (for backward compatibility)
 * @deprecated Use GroupMemberRole, GroupActivityType, etc. enums instead
 */
export const GROUP_MEMBER_ROLE = GroupMemberRole;
export const GROUP_ACTIVITY_TYPE = GroupActivityType;
export const GROUP_PERFORMANCE_PERIOD = GroupPerformancePeriod;
export const GROUP_TREND_DIRECTION = GroupTrendDirection;

/**
 * Group Analytics Limits Configuration
 */
export const GROUP_ANALYTICS_LIMITS = {
  /**
   * Maximum leaderboard entries to return
   */
  MAX_LEADERBOARD_ENTRIES: 10,

  /**
   * Maximum activities to return in feed
   */
  MAX_ACTIVITIES: 50,

  /**
   * Minimum tasks to qualify for leaderboard
   */
  MIN_TASKS_TO_QUALIFY: 5,

  /**
   * Maximum members to compare at once
   */
  MAX_MEMBERS_TO_COMPARE: 10,
} as const;

/**
 * Group Engagement Thresholds
 */
export const GROUP_ENGAGEMENT_THRESHOLDS = {
  /**
   * High engagement: > 75% completion rate
   */
  HIGH_ENGAGEMENT_THRESHOLD: 75,

  /**
   * Moderate engagement: 50-75% completion rate
   */
  MODERATE_ENGAGEMENT_MIN: 50,
  MODERATE_ENGAGEMENT_MAX: 75,

  /**
   * Low engagement: < 50% completion rate
   */
  LOW_ENGAGEMENT_THRESHOLD: 50,
} as const;
