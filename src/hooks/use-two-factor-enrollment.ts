import type { TwoFactorEnrollment, TwoFactorSetupResponse } from '@passflow/core';
import { useContext, useEffect, useRef, useState } from 'react';
import { PassflowContext } from '@/context';
import {
  enrollmentFailureFrom,
  serverErrorStatusFrom,
  twoFactorRateLimitedMessage,
  twoFactorSendFailedMessage,
  twoFactorSetupCodeChangedMessage,
  twoFactorSetupSavedNewCodeMessage,
  twoFactorSetupSavedSignInMessage,
  twoFactorSignInOverMessage,
  twoFactorTryAgainMessage,
  twoFactorWrongCodeMessage,
} from '@/utils/auth-error';
import { usePassflow } from './use-passflow';

/** Send taps on the email link screen: send, begin and challenge share 3 requests per 5 minutes on the server. */
export const TWO_FACTOR_LINK_MAX_SENDS = 3;

export type TwoFactorEnrollmentScreen =
  | { kind: 'loading' }
  | { kind: 'verify'; notice?: string; digits?: number }
  | { kind: 'email_link'; sent: boolean; sends: number; busy: boolean; error?: string }
  | {
      kind: 'direct';
      step: 'start' | 'code' | 'codes';
      data: TwoFactorSetupResponse | null;
      codes: string[];
      busy: boolean;
      error?: string;
      /** Shown on the code step until the next confirm. */
      notice?: string;
    }
  | { kind: 'unavailable' }
  | { kind: 'ended'; message: string }
  | { kind: 'read_failed' }
  | { kind: 'finished' };

export type UseTwoFactorEnrollmentProps = {
  /** The sign-in is finished, by the enrolment's verify or by `complete`. */
  onFinished?: () => void;
};

export type UseTwoFactorEnrollmentReturn = {
  screen: TwoFactorEnrollmentScreen;
  /** Reads the state. It has no guard, so Try again and the `not_allowed` re-read work. */
  read: () => Promise<void>;
  sendLink: () => Promise<void>;
  begin: () => Promise<void>;
  confirm: (code: string) => Promise<void>;
  /** "I've saved these codes": finishes the sign-in with the code that confirmed. */
  finish: () => Promise<void>;
  /** The verify or recovery form ended the sign-in. */
  end: (type: 'expired' | 'rate_limited') => void;
  /** The verify or recovery form finished the sign-in. */
  complete: () => void;
};

const screenFor = (enrollment: TwoFactorEnrollment): TwoFactorEnrollmentScreen => {
  switch (enrollment) {
    case 'verify':
      return { kind: 'verify' };
    case 'email_link':
      return { kind: 'email_link', sent: false, sends: 0, busy: false };
    case 'direct':
      return { kind: 'direct', step: 'start', data: null, codes: [], busy: false };
    case 'unavailable':
      return { kind: 'unavailable' };
    default:
      return { kind: 'read_failed' };
  }
};

/**
 * What the verify screen shows for a pending sign-in, as the server decides it. Nothing that spends budget runs on
 * mount: only the state is read, once, and the link send and begin wait for a tap.
 */
