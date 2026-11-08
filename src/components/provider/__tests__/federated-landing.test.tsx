import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appId,
  authTokens,
  factorAnswer,
  installLandingEnvironment,
  LandingTree,
  makeObserved,
  type Network,
  renderLanding,
  slotKey,
  target,
  writeSlot,
} from './support/federated-harness';

let network: Network | undefined;
afterEach(() => {
  network?.restore();
  network = undefined;
});

describe('REQ-12 REQ-13 committed federated landing uses real exchange outcomes', () => {
  for (const order of ['settings-first', 'exchange-first'] as const) {
    for (const mode of ['app', 'login-page'] as const) {
      it(`${order}, ${mode}: current provider adopts tokens and only login-page forwards once`, async () => {
        network = installLandingEnvironment();
        writeSlot();
        const observed = makeObserved();
        const view = renderLanding({ observed, mode });
        await waitFor(() => expect(network!.requests.some((request) => request.path === '/auth/pkce_exchange')).toBe(true));
        const response = authTokens();
        if (order === 'settings-first') {
          await network.releaseSettings();
          await waitFor(() => expect(observed.settingsReady).toBe(true));
        }
        await network.releaseExchange(response);
        await waitFor(() => expect(observed.outcome).toBe('signed-in'));
        if (order === 'exchange-first') await network.releaseSettings();
        await waitFor(async () => {
          expect(observed.current!.isAuthenticated()).toBe(true);
          expect((await observed.current!.getTokens(false))?.access_token).toBe(response.access_token);
        });
        expect(sessionStorage.getItem(slotKey)).toBeNull();
        expect(new URLSearchParams(window.location.search).has('code')).toBe(false);
        expect(new URLSearchParams(window.location.search).has('user_state')).toBe(false);
        expect(new URLSearchParams(window.location.search).get('appid')).toBe(appId);
        expect(new URLSearchParams(window.location.search).get('redirectto')).toBe(target);
        if (mode === 'login-page') {
          await waitFor(() => expect(network!.forwards).toHaveLength(1));
          // An SDK-mode app is sent to the address with nothing: its own SDK starts the sign-in.
          expect(network.forwards[0]).toBe(target);
        } else expect(network.forwards).toEqual([]);

        // A rerender and later unrelated sign-in cannot consume the one-shot forward twice.
        network.endpoints.set('/auth/login', { data: response });
        await act(async () => {
          await observed.current!.signIn({ email: 'federated@example.com', password: 'test-password' });
        });
        view.rerender(<LandingTree observed={observed} mode={mode} />);
        await act(async () => {});
        expect(network.forwards).toHaveLength(mode === 'login-page' ? 1 : 0);
        expect(network.requests.filter((request) => request.path === '/auth/pkce_exchange')).toHaveLength(1);
      });
    }

    it(`REQ-13 ${order}: 2FA stays on this page and reaches the registered flow path`, async () => {
      network = installLandingEnvironment();
      writeSlot();
      const observed = makeObserved();
      renderLanding({ observed, flow: false, factorPath: '/web/two-factor-verify' });
      await waitFor(() => expect(network!.requests.some((request) => request.path === '/auth/pkce_exchange')).toBe(true));
      if (order === 'settings-first') {
        await network.releaseSettings();
        await waitFor(() => expect(observed.settingsReady).toBe(true));
      }
      await network.releaseExchange(factorAnswer());
      // Architecture §3: carry app context from the initial landing onto verification.
      await waitFor(() =>
        expect(observed.navigations).toEqual([
          {
            to: '/web/two-factor-verify',
            search: new URLSearchParams({ appid: appId, redirectto: target }).toString(),
            replace: true,
          },
        ]),
      );
      if (order === 'exchange-first') await network.releaseSettings();
      await waitFor(() => expect(observed.current!.isTwoFactorVerificationRequired()).toBe(true));
      expect(observed.current!.isAuthenticated()).toBe(false);
      expect(observed.outcome).toBeUndefined();
      expect(network.forwards).toEqual([]);
    });
  }
});

