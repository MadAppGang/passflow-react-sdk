import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
const passflow = { isTwoFactorVerificationRequired: vi.fn() };
const complete = vi.fn();

vi.mock('@/hooks', () => ({
  usePassflow: () => passflow,
  useNavigation: () => ({ navigate }),
  useAppSettings: () => ({ appSettings: null, createTenantForNewUser: false, currentStyles: null, loginAppTheme: null }),
  useSignIn: () => ({ fetch: vi.fn() }),
  usePasswordlessComplete: () => ({ fetch: complete, isError: false, error: '', isLoading: false }),
}));

// One plain input stands in for the six boxes, so a test can enter the code at once.
vi.mock('react-otp-input', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label='code' value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

import { VerifyChallengeOTPManual } from '../verify-challenge-otp-manual';
import { VerifyChallengeOTPRedirect } from '../verify-challenge-otp-redirect';

// The completion answers as the server does: with a redirect URL. Owing a
// second factor, there are no tokens behind it.
const answer = { redirect_url: '/dashboard', tfa_token: 'a.b.c' };

const renderManual = () =>
  render(
    <VerifyChallengeOTPManual
      identity='email'
      identityValue='user@example.com'
      challengeType='otp'
      challengeId='challenge-1'
      type='passwordless'
      numInputs={6}
      shouldAutoFocus={false}
      signUpPath='/signup'
      twoFactorVerifyPath='/web/two-factor-verify'
    />,
  );

const renderLinkLanding = () =>
  render(
    <VerifyChallengeOTPRedirect
      appId='app-1'
      challengeId='challenge-1'
      otp='123456'
      twoFactorVerifyPath='/web/two-factor-verify'
    />,
  );

const paths = [
  {
    name: 'a typed one-time code',
    run: () => {
      renderManual();
      fireEvent.change(screen.getByLabelText('code'), { target: { value: '123456' } });
    },
  },
  { name: 'an emailed link (magic link or OTP link)', run: renderLinkLanding },
];

describe('passwordless completion and a second factor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    complete.mockResolvedValue(answer);
  });

  for (const path of paths) {
    describe(path.name, () => {
      it('goes to the 2FA screen, not the redirect URL, when a factor is owed', async () => {
        passflow.isTwoFactorVerificationRequired.mockReturnValue(true);

        path.run();

        await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/web/two-factor-verify' }));
        expect(complete).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalledWith({ to: '/dashboard' });
      });

      it('follows the redirect URL when no factor is owed', async () => {
        passflow.isTwoFactorVerificationRequired.mockReturnValue(false);

        path.run();

        await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' }));
        expect(navigate).not.toHaveBeenCalledWith({ to: '/web/two-factor-verify' });
      });
    });
  }
});
