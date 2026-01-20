/**
 * Types of 2FA errors with different handling strategies
 */
export type TwoFactorErrorType =
  | 'expired' // Session expired or verification not required (auto-redirect)
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
  shouldAutoRedirect: boolean; // Should auto-redirect to sign-in?
};
