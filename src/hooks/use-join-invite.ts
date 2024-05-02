import { useCallback, useState } from 'react';
import { useAooth } from './use-aooth';

export type TuseJoinInvite = () => {
  fetch: (token: string) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

export const useJoinInvite: TuseJoinInvite = () => {
  const aooth = useAooth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await aooth.joinInvitation(token);
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
