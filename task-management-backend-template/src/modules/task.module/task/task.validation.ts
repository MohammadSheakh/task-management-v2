import { z } from 'zod';
import { TaskStatus, TaskType, TaskPriority } from './task.constant';

/**
 * Create Task Validation Schema
 * Validates task creation input
 */
export const createTaskValidationSchema = z.object({
  body: z.object({
    // ─── Required Fields ─────────────────────────────────────────────
    title: z
      .string({
        required_error: 'Task title is required',
      })
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),

    taskType: z
      .nativeEnum(TaskType, {
        required_error: 'Task type is required',
      }),

    startTime: z
      .string({
        required_error: 'Start time is required',
      })
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for startTime',
      }),

    // ─── Optional Fields ─────────────────────────────────────────────
    description: z
      .string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),

    scheduledTime: z
      .string()
      .optional(),

    priority: z
      .nativeEnum(TaskPriority)
      .default(TaskPriority.MEDIUM),

    status: z
      .nativeEnum(TaskStatus)
      .default(TaskStatus.PENDING),

    ownerUserId: z
      .string()
      .refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
        message: 'Invalid ownerUserId format',
      })
      .optional(),

    assignedUserIds: z
      .array(
        z.string().refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
          message: 'Invalid userId format in assignedUserIds',
        })
      )
      .optional(),

    groupId: z
      .string()
      .refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
        message: 'Invalid groupId format',
      })
      .optional(),

    dueDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for dueDate',
      })
      .optional(),

    // ─── Subtasks (Bulk Creation) ────────────────────────────────────
    subtasks: z
      .array(
        z.object({
          title: z
            .string({
              required_error: 'Subtask title is required',
            })
            .min(1, 'Title cannot be empty')
            .max(200, 'Title cannot exceed 200 characters'),
          duration: z.number().optional(),
          isCompleted: z.boolean().default(false).optional(),
          order: z.number().optional(),
        })
      )
      .optional(),

    // ─── Auto-generated (should not come from client) ────────────────
    totalSubtasks: z.number().default(0).optional(),
    completedSubtasks: z.number().default(0).optional(),
  }),
});

/**
 * Update Task Validation Schema
 * All fields optional for partial updates
 */
export const updateTaskValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),

    taskType: z
      .nativeEnum(TaskType)
      .optional(),

    description: z
      .string()
      .max(2000, 'Description cannot exceed 2000 characters')
      .optional(),

    scheduledTime: z.string().optional(),

    priority: z
      .nativeEnum(TaskPriority)
      .optional(),

    status: z
      .nativeEnum(TaskStatus)
      .optional(),

    ownerUserId: z
      .string()
      .refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
        message: 'Invalid ownerUserId format',
      })
      .optional(),

    assignedUserIds: z
      .array(
        z.string().refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
          message: 'Invalid userId format in assignedUserIds',
        })
      )
      .optional(),

    startTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for startTime',
      })
      .optional(),

    completedTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for completedTime',
      })
      .optional(),

    dueDate: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for dueDate',
      })
      .optional(),

    totalSubtasks: z.number().optional(),
    completedSubtasks: z.number().optional(),
  }),
});

/**
 * Update Task Status Validation Schema
 * Specifically for status updates
 */
export const updateTaskStatusValidationSchema = z.object({
  body: z.object({
    status: z
      .nativeEnum(TaskStatus, {
        required_error: 'Status is required',
      }),
    completedTime: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for completedTime',
      })
      .optional(),
  }),
});

/**
 * Query Validation Schema for filtering tasks
 */
export const taskQueryValidationSchema = z.object({
  query: z.object({
    status: z
      .nativeEnum(TaskStatus)
      .optional(),

    taskType: z
      .nativeEnum(TaskType)
      .optional(),

    priority: z
      .nativeEnum(TaskPriority)
      .optional(),

    from: z.string().optional(), // Start date for range
    to: z.string().optional(), // End date for range

    sortBy: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    populate: z.string().optional(),
  }),
});
