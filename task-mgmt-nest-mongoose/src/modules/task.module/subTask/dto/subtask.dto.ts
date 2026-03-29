import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsNumber, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

/**
 * Create SubTask DTO
 */
export class CreateSubTaskDto {
  @ApiProperty({ description: 'Parent task ID' })
  @IsMongoId()
  @IsNotEmpty()
  taskId: string;

  @ApiProperty({ description: 'Subtask title' })
  @IsString()
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ description: 'Order for sorting', required: false })
  @IsNumber()
  @IsOptional()
  order?: number = 0;
}

/**
 * Update SubTask DTO
 */
export class UpdateSubTaskDto {
  @ApiProperty({ description: 'Subtask title', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ description: 'Is completed flag', required: false })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;

  @ApiProperty({ description: 'Order for sorting', required: false })
  @IsNumber()
  @IsOptional()
  order?: number;
}

/**
 * Toggle SubTask Status DTO
 */
export class ToggleSubTaskStatusDto {
  @ApiProperty({ description: 'Is completed flag' })
  @IsBoolean()
  @IsNotEmpty()
  isCompleted: boolean;
}

/**
 * Bulk SubTask Operation DTO
 */
export class BulkSubTaskDto {
  @ApiProperty({ description: 'Subtasks to create/update' })
  @IsNotEmpty()
  subtasks: Array<{
    title: string;
    isCompleted?: boolean;
    order?: number;
  }>;
}
