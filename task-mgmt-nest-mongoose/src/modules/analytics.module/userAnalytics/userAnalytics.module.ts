import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../user.module/user/user.schema';
import { Task, TaskSchema } from '../../task.module/task/task.schema';
import { UserAnalyticsController } from './controllers/userAnalytics.controller';
import { UserAnalyticsService } from './services/userAnalytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  controllers: [UserAnalyticsController],
  providers: [UserAnalyticsService],
  exports: [UserAnalyticsService],
})
export class UserAnalyticsModule {}
