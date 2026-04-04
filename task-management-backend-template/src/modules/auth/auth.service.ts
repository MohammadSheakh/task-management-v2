/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Auth Service - Authentication & Authorization Business Logic
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * OTP Implementation: ✅ Using Redis-based OtpV2WithRedis
 * 
 * Features:
 * - User registration with email verification
 * - Login with JWT tokens (access + refresh)
 * - OAuth integration (Google, Apple)
 * - Password management (reset, change)
 * - Session management (Redis caching)
 * - Token rotation and blacklisting
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

//@ts-ignore
import moment from 'moment';
//@ts-ignore
import mongoose from "mongoose";
import ApiError from '../../errors/ApiError';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';
//@ts-ignore
import bcryptjs from 'bcryptjs';
import { config } from '../../config';
import { TokenService } from '../token/token.service';
import { TokenType } from '../token/token.interface';
import { OtpV2WithRedis } from '../otp/otp-v2.service';

//@ts-ignore
import { OAuth2Client } from 'google-auth-library';
//@ts-ignore
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
//@ts-ignore
import appleSignin from 'apple-signin-auth';
//@ts-ignore
import jwt, { Secret } from 'jsonwebtoken';

//@ts-ignore
import EventEmitter from 'events';
// import { enqueueWebNotification } from '../../services/notification.service'; // ❌ Deprecated - migrated to notification.module
import { TRole } from '../../middlewares/roles';
// import { TNotificationType } from '../notification/notification.constants'; // ❌ Deprecated - migrated to notification.module
import { UserProfile } from '../user.module/userProfile/userProfile.model';
import { User } from '../user.module/user/user.model';
import { UserDevices } from '../user.module/userDevices/userDevices.model';
import { IUserDevices } from '../user.module/userDevices/userDevices.interface';
import { UserRoleDataService } from '../user.module/userRoleData/userRoleData.service';
import { IUser } from '../user.module/user/user.interface';
import { ICreateUser, IGoogleLoginPayload } from './auth.interface';
import { OAuthAccount } from '../user.module/oauthAccount/oauthAccount.model';
import { TAuthProvider } from './auth.constants';
import { redisClient } from '../../helpers/redis/redis';
import { logger, errorLogger } from '../../shared/logger';
import { AUTH_SESSION_CONFIG } from './auth.constants';
import { OAuthAccountService } from '../user.module/oauthAccount/oauthAccount.service';
import { Token } from '../token/token.model';
import { UserSubscription } from '../subscription.module/userSubscription/userSubscription.model';

// ═══════════════════════════════════════════════════════════════════════════════
// Service Instances
// ═══════════════════════════════════════════════════════════════════════════════
const oAuthAccountService = new OAuthAccountService();
const otpService = new OtpV2WithRedis(); // ✅ Redis-based OTP service

const eventEmitterForUpdateUserProfile = new EventEmitter(); // functional way
const eventEmitterForCreateWallet = new EventEmitter();


let userRoleDataService = new UserRoleDataService();

eventEmitterForUpdateUserProfile.on('eventEmitterForUpdateUserProfile', async (valueFromRequest: any) => {
  try {
      const { userProfileId, userId } = valueFromRequest;
      await UserProfile.findByIdAndUpdate(userProfileId, { userId });
    }catch (error) {
      console.error('Error occurred while handling token creation and deletion:', error);
    }
});

export default eventEmitterForUpdateUserProfile;


eventEmitterForCreateWallet.on('eventEmitterForCreateWallet', async (valueFromRequest: any) => {
  try {
      const { userId } = valueFromRequest;
      
    }catch (error) {
      console.error('Error occurred while handling token creation and deletion:', error);
    }
});

const validateUserStatus = (user: IUser) => {
  if (user.isDeleted) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Your account has been deleted. Please contact support',
    );
  }
};

