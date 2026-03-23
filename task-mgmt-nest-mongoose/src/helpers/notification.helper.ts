/**
 * Global Notification Helper
 *
 * 📬 GENERIC NOTIFICATION SYSTEM - GLOBAL HELPER
 *
 * This is the equivalent of the old enqueueWebNotification function
 * from the Express.js notification.service.js
 *
 * Usage:
 * ```typescript
 * // Import from anywhere in the application
 * import { enqueueNotification, sendNotification } from './helpers/notification.helper';
 *
 * // Example 1: Send notification when user writes a blog
 * await enqueueNotification({
 *   title: 'New Blog Published',
 *   message: `${userName} published a new blog: ${blogTitle}`,
 *   senderId: userId,
 *   receiverId: followerId,
 *   receiverRole: null,
 *   type: NotificationType.CUSTOM,
 *   entityType: 'blog',
 *   entityId: blogId,
 *   linkFor: 'blog',
 *   linkId: blogId,
 * });
 *
 * // Example 2: Send notification to admin
 * await enqueueNotification({
 *   title: 'New Blog for Review',
 *   message: `${userName} published a blog that needs review`,
 *   senderId: userId,
 *   receiverId: null,
 *   receiverRole: 'admin',
 *   type: NotificationType.SYSTEM,
 *   entityType: 'blog',
 *   entityId: blogId,
 * });
 *
 * // Example 3: Task assignment notification
 * await enqueueNotification({
 *   title: 'New Task Assigned',
 *   message: 'You have been assigned a new task',
 *   senderId: managerId,
 *   receiverId: assigneeId,
 *   receiverRole: null,
 *   type: NotificationType.ASSIGNMENT,
 *   entityType: 'task',
 *   entityId: taskId,
 *   linkFor: 'task',
 *   linkId: taskId,
 * });
 *
 * // Example 4: Broadcast to all admins
 * await broadcastToRole({
 *   title: 'System Maintenance',
 *   message: 'System will be down for maintenance at 2 AM',
 *   senderId: systemUserId,
 *   receiverRole: 'admin',
 *   type: NotificationType.SYSTEM,
 * });
 * ```
 *
 * Compatible with Express.js enqueueWebNotification
 */

import { NotificationType } from '../modules/notification.module/notification.schema';
import { Types } from 'mongoose';

// Lazy import to avoid circular dependencies
let notificationServiceInstance: any = null;

/**
 * Set notification service instance
 *
 * Call this in your main.ts or app.module.ts
 *
 * @param instance - NotificationService instance
 */
export function setNotificationService(instance: any): void {
  notificationServiceInstance = instance;
  console.log('✅ Notification service initialized');
}

/**
 * Enqueue notification (async via BullMQ)
 *
 * This is the main function to send notifications from anywhere in the app
 *
 * @param title - Notification title
 * @param senderId - User ID who sent the notification
 * @param receiverId - User ID who will receive (null for role-based)
 * @param receiverRole - Role to send to (e.g., 'admin', 'user', 'mentor')
 * @param type - Notification type (task, system, custom, etc.)
 * @param entityType - Entity type (task, blog, chat, etc.)
 * @param entityId - Entity ID (task ID, blog ID, etc.)
 * @param message - Notification message (optional)
 * @param linkFor - Link target (e.g., 'task', 'blog', 'profile')
 * @param linkId - Link target ID
 * @param delay - Delay in milliseconds (optional)
 *
 * @example
 * ```typescript
 * // Send notification to specific user
 * await enqueueNotification({
 *   title: 'New Task',
 *   senderId: '123',
 *   receiverId: '456',
 *   type: NotificationType.ASSIGNMENT,
 *   entityType: 'task',
 *   entityId: 'task789',
 * });
 *
 * // Send notification to admin role
 * await enqueueNotification({
 *   title: 'System Alert',
 *   senderId: '123',
 *   receiverRole: 'admin',
 *   type: NotificationType.SYSTEM,
 * });
 * ```
 */
