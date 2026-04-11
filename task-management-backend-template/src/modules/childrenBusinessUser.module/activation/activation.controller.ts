/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Activation Controller - For Invitation Flow (LEARNING PURPOSE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Handle HTTP requests for account activation
 * 
 * This is a LEARNING IMPLEMENTATION - does NOT replace current flow
 * 
 * Endpoints:
 * - POST /activate-account - Activate account with token
 * - GET /invite/status/:token - Check invitation status
 *
 * @date 30-03-26
 * @author Qwen Code Assistant (Educational Implementation)
 */

import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';
import { ActivationService } from './activation.service';
import { IActivateAccountBody } from '../childrenBusinessUser.interface';

export class ActivationController {
  private service: ActivationService;

  constructor() {
    this.service = new ActivationService();
  }

  /**
   * Activate account from invitation
   * POST /activate-account
   * 
   * @description
   * Child clicks invitation link → Sets password → Account activated → Auto-login
   * 
   * @public (no authentication required)
   */
  activateAccount = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Extract token and password
    └──────────────────────────────────*/
    const { token, password } = req.body as IActivateAccountBody;

    /*-─────────────────────────────────
    |  Step 2: Validate input
    └──────────────────────────────────*/
    if (!token || !password) {
      return sendResponse(res, {
        code: StatusCodes.BAD_REQUEST,
        message: 'Token and password are required',
        data: null,
        success: false,
      });
    }

    if (password.length < 8) {
      return sendResponse(res, {
        code: StatusCodes.BAD_REQUEST,
        message: 'Password must be at least 8 characters long',
        data: null,
        success: false,
      });
    }

    /*-─────────────────────────────────
    |  Step 3: Activate account
    └──────────────────────────────────*/
    const result = await this.service.activateAccount({ token, password });

    /*-─────────────────────────────────
    |  Step 4: Send success response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      message: 'Account activated successfully! You are now logged in.',
      data: result,
      success: true,
    });
  });

  /**
   * Check invitation status
   * GET /invite/status/:token
   * 
   * @description
   * Check if invitation is still valid (not expired or used)
   * 
   * @public (no authentication required)
   */
  checkInvitationStatus = catchAsync(async (req: Request, res: Response) => {
    /*-─────────────────────────────────
    |  Step 1: Get token from params
    └──────────────────────────────────*/
    const { token } = req.params;

    if (!token) {
      return sendResponse(res, {
        code: StatusCodes.BAD_REQUEST,
        message: 'Token is required',
        data: null,
        success: false,
      });
    }

    /*-─────────────────────────────────
    |  Step 2: Check status
    └──────────────────────────────────*/
    const status = await this.service.checkInvitationStatus(token);

    /*-─────────────────────────────────
    |  Step 3: Send response
    └──────────────────────────────────*/
    sendResponse(res, {
      code: StatusCodes.OK,
      message: `Invitation status: ${status.status}`,
      data: status,
      success: true,
    });
  });
}

export const activationController = new ActivationController();
