import type { TwoFactorError, TwoFactorErrorType } from '@/types/two-factor-errors';
import { classifyTwoFactorError } from '@/utils/classify-two-factor-error';
import type { TwoFactorCompletionOptions, TwoFactorRecoveryResponse, TwoFactorVerifyResponse } from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseTwoFactorVerifyProps = () => {
  isVerificationRequired: () => boolean;
  /** `options.trustDevice` asks the server to trust this device for later sign-ins. */
  verify: (code: string, options?: TwoFactorCompletionOptions) => Promise<TwoFactorVerifyResponse | null>;
  /** `options.trustDevice` asks the server to trust this device for later sign-ins. */
  useRecoveryCode: (code: string, options?: TwoFactorCompletionOptions) => Promise<TwoFactorRecoveryResponse | null>;
  reset: () => void;
  isLoading: boolean;
  isError: boolean;
  error: string;
  errorType: TwoFactorErrorType | null;
  errorDetails: TwoFactorError | null;
};

/**
 * Hook to verify 2FA code during login with error classification
 */
export const useTwoFactorVerify: UseTwoFactorVerifyProps = () => {
  const passflow = usePassflow();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [errorType, setErrorType] = useState<TwoFactorErrorType | null>(null);
  const [errorDetails, setErrorDetails] = useState<TwoFactorError | null>(null);

  const isVerificationRequired = useCallback((): boolean => {
    return passflow.isTwoFactorVerificationRequired();
  }, [passflow]);

  const handleError = useCallback((e: unknown) => {
    const err = e as Error;
    const classified = classifyTwoFactorError(err.message);

    setIsError(true);
    setError(err.message);
    setErrorType(classified.type);
    setErrorDetails(classified);
  }, []);

  const verify = useCallback(
    async (code: string, options?: TwoFactorCompletionOptions): Promise<TwoFactorVerifyResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      setErrorType(null);
      setErrorDetails(null);

      try {
        const response = await passflow.verifyTwoFactor(code, options);
        return response;
      } catch (e) {
        handleError(e);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow, handleError],
  );

  const useRecoveryCode = useCallback(
    async (code: string, options?: TwoFactorCompletionOptions): Promise<TwoFactorRecoveryResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      setErrorType(null);
      setErrorDetails(null);

      try {
        const response = await passflow.useTwoFactorRecoveryCode(code, options);
        return response;
      } catch (e) {
        handleError(e);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow, handleError],
  );

  const reset = useCallback(() => {
    setIsError(false);
    setError('');
    setErrorType(null);
    setErrorDetails(null);
  }, []);

  return {
    isVerificationRequired,
    verify,
    useRecoveryCode,
    reset,
    isLoading,
    isError,
    error,
    errorType,
    errorDetails,
  };
};
