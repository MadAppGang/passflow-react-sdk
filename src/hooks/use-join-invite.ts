import { useCallback, useState } from 'react';
import { invitationJoinErrorFrom } from '@/utils';
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

  const fetch = useCallback(
    async (token: string): Promise<boolean> => {
      setIsLoading(true);
      setIsError(false);
      setErrorMessage('');

      try {
        await passflow.joinInvitation(token);
        return true;
      } catch (error) {
        console.error('[passflow] accepting invitation failed', error);
        setIsError(true);
        setErrorMessage(invitationJoinErrorFrom(error));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow.joinInvitation],
  );

  return { fetch, isLoading, isError, error: errorMessage } as const;
};