describe('REQ-12 crafted landing URLs never arm forwarding without a taken slot', () => {
  for (const crafted of [false, true]) {
    for (const method of ['password', 'otp'] as const) {
      it(`${method} SignIn, crafted URL ${crafted}: session is applied without federated outcome or forward`, async () => {
        network = installLandingEnvironment({
          search: crafted ? '?code=forged&user_state=forged&redirectto=' + encodeURIComponent(target) : '',
        });
        const observed = makeObserved();
        renderLanding({ observed });
        await network.releaseSettings();
        await waitFor(() => expect(observed.settingsReady).toBe(true));
        const response = authTokens();
        network.endpoints.set('/auth/login', { data: response });
        network.endpoints.set('/auth/passwordless/complete', { data: { ...response, redirect_url: target } });
        await act(async () => {
          if (method === 'password') await observed.current!.signIn({ email: 'user@example.com', password: 'test-password' });
          else await observed.current!.passwordlessSignInComplete({ challenge_id: 'typed-otp-row', otp: '613907' });
        });
        await waitFor(() => expect(observed.current!.isAuthenticated()).toBe(true));
        await act(async () => {});
        expect(observed.outcome).toBeUndefined();
        expect(network.forwards).toEqual([]);
        expect(network.requests.filter((request) => request.path === '/auth/pkce_exchange')).toEqual([]);
        if (crafted) expect(new URLSearchParams(window.location.search).get('code')).toBe('forged');
      });
    }
  }
});

describe('REQ-14 exchange errors become public failed outcome in either host mode', () => {
  it.each(['app', 'login-page'] as const)('%s mode has no tokens or forward after a failed landing', async (mode) => {
    network = installLandingEnvironment();
    writeSlot();
    const observed = makeObserved();
    // Keep this a non-visual provider/controller test; the boundary copy is checked in Playwright.
    renderLanding({ observed, mode, flow: false });
    await network.releaseSettings();
    await network.releaseExchange(
      {
        error: {
          id: 'error.pkce.exchange',
          message: 'exchange refused',
          status: 400,
          location: '/auth/pkce_exchange',
          time: '2026-11-04T16:42:00Z',
        },
      },
      400,
    );
    await waitFor(() => expect(observed.outcome).toBe('failed'));
    expect(observed.current!.isAuthenticated()).toBe(false);
    expect(network.forwards).toEqual([]);
  });
});

describe('REQ-20 no explicit redirect target does not depend on appSettings render state', () => {
  it('forwards using getAppSettings defaults even when exchange finishes before settings', async () => {
    network = installLandingEnvironment({ search: '?code=landing-code&user_state=state&appid=' + appId });
    writeSlot();
    const observed = makeObserved();
    renderLanding({ observed, successRedirect: null });
    await network.releaseExchange();
    await waitFor(() => expect(observed.outcome).toBe('signed-in'));
    expect(observed.settingsReady).toBe(false);
    expect(network.forwards).toEqual([]);
    await network.releaseSettings();
    await waitFor(() => expect(network!.forwards).toHaveLength(1));
    expect(network.forwards[0]).toContain('app.example.com/after-signin');
  });

  it('stays signed in when settings have no default target', async () => {
    network = installLandingEnvironment({ search: '?code=landing-code&user_state=state&appid=' + appId });
    writeSlot();
    const observed = makeObserved();
    renderLanding({ observed, successRedirect: null });
    await network.releaseExchange();
    await network.releaseSettings({ ...network.settingsData, defaults: {} });
    await waitFor(() => expect(observed.outcome).toBe('signed-in'));
    await act(async () => {});
    expect(network.forwards).toEqual([]);
    expect(observed.current!.isAuthenticated()).toBe(true);
  });

  it('does not forward when the default-settings request fails', async () => {
    network = installLandingEnvironment({ search: '?code=landing-code&user_state=state&appid=' + appId });
    writeSlot();
    const observed = makeObserved();
    renderLanding({ observed, successRedirect: null });
    await network.releaseExchange();
    await waitFor(() => expect(observed.outcome).toBe('signed-in'));
    await network.releaseSettings({ error: { id: 'error.server', message: 'settings unavailable', status: 500 } }, 500);
    await act(async () => {});
    expect(network.forwards).toEqual([]);
  });
});
