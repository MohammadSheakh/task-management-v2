//@ts-ignore
import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import {
  TAnalyticsJobStatus,
  TExportFormat,
  TAnalyticsModuleType,
  TExportStatus,
} from './analytics.constant';

/**
 * Main Analytics Module Interface
 * Re-exports all sub-module interfaces for easy import
 * 
 * @version 1.0.0
 */

// Export all sub-module interfaces
export * from './userAnalytics/userAnalytics.interface';
export * from './taskAnalytics/taskAnalytics.interface';
export * from './groupAnalytics/groupAnalytics.interface';
export * from './adminAnalytics/adminAnalytics.interface';

// Import all sub-module interfaces
import {
  IUserOverviewAnalytics,
  IDailyProgress,
  IStreakData,
  IProductivityScore,
  ICompletionRateAnalytics,
  ITaskStatistics,
  ITrendAnalytics,
} from './userAnalytics/userAnalytics.interface';

import {
  IStatusDistribution,
  ITaskOverviewAnalytics,
  IGroupTaskAnalytics,
  IDailyTaskSummary,
} from './taskAnalytics/taskAnalytics.interface';

import {
  IGroupOverviewAnalytics,
  IMemberStats,
  ILeaderboardEntry,
  IGroupPerformanceMetrics,
  IGroupActivity,
} from './groupAnalytics/groupAnalytics.interface';

import {
  IAdminDashboardAnalytics,
  IRevenueAnalytics,
  IUserEngagementMetrics,
  IPlatformTaskMetrics,
} from './adminAnalytics/adminAnalytics.interface';

/**
 * Unified Analytics Response Type
 * Generic wrapper for all analytics responses
 */
export interface IAnalyticsResponse<T> {
  data: T;
  cached: boolean;
  cacheAge?: string;
  generatedAt: Date;
}

/**
 * Analytics Cache Metadata
 */
export interface ICacheMetadata {
  key: string;
  ttl: number;
  createdAt: Date;
  hits: number;
}

/**
 * Analytics Job Status
 */
export interface IAnalyticsJobStatus {
  jobId: string;
  jobName: string;
  status: TAnalyticsJobStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: number;  // 0-100
}

/**
 * Analytics Export Data
 */
export interface IAnalyticsExportData {
  format: TExportFormat;
  analyticsType: TAnalyticsModuleType;
  filters: {
    from?: Date;
    to?: Date;
    userId?: Types.ObjectId;
    groupId?: Types.ObjectId;
  };
  status: TExportStatus;
  downloadUrl?: string;
  expiresAt?: Date;
}