// 💎✨🔍 -> V2 Found
const createUser = async (userData: ICreateUser, userProfileId:string) => {

  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
    } else {
      await User.findOneAndUpdate({ email: userData.email }, userData);

      //create verification email token
      const verificationToken =
        await TokenService.createVerifyEmailToken(existingUser);
      
      // ✅ Create verification email OTP (Redis-based)
      await otpService.sendVerificationOtp(existingUser.email);
      
      return { verificationToken };
    }
  }

  userData.password = await bcryptjs.hash(userData.password, 12);

  const user = await User.create(userData);

  // 📈⚙️ OPTIMIZATION: with event emitter
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId,
    userId : user._id
  });

  // ✅ Create verification token and OTP in parallel (Redis-based)
  const [verificationToken] = await Promise.all([
    TokenService.createVerifyEmailToken(user),
    otpService.sendVerificationOtp(user.email)
  ]);

  return { user, verificationToken };
};

 /*-─────────────────────────────────
  |
  └──────────────────────────────────*/
  /*-------------------------------

  1. check for user object by email
      |-> if user exist.. check for isEmailVerified
      |-> if not verified .. send otp and verification token
  2. hash the given password
  3. create the User
  4. use eventEmitter to add userProfileId to User Table [🎯Optimized]

  5. if not patient
      |-> use eventEmitter to create wallet
      |-> send notification to admin
      |-> return user

  6.  if patient [🐛]
      |->  create verificationEmailToken(createdUser)
      |-> create otp and send mail by eventEmitter
          [🎯Optimized]
      |-> return user

  ---------------------------------*/
const createUserV2 = async (userData: ICreateUser, userProfileId:string) => {

  const existingUser = await User.findOne({ email: userData.email });

  if (existingUser) {
    if (existingUser.isEmailVerified) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
    } else {
      await User.findOneAndUpdate({ email: userData.email }, userData);

      //create verification email token
      const verificationToken =
        await TokenService.createVerifyEmailToken(existingUser);

      // 🆕 DEFENSIVE: Clear stale OTP data before sending new OTP (fixes re-registration issue)
      await otpService.clearOtpData(existingUser.email);
      
      // ✅ Create verification email OTP (Redis-based)
      await otpService.sendVerificationOtp(existingUser.email);

      return { verificationToken };
    }
  }

  userData.password = await bcryptjs.hash(userData.password, 12);

  const user = await User.create(userData);

  /*-─────────────────────────────────
  | TODO : use redis bullmq
  └──────────────────────────────────*/
  // 📈⚙️ OPTIMIZATION: with event emitter
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId,
    userId : user._id
  });

  // 🆕 DEFENSIVE: Clear any stale OTP data before sending new OTP (fixes re-registration issue)
  await otpService.clearOtpData(user.email);

  // ✅ Create verification token and OTP in parallel (Redis-based)
  const [verificationToken] = await Promise.all([
    TokenService.createVerifyEmailToken(user),
    otpService.sendVerificationOtp(user.email)
  ]);

  return { user, verificationToken };
};

// local login // 💎✨🔍 -> V2 Found
const login = async (email: string,
  reqpassword: string,
  fcmToken? : string,
  deviceInfo?: { deviceType?: string, deviceName?: string }
) => {
  const user:IUser = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.isDeleted == true) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Your account is deleted. Please create a new account.');
  }

  validateUserStatus(user);

  // ✅ Enforce email verification before login
  if (!user.isEmailVerified) {
    // ✅ Create verification token and OTP for user to verify email (Redis-based)
    await Promise.all([
      TokenService.createVerifyEmailToken(user),
      otpService.sendVerificationOtp(user.email)
    ]);

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your email before logging in. A verification OTP has been sent to your email.',
    );
  }

  const isPasswordValid = await bcryptjs.compare(reqpassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  /*---------------------------------------
  if (!isPasswordValid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= config.auth.maxLoginAttempts) {
      user.lockUntil = moment().add(config.auth.lockTime, 'minutes').toDate();
      await user.save();
      throw new ApiError(
        423,
        `Account locked for ${config.auth.lockTime} minutes due to too many failed attempts`,
      );
    }

    await user.save();
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.failedLoginAttempts > 0) {
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();
  }

  -------------------------------------------*/

  const tokens = await TokenService.accessAndRefreshToken(user);

  // ✅ Save FCM token in UserDevices
  if (fcmToken) {
    const deviceType = deviceInfo?.deviceType || 'web';
    const deviceName = deviceInfo?.deviceName || 'Unknown Device';

    // Find or create device record
    let device:IUserDevices | any = await UserDevices.findOne({
      userId: user._id,
      fcmToken,
    });

    if (!device) {
      device = await UserDevices.create({
        userId: user._id,
        fcmToken,
        deviceType,
        deviceName,
        lastActive: new Date(),
      });
    } else {
      // Update last active
      device.lastActive = new Date();
      await device.save();
    }
  }

  const { password, ...userWithoutPassword } = user.toObject();

  return {
    userWithoutPassword,
    tokens
  };
};

