import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserAnalyticsService } from './services/userAnalytics.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { User } from '../../../common/decorators/user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('analytics/users')
@ApiTags('User Analytics')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
export class UserAnalyticsController {
  constructor(private readonly userAnalyticsService: UserAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get user analytics overview' })
  @Throttle(10, 60)
  async getOverview(@User() user: any) {
    const result = await this.userAnalyticsService.getUserOverview(user.userId);
    return { success: true, data: result };
  }

  @Get('productivity')
  @ApiOperation({ summary: 'Get productivity metrics' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @Throttle(10, 60)
  async getProductivity(@User() user: any, @Query('days') days?: number) {
    const result = await this.userAnalyticsService.getProductivityMetrics(user.userId, days || 7);
    return { success: true, data: result };
  }

  @Get('streak')
  @ApiOperation({ summary: 'Get user streak' })
  @Throttle(10, 60)
  async getStreak(@User() user: any) {
    const result = await this.userAnalyticsService.getStreak(user.userId);
    return { success: true, data: result };
  }
}
