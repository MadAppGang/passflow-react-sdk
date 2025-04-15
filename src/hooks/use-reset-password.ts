import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseResetPasswordProps = () => {
  fetch: (newPassword: string) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useResetPassword: UseResetPasswordProps = () => {
  const passflow = usePassflow();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (newPassword: string): Promise<boolean> => {
      try {
        setIsLoading(true);
        await passflow.resetPassword(newPassword);
        setIsLoading(false);
        return true;
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return false;
      }
    },
    [passflow.resetPassword],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, reset } as const;
};
