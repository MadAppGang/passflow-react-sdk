import type { LoginCredentialsState, LoginScreenProps } from '@/components/ui';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The sign-in and sign-up forms render `LoginScreen`; these tests drive the
// callbacks it is handed, the way a submit would, and watch where they go.
let screenProps: LoginScreenProps | undefined;

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  LoginScreen: (props: LoginScreenProps) => {
    screenProps = props;
    return null;
  },
}));

vi.mock('@/components/provider/passflow-provider', () => ({
  hasFollowedOIDCRedirect: () => false,
  readParentChallengeIdFromURL: () => undefined,
}));

const navigate = vi.fn();
const passflow = { isTwoFactorVerificationRequired: vi.fn() };
const signIn = vi.fn();
const signUp = vi.fn();

vi.mock('@/hooks', () => ({
  usePassflow: () => passflow,
  useNavigation: () => ({ navigate }),
  useProvider: () => ({ federatedWithRedirect: vi.fn(), federatedWithPopup: vi.fn() }),
  useAppSettings: () => ({
    appSettings: { auth_strategies: [], defaults: { redirect: '/dashboard' } },
    scopes: ['openid'],
    createTenantForNewUser: false,
    passwordPolicy: null,
    currentStyles: null,
    isError: false,
    error: '',
    loginAppTheme: null,
  }),
  useSignIn: () => ({ fetch: signIn, isError: false, error: '', reset: vi.fn(), isLoading: false }),
  useSignUp: () => ({ fetch: signUp, isError: false, error: '', reset: vi.fn(), isLoading: false }),
}));

import { SignInForm } from '../signin';
import { SignUpForm } from '../signup';

const credentials = () => {
  const state = screenProps?.state as LoginCredentialsState | undefined;
  if (state?.kind !== 'credentials') throw new Error('expected the credentials state');
  return state;
};

const values = { method: 'email_or_username' as const, emailOrUsername: 'user@example.com', phone: '', password: 'secret' };

type Path = { name: string; submit: () => void; fetch: typeof signIn };

const paths = (): Path[] => [
  { name: 'sign-in with a password', submit: () => credentials().onPassword(values), fetch: signIn },
  { name: 'sign-in with a passkey', submit: () => credentials().onPasskey?.(), fetch: signIn },
  { name: 'sign-up with a password', submit: () => credentials().onPassword(values), fetch: signUp },
  { name: 'sign-up with a passkey', submit: () => credentials().onPasskey?.(), fetch: signUp },
];

const renderFor = (path: Path) =>
  path.fetch === signIn
    ? render(<SignInForm successAuthRedirect='/dashboard' twoFactorVerifyPath='/web/two-factor-verify' />)
    : render(<SignUpForm successAuthRedirect='/dashboard' twoFactorVerifyPath='/web/two-factor-verify' />);

describe('credential forms and a second factor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    screenProps = undefined;
    signIn.mockResolvedValue(true);
    signUp.mockResolvedValue(true);
  });

  for (const path of paths()) {
    describe(path.name, () => {
      it('goes to the 2FA screen, not the success redirect, when a factor is owed', async () => {
        passflow.isTwoFactorVerificationRequired.mockReturnValue(true);
        renderFor(path);

        path.submit();

        await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/web/two-factor-verify' }));
        expect(path.fetch).toHaveBeenCalledTimes(1);
        expect(navigate).toHaveBeenCalledTimes(1);
        expect(navigate).not.toHaveBeenCalledWith(expect.objectContaining({ to: '/dashboard' }));
      });

      it('takes the success redirect when no factor is owed', async () => {
        passflow.isTwoFactorVerificationRequired.mockReturnValue(false);
        renderFor(path);

        path.submit();

        await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' }));
        expect(navigate).not.toHaveBeenCalledWith({ to: '/web/two-factor-verify' });
      });
    });
  }
});
