import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Redis } from "ioredis";

import { GenericService } from "../../../common/generic/generic.service";
import { Task, TaskDocument, TaskStatus } from "./task.schema";
import { REDIS_CLIENT } from "../../../helpers/redis/redis.module";

import { SubTaskService } from "../subTask/subTask.service";

/**
 * Task Service
 *
 * Manages task operations
 * Extends GenericService for CRUD operations
 * Delegates subtask operations to SubTaskService (separate collection)
 */
@Injectable()
export class TaskService extends GenericService<typeof Task, TaskDocument> {
  private readonly TASK_CACHE_PREFIX = "task:";
  private readonly TASK_CACHE_TTL = 300; // 5 minutes

  constructor(
    @InjectModel(Task.name) taskModel: Model<TaskDocument>,
    @Inject(REDIS_CLIENT) private redisClient: Redis,

    private subTaskService: SubTaskService,
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

    const tasks = await this.findAll(filters, [], { populate: "subtasks" });

    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED,
    ).length;
    const pending = tasks.filter((t) => t.status === TaskStatus.PENDING).length;
    const inProgress = tasks.filter(
      (t) => t.status === TaskStatus.IN_PROGRESS,
    ).length;

    return {
      date: date.toISOString().split("T")[0],
      total,
      completed,
      pending,
      inProgress,
      progressPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      tasks: tasks.map((t) => ({
        _id: t._id,
        title: t.title,
        status: t.status,
        startTime: t.startTime,
        taskType: t.taskType,

        subtasks: (t.subtasks || []).map((s) => ({
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
   * Delegates to SubTaskService (separate collection)
   */
  async addSubtask(
    taskId: string,
    title: string,
    order: number,

    userId: string,
  ): Promise<any> {
    // Delegate to SubTaskService - subtasks are now in separate collection
    return await this.subTaskService.createSubTask(
      { taskId, title, order },
      userId,
    );
  }

  /**
   * Update subtask status

   * Delegates to SubTaskService (separate collection)

   */
  async updateSubtaskStatus(
    taskId: string,
    subtaskIndex: number,
    isCompleted: boolean,

    userId: string,
  ): Promise<any> {
    // Get subtask by taskId and index
    const subtasks = await this.subTaskService.getSubTasksByTaskId(taskId);
    const subtask = subtasks[subtaskIndex];

    if (!subtask) {
      throw new NotFoundException("Subtask not found");
    }

    // Delegate to SubTaskService
    return await this.subTaskService.toggleSubTaskStatus(
      subtask._id.toString(),
      isCompleted,
      userId,
    );
  }

  /**
   * Invalidate task cache
   */
  async invalidateCache(taskId: string): Promise<void> {
    const cacheKey = `${this.TASK_CACHE_PREFIX}${taskId}`;
    await this.redisClient.del(cacheKey);
  }
}
