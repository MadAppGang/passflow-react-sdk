import { useCallback, useState } from 'react';
import {
  AoothPasskeyAuthenticateStartPayload,
  AoothPasskeyCompleteMessage,
  AoothPasswordlessResponse,
  AoothPasswordlessSignInPayload,
  AoothSignInPayload,
} from '@aooth/aooth-js-sdk';
import { useAooth } from './use-aooth';

export type TuseSignIn = () => {
  fetch: (
    payload: AoothPasskeyAuthenticateStartPayload | AoothSignInPayload | AoothPasswordlessSignInPayload,
    type: 'passkey' | 'password' | 'passwordless',
  ) => Promise<boolean | string | AoothPasswordlessResponse>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useSignIn: TuseSignIn = () => {
  const aooth = useAooth();
  const [errorMessage, setErrorMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload: AoothPasskeyAuthenticateStartPayload | AoothSignInPayload | AoothPasswordlessSignInPayload,
      type: 'passkey' | 'password' | 'passwordless',
    ): Promise<boolean | string | AoothPasswordlessResponse> => {
      try {
        setIsLoading(true);
        if (type === 'password') await aooth.signIn(payload as AoothSignInPayload);
        else if (type === 'passkey') {
          const response = await aooth.passkeyAuthenticate(payload as AoothPasskeyAuthenticateStartPayload);
          if ((response as AoothPasskeyCompleteMessage)?.challenge_id)
            return (response as AoothPasskeyCompleteMessage).challenge_id;
        } else {
          const passwordlessResponse = await aooth.passwordlessSignIn(payload as AoothPasswordlessSignInPayload);
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
