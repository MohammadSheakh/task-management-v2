import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types, Model } from 'mongoose';
import { TaskProgressStatus, TASK_PROGRESS_DEFAULTS } from './taskProgress.constants';

/**
 * Task Progress Schema
 * Tracks each child's independent progress on collaborative tasks
 *
 * @version 1.0.0 (NestJS Migration)
 * @author Senior Engineering Team
 *
 * @example
 * // Create progress record
 * const progress = await taskProgressModel.create({
 *   taskId: new Types.ObjectId('...'),
 *   userId: new Types.ObjectId('...'),
 *   status: TaskProgressStatus.NOT_STARTED,
 * });
 *
 * // Update progress
 * progress.status = TaskProgressStatus.IN_PROGRESS;
 * progress.startedAt = new Date();
 * await progress.save();
 */
@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TaskProgress {
  /**
   * MongoDB document ID
   */
  _id?: Types.ObjectId;

  /**
   * Reference to the task
   * @index true - Frequently queried by taskId
   */
  @Prop({
    type: Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task ID is required'],
    index: true,
  })
  taskId: Types.ObjectId;

  /**
   * Reference to the child user
   * This is the child whose progress we're tracking
   * @index true - Frequently queried by userId
   */
  @Prop({
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  })
  userId: Types.ObjectId;

  /**
   * Current progress status
   * - notStarted: Child hasn't started the task yet
   * - inProgress: Child is actively working on the task
   * - completed: Child has completed all subtasks
   * @default TaskProgressStatus.NOT_STARTED
   */
  @Prop({
    type: String,
    enum: Object.values(TaskProgressStatus),
    default: TaskProgressStatus.NOT_STARTED,
  })
  status: TaskProgressStatus;

  /**
   * When the child started working on the task
   * Set when status changes from 'notStarted' to 'inProgress'
   */
  @Prop({ type: Date })
  startedAt?: Date;

  /**
   * When the child completed the task
   * Set when status becomes 'completed'
   */
  @Prop({ type: Date })
  completedAt?: Date;

  /**
   * Array of subtask indexes completed by this child
   * For embedded subtasks in the parent Task document
   *
   * @example [0, 2, 3] - Child completed subtasks at index 0, 2, and 3
   * @default []
   */
  @Prop({
    type: [Number],
    default: TASK_PROGRESS_DEFAULTS.COMPLETED_SUBTASK_INDEXES,
  })
  completedSubtaskIndexes: number[];

  /**
   * Progress percentage (0-100)
   * Calculated as: (completedSubtaskIndexes.length / totalSubtasks) * 100
   * @min 0 - Progress cannot be negative
   * @max 100 - Progress cannot exceed 100
   * @default 0
   */
  @Prop({
    type: Number,
    default: 0,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
  })
  progressPercentage: number;

  /**
   * Optional note or comment from the child
   * @maxLength 500 characters
   */
  @Prop({
    type: String,
    maxlength: [500, 'Note cannot exceed 500 characters'],
  })
  note?: string;

  /**
   * Soft delete flag
   * @default false
   */
  @Prop({ default: false })
  isDeleted: boolean;

  /**
   * Creation timestamp (auto-managed by Mongoose)
   */
  createdAt?: Date;

  /**
   * Last update timestamp (auto-managed by Mongoose)
   */
  updatedAt?: Date;
}

/**
 * Task Progress Schema Definition
 */
export const TaskProgressSchema = SchemaFactory.createForClass(TaskProgress);

/**
 * Compound indexes for efficient queries
 * Optimized for parent dashboard and child task list use cases
 */

// Primary query: Get progress for specific task and user (unique constraint)
TaskProgressSchema.index(
  { taskId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  },
);

// Get all children's progress for a task (parent dashboard)
TaskProgressSchema.index({ taskId: 1, status: 1, isDeleted: 1 });

// Get all tasks progress for a child (child's task list)
TaskProgressSchema.index({ userId: 1, status: 1, isDeleted: 1 });

// Get progress by status (filtering)
TaskProgressSchema.index({ status: 1, isDeleted: 1 });

// For activity feed (recent progress updates)
TaskProgressSchema.index({ updatedAt: -1, isDeleted: 1 });

/**
 * Virtual populate: Get user details when querying progress
 */
TaskProgressSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual populate: Get task details when querying progress
 */
TaskProgressSchema.virtual('task', {
  ref: 'Task',
  localField: 'taskId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Instance method: Check if this progress record is for a specific user
 *
 * @param userId - User ID to check
 * @returns true if this progress belongs to the user
 */
TaskProgressSchema.methods.isForUser = function (userId: string): boolean {
  return this.userId.equals(new Types.ObjectId(userId));
};

/**
 * Instance method: Check if task is completed by this child
 *
 * @returns true if status is COMPLETED and not deleted
 */
TaskProgressSchema.methods.isCompleted = function (): boolean {
  return this.status === TaskProgressStatus.COMPLETED && !this.isDeleted;
};

/**
 * Instance method: Update progress percentage based on completed subtasks
 * Auto-updates status based on progress
 *
 * @param totalSubtasks - Total number of subtasks in the task
 *
 * @example
 * // Child completes a subtask
 * progress.completedSubtaskIndexes.push(2);
 * progress.updateProgressPercentage(5); // 3/5 = 60%
 *
 * // If all subtasks completed → auto-complete
 * progress.updateProgressPercentage(3); // 3/3 = 100% → status = COMPLETED
 */
TaskProgressSchema.methods.updateProgressPercentage = function (
  totalSubtasks: number,
): void {
  if (totalSubtasks === 0) {
    this.progressPercentage = 0;
    return;
  }

  const completedCount = this.completedSubtaskIndexes.length;
  this.progressPercentage = Math.round((completedCount / totalSubtasks) * 100);

  // Auto-update status based on progress
  if (this.progressPercentage === 100 && totalSubtasks > 0) {
    this.status = TaskProgressStatus.COMPLETED;
    this.completedAt = new Date();
  } else if (
    this.progressPercentage > 0 &&
    this.status === TaskProgressStatus.NOT_STARTED
  ) {
    this.status = TaskProgressStatus.IN_PROGRESS;
    if (!this.startedAt) {
      this.startedAt = new Date();
    }
  }
};

/**
 * Pre-save hook: Validate progress data
 * Ensures data integrity and automatic timestamp management
 */
TaskProgressSchema.pre<TaskProgressDocument>(
  'save',
  function (next) {
    // Ensure progress percentage matches completed subtasks (safety check)
    // This should be updated via updateProgressPercentage method

    // Validate completedAt is set when status is completed
    if (
      this.status === TaskProgressStatus.COMPLETED &&
      !this.completedAt
    ) {
      this.completedAt = new Date();
    }

    // Validate startedAt is set when status is inProgress
    if (
      this.status === TaskProgressStatus.IN_PROGRESS &&
      !this.startedAt
    ) {
      this.startedAt = new Date();
    }

    next();
  },
);

/**
 * toJSON transformation
 * Adds progressId and removes internal fields
 */
TaskProgressSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.progressId = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.isDeleted;
    return ret;
  },
});

/**
 * Task Progress Document Type
 * Extends TaskProgress class with Mongoose Document methods
 */
export type TaskProgressDocument = TaskProgress & Document;

/**
 * Task Progress Model Type
 * Extends Model with custom methods
 */
export type TaskProgressModel = Model<TaskProgressDocument>;
