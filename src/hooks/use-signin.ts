import { useCallback, useState } from 'react';
import {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasskeyCompleteMessage,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
} from '@passflow/passflow-js-sdk';
import { usePassflow } from './use-passflow';

export type UseSignInProps = () => {
  fetch: (
    payload: PassflowPasskeyAuthenticateStartPayload | PassflowSignInPayload | PassflowPasswordlessSignInPayload,
    type: 'passkey' | 'password' | 'passwordless',
  ) => Promise<boolean | string | PassflowPasswordlessResponse>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useSignIn: UseSignInProps = () => {
  const passflow = usePassflow();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload: PassflowPasskeyAuthenticateStartPayload | PassflowSignInPayload | PassflowPasswordlessSignInPayload,
      type: 'passkey' | 'password' | 'passwordless',
    ): Promise<boolean | string | PassflowPasswordlessResponse> => {
      try {
        setIsLoading(true);
        if (type === 'password') await passflow.signIn(payload as PassflowSignInPayload);
        else if (type === 'passkey') {
          const response = await passflow.passkeyAuthenticate(payload as PassflowPasskeyAuthenticateStartPayload);
          if ((response as PassflowPasskeyCompleteMessage)?.challenge_id)
            return (response as PassflowPasskeyCompleteMessage).challenge_id;
        } else {
          const passwordlessResponse = await passflow.passwordlessSignIn(payload as PassflowPasswordlessSignInPayload);
          return passwordlessResponse;
        }
        setIsLoading(false);
        return true;
      } catch (e) {
        setIsLoading(false);
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, reset } as const;
};
