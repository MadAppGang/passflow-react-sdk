import { useCallback, useEffect, useRef, useState } from 'react';
import { usePassflow } from './use-passflow';

/**
 * Magic link validation error type
 */
export type TwoFactorSetupMagicLinkError = {
  code: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'REVOKED_TOKEN' | 'RATE_LIMITED' | 'SERVER_ERROR';
  message: string;
  retryAfter?: number; // Seconds until retry allowed (for RATE_LIMITED)
};

/**
 * Expected response shape from passflow.validateTwoFactorSetupMagicLink
 */
type ValidationResponse = {
  success: boolean;
  sessionToken?: string;
  userId?: string;
  expiresIn?: number;
  appId?: string | null;
  error?: TwoFactorSetupMagicLinkError;
};

/**
 * Return type for useTwoFactorSetupMagicLink hook
 */
export type UseTwoFactorSetupMagicLinkReturn = {
  /** True during validation */
  isLoading: boolean;
  /** True during retry attempt */
  isRetrying: boolean;
  /** True if token validated successfully */
  isValidated: boolean;
  /** Error details if validation failed */
  error: TwoFactorSetupMagicLinkError | null;
  /** Session token if validated */
  sessionToken: string | null;
  /** User ID if validated */
  userId: string | null;
  /** App ID if validated (may be null) */
  appId: string | null;
  /** Session expiration in seconds */
  expiresIn: number | null;
  /** Retry countdown for rate-limited errors (null if not rate limited) */
  retryCountdown: number | null;
  /** Manual retry function for transient errors */
  retry: () => Promise<void>;
};

/**
 * Hook to validate magic link token for 2FA setup
 *
 * This hook:
 * - Validates token on mount (automatic)
 * - Caches validation result per token (prevents duplicate calls)
 * - Provides loading, error, and success states
 * - Allows manual retry for transient failures
 * - Handles rate limit countdown
 * - Cleans up conditionally on unmount (only if validation failed or not validated)
 *
 * Usage:
 * ```tsx
 * const { isLoading, isValidated, error, retry, retryCountdown } = useTwoFactorSetupMagicLink(token);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <ErrorUI error={error} onRetry={retry} countdown={retryCountdown} />;
 * if (isValidated) return <TwoFactorSetupForm />;
 * ```
 */
export const useTwoFactorSetupMagicLink = (token: string): UseTwoFactorSetupMagicLinkReturn => {
  const passflow = usePassflow();

  // State management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [error, setError] = useState<TwoFactorSetupMagicLinkError | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Cache key for validation (prevents duplicate calls for same token)
  const [validatedToken, setValidatedToken] = useState<string | null>(null);

  // Ref to track if we should clear session on unmount
  const shouldClearOnUnmount = useRef<boolean>(true);

  // Countdown timer ref
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start rate limit countdown timer
   */
  const startCountdown = useCallback((seconds: number) => {
    // Clear existing timer
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    setRetryCountdown(seconds);

    countdownTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev === null || prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /**
   * Validate token via JS SDK
   */
  const validateToken = useCallback(
    async (isRetry = false) => {
      // Skip if already validated this token
      if (!isRetry && validatedToken === token && isValidated) {
        return;
      }

      // Reset state
      if (isRetry) {
        setIsRetrying(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        // Call JS SDK validation method
        // Cast to unknown to support cases where React SDK builds before JS SDK types are updated
        const passflowWithMagicLink = passflow as unknown as {
          validateTwoFactorSetupMagicLink: (token: string) => Promise<ValidationResponse>;
        };
        const response = await passflowWithMagicLink.validateTwoFactorSetupMagicLink(token);

        if (response.success && response.sessionToken && response.userId) {
          // Success - store session details
          setSessionToken(response.sessionToken);
          setUserId(response.userId);
          setAppId(response.appId ?? null);
          setExpiresIn(response.expiresIn ?? null);
          setIsValidated(true);
          setValidatedToken(token);
          setRetryCountdown(null);
          // Don't clear session on unmount if validation succeeded
          shouldClearOnUnmount.current = false;
        } else if (response.error) {
          // Validation failed
          setError(response.error);
          setIsValidated(false);
          shouldClearOnUnmount.current = true;

          // Start countdown for rate-limited errors
          if (response.error.code === 'RATE_LIMITED' && response.error.retryAfter) {
            startCountdown(response.error.retryAfter);
          }
        }
      } catch (err) {
        // Unexpected error (shouldn't happen - SDK catches errors)
        setError({
          code: 'SERVER_ERROR',
          message: err instanceof Error ? err.message : 'An unexpected error occurred',
        });
        setIsValidated(false);
        shouldClearOnUnmount.current = true;
      } finally {
        setIsLoading(false);
        setIsRetrying(false);
      }
    },
    [token, validatedToken, isValidated, passflow, startCountdown],
  );

  /**
   * Manual retry for transient errors
   */
  const retry = useCallback(async () => {
    // Don't allow retry during countdown
    if (retryCountdown !== null && retryCountdown > 0) {
      return;
    }

    // Reset cache to allow retry
    setValidatedToken(null);
    await validateToken(true);
  }, [validateToken, retryCountdown]);

  /**
   * Validate on mount or when token changes
   */
  useEffect(() => {
    if (!token) {
      setError({
        code: 'INVALID_TOKEN',
        message: 'No token provided',
      });
      setIsLoading(false);
      return;
    }

    // Validate if token changed or not yet validated
    if (token !== validatedToken) {
      validateToken();
    }
  }, [token, validatedToken, validateToken]);

  /**
   * Cleanup on unmount - conditional based on validation state
   * Per review feedback: Only clear if validation failed or user navigated away before validation
   */
  useEffect(() => {
    return () => {
      // Clear countdown timer
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      // Only clear magic link session if validation failed or wasn't validated
      // If isValidated=true, let the form handle session clearing after confirm
      if (shouldClearOnUnmount.current) {
        const passflowWithSession = passflow as unknown as { clearMagicLinkSession?: () => void };
        passflowWithSession.clearMagicLinkSession?.();
      }
    };
  }, [passflow]);

  return {
    isLoading,
    isRetrying,
    isValidated,
    error,
    sessionToken,
    userId,
    appId,
    expiresIn,
    retryCountdown,
    retry,
  };
};
