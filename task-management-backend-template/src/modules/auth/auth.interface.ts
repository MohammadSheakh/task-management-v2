import { TRole } from "../../middlewares/roles"
//@ts-ignore
import { Types } from 'mongoose';

export interface IRegisterData {
    name:string,
    email:string,
    password:string,
    role: TRole.business | TRole.child,
    phoneNumber: number,
    location: string, 
    lat: number, 
    lng : number,
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