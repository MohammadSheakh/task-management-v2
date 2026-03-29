/**
 * User Profile Module Constants
 * Centralized configuration for user profile-related enums and limits
 *
 * @version 1.0.0
 * @author Senior Engineering Team
 */

/**
 * Support Mode Enum
 * Defines how the app should communicate with the user
 * @see Figma: response-based-on-mode.png, profile-permission-account-interface.png
 */
export enum SupportMode {
  CALM = 'calm',
  ENCOURAGING = 'encouraging',
  LOGICAL = 'logical',
}

/**
 * Notification Style Enum
 * Defines how reminders should feel
 * @see Figma: profile-permission-account-interface.png (Notification Style section)
 */
export enum NotificationStyle {
  GENTLE = 'gentle',
  FIRM = 'firm',
  XYZ = 'xyz',
}

/**
 * Gender Enum
 * Defines user gender options
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female'
}

/**
 * Type exports from enums (for MongoDB schema validation and TypeScript)
 */
export type TSupportMode = `${SupportMode}`;
export type TNotificationStyle = `${NotificationStyle}`;
export type TGender = `${Gender}`;

/**
 * Legacy type exports (for backward compatibility)
 * @deprecated Use SupportMode, NotificationStyle, etc. enums instead
 */
export const SUPPORT_MODE = SupportMode;
export const NOTIFICATION_STYLE = NotificationStyle;
export const GENDER = Gender;

/**
 * User Profile Limits Configuration
 */
export const USER_PROFILE_LIMITS = {
  /**
   * Maximum location name length
   */
  MAX_LOCATION_LENGTH: 100,

  /**
   * Minimum age requirement
   */
  MIN_AGE: 13,

  /**
   * Maximum age limit
   */
  MAX_AGE: 120,
} as const;

/**
 * Task Reminder Configuration
 */
export const TASK_REMINDER_CONFIG = {
  /**
   * Default reminder times before deadline (in hours)
   */
  DEFAULT_REMINDER_HOURS: [24, 1],

  /**
   * Maximum reminders per task
   */
  MAX_REMINDERS_PER_TASK: 5,

  /**
   * Minimum time between reminders (in minutes)
   */
  MIN_REMINDER_INTERVAL_MINUTES: 15,
} as const;
