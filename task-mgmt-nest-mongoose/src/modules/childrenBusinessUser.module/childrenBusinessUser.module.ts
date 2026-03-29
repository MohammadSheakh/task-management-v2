import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChildrenBusinessUserController } from './childrenBusinessUser.controller';
import { ChildrenBusinessUserService } from './childrenBusinessUser.service';
import { ChildrenBusinessUser, ChildrenBusinessUserSchema } from './childrenBusinessUser.schema';

/**
 * ChildrenBusinessUser Module
 *
 * Manages parent-child relationships for task assignment
 */
@Module({
  imports: [
    // MongoDB - ChildrenBusinessUser collection
    MongooseModule.forFeature([{ 
      name: ChildrenBusinessUser.name, 
      schema: ChildrenBusinessUserSchema 
    }]),
  ],
  controllers: [ChildrenBusinessUserController],
  providers: [ChildrenBusinessUserService],
  exports: [ChildrenBusinessUserService],
})
export class ChildrenBusinessUserModule {}
