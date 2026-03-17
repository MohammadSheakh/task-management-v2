import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';

import { SubTaskService } from './subTask.service';
import { CreateSubTaskDto, UpdateSubTaskDto, ToggleSubTaskStatusDto, BulkSubTaskDto } from './dto/subtask.dto';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { User } from '../../../common/decorators/user.decorator';

/**
 * SubTask Controller
 *
 * 📚 SUBTASK MANAGEMENT API
 *
 * Endpoints:
 * - POST /subtasks - Create subtask
 * - GET /tasks/:taskId/subtasks - Get subtasks by task
 * - PUT /subtasks/:id - Update subtask
 * - PUT /subtasks/:id/toggle - Toggle completion
 * - DELETE /subtasks/:id - Delete subtask
 * - POST /tasks/:taskId/subtasks/bulk - Bulk create subtasks
 *
 * Compatible with Express.js subTask.controller.ts
 */
@ApiTags('SubTasks')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('subtasks')
export class SubTaskController {
  private readonly logger = new Logger(SubTaskController.name);

  constructor(private readonly subTaskService: SubTaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a subtask' })
  @ApiResponse({ status: 201, description: 'Subtask created successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async createSubTask(
    @Body() createDto: CreateSubTaskDto,
    @User('userId') userId: string,
  ) {
    this.logger.log(`📝 Creating subtask for task ${createDto.taskId}`);

    const subTask = await this.subTaskService.createSubTask(createDto, userId);

    return {
      success: true,
      message: 'Subtask created successfully',
      data: subTask,
    };
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get subtasks for a task' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Subtasks retrieved successfully' })
  async getSubTasksByTaskId(@Param('taskId') taskId: string) {
    this.logger.log(`📬 Getting subtasks for task ${taskId}`);

    const subTasks = await this.subTaskService.getSubTasksByTaskId(taskId);

    return {
      success: true,
      message: 'Subtasks retrieved successfully',
      data: subTasks,
    };
  }

  @Put(':subTaskId')
  @ApiOperation({ summary: 'Update a subtask' })
  @ApiParam({ name: 'subTaskId', description: 'SubTask ID' })
  @ApiResponse({ status: 200, description: 'Subtask updated successfully' })
  @ApiResponse({ status: 404, description: 'SubTask not found' })
  async updateSubTask(
    @Param('subTaskId') subTaskId: string,
    @Body() updateDto: UpdateSubTaskDto,
    @User('userId') userId: string,
  ) {
    this.logger.log(`✏️ Updating subtask ${subTaskId}`);

    const subTask = await this.subTaskService.updateSubTask(subTaskId, updateDto, userId);

    return {
      success: true,
      message: 'Subtask updated successfully',
      data: subTask,
    };
  }

  @Put(':subTaskId/toggle')
  @ApiOperation({ summary: 'Toggle subtask completion status' })
  @ApiParam({ name: 'subTaskId', description: 'SubTask ID' })
  @ApiBody({ type: ToggleSubTaskStatusDto })
  @ApiResponse({ status: 200, description: 'Status toggled successfully' })
  async toggleSubTaskStatus(
    @Param('subTaskId') subTaskId: string,
    @Body() dto: ToggleSubTaskStatusDto,
    @User('userId') userId: string,
  ) {
    this.logger.log(`🔄 Toggling subtask ${subTaskId} status to ${dto.isCompleted}`);

    const subTask = await this.subTaskService.toggleSubTaskStatus(subTaskId, dto.isCompleted, userId);

    return {
      success: true,
      message: 'Subtask status updated successfully',
      data: subTask,
    };
  }

  @Delete(':subTaskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a subtask (soft delete)' })
  @ApiParam({ name: 'subTaskId', description: 'SubTask ID' })
  @ApiResponse({ status: 200, description: 'Subtask deleted successfully' })
  async deleteSubTask(
    @Param('subTaskId') subTaskId: string,
    @User('userId') userId: string,
  ) {
    this.logger.log(`🗑️ Deleting subtask ${subTaskId}`);

    await this.subTaskService.deleteSubTask(subTaskId, userId);

    return {
      success: true,
      message: 'Subtask deleted successfully',
      data: null,
    };
  }

  @Post('tasks/:taskId/bulk')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Bulk create subtasks' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiBody({ type: BulkSubTaskDto })
  @ApiResponse({ status: 201, description: 'Subtasks created successfully' })
  async bulkCreateSubTasks(
    @Param('taskId') taskId: string,
    @Body() dto: BulkSubTaskDto,
    @User('userId') userId: string,
  ) {
    this.logger.log(`📦 Bulk creating ${dto.subtasks.length} subtasks for task ${taskId}`);

    const subTasks = await this.subTaskService.bulkCreateSubTasks(taskId, dto.subtasks, userId);

    return {
      success: true,
      message: `${subTasks.length} subtasks created successfully`,
      data: subTasks,
    };
  }
}
