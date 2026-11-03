import type { PassflowAuthorizationResponse } from '@passflow/core';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { EmailCodeStep } from '@/types';
import { emailCodeErrorMessage, emailCodeStepReducer, initialEmailCodeStepState, readEmailVerificationStep } from '@/utils';
import { usePassflow } from './use-passflow';

export type UseEmailCodeStepOptions = {
  /**
   * Repeats the request that produced the step (the same sign-up or sign-in body). Absent when the code cannot be
   * sent again, as after a password change: the reset link is spent.
   */
  resend?: () => Promise<unknown>;
  /** The step ended (cancelled, verified, or turned into a link): anything held only for resend can be dropped. */
  onRelease?: () => void;
};

export type UseEmailCodeStep = {
  step: EmailCodeStep;
  /** Enters the step when `answer` is an email verification step; `false` (nothing changes) for any other answer. */
  enter: (answer: unknown) => boolean;
  /**
   * Posts the code. Resolves the session answer on success (the caller runs its post-auth path), `null` on a failure
   * (shown in `error`), when a verify is already in flight, or when the step was left meanwhile.
   */
  verify: (otp: string) => Promise<PassflowAuthorizationResponse | null>;
  /**
   * Sends a new code by repeating the original request. Resolves `null` normally (the step moves to the new code or
   * to the link); resolves the session answer in the rare case the repeated request signed the user in directly.
   */
  resend: () => Promise<PassflowAuthorizationResponse | null>;
  canResend: boolean;
  /** Leaves the step for the screen's own form. Ignored while a verify is in flight. */
  cancel: () => void;
  isVerifying: boolean;
  isResending: boolean;
  error: string | null;
};

/**
 * The emailed-code step of a sign-up, sign-in or password change: holds the step, posts the code with
 * `passflow.verifyEmailCode`, and resends by repeating the original request. An answer that arrives after the user
 * left the step (or after a newer step replaced it) is dropped.
 */
export const useEmailCodeStep = (options: UseEmailCodeStepOptions = {}): UseEmailCodeStep => {
  const passflow = usePassflow();
  const [state, dispatch] = useReducer(emailCodeStepReducer, initialEmailCodeStepState);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Bumped whenever the step is entered or left: an async answer from an older epoch is stale.
  const epochRef = useRef(0);
  const verifyingRef = useRef(false);
  const resendingRef = useRef(false);
  const stepRef = useRef<EmailCodeStep>(state.step);
  stepRef.current = state.step;
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(
    () => () => {
      epochRef.current += 1;
    },
    [],
  );

  const enter = useCallback((answer: unknown): boolean => {
    const step = readEmailVerificationStep(answer);
    if (step === null) return false;
    epochRef.current += 1;
    verifyingRef.current = false;
    resendingRef.current = false;
    setIsVerifying(false);
    setIsResending(false);
    dispatch({ type: 'ENTER', step });
    if (step.kind === 'link') optionsRef.current.onRelease?.();
    return true;
  }, []);

  const verify = useCallback(
    async (otp: string): Promise<PassflowAuthorizationResponse | null> => {
      const step = stepRef.current;
      if (step.kind !== 'code' || verifyingRef.current) return null;
      const epoch = epochRef.current;
      verifyingRef.current = true;
      setIsVerifying(true);
      dispatch({ type: 'VERIFY_STARTED' });

      try {
        const answer = await passflow.verifyEmailCode({ challenge_id: step.challengeId, otp });
        if (epoch !== epochRef.current) return null;

        // Not expected from /auth/validate, but core passes it through: show the new step rather than sign in.
        const next = readEmailVerificationStep(answer);
        if (next !== null) {
          enter(answer);
          return null;
        }

        // Stays "verifying" until the screen leaves: the caller now runs its post-auth path.
        dispatch({ type: 'VERIFY_OK' });
        optionsRef.current.onRelease?.();
        return answer;
      } catch (error) {
        if (epoch !== epochRef.current) return null;
        console.error('[passflow] email code verification failed', error);
        verifyingRef.current = false;
        setIsVerifying(false);
        dispatch({ type: 'VERIFY_FAILED', message: emailCodeErrorMessage(error) });
        return null;
      }
    },
    [passflow, enter],
  );

  const resend = useCallback(async (): Promise<PassflowAuthorizationResponse | null> => {
    const repeat = optionsRef.current.resend;
    if (!repeat || stepRef.current.kind !== 'code' || verifyingRef.current || resendingRef.current) return null;
    const epoch = epochRef.current;
    resendingRef.current = true;
    setIsResending(true);

    try {
      const answer = await repeat();
      if (epoch !== epochRef.current) return null;
      const next = readEmailVerificationStep(answer);
      if (next?.kind === 'code') dispatch({ type: 'RESENT', challengeId: next.challengeId, message: next.message });
      else if (next?.kind === 'link') {
        dispatch({ type: 'LINK_SENT', message: next.message });
        optionsRef.current.onRelease?.();
      } else {
        // The repeated request signed the user in (the address was verified meanwhile).
        optionsRef.current.onRelease?.();
        return (answer ?? null) as PassflowAuthorizationResponse | null;
      }
      return null;
    } catch (error) {
      if (epoch !== epochRef.current) return null;
      console.error('[passflow] email code resend failed', error);
      dispatch({ type: 'RESEND_FAILED', message: emailCodeErrorMessage(error) });
      return null;
    } finally {
      if (epoch === epochRef.current) {
        resendingRef.current = false;
        setIsResending(false);
      }
    }
  }, []);

  const cancel = useCallback(() => {
    if (verifyingRef.current) return;
    const leaving = stepRef.current;
    epochRef.current += 1;
    resendingRef.current = false;
    setIsResending(false);
    dispatch({ type: 'CANCEL' });
    // A code step on a PKCE app holds a verifier for /auth/validate; the user gave up on it. This public call also
    // clears a pending second factor, which a code step never has.
    if (leaving.kind === 'code') passflow.twoFactor?.clearPartialAuthState();
    optionsRef.current.onRelease?.();
  }, [passflow]);

  return {
    step: state.step,
    enter,
    verify,
    resend,
    canResend: Boolean(options.resend) && state.step.kind === 'code',
    cancel,
    isVerifying,
    isResending,
    error: state.error,
  };
};
