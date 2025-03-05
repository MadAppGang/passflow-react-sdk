import { useCallback, useState } from 'react';
import {
  PassflowPasskeyRegisterStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignUpPayload,
} from '@passflow/passflow-js-sdk';
import { usePassflow } from './use-passflow';

export type UseSignUpProps = () => {
  fetch: (
    payload: PassflowPasskeyRegisterStartPayload | PassflowSignUpPayload | PassflowPasswordlessSignInPayload,
    type: 'passkey' | 'password' | 'passwordless',
  ) => Promise<boolean | string | PassflowPasswordlessResponse>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useSignUp: UseSignUpProps = () => {
  const passflow = usePassflow();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload: PassflowPasskeyRegisterStartPayload | PassflowSignUpPayload | PassflowPasswordlessSignInPayload,
      type: 'passkey' | 'password' | 'passwordless',
    ): Promise<boolean | PassflowPasswordlessResponse> => {
      setIsLoading(true);
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
      } catch (e) {
        setIsError(true);
        const error = e as Error;
        setErrorMessage(error.message);
        cleanup();
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
