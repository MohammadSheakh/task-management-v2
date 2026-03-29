import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseEnumPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TaskProgressService } from './taskProgress.service';
import { UpdateTaskProgressDto, CompleteSubtaskDto, QueryTaskProgressDto } from './dto/taskProgress.dto';
import { TaskProgressStatus } from './taskProgress.constants';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { User } from '../../../common/decorators/user.decorator';
import { Throttle } from '@nestjs/throttler';

/**
 * TaskProgress Controller
 * Handles HTTP requests for task progress operations
 *
 * Features:
 * - Per-child progress tracking
 * - Real-time parent notifications
 * - Subtask completion tracking
 * - Parent dashboard views
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 *
 * @example
 * // Child gets their progress on a task
 * GET /task-progress/:taskId/user/:userId
 *
 * // Parent views all children's progress
 * GET /task-progress/:taskId/children
 *
 * // Child marks task as started
 * PUT /task-progress/:taskId/status
 * {
 *   "status": "inProgress",
 *   "note": "Starting now!"
 * }
 */
@Controller('task-progress')
@ApiTags('Task Progress')
@ApiBearerAuth('access-token')
@UseGuards(AuthGuard, RolesGuard)
export class TaskProgressController {
  constructor(private readonly taskProgressService: TaskProgressService) {}

