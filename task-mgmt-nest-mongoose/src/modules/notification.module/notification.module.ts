import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';

import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { Notification, NotificationSchema } from './notification.schema';

import { RedisModule } from '../../helpers/redis/redis.module';
import { SocketModule } from '../socket.gateway/socket.module';
import { BULLMQ_NOTIFICATION_QUEUE, QUEUE_NAMES } from '../../helpers/bullmq/bullmq.constants';

/**
 * Notification Module
 *
 * 📚 GENERIC NOTIFICATION SYSTEM
 *
 * Features:
 * - Generic notifications (not coupled to any specific module)
 * - Real-time Socket.IO delivery
 * - Async BullMQ processing
 * - Redis caching for unread counts
 * - Broadcast to users/roles
 *
 * Usage from other modules:
 * ```typescript
 * // In any module (task, chat, subscription, etc.)
 * constructor(private notificationService: NotificationService) {}
 *
 * // Send notification
 * await this.notificationService.sendNotification({
 *   title: 'New Task Assigned',
 *   senderId: userId,
 *   receiverId: assigneeId,
 *   type: NotificationType.ASSIGNMENT,
 *   entityType: 'task',
 *   entityId: taskId,
 * });
 *
 * // Enqueue notification (async)
 * await this.notificationService.enqueueNotification({
 *   title: 'Reminder',
 *   receiverId: userId,
 *   type: NotificationType.REMINDER,
 * });
 * ```
 *
 * Compatible with Express.js notification.module.js
 */
@Module({
  imports: [
    // MongoDB - Notification collection
    MongooseModule.forFeature([{
      name: Notification.name,
      schema: NotificationSchema,
    }]),

    // Redis Module (for caching)
    RedisModule,

    // Socket Module (for real-time notifications)
    SocketModule,

    // BullMQ Module (for async processing)
    BullModule.registerQueue({
      name: QUEUE_NAMES.NOTIFICATION,
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,

    // BullMQ Queue Provider
    {
      provide: BULLMQ_NOTIFICATION_QUEUE,
      useFactory: () => {
        return BullModule.getQueue(QUEUE_NAMES.NOTIFICATION);
      },
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
