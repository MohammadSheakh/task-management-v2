import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsMongoId,
  MaxLength,
} from 'class-validator';
import { TaskProgressStatus } from './taskProgress.constants';

/**
 * DTO for creating task progress
 * Used when child is assigned to a collaborative task
 *
 * @example
 * {
 *   "taskId": "507f1f77bcf86cd799439011",
 *   "userId": "507f191e810c19729de860ea",
 *   "status": "notStarted"
 * }
 */
export class CreateTaskProgressDto {
  /**
   * Task ID (MongoDB ObjectId)
   * @example "507f1f77bcf86cd799439011"
   */
  @ApiProperty({
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
    required: true,
  })
  @IsNotEmpty({ message: 'Task ID is required' })
  @IsMongoId({ message: 'Invalid task ID format' })
  taskId: string;

  /**
   * User ID (child being assigned)
   * @example "507f191e810c19729de860ea"
   */
  @ApiProperty({
    description: 'User ID (child)',
    example: '507f191e810c19729de860ea',
    required: true,
  })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'Invalid user ID format' })
  userId: string;

  /**
   * Initial progress status
   * @default "notStarted"
   */
  @ApiPropertyOptional({
    description: 'Initial status',
    enum: TaskProgressStatus,
    example: TaskProgressStatus.NOT_STARTED,
  })
  @IsOptional()
  @IsEnum(TaskProgressStatus, {
    message: 'Status must be one of: notStarted, inProgress, completed',
  })
  status?: TaskProgressStatus;
}

/**
 * DTO for updating task progress status
 * Used when child starts or completes a task
 *
 * @example
 * {
 *   "taskId": "507f1f77bcf86cd799439011",
 *   "status": "inProgress",
 *   "note": "Starting this task now!"
 * }
 */
export class UpdateTaskProgressDto {
  /**
   * Task ID from route params
   * @example "507f1f77bcf86cd799439011"
   */
  @ApiProperty({
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Task ID is required' })
  @IsString({ message: 'Task ID must be a string' })
  taskId: string;

  /**
   * New progress status
   * @example "inProgress"
   */
  @ApiProperty({
    description: 'New status',
    enum: TaskProgressStatus,
    example: TaskProgressStatus.IN_PROGRESS,
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(TaskProgressStatus, {
    message: 'Status must be one of: notStarted, inProgress, completed',
  })
  status: TaskProgressStatus;

  /**
   * Optional note or comment from the child
   * @example "Starting this task now!"
   */
  @ApiPropertyOptional({
    description: 'Optional note',
    example: 'Starting this task now!',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  @MaxLength(500, { message: 'Note cannot exceed 500 characters' })
  note?: string;
}

/**
 * DTO for marking a subtask as complete
 * Used when child completes an individual subtask
 *
 * @example
 * {
 *   "taskId": "507f1f77bcf86cd799439011",
 *   "subtaskIndex": "2"
 * }
 */
export class CompleteSubtaskDto {
  /**
   * Task ID from route params
   * @example "507f1f77bcf86cd799439011"
   */
  @ApiProperty({
    description: 'Task ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Task ID is required' })
  @IsString({ message: 'Task ID must be a string' })
  taskId: string;

  /**
   * Subtask index from route params (0-based)
   * @example "2"
   */
  @ApiProperty({
    description: 'Subtask index (0-based)',
    example: '2',
  })
  @IsNotEmpty({ message: 'Subtask index is required' })
  @IsString({ message: 'Subtask index must be a string' })
  subtaskIndex: string;
}

/**
 * DTO for querying progress with filters
 * Used for optional query parameters
 *
 * @example
 * {
 *   "status": "inProgress",
 *   "taskType": "collaborative"
 * }
 */
export class QueryTaskProgressDto {
  /**
   * Filter by status
   * @example "inProgress"
   */
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: TaskProgressStatus,
    example: TaskProgressStatus.IN_PROGRESS,
  })
  @IsOptional()
  @IsEnum(TaskProgressStatus, {
    message: 'Status must be one of: notStarted, inProgress, completed',
  })
  status?: TaskProgressStatus;

  /**
   * Filter by task type
   * @example "collaborative"
   */
  @ApiPropertyOptional({
    description: 'Filter by task type',
    enum: ['personal', 'singleAssignment', 'collaborative'],
    example: 'collaborative',
  })
  @IsOptional()
  @IsString({ message: 'Task type must be a string' })
  taskType?: string;
}

/**
 * DTO for getting child's tasks progress
 * Combines params and query validation
 */
export class GetChildTasksProgressDto {
  /**
   * Child user ID from route params
   * @example "507f191e810c19729de860ea"
   */
  @ApiProperty({
    description: 'Child user ID',
    example: '507f191e810c19729de860ea',
  })
  @IsNotEmpty({ message: 'Child ID is required' })
  @IsMongoId({ message: 'Invalid child ID format' })
  childId: string;

  /**
   * Optional query parameters
   */
  @ApiPropertyOptional()
  @IsOptional()
  query?: QueryTaskProgressDto;
}