/*------------------ 🆕
1. find user by email
2. validateUserStatus // check for isDeleted
3. handle account logged case [rate limit]
4. check password maching
    -----------------------------
    * get hashed password and salt for user from database
    * hashedPassword = bcrypt( intput password + salt)
    * if matched then login successful
    -------------------------
5. |-> for failed attempt lock account for some time
6. if password matched ...
7. return proper response based on role
8. if everything is ok .. then return accessTokens

    -------------------
    * token generator will generate
    - access token and refresh token

-------------------*/
const loginV2 = async (email: string,
  reqpassword: string,
  fcmToken? : string,
  deviceInfo?: { deviceType?: string, deviceName?: string }
) => {
  const user:IUser = await User.findOne({ email }).select('+password');

  console.log(user)
  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.isDeleted == true) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Your account is deleted. Please create a new account.');
  }

  validateUserStatus(user);

  // ✅ Enforce email verification before login
  if (!user.isEmailVerified) {
    // ✅ Create verification token and OTP for user to verify email (Redis-based)
    await Promise.all([
      TokenService.createVerifyEmailToken(user),
      otpService.sendVerificationOtp(user.email)
    ]);

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your email before logging in. A verification OTP has been sent to your email.',
    );
  }

  const isPasswordValid = await bcryptjs.compare(reqpassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  // 🆕 NEW: Clear any remaining cooldown on successful login (improves UX)
  try {
    await otpService.clearCooldown(user.email);
  } catch (error) {
    // Don't fail login if cooldown clear fails
    errorLogger.error('Failed to clear cooldown on login:', error);
  }

  const tokens = await TokenService.accessAndRefreshToken(user);

  // ✅ Save FCM token in UserDevices
  if (fcmToken) {
    const deviceType = deviceInfo?.deviceType || 'web';
    const deviceName = deviceInfo?.deviceName || 'Unknown Device';

    // Find or create device record
    let device:IUserDevices | any = await UserDevices.findOne({
      userId: user._id,
      fcmToken,
    });

    if (!device) {
      device = await UserDevices.create({
        userId: user._id,
        fcmToken,
        deviceType,
        deviceName,
        lastActive: new Date(),
      });
    } else {
      // Update last active
      device.lastActive = new Date();
      await device.save();
    }
  }

  // 🔒 REDIS SESSION CACHING
  // Cache user session for faster subsequent requests
  try {
    const sessionKey = `session:${user._id}:${fcmToken || 'web'}`;
    const sessionData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fcmToken,
      deviceType: deviceInfo?.deviceType || 'web',
      deviceName: deviceInfo?.deviceName || 'Unknown Device',
      loginAt: new Date(),
    };
    
    // Cache session for 7 days (matches refresh token expiry)
    await redisClient.setEx(
      sessionKey,
      AUTH_SESSION_CONFIG.SESSION_TTL,
      JSON.stringify(sessionData)
    );
    
    logger.info(`Session cached for user ${user._id} (${sessionKey})`);
  } catch (error) {
    errorLogger.error('Failed to cache session:', error);
    // Don't throw - login should succeed even if caching fails
  }

  const { password, ...userWithoutPassword } = user.toObject();

  return {
    userWithoutPassword,
    tokens
  };
};

