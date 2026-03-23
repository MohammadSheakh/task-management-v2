//@ts-ignore
import { Document, Model, Types } from 'mongoose';
import { Role } from '../../../middlewares/roles';
import { TStatusType } from './user.constant';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { TSubscription } from '../../../enums/subscription';

export type TProfileImage = {
  imageUrl: string;
  // file: Record<string, any>;
};

export interface IUser extends Document {
  _userId: undefined | Types.ObjectId;
  _id: undefined; // Types.ObjectId |
  profileId: Types.ObjectId | undefined;
  name: string;
  email: string;
  role: Role;
  password: string;
  profileImage?: TProfileImage;
  isEmailVerified: boolean;
  phoneNumber: string;
  lastPasswordChange: Date;
  isResetPassword: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | undefined;

  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  
  // 🆕 RevenueCat User ID (for Individual subscriptions)
  revenueCatUserId?: string;

  //---------- This project have no wallet feature
  // walletId?: Types.ObjectId;

  /**
   * ID of the user who created this account
   * For children accounts: references the parent business user
   * For individual/business users: null (self-registered)
   */
  accountCreatorId?: Types.ObjectId | null;

  /**
   * Is this user a business user who can have children?
   * Set to true when user purchases business subscription
   */
  isBusinessUser?: boolean;

  /**
   * User's preferred working time for tasks
   * Format: "HH:mm" (24-hour format, e.g., "08:30" for 8:30 AM)
   * Used for optimal task scheduling and notifications
   * Default: "07:00" (7:00 AM)
   */
  preferredTime?: string;

  isDeleted: boolean;
  deletedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface IUpdateUserInfo {
  name?: string;
  email?: string;
  phoneNumber?: string;

  location: string;
  dob: Date;
  gender: string;
}

export interface UserModal extends Model<IUser> {
  paginate: (
    filter: object,
    options: PaginateOptions,
  ) => Promise<PaginateResult<IUser>>;
  isExistUserById(id: string): Promise<Partial<IUser> | null>;
  isExistUserByEmail(email: string): Promise<Partial<IUser> | null>;
  isMatchPassword(password: string, hashPassword: string): Promise<boolean>;
}
