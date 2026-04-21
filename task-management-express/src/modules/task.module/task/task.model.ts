//@ts-ignore
import { model, Schema, Types } from 'mongoose';
import { ITask, ITaskModel } from './task.interface';
import paginate from '../../../common/plugins/paginate';
import { TaskType, TaskPriority, TaskStatus } from './task.constant';

/**
 * Task Schema
 * Represents a task with support for personal, single assignment, and collaborative tasks
 */
const taskSchema = new Schema<ITask>(
  {
    // ─── Ownership & Assignment ────────────────────────────────────────
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Task creator (createdById) is required'],
    },

    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    taskType: {
      type: String,
      enum: [
        TaskType.PERSONAL,
        TaskType.SINGLE_ASSIGNMENT,
        TaskType.COLLABORATIVE,
      ],
      required: [true, 'Task type is required'],
    },

    assignedUserIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ─── Task Details ──────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    scheduledTime: {
      type: String,
    },

    priority: {
      type: String,
      enum: [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH],
      default: TaskPriority.MEDIUM,
    },

    // ─── Task Progress ─────────────────────────────────────────────────
    status: {
      type: String,
      enum: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
      default: TaskStatus.PENDING,
    },

    totalSubtasks: {
      type: Number,
      default: 0,
    },

    completedSubtasks: {
      type: Number,
      default: 0,
    },

    // ─── Timestamps ────────────────────────────────────────────────────
    startTime: {
      type: Date,
      required: [false, 'Start time is not required'],
    },

    completedTime: {
      type: Date,
    },

    dueDate: {
      type: Date,
    },

    // ─── System Fields ─────────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// ─── Indexes for Performance ─────────────────────────────────────────
/**
 * Compound indexes for common query patterns
 * Updated: Added isDeleted to all indexes for soft delete filtering
 * Updated V2: Removed groupId references (group.module removed)
 */
taskSchema.index({ createdById: 1, status: 1, isDeleted: 1, startTime: -1 });
taskSchema.index({ ownerUserId: 1, status: 1, isDeleted: 1, startTime: -1 });
taskSchema.index({ assignedUserIds: 1, status: 1, isDeleted: 1 });
taskSchema.index({ startTime: 1, isDeleted: 1 });
taskSchema.index({ dueDate: 1, isDeleted: 1 });

// Text search index for task search functionality
taskSchema.index({ title: 'text', description: 'text', tags: 'text' });


// ─── Plugins ─────────────────────────────────────────────────────────
taskSchema.plugin(paginate);

// ─── Virtuals ────────────────────────────────────────────────────────
/**
 * Virtual to calculate completion percentage
 */
taskSchema.virtual('completionPercentage').get(function () {
  const task = this as any;
  if (task.totalSubtasks === 0) return 0;
  return Math.round((task.completedSubtasks / task.totalSubtasks) * 100);
});

/**
 * Virtual to check if task is overdue
 */
taskSchema.virtual('isOverdue').get(function () {
  const task = this as any;
  if (task.status === TaskStatus.COMPLETED) return false;
  if (!task.dueDate) return false;
  return new Date() > task.dueDate;
});

/**
 * ⭐ NEW: Virtual populate for subtasks (SEPARATE COLLECTION)
 * Automatically includes subtasks when getting task details
 * Uses MongoDB virtual populate to join SubTask collection
 */
taskSchema.virtual('subtasks', {
  ref: 'SubTask',
  localField: '_id',
  foreignField: 'taskId',
  options: {
    sort: { order: 1 },
    limit: 100 // Prevent too many subtasks
  }
});

/**
 * Virtual: time alias for scheduledTime
 * Flutter expects 'time' field, backend uses 'scheduledTime'
 * This provides backward compatibility
 */
taskSchema.virtual('time').get(function () {
  const task = this as any;
  return task.scheduledTime || task.startTime;
});

/**
 * Virtual: assignedBy for collaborative tasks
 * Flutter collaborative tasks need to show who assigned the task
 * Populated from createdById field
 */
taskSchema.virtual('assignedBy').get(function () {
  const task = this as any;
  return task.createdById;
});

// ─── Transform ───────────────────────────────────────────────────────
/**
 * Transform schema output for API responses
 * Renames _id to _taskId and includes virtuals
 * Adds 'time' and 'assignedBy' fields for Flutter compatibility
 */
taskSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret, options) {
    ret._taskId = ret._id;
    // Add 'time' alias for Flutter (matches Flutter model)
    if (ret.scheduledTime) {
      ret.time = ret.scheduledTime;
    } else if (ret.startTime) {
      // Format startTime to match Flutter's expected format (e.g., "10:30 AM")
      const date = new Date(ret.startTime);
      ret.time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
    // Add 'assignedBy' for collaborative tasks (Flutter needs this)
    if (ret.createdById) {
      ret.assignedBy = ret.createdById;
    }
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// ─── Static Methods ──────────────────────────────────────────────────
/**
 * Get tasks count for a user on a specific date
 * Used for daily task limit validation
 */
taskSchema.statics.countTasksForDate = async function (
  userId: Types.ObjectId,
  date: Date
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await this.countDocuments({
    ownerUserId: userId,
    startTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
    isDeleted: false,
  });

  return count;
};

export const Task = model<ITask, ITaskModel>('Task', taskSchema);
