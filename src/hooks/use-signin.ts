import type {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
} from '@passflow/passflow-js-sdk';
import { useCallback, useState } from 'react';
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
      setIsLoading(true);
      const cleanup = () => setIsLoading(false);

      // We'll make sure to call cleanup after the operation completes
      try {
        if (type === 'password') await passflow.signIn(payload as PassflowSignInPayload);
        else if (type === 'passkey') {
          await passflow.passkeyAuthenticate(payload as PassflowPasskeyAuthenticateStartPayload);
        } else {
          return await passflow.passwordlessSignIn(payload as PassflowPasswordlessSignInPayload);
        }
        return true;
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        return false;
      } finally {
        cleanup();
      }
    },
    [passflow.passkeyAuthenticate, passflow.passwordlessSignIn, passflow.signIn],
  );

  const reset = () => {
    setIsError(false);
    setErrorMessage('');
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error: errorMessage, reset } as const;
};
