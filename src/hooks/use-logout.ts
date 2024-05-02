import { useCallback, useState } from 'react';
import { useAooth } from './use-aooth';

export type TuseLogout = () => {
  fetch: () => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

export const useLogout: TuseLogout = () => {
  const aooth = useAooth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      await aooth.logOut();
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

  return { fetch, isLoading, isError, error: errorMessage } as const;
};
