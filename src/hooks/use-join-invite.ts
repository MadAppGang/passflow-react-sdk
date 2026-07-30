import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

const invitationJoinError = "We couldn't accept this invitation. Try again.";

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
        setErrorMessage(invitationJoinError);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [passflow.joinInvitation],
  );

  return { fetch, isLoading, isError, error: errorMessage } as const;
};
