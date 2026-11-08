import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeToSecondFactor, twoFactorTokenAppId, urlCarriesAccessToken, urlCarriesTwoFactorToken } from '../second-factor';

describe('urlCarriesAccessToken', () => {
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('sees tokens in the fragment', () => {
    window.history.replaceState(null, '', '/web/signin#access_token=a.b.c&state=x');
    expect(urlCarriesAccessToken()).toBe(true);
  });

  it('sees tokens in the query', () => {
    window.history.replaceState(null, '', '/web/signin?access_token=a.b.c');
    expect(urlCarriesAccessToken()).toBe(true);
  });

  it('ignores a fragment with only a 2FA token', () => {
    window.history.replaceState(null, '', '/web/signin#tfa_token=a.b.c');
    expect(urlCarriesAccessToken()).toBe(false);
  });
});

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

  const sameOrigin = () => window.location.origin;

  it('reads the app from the audience, as a list or a single value', () => {
    land({ aud: ['app-1'] });
    expect(twoFactorTokenAppId(sameOrigin())).toBe('app-1');
    land({ aud: 'app-2' });
    expect(twoFactorTokenAppId(sameOrigin())).toBe('app-2');
  });

  it('gives no app for no audience, an audience that is no app id, an unreadable token or no token', () => {
    for (const claims of [{ sub: 'user' }, { aud: [] }, { aud: '' }, { aud: { a: 1 } }, { aud: [{ a: 1 }] }]) {
      land(claims);
      expect(twoFactorTokenAppId(sameOrigin())).toBeUndefined();
    }
    window.history.replaceState(null, '', '/web/signin#tfa_token=not-a-token');
    expect(twoFactorTokenAppId(sameOrigin())).toBeUndefined();
    window.history.replaceState(null, '', '/web/signin');
    expect(twoFactorTokenAppId(sameOrigin())).toBeUndefined();
  });

  it('gives no app on a token core would refuse, with an empty signature', () => {
    const payload = btoa(JSON.stringify({ aud: ['app-1'] })).replace(/=+$/, '');
    window.history.replaceState(null, '', `/web/signin#tfa_token=a.${payload}.`);
    expect(twoFactorTokenAppId(sameOrigin())).toBeUndefined();
  });

  it('gives no app on a page the API does not serve', () => {
    land({ aud: ['app-1'] });
    expect(twoFactorTokenAppId('https://auth.example.test')).toBeUndefined();
    expect(twoFactorTokenAppId(undefined)).toBeUndefined();
  });
});
