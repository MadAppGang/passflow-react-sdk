import { isEmailVerificationStep } from '@passflow/core';
import type { EmailCodeStep, EmailVerificationStep } from '@/types';

export const emailCodeSentFallbackMessage = 'We sent a code to your email.';
export const emailLinkSentFallbackMessage = 'Check your email for a link to finish signing up.';

const messageOr = (message: unknown, fallback: string): string =>
  typeof message === 'string' && message.trim() !== '' ? message.trim() : fallback;

/**
 * Reads an auth answer as an email verification step: `code` when the server emailed a code (a non-empty
 * `challenge_id`), `link` when it emailed a link instead. `null` for anything else (tokens, a 2FA token, no answer).
 */
export const readEmailVerificationStep = (answer: unknown): EmailVerificationStep | null => {
  if (!isEmailVerificationStep(answer)) return null;
  const challengeId = (answer as { challenge_id?: unknown }).challenge_id;
  if (typeof challengeId === 'string' && challengeId !== '') {
    return { kind: 'code', challengeId, message: messageOr(answer.message, emailCodeSentFallbackMessage) };
  }
  return { kind: 'link', message: messageOr(answer.message, emailLinkSentFallbackMessage) };
};

export type EmailCodeStepState = {
  step: EmailCodeStep;
  /** The display message of the last failed verify or resend; cleared by the next attempt or a new code. */
  error: string | null;
};

export type EmailCodeStepEvent =
  | { type: 'ENTER'; step: EmailVerificationStep }
  | { type: 'VERIFY_STARTED' }
  | { type: 'VERIFY_OK' }
  | { type: 'VERIFY_FAILED'; message: string }
  | { type: 'RESENT'; challengeId: string; message: string }
  | { type: 'LINK_SENT'; message: string }
  | { type: 'RESEND_FAILED'; message: string }
  | { type: 'CANCEL' };

export const initialEmailCodeStepState: EmailCodeStepState = { step: { kind: 'none' }, error: null };

/**
 * The emailed-code step as a transition table. Only `ENTER` leaves `none`: a verify or resend answer that lands
 * after the user went back is a real race, not a bug, so it is ignored rather than resurrecting the step. Verify and
 * resend events only change a `code` step; in `link` there is nothing left to verify or resend.
 */
export const emailCodeStepReducer = (state: EmailCodeStepState, event: EmailCodeStepEvent): EmailCodeStepState => {
  switch (event.type) {
    case 'ENTER':
      return { step: event.step, error: null };
    case 'CANCEL':
      return initialEmailCodeStepState;
    case 'VERIFY_STARTED':
    case 'VERIFY_OK':
      return state.step.kind === 'code' && state.error !== null ? { ...state, error: null } : state;
    case 'VERIFY_FAILED':
    case 'RESEND_FAILED':
      return state.step.kind === 'code' ? { ...state, error: event.message } : state;
    case 'RESENT':
      return state.step.kind === 'code'
        ? { step: { kind: 'code', challengeId: event.challengeId, message: event.message }, error: null }
        : state;
    case 'LINK_SENT':
      return state.step.kind === 'code' ? { step: { kind: 'link', message: event.message }, error: null } : state;
    default: {
      const unhandled: never = event;
      return unhandled;
    }
  }
};
