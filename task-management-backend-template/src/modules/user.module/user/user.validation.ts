//@ts-ignore
import mongoose from 'mongoose';
//@ts-ignore
import { z } from 'zod';

export const sendInvitationToBeAdminValidationSchema = z.object({

  body: z.object({
    email : z.
      string({
        required_error: 'email is required.',
        invalid_type_error: 'email must be a string.',
      })
      .email('Invalid email address.'),
    password : z
      .string({
        required_error: 'password is required.',
        invalid_type_error: 'password must be a string.',
      }),

    name: z.string({
      required_error: 'name is required.',
      invalid_type_error: 'name must be a string.',
    }),

    role :  z.string({
        required_error: 'role is required.',
        invalid_type_error: 'role must be a string.',
      }),
    message :  z.string({
        required_error: 'message is required.',
        invalid_type_error: 'message must be a string.',
      })

    }),
});

// ────────────────────────────────────────────────────────────────────────
// Support Mode & Notification Preferences Validation
// ────────────────────────────────────────────────────────────────────────

/**
 * Support Mode Validation Schema
 * @see Figma: response-based-on-mode.png
 */
export const updateSupportModeValidationSchema = z.object({
  body: z.object({
    supportMode: z.enum(['calm', 'encouraging', 'logical'], {
      required_error: 'Support mode is required',
      invalid_type_error: 'Support mode must be one of: calm, encouraging, logical',
    }),
  }),
});

/**
 * Update Child Support Mode Validation Schema
 * For parent to update their child's support mode
 * @see Figma: task-details-flow-apis.png
 */
export const updateChildSupportModeValidationSchema = z.object({
  body: z.object({
    childUserId: z.string({
      required_error: 'Child user ID is required',
      invalid_type_error: 'Child user ID must be a string',
    }).refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: 'Invalid child user ID',
    }),
    supportMode: z.enum(['calm', 'encouraging', 'logical'], {
      required_error: 'Support mode is required',
      invalid_type_error: 'Support mode must be one of: calm, encouraging, logical',
    }),
  }),
});

/**
 * Notification Style Validation Schema
 * @see Figma: profile-permission-account-interface.png (Notification Style section)
 */
export const updateNotificationStyleValidationSchema = z.object({
  body: z.object({
    notificationStyle: z.enum(['gentle', 'firm', 'xyz'], {
      required_error: 'Notification style is required',
      invalid_type_error: 'Notification style must be one of: gentle, firm, xyz',
    }),
  }),
});

/**
 * Preferred Time Validation Schema
 * @see Figma: profile-permission-account-interface.png (Preferred Time section)
 * Format: HH:mm in 24-hour format (e.g., "08:30" for 8:30 AM)
 * Range: 05:00 - 23:00 (5 AM - 11 PM)
 */
export const updatePreferredTimeValidationSchema = z.object({
  body: z.object({
    preferredTime: z
      .string({
        required_error: 'Preferred time is required',
        invalid_type_error: 'Preferred time must be a string',
      })
      .regex(
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Preferred time must be in HH:mm format (24-hour)'
      )
      .refine(
        (time) => {
          const [hours] = time.split(':').map(Number);
          return hours >= 5 && hours <= 23; // 5 AM - 11 PM
        },
        'Preferred time must be between 05:00 and 23:00'
      ),
  }),
});
