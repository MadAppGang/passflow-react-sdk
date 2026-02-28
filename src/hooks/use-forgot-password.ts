import type { PassflowSendPasswordResetEmailPayload } from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseForgotPasswordProps = () => {
  fetch: (payload: PassflowSendPasswordResetEmailPayload) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useForgotPassword: UseForgotPasswordProps = () => {
  const passflow = usePassflow();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (payload: PassflowSendPasswordResetEmailPayload): Promise<boolean> => {
      try {
        setIsLoading(true);
        await passflow.sendPasswordResetEmail(payload);
        setIsLoading(false);
        return true;
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return false;
      }
    },
    [passflow.sendPasswordResetEmail],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, reset } as const;
};
