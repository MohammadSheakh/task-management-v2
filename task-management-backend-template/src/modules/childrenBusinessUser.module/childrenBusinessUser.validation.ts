import { z } from 'zod';

/**
 * Validation schema for creating a child account
 * Figma: create-child-flow.png (Create Member screen)
 * All fields from Figma design
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
      .max(128, 'Password cannot exceed 128 characters'),

    phoneNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\+?[\d\s-()]+$/.test(val),
        'Please provide a valid phone number'
      ),

    // Address field from Figma
    location: z
      .string()
      .max(200, 'Address cannot exceed 200 characters')
      .optional(),

    // Gender field from Figma (Male/Female/Other gender)
    gender: z
      .enum(['male', 'female', 'other'], {
        errorMap: () => ({ message: 'Gender must be male, female, or other' }),
      })
      .optional(),

    // Date of Birth field from Figma
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .describe('Date of birth in YYYY-MM-DD format'),

    // Support Mode field from Figma (Calm/Encouraging/Logical)
    supportMode: z
      .enum(['calm', 'encouraging', 'logical'], {
        errorMap: () => ({
          message: 'Support mode must be calm, encouraging, or logical',
        }),
      })
      .optional()
      .describe('Support mode from Figma: Calm/Encouraging/Logical'),
  }),
});

/**
 * Validation schema for updating child account details
 * Figma: edit-child-flow.png (Update Profile form)
 */
export const updateChildValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters long')
      .max(100, 'Name cannot exceed 100 characters')
      .trim()
      .optional(),

    email: z
      .string()
      .email('Please provide a valid email address')
      .toLowerCase()
      .optional(),

    phoneNumber: z
      .string()
      .refine(
        (val) => !val || /^\+?[\d\s-()]+$/.test(val),
        'Please provide a valid phone number'
      )
      .optional(),

    gender: z
      .enum(['male', 'female', 'other'])
      .optional(),

    // Profile fields
    supportMode: z
      .enum(['calm', 'encouraging', 'logical'])
      .optional()
      .describe('Support mode from Figma: Calm/Encouraging/Logical'),

    location: z
      .string()
      .max(200, 'Location cannot exceed 200 characters')
      .optional(),

    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .describe('Date of birth in YYYY-MM-DD format'),

    // Admin fields
    note: z
      .string()
      .max(500, 'Note cannot exceed 500 characters')
      .optional(),

    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .max(128, 'Password cannot exceed 128 characters')
      .optional()
      .describe('New password (optional, only if changing password)'),
  }),
  params: z.object({
    childId: z.string('Invalid child ID format'),
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
 * Validation schema for inviting a child account (Invitation Flow)
 * Figma: create-child-flow.png (Invitation flow variant)
 * Parent sends invitation, child sets own password
 */
export const inviteChildValidationSchema = z.object({
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

    phoneNumber: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\+?[\d\s-()]+$/.test(val),
        'Please provide a valid phone number'
      ),

    // Address field from Figma
    location: z
      .string()
      .max(200, 'Address cannot exceed 200 characters')
      .optional(),

    // Gender field from Figma
    gender: z
      .enum(['male', 'female', 'other'], {
        errorMap: () => ({ message: 'Gender must be male, female, or other' }),
      })
      .optional(),

    // Date of Birth field from Figma
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .describe('Date of birth in YYYY-MM-DD format'),

    // Support Mode field from Figma
    supportMode: z
      .enum(['calm', 'encouraging', 'logical'], {
        errorMap: () => ({
          message: 'Support mode must be calm, encouraging, or logical',
        }),
      })
      .optional()
      .describe('Support mode from Figma: Calm/Encouraging/Logical'),
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
