import type { DeviceErrorType } from '@/types/device-errors';
import { DeviceApiError, classifyDeviceError, deviceErrorOfType } from '@/utils/classify-device-error';
import { describe, expect, it } from 'vitest';

/**
 * The contract: a user never reads a string we did not write for them.
 *
 * These tests are mostly not about mapping tables. They are about that one
 * sentence, which is easy to state, easy to agree with, and — as the screen this
 * replaced proved — extremely easy to break by writing `err.message` in a JSX
 * expression at 5pm. So the important tests here are the adversarial ones at the
 * bottom: throw the nastiest technical strings we have ever actually seen at the
 * classifier and assert none of them survives into `message`.
 */

/** The real string a real user saw on the old screen. The regression that started this. */
const CHROME_RESIDENT_CREDENTIAL_ERROR =
  "Resident credentials or empty 'allowCredentials' lists are not supported at this time.";

const domException = (name: string, message = ''): DOMException => {
  // jsdom has DOMException; construct via it so `name` behaves like the real thing.
  return new DOMException(message, name);
};

describe('classifyDeviceError — WebAuthn failures', () => {
  it('maps the Chrome resident-credential string to plain copy, never echoing it', () => {
    // The exact case from the bug report: Chrome's internal string for a
    // virtual/limited authenticator asked for a discoverable credential.
    const err = domException('NotSupportedError', CHROME_RESIDENT_CREDENTIAL_ERROR);

    const result = classifyDeviceError(err);

    expect(result.type).toBe('passkey_unsupported');
    expect(result.message).not.toContain('Resident credentials');
    expect(result.message).not.toContain('allowCredentials');
    expect(result.message).toBe(
      "This device can't use a passkey to sign in here. Try another way to sign in, or use a device you've set up a passkey on.",
    );
    // The detail is kept — for the console, not the screen.
    expect(result.detail).toContain(CHROME_RESIDENT_CREDENTIAL_ERROR);
  });

  it('matches the resident-credential text even when the DOMException name changes', () => {
    // The name for this case is not stable across Chrome versions. The text
    // match is the belt to the name table's braces — this must not regress into
    // `generic` (which would still be safe copy, but the wrong advice).
    for (const name of ['NotAllowedError', 'UnknownError', 'SomeFutureError']) {
      const result = classifyDeviceError(domException(name, CHROME_RESIDENT_CREDENTIAL_ERROR));
      expect(result.type, `name=${name}`).toBe('passkey_unsupported');
    }
  });

  it('treats cancel / timeout / no-credential as one recoverable failure', () => {
    // The browser conflates these on purpose (so a page cannot probe which
    // passkeys a device holds), so our copy must not pretend to know which
    // happened — but it MUST offer a retry, because two of the three are transient.
    for (const name of ['NotAllowedError', 'AbortError', 'TimeoutError']) {
      const result = classifyDeviceError(domException(name, 'The operation either timed out or was not allowed.'));
      expect(result.type, `name=${name}`).toBe('passkey_failed');
      expect(result.isRecoverable, `name=${name}`).toBe(true);
    }
  });

  it('does not invite a retry when the authenticator can never succeed', () => {
    // Retrying an RP-ID misconfiguration forever is a worse experience than
    // being told to use another method.
    for (const name of ['NotSupportedError', 'InvalidStateError', 'SecurityError']) {
      const result = classifyDeviceError(domException(name, 'nope'));
      expect(result.type, `name=${name}`).toBe('passkey_unsupported');
      expect(result.isRecoverable, `name=${name}`).toBe(false);
    }
  });
});

