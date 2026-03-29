import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, IsOptional, IsMongoId } from 'class-validator';

/**
 * OAuth Provider Enum
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
}

/**
 * DTO for creating OAuth account
 */
export class CreateOAuthAccountDto {
  @ApiProperty({ description: 'User ID', example: '507f1f77bcf86cd799439011' })
  @IsNotEmpty({ message: 'User ID is required' })
  @IsMongoId({ message: 'Invalid user ID format' })
  userId: string;

  @ApiProperty({
    description: 'OAuth provider',
    enum: OAuthProvider,
    example: OAuthProvider.GOOGLE,
  })
  @IsNotEmpty({ message: 'Provider is required' })
  @IsEnum(OAuthProvider, { message: 'Invalid provider' })
  provider: OAuthProvider;

  @ApiProperty({ description: 'Provider user ID', example: 'google_123456' })
  @IsNotEmpty({ message: 'Provider user ID is required' })
  @IsString({ message: 'Provider user ID must be a string' })
  providerUserId: string;

  @ApiProperty({ description: 'Access token' })
  @IsNotEmpty({ message: 'Access token is required' })
  @IsString()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'Email from provider' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

/**
 * DTO for updating OAuth account
 */
export class UpdateOAuthAccountDto {
  @ApiPropertyOptional({ description: 'Access token' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional({ description: 'Refresh token' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
