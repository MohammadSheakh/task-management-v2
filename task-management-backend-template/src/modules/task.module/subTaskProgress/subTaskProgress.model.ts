//@ts-ignore
import { model, Schema, Types } from 'mongoose';
import { ISubTaskProgress } from './subTaskProgress.interface';
import paginate from '../../../common/plugins/paginate';

/**
 * SubTask Progress Schema
 * Tracks individual child's completion of each subtask in collaborative tasks
 * 
 * Why separate collection?
 * - Each child completes subtasks independently
 * - Child 1 completing subtask 1 doesn't mark it complete for Child 2
 * - Parent can see who completed which subtasks
 * - Better analytics on collaborative work patterns
 */
const subTaskProgressSchema = new Schema<ISubTaskProgress>(
  {
    // ─── References ──────────────────────────────────────────────────
    taskId: {
      type: Schema.Types.ObjectId,
      ref: 'Task',
      required: [true, 'Task ID is required'],
    },

    subtaskId: {
      type: Schema.Types.ObjectId,
      ref: 'SubTask',
      required: [true, 'SubTask ID is required'],
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    // ─── Completion Status ───────────────────────────────────────────
    isCompleted: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
    },

    // ─── Metadata ────────────────────────────────────────────────────
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters'],
    },

    // ─── Soft Delete ─────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// ─── Indexes for Performance ─────────────────────────────────────────
/**
 * Compound index for efficient queries
 * Most common query: Get user's progress for a task
 */
subTaskProgressSchema.index({ taskId: 1, userId: 1, isDeleted: 1 });

/**
 * Index for getting all children's progress on a subtask
 */
subTaskProgressSchema.index({ subtaskId: 1, userId: 1, isDeleted: 1 });

/**
 * Index for checking completion status
 */
subTaskProgressSchema.index({ taskId: 1, subtaskId: 1, userId: 1, isCompleted: 1, isDeleted: 1 });

/**
 * ✅ UNIQUE index to prevent duplicate progress records
 * Ensures one progress record per child per subtask
 */
subTaskProgressSchema.index(
  { taskId: 1, subtaskId: 1, userId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// ─── Virtual Populate ────────────────────────────────────────────────
/**
 * Virtual to populate subtask details
 */
subTaskProgressSchema.virtual('subtaskDetails', {
  ref: 'SubTask',
  localField: 'subtaskId',
  foreignField: '_id',
  justOne: true,
});

/**
 * Virtual to populate user details
 */
subTaskProgressSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

// ─── Static Methods ──────────────────────────────────────────────────
/**
 * Get completion stats for a specific subtask across all children
 */
subTaskProgressSchema.statics.getSubtaskCompletionStats = async function (
  subtaskId: string
) {
  const stats = await this.aggregate([
    {
      $match: {
        subtaskId: new Types.ObjectId(subtaskId),
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

  const completed = stats.find((s: any) => s._id === true)?.count || 0;
  const notCompleted = stats.find((s: any) => s._id === false)?.count || 0;
  const total = completed + notCompleted;

  return {
    total,
    completed,
    notCompleted,
    completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
};

/**
 * Get all children's progress for a task
 */
subTaskProgressSchema.statics.getAllChildrenProgress = async function (
  taskId: string
) {
  return await this.aggregate([
    {
      $match: {
        taskId: new Types.ObjectId(taskId),
        isDeleted: false,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $lookup: {
        from: 'subtasks',
        localField: 'subtaskId',
        foreignField: '_id',
        as: 'subtask',
      },
    },
    {
      $unwind: '$subtask',
    },
    {
      $project: {
        userId: '$user._id',
        userName: '$user.name',
        userEmail: '$user.email',
        subtaskId: '$subtask._id',
        subtaskTitle: '$subtask.title',
        subtaskOrder: '$subtask.order',
        isCompleted: 1,
        completedAt: 1,
        note: 1,
      },
    },
    {
      $sort: { userName: 1, subtaskOrder: 1 },
    },
  ]);
};

// ─── Plugins ─────────────────────────────────────────────────────────
subTaskProgressSchema.plugin(paginate);

// ─── Model ───────────────────────────────────────────────────────────
export const SubTaskProgress = model<ISubTaskProgress>(
  'SubTaskProgress',
  subTaskProgressSchema
);
