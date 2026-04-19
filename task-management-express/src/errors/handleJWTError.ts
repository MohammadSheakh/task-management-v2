import { IErrorMessage } from "../types/errors.types";

export default function handleJWTError(error: any) {
  const isTokenExpired = error.name === "TokenExpiredError";
  
  const message = isTokenExpired
    ? "Your session has expired. Please log in again."
    : "Invalid authentication token.";

  const errorMessages: IErrorMessage[] = [
    { 
      path: "token", 
      message,
      // Add error code for frontend to detect token expiration programmatically
      code: isTokenExpired ? "TOKEN_EXPIRED" : "INVALID_TOKEN"
    }
  ];

  return { 
    code: 401, 
    message, 
    errorMessages,
    // Add top-level error type for easy detection
    errorType: isTokenExpired ? "TOKEN_EXPIRED" : "AUTH_ERROR"
  };
}