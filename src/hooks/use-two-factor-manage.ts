import type { TwoFactorRegenerateResponse } from '@passflow/passflow-js-sdk';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseTwoFactorManageProps = () => {
  recoveryCodes: string[];
  disable: (code: string) => Promise<boolean>;
  regenerateCodes: (code: string) => Promise<TwoFactorRegenerateResponse | null>;
  reset: () => void;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

/**
 * Hook to manage 2FA (disable, regenerate codes)
 */
export const useTwoFactorManage: UseTwoFactorManageProps = () => {
  const passflow = usePassflow();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const disable = useCallback(
    async (code: string): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      try {
        await passflow.disableTwoFactor(code);
        return true;
      } catch (e) {
        setIsError(true);
        const err = e as Error;
        setError(err.message);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow],
  );

  const regenerateCodes = useCallback(
    async (code: string): Promise<TwoFactorRegenerateResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      try {
        const response = await passflow.regenerateTwoFactorRecoveryCodes(code);
        setRecoveryCodes(response.recovery_codes);
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
    setRecoveryCodes([]);
    setIsError(false);
    setError('');
  }, []);

  return {
    recoveryCodes,
    disable,
    regenerateCodes,
    reset,
    isLoading,
    isError,
    error,
  };
};
