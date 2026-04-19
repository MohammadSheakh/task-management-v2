/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ⚠️  DEPRECATED - MongoDB-based OTP Service
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Status: DEPRECATED (DO NOT USE)
 * Date: 26-03-23
 * Reason: Security and Performance Issues
 * 
 * PROBLEMS WITH THIS APPROACH:
 * ❌ OTPs stored in PLAIN TEXT in MongoDB (security risk)
 * ❌ Database load on every OTP verification (performance)
 * ❌ No automatic TTL expiration (manual cleanup needed)
 * ❌ Slower response times (~20-50ms vs Redis ~1-2ms)
 * 
 * ✅ REPLACEMENT: Use OtpV2WithRedis from './otp-v2.service'
 *    - Redis-only storage (auto-expire with TTL)
 *    - OTPs are hashed with bcrypt before storage
 *    - Built-in rate limiting (cooldown, send limits)
 *    - Much faster performance
 * 
 * USAGE:
 *   import { OtpV2WithRedis } from './otp-v2.service';
 *   const otpService = new OtpV2WithRedis();
 *   await otpService.sendVerificationOtp(email);
 *   await otpService.verifyOtp(email, inputOtp);
 * 
 * MIGRATION GUIDE:
 *   OLD: OtpService.createVerificationEmailOtp(email)
 *   NEW: otpService.sendVerificationOtp(email) + send email separately
 * 
 *   OLD: OtpService.verifyOTP(email, otp, 'verify')
 *   NEW: otpService.verifyOtp(email, otp)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/*
import crypto from 'crypto';
import { StatusCodes } from 'http-status-codes';
import moment from 'moment';
import ApiError from '../../errors/ApiError';
import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from '../../helpers/emailService';
import OTP from './otp.model';
import { config } from '../../config';

import EventEmitter from 'events';
const eventEmitterForOTPCreateAndSendMail = new EventEmitter(); // functional way


eventEmitterForOTPCreateAndSendMail.on('eventEmitterForOTPCreateAndSendMail', async (valueFromRequest: any) => {
  try {
      const otpDoc = await createOTP(
        valueFromRequest.email,
        config.otp.verifyEmailOtpExpiration.toString(),
        'verify',
      );
      await sendVerificationEmail(valueFromRequest.email, otpDoc.otp);

    }catch (error) {
      console.error('Error occurred while handling token creation and deletion:', error);
    }
});

export default eventEmitterForOTPCreateAndSendMail;

const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

const createOTP = async (
  userEmail: string,
  expiresInMinutes: string,
  type: string,
) => {
  const existingOTP = await OTP.findOne({
    userEmail,
    type,
    verified: false,
    expiresAt: { $gt: new Date() },
  });
  if (existingOTP) {
    const windowStart = moment()
      .subtract(config.otp.attemptWindowMinutes, 'minutes')
      .toDate();
    if (
      existingOTP.attempts >= config.otp.maxOtpAttempts &&
      existingOTP.lastAttemptAt &&
      existingOTP.lastAttemptAt > windowStart
    ) {
      throw new ApiError(
        StatusCodes.TOO_MANY_REQUESTS,
        `Too many attempts. Please try again after ${config.otp.attemptWindowMinutes} minutes`,
      );
    }
  }
  await OTP.deleteMany({ userEmail, type });
  const otp = generateOTP();
  const otpDoc = await OTP.create({
    userEmail,
    otp,
    type,
    expiresAt: moment.utc().add(parseInt(expiresInMinutes), 'minutes').toDate(),
  });
  return otpDoc;
};

const verifyOTP = async (userEmail: string, otp: string, type: string) => {
  const otpDoc = await OTP.findOne({
    userEmail,
    type,
    verified: false,
  });

  if (!otpDoc || otpDoc.expiresAt < new Date()) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'OTP not found or expired');
  }
  otpDoc.attempts += 1;
  otpDoc.lastAttemptAt = new Date();
  if (otpDoc.attempts > config.otp.maxOtpAttempts) {
    await otpDoc.save();
    throw new ApiError(
      StatusCodes.TOO_MANY_REQUESTS,
      `Too many attempts. Please try again after ${config.otp.attemptWindowMinutes} minutes`,
    );
  }
  if (otpDoc.otp !== otp) {
    await otpDoc.save();
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
  }
  otpDoc.verified = true;
  await otpDoc.save();
  return true;
};

const createVerificationEmailOtp = async (email: string) => {
  const otpDoc = await createOTP(
    email,
    config.otp.verifyEmailOtpExpiration.toString(),
    'verify',
  );
  await sendVerificationEmail(email, otpDoc.otp);
  return otpDoc;
};

const createResetPasswordOtp = async (email: string) => {
  const otpDoc = await createOTP(
    email,
    config.otp.resetPasswordOtpExpiration.toString(),
    'resetPassword',
  );
  await sendResetPasswordEmail(email, otpDoc.otp);
  return otpDoc;
};

export const OtpService = {
  createOTP,
  verifyOTP,
  createVerificationEmailOtp,
  createResetPasswordOtp,
};
*/

// ═══════════════════════════════════════════════════════════════════════════════
// Export placeholder to prevent breaking imports during migration
// ═══════════════════════════════════════════════════════════════════════════════
export const OtpService = {
  createOTP: () => {
    throw new Error('❌ OtpService is DEPRECATED. Use OtpV2WithRedis from "./otp-v2.service" instead.');
  },
  verifyOTP: () => {
    throw new Error('❌ OtpService is DEPRECATED. Use OtpV2WithRedis from "./otp-v2.service" instead.');
  },
  createVerificationEmailOtp: () => {
    throw new Error('❌ OtpService is DEPRECATED. Use OtpV2WithRedis from "./otp-v2.service" instead.');
  },
  createResetPasswordOtp: () => {
    throw new Error('❌ OtpService is DEPRECATED. Use OtpV2WithRedis from "./otp-v2.service" instead.');
  },
};

export default { on: () => {} }; // Placeholder for eventEmitter
