import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskProgress, TaskProgressSchema } from './taskProgress.schema';
import { TaskProgressController } from './taskProgress.controller';
import { TaskProgressService } from './taskProgress.service';
import { TaskModule } from '../task/task.module';
import { SubTaskModule } from '../subTask/subTask.module';
import { UserModule } from '../../user.module/user/user.module';
import { SocketModule } from '../../socket.gateway/socket.module';
import { NotificationModule } from '../../notification.module/notification.module';

/**
 * TaskProgress Module
 * Tracks each child's independent progress on collaborative tasks
 *
 * Features:
 * - Per-child progress tracking
 * - Subtask completion tracking
 * - Redis caching
 * - Real-time Socket.IO notifications
 * - Parent task auto-sync
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 *
 * @example
 * // Import in app.module.ts
 * @Module({
 *   imports: [
 *     TaskProgressModule,
 *   ]
 * })
 *
 * // Or import parent task.module which includes TaskProgress
 * @Module({
 *   imports: [
 *     TaskModule, // Parent module includes TaskProgress
 *   ]
 * })
 */
@Module({
  imports: [
    // Register TaskProgress model
    MongooseModule.forFeature([
      {
        name: TaskProgress.name,
        schema: TaskProgressSchema,
      },
    ]),

    // Dependencies
    TaskModule, // For task model access
    SubTaskModule, // For subtask operations
    UserModule, // For user lookups
    SocketModule, // For real-time notifications
    NotificationModule, // For web notifications
  ],
  controllers: [TaskProgressController],
  providers: [TaskProgressService],
  exports: [
    MongooseModule.forFeature([
      {
        name: TaskProgress.name,
        schema: TaskProgressSchema,
      },
    ]),
    TaskProgressService,
  ],
})
export class TaskProgressModule {}
