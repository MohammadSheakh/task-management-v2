import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from '../../task.module/task/task.schema';
import { TaskAnalyticsController } from './controllers/taskAnalytics.controller';
import { TaskAnalyticsService } from './services/taskAnalytics.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Task.name, schema: TaskSchema }])],
  controllers: [TaskAnalyticsController],
  providers: [TaskAnalyticsService],
  exports: [TaskAnalyticsService],
})
export class TaskAnalyticsModule {}
