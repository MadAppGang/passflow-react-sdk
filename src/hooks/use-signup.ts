import { useCallback, useState } from 'react';
import {
  AoothPasskeyRegisterCompleteMessage,
  AoothPasskeyRegisterStartPayload,
  AoothPasswordlessResponse,
  AoothPasswordlessSignInPayload,
  AoothSignUpPayload,
} from '@aooth/aooth-js-sdk';
import { useAooth } from './use-aooth';

export type TuseSignUp = () => {
  fetch: (
    payload: AoothPasskeyRegisterStartPayload | AoothSignUpPayload | AoothPasswordlessSignInPayload,
    type: 'passkey' | 'password' | 'passwordless',
  ) => Promise<boolean | string | AoothPasswordlessResponse>;
  isLoading: boolean;
  isError: boolean;
  error: string;
  reset: () => void;
};

export const useSignUp: TuseSignUp = () => {
  const aooth = useAooth();
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(
    async (
      payload: AoothPasskeyRegisterStartPayload | AoothSignUpPayload | AoothPasswordlessSignInPayload,
      type: 'passkey' | 'password' | 'passwordless',
    ): Promise<boolean | string | AoothPasswordlessResponse> => {
      try {
        setIsLoading(true);
        if (type === 'password') await aooth.signUp(payload as AoothSignUpPayload);
        else if (type === 'passkey') {
          const response = await aooth.passkeyRegister(payload as AoothPasskeyRegisterStartPayload);
          if ((response as AoothPasskeyRegisterCompleteMessage)?.challenge_id)
            return (response as AoothPasskeyRegisterCompleteMessage).challenge_id;
        } else {
          const passwordlessResponse = await aooth.passwordlessSignIn(payload as AoothPasswordlessSignInPayload);
          return passwordlessResponse;
        }
        setIsLoading(false);
        return true;
      } catch (e) {
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