describe('classifyDeviceError — server reasons', () => {
  const apiError = (reason: string, description: string, code = 'invalid_request', status = 400) =>
    new DeviceApiError({ reason, code, status, description });

  it('maps each stable reason to its own copy', () => {
    const cases: Array<[string, DeviceErrorType]> = [
      ['unknown_user_code', 'code_invalid'],
      ['invalid_user_code', 'code_invalid'],
      ['expired_user_code', 'code_expired'],
      ['already_approved', 'code_already_approved'],
      ['denied', 'code_declined'],
      ['too_many_attempts', 'too_many_attempts'],
      ['mode_disabled', 'mode_disabled'],
      ['bad_credentials', 'bad_credentials'],
      ['blocked', 'account_blocked'],
      ['passkey_failed', 'passkey_failed'],
      ['unknown_client', 'app_unavailable'],
    ];

    for (const [reason, expected] of cases) {
      expect(classifyDeviceError(apiError(reason, 'operator detail')).type, reason).toBe(expected);
    }
  });

  it('never shows the server error_description, even when it is friendly', () => {
    // The server's copy happens to be decent in places. It is still not shown:
    // "sometimes forward the server's string" is a rule nobody can enforce, and
    // it is exactly how "csrf token missing or invalid" reaches a phone.
    const result = classifyDeviceError(apiError('bad_credentials', "That email or password isn't right."));
    expect(result.message).toBe("That email or password isn't right.");
    // Same words, but ours — proven by the detail carrying the server's copy separately.
    expect(result.detail).toContain("That email or password isn't right.");
  });

  it('falls back to generic for operator-facing failures', () => {
    // These have no `reason` mapping on purpose. The user cannot act on any of
    // them and must not be taught the vocabulary.
    const technical = [
      apiError('', 'csrf token missing or invalid', 'invalid_request', 403),
      apiError('', 'cross-origin request refused', 'invalid_request', 403),
      apiError('', 'invalid JSON body', 'invalid_request', 400),
      apiError('', 'auth flow manager is not wired', 'server_error', 500),
      apiError('', 'failed to store the passkey ceremony', 'server_error', 500),
    ];

    for (const err of technical) {
      const result = classifyDeviceError(err);
      expect(result.type, err.message).toBe('generic');
      expect(result.message).toBe('Something went wrong on our end. Refresh the page and try again.');
    }
  });
});

describe('classifyDeviceError — the invariant', () => {
  /**
   * The load-bearing test. Every technical string this flow can realistically
   * produce, thrown at the classifier, asserting that none of it reaches
   * `message`.
   *
   * If someone adds a branch that forwards a raw string, this fails — which is
   * the entire point of it existing.
   */
  const NASTY: readonly unknown[] = [
    domException('NotSupportedError', CHROME_RESIDENT_CREDENTIAL_ERROR),
    domException('NotAllowedError', 'The operation either timed out or was not allowed.'),
    domException('SecurityError', "The relying party ID is not a registrable domain suffix of, nor equal to 'localhost'."),
    domException('InvalidStateError', 'The authenticator was previously registered.'),
    new DeviceApiError({ reason: '', code: 'invalid_request', status: 403, description: 'csrf token missing or invalid' }),
    new DeviceApiError({ reason: '', code: 'server_error', status: 500, description: 'auth flow manager is not wired' }),
    new TypeError('Failed to fetch'),
    new Error('Unexpected token < in JSON at position 0'),
    'a bare string someone threw',
    null,
    undefined,
    { weird: 'object' },
  ];

  /**
   * Vocabulary that means the reader is a developer. If one of these turns up in
   * a user-facing sentence, the sentence is wrong.
   */
  const FORBIDDEN = [
    'allowCredentials',
    'Resident credentials',
    'relying party',
    'csrf',
    'JSON',
    'null',
    'undefined',
    'fetch',
    'auth flow manager',
    'DOMException',
    'Error:',
    'token',
    'origin',
    'authenticator',
  ];

  it('never lets a technical string become the user-facing message', () => {
    for (const err of NASTY) {
      const { message } = classifyDeviceError(err);
      expect(message.length, `empty copy for ${String(err)}`).toBeGreaterThan(0);

      for (const word of FORBIDDEN) {
        expect(
          message.toLowerCase(),
          `"${word}" leaked into user copy for input: ${String(err)} -> "${message}"`,
        ).not.toContain(word.toLowerCase());
      }
    }
  });

  it('always produces a complete sentence a person can read', () => {
    for (const err of NASTY) {
      const { message } = classifyDeviceError(err);
      // Starts like a sentence and ends like one. Cheap, but it is what catches
      // a raw identifier or a bare error code being passed through.
      expect(message[0], `"${message}"`).toBe(message[0]?.toUpperCase());
      expect(message.endsWith('.'), `"${message}" should end in a period`).toBe(true);
    }
  });

  it('keeps the technical detail for whoever is debugging', () => {
    // Demoted, not destroyed. The console and the bug report keep everything.
    const result = classifyDeviceError(domException('NotSupportedError', CHROME_RESIDENT_CREDENTIAL_ERROR));
    expect(result.detail).toBeDefined();
    expect(result.detail).toContain('NotSupportedError');
  });
});

describe('deviceErrorOfType', () => {
  it('produces the same copy as the classifier for a known type', () => {
    expect(deviceErrorOfType('mode_disabled').message).toBe(
      classifyDeviceError(
        new DeviceApiError({ reason: 'mode_disabled', code: 'unauthorized_client', status: 400, description: 'x' }),
      ).message,
    );
  });
});
