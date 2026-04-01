import { Request, Response, NextFunction } from 'express';

/**
 * CORS Middleware for Error Responses
 * 
 * This middleware ensures CORS headers are set for ALL responses,
 * including errors. This is important because when an error occurs,
 * the response needs to be readable by the browser's JavaScript.
 * 
 * Without this, error responses appear in Network tab but can't be
 * read by console.log() due to CORS blocking.
 */
export const ensureCorsHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Authorization, X-Request-Id');
  
  next();
};

export default ensureCorsHeaders;
