import type { TwoFactorError } from '@/types/two-factor-errors';

/**
 * Error message patterns for classification
 */
const ERROR_PATTERNS = {
  expired: ['2FA verification expired or not required', 'verification expired', 'session expired', 'verification not required'],
  not_enabled: ['Two-factor authentication is not enabled for this user', '2FA is not enabled', 'two-factor not enabled'],
  invalid_code: ['invalid code', 'incorrect code', 'code mismatch', 'wrong code', 'invalid 2fa code'],
} as const;

/**
 * Classify 2FA error based on error message
 *
 * @param errorMessage - Error message from SDK
 * @returns Classified error with handling strategy
 */
export function classifyTwoFactorError(errorMessage: string): TwoFactorError {
  const normalizedMessage = errorMessage.toLowerCase();

  // Check for expired session (recoverable, auto-redirect)
  if (ERROR_PATTERNS.expired.some((pattern) => normalizedMessage.includes(pattern.toLowerCase()))) {
    return {
      type: 'expired',
      message: errorMessage,
      isRecoverable: true,
      shouldAutoRedirect: true,
    };
  }

  // Check for 2FA not enabled (non-recoverable, NO auto-redirect)
  if (ERROR_PATTERNS.not_enabled.some((pattern) => normalizedMessage.includes(pattern.toLowerCase()))) {
    return {
      type: 'not_enabled',
      message: errorMessage,
      isRecoverable: false,
      shouldAutoRedirect: false,
    };
  }

  // Check for invalid code (recoverable, allow retry)
  if (ERROR_PATTERNS.invalid_code.some((pattern) => normalizedMessage.includes(pattern.toLowerCase()))) {
    return {
      type: 'invalid_code',
      message: errorMessage,
      isRecoverable: true,
      shouldAutoRedirect: false,
    };
  }

  // Generic error (treat as recoverable with retry)
  return {
    type: 'generic',
    message: errorMessage,
    isRecoverable: true,
    shouldAutoRedirect: false,
  };
}

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: TwoFactorError): string {
  switch (error.type) {
    case 'expired':
      return 'Your session has expired. Redirecting to sign in...';
    case 'not_enabled':
      return 'Two-factor authentication is not enabled for your account. Please contact your administrator to enable 2FA.';
    case 'invalid_code':
      return 'Invalid code. Please check your authenticator app and try again.';
    case 'generic':
    default:
      return error.message;
  }
}
