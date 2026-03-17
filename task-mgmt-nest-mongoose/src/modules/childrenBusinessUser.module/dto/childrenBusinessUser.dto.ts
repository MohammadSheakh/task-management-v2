import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ChildrenBusinessUserStatus } from '../childrenBusinessUser.schema';

/**
 * Create Child Account DTO
 */
export class CreateChildAccountDto {
  @ApiProperty({ example: 'child_user_id', description: 'Child user ID' })
  @IsString()
  @IsNotEmpty()
  childUserId: string;
}

/**
 * Remove Child DTO
 */
export class RemoveChildDto {
  @ApiProperty({ example: 'No longer needed', description: 'Removal reason', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

/**
 * Set Secondary User DTO
 */
export class SetSecondaryUserDto {
  @ApiProperty({ example: true, description: 'Is Secondary User' })
  @IsNotEmpty()
  isSecondaryUser: boolean;
}

/**
 * Get Children Query DTO
 */
export class GetChildrenQueryDto {
  @ApiProperty({ example: 'active', description: 'Filter by status', enum: ChildrenBusinessUserStatus, required: false })
  @IsEnum(ChildrenBusinessUserStatus)
  @IsOptional()
  status?: ChildrenBusinessUserStatus;
}
