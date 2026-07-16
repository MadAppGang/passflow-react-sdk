import type { DeviceError, DeviceErrorType } from '@/types/device-errors';

/**
 * Turns anything that can go wrong on the device verification page into a
 * {@link DeviceError} — a sentence a person can read, plus the technical detail
 * demoted to `detail`.
 *
 * See types/device-errors.ts for why this exists at all. In short: the raw
 * strings are written for operators, and they leak.
 */

/**
 * The user-facing copy. One entry per {@link DeviceErrorType}, and this table IS
 * the contract — nothing else in the flow may produce a user-visible sentence.
 *
 * Voice notes, since these are the words on the screen where someone authorizes
 * a shell:
 *  - Say what happened, then what to do. Never why, in our terms.
 *  - No jargon a user did not bring with them: no "credential", "authenticator",
 *    "assertion", "CSRF", "origin", "token", "challenge", "resident key".
 *    "Passkey" stays — it is the word on the button they just tapped.
 *  - Never blame them, and never imply they broke something.
 *  - Where we genuinely cannot tell (see passkey_failed), say so plainly and
 *    offer both remedies rather than guessing at one.
 */
const DEVICE_ERROR_COPY: Record<DeviceErrorType, string> = {
  code_required: 'Enter the code shown on your device to continue.',
  code_invalid: "That code isn't right. Check the code on your device and enter it again.",
  code_expired: 'This code has expired. Start again on your device to get a new one.',
  code_declined: 'This request was already declined. Start again on your device if you still want to sign in.',
  code_already_approved: 'This device is already signed in. You can close this page and head back to it.',
  too_many_attempts: 'Too many incorrect codes were entered. Wait a few minutes, then try again.',
  mode_disabled:
    "This app can't be signed in to this way. Ask whoever set it up to turn on QR sign-in, or sign in from your computer instead.",
  app_unavailable: 'The app that asked you to sign in is no longer available. Start again from your device.',
  bad_credentials: "That email or password isn't right.",
  missing_credentials: 'Enter your email and password to continue.',
  account_blocked: 'This account has been blocked. Contact whoever manages it for help.',
  // The three-cause sentence is deliberate, not hedging: the browser reports
  // "cancelled", "timed out" and "no passkey here" identically (by design — it
  // must not become an oracle for which accounts live on a device), so naming
  // one cause would be a guess presented as a fact.
  passkey_failed:
    "We couldn't confirm your passkey. You may have cancelled it, waited too long, or there may be no passkey for this site on this device.",
  passkey_unsupported:
    "This device can't use a passkey to sign in here. Try another way to sign in, or use a device you've set up a passkey on.",
  offline: "We couldn't reach the server. Check your connection and try again.",
  generic: 'Something went wrong on our end. Refresh the page and try again.',
};

/** Failures the user can plausibly clear by acting on this page. */
const RECOVERABLE: ReadonlySet<DeviceErrorType> = new Set<DeviceErrorType>([
  'code_required',
  'code_invalid',
  'bad_credentials',
  'missing_credentials',
  'passkey_failed',
  'offline',
  'generic',
]);

/**
 * Server `reason` codes -> our types.
 *
 * The server sends a stable machine reason precisely so this mapping can exist:
 * see the deviceReason* / deviceLookupError.Code constants in
 * src/web/oidc/device_page.go and device_verify.go. Its `error_description` is
 * for operators and never reaches the screen.
 *
 * Anything absent from this table — `csrf token missing or invalid`,
 * `cross-origin request refused`, `invalid JSON body`, `auth flow manager is not
 * wired` — deliberately falls through to `generic`. Those are our bugs or our
 * attacker's business, and in both cases the user's remedy is the same and their
 * screen should say so without teaching them the word "CSRF".
 */
const REASON_TO_TYPE: Record<string, DeviceErrorType> = {
  code_required: 'code_required',
  invalid_user_code: 'code_invalid',
  unknown_user_code: 'code_invalid',
  expired_user_code: 'code_expired',
  denied: 'code_declined',
  already_approved: 'code_already_approved',
  too_many_attempts: 'too_many_attempts',
  mode_disabled: 'mode_disabled',
  unknown_client: 'app_unavailable',
  passkey_unavailable: 'app_unavailable',
  unavailable: 'app_unavailable',
  bad_credentials: 'bad_credentials',
  missing_credentials: 'missing_credentials',
  blocked: 'account_blocked',
  passkey_failed: 'passkey_failed',
};

/**
 * WebAuthn DOMException names -> our types.
 *
 * Only the names that reliably mean something distinct to a USER are mapped.
 * NotAllowedError is the big one and it is intentionally lossy: it covers
 * cancel, timeout AND no-matching-credential, because the spec has browsers
 * conflate them so a page cannot probe which passkeys a device holds.
 */
