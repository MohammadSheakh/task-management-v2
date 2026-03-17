import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, ValidateNested, IsArray, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { TaskType, TaskPriority, TaskStatus } from '../task.schema';

/**
 * SubTask DTO
 */
export class SubTaskDto {
  @ApiProperty({ example: 'Complete chapter 5', description: 'Subtask title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: false, description: 'Is completed', required: false })
  @IsOptional()
  isCompleted?: boolean;

  @ApiProperty({ example: 1, description: 'Order', required: false })
  @IsOptional()
  order?: number;
}

/**
 * Create Task DTO
 */
export class CreateTaskDto {
  @ApiProperty({ example: 'Complete Math Homework', description: 'Task title' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'Title is required' })
  title: string;

  @ApiProperty({ example: 'Finish exercises 1-10', description: 'Task description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'personal', description: 'Task type', enum: TaskType })
  @IsEnum(TaskType, { message: 'Task type must be personal, singleAssignment, or collaborative' })
  @IsNotEmpty()
  taskType: TaskType;

  @ApiProperty({ example: 'high', description: 'Task priority', enum: TaskPriority, required: false })
  @IsEnum(TaskPriority, { message: 'Priority must be low, medium, or high' })
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ example: '10:30 AM', description: 'Scheduled time', required: false })
  @IsString()
  @IsOptional()
  scheduledTime?: string;

  @ApiProperty({ example: '2026-03-17T10:00:00.000Z', description: 'Start time' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2026-03-17T23:59:59.000Z', description: 'Due date', required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({ example: ['user_123'], description: 'Assigned user IDs', required: false, isArray: true })
  @IsArray()
  @IsOptional()
  assignedUserIds?: string[];

  @ApiProperty({ example: [{ title: 'Step 1', order: 1 }], description: 'Subtasks', required: false, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubTaskDto)
  @IsOptional()
  subtasks?: SubTaskDto[];
}

/**
 * Update Task DTO
 */
export class UpdateTaskDto {
  @ApiProperty({ example: 'Updated Title', description: 'Task title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Updated description', description: 'Task description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'high', description: 'Task priority', enum: TaskPriority, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ example: 'inProgress', description: 'Task status', enum: TaskStatus, required: false })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: '2026-03-18T23:59:59.000Z', description: 'Due date', required: false })
  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
