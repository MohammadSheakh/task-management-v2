import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Redis } from 'ioredis';

import { GenericService } from '../../../common/generic/generic.service';
import { Task, TaskDocument, TaskStatus } from './task.schema';
import { REDIS_CLIENT } from '../../../helpers/redis/redis.module';

/**
 * Task Service
 * 
 * Manages task operations
 * Extends GenericService for CRUD operations
 */
@Injectable()
export class TaskService extends GenericService<typeof Task, TaskDocument> {
  private readonly TASK_CACHE_PREFIX = 'task:';
  private readonly TASK_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectModel(Task.name) taskModel: Model<TaskDocument>,
    @Inject(REDIS_CLIENT) private redisClient: Redis,
  ) {
    super(taskModel);
  }

  /**
   * Get tasks by user ID
   */
  async getTasksByUserId(
    userId: string,
    status?: TaskStatus,
  ): Promise<TaskDocument[]> {
    const filters: any = {
      $or: [
        { ownerUserId: new Types.ObjectId(userId) },
        { assignedUserIds: new Types.ObjectId(userId) },
      ],
      isDeleted: false,
    };

    if (status) {
      filters.status = status;
    }

    return this.findAll(filters);
  }

  /**
   * Get daily progress for user
   */
  async getDailyProgress(
    userId: string,
    date: Date,
  ): Promise<{
    date: string;
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    progressPercentage: number;
    tasks: any[];
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const filters = {
      ownerUserId: new Types.ObjectId(userId),
      startTime: { $gte: startOfDay, $lte: endOfDay },
      isDeleted: false,
    };

    const tasks = await this.findAll(filters);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === TaskStatus.COMPLETED).length;
    const pending = tasks.filter(t => t.status === TaskStatus.PENDING).length;
    const inProgress = tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;

    return {
      date: date.toISOString().split('T')[0],
      total,
      completed,
      pending,
      inProgress,
      progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      tasks: tasks.map(t => ({
        _id: t._id,
        title: t.title,
        status: t.status,
        startTime: t.startTime,
        taskType: t.taskType,
        subtasks: t.subtasks?.map(s => ({
          title: s.title,
          isCompleted: s.isCompleted,
        })),
      })),
    };
  }

  /**
   * Get task statistics for user
   */
  async getTaskStatistics(userId: string): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  }> {
    const filters = {
      $or: [
        { ownerUserId: new Types.ObjectId(userId) },
        { assignedUserIds: new Types.ObjectId(userId) },
      ],
      isDeleted: false,
    };

    const [total, pending, inProgress, completed] = await Promise.all([
      this.count(filters),
      this.count({ ...filters, status: TaskStatus.PENDING }),
      this.count({ ...filters, status: TaskStatus.IN_PROGRESS }),
      this.count({ ...filters, status: TaskStatus.COMPLETED }),
    ]);

    return { total, pending, inProgress, completed };
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
  ): Promise<TaskDocument | null> {
    const update: any = { status };

    if (status === TaskStatus.COMPLETED) {
      update.completedTime = new Date();
    }

    const result = await this.updateById(taskId, update);

    // Invalidate cache
    if (result) {
      await this.invalidateCache(taskId);
    }

    return result;
  }

  /**
   * Add subtask to task
   */
  async addSubtask(
    taskId: string,
    title: string,
    order: number,
  ): Promise<TaskDocument | null> {
    const task = await this.findById(taskId);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (!task.subtasks) {
      task.subtasks = [];
    }

    task.subtasks.push({ title, isCompleted: false, order });

    const result = await this.updateById(taskId, {
      subtasks: task.subtasks,
    } as any);

    // Invalidate cache
    if (result) {
      await this.invalidateCache(taskId);
    }

    return result;
  }

  /**
   * Update subtask status
   */
  async updateSubtaskStatus(
    taskId: string,
    subtaskIndex: number,
    isCompleted: boolean,
  ): Promise<TaskDocument | null> {
    const task = await this.findById(taskId);

    if (!task || !task.subtasks || subtaskIndex >= task.subtasks.length) {
      throw new NotFoundException('Subtask not found');
    }

    task.subtasks[subtaskIndex].isCompleted = isCompleted;
    if (isCompleted) {
      task.subtasks[subtaskIndex].completedAt = new Date();
    }

    const result = await this.updateById(taskId, {
      subtasks: task.subtasks,
    } as any);

    // Invalidate cache
    if (result) {
      await this.invalidateCache(taskId);
    }

    return result;
  }

  /**
   * Invalidate task cache
   */
  async invalidateCache(taskId: string): Promise<void> {
    const cacheKey = `${this.TASK_CACHE_PREFIX}${taskId}`;
    await this.redisClient.del(cacheKey);
  }
}
