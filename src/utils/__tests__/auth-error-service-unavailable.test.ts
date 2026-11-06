import { PassflowError, SERVICE_UNAVAILABLE_ERROR_ID, SERVICE_UNAVAILABLE_MESSAGE } from '@passflow/core';
import { describe, expect, it } from 'vitest';
import {
  approvalErrorFrom,
  authErrorFrom,
  authRedirectErrorFrom,
  emailCodeErrorMessage,
  invitationJoinErrorFrom,
  newPasswordErrorMessage,
  passwordlessCompleteErrorMessage,
} from '../auth-error';

const unavailable = (status: number) =>
  new PassflowError({
    id: SERVICE_UNAVAILABLE_ERROR_ID,
    message: SERVICE_UNAVAILABLE_MESSAGE,
    status,
    location: '',
    time: '',
  });

// A gateway or proxy may put its own text on the error; the screen must still show core's fixed message.
const unavailableWithOtherText = (status: number) =>
  new PassflowError({ id: SERVICE_UNAVAILABLE_ERROR_ID, message: 'upstream connect error', status, location: '', time: '' });

describe.each([0, 503])('Passflow unavailable (status %i) shows core message', (status) => {
  for (const make of [unavailable, unavailableWithOtherText]) {
    const error = make(status);

    it(`authErrorFrom, every flow and operation (${error.message})`, () => {
      for (const flow of ['sign-in', 'sign-up'] as const) {
        for (const operation of ['password', 'passwordless', 'passkey'] as const) {
          expect(authErrorFrom(error, flow, operation)).toEqual({ message: SERVICE_UNAVAILABLE_MESSAGE, scope: 'form' });
        }
      }
    });

    it(`emailCodeErrorMessage (${error.message})`, () => {
      expect(emailCodeErrorMessage(error)).toBe(SERVICE_UNAVAILABLE_MESSAGE);
    });

    it(`approvalErrorFrom keeps the screen (${error.message})`, () => {
      expect(approvalErrorFrom(error)).toEqual({ message: SERVICE_UNAVAILABLE_MESSAGE, terminal: false });
    });

    it(`passwordlessCompleteErrorMessage (${error.message})`, () => {
      expect(passwordlessCompleteErrorMessage(error)).toBe(SERVICE_UNAVAILABLE_MESSAGE);
    });

    it(`newPasswordErrorMessage (${error.message})`, () => {
      expect(newPasswordErrorMessage(error)).toBe(SERVICE_UNAVAILABLE_MESSAGE);
    });

    it(`invitationJoinErrorFrom (${error.message})`, () => {
      expect(invitationJoinErrorFrom(error)).toBe(SERVICE_UNAVAILABLE_MESSAGE);
    });
  }
});

describe('Passflow unavailable on a redirect query', () => {
  it('authRedirectErrorFrom shows core message', () => {
    expect(authRedirectErrorFrom(SERVICE_UNAVAILABLE_ERROR_ID, null)).toBe(SERVICE_UNAVAILABLE_MESSAGE);
  });
});
