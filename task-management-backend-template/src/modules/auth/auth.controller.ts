//@ts-ignore
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import { TRole } from '../../middlewares/roles';
//@ts-ignore
import { Request, Response } from 'express';
import { UserProfile } from '../user.module/userProfile/userProfile.model';
import { User } from '../user.module/user/user.model';
import { TokenService } from '../token/token.service';
import { OAuthAccount } from '../user.module/oauthAccount/oauthAccount.model';
import ApiError from '../../errors/ApiError';
import { OAuth2Client } from 'google-auth-library';
import { UserDevices } from '../user.module/userDevices/userDevices.model';
import { IUserDevices } from '../user.module/userDevices/userDevices.interface';
import { ICreateUser, IRegisterData } from './auth.interface';
import { IUserProfile } from '../user.module/userProfile/userProfile.interface';
import { detectLanguage } from '../../utils/detectLanguageByFranc';
import { translateTextToTargetLang } from '../../utils/translateTextToTargetLang';
import { OAuthAccountService } from '../user.module/oauthAccount/oauthAccount.service';
import { IUser } from '../token/token.interface';
// import * as appleSignin from 'apple-signin-auth';

// const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID;
// const APPLE_TEAM_ID = process.env.APPLE_TEAM_ID;
// const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
// const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(CLIENT_ID);

const oAuthAccountService = new OAuthAccountService();

// 💎✨🔍 -> V2 Found
const register = catchAsync(async (req: Request, res: Response) => {
  const data: IRegisterData = req.body;

  if (!data.acceptTOC) {
    sendResponse(res, {
      code: StatusCodes.CREATED,
      message: `Please Read Terms and Conditions and Accept it.`,
      data: null,
      success: true,
    });
  }

  const userProfile: IUserProfile = await UserProfile.create({
    acceptTOC: data.acceptTOC,
  });

  // req.body.profileId = userProfile._id;

  //---------------------------------
  // lets create wallet for mentor but we do this in AuthService.createUser function
  //---------------------------------

  const userDTO: ICreateUser = {
    name: data.name,
    email: req.body.email,
    password: req.body.password,
    role: data.role,
    profileId: userProfile._id,
  };

  const result = await AuthService.createUser(userDTO, userProfile._id);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: `Account create successfully, Please verify your email to login`,
    data: result,
    success: true,
  });
});

/*-─────────────────────────────────
|  We refactor register service in this project
└──────────────────────────────────*/
const registerV2 = catchAsync(async (req: Request, res: Response) => {
  const data: IRegisterData = req.body;

  if (!data.acceptTOC) {
    return sendResponse(res, {
      code: StatusCodes.BAD_REQUEST,
      message: `Please Read Terms and Conditions and Accept it.`,
      data: null,
      success: true,
    });
  }

  const userProfile: IUserProfile = await UserProfile.create({
    acceptTOC: data.acceptTOC,
    age: data.age,
    dob: data.dob ? new Date(data.dob) : undefined,
    gender : data.gender,
  });

  // req.body.profileId = userProfile._id;

  //---------------------------------
  // lets create wallet for mentor but we do this in AuthService.createUser function
  //---------------------------------

  const userDTO: ICreateUser = {
    name: data.name,
    email: req.body.email,
    password: req.body.password,
    role: data.role,
    profileId: userProfile._id,
  };

  const result = await AuthService.createUserV2(userDTO, userProfile._id);

  sendResponse(res, {
    code: StatusCodes.CREATED,
    message: `Account create successfully, Please verify your email to login`,
    data: result,
    success: true,
  });
});

// 💎✨🔍 -> V2 Found
const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await AuthService.login(email, password);

  //set refresh token in cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // set maxAge to a number
    sameSite: 'lax',
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully',
    data: result,
    success: true,
  });
});

/*-─────────────────────────────────
|  We refactor login service in this project
└──────────────────────────────────*/
const loginV2 = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fcmToken } = req.body;

  console.log('email, password, fcmToken :: ', email, password, fcmToken);

  const result = await AuthService.loginV2(email, password, fcmToken);

  //set refresh token in cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // set maxAge to a number
    sameSite: 'lax',
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged in successfully',
    data: result,
    success: true,
  });
});

/**
 * Login for Individual User (Mobile App)
 * Returns user info with subscription status and support style status
 * POST /api/v1/login/individual-user
 *
 * Response includes:
 * - user: User object with profile
 * - tokens: Access and refresh tokens
 * - subscription: Subscription status (isSubscribed, status, plan, etc.)
 * - isSupportStyleSet: Boolean indicating if support mode is configured
 */
