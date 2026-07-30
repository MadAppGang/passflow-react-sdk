import type { AuthOperation, AuthUiError } from '@/types';
import { authErrorFor } from '@/utils';
import type {
  PassflowPasskeyRegisterStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignUpPayload,
} from '@passflow/core';
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

export type UseSignUpProps = () => {
  fetch: (
    payload: PassflowPasskeyRegisterStartPayload | PassflowSignUpPayload | PassflowPasswordlessSignInPayload,
    type: AuthOperation,
  ) => Promise<boolean | string | PassflowPasswordlessResponse>;
  isLoading: boolean;
  isError: boolean;
  error: AuthUiError | null;
  reset: () => void;
};

export const useSignUp: UseSignUpProps = () => {
  const passflow = usePassflow();
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<AuthUiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload: PassflowPasskeyRegisterStartPayload | PassflowSignUpPayload | PassflowPasswordlessSignInPayload,
      type: AuthOperation,
    ): Promise<boolean | PassflowPasswordlessResponse> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      const cleanup = () => setIsLoading(false);

      try {
        if (type === 'password') await passflow.signUp(payload as PassflowSignUpPayload);
        else if (type === 'passkey') {
          await passflow.passkeyRegister(payload as PassflowPasskeyRegisterStartPayload);
        } else {
          const passwordlessResponse = await passflow.passwordlessSignIn(payload as PassflowPasswordlessSignInPayload);
          cleanup();
          return passwordlessResponse;
        }
        cleanup();
        return true;
      } catch (error) {
        console.error(`[passflow] ${type} sign-up failed`, error);
        setIsError(true);
        setError(authErrorFor('sign-up', type));
        cleanup();
        return false;
      } finally {
        cleanup();
      }
    },
    [passflow.signUp, passflow.passkeyRegister, passflow.passwordlessSignIn],
  );

  const reset = () => {
    setIsError(false);
    setError(null);
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error, reset } as const;
};
