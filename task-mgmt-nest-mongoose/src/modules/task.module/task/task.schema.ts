import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { IBaseEntity } from '../../../common/base/base.entity';

/**
 * Task Status Enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'inProgress',
  COMPLETED = 'completed',
}

/**
 * Task Type Enum
 */
export enum TaskType {
  PERSONAL = 'personal',
  SINGLE_ASSIGNMENT = 'singleAssignment',
  COLLABORATIVE = 'collaborative',
}

/**
 * Task Priority Enum
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Task Schema
 *
 * Supports personal, single assignment, and collaborative tasks
 * 
 * Note: Subtasks are now in a separate collection (SubTask)
 * See: SUBTASK_MIGRATION_TO_SEPARATE_TABLE-17-03-26.md
 */
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})
export class Task extends IBaseEntity {
  /**
   * User who created this task
   */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdById: Types.ObjectId;

  /**
   * User who owns this task (for personal tasks)
   */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerUserId?: Types.ObjectId;

  /**
   * Type of task (personal/singleAssignment/collaborative)
   */
  @Prop({
    enum: TaskType,
    required: true
  })
  taskType: TaskType;

  /**
   * Users assigned to this task
   */
  @Prop([{ type: Types.ObjectId, ref: 'User' }])
  assignedUserIds?: Types.ObjectId[];

  /**
   * Task title
   */
  @Prop({ required: true, trim: true, maxlength: 200 })
  title: string;

  /**
   * Task description
   */
  @Prop({ trim: true, maxlength: 2000 })
  description?: string;

  /**
   * Scheduled time (e.g., "10:30 AM")
   */
  @Prop({ trim: true })
  scheduledTime?: string;

  /**
   * Task priority
   */
  @Prop({
    enum: TaskPriority,
    default: TaskPriority.MEDIUM
  })
  priority: TaskPriority;

  /**
   * Task status
   */
  @Prop({
    enum: TaskStatus,
    default: TaskStatus.PENDING
  })
  status: TaskStatus;

  /**
   * ⭐ REMOVED: Embedded subtasks (now in separate collection)
   * Subtasks are now stored in SubTask collection
   * Use virtual populate to get subtasks
   */

  /**
   * Total number of subtasks (denormalized)
   */
  @Prop({ default: 0 })
  totalSubtasks: number;

  /**
   * Number of completed subtasks (denormalized)
   */
  @Prop({ default: 0 })
  completedSubtasks: number;

  /**
   * Task start time
   */
  @Prop({ type: Date, required: true })
  startTime: Date;

  /**
   * Task completion time
   */
  @Prop({ type: Date })
  completedTime?: Date;

  /**
   * Task due date
   */
  @Prop({ type: Date })
  dueDate?: Date;

  /**
   * Soft delete flag
   */
  @Prop({ default: false })
  isDeleted: boolean;

  /**
   * Deletion timestamp
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  /**
   * Virtual: Get creator details
   */
  createdBy?: any;

  /**
   * Virtual: Get owner details
   */
  owner?: any;

  /**
   * Virtual: Get assigned users details
   */
  assignedUsers?: any[];

  /**
   * Virtual: Get subtasks (from separate collection)
   */
  subtasks?: any[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// ─── Indexes for Performance ───────────────────────────────────────────────
/**
 * Compound indexes for common query patterns
 */
TaskSchema.index({ createdById: 1, status: 1, isDeleted: 1, startTime: -1 });
TaskSchema.index({ ownerUserId: 1, status: 1, isDeleted: 1, startTime: -1 });
TaskSchema.index({ assignedUserIds: 1, status: 1, isDeleted: 1 });
TaskSchema.index({ startTime: 1, isDeleted: 1 });
TaskSchema.index({ dueDate: 1, isDeleted: 1 });
TaskSchema.index({ taskType: 1, status: 1, isDeleted: 1 });

// ─── Virtuals ───────────────────────────────────────────────────────
/**
 * Virtual: Get creator details
 */
TaskSchema.virtual('createdBy', {
  ref: 'User',
  localField: 'createdById',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual: Get owner details
 */
TaskSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerUserId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual: Get assigned users details
 */
TaskSchema.virtual('assignedUsers', {
  ref: 'User',
  localField: 'assignedUserIds',
  foreignField: '_id',
});

/**
 * ⭐ NEW: Virtual populate for subtasks (SEPARATE COLLECTION)
 * Automatically includes subtasks when getting task details
 * Uses MongoDB virtual populate to join SubTask collection
 */
TaskSchema.virtual('subtasks', {
  ref: 'SubTask',
  localField: '_id',
  foreignField: 'taskId',
  options: {
    sort: { order: 1 },
    limit: 100, // Prevent too many subtasks
  },
});

/**
 * Virtual: Completion percentage
 */
TaskSchema.virtual('completionPercentage').get(function() {
  if (this.totalSubtasks === 0) return 0;
  return Math.round((this.completedSubtasks / this.totalSubtasks) * 100);
});

/**
 * Virtual: Check if task is overdue
 */
TaskSchema.virtual('isOverdue').get(function() {
  if (this.status === TaskStatus.COMPLETED) return false;
  if (!this.dueDate) return false;
  return new Date() > this.dueDate;
});

/**
 * Virtual: time alias for scheduledTime (Flutter compatibility)
 */
TaskSchema.virtual('time').get(function() {
  const task = this as any;
  return task.scheduledTime || task.startTime;
});

/**
 * Virtual: assignedBy for collaborative tasks (Flutter compatibility)
 */
TaskSchema.virtual('assignedBy').get(function() {
  const task = this as any;
  return task.createdById;
});

// ─── Transform ───────────────────────────────────────────────────────
/**
 * Transform schema output for API responses
 */
TaskSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    // Add time alias for Flutter
    if (ret.scheduledTime) {
      ret.time = ret.scheduledTime;
    } else if (ret.startTime) {
      const date = new Date(ret.startTime);
      ret.time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    // Add assignedBy for collaborative tasks
    if (ret.createdById) {
      ret.assignedBy = ret.createdById;
    }

    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export type TaskDocument = Task & Document;
