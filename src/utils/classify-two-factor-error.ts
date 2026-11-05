import type { TwoFactorError, TwoFactorErrorType } from '@/types/two-factor-errors';
import {
  enrollmentFailureFrom,
  serverErrorIdFrom,
  twoFactorNotEnabledMessage,
  twoFactorRateLimitedMessage,
  twoFactorSignInOverMessage,
  twoFactorTryAgainMessage,
  twoFactorWrongCodeMessage,
} from './auth-error';

const errorTypeOf = (error: unknown): TwoFactorErrorType => {
  if (serverErrorIdFrom(error) === 'error.2fa.not_enabled') return 'not_enabled';

  switch (enrollmentFailureFrom(error)) {
    case 'over':
      return 'expired';
    case 'rate_limited':
      return 'rate_limited';
    case 'wrong_code':
      return 'invalid_code';
    default:
      return 'generic';
  }
};

/**
 * Classify a 2FA error from the error itself, not its message: the server localises messages.
 */
export function classifyTwoFactorError(error: unknown): TwoFactorError {
  const type = errorTypeOf(error);
  return {
    type,
    message: (error as Error | null)?.message ?? twoFactorTryAgainMessage,
    isRecoverable: type !== 'not_enabled',
  };
}

/** No further code can be taken on the screen: only the way back to sign in is left. */
export const isTerminalTwoFactorError = (type: TwoFactorErrorType | undefined): boolean =>
  type === 'not_enabled' || type === 'expired' || type === 'rate_limited';

/**
 * Get user-friendly error message based on error type
 */
export function getUserFriendlyErrorMessage(error: TwoFactorError): string {
  switch (error.type) {
    case 'expired':
      return twoFactorSignInOverMessage;
    case 'rate_limited':
      return twoFactorRateLimitedMessage;
    case 'not_enabled':
      return twoFactorNotEnabledMessage;
    case 'invalid_code':
      return twoFactorWrongCodeMessage;
    default:
      return error.message;
  }
}
