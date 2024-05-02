import { useCallback, useState } from 'react';
import { useAooth } from './use-aooth';
import { AoothSendPasswordResetEmailPayload } from '@aooth/aooth-js-sdk';

export type TuseForgotPassword = () => {
  fetch: (payload: AoothSendPasswordResetEmailPayload) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useForgotPassword: TuseForgotPassword = () => {
  const aooth = useAooth();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (payload: AoothSendPasswordResetEmailPayload): Promise<boolean> => {
    try {
      setIsLoading(true);
      await aooth.sendPasswordResetEmail(payload);
      setIsLoading(false);
      return true;
    } catch (e) {
      setIsError(true);
      const error = e as Error;
      setErrorMessage(error.message);
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, reset } as const;
};
