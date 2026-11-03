import type {
  PassflowPasskeyRegisterStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignUpPayload,
} from '@passflow/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthOperation, AuthUiError } from '@/types';
import { authErrorFrom } from '@/utils';
import { type UseEmailCodeStep, useEmailCodeStep } from './use-email-code-step';
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
  /**
   * The emailed-code step. A password request the server answers with a code (or a link) enters it, and `fetch`
   * resolves `false`: there is no session yet.
   */
  emailCode: UseEmailCodeStep;
};

export const useSignUp: UseSignUpProps = () => {
  const passflow = usePassflow();
  // The password request is kept only to repeat it for "Resend code"; never rendered, logged or stored.
  const lastPasswordPayloadRef = useRef<PassflowSignUpPayload | null>(null);
  const resendPasswordRequest = useCallback(async () => {
    const payload = lastPasswordPayloadRef.current;
    if (!payload) throw new Error('Nothing to resend');
    return passflow.signUp(payload);
  }, [passflow]);
  const emailCode = useEmailCodeStep({
    resend: resendPasswordRequest,
    onRelease: () => {
      lastPasswordPayloadRef.current = null;
    },
  });

  useEffect(
    () => () => {
      lastPasswordPayloadRef.current = null;
    },
    [],
  );
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
        if (type === 'password') {
          const answer = await passflow.signUp(payload as PassflowSignUpPayload);
          // Held before entering: a link answer releases it at once, a code answer keeps it for resend.
          lastPasswordPayloadRef.current = payload as PassflowSignUpPayload;
          if (emailCode.enter(answer)) return false;
          lastPasswordPayloadRef.current = null;
        } else if (type === 'passkey') {
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
        setError(authErrorFrom(error, 'sign-up', type));
        cleanup();
        return false;
      } finally {
        cleanup();
      }
    },
    [passflow.signUp, passflow.passkeyRegister, passflow.passwordlessSignIn, emailCode.enter],
  );

  const reset = () => {
    setIsError(false);
    setError(null);
    setIsLoading(false);
  };

  return { fetch, isLoading, isError, error, reset, emailCode } as const;
};
