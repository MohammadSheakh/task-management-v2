/**
 * Rate Limiter Middleware
 * Centralized rate limiting solution using express-rate-limit
 *
 * Uses MemoryStore (built-in to express-rate-limit)
 * For production with Redis, see: RATE_LIMITING_REDIS_IMPLEMENTATION_COMPLETE-14-03-26.md
 *
 * @see masterSystemPrompt.md Section 10: Rate Limiting Rules
 * @version 2.2.0 - Fixed express-rate-limit@7.x validation issues
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { errorLogger, logger } from '../shared/logger';

/**
 * Rate Limit Configuration Types
 */
export type TRateLimitType = 'user' | 'admin' | 'auth' | 'api' | 'strict';

/**
 * Rate Limit Presets
 * Pre-configured rate limits for different use cases
 */
export const RATE_LIMIT_PRESETS = {
  user: {
    windowMs: 60 * 1000,       // 1 minute
    max: 30,                    // 30 requests per minute
    message: {
      success: false,
      message: 'Too many requests, please slow down',
    },
  },

  admin: {
    windowMs: 60 * 1000,       // 1 minute
    max: 100,                   // 100 requests per minute
    message: {
      success: false,
      message: 'Too many requests from admin',
    },
  },

  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 5,                     // 5 attempts per 15 minutes
    message: {
      success: false,
      message: 'Too many authentication attempts, please try again later',
    },
  },

  api: {
    windowMs: 60 * 1000,       // 1 minute
    max: 60,                    // 60 requests per minute
    message: {
      success: false,
      message: 'Too many API requests, please slow down',
    },
  },

  strict: {
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 3,                     // 3 requests per hour
    message: {
      success: false,
      message: 'Too many sensitive operations, please try again later',
    },
  },
} as const;

/**
 * Create Rate Limiter
 * Factory function to create rate limiters with different configurations
 *
 * @param type - Rate limit type (user, admin, auth, api, strict)
 * @returns Rate limit middleware
 */
export function rateLimiter(
  type: TRateLimitType = 'user'
): RateLimitRequestHandler {
  const preset = RATE_LIMIT_PRESETS[type];

  return rateLimit({
    windowMs: preset.windowMs,
    max: preset.max,
    message: preset.message,
    trustProxy: false,        // Explicitly disable trust proxy to avoid X-Forwarded-For validation
    standardHeaders: true,    // Return rate limit info in RateLimit-* headers
    legacyHeaders: false,     // Disable X-RateLimit-* headers
    keyGenerator: (req: any) => {
      // Use user ID if authenticated, otherwise use socket address
      // This bypasses X-Forwarded-For entirely for authenticated users
      if (req.user?.userId) {
        return `user:${req.user.userId}`;
      }
      // For unauthenticated requests, use direct IP (not X-Forwarded-For)
      return req.socket?.remoteAddress || 'unknown';
    },
    // Skip rate limiting for health checks
    skip: (req: any) => {
      return req.path === '/health' || req.path === '/api/v1/health';
    },
    // Handler when limit is exceeded
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: preset.message.message,
        retryAfter: Math.ceil(preset.windowMs / 1000),
      });
    },
  });
}

/**
 * Custom Rate Limiter
 * Create a custom rate limiter with specific configuration
 *
 * @param windowMs - Time window in milliseconds
 * @param max - Maximum requests allowed
 * @param message - Error message when limit exceeded
 * @returns Rate limit middleware
 */
export function createCustomRateLimiter(
  windowMs: number,
  max: number,
  message?: string
): RateLimitRequestHandler {
  const errorMessage = message || 'Too many requests, please try again later';

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: errorMessage,
    },
    trustProxy: false,        // Explicitly disable trust proxy to avoid X-Forwarded-For validation
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => {
      // Use user ID if authenticated, otherwise use socket address
      if (req.user?.userId) {
        return `user:${req.user.userId}`;
      }
      return req.socket?.remoteAddress || 'unknown';
    },
    handler: (req: any, res: any) => {
      res.status(429).json({
        success: false,
        message: errorMessage,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
}

// Export default rate limiter (user type)
export default rateLimiter;