//[🚧][🧑‍💻✅][🧪]  // 🆗
const verifyEmail = async (email: string, token: string, otp: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  /*-─────────────────────────────────
  |  V2: Dynamic token type detection
  |  Handles both VERIFY (registration) and RESET_PASSWORD (forgot-password)
  |  tokens through the same /verify-email endpoint
  └──────────────────────────────────*/
  const { decoded, tokenType } = await TokenService.verifyTokenByType(
    token,
    config.token.TokenSecret,
  );

  // ── Branch based on token type ──
  if (tokenType === TokenType.RESET_PASSWORD) {
    // Forgot-password flow: verify + consume OTP here (user enters it at /verify-email)
    await otpService.verifyResetPasswordOtp(user.email, otp);

    user.isEmailVerified = true;
    await user.save();
    return { user, tokens: null, isPasswordResetFlow: true };
  }

  // Registration flow: verify OTP, clear cooldown, issue login tokens
  await otpService.verifyOtp(user.email, otp);
  await otpService.clearCooldown(user.email);

  user.isEmailVerified = true;
  await user.save();

  const tokens = await TokenService.accessAndRefreshToken(user);
  return { user, tokens };
};

const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // ✅ Invalidate all sessions when password reset is requested (security)
  try {
    const sessionPattern = `session:${user._id}:*`;
    const keys = await redisClient.keys(sessionPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`All sessions invalidated for user ${user._id} after forgot password request`);
    }
  } catch (error) {
    errorLogger.error('Session invalidation error in forgotPassword:', error);
    // Don't throw - forgot password should succeed even if session cleanup fails
  }

  // ✅ Create reset password token and OTP (Redis-based)
  const resetPasswordToken = await TokenService.createResetPasswordToken(user);
  await otpService.sendResetPasswordOtp(user.email);
  
  user.isResetPassword = true;
  user.lastPasswordChange = new Date();  // ✅ Track password change request
  await user.save();

  return { resetPasswordToken };
};

const resendOtp = async (email: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  if (user?.isResetPassword) {
    const resetPasswordToken =
      await TokenService.createResetPasswordToken(user);
    
    // 🆕 DEFENSIVE: Clear stale OTP data before sending new OTP
    await otpService.clearOtpData(user.email);
    
    await otpService.sendResetPasswordOtp(user.email);
    return { resetPasswordToken };
  }
  
  const verificationToken = await TokenService.createVerifyEmailToken(user);
  
  // 🆕 DEFENSIVE: Clear stale OTP data before sending new OTP
  await otpService.clearOtpData(user.email);
  
  await otpService.sendVerificationOtp(user.email);
  return { verificationToken };
};

const resetPassword = async (
  email: string,
  newPassword: string,
  otp: string,
) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  /*-─────────────────────────────────
  |  V2: OTP already consumed in /verify-email
  |  This endpoint only updates the password
  |  Security: user.isResetPassword flag set by /forgot-password
  └──────────────────────────────────*/
  // OTP was already verified and deleted in /verify-email step
  // No need to verify again here — the isResetPassword flag gates access

  user.password =  await bcryptjs.hash(newPassword, 12);
  user.lastPasswordChange = new Date();  // ✅ Track password change
  user.isResetPassword = false;
  await user.save();

  // ✅ Invalidate all sessions after password reset (security)
  try {
    const sessionPattern = `session:${user._id}:*`;
    const keys = await redisClient.keys(sessionPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`All sessions invalidated for user ${user._id} after password reset`);
    }
  } catch (error) {
    errorLogger.error('Session invalidation error in resetPassword:', error);
    // Don't throw - password reset should succeed even if session cleanup fails
  }

  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string,
) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  const isPasswordValid = await bcryptjs.compare(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Password is incorrect');
  }

  user.password = await bcryptjs.hash(newPassword, 12);
  user.lastPasswordChange = new Date();  // ✅ Track password change
  await user.save();
  
  // ✅ Invalidate all sessions after password change (security)
  try {
    const sessionPattern = `session:${user._id}:*`;
    const keys = await redisClient.keys(sessionPattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`All sessions invalidated for user ${user._id} after password change`);
    }
    
    // Also blacklist all refresh tokens
    await Token.deleteMany({ user: userId, type: TokenType.REFRESH });
    logger.info(`All refresh tokens revoked for user ${user._id}`);
  } catch (error) {
    errorLogger.error('Session invalidation error in changePassword:', error);
    // Don't throw - password change should succeed even if session cleanup fails
  }
  
  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};
