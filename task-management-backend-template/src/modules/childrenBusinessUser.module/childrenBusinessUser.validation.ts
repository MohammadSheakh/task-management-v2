import { z } from 'zod';

/**
 * Validation schema for creating a child account
 * Used when a business user adds a child to their family
 */
export const createChildValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        required_error: 'Name is required',
      })
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters')
      .trim(),

    email: z
      .string({
        required_error: 'Email is required',
      })
      .email('Please provide a valid email address')
      .toLowerCase(),

    password: z
      .string({
        required_error: 'Password is required',
      })
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
    //   .regex(
    //     /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    //     'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    // )
    ,

    phoneNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\+?[\d\s-()]+$/.test(val),
        'Please provide a valid phone number'
      ),
  }),
});

/**
 * Validation schema for updating child account details
 */
export const updateChildValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters')
      .trim()
      .optional(),

    phoneNumber: z
      .string()
      .refine(
        (val) => !val || /^\+?[\d\s-()]+$/.test(val),
        'Please provide a valid phone number'
      )
      .optional(),

    note: z
      .string()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
  }),
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
});

/**
 * Validation schema for removing a child from family
 */
export const removeChildValidationSchema = z.object({
  params: z.object({
    childId: z.string().uuid('Invalid child ID format'),
  }),
  body: z.object({
    note: z
      .string()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),
  }),
});

/**
 * Validation schema for getting children with filters
 */
export const getChildrenValidationSchema = z.object({
  query: z.object({
    status: z
      .enum(['active', 'inactive', 'removed'])
      .optional(),

    page: z
      .string()
      .regex(/^\d+$/, 'Page must be a number')
      .optional(),

    limit: z
      .string()
      .regex(/^\d+$/, 'Limit must be a number')
      .optional(),

    sortBy: z
      .string()
      .optional(),
  }),
});

/**
 * Validation schema for updating child permissions
 * Figma: dashboard-flow-03.png (Permissions section)
 * Secondary User designation
 */
export const updateChildPermissionsValidationSchema = z.object({
  body: z.object({
    isSecondaryUser: z.boolean(),
  }),
  params: z.object({
    childId: z.string(), // .uuid('Invalid child ID format') 🔂
  }),
});

/*-─────────────────────────────────
|  Export all validation schemas
└──────────────────────────────────*/
export const childrenBusinessUserValidation = {
  createChildValidationSchema,
  updateChildValidationSchema,
  removeChildValidationSchema,
  getChildrenValidationSchema,
  updateChildPermissionsValidationSchema,
};
