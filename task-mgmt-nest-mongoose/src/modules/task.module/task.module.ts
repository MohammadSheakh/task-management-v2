import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TaskController } from './task/task.controller';
import { TaskService } from './task/task.service';
import { Task, TaskSchema } from './task/task.schema';

import { SubTaskController } from './subTask/subTask.controller';
import { SubTaskService } from './subTask/subTask.service';
import { SubTask, SubTaskSchema } from './subTask/subTask.schema';

import { RedisModule } from '../../../helpers/redis/redis.module';
import { SocketModule } from '../../socket.gateway/socket.module';

/**
 * Task Module (Parent Module)
 *
 * 📚 TASK MANAGEMENT MODULE WITH SUBTASKS
 *
 * Following NestJS best practice for related modules:
 * - Task and SubTask are grouped under parent module
 * - SubTask is a separate collection (not embedded)
 * - See: SUBTASK_MIGRATION_TO_SEPARATE_TABLE-17-03-26.md
 *
 * Includes:
 * - Task (core entity)
 * - SubTask (separate collection with virtual populate)
 *
 * Compatible with Express.js task.module/
 */
@Module({
  imports: [
    // MongoDB Collections
    MongooseModule.forFeature([
      {
        name: Task.name,
        schema: TaskSchema,
      },
      {
        name: SubTask.name,
        schema: SubTaskSchema,
      },
    ]),

    // Redis Module (for caching)
    RedisModule,

    // Socket Module (for real-time updates)
    SocketModule,
  ],
  controllers: [
    TaskController,
    SubTaskController,
  ],
  providers: [
    TaskService,
    SubTaskService,
  ],
  exports: [
    TaskService,
    SubTaskService,
    MongooseModule.forFeature([
      {
        name: Task.name,
        schema: TaskSchema,
      },
      {
        name: SubTask.name,
        schema: SubTaskSchema,
      },
    ]),
  ],
})
export class TaskModule {}
