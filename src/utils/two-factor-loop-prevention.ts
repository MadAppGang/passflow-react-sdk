const STORAGE_KEY_PREFIX = 'passflow_2fa';
const REDIRECT_COUNT_KEY = `${STORAGE_KEY_PREFIX}_redirect_count`;
const LAST_ERROR_KEY = `${STORAGE_KEY_PREFIX}_last_error_type`;
const MAX_REDIRECTS = 3;

/**
 * Loop prevention for 2FA redirect cycles
 */
export const TwoFactorLoopPrevention = {
  /**
   * Check if redirect should be allowed
   * @returns true if redirect is safe, false if loop detected
   */
  canRedirect(): boolean {
    try {
      const count = this.getRedirectCount();
      return count < MAX_REDIRECTS;
    } catch {
      // If sessionStorage is unavailable, allow redirect once
      return true;
    }
  },

  /**
   * Increment redirect counter
   */
  incrementRedirect(): void {
    try {
      const count = this.getRedirectCount();
      sessionStorage.setItem(REDIRECT_COUNT_KEY, String(count + 1));
    } catch {
      // Silently fail if sessionStorage unavailable
    }
  },

  /**
   * Get current redirect count
   */
  getRedirectCount(): number {
    try {
      const value = sessionStorage.getItem(REDIRECT_COUNT_KEY);
      return value ? Number.parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  },

  /**
   * Reset redirect counter (call on successful auth)
   */
  reset(): void {
    try {
      sessionStorage.removeItem(REDIRECT_COUNT_KEY);
      sessionStorage.removeItem(LAST_ERROR_KEY);
    } catch {
      // Silently fail if sessionStorage unavailable
    }
  },

  /**
   * Track last error type to detect repeated errors
   */
  setLastErrorType(errorType: string): void {
    try {
      sessionStorage.setItem(LAST_ERROR_KEY, errorType);
    } catch {
      // Silently fail if sessionStorage unavailable
    }
  },

  /**
   * Get last error type
   */
  getLastErrorType(): string | null {
    try {
      return sessionStorage.getItem(LAST_ERROR_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Check if same error is repeating
   */
  isRepeatingError(errorType: string): boolean {
    const lastError = this.getLastErrorType();
    return lastError === errorType && this.getRedirectCount() > 0;
  },

  /**
   * Get user-friendly message when loop is detected
   */
  getLoopDetectedMessage(): string {
    return 'Unable to complete authentication. This may be a configuration issue. Please contact support.';
  },
};

export default TwoFactorLoopPrevention;