/**
 * Logout user
 * - Blacklist the refresh token
 * - Remove user session from Redis cache
 * - Optionally clear all user devices (for "logout from all devices")
 */
const logout = async (
  refreshToken: string,
  userId?: string,
  fcmToken?: string,
  logoutFromAllDevices: boolean = false
) => {
  try {
    // Step 1: Verify the refresh token and add to blacklist
    if (refreshToken) {
      const decoded = jwt.verify(
        refreshToken,
        config.jwt.refreshSecret as Secret
      ) as jwt.JwtPayload;

      // Blacklist the refresh token in Redis
      const blacklistKey = `blacklist:${refreshToken}`;
      const tokenExpiry = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL;
      
      await redisClient.setEx(
        blacklistKey,
        Math.min(tokenExpiry, AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL),
        'blacklisted'
      );

      logger.info(`Token blacklisted for user ${decoded.userId}`);
    }

    // Step 2: Remove user session from Redis cache
    if (userId) {
      // Remove session cache for this user
      const sessionPattern = fcmToken 
        ? `session:${userId}:${fcmToken}`
        : `session:${userId}:*`;
      
      const keys = await redisClient.keys(sessionPattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        logger.info(`Session cache cleared for user ${userId}`);
      }
    }

    // Step 3: Optionally logout from all devices
    if (logoutFromAllDevices && userId) {
      await UserDevices.deleteMany({ userId: new mongoose.Types.ObjectId(userId) });
      logger.info(`All devices logged out for user ${userId}`);
    } else if (fcmToken && userId) {
      // Remove only the current device
      await UserDevices.deleteOne({ 
        userId: new mongoose.Types.ObjectId(userId),
        fcmToken 
      });
      logger.info(`Device logged out for user ${userId}`);
    }

    return { success: true };
  } catch (error) {
    errorLogger.error('Logout error:', error);
    // Don't throw - logout should succeed even if blacklist fails
    return { success: true };
  }
};

/**
 * Refresh access token using refresh token
 * - Verify refresh token
 * - Check if token is blacklisted
 * - Generate new access and refresh token pair
 * - Blacklist old refresh token (token rotation)
 */
