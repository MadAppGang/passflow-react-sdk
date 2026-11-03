import type { AuthFlow, AuthOperation, AuthUiError } from '@/types';

const AUTH_ERROR_COPY: Record<AuthFlow, Record<AuthOperation, AuthUiError>> = {
  'sign-in': {
    password: {
      message: "We couldn't sign you in. Check your details and try again.",
      scope: 'credentials',
    },
    passwordless: {
      message: "We couldn't start passwordless sign-in. Check your connection and try again.",
      scope: 'form',
    },
    passkey: {
      message: "We couldn't complete passkey sign-in. Try again or use another sign-in method.",
      scope: 'form',
    },
  },
  'sign-up': {
    password: {
      message: "We couldn't create your account. Check the information you entered and try again.",
      scope: 'form',
    },
    passwordless: {
      message: "We couldn't start passwordless registration. Check your connection and try again.",
      scope: 'form',
    },
    passkey: {
      message: "We couldn't create your account with a passkey. Try again or choose another method.",
      scope: 'form',
    },
  },
};

export const authRedirectErrorMessage = "We couldn't continue this authentication request. Return to the app and try again.";

export const verificationLinkErrorMessage =
  'This verification link is invalid or incomplete. Request a new link or code and try again.';

export const invitationLinkErrorMessage = 'This invitation link is invalid or has expired.';

export const verificationRequestErrorMessage =
  'This verification request is no longer available. Start again to request a new link or code.';

export const authErrorFor = (flow: AuthFlow, operation: AuthOperation): AuthUiError => AUTH_ERROR_COPY[flow][operation];

/**
 * Server error ids whose `message` is written for the end user (localized, no operator detail) and may be shown as
 * is. Every other id keeps the SDK's fixed copy, so server text that was not meant for a sign-in screen never reaches
 * one. `error.not.found` is deliberately absent: it is a generic id across the API (its text can name a missing user).
 */
export const SERVER_MESSAGE_ERROR_IDS: ReadonlySet<string> = new Set([
  'error.registration.email.domain_not_allowed',
  'error.registration.email.required',
  'error.registration.email.not_verified_by_provider',
  'error.invite.email.domain_not_allowed',
  'error.verification.code.rate_limited',
  'error.otp.incorrect',
  'error.otp.expired',
  'error.otp.already.used',
  'error.challenge.address.changed',
  'error.challenge.app_mismatch',
  'error.email.verification.required',
  'error.registration.continuation.invalid',
]);

const readField = (value: unknown, field: string): unknown =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[field] : undefined;

/**
 * The server's own message for an allow-listed error id, trimmed; `null` for anything else. Duck-typed on
 * `{ id, message }`, so it reads a `PassflowError` as well as a plain object such as a redirect's query.
 */
export const serverMessageFor = (error: unknown): string | null => {
  const id = readField(error, 'id');
  const message = readField(error, 'message');
  if (typeof id !== 'string' || !SERVER_MESSAGE_ERROR_IDS.has(id)) return null;
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  return trimmed === '' ? null : trimmed;
};

/** A hook's display error: the server's message for an allow-listed id, else the fixed copy for the operation. */
export const authErrorFrom = (error: unknown, flow: AuthFlow, operation: AuthOperation): AuthUiError => {
  const message = serverMessageFor(error);
  return message === null ? authErrorFor(flow, operation) : { message, scope: 'form' };
};

/**
 * The message for a federated redirect that came back as `?error=<id>&message=<text>`: the server's text when the id
 * is allow-listed, else the generic redirect copy.
 */
export const authRedirectErrorFrom = (error: string, message: string | null): string =>
  serverMessageFor({ id: error, message }) ?? authRedirectErrorMessage;

export const invitationJoinErrorMessage = "We couldn't accept this invitation. Try again.";

/** Invitation join error: the server's message for an allow-listed id, else the fixed copy. */
export const invitationJoinErrorFrom = (error: unknown): string => serverMessageFor(error) ?? invitationJoinErrorMessage;

export const emailCodeInvalidMessage = 'This code is no longer valid. Request a new code.';
export const emailCodeUnavailableMessage = "We couldn't check the code. Try again.";
export const emailCodeRestartMessage = "We couldn't verify the code. Go back and start again.";

/**
 * Error copy for the emailed-code step (`/auth/validate`, resend): allow-listed ids show the server message; an
 * unknown or spent challenge asks for a new code; a server or network failure asks to retry; anything else (401, a
 * missing PKCE verifier) asks to start again.
 */
export const emailCodeErrorMessage = (error: unknown): string => {
  const serverMessage = serverMessageFor(error);
  if (serverMessage !== null) return serverMessage;

  const id = readField(error, 'id');
  const status = readField(error, 'status');
  if (id === 'error.not.found' || status === 400) return emailCodeInvalidMessage;
  if (typeof status === 'number' && status >= 500) return emailCodeUnavailableMessage;
  // An axios failure with no response (offline, CORS, timeout) is not converted to a PassflowError by core.
  if (readField(error, 'isAxiosError') === true && readField(error, 'response') === undefined) {
    return emailCodeUnavailableMessage;
  }
  return emailCodeRestartMessage;
};

export const resetLinkInvalidMessage = 'This link is invalid or has expired. Request a new one.';
export const newPasswordUnavailableMessage = "We couldn't save your password. Try again.";
export const passwordSavedRateLimitedMessage =
  'Your password was saved, but we cannot send a verification code right now. Wait a few minutes, then sign in with your new password.';

/**
 * A 429 from `/auth/password/change`: the password was already changed, only the emailed code that should follow
 * was refused, so the screen must not ask for the password again.
 */
export const isPasswordSavedRateLimit = (error: unknown): boolean =>
  readField(error, 'id') === 'error.verification.code.rate_limited' || readField(error, 'status') === 429;

/**
 * Error copy for the new-password screen (reset link or registration continuation): allow-listed ids show the server
 * message; a refused or spent link (any other 4xx, an `error.token.*` id) asks for a new one; a server or network
 * failure asks to retry. The raw message of anything else is never shown.
 */
export const newPasswordErrorMessage = (error: unknown): string => {
  if (isPasswordSavedRateLimit(error)) return passwordSavedRateLimitedMessage;
  const serverMessage = serverMessageFor(error);
  if (serverMessage !== null) return serverMessage;

  const id = readField(error, 'id');
  const status = readField(error, 'status');
  if (typeof id === 'string' && id.startsWith('error.token.')) return resetLinkInvalidMessage;
  if (typeof status === 'number' && status >= 400 && status < 500) return resetLinkInvalidMessage;
  return newPasswordUnavailableMessage;
};
