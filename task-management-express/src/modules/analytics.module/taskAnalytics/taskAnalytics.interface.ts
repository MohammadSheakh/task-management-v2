//@ts-ignore
import { Types } from 'mongoose';
import { TAnalyticsTimeRange } from '../analytics.constant';

/**
 * Task Analytics Interface
 * Analytics for task distribution, completion trends, and status tracking
 * 
 * @see Figma: task-monitoring-flow-01.png, dashboard-flow-01.png
 */

// Status Distribution
export interface IStatusDistribution {
  totalTasks: number;
  distribution: {
    notStarted: {
      count: number;
      percentage: number;
    };
    inProgress: {
      count: number;
      percentage: number;
    };
    completed: {
      count: number;
      percentage: number;
    };
  };
  overdueTasks: number;
  dueToday: number;
}

// Priority Distribution
export interface IPriorityDistribution {
  low: {
    count: number;
    percentage: number;
  };
  medium: {
    count: number;
    percentage: number;
  };
  high: {
    count: number;
    percentage: number;
  };
}

// Task Type Distribution
export interface ITaskTypeDistribution {
  personal: {
    count: number;
    percentage: number;
  };
  singleAssignment: {
    count: number;
    percentage: number;
  };
  collaborative: {
    count: number;
    percentage: number;
  };
}

// Completion Trend Data Point
export interface ICompletionTrendPoint {
  date: string;  // Format: "YYYY-MM-DD"
  completed: number;
  created: number;
  completionRate: number;
}

// Task Overview Analytics
export interface ITaskOverviewAnalytics {
  totalTasks: number;
  completedToday: number;
  pendingToday: number;
  completionRate: number;
  averageTasksPerDay: number;
  streak: {
    current: number;
    longest: number;
  };
}

// Group Task Analytics
export interface IGroupTaskAnalytics {
  groupId: Types.ObjectId;
  groupName: string;
  totalTasks: number;
  statusDistribution: IStatusDistribution;
  byPriority: IPriorityDistribution;
  byTaskType: ITaskTypeDistribution;
  memberStats: {
    memberId: Types.ObjectId;
    memberName: string;
    tasksAssigned: number;
    tasksCompleted: number;
    completionRate: number;
  }[];
  overdueTasks: number;
  dueToday: number;
  averageCompletionTime: number; // in hours
}

// Task Activity Data
export interface ITaskActivity {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
  tasksUpdated: number;
}

// Task Summary (Daily)
export interface IDailyTaskSummary {
  date: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completionRate: number;
  mostProductiveHour?: number;  // 0-23
  averageCompletionTime?: number; // in hours
}

// Service Response Types
export interface ITaskAnalyticsService {
  getOverview(): Promise<ITaskOverviewAnalytics>;
  getStatusDistribution(filters?: any): Promise<IStatusDistribution>;
  getCompletionTrend(range: TAnalyticsTimeRange): Promise<ICompletionTrendPoint[]>;
  getDailySummary(date?: Date): Promise<IDailyTaskSummary>;
  getGroupTaskAnalytics(groupId: Types.ObjectId): Promise<IGroupTaskAnalytics>;
  getTaskActivity(range: TAnalyticsTimeRange): Promise<ITaskActivity[]>;
}
