export type IErrorMessage = {
  path: string | number;
  message: string;
  code?: string; // Optional error code for programmatic handling (e.g., "TOKEN_EXPIRED")
};
