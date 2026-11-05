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
 * The `{ id, message, status }` body of a server error. Core converts most failures to a `PassflowError`, but it
 * rejects a 429 on a non-idempotent request (`POST /auth/validate`, `/auth/register`) with the raw axios error, whose
 * body sits at `response.data.error`; read that shape too so a rate limit is classified by its id like any other.
 */
const readServerError = (error: unknown): unknown => {
  if (typeof readField(error, 'id') === 'string') return error;
  const response = readField(error, 'response');
  const body = readField(readField(response, 'data'), 'error');
  if (typeof body !== 'object' || body === null) return error;
  return { status: readField(response, 'status'), ...body };
};

/**
 * The server's own message for an allow-listed error id, trimmed; `null` for anything else. Duck-typed on
 * `{ id, message }`, so it reads a `PassflowError`, a raw axios rejection's body, or a plain object such as a
 * redirect's query.
 */
export const serverMessageFor = (error: unknown): string | null => {
  const serverError = readServerError(error);
  const id = readField(serverError, 'id');
  const message = readField(serverError, 'message');
  if (typeof id !== 'string' || !SERVER_MESSAGE_ERROR_IDS.has(id)) return null;
  if (typeof message !== 'string') return null;
  const trimmed = message.trim();
  return trimmed === '' ? null : trimmed;
};

/** A parent challenge the server refused: each id has its own copy, and only starting again can help. */
const REFUSED_PARENT_COPY: ReadonlyMap<unknown, string> = new Map([
  ['error.auth.flow.parent.expired', 'This sign-in request has expired. Start again.'],
  ['error.auth.flow.parent.not.found', "We couldn't find this sign-in request. Start again."],
  ['error.auth.flow.parent.completed', 'This sign-in request was already completed. Start again.'],
]);