export async function enqueueNotification({
  title,
  senderId,
  receiverId,
  receiverRole,
  type,
  entityType,
  entityId,
  message,
  linkFor,
  linkId,
  delay,
}: {
  title: string;
  senderId: string | Types.ObjectId;
  receiverId?: string | Types.ObjectId | null;
  receiverRole?: string | null;
  type: NotificationType | string;
  entityType: string;
  entityId: string | Types.ObjectId;
  message?: string;
  linkFor?: string | null;
  linkId?: string | Types.ObjectId | null;
  delay?: number;
}): Promise<void> {
  if (!notificationServiceInstance) {
    console.warn('⚠️ Notification service not initialized. Call setNotificationService() first.');
    console.warn('Notification data:', { title, receiverId, receiverRole, type });
    return;
  }

  try {
    await notificationServiceInstance.enqueueNotification({
      title,
      senderId: senderId.toString(),
      receiverId: receiverId ? receiverId.toString() : null,
      receiverRole,
      type,
      entityType,
      entityId: entityId.toString(),
      message,
      linkFor,
      linkId: linkId ? linkId.toString() : null,
      delay,
    });

    console.log(`📬 Notification enqueued: ${title} to ${receiverId || receiverRole}`);
  } catch (error) {
    console.error(`❌ Failed to enqueue notification: ${error.message}`);
    // Don't throw - notification failure shouldn't break main flow
  }
}

/**
 * Send notification (synchronous)
 *
 * Sends notification immediately (not queued)
 *
 * @param title - Notification title
 * @param senderId - User ID who sent the notification
 * @param receiverId - User ID who will receive
 * @param type - Notification type
 * @param entityType - Entity type
 * @param entityId - Entity ID
 * @param message - Notification message
 * @param linkFor - Link target
 * @param linkId - Link target ID
 */
export async function sendNotification({
  title,
  senderId,
  receiverId,
  type,
  entityType,
  entityId,
  message,
  linkFor,
  linkId,
}: {
  title: string;
  senderId: string | Types.ObjectId;
  receiverId: string | Types.ObjectId;
  type: NotificationType | string;
  entityType: string;
  entityId: string | Types.ObjectId;
  message?: string;
  linkFor?: string | null;
  linkId?: string | Types.ObjectId | null;
}): Promise<void> {
  if (!notificationServiceInstance) {
    console.warn('⚠️ Notification service not initialized.');
    return;
  }

  try {
    await notificationServiceInstance.sendNotification({
      title,
      senderId: senderId.toString(),
      receiverId: receiverId.toString(),
      type,
      entityType,
      entityId: entityId.toString(),
      message,
      linkFor,
      linkId: linkId ? linkId.toString() : null,
    });

    console.log(`✅ Notification sent: ${title} to ${receiverId}`);
  } catch (error) {
    console.error(`❌ Failed to send notification: ${error.message}`);
    // Don't throw - notification failure shouldn't break main flow
  }
}

/**
 * Broadcast notification to role
 *
 * Sends notification to all users with specific role
 *
 * @param title - Notification title
 * @param senderId - User ID who sent the notification
 * @param receiverRole - Role to broadcast to (e.g., 'admin', 'user')
 * @param type - Notification type
 * @param message - Notification message
 */
export async function broadcastToRole({
  title,
  senderId,
  receiverRole,
  type,
  message,
}: {
  title: string;
  senderId: string | Types.ObjectId;
  receiverRole: string;
  type: NotificationType | string;
  message?: string;
}): Promise<void> {
  if (!notificationServiceInstance) {
    console.warn('⚠️ Notification service not initialized.');
    return;
  }

  try {
    await notificationServiceInstance.broadcastNotification({
      title,
      senderId: senderId.toString(),
      broadcastToRole: receiverRole,
      type,
      message,
    });

    console.log(`📢 Broadcasted to role ${receiverRole}: ${title}`);
  } catch (error) {
    console.error(`❌ Failed to broadcast notification: ${error.message}`);
  }
}

/**
 * Broadcast notification to all users
 *
 * Sends notification to all users in the system
 *
 * @param title - Notification title
 * @param senderId - User ID who sent the notification
 * @param type - Notification type
 * @param message - Notification message
 */
export async function broadcastToAll({
  title,
  senderId,
  type,
  message,
}: {
  title: string;
  senderId: string | Types.ObjectId;
  type: NotificationType | string;
  message?: string;
}): Promise<void> {
  if (!notificationServiceInstance) {
    console.warn('⚠️ Notification service not initialized.');
    return;
  }

  try {
    await notificationServiceInstance.broadcastNotification({
      title,
      senderId: senderId.toString(),
      broadcastToAll: true,
      type,
      message,
    });

    console.log(`📢 Broadcasted to all users: ${title}`);
  } catch (error) {
    console.error(`❌ Failed to broadcast to all: ${error.message}`);
  }
}
