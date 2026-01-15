import type { TwoFactorConfirmResponse, TwoFactorSetupResponse } from '@passflow/passflow-js-sdk';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type TwoFactorSetupStep = 'idle' | 'setup' | 'complete';

export type UseTwoFactorSetupProps = () => {
  setupData: TwoFactorSetupResponse | null;
  recoveryCodes: string[];
  step: TwoFactorSetupStep;
  beginSetup: () => Promise<TwoFactorSetupResponse | null>;
  confirmSetup: (code: string) => Promise<TwoFactorConfirmResponse | null>;
  reset: () => void;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

/**
 * Hook to handle 2FA setup flow (enable 2FA)
 */
export const useTwoFactorSetup: UseTwoFactorSetupProps = () => {
  const passflow = usePassflow();
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<TwoFactorSetupStep>('idle');

  const beginSetup = useCallback(async (): Promise<TwoFactorSetupResponse | null> => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      const response = await passflow.beginTwoFactorSetup();
      setSetupData(response);
      setStep('setup');
      return response;
    } catch (e) {
      setIsError(true);
      const err = e as Error;
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const confirmSetup = useCallback(
    async (code: string): Promise<TwoFactorConfirmResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setError('');
      try {
        const response = await passflow.confirmTwoFactorSetup(code);
        setRecoveryCodes(response.recovery_codes);
        setStep('complete');
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
    setSetupData(null);
    setRecoveryCodes([]);
    setIsError(false);
    setError('');
    setStep('idle');
  }, []);

  return {
    setupData,
    recoveryCodes,
    step,
    beginSetup,
    confirmSetup,
    reset,
    isLoading,
    isError,
    error,
  };
};
