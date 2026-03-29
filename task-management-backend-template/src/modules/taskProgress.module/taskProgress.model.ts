//@ts-ignore
import { model, Schema, Types } from 'mongoose';
import paginate from '../../common/plugins/paginate';
import {
  ITaskProgress,
  ITaskProgressDocument,
  ITaskProgressModel,
} from './taskProgress.interface';
import { TaskProgressStatus, TASK_PROGRESS_DEFAULTS } from './taskProgress.constant';

/**
 * Task Progress Schema
 * Tracks each child's independent progress on collaborative tasks
 */
const taskProgressSchema = new Schema<ITaskProgress>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskProgressStatus),
      default: TaskProgressStatus.NOT_STARTED,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    completedSubtaskIndexes: {
      type: [Number],
      default: TASK_PROGRESS_DEFAULTS.COMPLETED_SUBTASK_INDEXES,
    },
    progressPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
    },
    note: {
      type: String,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compound indexes for efficient queries
 */
// Primary query: Get progress for specific task and user
taskProgressSchema.index({ taskId: 1, userId: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });

// Get all children's progress for a task
taskProgressSchema.index({ taskId: 1, status: 1, isDeleted: 1 });

// Get all tasks progress for a child
taskProgressSchema.index({ userId: 1, status: 1, isDeleted: 1 });

// Get progress by status
taskProgressSchema.index({ status: 1, isDeleted: 1 });

// For activity feed (recent progress)
taskProgressSchema.index({ updatedAt: -1, isDeleted: 1 });

/**
 * Static method: Get progress for a specific task and user
 */
taskProgressSchema.statics.getProgress = async function (
  taskId: Types.ObjectId,
  userId: Types.ObjectId
): Promise<ITaskProgressDocument | null> {
  return await this.findOne({
    taskId,
    userId,
    isDeleted: false,
  });
};

/**
 * Static method: Get all children's progress for a task
 */
taskProgressSchema.statics.getAllChildrenProgress = async function (
  taskId: Types.ObjectId
): Promise<ITaskProgressDocument[]> {
  return await this.find({
    taskId,
    isDeleted: false,
  }).sort({ status: 1, completedAt: -1 });
};

/**
 * Static method: Get all tasks progress for a child
 */
taskProgressSchema.statics.getAllTasksProgress = async function (
  userId: Types.ObjectId
): Promise<ITaskProgressDocument[]> {
  return await this.find({
    userId,
    isDeleted: false,
  }).sort({ updatedAt: -1 });
};

/**
 * Static method: Count children who completed a task
 */
taskProgressSchema.statics.countCompleted = async function (
  taskId: Types.ObjectId
): Promise<number> {
  return await this.countDocuments({
    taskId,
    status: TaskProgressStatus.COMPLETED,
    isDeleted: false,
  });
};

/**
 * Static method: Count children in progress
 */
taskProgressSchema.statics.countInProgress = async function (
  taskId: Types.ObjectId
): Promise<number> {
  return await this.countDocuments({
    taskId,
    status: TaskProgressStatus.IN_PROGRESS,
    isDeleted: false,
  });
};

/**
 * Static method: Count children who haven't started
 */
taskProgressSchema.statics.countNotStarted = async function (
  taskId: Types.ObjectId
): Promise<number> {
  return await this.countDocuments({
    taskId,
    status: TaskProgressStatus.NOT_STARTED,
    isDeleted: false,
  });
};

/**
 * Instance method: Check if this progress record is for a specific user
 */
taskProgressSchema.methods.isForUser = function (userId: string): boolean {
  return this.userId.equals(new Types.ObjectId(userId));
};

/**
 * Instance method: Check if task is completed by this child
 */
taskProgressSchema.methods.isCompleted = function (): boolean {
  return this.status === TaskProgressStatus.COMPLETED && !this.isDeleted;
};

/**
 * Instance method: Update progress percentage based on completed subtasks
 */
taskProgressSchema.methods.updateProgressPercentage = function (totalSubtasks: number): void {
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
  } else if (this.progressPercentage > 0 && this.status === TaskProgressStatus.NOT_STARTED) {
    this.status = TaskProgressStatus.IN_PROGRESS;
    if (!this.startedAt) {
      this.startedAt = new Date();
    }
  }
};

/**
 * Apply paginate plugin
 */
taskProgressSchema.plugin(paginate);

/**
 * toJSON transformation
 */
taskProgressSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret._progressId = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

/**
 * Pre-save hook: Validate progress data
 */
taskProgressSchema.pre('save', function (next) {
  // Ensure progress percentage matches completed subtasks
  // This is a safety check; should be updated via updateProgressPercentage
  
  // Validate completedAt is set when status is completed
  if (this.status === TaskProgressStatus.COMPLETED && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  // Validate startedAt is set when status is inProgress
  if (this.status === TaskProgressStatus.IN_PROGRESS && !this.startedAt) {
    this.startedAt = new Date();
  }
  
  next();
});

/**
 * Export the model
 */
export const TaskProgress = model<ITaskProgress, ITaskProgressModel>(
  'TaskProgress',
  taskProgressSchema
);
