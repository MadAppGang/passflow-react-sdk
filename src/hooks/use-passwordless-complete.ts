import { useCallback, useState } from 'react';
import { AoothPasswordlessSignInCompletePayload, AoothValidationResponse } from '@aooth/aooth-js-sdk';
import { useAooth } from './use-aooth';

export type TusePasswordlessComplete = () => {
  fetch: (payload: AoothPasswordlessSignInCompletePayload) => Promise<AoothValidationResponse | null>;
  fetchPasskey: (otp: string, challengeId: string, appId?: string) => Promise<AoothValidationResponse | null>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const usePasswordlessComplete: TusePasswordlessComplete = () => {
  const aooth = useAooth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (payload: AoothPasswordlessSignInCompletePayload): Promise<AoothValidationResponse | null> => {
      try {
        setIsLoading(true);
        const response = await aooth.passwordlessSignInComplete(payload);
        setIsLoading(false);
        return response;
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const fetchPasskey = useCallback(
    async (otp: string, challengeId: string, appId?: string): Promise<AoothValidationResponse | null> => {
      try {
        setIsLoading(true);
        const response = await aooth.passkeyValidate(otp, challengeId, appId);
        setIsLoading(false);
        return response;
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return {
    fetch,
    fetchPasskey,
    isLoading,
    isError,
    error: errorMessage,
    reset,
  } as const;
};
