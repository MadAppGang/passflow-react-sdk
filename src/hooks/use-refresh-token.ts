import { useCallback, useState } from 'react';
import { useAooth } from './use-aooth';
import { defaultScopes } from '@/constants';

export type TuseRefreshToken = () => {
  fetch: () => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

export const useRefreshToken: TuseRefreshToken = () => {
  const aooth = useAooth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      await aooth.refreshToken(defaultScopes);
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
