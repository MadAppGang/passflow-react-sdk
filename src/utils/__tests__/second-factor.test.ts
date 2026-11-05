import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeToSecondFactor, twoFactorTokenAppId, urlCarriesTwoFactorToken } from '../second-factor';

describe('routeToSecondFactor', () => {
  it('navigates to the 2FA route and reports it when a factor is owed', () => {
    const navigate = vi.fn();
    const passflow = { isTwoFactorVerificationRequired: () => true };

    expect(routeToSecondFactor(passflow, navigate, '/web/two-factor-verify')).toBe(true);
    expect(navigate).toHaveBeenCalledWith({ to: '/web/two-factor-verify' });
  });

  it('leaves a completed sign-in to its caller', () => {
    const navigate = vi.fn();
    const passflow = { isTwoFactorVerificationRequired: () => false };

    expect(routeToSecondFactor(passflow, navigate, '/two-factor-verify')).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('urlCarriesTwoFactorToken', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('sees a 2FA token in the fragment', () => {
    window.history.replaceState(null, '', '/dashboard#state=abc&tfa_token=a.b.c');
    expect(urlCarriesTwoFactorToken()).toBe(true);
  });

  it('ignores a fragment without one, and the query string', () => {
    window.history.replaceState(null, '', '/dashboard?tfa_token=a.b.c#access_token=x');
    expect(urlCarriesTwoFactorToken()).toBe(false);
  });
});

describe('twoFactorTokenAppId', () => {
  // Built here rather than written out: a JWT-shaped literal reads as a leaked secret to the secret scanner.
  const land = (claims: object) => {
    const token = ['{"alg":"none"}', JSON.stringify(claims), 'signature']
      .map((part) => btoa(part).replace(/=+$/, ''))
      .join('.');
    window.history.replaceState(null, '', `/web/signin#tfa_token=${token}`);
  };

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('reads the app from the audience, as a list or a single value', () => {
    land({ aud: ['app-1'] });
    expect(twoFactorTokenAppId()).toBe('app-1');
    land({ aud: 'app-2' });
    expect(twoFactorTokenAppId()).toBe('app-2');
  });

  it('gives no app for no audience, an unreadable token or no token', () => {
    land({ sub: 'user' });
    expect(twoFactorTokenAppId()).toBeUndefined();
    window.history.replaceState(null, '', '/web/signin#tfa_token=not-a-token');
    expect(twoFactorTokenAppId()).toBeUndefined();
    window.history.replaceState(null, '', '/web/signin');
    expect(twoFactorTokenAppId()).toBeUndefined();
  });
});
