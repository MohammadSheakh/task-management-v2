/**
 * Children Business User Status Enum
 */
export enum ChildrenBusinessUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REMOVED = 'removed',
}

/**
 * Type export from enum (for MongoDB schema validation and TypeScript)
 */
export type TChildrenBusinessUserStatus = `${ChildrenBusinessUserStatus}`;

/**
 * Legacy constant exports (for backward compatibility)
 * @deprecated Use ChildrenBusinessUserStatus enum instead
 */
export const CHILDREN_BUSINESS_USER_STATUS = ChildrenBusinessUserStatus;

/**
 * Default values for children business user
 */
export const CHILDREN_BUSINESS_USER_DEFAULTS = {
  STATUS: ChildrenBusinessUserStatus.ACTIVE,
  IS_DELETED: false,
} as const;

/**
 * Cache configuration for children business user operations
 */
export const CHILDREN_CACHE_CONFIG = {
  PREFIX: 'children',
  CHILDREN_LIST_TTL: 300, // 5 minutes
  COUNT_TTL: 180, // 3 minutes
  PARENT_INFO_TTL: 600, // 10 minutes
} as const;

/**
 * Rate limits for children business user operations
 */
export const CHILDREN_RATE_LIMITS = {
  CREATE_CHILD: {
    windowMs: 3600000, // 1 hour
    max: 10, // 10 children per hour
    message: 'Too many child accounts being created, please try again later',
  },
  GENERAL: {
    windowMs: 60000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many requests, please try again later',
  },
} as const;
