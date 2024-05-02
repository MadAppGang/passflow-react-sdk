import { useCallback, useState } from 'react';
import { useAooth } from './use-aooth';

export type TuseResetPassword = () => {
  fetch: (newPassword: string) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useResetPassword: TuseResetPassword = () => {
  const aooth = useAooth();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (newPassword: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await aooth.resetPassword(newPassword);
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
