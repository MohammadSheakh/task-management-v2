import { TRole } from "../../middlewares/roles"
//@ts-ignore
import { Types } from 'mongoose';

export interface IRegisterData {
    name:string,
    email:string,
    password:string,
    role: TRole.business | TRole.child,
    phoneNumber: number,
    age: string,
    gender: string, // it can be male / female
    dob : string,
    acceptTOC: boolean
}

export interface ICreateUser{
    name:string,
    email:string,
    password:string,
    role: TRole.child | TRole.business
    profileId: Types.ObjectId
}

export interface IGoogleLoginPayload {
  idToken: string;
  role?: TRole;
  acceptTOC?: boolean;
}

// ✅ Login request bodies
export interface ILoginBody {
  email: string;
  password: string;
  fcmToken?: string;
}

export interface ILogoutBody {
  refreshToken?: string;
  fcmToken?: string;
  logoutFromAllDevices?: boolean;
}

// ✅ Email verification bodies
export interface IVerifyEmailBody {
  email: string;
  token?: string;
  otp?: string;
}

export interface IResendOtpBody {
  email: string;
}

export interface IForgotPasswordBody {
  email: string;
}

export interface IChangePasswordBody {
  currentPassword: string;
  newPassword: string;
}

export interface IResetPasswordBody {
  email: string;
  password: string;
  otp: string;
}

export interface IRefreshTokenBody {
  refreshToken: string;
}