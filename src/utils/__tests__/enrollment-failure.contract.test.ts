import { describe, expect, it } from 'vitest';
import { enrollmentFailureFrom } from '@/utils/auth-error';

// TEST-U1. Literal expectations come from architecture §1, not exported copy constants.
// Diagnostics are intentionally translated: behavior is determined by status/id.
const diagnostic = 'Diagnostic interne traduit — ne pas afficher';
const core = (id: string, status: number) => ({ id, status, message: diagnostic });
const raw = (id: string, status: number) => ({
  isAxiosError: true,
  response: { status, data: { error: { id, status, message: diagnostic } } },
});

describe('TEST-U1 REQ-6–REQ-12 enrollmentFailureFrom public contract', () => {
  it.each([
    ['REQ-12 status 429', core('unknown', 429), 'rate_limited'],
    [
      'REQ-12 raw axios string error body',
      {
        isAxiosError: true,
        response: { status: 429, data: { error: 'Too many requests. Try again in 15 minutes.' } },
      },
      'rate_limited',
    ],
    ['REQ-12 raw axios object body', raw('unknown', 429), 'rate_limited'],
    ['REQ-12 429 outranks wrong-code id', core('error.api.request.2fa_code.invalid', 429), 'rate_limited'],
    ['REQ-12 429 outranks ended id', core('error.tfa.token.invalid', 429), 'rate_limited'],
    ['REQ-12 verify limiter id at 401', core('error.2fa.rate_limit_exceeded', 401), 'rate_limited'],
    ['REQ-12 link confirm limiter id at 400', raw('error.2fa.rate_limit_exceeded', 400), 'rate_limited'],
    ['REQ-7 wrong authenticator code at 401', core('error.api.request.2fa_code.invalid', 401), 'wrong_code'],
    ['REQ-7 wrong recovery code at 401', raw('error.2fa.recovery_code.invalid', 401), 'wrong_code'],
    ['REQ-8 setup incomplete', core('error.2fa.setup.incomplete', 400), 'setup_incomplete'],
    ['REQ-9 enrollment refused', raw('error.2fa.enrollment.not_allowed', 403), 'not_allowed'],
    ['REQ-10 email send failed', core('error.2fa.setup_link.send_failed', 503), 'send_failed'],
    ['REQ-11 status 501 alone', core('unknown', 501), 'unavailable'],
    ['REQ-11 unsupported id alone', raw('error.not.implemented', 400), 'unavailable'],
    ['REQ-6 not-enabled 401 is not an ended operation', core('error.2fa.not_enabled', 401), 'other'],
    ['REQ-6 storage-error 401 is not an ended operation', raw('error.2fa.storage.error', 401), 'other'],
    ['REQ-6 invalid tfa token', core('error.tfa.token.invalid', 401), 'over'],
    ['REQ-6 already used otp', raw('error.otp.already.used', 401), 'over'],
    ['REQ-6 unknown 401', core('unknown', 401), 'over'],
    ['REQ-6 PKCE verifier gone without status', { id: 'PKCE_VERIFIER_MISSING' }, 'over'],
    ['REQ-6 PKCE exchange failed without status', { id: 'error.pkce.exchange' }, 'over'],
    [
      'REQ-6 pending verification expired',
      new Error('2FA verification expired or not required. User must sign in first.'),
      'over',
    ],
    ['REQ-6 pending token gone', new Error('No TFA token found. User must sign in first.'), 'over'],
    ['REQ-17 network axios rejection is retryable', { isAxiosError: true, message: 'Network Error' }, 'other'],
    ['REQ-17 ordinary network Error is retryable', new Error('Network Error'), 'other'],
    ['REQ-17 malformed TOTP is not expiration', new Error('Invalid TOTP code format: expected 6 digits'), 'other'],
    ['REQ-17 malformed recovery code is not expiration', new Error('Invalid recovery code format: expected groups'), 'other'],
    ['REQ-17 raw error body TypeError is not expiration', new TypeError('Cannot create property status on string'), 'other'],
    [
      'REQ-17 near-match expiry message is not enough',
      new Error('No TFA token found. User must sign in first. Extra diagnostic'),
      'other',
    ],
    ['REQ-17 unknown server failure', core('error.server', 500), 'other'],
    ['REQ-17 null rejection', null, 'other'],
    ['REQ-17 undefined rejection', undefined, 'other'],
    ['REQ-17 string rejection', 'Network Error', 'other'],
    ['REQ-17 empty rejection', {}, 'other'],
  ])('%s returns its specified failure kind', (_scenario, error, expected) => {
    expect(enrollmentFailureFrom(error)).toBe(expected);
  });

  for (const suffix of ['not.found', 'expired', 'completed', 'kind', 'pkce.missing']) {
    for (const status of [400, 409]) {
      it(`REQ-6 refused parent ${suffix} at ${status} ends sign-in instead of suggesting retry`, () => {
        expect(enrollmentFailureFrom(core('error.auth.flow.parent.' + suffix, status))).toBe('over');
      });
    }
  }
});
