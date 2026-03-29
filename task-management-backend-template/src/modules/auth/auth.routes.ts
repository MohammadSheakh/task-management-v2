//@ts-ignore
import { Router } from 'express';
import { AuthController } from './auth.controller';
import validateRequest from '../../shared/validateRequest';
import { AuthValidation } from './auth.validations';
import auth from '../../middlewares/auth';
//@ts-ignore
import multer from "multer";
import { TRole } from '../../middlewares/roles';
import { rateLimiter } from '../../middlewares/rateLimiterRedis';
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const router = Router();

// ─── Rate Limiters ─────────────────────────────────────────────────────
/**
 * Rate limiters using centralized rateLimiter with Redis
 * All rate limits are shared across server instances via Redis
 */
const loginLimiter = rateLimiter('auth');
const registerLimiter = rateLimiter('strict');
const forgotPasswordLimiter = rateLimiter('strict');
const verifyEmailLimiter = rateLimiter('strict');
const authLimiter = rateLimiter('api');


//---------------------------------
// (Doctor | Patient) (Registration) | as doctor and patient need to provide their documents while registration
// TODO : validation add kora lagbe ..
//---------------------------------
router.post(
  '/register',
  registerLimiter,  // 🔒 Rate limiting: 10 per hour
  // validateRequest(AuthValidation.createHelpMessageValidationSchema),
  AuthController.register,
);

router.post(
  '/register/v2',
  registerLimiter,  // 🔒 Rate limiting: 10 per hour
  // validateRequest(AuthValidation.createHelpMessageValidationSchema),
  AuthController.registerV2,
);

router.post( // send fcm token for push notification ..
  '/login',
  loginLimiter,  // 🔒 Rate limiting: 5 attempts per 15 minutes
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.login,
);

router.post(
  '/login/v2',
  loginLimiter,  // 🔒 Rate limiting: 5 attempts per 15 minutes
  validateRequest(AuthValidation.loginValidationSchema),
  AuthController.loginV2,
);

// Route for Google login
router.post(
  '/google-login',
  loginLimiter,  // 🔒 Rate limiting: 5 attempts per 15 minutes
  validateRequest(AuthValidation.googleLoginValidationSchema),
  AuthController.googleLogin,
);

// 🆕
router.post(
  '/google-login/v2',
  loginLimiter,  // 🔒 Rate limiting: 5 attempts per 15 minutes
  // validateRequest(AuthValidation.googleLoginValidationSchema),
  AuthController.googleLoginV2,
);


router.post('/google', AuthController.googleAuthCallback);   // 🆕🆕🆕🆕🆕 client sends idToken
router.post('/apple', AuthController.appleAuthCallback); // 🆕🆕🆕🆕🆕🆕


//[🚧][🧑‍💻✅][🧪] // 🆗
router.post(
  '/forgot-password',
  forgotPasswordLimiter,  // 🔒 Rate limiting: 3 per hour
  validateRequest(AuthValidation.forgotPasswordValidationSchema),
  AuthController.forgotPassword,
);

router.post('/resend-otp', authLimiter);  // 🔒 Rate limiting: 100 per minute

//[🚧][🧑‍💻✅][🧪] // 🆗
router.post(
  '/reset-password',
  authLimiter,  // 🔒 Rate limiting: 100 per minute
  validateRequest(AuthValidation.resetPasswordValidationSchema),
  AuthController.resetPassword,
);

router.post(
  '/change-password',
  auth(TRole.common),
  authLimiter,  // 🔒 Rate limiting: 100 per minute
  validateRequest(AuthValidation.changePasswordValidationSchema),
  AuthController.changePassword,
);

//[🚧][🧑‍💻✅][🧪] // 🆗
router.post(
  '/verify-email',
  verifyEmailLimiter,  // 🔒 Rate limiting: 5 per hour
  validateRequest(AuthValidation.verifyEmailValidationSchema),
  AuthController.verifyEmail,
);

// ------ Logout endpoint - supports both authenticated and unauthenticated logout -----
// Can logout with token (authenticated) or without token (just blacklist refresh token)
router.post('/logout',
  auth(TRole.common),  // Optional - can logout without being authenticated
  AuthController.logout);

router.post('/refresh-auth', AuthController.refreshToken);

export const AuthRoutes = router;
