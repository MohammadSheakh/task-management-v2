import { Module } from '@nestjs/common';
import { AdminAnalyticsModule } from './adminAnalytics/adminAnalytics.module';
import { TaskAnalyticsModule } from './taskAnalytics/taskAnalytics.module';
import { UserAnalyticsModule } from './userAnalytics/userAnalytics.module';
import { ChartAggregationModule } from './chartAggregation/chartAggregation.module';

/**
 * Analytics Module (Parent Module)
 *
 * 📚 PLATFORM-WIDE ANALYTICS AND REPORTING
 *
 * Features:
 * - Admin dashboard analytics
 * - Task analytics and trends
 * - User engagement metrics
 * - Chart data aggregation
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 */
@Module({
  imports: [
    AdminAnalyticsModule,
    TaskAnalyticsModule,
    UserAnalyticsModule,
    ChartAggregationModule,
  ],
  exports: [
    AdminAnalyticsModule,
    TaskAnalyticsModule,
    UserAnalyticsModule,
    ChartAggregationModule,
  ],
})
export class AnalyticsModule {}
