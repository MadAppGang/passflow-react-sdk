/**
 * Types of 2FA errors with different handling strategies
 */
export type TwoFactorErrorType =
  | 'expired' // The sign-in is over: the user signs in again
  | 'rate_limited' // Too many attempts: the user signs in again later
  | 'not_enabled' // 2FA not enabled for user (show persistent error)
  | 'invalid_code' // Wrong code entered (allow retry)
  | 'generic'; // Other errors (show error with retry)

/**
 * Structured error information for 2FA errors
 */
export type TwoFactorError = {
  type: TwoFactorErrorType;
  message: string;
  isRecoverable: boolean; // Can user recover without admin intervention?
};
