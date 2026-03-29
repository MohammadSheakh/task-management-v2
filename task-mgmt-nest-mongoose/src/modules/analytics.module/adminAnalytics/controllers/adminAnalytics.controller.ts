import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAnalyticsService } from './services/adminAnalytics.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

/**
 * Admin Analytics Controller
 * Platform-wide analytics for administrators
 */
@Controller('analytics/admin')
@ApiTags('Admin Analytics')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  @Roles('admin')
  @Throttle(10, 60)
  async getDashboard() {
    const result = await this.adminAnalyticsService.getDashboardOverview();
    return { success: true, data: result };
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth analytics' })
  @Roles('admin')
  @Throttle(10, 60)
  async getUserGrowth() {
    const result = await this.adminAnalyticsService.getUserGrowthAnalytics();
    return { success: true, data: result };
  }

  @Get('task-metrics')
  @ApiOperation({ summary: 'Get task metrics' })
  @Roles('admin')
  @Throttle(10, 60)
  async getTaskMetrics() {
    const result = await this.adminAnalyticsService.getTaskMetrics();
    return { success: true, data: result };
  }
}
