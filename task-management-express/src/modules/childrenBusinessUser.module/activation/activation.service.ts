/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Activation Service - For Invitation Flow (LEARNING PURPOSE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Purpose: Handle account activation from invitation tokens
 * 
 * This is a LEARNING IMPLEMENTATION - does NOT replace current flow
 * 
 * Responsibilities:
 * - Verify activation tokens
 * - Create user accounts from invitations
 * - Hash passwords
 * - Auto-login after activation
 *
 * @date 30-03-26
 * @author Qwen Code Assistant (Educational Implementation)
 */

import { StatusCodes } from 'http-status-codes';
import { Types } from 'mongoose';
import ApiError from '../../../errors/ApiError';
import { User } from '../../user.module/user/user.model';
import { UserProfile } from '../../user.module/userProfile/userProfile.model';
import { ChildrenBusinessUser } from '../childrenBusinessUser.model';
import { CHILDREN_BUSINESS_USER_STATUS } from '../childrenBusinessUser.constant';
import { ActivationTokenService } from './activation.token.service';
import { TokenService } from '../../token/token.service';
import bcryptjs from 'bcryptjs';
import { logger, errorLogger } from '../../../shared/logger';

export interface IActivationData {
  token: string;
  password: string;
}

export class ActivationService {
  private tokenService: ActivationTokenService;

  constructor() {
    this.tokenService = new ActivationTokenService();
  }

  /**
   * Activate account from invitation token
   * 
   * @param activationData - Token and password
   * @returns User data and authentication tokens
   * 
   * @description
   * 1. Verify activation token
   * 2. Check email uniqueness
   * 3. Create UserProfile
   * 4. Create User account
   * 5. Create parent-child relationship
   * 6. Generate authentication tokens
   * 7. Invalidate activation token
   * 8. Return tokens (auto-login)
   */
  async activateAccount(activationData: IActivationData): Promise<{
    user: any;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  }> {
    const { token, password } = activationData;

    /*-─────────────────────────────────
    |  Step 1: Verify activation token
    └──────────────────────────────────*/
    let invitationData;
    try {
      invitationData = await this.tokenService.verifyToken(token);
    } catch (error) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Invalid or expired activation token. Please request a new invitation.'
      );
    }

    /*-─────────────────────────────────
    |  Step 2: Check if email already exists
    └──────────────────────────────────*/
    const existingUser = await User.findOne({
      email: invitationData.email.toLowerCase(),
      isDeleted: false,
    });

    if (existingUser) {
      // Token already used or email taken
      await this.tokenService.invalidateToken(token);
      
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'This invitation has already been used or the email is taken.'
      );
    }

    /*-─────────────────────────────────
    |  Step 3: Hash password
    └──────────────────────────────────*/
    const hashedPassword = await bcryptjs.hash(password, 12);

    /*-─────────────────────────────────
    |  Step 4: Create UserProfile
    └──────────────────────────────────*/
    const userProfile = await UserProfile.create({
      acceptTOC: true, // Auto-accept for invited accounts
      supportMode: invitationData.childData.supportMode || 'calm',
      location: invitationData.childData.location,
      dob: invitationData.childData.dateOfBirth 
        ? new Date(invitationData.childData.dateOfBirth) 
        : undefined,
      gender: invitationData.childData.gender,
    });

    /*-─────────────────────────────────
    |  Step 5: Create User account
    └──────────────────────────────────*/
    const user = await User.create({
      name: invitationData.name,
      email: invitationData.email.toLowerCase(),
      password: hashedPassword,
      phoneNumber: invitationData.childData.phoneNumber,
      role: 'child',
      accountCreatorId: new Types.ObjectId(invitationData.businessUserId),
      profileId: userProfile._id,
      subscriptionType: 'none',
      isEmailVerified: true, // ✅ Auto-verify since they clicked invitation link
      preferredTime: '07:00',
    });

    /*-─────────────────────────────────
    |  Step 6: Create parent-child relationship
    └──────────────────────────────────*/
    await ChildrenBusinessUser.create({
      parentBusinessUserId: new Types.ObjectId(invitationData.businessUserId),
      childUserId: user._id,
      addedBy: new Types.ObjectId(invitationData.businessUserId),
      status: CHILDREN_BUSINESS_USER_STATUS.ACTIVE,
      isSecondaryUser: false,
    });

    /*-─────────────────────────────────
    |  Step 7: Generate authentication tokens (auto-login)
    └──────────────────────────────────*/
    const tokens = await TokenService.accessAndRefreshToken(user);

    /*-─────────────────────────────────
    |  Step 8: Invalidate activation token
    └──────────────────────────────────*/
    await this.tokenService.invalidateToken(token);

    logger.info(`Account activated successfully: ${invitationData.email}`);

    /*-─────────────────────────────────
    |  Step 9: Return user and tokens
    └──────────────────────────────────*/
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      tokens,
    };
  }

  /**
   * Check invitation status
   * 
   * @param token - Activation token
   * @returns Invitation status and details
   */
  async checkInvitationStatus(token: string): Promise<{
    status: 'pending' | 'activated' | 'expired';
    email: string;
    name: string;
    expiresAt?: string;
  }> {
    const tokenExists = await this.tokenService.tokenExists(token);

    if (!tokenExists) {
      // Token doesn't exist - could be expired or already used
      return {
        status: 'expired',
        email: '',
        name: '',
      };
    }

    const tokenData = await this.tokenService.verifyToken(token);
    const expiresAt = await this.tokenService.getTokenExpiration(token);

    return {
      status: 'pending',
      email: tokenData.email,
      name: tokenData.name,
      expiresAt: expiresAt?.toISOString(),
    };
  }
}
