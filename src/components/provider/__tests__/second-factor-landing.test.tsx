import { Passflow } from '@passflow/core';
import { act, render, waitFor } from '@testing-library/react';
import { type FC, StrictMode, useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNavigation, usePassflow } from '@/hooks';
import { PassflowProvider } from '../passflow-provider';
import {
  appId,
  deferred,
  type HttpReply,
  installLandingEnvironment,
  installServerKeys,
  LandingProbe,
  makeObserved,
  type Network,
  type Observed,
  signedJwt,
} from './support/federated-harness';

// A federated sign-in on a non-PKCE app lands back on its redirect URL with
// the 2FA token in the fragment and no tokens. These render the real provider
// over the real core, which adopts the token as it is constructed.
// Built here rather than written out: a JWT-shaped literal reads as a leaked
// secret to the repository's secret scanner.
const segment = (value: string) => btoa(value).replace(/=+$/, '');
const TFA_TOKEN = [segment('{"alg":"HS256"}'), segment('{"sub":"user"}'), segment('signature')].join('.');

let owesFactor: boolean | undefined;

const Probe: FC<{ flowPath?: string }> = ({ flowPath }) => {
  const passflow = usePassflow();
  const { setTwoFactorVerifyPath } = useNavigation();
  owesFactor = passflow.isTwoFactorVerificationRequired();
  // Stands in for a mounted PassflowFlow registering its prefixed route.
  useEffect(() => {
    if (flowPath) setTwoFactorVerifyPath?.(flowPath);
  }, [flowPath, setTwoFactorVerifyPath]);
  return null;
};

const renderProvider = (navigate: ReturnType<typeof vi.fn>, props: { twoFactorVerifyPath?: string; flowPath?: string } = {}) =>
  render(
    <PassflowProvider
      appId='app-1'
      url='http://localhost:7999'
      navigate={navigate}
      twoFactorVerifyPath={props.twoFactorVerifyPath}
    >
      <Probe flowPath={props.flowPath} />
    </PassflowProvider>,
  );

describe('PassflowProvider on a landing that owes its second factor', () => {
  beforeEach(() => {
    sessionStorage.clear();
    owesFactor = undefined;
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
  });

  it('adopts the 2FA token and goes to the 2FA screen', async () => {
    window.history.replaceState(null, '', `/dashboard#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/two-factor-verify', replace: true }));
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(owesFactor).toBe(true);
    expect(window.location.hash).toBe('');
  });

  it("goes to a mounted flow's own (prefixed) 2FA route", async () => {
    window.history.replaceState(null, '', `/web/signin#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate, { twoFactorVerifyPath: '/elsewhere', flowPath: '/web/two-factor-verify' });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/web/two-factor-verify', replace: true }));
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('uses the twoFactorVerifyPath prop when no flow is mounted', async () => {
    window.history.replaceState(null, '', `/dashboard#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate, { twoFactorVerifyPath: '/auth/two-factor-verify' });

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/auth/two-factor-verify', replace: true }));
  });

  it('leaves a signed-in user where they are', async () => {
    // A `#tfa_token=` link planted on a signed-in user is not theirs to answer.
    const signedIn = vi.spyOn(Passflow.prototype, 'isAuthenticated').mockReturnValue(true);
    window.history.replaceState(null, '', `/dashboard#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(owesFactor).not.toBeUndefined());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(navigate).not.toHaveBeenCalled();
    signedIn.mockRestore();
  });

  it('leaves an ordinary page load alone', async () => {
    window.history.replaceState(null, '', '/dashboard#section=billing');
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(owesFactor).toBe(false));
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('PassflowProvider on a 2FA landing under an OIDC parent', () => {
  let fetched: string[];

  beforeEach(() => {
    sessionStorage.clear();
    owesFactor = undefined;
    fetched = [];
    vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
      fetched.push(new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).pathname);
      return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    sessionStorage.clear();
  });

  it('makes no session exchange request', async () => {
    window.history.replaceState(null, '', `/web/signin?parent_challenge_id=parent-1#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/two-factor-verify' })));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(fetched).not.toContain('/auth/session/exchange');
  });

  it('reaches the 2FA screen with a stored hosted session', async () => {
    vi.spyOn(Passflow.prototype, 'isAuthenticated').mockReturnValue(true);
    window.history.replaceState(null, '', `/web/signin?parent_challenge_id=parent-1#tfa_token=${TFA_TOKEN}`);
    const navigate = vi.fn();

    renderProvider(navigate);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ to: '/two-factor-verify' })));
    expect(owesFactor).toBe(true);
  });
});

// The hosted login with no app id: discovery finds it while the tokens wait in the fragment.
const DiscoveringTree = ({ observed }: { observed: Observed }) => (
  <PassflowProvider url='https://auth.example.com' navigate={(destination) => observed.navigations.push(destination)}>
    <LandingProbe observed={observed} />
  </PassflowProvider>
);

describe('PassflowProvider on a landing with tokens in the fragment', () => {
  let network: Network | undefined;
  afterEach(() => {
    network?.restore();
    network = undefined;
  });

  const land = () => {
    const access = signedJwt({ type: 'access' });
    const refresh = signedJwt({ type: 'refresh' });
    network = installLandingEnvironment({
      pathname: '/web/signin',
      search: `#access_token=${access}&refresh_token=${refresh}&state=app-state`,
    });
    installServerKeys(network);
    const discovery = deferred<HttpReply>();
    network.endpoints.set('/settings', discovery.promise);
    return { access, discovery };
  };

  const discover = async (discovery: ReturnType<typeof land>['discovery']) => {
    await act(async () => {
      discovery.resolve({ data: { login_app: { app_id: appId } } });
    });
  };

  it.each([false, true])('a Simple app takes them on the surviving instance once (StrictMode %s)', async (strict) => {
    const { access, discovery } = land();
    const observed = makeObserved();
    const tree = <DiscoveringTree observed={observed} />;
    render(strict ? <StrictMode>{tree}</StrictMode> : tree);

    await discover(discovery);
    await network!.releaseSettings({ ...network!.settingsData, pkce_enabled: false });

    await waitFor(async () => {
      expect(observed.current!.isAuthenticated()).toBe(true);
      expect((await observed.current!.getTokens(false))?.access_token).toBe(access);
    });
    expect(window.location.hash).not.toContain('access_token');
    expect(network!.requests.filter((request) => request.path === '/.well-known/jwks.json')).toHaveLength(1);
  });

  it('an SDK app does not take them', async () => {
    const { access, discovery } = land();
    const observed = makeObserved();
    render(<DiscoveringTree observed={observed} />);

    await discover(discovery);
    await network!.releaseSettings({ ...network!.settingsData, pkce_enabled: true });
    await waitFor(() => expect(observed.settingsReady).toBe(true));
    await act(async () => {});

    expect(observed.current!.isAuthenticated()).toBe(false);
    expect(window.location.hash).not.toContain('access_token');
    expect(JSON.stringify(localStorage)).not.toContain(access);
  });
});
