import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseJoinInviteProps = () => {
  fetch: (token: string) => Promise<boolean>;
  isLoading: boolean;
  isError: boolean;
  error: string;
};

export const useJoinInvite: UseJoinInviteProps = () => {
  const passflow = usePassflow();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async (token: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await passflow.joinInvitation(token);
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
