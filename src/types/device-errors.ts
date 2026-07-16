/**
 * Error taxonomy for the RFC 8628 device verification flow.
 *
 * ── The rule this file exists to enforce ────────────────────────────────────
 * The person on this screen has just scanned a QR code with their phone and is
 * deciding whether to hand a terminal a token. They are not debugging us. So:
 *
 *   the message a user reads is NEVER a string we did not write for them.
 *
 * Not the browser's. Not the server's `error_description`. Not an exception's
 * `.message`. Those are written for operators and they leak — the screen this
 * taxonomy replaced did `err.message ?? 'Something went wrong'` and duly showed
 * a real user:
 *
 *     "Resident credentials or empty 'allowCredentials' lists are not
 *      supported at this time."
 *
 * — a Chrome/CDP internal, about a spec feature, in the middle of a sign-in.
 *
 * The technical string is not thrown away; it is just demoted. It rides along
 * in `detail`, which the UI logs to the console and may offer behind a
 * "details" affordance, and which the server also has in its own logs. Diagnosis
 * keeps everything. The user keeps their sentence.
 */

/**
 * The closed set of things that can go wrong on the verification page, at the
 * granularity a USER can act on.
 *
 * Deliberately coarser than the causes. Several distinct WebAuthn failures
 * collapse into `passkey_failed` because the remedy is identical ("try again or
 * use another method") and because the browser itself refuses to distinguish
 * them — Chrome reports "you cancelled", "you timed out" and "there is no
 * credential here" all as NotAllowedError, on purpose, so that a page cannot use
 * the ceremony as an oracle for which accounts exist on a device. Inventing a
 * finer story for the user than the browser told us would mean guessing.
 */
export type DeviceErrorType =
  /** No user_code supplied yet — show the code entry form, not an error. */
  | 'code_required'
  /** The code is wrong, malformed, or names nothing. */
  | 'code_invalid'
  /** The code was real and has expired. */
  | 'code_expired'
  /** This request was already declined. */
  | 'code_declined'
  /** Already approved — the terminal already has what it needs. */
  | 'code_already_approved'
  /** RFC 8628 §5.1 budget spent. */
  | 'too_many_attempts'
  /** The app owner has this sign-in mode switched off. Renders the refusal. */
  | 'mode_disabled'
  /** The requesting app is gone, or its sign-in method is not configured. */
  | 'app_unavailable'
  /** Wrong email or password. */
  | 'bad_credentials'
  /** The form was submitted empty. */
  | 'missing_credentials'
  /** The account is blocked. */
  | 'account_blocked'
  /** The passkey ceremony did not complete: cancelled, timed out, or none found. */
  | 'passkey_failed'
  /** This browser/authenticator cannot do this passkey sign-in at all. */
  | 'passkey_unsupported'
  /** We could not reach the server. */
  | 'offline'
  /** Anything else — including every technical failure the user cannot act on. */
  | 'generic';

/**
 * A classified failure: one sentence for the human, everything else for us.
 */
export type DeviceError = {
  type: DeviceErrorType;
  /**
   * Plain, human, safe to render. Written by us, for this screen. Never
   * interpolated from an exception or a server description.
   */
  message: string;
  /**
   * The technical string — an exception message, a server `error_description`,
   * a DOMException name. For the console, a collapsed details affordance, and
   * bug reports. MUST NOT be shown as the primary message.
   */
  detail?: string;
  /**
   * Whether trying again on this page could plausibly work. Drives whether a
   * retry control is offered: `false` means the page must not invite the user
   * to bang on it (an expired code will never become unexpired here).
   */
  isRecoverable: boolean;
};
