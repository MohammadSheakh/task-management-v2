import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { SubTask, SubTaskDocument } from './subTask.schema';
import { Task, TaskDocument } from '../task/task.schema';
import { CreateSubTaskDto, UpdateSubTaskDto } from './dto/subtask.dto';
import { SocketGateway } from '../../socket.gateway/socket.gateway';

/**
 * SubTask Service
 *
 * 📚 SUBTASK MANAGEMENT SERVICE
 *
 * Features:
 * - Create subtasks (separate collection)
 * - Update subtasks
 * - Delete subtasks (soft delete)
 * - Toggle completion status
 * - Bulk operations
 * - Get subtasks by task ID
 * - Completion statistics
 * - Real-time updates via Socket.IO
 *
 * Compatible with Express.js subTask.service.ts
 */
@Injectable()
export class SubTaskService {
  private readonly logger = new Logger(SubTaskService.name);

  constructor(
    @InjectModel(SubTask.name) private subTaskModel: Model<SubTaskDocument>,
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private socketGateway: SocketGateway,
  ) {}

  /**
   * Create SubTask
   */
  async createSubTask(dto: CreateSubTaskDto, createdById: string): Promise<SubTaskDocument> {
    // Verify task exists
    const task = await this.taskModel.findOne({
      _id: new Types.ObjectId(dto.taskId),
      isDeleted: false,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get max order for sorting
    const maxOrderSubTask = await this.subTaskModel.findOne(
      { taskId: new Types.ObjectId(dto.taskId), isDeleted: false },
      {},
      { sort: { order: -1 } },
    );

    const order = dto.order ?? (maxOrderSubTask ? maxOrderSubTask.order + 1 : 0);

    // Create subtask
    const subTask = await this.subTaskModel.create({
      taskId: new Types.ObjectId(dto.taskId),
      createdById: new Types.ObjectId(createdById),
      title: dto.title,
      isCompleted: false,
      order,
    });

    this.logger.log(`✅ SubTask created: ${subTask._id} for task ${dto.taskId}`);

    // Update task subtask counts
    await this.updateTaskSubTaskCounts(dto.taskId);

    // Emit real-time update
    await this.socketGateway.emitToRoom(dto.taskId, 'subtask-created', {
      _subTaskId: subTask._id.toString(),
      taskId: dto.taskId,
      title: subTask.title,
      isCompleted: false,
      order: subTask.order,
    });

    return subTask;
  }

  /**
   * Get SubTasks by Task ID
   */
  async getSubTasksByTaskId(taskId: string): Promise<SubTaskDocument[]> {
    const subTasks = await this.subTaskModel.find({
      taskId: new Types.ObjectId(taskId),
      isDeleted: false,
    }).sort({ order: 1 }).lean();

    return subTasks;
  }

  /**
   * Update SubTask
   */
  async updateSubTask(
    subTaskId: string,
    dto: UpdateSubTaskDto,
    userId: string,
  ): Promise<SubTaskDocument> {
    const subTask = await this.subTaskModel.findOne({
      _id: new Types.ObjectId(subTaskId),
      isDeleted: false,
    });

    if (!subTask) {
      throw new NotFoundException('SubTask not found');
    }

    // Verify ownership (only creator can update)
    if (subTask.createdById.toString() !== userId) {
      throw new BadRequestException('You can only update your own subtasks');
    }

    // Update fields
    if (dto.title !== undefined) subTask.title = dto.title;
    if (dto.isCompleted !== undefined) {
      subTask.isCompleted = dto.isCompleted;
      if (dto.isCompleted && !subTask.completedAt) {
        subTask.completedAt = new Date();
      } else if (!dto.isCompleted) {
        subTask.completedAt = undefined;
      }
    }
    if (dto.order !== undefined) subTask.order = dto.order;

    await subTask.save();

    this.logger.log(`✅ SubTask updated: ${subTaskId}`);

    // Update task subtask counts
    await this.updateTaskSubTaskCounts(subTask.taskId.toString());

    // Emit real-time update
    await this.socketGateway.emitToRoom(subTask.taskId.toString(), 'subtask-updated', {
      _subTaskId: subTaskId,
      taskId: subTask.taskId.toString(),
      title: subTask.title,
      isCompleted: subTask.isCompleted,
      order: subTask.order,
    });

    return subTask;
  }

  /**
   * Toggle SubTask Completion
   */
  async toggleSubTaskStatus(
    subTaskId: string,
    isCompleted: boolean,
    userId: string,
  ): Promise<SubTaskDocument> {
    return this.updateSubTask(subTaskId, { isCompleted }, userId);
  }

  /**
   * Delete SubTask (Soft Delete)
   */
  async deleteSubTask(subTaskId: string, userId: string): Promise<void> {
    const subTask = await this.subTaskModel.findOne({
      _id: new Types.ObjectId(subTaskId),
      isDeleted: false,
    });

    if (!subTask) {
      throw new NotFoundException('SubTask not found');
    }

    // Verify ownership
    if (subTask.createdById.toString() !== userId) {
      throw new BadRequestException('You can only delete your own subtasks');
    }

    subTask.isDeleted = true;
    await subTask.save();

    this.logger.log(`✅ SubTask deleted: ${subTaskId}`);

    // Update task subtask counts
    await this.updateTaskSubTaskCounts(subTask.taskId.toString());

    // Emit real-time update
    await this.socketGateway.emitToRoom(subTask.taskId.toString(), 'subtask-deleted', {
      _subTaskId: subTaskId,
      taskId: subTask.taskId.toString(),
    });
  }

  /**
   * Bulk Create SubTasks
   */
  async bulkCreateSubTasks(
    taskId: string,
    subTasksData: Array<{ title: string; isCompleted?: boolean; order?: number }>,
    createdById: string,
  ): Promise<SubTaskDocument[]> {
    // Verify task exists
    const task = await this.taskModel.findOne({
      _id: new Types.ObjectId(taskId),
      isDeleted: false,
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get max order
    const maxOrderSubTask = await this.subTaskModel.findOne(
      { taskId: new Types.ObjectId(taskId), isDeleted: false },
      {},
      { sort: { order: -1 } },
    );

    const baseOrder = maxOrderSubTask ? maxOrderSubTask.order + 1 : 0;

    // Create subtasks
    const subTasksToCreate = subTasksData.map((data, index) => ({
      taskId: new Types.ObjectId(taskId),
      createdById: new Types.ObjectId(createdById),
      title: data.title,
      isCompleted: data.isCompleted ?? false,
      order: data.order ?? baseOrder + index,
    }));

    const subTasks = await this.subTaskModel.insertMany(subTasksToCreate);

    this.logger.log(`✅ ${subTasks.length} SubTasks created for task ${taskId}`);

    // Update task subtask counts
    await this.updateTaskSubTaskCounts(taskId);

    // Emit real-time update
    await this.socketGateway.emitToRoom(taskId, 'subtasks-bulk-created', {
      taskId,
      count: subTasks.length,
      subTasks: subTasks.map(st => ({
        _subTaskId: st._id.toString(),
        title: st.title,
        isCompleted: st.isCompleted,
        order: st.order,
      })),
    });

    return subTasks;
  }

  /**
   * Update Task SubTask Counts
   *
   * Denormalizes subtask counts to task document
   */
  private async updateTaskSubTaskCounts(taskId: string): Promise<void> {
    const stats = await this.getCompletionStats(taskId);

    await this.taskModel.findByIdAndUpdate(
      new Types.ObjectId(taskId),
      {
        totalSubtasks: stats.total,
        completedSubtasks: stats.completed,
      },
      { new: true },
    );

    this.logger.debug(`Updated task ${taskId} subtask counts: ${stats.total} total, ${stats.completed} completed`);
  }

  /**
   * Get Completion Statistics
   */
  async getCompletionStats(taskId: string): Promise<{ total: number; completed: number; pending: number; percentage: number }> {
    const stats = await this.subTaskModel.aggregate([
      {
        $match: {
          taskId: new Types.ObjectId(taskId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$isCompleted',
          count: { $sum: 1 },
        },
      },
    ]);

    const total = stats.reduce((sum, stat) => sum + stat.count, 0);
    const completed = stats.find((s) => s._id === true)?.count || 0;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { total, completed, pending, percentage };
  }

  /**
   * Get SubTask by ID
   */
  async getSubTaskById(subTaskId: string): Promise<SubTaskDocument> {
    const subTask = await this.subTaskModel.findOne({
      _id: new Types.ObjectId(subTaskId),
      isDeleted: false,
    });

    if (!subTask) {
      throw new NotFoundException('SubTask not found');
    }

    return subTask;
  }
}
