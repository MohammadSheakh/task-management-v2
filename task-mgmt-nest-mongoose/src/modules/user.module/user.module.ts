import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserController } from './user/user.controller';
import { UserService } from './user/user.service';
import { User, UserSchema } from './user/user.schema';

import { UserProfileController } from './userProfile/userProfile.controller';
import { UserProfileService } from './userProfile/userProfile.service';
import { UserProfile, UserProfileSchema } from './userProfile/userProfile.schema';

import { UserDevicesController } from './userDevices/userDevices.controller';
import { UserDevicesService } from './userDevices/userDevices.service';
import { UserDevices, UserDevicesSchema } from './userDevices/userDevices.schema';

import { OAuthAccountController } from './oauthAccount/oauthAccount.controller';
import { OAuthAccountService } from './oauthAccount/oauthAccount.service';
import { OAuthAccount, OAuthAccountSchema } from './oauthAccount/oauthAccount.schema';

import { RedisModule } from '../../../helpers/redis/redis.module';

/**
 * User Module
 *
 * Includes:
 * - User (core entity)
 * - UserProfile (extended profile information)
 * - UserDevices (FCM tokens, device tracking)
 * - OAuthAccount (Google/Apple account linking)
 */
@Module({
  imports: [
    // MongoDB - User collection
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    
    // MongoDB - UserProfile collection
    MongooseModule.forFeature([{ name: UserProfile.name, schema: UserProfileSchema }]),
    
    // MongoDB - UserDevices collection
    MongooseModule.forFeature([{ name: UserDevices.name, schema: UserDevicesSchema }]),
    
    // MongoDB - OAuthAccount collection
    MongooseModule.forFeature([{ name: OAuthAccount.name, schema: OAuthAccountSchema }]),

    // Redis Module (for caching)
    RedisModule,
  ],
  controllers: [UserController, UserProfileController, UserDevicesController, OAuthAccountController],
  providers: [UserService, UserProfileService, UserDevicesService, OAuthAccountService],
  exports: [UserService, UserProfileService, UserDevicesService, OAuthAccountService],
})
export class UserModule {}
