import type { TwoFactorChallengeResponse, TwoFactorMethod, TwoFactorVerifyResponseV2 } from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseTwoFactorChallengeReturn = {
  challenge: TwoFactorChallengeResponse | null;
  isLoading: boolean;
  error: Error | null;
  requestChallenge: (firstFactorMethod?: string) => Promise<void>;
  verify: (response: string, trustDevice?: boolean) => Promise<TwoFactorVerifyResponseV2 | null>;
  switchMethod: (method: TwoFactorMethod) => Promise<void>;
  selectedMethod: TwoFactorMethod | null;
  reset: () => void;
};

/**
 * Hook to manage the v2 two-factor challenge flow with multi-method support
 */
export const useTwoFactorChallenge = (): UseTwoFactorChallengeReturn => {
  const passflow = usePassflow();
  const [challenge, setChallenge] = useState<TwoFactorChallengeResponse | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<TwoFactorMethod | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const requestChallenge = useCallback(
    async (firstFactorMethod?: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await passflow.twoFactor.requestChallenge({
          first_factor_method: firstFactorMethod,
        });
        setChallenge(response);
        setSelectedMethod(response.method);
      } catch (e) {
        setError(e as Error);
        setChallenge(null);
      } finally {
        setIsLoading(false);
      }
    },
    [passflow],
  );

  const verify = useCallback(
    async (response: string, trustDevice = false): Promise<TwoFactorVerifyResponseV2 | null> => {
      if (!challenge?.challenge_id) {
        setError(new Error('No active challenge session'));
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await passflow.twoFactor.verifyV2({
          challenge_id: challenge.challenge_id,
          method: selectedMethod || challenge.method,
          response,
          trust_device: trustDevice,
        });
        return result;
      } catch (e) {
        setError(e as Error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow, challenge, selectedMethod],
  );

  const switchMethod = useCallback(
    async (method: TwoFactorMethod): Promise<void> => {
      if (!challenge?.challenge_id) {
        setError(new Error('No active challenge session'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await passflow.twoFactor.switchToAlternative({
          challenge_id: challenge.challenge_id,
          method,
        });
        setChallenge(response);
        setSelectedMethod(method);
      } catch (e) {
        setError(e as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [passflow, challenge],
  );

  const reset = useCallback(() => {
    setChallenge(null);
    setSelectedMethod(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    challenge,
    isLoading,
    error,
    requestChallenge,
    verify,
    switchMethod,
    selectedMethod,
    reset,
  };
};