const loginIndividualUser = catchAsync(async (req: Request, res: Response) => {
  const { email, password, fcmToken } = req.body;

  const result = await AuthService.loginIndividualUser(email, password, fcmToken);

  //set refresh token in cookie
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // set maxAge to a number
    sameSite: 'lax',
  });

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Individual user logged in successfully',
    data: result,
    success: true,
  });
});

// 💎✨🔍 -> V2 Found
const googleLogin = async (
  idToken: string,
  fcmToken?: string,
  deviceInfo?: { deviceType?: string; deviceName?: string },
) => {
  try {
    // 🔐 Verify ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid Google ID token');
    }

    const { sub: providerId, email, email_verified: isEmailVerified } = payload;

    if (!email || !providerId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Email or provider ID missing',
      );
    }

    // 🔍 Check if Google account already exists
    let googleAccount = await OAuthAccount.findOne({
      authProvider: 'google',
      providerId,
    }).populate('userId');

    if (googleAccount && googleAccount.userId) {
      // ✅ Existing Google user → log in
      const user = await User.findById(googleAccount.userId);
      if (!user || user.isDeleted) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'User not found or deactivated',
        );
      }

      // In googleLogin and appleLogin functions, after successful login:
      if (fcmToken) {
        const deviceType = deviceInfo?.deviceType || 'web';
        const deviceName = deviceInfo?.deviceName || 'Unknown Device';

        let device: IUserDevices | any = await UserDevices.findOne({
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
          device.lastActive = new Date();
          await device.save();
        }
      }

      const tokens = await TokenService.accessAndRefreshToken(user);
      const { hashedPassword, ...userWithoutPassword } = user.toObject();

      return {
        user: userWithoutPassword,
        tokens,
      };
    }

    // 🔍 Check for existing LOCAL account with same email
    const localUser = await User.findOne({
      email: email.toLowerCase(),
      hashedPassword: { $ne: null }, // has password → local account
    });

    if (localUser) {
      // 🔄 Auto-link if email is verified by Google AND user
      if (isEmailVerified && localUser.isEmailVerified) {
        // 🔗 Link Google to existing local user
        const newOAuthAccount = await OAuthAccount.create({
          userId: localUser._id,
          authProvider: 'google',
          providerId,
          email: email.toLowerCase(),
          isVerified: true,
        });

        // Save FCM token
        if (fcmToken) {
          // As this Marie Wagner Project is Website .. so this project have no fcmToken usecase

          // For a mobile application usecase .. we need to save fcmTokens to different models ..

          await localUser.save();
        }

        const tokens = await TokenService.accessAndRefreshToken(localUser);
        const { hashedPassword, ...userWithoutPassword } = localUser.toObject();

        return {
          user: userWithoutPassword,
          tokens,
        };
      } else {
        // 🛑 Don't auto-link if email isn't verified
        throw new ApiError(
          StatusCodes.CONFLICT,
          'An account with this email exists. Please log in with your password or verify your email.',
        );
      }
    }

    // ➕ No existing account → create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      name: payload.name || email.split('@')[0],
      isEmailVerified: isEmailVerified,
      role: 'user', // default role
      profileId: await UserProfile.create({ acceptTOC: true }).then(p => p._id),
    });

    // Create OAuthAccount record
    await OAuthAccount.create({
      userId: newUser._id,
      authProvider: 'google',
      providerId,
      email: email.toLowerCase(),
      isVerified: isEmailVerified,
    });

    // Save FCM token
    if (fcmToken) {
      newUser.fcmToken = fcmToken;
      await newUser.save();
    }

    const tokens = await TokenService.accessAndRefreshToken(newUser);
    const { hashedPassword, ...userWithoutPassword } = newUser.toObject();

    return {
      user: userWithoutPassword,
      tokens,
    };
  } catch (error) {
    console.error('Google login error:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Something went wrong during Google login',
    );
  }
};

