import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { AppleStrategy } from './strategies/apple.strategy';
import { OtpService } from '../otp/otp.service';

import { User, UserSchema } from '../../user.module/user/user.schema';
import { RedisModule } from '../../../helpers/redis/redis.module';

/**
 * Auth Module
 * 
 * 📚 EXPRESS → NESTJS TRANSITION
 * 
 * Express Pattern:
 * - Manual middleware registration
 * - Direct service imports
 * - No module encapsulation
 * 
 * NestJS Pattern:
 * - @Module() decorator
 * - Explicit imports/exports
 * - Dependency injection
 * - Clear boundaries
 * 
 * Key Features:
 * ✅ JWT authentication
 * ✅ Local (email/password) authentication
 * ✅ Redis-based OTP (NOT MongoDB)
 * ✅ Token blacklisting
 * ✅ Rate limiting
 */
@Module({
  imports: [
    // JWT Module
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      signOptions: { expiresIn: '15m' },
    }),

    // Passport Module
    PassportModule,

    // MongoDB - User collection
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    // Redis Module (for OTP and token blacklist)
    RedisModule,

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 900000, // 15 minutes
        limit: 5, // 5 attempts
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    AppleStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
