import { describe, expect, it } from 'vitest';
import { AUTH_ENDPOINT_PATTERN } from '../passflow-provider';

describe('AUTH_ENDPOINT_PATTERN', () => {
  it.each([
    '/auth/login',
    '/auth/register',
    '/auth/passwordless/start',
    '/auth/passkey/register/start',
    '/auth/2fa/verify',
    '/auth/session/exchange',
    '/auth/federated/start/google',
  ])('names %s, so a parent reaches it', (path) => {
    expect(AUTH_ENDPOINT_PATTERN.test(`https://auth.example.com${path}`)).toBe(true);
  });

  it.each(['/auth/pkce_exchange', '/auth/refresh', '/auth/registered', '/app/settings'])(
    'leaves out %s, which takes no parent',
    (path) => {
      expect(AUTH_ENDPOINT_PATTERN.test(`https://auth.example.com${path}`)).toBe(false);
    },
  );
});
