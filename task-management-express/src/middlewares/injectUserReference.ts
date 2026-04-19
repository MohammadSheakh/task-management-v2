//@ts-ignore
import { Request, Response, NextFunction } from 'express';
import sendResponse from '../shared/sendResponse';
//@ts-ignore
import { StatusCodes } from 'http-status-codes';

//---------------------------------
// this middleware will set the req.body.<referenceToUser> = req.user.userId ||||
// so that we can use it in the router to add the logged in user as reference when creating a new resource  
//---------------------------------
export const injectUserReference = <T> (referenceToUser: string) => {
  return (req: Request, res:Response, next:NextFunction) => {

    if (!req.user) {
      sendResponse(res, {
        code: StatusCodes.UNAUTHORIZED,
        message: 'You are not authorized',
        success: false,
      });
      return;
    }

    req.body[referenceToUser]  = (req.user as any).userId;
  
    // Proceed to the next middleware or controller if validation passes
    next();
  };
};