/** A hook's display error: a refused parent's copy, the server's message for an allow-listed id, else the operation's fixed copy. */
export const authErrorFrom = (error: unknown, flow: AuthFlow, operation: AuthOperation): AuthUiError => {
  const refusedParent = REFUSED_PARENT_COPY.get(readField(readServerError(error), 'id'));
  if (refusedParent !== undefined) return { message: refusedParent, scope: 'form', startAgain: true };

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
 * Error copy for the emailed-code step (`/auth/validate`, resend): allow-listed ids (wrong, expired or spent code,
 * rate limit, ...) show the server message; `error.not.found` (unknown or spent challenge) asks for a new code; a
 * request that got no answer at all (offline, CORS, timeout) asks to retry; every other server answer (401, a missing
 * PKCE verifier, an unlisted 4xx or a 5xx) asks to start again, and the screen keeps its way back to the form.
 */
export const emailCodeErrorMessage = (error: unknown): string => {
  const serverMessage = serverMessageFor(error);
  if (serverMessage !== null) return serverMessage;

  if (readField(readServerError(error), 'id') === 'error.not.found') return emailCodeInvalidMessage;
  // An axios failure with no response is not converted to a PassflowError by core: nothing was decided server-side.
  if (readField(error, 'isAxiosError') === true && readField(error, 'response') === undefined) {
    return emailCodeUnavailableMessage;
  }
  return emailCodeRestartMessage;
};

// The tab waiting on a cross-device sign-in.
export const passwordlessWaitDeniedMessage = 'This sign-in was denied. Start again.';
export const passwordlessLinkExpiredMessage = 'This link expired. Start again.';
export const passwordlessWaitCompletedMessage = 'This sign-in was already used. Start again.';
export const passwordlessSignInFailedMessage = 'Sign-in failed. Start again.';

// The device approving a cross-device sign-in.
export const approvalInvalidMessage = 'This link is not valid. Start again from the page where you signed in.';
export const approvalUnavailableMessage = 'This sign-in cannot be approved here. Start again.';
export const approvalAlreadyDecidedMessage = 'This sign-in was already decided.';
export const approvalAttemptsMessage = 'Too many wrong codes. This sign-in was denied. Start again.';
export const approvalConnectionMessage = 'Check your connection and try again.';
export const approvalUnknownErrorMessage = 'Something went wrong. Try again later.';
export const approvalApprovedMessage = 'Approved. Return to the tab that started sign-in. You can close this tab.';
export const approvalDeniedMessage = 'Denied. No one was signed in. You can close this tab.';

export type ApprovalError = {
  message: string;
  /** Nothing more can be done on this screen: the form goes away. */
  terminal: boolean;
};

const approvalMatchMessage = (attemptsLeft?: number): string => {
  if (attemptsLeft === undefined) return 'That code does not match.';
  return `That code does not match. ${attemptsLeft} ${attemptsLeft === 1 ? 'try' : 'tries'} left.`;
};

/** A wrong code on the approve screen: the tries left must be read again before showing the message. */
export const isApprovalMatchError = (error: unknown): boolean =>
  readField(readServerError(error), 'id') === 'error.auth.passwordless.approval.match.invalid';

/**
 * Error copy for the approve screen. `attemptsLeft` is the count re-read after the rejection. A plain core error with
 * no response body arrives as id `error.passwordless.approval`, status 0: nothing was decided, so the screen stays.
 */
export const approvalErrorFrom = (error: unknown, attemptsLeft?: number): ApprovalError => {
  const serverError = readServerError(error);
  const id = readField(serverError, 'id');

  switch (id) {
    case 'error.auth.passwordless.approval.invalid':
      return { message: approvalInvalidMessage, terminal: true };
    case 'error.auth.passwordless.approval.unavailable':
      return { message: approvalUnavailableMessage, terminal: true };
    case 'error.otp.expired':
      return { message: passwordlessLinkExpiredMessage, terminal: true };
    case 'error.otp.already.used':
      return { message: approvalAlreadyDecidedMessage, terminal: true };
    case 'error.auth.passwordless.approval.match.invalid':
      return { message: approvalMatchMessage(attemptsLeft), terminal: false };
    case 'error.auth.passwordless.approval.attempts':
      return { message: approvalAttemptsMessage, terminal: true };
  }

  if (id === 'error.passwordless.approval' || readField(serverError, 'status') === 0) {
    return { message: approvalConnectionMessage, terminal: false };
  }
  return { message: approvalUnknownErrorMessage, terminal: false };
};

/**
 * A failed passwordless completion. A row that only another device can approve has its own copy. A failed exchange comes
 * after the row was spent, so retrying cannot work, even with no response (id `error.pkce.exchange`, status 0). Core
 * rejects a network failure or raw 429 on the completion itself as id `error.passwordless.complete`: the code was not
 * refused, so the user can try again.
 */
export const passwordlessCompleteErrorMessage = (error: unknown): string => {
  const serverError = readServerError(error);
  const id = readField(serverError, 'id');

  if (id === 'error.auth.passwordless.approval.unavailable') return approvalUnavailableMessage;
  if (id === 'error.pkce.exchange') return passwordlessSignInFailedMessage;
  if (id === 'error.passwordless.complete' || readField(serverError, 'status') === 0) return approvalConnectionMessage;
  return verificationRequestErrorMessage;
};

export const resetLinkInvalidMessage = 'This link is invalid or has expired. Request a new one.';
export const newPasswordUnavailableMessage = "We couldn't save your password. Try again.";
export const passwordSavedRateLimitedMessage =
  'Your password was saved, but we cannot send a verification code right now. Wait a few minutes, then sign in with your new password.';

/**
 * A 429 from `/auth/password/change`: the password was already changed, only the emailed code that should follow
 * was refused, so the screen must not ask for the password again.
 */
export const isPasswordSavedRateLimit = (error: unknown): boolean => {
  const serverError = readServerError(error);
  return readField(serverError, 'id') === 'error.verification.code.rate_limited' || readField(serverError, 'status') === 429;
};

/**
 * Error copy for the new-password screen (reset link or registration continuation): allow-listed ids show the server
 * message; a refused or spent link (any other 4xx, an `error.token.*` id) asks for a new one; a server or network
 * failure asks to retry. The raw message of anything else is never shown.
 */
export const newPasswordErrorMessage = (error: unknown): string => {
  if (isPasswordSavedRateLimit(error)) return passwordSavedRateLimitedMessage;
  const serverMessage = serverMessageFor(error);
  if (serverMessage !== null) return serverMessage;

  const serverError = readServerError(error);
  const id = readField(serverError, 'id');
  const status = readField(serverError, 'status');
  if (typeof id === 'string' && id.startsWith('error.token.')) return resetLinkInvalidMessage;
  if (typeof status === 'number' && status >= 400 && status < 500) return resetLinkInvalidMessage;
  return newPasswordUnavailableMessage;
};

// First-time 2FA enrolment and the verify screens.
export const twoFactorSignInOverMessage = 'Your sign-in has ended. Sign in again.';
export const twoFactorSetupSavedSignInMessage = 'Your setup is saved. Sign in again.';
export const twoFactorSetupSavedNewCodeMessage =
  'Your setup is saved. Enter a new code from your authenticator app to finish signing in.';
export const twoFactorSetupCodeChangedMessage = 'Your setup code changed. Scan this new QR code.';
export const twoFactorRateLimitedMessage = 'Too many attempts. Sign in again later.';
export const twoFactorWrongCodeMessage = 'Invalid code. Please check your authenticator app and try again.';
export const twoFactorWrongRecoveryCodeMessage = 'Invalid recovery code.';
export const twoFactorNotEnabledMessage =
  'Two-factor authentication is not enabled for your account. Please contact your administrator to enable 2FA.';
export const twoFactorSendFailedMessage = 'We could not send the setup email. Try again later or contact your administrator.';
export const twoFactorTryAgainMessage = 'Something went wrong. Try again.';
export const twoFactorLinkAlreadyUsedMessage = 'This link was already used. Sign in.';
export const twoFactorBackToSignInLabel = 'Back to sign in';
export const twoFactorSignInLabel = 'Sign in';

export type EnrollmentFailure =
  | 'over'
  | 'rate_limited'
  | 'wrong_code'
  | 'setup_incomplete'
  | 'not_allowed'
  | 'send_failed'
  | 'unavailable'
  | 'other';

/** The id of a server error, in a `PassflowError` or a raw axios rejection's object body. */
export const serverErrorIdFrom = (error: unknown): unknown => readField(readServerError(error), 'id');

/** The HTTP status of a server error. `readServerError` skips a raw 429's string body, so its response is read too. */
export const serverErrorStatusFrom = (error: unknown): unknown =>
  readField(readServerError(error), 'status') ?? readField(readField(error, 'response'), 'status');

/** The refused parents: a retry gets the same answer. */
const OVER_PARENT_IDS: ReadonlySet<unknown> = new Set([
  'error.auth.flow.parent.not.found',
  'error.auth.flow.parent.expired',
  'error.auth.flow.parent.completed',
  'error.auth.flow.parent.kind',
  'error.auth.flow.parent.pkce.missing',
]);

/** Core throws these with no id or status once its 5 minute pending state has gone. */
const OVER_MESSAGES: ReadonlySet<unknown> = new Set([
  '2FA verification expired or not required. User must sign in first.',
  'No TFA token found. User must sign in first.',
]);

/**
 * What a failed confirm, verify, begin or send means for the sign-in. The order matters: several ids answer 401 and do
 * not mean the sign-in ended. Network errors, core's format errors and a `TypeError` from a string body are `other`.
 */
export const enrollmentFailureFrom = (error: unknown): EnrollmentFailure => {
  const id = serverErrorIdFrom(error);
  const status = serverErrorStatusFrom(error);

  if (status === 429 || id === 'error.2fa.rate_limit_exceeded') return 'rate_limited';
  if (id === 'error.api.request.2fa_code.invalid' || id === 'error.2fa.recovery_code.invalid') return 'wrong_code';
  if (id === 'error.2fa.setup.incomplete') return 'setup_incomplete';
  if (id === 'error.2fa.enrollment.not_allowed') return 'not_allowed';
  if (id === 'error.2fa.setup_link.send_failed') return 'send_failed';
  if (status === 501 || id === 'error.not.implemented') return 'unavailable';
  if (id === 'error.2fa.not_enabled' || id === 'error.2fa.storage.error') return 'other';
  if (OVER_PARENT_IDS.has(id)) return 'over';
  if (status === 401 || id === 'PKCE_VERIFIER_MISSING' || id === 'error.pkce.exchange') return 'over';
  if (OVER_MESSAGES.has(readField(error, 'message'))) return 'over';
  return 'other';
};
