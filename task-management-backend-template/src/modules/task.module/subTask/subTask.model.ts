//@ts-ignore
import { model, Schema } from 'mongoose';
import paginate from '../../../common/plugins/paginate';
import { ISubTask, ISubTaskModel } from './subTask.interface';

/**
 * SubTask Schema
 * Represents a subtask that belongs to a parent task
 */
const subTaskSchema = new Schema<ISubTask>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Parent task ID is required'],
      index: true,
    },

    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator ID is required'],
    },

    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    isCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
    },

    order: {
      type: Number,
      default: 0,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────
/**
 * Compound indexes optimized for common query patterns
 * Updated: Added isDeleted to all indexes for soft delete filtering
 * Updated V2: Removed assignedToUserId index (field removed - not needed)
 */
subTaskSchema.index({ taskId: 1, isCompleted: 1, isDeleted: 1 });
subTaskSchema.index({ taskId: 1, order: 1, isDeleted: 1 });

// ─── Plugins ─────────────────────────────────────────────────────────
subTaskSchema.plugin(paginate);

// ─── Transform ───────────────────────────────────────────────────────
/**
 * Transform schema output for API responses
 * Matches Flutter model structure exactly
 *
 * Flutter Model:
 * ```dart
 * class SubTask {
 *   final String title;
 *   final bool isCompleted;
 * }
 * ```
 */
subTaskSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret, options) {
    // Keep only fields that Flutter needs
    const flutterModel: any = {
      _subTaskId: ret._id,
      title: ret.title,
      isCompleted: ret.isCompleted,
    };

    // Include completedAt only if subtask is completed (for tracking)
    if (ret.isCompleted && ret.completedAt) {
      flutterModel.completedAt = ret.completedAt;
    }

    // Delete all backend-only fields
    delete ret._id;
    delete ret.__v;
    delete ret.taskId;
    delete ret.createdById;
    delete ret.isDeleted;
    delete ret.createdAt;
    delete ret.updatedAt;
    delete ret.order;

    return flutterModel;
  },
});

// ─── Static Methods ──────────────────────────────────────────────────
/**
 * Get completion statistics for a task
 */
subTaskSchema.statics.getTaskCompletionStats = async function (taskId: string) {
  const stats = await this.aggregate([
    {
      $match: {
        taskId: new Schema.Types.ObjectId(taskId),
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

  return {
    total,
    completed,
    pending: total - completed,
    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

export const SubTask = model<ISubTask, ISubTaskModel>('SubTask', subTaskSchema);
