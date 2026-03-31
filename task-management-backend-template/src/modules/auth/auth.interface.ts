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