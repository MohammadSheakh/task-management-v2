//@ts-ignore
import { Model, Types } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../../types/paginate';
import { TSupportMode, TNotificationStyle, TGender } from './userProfile.constants';

export interface IUserProfile {
  // _taskId: undefined | Types.ObjectId;
  _id?: Types.ObjectId; // undefined |  Types.ObjectId |

  acceptTOC : boolean;
  userId: Types.ObjectId; // for back reference ..

  location?: string;
  dob?: Date;
  gender?: TGender;
  age : number;

  // ─── Support Mode & Notification Preferences ───────────────────────────
  /**
   * Support Mode: How the app communicates with the user
   * - calm: Gentle guidance with peaceful reminders
   * - encouraging: Positive energy with motivational reminders
   * - logical: Gentle guidance with peaceful reminders
   * @default 'calm'
   */
  supportMode?: TSupportMode;

  /**
   * Notification Style: How reminders should feel
   * - gentle: Soft and non-intrusive
   * - firm: Direct and clear
   * - xyz: Custom style
   * @default 'gentle'
   */
  notificationStyle?: TNotificationStyle;

  isDeleted? : boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserProfileModel extends Model<IUserProfile> {
  paginate: (
    query: Record<string, any>,
    options: PaginateOptions
  ) => Promise<PaginateResult<IUserProfile>>;
}