// 💎✨🔍 -> V3 Found
const googleLoginV2 = async (
  idToken: string,
  role: string,
  fcmToken?: string,
  deviceInfo?: { deviceType?: string; deviceName?: string },
) => {
  try {
    const { provider, providerId, email, name, picture } =
      await oAuthAccountService.verifyGoogleToken(idToken);

    if (!email || !providerId) {
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        'Email or provider ID missing',
      );
    }

    // 🔍 Check if Google account already exists
    let googleAccount = await OAuthAccount.findOne({
      authProvider: 'google',
      providerId,
    }).populate('userId');

    if (googleAccount && googleAccount.userId) {
      // ✅ Existing Google user → log in
      const user = await User.findById(googleAccount.userId);
      if (!user || user.isDeleted) {
        throw new ApiError(
          StatusCodes.UNAUTHORIZED,
          'User not found or deactivated',
        );
      }

      // -------- for this marie wagner .. we dont need to store fcmToken
      // In googleLogin and appleLogin functions, after successful login:
      if (fcmToken) {
        const deviceType = deviceInfo?.deviceType || 'web';
        const deviceName = deviceInfo?.deviceName || 'Unknown Device';

        let device: IUserDevices | any = await UserDevices.findOne({
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
          device.lastActive = new Date();
          await device.save();
        }
      }

      const tokens = await TokenService.accessAndRefreshToken(user);
      const { hashedPassword, ...userWithoutPassword } = user.toObject();

      return {
        user: userWithoutPassword,
        tokens,
      };
    }

    // 🔍 Check for existing LOCAL account with same email
    const localUser = await User.findOne({
      email: email.toLowerCase(),
      hashedPassword: { $ne: null }, // has password → local account
    });

    if (localUser) {
      // 🔄 Auto-link if email is verified by Google AND user
      if (localUser.isEmailVerified) {
        // 🔗 Link Google to existing local user
        await OAuthAccount.create({
          userId: localUser._id,
          authProvider: 'google',
          providerId,
          email: email.toLowerCase(),
          isVerified: true,
        });

        // This marie wagner is a web app .. so we dont need to store fcm token
        // if (fcmToken) {
        //   await localUser.save();
        // }

        const tokens = await TokenService.accessAndRefreshToken(localUser);
        const { hashedPassword, ...userWithoutPassword } = localUser.toObject();

        return {
          user: userWithoutPassword,
          tokens,
        };
      } else {
        // 🛑 Don't auto-link if email isn't verified
        throw new ApiError(
          StatusCodes.CONFLICT,
          'An account with this email exists. Please log in with your password or verify your email.',
        );
      }
    }

    // ➕ No existing account → create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      isEmailVerified: true,
      role, // default role
      //@ts-ignore
      profileId: await UserProfile.create({ acceptTOC: true }).then(p => p._id),
    });

    // Create OAuthAccount record
    await OAuthAccount.create({
      userId: newUser._id,
      authProvider: 'google',
      providerId,
      email: email.toLowerCase(),
      isVerified: true,
    });

    // Save FCM token
    // if (fcmToken) {
    //   newUser.fcmToken = fcmToken;
    //   await newUser.save();
    // }

    const tokens = await TokenService.accessAndRefreshToken(newUser);
    const { hashedPassword, ...userWithoutPassword } = newUser.toObject();

    return {
      user: userWithoutPassword,
      tokens,
    };
  } catch (error) {
    console.error('Google login error:', error);
    throw new ApiError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'Something went wrong during Google login',
    );
  }
};

const googleAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const { idToken, role, acceptTOC } = req.body;
  // idToken = token from Google Sign-In on client

  const result = await AuthService.googleLogin({ idToken, role, acceptTOC });

  return sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Google login successful',
    data: result,
    success: true,
  });
});

const appleAuthCallback = catchAsync(async (req: Request, res: Response) => {
  const { idToken, role, acceptTOC } = req.body;
  // idToken = token from Google Sign-In on client

  const result = await AuthService.appleLogin({ idToken, role, acceptTOC });

  return sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Google login successful',
    data: result,
    success: true,
  });
});

// TODO : 🧹 Clean devices older than 30 days
// await UserDevices.deleteMany({
//   lastActive: { $lt: moment().subtract(30, 'days').toDate() },
//   isDeleted: false,
// });

