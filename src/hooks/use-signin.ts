import type {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
} from '@passflow/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthOperation, AuthUiError } from '@/types';
import { authErrorFor, authErrorFrom } from '@/utils';
import { type UseEmailCodeStep, useEmailCodeStep } from './use-email-code-step';
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
  /** Abandons the passkey request in flight: the form returns with a cancelled error, and this hook ignores the request's late result. core may still finish a sign-in that completes later. */
  cancelPasskey: () => void;
  /** The sign-in method whose request is in flight, `null` when none is. */
  pendingOperation: AuthOperation | null;
  /**
   * The emailed-code step. A password request the server answers with a code (or a link) enters it, and `fetch`
   * resolves `false`: there is no session yet.
   */
  emailCode: UseEmailCodeStep;
};

export const useSignIn: UseSignInProps = () => {
  const passflow = usePassflow();
  // The password request is kept only to repeat it for "Resend code"; never rendered, logged or stored.
  const lastPasswordPayloadRef = useRef<PassflowSignInPayload | null>(null);
  const resendPasswordRequest = useCallback(async () => {
    const payload = lastPasswordPayloadRef.current;
    if (!payload) throw new Error('Nothing to resend');
    return passflow.signIn(payload);
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
  const [error, setError] = useState<AuthUiError | null>(null);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<AuthOperation | null>(null);
  const attemptRef = useRef(0);

  const fetch = useCallback(
    async (
      payload: PassflowPasskeyAuthenticateStartPayload | PassflowSignInPayload | PassflowPasswordlessSignInPayload,
      type: AuthOperation,
    ): Promise<boolean | string | PassflowPasswordlessResponse> => {
      attemptRef.current += 1;
      const attempt = attemptRef.current;
      const isCurrent = () => attempt === attemptRef.current;
      setIsLoading(true);
      setPendingOperation(type);
      setIsError(false);
      setError(null);

      try {
        if (type === 'password') {
          const answer = await passflow.signIn(payload as PassflowSignInPayload);
          if (!isCurrent()) return false;
          // Held before entering: a link answer releases it at once, a code answer keeps it for resend.
          lastPasswordPayloadRef.current = payload as PassflowSignInPayload;
          if (emailCode.enter(answer)) return false;
          lastPasswordPayloadRef.current = null;
        } else if (type === 'passkey') {
          await passflow.passkeyAuthenticate(payload as PassflowPasskeyAuthenticateStartPayload);
        } else {
          const answer = await passflow.passwordlessSignIn(payload as PassflowPasswordlessSignInPayload);
          return isCurrent() ? answer : false;
        }
        return isCurrent();
      } catch (error) {
        if (!isCurrent()) return false;
        console.error(`[passflow] ${type} sign-in failed`, error);
        setIsError(true);
        setError(authErrorFrom(error, 'sign-in', type));
        return false;
      } finally {
        if (isCurrent()) {
          setIsLoading(false);
          setPendingOperation(null);
        }
      }
    },
    [passflow.passkeyAuthenticate, passflow.passwordlessSignIn, passflow.signIn, emailCode.enter],
  );

  const reset = () => {
    setIsError(false);
    setError(null);
    setIsLoading(false);
    setPendingOperation(null);
  };

  const cancelPasskey = useCallback(() => {
    attemptRef.current += 1;
    setIsLoading(false);
    setPendingOperation(null);
    setIsError(true);
    setError({ message: 'Passkey sign-in was cancelled.', scope: authErrorFor('sign-in', 'passkey').scope });
  }, []);

  return { fetch, isLoading, isError, error, reset, cancelPasskey, pendingOperation, emailCode } as const;
};
