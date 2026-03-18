import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { GenericController } from '../../../common/generic/generic.controller';
import { TaskService } from './task.service';
import { Task, TaskDocument, TaskStatus, TaskType } from './task.schema';
import { CreateTaskDto, UpdateTaskDto } from './dto/create-task.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { UserPayload } from '../../../common/decorators/user.decorator';
import { TransformResponseInterceptor } from '../../../common/interceptors/transform-response.interceptor';

/**
 * Task Controller
 * 
 * Manages task operations
 * Extends GenericController for CRUD operations
 */
@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(AuthGuard)
@UseInterceptors(TransformResponseInterceptor)
@ApiBearerAuth()
export class TaskController extends GenericController<typeof Task, TaskDocument> {
  constructor(private taskService: TaskService) {
    super(taskService, 'Task');
  }

  /**
   * GET /tasks/my
   * Get current user's tasks
   */
  @Get('my')
  @ApiOperation({ 
    summary: 'Get my tasks',
    description: 'Get all tasks for current user (created, owned, or assigned)',
  })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  async getMyTasks(
    @UserPayload() user: UserPayload,
    @Query('status') status?: TaskStatus,
  ) {
    return await this.taskService.getTasksByUserId(user.userId, status);
  }

  /**
   * GET /tasks/daily-progress
   * Get daily progress
   */
  @Get('daily-progress')
  @ApiOperation({ 
    summary: 'Get daily progress',
    description: 'Get task completion progress for a specific date',
  })
  @ApiQuery({ name: 'date', required: false, description: 'Date (default: today)' })
  async getDailyProgress(
    @UserPayload() user: UserPayload,
    @Query('date') date?: string,
  ) {
    const targetDate = date ? new Date(date) : new Date();
    return await this.taskService.getDailyProgress(user.userId, targetDate);
  }

  /**
   * GET /tasks/statistics
   * Get task statistics
   */
  @Get('statistics')
  @ApiOperation({ 
    summary: 'Get task statistics',
    description: 'Get task count by status for current user',
  })
  async getStatistics(@UserPayload() user: UserPayload) {
    return await this.taskService.getTaskStatistics(user.userId);
  }

  /**
   * PUT /tasks/:id/status
   * Update task status
   */
  @Put(':id/status')

  @ApiOperation({ 

    summary: 'Update task status',
    description: 'Update task status (pending/inProgress/completed)',
  })
  @ApiResponse({ status: 200, description: 'Task status updated successfully' })
  async updateTaskStatus(
    @Param('id') taskId: string,
    @Body('status') status: TaskStatus,
  ) {
    return await this.taskService.updateTaskStatus(taskId, status);
  }

  /**
   * POST /tasks/:id/subtasks

   * Add subtask to task (legacy endpoint - delegates to SubTaskController)
   * @deprecated Use POST /subtasks instead
   */
  @Post(':id/subtasks')
  @ApiOperation({
    summary: 'Add subtask (Deprecated - use POST /subtasks)',
    description: 'Add a new subtask to task. Deprecated: Use SubTask endpoints instead.',

  })
  @ApiResponse({ status: 201, description: 'Subtask added successfully' })
  async addSubtask(
    @Param('id') taskId: string,
    @Body('title') title: string,
    @Body('order') order: number,

    @UserPayload() user: UserPayload,
  ) {
    // Delegate to SubTaskService via taskService
    return await this.taskService.addSubtask(taskId, title, order, user.userId);

  }

  /**
   * GET /tasks/dashboard/children-tasks
   * Get children's tasks for parent dashboard
   */
  @Get('dashboard/children-tasks')

  @ApiOperation({ 
    summary: 'Get children tasks',
    description: 'Get all children tasks for parent dashboard',
  })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'taskType', required: false, enum: TaskType })
  async getChildrenTasks(
    @UserPayload() user: UserPayload,
    @Query('status') status?: TaskStatus,
    @Query('taskType') taskType?: TaskType,
  ) {
    // TODO: Implement with ChildrenBusinessUser module
    return { message: 'Not implemented yet' };
  }
}