const WEBAUTHN_NAME_TO_TYPE: Record<string, DeviceErrorType> = {
  NotAllowedError: 'passkey_failed',
  AbortError: 'passkey_failed',
  TimeoutError: 'passkey_failed',
  UnknownError: 'passkey_failed',
  // The authenticator or browser cannot satisfy the request as asked.
  NotSupportedError: 'passkey_unsupported',
  InvalidStateError: 'passkey_unsupported',
  ConstraintError: 'passkey_unsupported',
  // RP ID / origin misconfiguration. A deployment bug, not a user's problem —
  // they cannot fix it, so do not invite them to retry forever.
  SecurityError: 'passkey_unsupported',
};

/**
 * Message fragments that mean "this authenticator cannot do discoverable
 * credentials", whatever DOMException name the browser happened to attach.
 *
 * This is here because of a specific, observed regression: a real user hit
 *
 *   "Resident credentials or empty 'allowCredentials' lists are not supported
 *    at this time."
 *
 * — Chrome's internal string for a virtual/limited authenticator being asked for
 * a discoverable credential. Matching on text as well as on name is belt and
 * braces: the name for this case is not stable across Chrome versions, and the
 * one thing that must never happen is this sentence reaching a user again.
 */
const UNSUPPORTED_MESSAGE_PATTERNS: readonly string[] = [
  'resident credentials',
  'allowcredentials',
  'not supported at this time',
  'discoverable credentials',
  'is not supported',
];

/**
 * An error carrying a server-supplied reason code. Thrown by the device API
 * client so the classifier can map precisely rather than sniff strings.
 */
export class DeviceApiError extends Error {
  /** Stable machine reason from the server. */
  readonly reason: string;
  /** The OAuth2 error code (`invalid_request`, `unauthorized_client`, ...). */
  readonly code: string;
  /** HTTP status. */
  readonly status: number;

  constructor(params: { reason: string; code: string; status: number; description: string }) {
    // The Error message is the OPERATOR's string — it goes to the console and to
    // `detail`, never to the screen. classifyDeviceError picks the user's words.
    super(params.description || params.code || `device request failed (${params.status})`);
    this.name = 'DeviceApiError';
    this.reason = params.reason;
    this.code = params.code;
    this.status = params.status;
  }
}

const build = (type: DeviceErrorType, detail?: string): DeviceError => ({
  type,
  message: DEVICE_ERROR_COPY[type],
  detail,
  isRecoverable: RECOVERABLE.has(type),
});

const isDOMExceptionLike = (err: unknown): err is { name: string; message: string } =>
  typeof err === 'object' && err !== null && 'name' in err && typeof (err as { name: unknown }).name === 'string';

/**
 * Classify any failure from the device verification flow.
 *
 * Order matters: the server's own reason wins when we have one (it knows more
 * than we can infer), then WebAuthn's message text, then WebAuthn's name, then
 * the network, then a safe default. Every path ends in copy from
 * DEVICE_ERROR_COPY — there is deliberately no branch that forwards a raw
 * string to `message`.
 */
export function classifyDeviceError(err: unknown): DeviceError {
  // 1. The server told us exactly what happened.
  if (err instanceof DeviceApiError) {
    const type = REASON_TO_TYPE[err.reason] ?? 'generic';
    return build(type, `${err.code}${err.reason ? `/${err.reason}` : ''}: ${err.message}`);
  }

  if (isDOMExceptionLike(err)) {
    const name = err.name;
    const raw = typeof err.message === 'string' ? err.message : '';
    const detail = raw ? `${name}: ${raw}` : name;

    // 2. The resident-credential family, matched on text. Checked BEFORE the
    // name table because the name for this case is not dependable — see
    // UNSUPPORTED_MESSAGE_PATTERNS.
    const lowered = raw.toLowerCase();
    if (UNSUPPORTED_MESSAGE_PATTERNS.some((p) => lowered.includes(p))) {
      return build('passkey_unsupported', detail);
    }

    // 3. A WebAuthn name we recognise.
    const byName = WEBAUTHN_NAME_TO_TYPE[name];
    if (byName) {
      return build(byName, detail);
    }

    // 4. fetch() rejects with TypeError when it cannot reach the network at all.
    if (name === 'TypeError') {
      return build('offline', detail);
    }

    return build('generic', detail);
  }

  return build('generic', typeof err === 'string' ? err : undefined);
}

/**
 * The copy for a type, without an error to classify. For states that are known
 * up front rather than thrown — e.g. a browser with no WebAuthn at all.
 */
export function deviceErrorOfType(type: DeviceErrorType, detail?: string): DeviceError {
  return build(type, detail);
}
