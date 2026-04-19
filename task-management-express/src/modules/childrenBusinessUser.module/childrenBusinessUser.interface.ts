import { Types, Document, Model } from 'mongoose';
import { PaginateOptions, PaginateResult } from '../../types/paginate';
import { TChildrenBusinessUserStatus } from './childrenBusinessUser.constant';

/**
 * Children Business User Interface
 * Defines the relationship between a business user (parent) and child account
 *
 * @version 2.0.0
 * @author Senior Engineering Team
 *
 * @note Only ONE child per business user can be the Secondary User
 * Secondary User has special privileges:
 * - Can create tasks for the family
 * - Can assign tasks to parent/teacher and other children
 * - Acts as a "Task Manager" for the family
 */
export interface IChildrenBusinessUser {
  parentBusinessUserId: Types.ObjectId;
  childUserId: Types.ObjectId;
  addedAt: Date;
  addedBy: Types.ObjectId;
  status: TChildrenBusinessUserStatus;
  
  // Secondary User Flag (Only ONE per business user can be true)
  isSecondaryUser: boolean;
  
  note?: string;
  isDeleted: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Children Business User Document Interface
 * Extends IChildrenBusinessUser with Mongoose Document methods
 */
export interface IChildrenBusinessUserDocument extends IChildrenBusinessUser, Document {
  _id: Types.ObjectId;

  isActive(): boolean;
}

/**
 * Children Business User Model Interface
 * Extends Model with custom static methods
 */
export interface IChildrenBusinessUserModel extends Model<IChildrenBusinessUserDocument> {
  isChildOfBusinessUser(
    parentBusinessUserId: Types.ObjectId,
    childUserId: Types.ObjectId
  ): Promise<boolean>;

  getChildrenCount(parentBusinessUserId: Types.ObjectId): Promise<number>;

  getActiveChildren(parentBusinessUserId: Types.ObjectId): Promise<Types.ObjectId[]>;
}

/**
 * Children Business User Query Options Interface
 * For typed pagination and filtering
 */
export interface IChildrenBusinessUserQueryOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  populate?: Array<{ path: string; select?: string }>;
  select?: string;
  status?: TChildrenBusinessUserStatus;
}

// ✅ Request body interfaces
export interface IActivateAccountBody {
  token: string;
  password: string;
}

export interface IUpdateSecondaryUserBody {
  isSecondaryUser: boolean;
}

export interface IUpdateChildBody {
  [key: string]: any;
}

export interface IRemoveChildBody {
  note?: string;
  reason?: string;
  [key: string]: any;
}
