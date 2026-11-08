import type { Passflow } from '@passflow/core';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerifyChallengeOTPRedirect } from '@/components/form/verify-challenge/verify-challenge-otp-redirect';
import {
  type HandOff,
  initialState,
  NavigationContext,
  PassflowContext,
  type PassflowContextType,
  type PassflowState,
} from '@/context';
import { useSignInEnding } from '../use-sign-in-ending';

const parent = vi.hoisted(() => ({ followed: false }));
vi.mock('@/components/provider/passflow-provider', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/provider/passflow-provider')>()),
  hasFollowedOIDCRedirect: () => parent.followed,
}));

// The ending screen is UI; only the state it is given is checked here.
const endingScreen = vi.hoisted(() => ({ endings: [] as string[], retry: undefined as undefined | (() => void) }));
vi.mock('@/components/form/signed-in', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/form/signed-in')>()),
  SignInEndingScreen: ({ ending, onRetry }: { ending: string; onRetry: () => void }) => {
    endingScreen.endings.push(ending);
    endingScreen.retry = onRetry;
    return null;
  },
}));

const REQUESTED = 'https://rp.example.com/after';
const APP_DEFAULT = 'https://app.example.com/home';

const storedTokens = () => ({ access_token: 'access123', refresh_token: 'refresh456', id_token: 'id789', scopes: ['openid'] });

const makePassflow = () => ({
  getAppSettings: vi.fn(),
  checkRedirectUrl: vi.fn(async (target: string) => target),
  getTokens: vi.fn(async () => storedTokens()),
  passwordlessSignInComplete: vi.fn(),
  isTwoFactorVerificationRequired: vi.fn(() => false),
});
let passflow: ReturnType<typeof makePassflow>;
let navigate: ReturnType<typeof vi.fn>;
let forwards: string[];
let restoreLocation: () => void;

const stubLocation = () => {
  const native = window.location;
  const descriptor = Object.getOwnPropertyDescriptor(window, 'location')!;
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get href() {
        return native.href;
      },
      set href(value: string) {
        forwards.push(String(value));
      },
      get origin() {
        return native.origin;
      },
      get pathname() {
        return native.pathname;
      },
      get search() {
        return native.search;
      },
      get hash() {
        return native.hash;
      },
    },
  });
  return () => Object.defineProperty(window, 'location', descriptor);
};

const Providers =
  (state: Partial<PassflowState> = {}): FC<PropsWithChildren> =>
  ({ children }) => {
    const value = {
      state: { ...initialState, ...state },
      dispatch: vi.fn(),
      passflow: passflow as unknown as Passflow,
    } as PassflowContextType;
    return (
      <PassflowContext.Provider value={value}>
        <NavigationContext.Provider
          value={{ navigate, setNavigate: vi.fn(), router: 'default', signInPath: '/signin' } as never}
        >
          {children}
        </NavigationContext.Provider>
      </PassflowContext.Provider>
    );
  };

const renderEnding = (handOff?: HandOff) => renderHook(() => useSignInEnding(), { wrapper: Providers({ handOff }) });
const simple = () => passflow.getAppSettings.mockResolvedValue({ pkce_enabled: false });
const sdk = () => passflow.getAppSettings.mockResolvedValue({ pkce_enabled: true });
const fragment = (url: string) => new URLSearchParams(url.split('#')[1] ?? '');

beforeEach(() => {
  passflow = makePassflow();
  navigate = vi.fn();
  forwards = [];
  parent.followed = false;
  endingScreen.endings = [];
  endingScreen.retry = undefined;
  restoreLocation = stubLocation();
});

afterEach(() => {
  restoreLocation();
});