export const useTwoFactorEnrollment = ({ onFinished }: UseTwoFactorEnrollmentProps = {}): UseTwoFactorEnrollmentReturn => {
  const passflow = usePassflow();
  const isDiscovering = useContext(PassflowContext)?.state.isDiscoveringAppId ?? false;
  const [screen, setScreen] = useState<TwoFactorEnrollmentScreen>({ kind: 'loading' });

  const readOnMount = useRef(false);
  const notAllowedReread = useRef(false);
  const beganAgain = useRef(false);
  // The code that confirmed. Verify cannot run before the codes show: the OIDC interceptor follows `redirect_url`
  // on `/auth/2fa/*` immediately, and the codes would vanish.
  const heldCode = useRef<string | null>(null);

  const updateDirect = (patch: Partial<Extract<TwoFactorEnrollmentScreen, { kind: 'direct' }>>) =>
    setScreen((current) => (current.kind === 'direct' ? { ...current, ...patch } : current));

  const endSignIn = () =>
    setScreen({
      kind: 'ended',
      message: heldCode.current === null ? twoFactorSignInOverMessage : twoFactorSetupSavedSignInMessage,
    });

  const handleFailure = (error: unknown, stay: (message: string) => void) => {
    const failure = enrollmentFailureFrom(error);
    if (failure === 'over') {
      endSignIn();
    } else if (failure === 'rate_limited') {
      setScreen({ kind: 'ended', message: twoFactorRateLimitedMessage });
    } else if (failure === 'unavailable') {
      setScreen({ kind: 'unavailable' });
    } else if (failure === 'not_allowed' && !notAllowedReread.current) {
      notAllowedReread.current = true;
      void read();
    } else if (failure === 'send_failed') {
      stay(twoFactorSendFailedMessage);
    } else {
      stay(twoFactorTryAgainMessage);
    }
  };

  const read = async () => {
    setScreen({ kind: 'loading' });
    try {
      setScreen(screenFor(await passflow.getTwoFactorEnrollment()));
    } catch (error) {
      if (serverErrorStatusFrom(error) === 401) endSignIn();
      else handleFailure(error, () => setScreen({ kind: 'read_failed' }));
    }
  };

  useEffect(() => {
    if (isDiscovering || readOnMount.current) return;
    readOnMount.current = true;
    if (passflow.isTwoFactorVerificationRequired()) void read();
    else setScreen({ kind: 'verify' });
  }, [isDiscovering, passflow]);

  const sendLink = async () => {
    if (screen.kind !== 'email_link' || screen.busy || screen.sends >= TWO_FACTOR_LINK_MAX_SENDS) return;
    const { sent } = screen;
    const sends = screen.sends + 1;
    const stay = (error: string) => setScreen({ kind: 'email_link', sent, sends, busy: false, error });

    setScreen({ kind: 'email_link', sent, sends, busy: true });
    try {
      const { email_sent: emailSent } = await passflow.sendTwoFactorSetupLink();
      if (emailSent) setScreen({ kind: 'email_link', sent: true, sends, busy: false });
      else stay(twoFactorSendFailedMessage);
    } catch (error) {
      handleFailure(error, stay);
    }
  };

  const beginEnrollment = async (notice?: string) => {
    updateDirect({ busy: true, error: undefined });
    try {
      const data = await passflow.beginTwoFactorEnrollment();
      updateDirect({ step: 'code', data, busy: false, notice });
    } catch (error) {
      handleFailure(error, (message) => updateDirect({ busy: false, error: message }));
    }
  };

  const confirm = async (code: string) => {
    updateDirect({ busy: true, error: undefined, notice: undefined });
    try {
      const { recovery_codes: codes } = await passflow.confirmTwoFactorEnrollment(code);
      heldCode.current = code;
      updateDirect({ step: 'codes', codes, busy: false });
    } catch (error) {
      const failure = enrollmentFailureFrom(error);
      if (failure === 'wrong_code') {
        updateDirect({ busy: false, error: twoFactorWrongCodeMessage });
      } else if (failure === 'setup_incomplete' && !beganAgain.current) {
        beganAgain.current = true;
        await beginEnrollment(twoFactorSetupCodeChangedMessage);
      } else {
        handleFailure(error, (message) => updateDirect({ busy: false, error: message }));
      }
    }
  };

  const complete = () => {
    setScreen({ kind: 'finished' });
    onFinished?.();
  };

  const finish = async () => {
    if (screen.kind !== 'direct' || heldCode.current === null) return;
    const digits = screen.data?.totp_digits;

    updateDirect({ busy: true, error: undefined });
    try {
      await passflow.verifyTwoFactor(heldCode.current);
      complete();
    } catch (error) {
      // The held code goes stale after about 30-60 seconds on the codes: a common case, so it gets its own screen.
      if (enrollmentFailureFrom(error) === 'wrong_code') {
        setScreen({ kind: 'verify', notice: twoFactorSetupSavedNewCodeMessage, digits });
      } else {
        handleFailure(error, (message) => updateDirect({ busy: false, error: message }));
      }
    }
  };

  const end = (type: 'expired' | 'rate_limited') => {
    if (type === 'rate_limited') setScreen({ kind: 'ended', message: twoFactorRateLimitedMessage });
    else endSignIn();
  };

  return { screen, read, sendLink, begin: () => beginEnrollment(), confirm, finish, end, complete };
};
