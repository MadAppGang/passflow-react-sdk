import type { TwoFactorSetupMagicLinkError, TwoFactorSetupMagicLinkErrorCode } from '@passflow/core';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { PassflowContext } from '@/context';
import { usePassflow } from './use-passflow';

const knownErrorCodes: readonly TwoFactorSetupMagicLinkErrorCode[] = [
  'INVALID_TOKEN',
  'EXPIRED_TOKEN',
  'REVOKED_TOKEN',
  'ALREADY_USED',
  'RATE_LIMITED',
  'SERVER_ERROR',
];

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
  /** Manual retry function for transient errors */
  retry: () => Promise<void>;
};

/**
 * Hook to validate magic link token for 2FA setup
 *
 * This hook:
 * - Validates once per token on mount (StrictMode included), after app id discovery ends: the session lives in memory
 *   on the Passflow instance, and discovery replaces the instance
 * - Provides loading, error, and success states
 * - Allows manual retry for transient failures
 * - Cleans up conditionally on unmount (only if validation failed or not validated)
 *
 * Usage:
 * ```tsx
 * const { isLoading, isValidated, error, retry } = useTwoFactorSetupMagicLink(token);
 *
 * if (isLoading) return <Loading />;
 * if (error) return <ErrorUI error={error} onRetry={retry} />;
 * if (isValidated) return <TwoFactorSetupForm />;
 * ```
 */
export const useTwoFactorSetupMagicLink = (token: string): UseTwoFactorSetupMagicLinkReturn => {
  const passflow = usePassflow();
  const isDiscovering = useContext(PassflowContext)?.state.isDiscoveringAppId ?? false;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [error, setError] = useState<TwoFactorSetupMagicLinkError | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number | null>(null);

  // The token the mount effect already validated: its guard, and only its guard.
  const validatedOnMount = useRef<string | null>(null);

  // Ref to track if we should clear session on unmount
  const shouldClearOnUnmount = useRef<boolean>(true);

  const validateToken = useCallback(async () => {
    try {
      const response = await passflow.validateTwoFactorSetupMagicLink(token);

      if (response.success && response.sessionToken && response.userId) {
        // Cleared only here: a retry keeps its error screen, with the busy button, until the answer comes.
        setError(null);
        setSessionToken(response.sessionToken);
        setUserId(response.userId);
        setAppId(response.appId ?? null);
        setExpiresIn(response.expiresIn ?? null);
        setIsValidated(true);
        // Don't clear session on unmount if validation succeeded
        shouldClearOnUnmount.current = false;
      } else if (response.error) {
        // Core copies a raw 429's body `error` into `code`, and only that path gives an unknown code.
        setError(knownErrorCodes.includes(response.error.code) ? response.error : { ...response.error, code: 'RATE_LIMITED' });
        setIsValidated(false);
        shouldClearOnUnmount.current = true;
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
  }, [token, passflow]);

  /**
   * Manual retry for transient errors: it skips the mount guard
   */
  const retry = useCallback(async () => {
    setIsRetrying(true);
    await validateToken();
  }, [validateToken]);

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

    if (isDiscovering || validatedOnMount.current === token) return;
    validatedOnMount.current = token;
    setIsLoading(true);
    void validateToken();
  }, [token, isDiscovering, validateToken]);

  /**
   * Cleanup on unmount - conditional based on validation state
   * Per review feedback: Only clear if validation failed or user navigated away before validation
   */
  useEffect(() => {
    return () => {
      // Only clear magic link session if validation failed or wasn't validated
      // If isValidated=true, let the form handle session clearing after confirm
      if (shouldClearOnUnmount.current) {
        passflow.clearMagicLinkSession();
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
    retry,
  };
};
