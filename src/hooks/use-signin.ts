import type { AuthOperation, AuthUiError } from '@/types';
import { authErrorFor } from '@/utils';
import type {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
} from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseSignInProps = () => {
  fetch: (
    payload: PassflowPasskeyAuthenticateStartPayload | PassflowSignInPayload | PassflowPasswordlessSignInPayload,
    type: AuthOperation,
  ) => Promise<boolean | string | PassflowPasswordlessResponse>;
  isLoading: boolean;
  isError: boolean;
  error: AuthUiError | null;
  reset: () => void;
};

export const useSignIn: UseSignInProps = () => {
  const passflow = usePassflow();
  const [error, setError] = useState<AuthUiError | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload: PassflowPasskeyAuthenticateStartPayload | PassflowSignInPayload | PassflowPasswordlessSignInPayload,
      type: AuthOperation,
    ): Promise<boolean | string | PassflowPasswordlessResponse> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
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
      } catch (error) {
        console.error(`[passflow] ${type} sign-in failed`, error);
        setIsError(true);
        setError(authErrorFor('sign-in', type));
        return false;
      } finally {
        cleanup();
      }
    },
    [passflow.passkeyAuthenticate, passflow.passwordlessSignIn, passflow.signIn],
  );

  const reset = () => {
    setIsError(false);
    setError(null);
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error, reset } as const;
};
