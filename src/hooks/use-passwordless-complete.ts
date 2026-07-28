import { verificationRequestErrorMessage } from '@/utils';
import type { PassflowPasswordlessSignInCompletePayload, PassflowValidationResponse } from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UsePasswordlessCompleteProps = () => {
  fetch: (payload: PassflowPasswordlessSignInCompletePayload) => Promise<PassflowValidationResponse | null>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const usePasswordlessComplete: UsePasswordlessCompleteProps = () => {
  const passflow = usePassflow();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (payload: PassflowPasswordlessSignInCompletePayload): Promise<PassflowValidationResponse | null> => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage('');

      try {
        return await passflow.passwordlessSignInComplete(payload);
      } catch (error) {
        console.error('[passflow] passwordless verification failed', error);
        setIsError(true);
        setErrorMessage(verificationRequestErrorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return {
    fetch,
    isLoading,
    isError,
    error: errorMessage,
    reset,
  } as const;
};