describe('useSignInEnding to an external target', () => {
  it.each([
    ['requested', REQUESTED, null],
    ['app default', null, APP_DEFAULT],
  ])('Simple app, %s target: tokens in the fragment, no refresh token, the app state', async (_case, requested, appDefault) => {
    simple();
    const { result } = renderEnding({ scopes: ['openid', 'id'], state: 'app-state' });

    await act(() => result.current.finishSignIn(requested, appDefault));

    expect(forwards).toHaveLength(1);
    const [address, hash] = forwards[0].split('#');
    expect(address).toBe(requested ?? appDefault);
    expect(fragment(forwards[0]).get('access_token')).toBe('access123');
    expect(fragment(forwards[0]).get('id_token')).toBe('id789');
    expect(fragment(forwards[0]).has('refresh_token')).toBe(false);
    expect(fragment(forwards[0]).get('state')).toBe('app-state');
    expect(hash).toBeTruthy();
  });

  it('Simple app with offline requested: the refresh token goes too', async () => {
    simple();
    const { result } = renderEnding({ scopes: ['openid', 'offline'] });

    await act(() => result.current.finishSignIn(REQUESTED));

    expect(fragment(forwards[0]).get('refresh_token')).toBe('refresh456');
  });

  it.each([
    ['requested', REQUESTED, null],
    ['app default', null, APP_DEFAULT],
  ])('SDK app, %s target: the bare address', async (_case, requested, appDefault) => {
    sdk();
    const { result } = renderEnding({ state: 'app-state' });

    await act(() => result.current.finishSignIn(requested, appDefault));

    expect(forwards).toEqual([requested ?? appDefault]);
    expect(passflow.getTokens).not.toHaveBeenCalled();
  });

  it('unknown mode: the bare address', async () => {
    passflow.getAppSettings.mockResolvedValue({});
    const { result } = renderEnding();

    await act(() => result.current.finishSignIn(REQUESTED));

    expect(forwards).toEqual([REQUESTED]);
  });

  it('requested target is checked by the server first', async () => {
    sdk();
    passflow.checkRedirectUrl.mockResolvedValue('https://rp.example.com/registered');
    const { result } = renderEnding();

    await act(() => result.current.finishSignIn(REQUESTED));

    expect(passflow.checkRedirectUrl).toHaveBeenCalledWith(REQUESTED);
    expect(forwards).toEqual(['https://rp.example.com/registered']);
  });

  it('requested target: an unreadable mode is unavailable, and retry checks and leaves', async () => {
    passflow.getAppSettings.mockRejectedValueOnce(new Error('settings unavailable'));
    const { result } = renderEnding();

    await act(() => result.current.finishSignIn(REQUESTED));
    expect(result.current.ending).toBe('unavailable');
    expect(forwards).toEqual([]);

    sdk();
    act(() => result.current.retry());
    await waitFor(() => expect(forwards).toEqual([REQUESTED]));
    expect(passflow.checkRedirectUrl).toHaveBeenCalledTimes(2);
  });

  it('app default target: an unreadable mode is unavailable, and retry leaves without a check', async () => {
    passflow.getAppSettings.mockRejectedValueOnce(new Error('settings unavailable'));
    const { result } = renderEnding();

    await act(() => result.current.finishSignIn(null, APP_DEFAULT));
    expect(result.current.ending).toBe('unavailable');
    expect(forwards).toEqual([]);

    simple();
    act(() => result.current.retry());
    await waitFor(() => expect(forwards).toHaveLength(1));
    expect(forwards[0].startsWith(`${APP_DEFAULT}#`)).toBe(true);
    expect(passflow.checkRedirectUrl).not.toHaveBeenCalled();
  });

  it('an OIDC parent redirect already under way: nothing', async () => {
    parent.followed = true;
    const { result } = renderEnding();

    await act(() => result.current.finishSignIn(REQUESTED, APP_DEFAULT));

    expect(forwards).toEqual([]);
    expect(navigate).not.toHaveBeenCalled();
    expect(passflow.getAppSettings).not.toHaveBeenCalled();
    expect(result.current.ending).toBe('none');
  });

  it('same-origin path: a plain navigation without reading the mode', async () => {
    const { result } = renderEnding();

    await act(() => result.current.finishSignIn('/dashboard'));

    expect(navigate).toHaveBeenCalledWith({ to: '/dashboard' });
    expect(passflow.getAppSettings).not.toHaveBeenCalled();
  });
});

describe('an emailed link landing with no settings loaded in context', () => {
  const renderLanding = () =>
    render(<VerifyChallengeOTPRedirect appId='app-1' challengeId='challenge-1' otp='123456' />, {
      wrapper: Providers({ appSettings: null }),
    });

  beforeEach(() => {
    passflow.passwordlessSignInComplete.mockResolvedValue({ redirect_url: REQUESTED });
  });

  it('Simple app: the landing carries tokens', async () => {
    simple();

    renderLanding();

    await waitFor(() => expect(forwards).toHaveLength(1));
    expect(fragment(forwards[0]).get('access_token')).toBe('access123');
  });

  it('mode read fails: unavailable, and nothing is sent', async () => {
    passflow.getAppSettings.mockRejectedValue(new Error('settings unavailable'));

    renderLanding();

    await waitFor(() => expect(endingScreen.endings.at(-1)).toBe('unavailable'));
    expect(forwards).toEqual([]);
  });
});
