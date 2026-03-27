import { z } from 'zod';
import { TASK_PROGRESS_STATUS } from './taskProgress.constant';

/**
 * Validation schema for creating task progress
 * Auto-created when child is assigned to task
 */
export const createTaskProgressValidationSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
    status: z.nativeEnum(TASK_PROGRESS_STATUS).optional(),
  }),
});

/**
 * Validation schema for updating task progress status
 */
export const updateTaskProgressValidationSchema = z.object({
  params: z.object({
    taskId: z.string(), // .uuid('Invalid task ID format')
  }),
  body: z.object({
    // userId: z.string(), // .uuid('Invalid user ID format')
    status: z.nativeEnum(TASK_PROGRESS_STATUS),
    note: z.string().max(500, 'Note cannot exceed 500 characters').optional(),
  }),
});

/**
 * Validation schema for marking subtask as complete
 */
export const completeSubtaskValidationSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID format'),
    subtaskIndex: z.string().regex(/^\d+$/, 'Subtask index must be a number'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Validation schema for getting children's progress
 */
export const getChildrenProgressValidationSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID format'),
  }),
});

/**
 * Validation schema for getting child's task progress
 */
export const getChildTasksProgressValidationSchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
  query: z.object({
    status: z.nativeEnum(TASK_PROGRESS_STATUS).optional(),
    taskType: z.enum(['personal', 'singleAssignment', 'collaborative']).optional(),
  }).optional(),
});

/**
 * Export all validation schemas
 */
export const taskProgressValidation = {
  createTaskProgressValidationSchema,
  updateTaskProgressValidationSchema,
  completeSubtaskValidationSchema,
  getChildrenProgressValidationSchema,
  getChildTasksProgressValidationSchema,
};
