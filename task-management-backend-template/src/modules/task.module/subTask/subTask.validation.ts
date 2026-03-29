import { z } from 'zod';

/**
 * Create SubTask Validation Schema
 */
export const createSubTaskValidationSchema = z.object({
  body: z.object({
    // ─── Required Fields ─────────────────────────────────────────────
    taskId: z
      .string({
        required_error: 'Parent task ID is required',
      })
      .refine((val) => val.match(/^[0-9a-fA-F]{24}$/), {
        message: 'Invalid task ID format',
      }),

    title: z
      .string({
        required_error: 'Subtask title is required',
      })
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters'),

    // ─── Optional Fields ─────────────────────────────────────────────
    order: z
      .number()
      .optional(),

    // ─── Auto-generated ──────────────────────────────────────────────
    isCompleted: z.boolean().default(false).optional(),
  }),
});

/**
 * Update SubTask Validation Schema
 */
export const updateSubTaskValidationSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),

    isCompleted: z.boolean().optional(),

    completedAt: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format for completedAt',
      })
      .optional(),

    order: z.number().optional(),
  }),
});

/**
 * Toggle SubTask Status Validation Schema
 */
export const toggleSubTaskStatusValidationSchema = z.object({
  body: z.object({
    isCompleted: z
      .boolean({
        required_error: 'isCompleted status is required',
      }),
  }),
});

/**
 * Query Validation Schema
 */
export const subTaskQueryValidationSchema = z.object({
  query: z.object({
    taskId: z.string().optional(),
    isCompleted: z.string().optional(),
    sortBy: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    populate: z.string().optional(),
  }),
});
