import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Secret } from 'jsonwebtoken';
import { roleRights, TRole } from './roles';
import { User } from '../modules/user.module/user/user.model';
import ApiError from '../errors/ApiError';
import catchAsync from '../shared/catchAsync';
import { config } from '../config';
import { TokenType } from '../modules/token/token.interface';
import { TokenService } from '../modules/token/token.service';
import { IUser } from '../modules/user.module/user/user.interface';
import { IUserProfile } from '../modules/user.module/userProfile/userProfile.interface';
import { UserProfile } from '../modules/user.module/userProfile/userProfile.model';
import sendResponse from '../shared/sendResponse';
import { redisClient } from '../helpers/redis/redis';
import { logger, errorLogger } from '../shared/logger';


const auth = (...roles: TRole[]/******** Previously it was string[] */) =>
  catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    // Step 1: Get Authorization Header
    const tokenWithBearer = req.headers.authorization;
    if (!tokenWithBearer) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }
    if (tokenWithBearer.startsWith('Bearer')) {
      const token = tokenWithBearer.split(' ')[1];

      // Step 2: Verify Token
      try {
        const verifyUser = await TokenService.verifyToken(
          token,
          config.jwt.accessSecret as Secret,
          TokenType.ACCESS
        );
        // Step 3: Attach user to the request object
        req.user = verifyUser;

        /*-─────────────────────────────────
        |  V2: Redis Session-First Auth (Fast Path)
        |  Priority: Redis session → MongoDB fallback
        |  Goal: Skip DB calls on every authenticated request
        └──────────────────────────────────*/

        // Extract fcmToken from request headers for session key construction
        const fcmToken = req.headers['x-fcm-token'] as string | undefined;
        const sessionKey = `session:${verifyUser.userId}:${fcmToken || 'web'}`;

        // ── Fast Path: Try Redis session first ──
        let sessionHit = false;

        try {
          const sessionData = await redisClient.get(sessionKey);

          if (sessionData) {
            // Session found in Redis — attach enriched data and skip DB
            const parsedSession = JSON.parse(sessionData);
            req.user = { ...verifyUser, ...parsedSession };
            sessionHit = true;
          }
        } catch (redisError) {
          // Redis unavailable — fall through to MongoDB fallback
          errorLogger.error('Redis session lookup failed, falling back to DB:', redisError);
        }

        // ── Fallback Path: MongoDB (when Redis miss or Redis down) ──
        if (!sessionHit) {
          // TODO : MUST :: now userProfile does not contain information about approvalStatus and status
          const user: IUser = await User.findById(verifyUser?.userId);

          if (!user) {
            // user not found
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized.');
          }

          if (user.isDeleted === true) {
            throw new ApiError(StatusCodes.UNAUTHORIZED, 'Your account is deleted. Please create a new account.');
          }

          // SO ... FIx this ..
          const userProfile: IUserProfile = await UserProfile.findById(user?.profileId);

          if (!userProfile) {
            // User profile not found. Please Log In again.
            throw new ApiError(StatusCodes.BAD_REQUEST, 'You are not authorized.');
          }

          // Enrich req.user with DB data for downstream controllers
          req.user = {
            ...verifyUser,
            userId: user._id,
            email: user.email,
            role: user.role,
            name: user.name,
          };
        }

        // Step 5: Role-based Authorization
        if (roles.length) {
          const userRole = roleRights.get(verifyUser?.role);
          const hasRole = userRole?.some(role => roles.includes(role));
          if (!hasRole) {
            throw new ApiError(
              StatusCodes.FORBIDDEN,
              `You don't have permission to access this API ${verifyUser.name} | ${verifyUser.userId} | ${verifyUser.role} | ${req.originalUrl}`
            );
          }
        }

        next();
      } catch (error: any) {
        // ✅ Handle JWT verification errors with sendResponse format
        if (error.name === 'TokenExpiredError') {
          return sendResponse(res, {
            code: StatusCodes.UNAUTHORIZED,
            message: 'Your session has expired. Please log in again.',
            success: false,
            data: null,
          });
        }

        if (error.name === 'JsonWebTokenError') {
          return sendResponse(res, {
            code: StatusCodes.UNAUTHORIZED,
            message: 'Invalid authentication token.',
            success: false,
            data: null,
          });
        }

        // Re-throw other errors to be handled by global error handler
        throw error;
      }
    } else {
      // If the token format is incorrect
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'You are not authorized');
    }
  });

export default auth;
