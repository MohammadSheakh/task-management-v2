import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsMongoId } from 'class-validator';

/**
 * User Role Data Type Enum
 */
export enum UserRoleDataType {
  VERIFIED = 'verified',
  PENDING = 'pending',
  REJECTED = 'rejected',
}

/**
 * DTO for creating user role data
 */
export class CreateUserRoleDataDto {
  @ApiProperty({ description: 'User ID', example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'Invalid user ID format' })
  userId: string;

  @ApiProperty({
    description: 'Role data type',
    enum: UserRoleDataType,
    example: UserRoleDataType.VERIFIED,
  })
  @IsNotEmpty({ message: 'Role data type is required' })
  @IsEnum(UserRoleDataType, { message: 'Invalid role data type' })
  type: UserRoleDataType;

  @ApiProperty({ description: 'Role data content', example: 'Verified user data' })
  @IsNotEmpty({ message: 'Data is required' })
  @IsString({ message: 'Data must be a string' })
  data: string;
}

/**
 * DTO for updating user role data
 */
export class UpdateUserRoleDataDto {
  @ApiPropertyOptional({ description: 'Role data content' })
  @IsString()
  data?: string;

  @ApiPropertyOptional({
    description: 'Role data type',
    enum: UserRoleDataType,
  })
  @IsEnum(UserRoleDataType)
  type?: UserRoleDataType;
}
