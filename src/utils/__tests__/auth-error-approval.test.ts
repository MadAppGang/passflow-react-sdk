import { describe, expect, it } from 'vitest';
import {
  approvalErrorFrom,
  authErrorFrom,
  emailCodeErrorMessage,
  isApprovalMatchError,
  passwordlessCompleteErrorMessage,
} from '../auth-error';

const parentErrors = [
  ['error.auth.flow.parent.expired', 'This sign-in request has expired. Start again.'],
  ['error.auth.flow.parent.not.found', "We couldn't find this sign-in request. Start again."],
  ['error.auth.flow.parent.completed', 'This sign-in request was already completed. Start again.'],
] as const;

describe('REQ-8 refused-parent errors override server diagnostics for every credential operation', () => {
  for (const flow of ['sign-in', 'sign-up'] as const) {
    for (const operation of ['password', 'passwordless', 'passkey'] as const) {
      it.each(parentErrors)(`${flow}/${operation}: %s maps to neutral form scope with Start again`, (id, message) => {
        expect(authErrorFrom({ id, message: 'private server diagnostic', status: 400 }, flow, operation)).toEqual({
          message,
          scope: 'form',
          startAgain: true,
        });
      });
    }
  }
});

describe('REQ-6 approval message mapping', () => {
  it.each([
    ['error.auth.passwordless.approval.invalid', 400, 'This link is not valid. Start again from the page where you signed in.'],
    ['error.auth.passwordless.approval.unavailable', 400, 'This sign-in cannot be approved here. Start again.'],
    ['error.otp.expired', 400, 'This link expired. Start again.'],
    ['error.otp.already.used', 409, 'This sign-in was already decided.'],
    ['error.auth.passwordless.approval.attempts', 400, 'Too many wrong codes. This sign-in was denied. Start again.'],
    ['error.passwordless.approval', 0, 'Check your connection and try again.'],
    ['error.passwordless.approval', 500, 'Check your connection and try again.'],
    ['unknown', 0, 'Check your connection and try again.'],
    ['error.server', 500, 'Something went wrong. Try again later.'],
    ['unknown', 400, 'Something went wrong. Try again later.'],
  ])('%s (%s) uses literal copy instead of a server message', (id, status, message) => {
    expect(approvalErrorFrom({ id, status, message: 'secret diagnostic' })).toMatchObject({ message });
  });

  it.each([0, 1, 2, 5])('uses the authoritative %s remaining attempts', (attempts) => {
    const error = { id: 'error.auth.passwordless.approval.match.invalid', status: 400 };
    expect(isApprovalMatchError(error)).toBe(true);
    expect(approvalErrorFrom(error, attempts)).toMatchObject({
      // Coordinator-approved copy correction: singular when one attempt remains.
      message: `That code does not match. ${attempts} ${attempts === 1 ? 'try' : 'tries'} left.`,
    });
  });

  it('does not classify other rejections as a match-code failure', () => {
    expect(isApprovalMatchError({ id: 'error.auth.passwordless.approval.invalid' })).toBe(false);
    expect(isApprovalMatchError(undefined)).toBe(false);
    expect(approvalErrorFrom(undefined)).toMatchObject({ message: 'Something went wrong. Try again later.' });
  });
});

describe('REQ-7 REQ-17 failed exchanges and legacy approval guard', () => {
  it('does not mistake a spent PKCE exchange with status 0 for a retryable connection failure', () => {
    expect(emailCodeErrorMessage({ id: 'error.pkce.exchange', status: 0 })).toBe(
      "We couldn't verify the code. Go back and start again.",
    );
  });

  it('maps legacy passwordless completion of an approval row to the unavailable message', () => {
    expect(passwordlessCompleteErrorMessage({ id: 'error.auth.passwordless.approval.unavailable', status: 400 })).toBe(
      'This sign-in cannot be approved here. Start again.',
    );
  });

  it.each(['error.passwordless.start', 'error.passwordless.complete'])(
    '%s with no response gives connection guidance',
    (id) => {
      const error = { id, status: 0, message: 'raw transport diagnostics' };
      const message = id.endsWith('start')
        ? authErrorFrom(error, 'sign-in', 'passwordless').message
        : passwordlessCompleteErrorMessage(error);
      expect(message).toMatch(/check your connection and try again/i);
      expect(message).not.toContain('raw transport diagnostics');
    },
  );
});