const refreshAuth = async (refreshToken: string) => {
  try {
    if (!refreshToken) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Refresh token is required');
    }

    // Step 1: Check if token is blacklisted in Redis
    const blacklistKey = `blacklist:${refreshToken}`;
    const isBlacklisted = await redisClient.get(blacklistKey);
    
    if (isBlacklisted) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED, 
        'Refresh token has been revoked. Please login again.'
      );
    }

    // Step 2: Verify the refresh token
    const decoded = jwt.verify(
      refreshToken,
      config.jwt.refreshSecret as Secret
    ) as jwt.JwtPayload & { userId: string; email: string; role: string };

    // Step 3: Check if user exists and is active
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found');
    }

    if (user.isDeleted) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User account is deleted');
    }

    // Step 4: Verify token type in database
    const tokenDoc = await Token.findOne({
      token: refreshToken,
      user: user._id,
      type: TokenType.REFRESH,
    });

    if (!tokenDoc) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED, 
        'Invalid refresh token. Please login again.'
      );
    }

    if (tokenDoc.expiresAt < new Date()) {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED, 
        'Refresh token has expired. Please login again.'
      );
    }

    // Step 5: Generate new access and refresh token pair (token rotation)
    const tokens = await TokenService.accessAndRefreshToken(user);

    // Step 6: Blacklist old refresh token (prevent reuse)
    const oldTokenExpiry = tokenDoc.expiresAt.getTime() - Date.now();
    const oldTokenTTL = Math.max(0, Math.floor(oldTokenExpiry / 1000));
    
    if (oldTokenTTL > 0) {
      await redisClient.setEx(
        blacklistKey,
        Math.min(oldTokenTTL, AUTH_SESSION_CONFIG.TOKEN_BLACKLIST_TTL),
        'blacklisted'
      );
    }

    // Step 7: Delete old refresh token from database
    await Token.deleteOne({ token: refreshToken });

    logger.info(`Token refreshed for user ${user._id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  } catch (error) {
    errorLogger.error('Refresh token error:', error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if ((error as any).name === 'TokenExpiredError') {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED, 
        'Refresh token has expired. Please login again.'
      );
    }
    
    if ((error as any).name === 'JsonWebTokenError') {
      throw new ApiError(
        StatusCodes.UNAUTHORIZED, 
        'Invalid refresh token. Please login again.'
      );
    }
    
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Failed to refresh token'
    );
  }
};


// -- we need to move these to OAuth modules
const googleLogin = async ({ idToken, role, acceptTOC }: IGoogleLoginPayload) => {

  // Step 1: Verify Google token
  const ticket = await googleClient.verifyIdToken({
    idToken,
    //@ts-ignore
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload) throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Google token');

  const { sub: providerId, email, name, picture } = payload;
  if (!email) throw new ApiError(StatusCodes.BAD_REQUEST, 'Email not provided by Google');

  // Step 2: Check if OAuth account already exists
  let oAuthAccount = await OAuthAccount.findOne({
    authProvider: TAuthProvider.google,
    providerId,
    isDeleted: false,
  });

  if (oAuthAccount) {
    // ─── Returning OAuth user ───
    const user = await User.findById(oAuthAccount.userId);
    if (!user || user.isDeleted) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account not found or deleted');
    }

    // ✅ Update token (encrypted)
    await oAuthAccountService.updateOAuthTokens(oAuthAccount._id, idToken);

    const tokens = TokenService.accessAndRefreshToken(user);
    return { user, ...tokens };
  }

  // Step 3: No OAuth account — check if user exists by email
  let user = await User.findOne({ email, isDeleted: false });

  if (user) {
    // ─── Existing local user — LINK OAuth account ───
    if (!user.isEmailVerified) {
      // Auto-verify since Google confirmed the email
      await User.findByIdAndUpdate(user._id, { isEmailVerified: true });
      user.isEmailVerified = true;
    }

    // ✅ Create OAuth account with encrypted token
    await oAuthAccountService.createOAuthAccount(
      user._id,
      TAuthProvider.google,
      providerId,
      email,
      idToken,
      true,
    );

    const tokens = TokenService.accessAndRefreshToken(user);
    return { user, ...tokens, isLinked: true };
  }

  // Step 4: Brand new user — register via Google
  if (!role) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Role is required for new Google signup');
  }
  if (!acceptTOC) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You must accept Terms and Conditions');
  }

  // Create profile
  const userProfile = await UserProfile.create({ acceptTOC: true });

  // Create user (no password needed)
  const newUser = await User.create({
    name: name || email.split('@')[0],
    email,
    role,
    profileId: userProfile._id,
    isEmailVerified: true, // Google already verified
    authProvider: TAuthProvider.google,
    profileImage: picture ? { imageUrl: picture } : undefined,
  });

  // Link profile back
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId: userProfile._id,
    userId: newUser._id,
  });

  // ✅ Create OAuth account with encrypted token
  await oAuthAccountService.createOAuthAccount(
    newUser._id,
    TAuthProvider.google,
    providerId,
    email,
    idToken,
    true,
  );

  const tokens = TokenService.accessAndRefreshToken(newUser);
  return { user: newUser, ...tokens, isNewUser: true };
};


const appleLogin = async ({ idToken, role, acceptTOC }: IGoogleLoginPayload) => {

  // Apple-specific token verification
  const applePayload = await appleSignin.verifyIdToken(idToken, {
    audience: process.env.APPLE_CLIENT_ID,
    ignoreExpiration: false,
  });

  const { sub: providerId, email } = applePayload;
  // ⚠️ Apple only sends email on FIRST login — after that it's null
  // So you MUST store it in OAuthAccount on first login

  if (!email) throw new ApiError(StatusCodes.BAD_REQUEST, 'Email not provided by Apple');

  // Step 2: Check if OAuth account already exists (using Apple provider)
  let oAuthAccount = await OAuthAccount.findOne({
    authProvider: TAuthProvider.apple,  // ✅ FIXED: Was TAuthProvider.google
    providerId,
    isDeleted: false,
  });

  if (oAuthAccount) {
    // ─── Returning Apple OAuth user ───
    const user = await User.findById(oAuthAccount.userId);
    if (!user || user.isDeleted) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Account not found or deleted');
    }

    // ✅ Update token (encrypted)
    await oAuthAccountService.updateOAuthTokens(oAuthAccount._id, idToken);

    const tokens = TokenService.accessAndRefreshToken(user);
    return { user, ...tokens };
  }

  // Step 3: No OAuth account — check if user exists by email
  let user = await User.findOne({ email, isDeleted: false });

  if (user) {
    // ─── Existing local user — LINK Apple OAuth account ───
    if (!user.isEmailVerified) {
      // Auto-verify since Apple confirmed the email
      await User.findByIdAndUpdate(user._id, { isEmailVerified: true });
      user.isEmailVerified = true;
    }

    // ✅ Create OAuth account with encrypted token
    await oAuthAccountService.createOAuthAccount(
      user._id,
      TAuthProvider.apple,
      providerId,
      email,
      idToken,
      true,
    );

    const tokens = TokenService.accessAndRefreshToken(user);
    return { user, ...tokens, isLinked: true };
  }

  // Step 4: Brand new user — register via Apple
  if (!role) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Role is required for new Apple signup');
  }
  if (!acceptTOC) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'You must accept Terms and Conditions');
  }

  // Create profile
  const userProfile = await UserProfile.create({ acceptTOC: true });

  // Create user (no password needed)
  const newUser = await User.create({
    name: email.split('@')[0], // Apple doesn't provide name in token, use email prefix
    email,
    role,
    profileId: userProfile._id,
    isEmailVerified: true, // Apple already verified
    authProvider: TAuthProvider.apple,  // ✅ FIXED: Was TAuthProvider.google
  });

  // Link profile back
  eventEmitterForUpdateUserProfile.emit('eventEmitterForUpdateUserProfile', {
    userProfileId: userProfile._id,
    userId: newUser._id,
  });

  // ✅ Create OAuth account with encrypted token
  await oAuthAccountService.createOAuthAccount(
    newUser._id,
    TAuthProvider.apple,
    providerId,
    email,
    idToken,
    true,
  );

  const tokens = TokenService.accessAndRefreshToken(newUser);
  return { user: newUser, ...tokens, isNewUser: true };
};

/**
 * Login for Individual User (Mobile App)
 * Returns user info with subscription status and support style status
 *
 * Flow:
 * 1. Authenticate user with email/password
 * 2. Fetch user's active subscription from UserSubscription
 * 3. Check if supportMode is set in UserProfile
 * 4. Return user data with isSubscribed and isSupportStyleSet flags
 *
 * @param email - User email
 * @param password - User password
 * @param fcmToken - Optional FCM token for push notifications
 * @param deviceInfo - Optional device information
 * @returns User data with subscription and support style status
 */
const loginIndividualUser = async (
  email: string,
  reqpassword: string,
  fcmToken?: string,
  deviceInfo?: { deviceType?: string; deviceName?: string }
) => {
  const user: IUser = await User.findOne({ email })
    .select('+password')
    .populate('profileId');

  if (!user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  if (user.isDeleted === true) {
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      'Your account is deleted. Please create a new account.'
    );
  }

  validateUserStatus(user);

  // ✅ Enforce email verification before login
  if (!user.isEmailVerified) {
    // ✅ Create verification token and OTP for user to verify email (Redis-based)
    await Promise.all([
      TokenService.createVerifyEmailToken(user),
      otpService.sendVerificationOtp(user.email),
    ]);

    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      'Please verify your email before logging in. A verification OTP has been sent to your email.',
    );
  }

  const isPasswordValid = await bcryptjs.compare(reqpassword, user.password);

  if (!isPasswordValid) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
  }

  const tokens = await TokenService.accessAndRefreshToken(user);

  // ✅ Save FCM token in UserDevices
  if (fcmToken) {
    const deviceType = deviceInfo?.deviceType || 'mobile';
    const deviceName = deviceInfo?.deviceName || 'Unknown Device';

    // Find or create device record
    let device: any = await UserDevices.findOne({
      userId: user._id,
      fcmToken,
    });

    if (!device) {
      device = await UserDevices.create({
        userId: user._id,
        fcmToken,
        deviceType,
        deviceName,
        lastActive: new Date(),
      });
    } else {
      // Update last active
      device.lastActive = new Date();
      await device.save();
    }
  }

  // 🔒 REDIS SESSION CACHING
  // Cache user session for faster subsequent requests
  try {
    const sessionKey = `session:${user._id}:${fcmToken || 'mobile'}`;
    const sessionData = {
      userId: user._id,
      email: user.email,
      role: user.role,
      fcmToken,
      deviceType: deviceInfo?.deviceType || 'mobile',
      deviceName: deviceInfo?.deviceName || 'Unknown Device',
      loginAt: new Date(),
    };

    // Cache session for 7 days (matches refresh token expiry)
    await redisClient.setEx(
      sessionKey,
      AUTH_SESSION_CONFIG.SESSION_TTL,
      JSON.stringify(sessionData)
    );

    logger.info(`Session cached for user ${user._id} (${sessionKey})`);
  } catch (error) {
    errorLogger.error('Failed to cache session:', error);
    // Don't throw - login should succeed even if caching fails
  }

  // 📊 Fetch subscription status from UserSubscription collection
  const activeSubscription = await UserSubscription.findOne({
    userId: user._id,
    status: { $in: ['active', 'trialing'] },
    paymentGateway: 'revenuecat',
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .populate('subscriptionPlanId');

  // 🎯 Check if support style is set in UserProfile
  const userProfile = user.profileId as any;
  const isSupportStyleSet = !!(
    userProfile?.supportMode &&
    ['calm', 'encouraging', 'logical'].includes(userProfile.supportMode)
  );

  // Build response object
  const { password, ...userWithoutPassword } = user.toObject();

  return {
    user: {
      ...userWithoutPassword,
      profile: userProfile,
    },
    tokens,
    subscription: activeSubscription
      ? {
          isSubscribed: true,
          status: activeSubscription.status,
          plan: activeSubscription.subscriptionPlanId,
          currentPeriodStartDate: activeSubscription.currentPeriodStartDate,
          expirationDate: activeSubscription.expirationDate,
          paymentGateway: activeSubscription.paymentGateway,
          purchasePlatform: activeSubscription.purchasePlatform,
        }
      : {
          isSubscribed: false,
          status: null,
          plan: null,
          message: 'No active subscription found',
        },
    isSupportStyleSet,
  };
};

export const AuthService = {
  googleLogin,
  appleLogin,
  createUser,
  createUserV2,
  login,
  loginV2,
  loginIndividualUser, // 🆕 Individual user login with subscription status
  verifyEmail,
  resetPassword,
  forgotPassword,
  resendOtp,
  logout,
  changePassword,
  refreshAuth,
};
