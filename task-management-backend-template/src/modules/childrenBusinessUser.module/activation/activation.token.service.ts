/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Activation Token Service - For Invitation Flow (LEARNING PURPOSE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Generate and verify activation tokens for invitation flow
 * 
 * This is a LEARNING IMPLEMENTATION - does NOT replace current flow
 * 
 * Features:
 * - Secure token generation (crypto random)
 * - Redis storage with TTL (24 hours)
 * - Token verification
 * - One-time use tokens
 *
 * Usage:
 *   const tokenService = new ActivationTokenService();
 *   
 *   // Generate token
 *   const token = await tokenService.generateToken(invitationData);
 *   
 *   // Verify token
 *   const data = await tokenService.verifyToken(token);
 *
 * @date 30-03-26
 * @author Qwen Code Assistant (Educational Implementation)
 */

import crypto from 'crypto';
import { redisClient } from '../../../helpers/redis/redis';
import { errorLogger, logger } from '../../../shared/logger';

export interface IActivationTokenData {
  email: string;
  name: string;
  businessUserId: string;
  childData: {
    phoneNumber?: string;
    location?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: string;
    supportMode?: 'calm' | 'encouraging' | 'logical';
  };
}

export class ActivationTokenService {
  private readonly TOKEN_PREFIX = 'activation:token:';
  private readonly TOKEN_TTL = 86400; // 24 hours in seconds

  constructor() {}

  /**
   * Generate secure activation token
   * 
   * @param data - Invitation data to store with token
   * @returns Plain text token (to be sent in email)
   * 
   * @example
   * const token = await tokenService.generateToken({
   *   email: 'alax@example.com',
   *   name: 'Alax Morgn',
   *   businessUserId: 'parent-id',
   *   childData: { ... }
   * });
   * 
   * // Token sent via email: "a1b2c3d4e5f6..."
   */
  async generateToken(data: IActivationTokenData): Promise<string> {
    try {
      // Generate cryptographically secure random token (64 chars)
      const token = crypto.randomBytes(32).toString('hex');
      
      // Store in Redis with 24h TTL
      const key = `${this.TOKEN_PREFIX}${token}`;
      
      await redisClient.setEx(
        key,
        this.TOKEN_TTL,
        JSON.stringify({
          ...data,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + this.TOKEN_TTL * 1000).toISOString(),
        })
      );

      logger.info(`Activation token generated for ${data.email}`);
      
      return token;
    } catch (error) {
      errorLogger.error('Token generation error:', error);
      throw new Error('Failed to generate activation token');
    }
  }

  /**
   * Verify activation token and retrieve stored data
   * 
   * @param token - Plain text token from email
   * @returns Stored invitation data if valid
   * @throws Error if token is invalid or expired
   * 
   * @example
   * try {
   *   const data = await tokenService.verifyToken('a1b2c3d4e5f6...');
   *   console.log('Token valid for:', data.email);
   * } catch (error) {
   *   console.error('Invalid token:', error.message);
   * }
   */
  async verifyToken(token: string): Promise<IActivationTokenData & { createdAt: string; expiresAt: string }> {
    try {
      const key = `${this.TOKEN_PREFIX}${token}`;
      
      // Get token data from Redis
      const tokenData = await redisClient.get(key);
      
      if (!tokenData) {
        throw new Error('Token is invalid or has expired');
      }

      const parsedData = JSON.parse(tokenData);
      
      logger.info(`Token verified for ${parsedData.email}`);
      
      return parsedData;
    } catch (error) {
      if (error instanceof Error && error.message === 'Token is invalid or has expired') {
        throw error;
      }
      
      errorLogger.error('Token verification error:', error);
      throw new Error('Failed to verify activation token');
    }
  }

  /**
   * Invalidate token (after successful activation)
   * 
   * @param token - Plain text token to invalidate
   * 
   * @example
   * await tokenService.invalidateToken('a1b2c3d4e5f6...');
   */
  async invalidateToken(token: string): Promise<void> {
    try {
      const key = `${this.TOKEN_PREFIX}${token}`;
      await redisClient.del(key);
      
      logger.info(`Activation token invalidated`);
    } catch (error) {
      errorLogger.error('Token invalidation error:', error);
      // Don't throw - invalidation failure shouldn't break activation
    }
  }

  /**
   * Check if token exists (without consuming it)
   * 
   * @param token - Plain text token to check
   * @returns true if token exists and is valid
   * 
   * @example
   * const isValid = await tokenService.tokenExists('a1b2c3d4e5f6...');
   */
  async tokenExists(token: string): Promise<boolean> {
    try {
      const key = `${this.TOKEN_PREFIX}${token}`;
      const tokenData = await redisClient.get(key);
      return !!tokenData;
    } catch (error) {
      errorLogger.error('Token existence check error:', error);
      return false;
    }
  }

  /**
   * Get token expiration info
   * 
   * @param token - Plain text token
   * @returns Expiration timestamp or null if token doesn't exist
   * 
   * @example
   * const expiresAt = await tokenService.getTokenExpiration('a1b2c3d4e5f6...');
   * if (expiresAt) {
   *   console.log('Token expires at:', expiresAt);
   * }
   */
  async getTokenExpiration(token: string): Promise<Date | null> {
    try {
      const key = `${this.TOKEN_PREFIX}${token}`;
      const tokenData = await redisClient.get(key);
      
      if (!tokenData) {
        return null;
      }

      const parsedData = JSON.parse(tokenData);
      return new Date(parsedData.expiresAt);
    } catch (error) {
      errorLogger.error('Token expiration check error:', error);
      return null;
    }
  }
}