/*
export const appleLogin = async (idToken: string, fcmToken?: string) => {
  try {
    // 🔐 Verify Apple ID token
    const applePayload = await appleSignin.verifyIdToken(idToken, {
      clientId: APPLE_CLIENT_ID,
      teamId: APPLE_TEAM_ID,
      keyId: APPLE_KEY_ID,
      privateKey: APPLE_PRIVATE_KEY,
    });

    const { sub: providerId, email, email_verified: isEmailVerified } = applePayload;

    if (!email || !providerId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Email or provider ID missing');
    }

    // 🔍 Check if Apple account already exists
    let appleAccount = await OAuthAccount.findOne({
      authProvider: 'apple',
      providerId,
    }).populate('userId');

    if (appleAccount && appleAccount.userId) {
      // ✅ Existing Apple user → log in
      const user = await User.findById(appleAccount.userId);
      if (!user || user.isDeleted) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found or deactivated');
      }

      // Save FCM token
      if (fcmToken) {
        user.fcmToken = fcmToken;
        await user.save();
      }

      const tokens = await TokenService.accessAndRefreshToken(user);
      const { hashedPassword, ...userWithoutPassword } = user.toObject();

      return {
        user: userWithoutPassword,
        tokens,
      };
    }

    // 🔍 Check for existing LOCAL account with same email
    const localUser = await User.findOne({
      email: email.toLowerCase(),
      hashedPassword: { $ne: null }, // has password → local account
    });

    if (localUser) {
      // 🔄 Auto-link if email is verified by Apple AND user
      if (isEmailVerified && localUser.isEmailVerified) {
        // 🔗 Link Apple to existing local user
        const newOAuthAccount = await OAuthAccount.create({
          userId: localUser._id,
          authProvider: 'apple',
          providerId,
          email: email.toLowerCase(),
          isVerified: true,
        });

        // Save FCM token
        if (fcmToken) {
          localUser.fcmToken = fcmToken;
          await localUser.save();
        }

        const tokens = await TokenService.accessAndRefreshToken(localUser);
        const { hashedPassword, ...userWithoutPassword } = localUser.toObject();

        return {
          user: userWithoutPassword,
          tokens,
        };
      } else {
        // 🛑 Don't auto-link if email isn't verified
        throw new ApiError(
          StatusCodes.CONFLICT,
          'An account with this email exists. Please log in with your password or verify your email.'
        );
      }
    }

    // ➕ No existing account → create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      name: applePayload.name || email.split('@')[0],
      isEmailVerified: isEmailVerified,
      role: 'user', // default role
      profileId: await UserProfile.create({ acceptTOC: true }).then(p => p._id),
      
    });

    // Create OAuthAccount record
    await OAuthAccount.create({
      userId: newUser._id,
      authProvider: 'apple',
      providerId,
      email: email.toLowerCase(),
      isVerified: isEmailVerified,
    });

    // Save FCM token
    if (fcmToken) {
      newUser.fcmToken = fcmToken;
      await newUser.save();
    }

    const tokens = await TokenService.accessAndRefreshToken(newUser);
    const { hashedPassword, ...userWithoutPassword } = newUser.toObject();

    return {
      user: userWithoutPassword,
      tokens,
    };

  } catch (error) {
    console.error('Apple login error:', error);
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Something went wrong during Apple login');
  }
};
*/

//[🚧][🧑‍💻✅][🧪]  // 🆗
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  console.log(req.body);
  const { email, token, otp } = req.body;
  const result = await AuthService.verifyEmail(email, token, otp);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Email verified successfully',
    data: {
      result,
    },
    success: true,
  });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await AuthService.resendOtp(email);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Otp sent successfully',
    data: result,
    success: true,
  });
});
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body.email);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password reset email sent successfully',
    data: result,
    success: true,
  });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.user;
  const { currentPassword, newPassword } = req.body;
  const result = await AuthService.changePassword(
    userId,
    currentPassword,
    newPassword,
  );
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password changed successfully',
    data: result,
    success: true,
  });
});
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, password, otp } = req.body;
  const result = await AuthService.resetPassword(email, password, otp);
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Password reset successfully',
    data: {
      result,
    },
    success: true,
  });
});

const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken, fcmToken, logoutFromAllDevices } = req.body;
  const userId = (req.user as IUser)?.userId;

  await AuthService.logout(refreshToken, userId, fcmToken, logoutFromAllDevices);

  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'User logged out successfully',
    data: {},
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  
  console.log("hit 0")
  
  const tokens = await AuthService.refreshAuth(req.body.refreshToken);
  
  console.log("hit 1")
  
  sendResponse(res, {
    code: StatusCodes.OK,
    message: 'Token refreshed successfully',
    data: {
      tokens,
    },
    success: true,
  });
});

export const AuthController = {
  register,
  registerV2, // 🆕
  login,
  loginV2, // 🆕
  loginIndividualUser, // 🆕 Individual user login
  googleLogin,
  googleLoginV2,
  googleAuthCallback, // this is updated code
  appleAuthCallback,
  verifyEmail,
  resendOtp,
  logout,
  changePassword,
  refreshToken,
  forgotPassword,
  resetPassword,
};
