import { afterEach, describe, expect, it, vi } from 'vitest';
import { routeToSecondFactor, urlCarriesTwoFactorToken } from '../second-factor';

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
