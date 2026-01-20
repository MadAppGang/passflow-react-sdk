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
      try {
        setIsLoading(true);
        const response = await passflow.passwordlessSignInComplete(payload);
        setIsLoading(false);
        return response;
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return null;
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
