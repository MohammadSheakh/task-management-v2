import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../../user.module/user/user.schema';
import { Task, TaskSchema } from '../../task.module/task/task.schema';
import { AdminAnalyticsController } from './controllers/adminAnalytics.controller';
import { AdminAnalyticsService } from './services/adminAnalytics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
  exports: [AdminAnalyticsService],
})
export class AdminAnalyticsModule {}