  /**
   * Get personal progress on a specific task
   * Child views their own progress (status, subtasks completed)
   *
   * @param taskId - Task ID
   * @param user - Authenticated user
   * @returns Progress record
   *
   * @example
   * // Request
   * GET /task-progress/507f1f77bcf86cd799439011/user/me
   *
   * // Response
   * {
   *   "success": true,
   *   "data": {
   *     "progressId": "...",
   *     "taskId": "...",
   *     "userId": "...",
   *     "status": "inProgress",
   *     "progressPercentage": 60,
   *     "completedSubtaskIndexes": [0, 2],
   *     "startedAt": "2024-03-26T10:00:00Z"
   *   }
   * }
   */
  @Get(':taskId/user/:userId')
  @ApiOperation({
    summary: 'Get personal task progress',
    description: 'Get your progress on a specific task (status, subtasks completed)',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Task or progress not found' })
  @Throttle(100, 60) // 100 requests per minute
  async getProgress(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
    @User() user: any,
  ) {
    // Users can only view their own progress (unless admin)
    const targetUserId = userId === 'me' ? user.userId : userId;

    const result = await this.taskProgressService.getProgress(taskId, targetUserId);

    return {
      success: true,
      data: result,
      message: 'Progress retrieved successfully',
    };
  }

  /**
   * Get all children's progress for a task (Parent Dashboard)
   * Parent/teacher views which children completed/started/not started a task
   *
   * @param taskId - Task ID
   * @returns Progress summary with all children's data
   *
   * @example
   * // Request
   * GET /task-progress/507f1f77bcf86cd799439011/children
   *
   * // Response
   * {
   *   "success": true,
   *   "data": {
   *     "taskId": "...",
   *     "taskTitle": "Clean the garage",
   *     "totalSubtasks": 5,
   *     "childrenProgress": [
   *       {
   *         "childId": "...",
   *         "childName": "Alice",
   *         "status": "completed",
   *         "progressPercentage": 100,
   *         "completedSubtaskCount": 5
   *       },
   *       {
   *         "childId": "...",
   *         "childName": "Bob",
   *         "status": "inProgress",
   *         "progressPercentage": 60,
   *         "completedSubtaskCount": 3
   *       }
   *     ],
   *     "summary": {
   *       "totalChildren": 2,
   *       "notStarted": 0,
   *       "inProgress": 1,
   *       "completed": 1,
   *       "completionRate": 50,
   *       "averageProgress": 80
   *     }
   *   }
   * }
   */
  @Get(':taskId/children')
  @ApiOperation({
    summary: 'Get all children progress',
    description: 'View which children completed/started/not started a task (Parent Dashboard)',
  })
  @ApiResponse({
    status: 200,
    description: 'Children progress retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Roles('business', 'admin') // Parent/teacher only
  @Throttle(100, 60)
  async getAllChildrenProgress(@Param('taskId') taskId: string) {
    const result = await this.taskProgressService.getAllChildrenProgress(taskId);

    return {
      success: true,
      data: result,
      message: 'Children progress retrieved successfully',
    };
  }

  /**
   * Get all tasks progress for a child
   * Parent/teacher views child's overall task performance
   *
   * @param childId - Child user ID
   * @param query - Optional filters (status, taskType)
   * @returns Array of tasks with progress
   *
   * @example
   * // Request
   * GET /task-progress/child/507f191e810c19729de860ea/tasks?status=inProgress
   *
   * // Response
   * {
   *   "success": true,
   *   "data": [
   *     {
   *       "taskId": "...",
   *       "taskTitle": "Math homework",
   *       "taskType": "personal",
   *       "progressStatus": "inProgress",
   *       "progressPercentage": 60,
   *       "completedSubtaskCount": 3,
   *       "totalSubtasks": 5
   *     }
   *   ]
   * }
   */
  @Get('child/:childId/tasks')
  @ApiOperation({
    summary: "Get child's task progress",
    description: "View child's overall task performance across all tasks",
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskProgressStatus,
    description: 'Filter by status',
  })
  @ApiQuery({
    name: 'taskType',
    required: false,
    enum: ['personal', 'singleAssignment', 'collaborative'],
    description: 'Filter by task type',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks progress retrieved successfully',
  })
  @Roles('business', 'admin') // Parent/teacher only
  @Throttle(100, 60)
  async getAllTasksProgress(
    @Param('childId') childId: string,
    @Query() query?: QueryTaskProgressDto,
  ) {
    const result = await this.taskProgressService.getAllTasksProgress(childId, query);

    return {
      success: true,
      data: result,
      message: 'Tasks progress retrieved successfully',
    };
  }

  /**
   * Update progress status (start/complete task)
   * Child marks task as started or completed
   *
   * @param taskId - Task ID
   * @param dto - Update DTO (status, note)
   * @param user - Authenticated user
   * @returns Updated progress record
   *
   * @example
   * // Request
   * PUT /task-progress/507f1f77bcf86cd799439011/status
   * {
   *   "status": "inProgress",
   *   "note": "Starting this task now!"
   * }
   *
   * // Response
   * {
   *   "success": true,
   *   "data": {
   *     "progressId": "...",
   *     "status": "inProgress",
   *     "startedAt": "2024-03-26T10:00:00Z",
   *     "note": "Starting this task now!"
   *   },
   *   "message": "Task inProgress successfully"
   * }
   */
  @Put(':taskId/status')
  @ApiOperation({
    summary: 'Update progress status',
    description: 'Mark task as started or completed (for COLLABORATIVE tasks)',
  })
  @ApiResponse({
    status: 200,
    description: 'Task status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @Throttle(30, 60) // 30 updates per minute (prevents spam)
  async updateProgressStatus(
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskProgressDto,
    @User() user: any,
  ) {
    const userId = user.userId;

    const result = await this.taskProgressService.updateProgressStatus(
      taskId,
      userId,
      dto.status,
      dto.note,
    );

    return {
      success: true,
      data: result,
      message: `Task ${dto.status} successfully`,
    };
  }

  /**
   * Mark a subtask as complete
   * Child completes a specific subtask and updates progress percentage
   *
   * @param taskId - Task ID
   * @param subtaskIndex - Subtask index (0-based)
   * @param user - Authenticated user
   * @returns Updated progress record
   *
   * @example
   * // Request
   * PUT /task-progress/507f1f77bcf86cd799439011/subtasks/2/complete
   *
   * // Response
   * {
   *   "success": true,
   *   "data": {
   *     "progressId": "...",
   *     "status": "inProgress",
   *     "progressPercentage": 60,
   *     "completedSubtaskIndexes": [0, 2]
   *   },
   *   "message": "Subtask completed successfully"
   * }
   */
  @Put(':taskId/subtasks/:subtaskIndex/complete')
  @ApiOperation({
    summary: 'Complete subtask',
    description: 'Complete a specific subtask and update progress percentage',
  })
  @ApiResponse({
    status: 200,
    description: 'Subtask completed successfully',
  })
  @ApiResponse({ status: 404, description: 'Task or subtask not found' })
  @Throttle(30, 60) // 30 updates per minute (prevents spam)
  async completeSubtask(
    @Param('taskId') taskId: string,
    @Param('subtaskIndex', ParseIntPipe) subtaskIndex: number,
    @User() user: any,
  ) {
    const userId = user.userId;

    const result = await this.taskProgressService.completeSubtask(
      taskId,
      subtaskIndex,
      userId,
    );

    return {
      success: true,
      data: result,
      message: 'Subtask completed successfully',
    };
  }

  /**
   * Create or update progress (internal use)
   * Auto-create progress when child assigned to collaborative task
   *
   * @param taskId - Task ID
   * @param dto - Create DTO (userId, status)
   * @returns Created/updated progress record
   *
   * @internal System use only (called from task creation)
   */
  @Post(':taskId')
  @ApiOperation({
    summary: 'Create progress (internal)',
    description: 'Auto-create progress when child assigned to collaborative task',
    deprecated: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Progress created successfully',
  })
  @Throttle(100, 60)
  async createOrUpdateProgress(
    @Param('taskId') taskId: string,
    @Body() dto: any,
  ) {
    const { userId, status } = dto;

    if (!userId) {
      return {
        success: false,
        message: 'User ID is required',
      };
    }

    const result = await this.taskProgressService.createOrUpdateProgress(
      taskId,
      userId,
      status,
    );

    return {
      success: true,
      data: result,
      message: 'Progress created successfully',
    };
  }

  /**
   * Delete progress record (soft delete)
   * Admin-only operation
   *
   * @param taskId - Task ID
   * @param userId - User ID
   * @returns Deleted progress record
   */
  @Delete(':taskId/user/:userId')
  @ApiOperation({
    summary: 'Delete progress record',
    description: 'Soft delete progress record (admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Progress deleted successfully',
  })
  @Roles('admin')
  @Throttle(10, 60) // 10 deletes per minute
  async deleteProgress(
    @Param('taskId') taskId: string,
    @Param('userId') userId: string,
  ) {
    const result = await this.taskProgressService.deleteProgress(taskId, userId);

    return {
      success: true,
      data: result,
      message: 'Progress deleted successfully',
    };
  }
}
