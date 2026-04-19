export enum TAuthProvider{
  local = 'local',
  google = 'google',
  apple = 'apple',
}

/**
 * Authentication Rate Limiting Configuration
 * Prevents brute force attacks and spam
 * 
 * @see masterSystemPrompt.md Section 10: Rate Limiting Rules
 */
export const AUTH_RATE_LIMITS = {
  /**
   * Login endpoint rate limit
   * 5 attempts per 15 minutes per IP
   * Protects against brute force attacks
   */
  LOGIN: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts
    message: {
      success: false,
      message: 'Too many login attempts, please try again later'
    }
  },

  /**
   * Registration endpoint rate limit
   * 10 registrations per hour per IP
   * Prevents spam registrations
   */
  REGISTER: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 10,                    // 10 registrations
    message: {
      success: false,
      message: 'Too many registration attempts, please try again later'
    }
  },

  /**
   * Forgot password rate limit
   * 3 requests per hour per IP
   * Prevents email spam
   */
  FORGOT_PASSWORD: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 3,                     // 3 requests
    message: {
      success: false,
      message: 'Too many password reset requests, please try again later'
    }
  },

  /**
   * Verify email rate limit
   * 5 verifications per hour per IP
   */
  VERIFY_EMAIL: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 5,                     // 5 verifications
    message: {
      success: false,
      message: 'Too many verification attempts, please try again later'
    }
  },

  /**
   * General auth endpoint rate limit
   * 100 requests per minute per IP
   */
  GENERAL: {
    windowMs: 60 * 1000,       // 1 minute
    max: 100,                   // 100 requests
    message: {
      success: false,
      message: 'Too many requests, please try again later'
    }
  }
} as const;

/**
 * Authentication Session Configuration
 * Redis cache TTLs for sessions and tokens
 */
export const AUTH_SESSION_CONFIG = {
  /**
   * Session TTL in Redis
   * 7 days (matches refresh token expiry)
   */
  SESSION_TTL: 7 * 24 * 60 * 60,  // 7 days in seconds

  /**
   * OTP TTL in Redis
   * 10 minutes
   */
  OTP_TTL: 10 * 60,  // 10 minutes in seconds

  /**
   * Blacklisted token TTL
   * Matches token expiry time
   */
  TOKEN_BLACKLIST_TTL: 24 * 60 * 60,  // 24 hours
} as const;
