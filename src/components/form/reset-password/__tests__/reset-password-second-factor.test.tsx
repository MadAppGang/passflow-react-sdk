import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A user with 2FA who resets their password is signed in only once the
// second factor passes: the server answers the reset with a 2FA token.
const navigate = vi.fn();
const passflow = { isTwoFactorVerificationRequired: vi.fn() };
const resetPassword = vi.fn();

vi.mock('@/hooks', () => ({
  usePassflow: () => passflow,
  useNavigation: () => ({ navigate }),
  useAppSettings: () => ({
    appSettings: { defaults: { redirect: '/dashboard' } },
    passwordPolicy: null,
    currentStyles: null,
    isError: false,
    error: '',
    loginAppTheme: null,
  }),
  useResetPassword: () => ({ fetch: resetPassword, isError: false, error: '', isLoading: false }),
}));

vi.mock('@/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils')>()),
  useUrlParams: () => ({ get: (key: string) => (key === 'token' ? 'reset-token' : '') }),
}));

import { ResetPassword } from '..';

const submit = (container: HTMLElement) => {
  const form = container.querySelector('form');
  if (!form) throw new Error('expected the reset form');
  fireEvent.submit(form);
};

describe('ResetPassword and a second factor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetPassword.mockResolvedValue(true);
  });

  it('goes to the 2FA screen, not the success redirect, when a factor is owed', async () => {
    passflow.isTwoFactorVerificationRequired.mockReturnValue(true);
    const { container } = render(
      <ResetPassword successAuthRedirect='/dashboard' twoFactorVerifyPath='/web/two-factor-verify' />,
    );

    submit(container);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/web/two-factor-verify' }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('takes the success redirect when no factor is owed', async () => {
    passflow.isTwoFactorVerificationRequired.mockReturnValue(false);
    const { container } = render(
      <ResetPassword successAuthRedirect='/dashboard' twoFactorVerifyPath='/web/two-factor-verify' />,
    );

    submit(container);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' }));
    expect(navigate).not.toHaveBeenCalledWith({ to: '/web/two-factor-verify' });
  });
});
