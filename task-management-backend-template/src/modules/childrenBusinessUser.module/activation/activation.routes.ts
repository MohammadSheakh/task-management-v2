/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Activation Routes - For Invitation Flow (LEARNING PURPOSE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Define routes for account activation
 * 
 * This is a LEARNING IMPLEMENTATION - does NOT replace current flow
 * 
 * Routes:
 * - POST /activate-account - Activate account with invitation token
 * - GET /invite/status/:token - Check invitation status
 *
 * @date 30-03-26
 * @author Qwen Code Assistant (Educational Implementation)
 */

import express from 'express';
import { activationController } from './activation.controller';
import { rateLimiter } from '../../../middlewares/rateLimiterRedis';

const router = express.Router();

const activationLimiter = rateLimiter('strict'); // 5 requests per hour

/*-─────────────────────────────────
|  Public | Activation | Activate account from invitation
|  @desc Child activates account using invitation token
|  @auth None (public endpoint)
|  @rateLimit 5 requests per hour (prevents brute force)
└──────────────────────────────────*/
router.post(
  '/activate-account',
  activationLimiter,
  activationController.activateAccount
);

/*-─────────────────────────────────
|  Public | Activation | Check invitation status
|  @desc Check if invitation is still valid
|  @auth None (public endpoint)
|  @rateLimit 10 requests per hour
└──────────────────────────────────*/
router.get(
  '/invite/status/:token',
  activationController.checkInvitationStatus
);

export const activationRoutes = router;
