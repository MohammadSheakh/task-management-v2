import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaskAnalyticsService } from './services/taskAnalytics.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('analytics/tasks')
@ApiTags('Task Analytics')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
export class TaskAnalyticsController {
  constructor(private readonly taskAnalyticsService: TaskAnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get task overview' })
  @Roles('admin')
  @Throttle(10, 60)
  async getOverview() {
    const result = await this.taskAnalyticsService.getOverview();
    return { success: true, data: result };
  }

  @Get('completion-trend')
  @ApiOperation({ summary: 'Get completion trend' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  @Roles('admin')
  @Throttle(10, 60)
  async getCompletionTrend(@Query('days') days?: number) {
    const result = await this.taskAnalyticsService.getCompletionTrend(days || 7);
    return { success: true, data: result };
  }
}
