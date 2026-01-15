import type { TwoFactorRecoveryResponse, TwoFactorVerifyResponse } from '@passflow/passflow-js-sdk';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseTwoFactorVerifyProps = () => {
  isVerificationRequired: () => boolean;
  verify: (code: string) => Promise<TwoFactorVerifyResponse | null>;
  useRecoveryCode: (code: string) => Promise<TwoFactorRecoveryResponse | null>;
  reset: () => void;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

/**
 * Hook to verify 2FA code during login
 */
export const useTwoFactorVerify: UseTwoFactorVerifyProps = () => {
  const passflow = usePassflow();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const isVerificationRequired = useCallback((): boolean => {
    return passflow.isTwoFactorVerificationRequired();
  }, [passflow]);

  const verify = useCallback(
    async (code: string): Promise<TwoFactorVerifyResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      try {
        const response = await passflow.verifyTwoFactor(code);
        return response;
      } catch (e) {
        setIsError(true);
        const err = e as Error;
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow],
  );

  const useRecoveryCode = useCallback(
    async (code: string): Promise<TwoFactorRecoveryResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      try {
        const response = await passflow.useTwoFactorRecoveryCode(code);
        return response;
      } catch (e) {
        setIsError(true);
        const err = e as Error;
        setError(err.message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow],
  );

  const reset = useCallback(() => {
    setIsError(false);
    setError('');
  }, []);

  return {
    isVerificationRequired,
    verify,
    useRecoveryCode,
    reset,
    isLoading,
    isError,
    error,
  };
};
