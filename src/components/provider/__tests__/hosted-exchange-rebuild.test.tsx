import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  appId,
  deferred,
  type HttpReply,
  installLandingEnvironment,
  LandingTree,
  makeObserved,
  type Network,
  renderLanding,
} from './support/federated-harness';

const exchangePath = '/auth/session/exchange';
const upgradePath = '/auth/session/upgrade';
const callback = 'https://rp.example.com/callback';
const destination = `${callback}?code=exchanged`;
const parent = { request_id: 'parent-1', redirect_uri: callback, state: 'rp-state' };
let network: Network | undefined;
let submitted: HTMLFormElement[] = [];

afterEach(() => {
  for (const form of submitted) form.remove();
  network?.restore();
  network = undefined;
  submitted = [];
});

describe('hosted exchange across a Passflow instance rebuild', () => {
  it('opens step-up on the current instance when app settings change the scopes during the exchange', async () => {
    const active = installLandingEnvironment({
      pathname: '/web/signin',
      search: `?appid=${appId}&parent_challenge_id=parent-1`,
    });
    network = active;
    active.endpoints.set('/oidc/requests/parent-1', { data: parent });
    vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(function (this: HTMLFormElement) {
      submitted.push(this);
    });
    const first = deferred<HttpReply>();
    active.endpoints.set(exchangePath, first.promise);

    const observed = makeObserved();
    const view = renderLanding({ observed, flow: true });
    await waitFor(() => expect(active.requests.some((request) => request.path === exchangePath)).toBe(true));
    // The children, and the probe with them, unmount while the exchange runs: the replaced instance is seen through
    // its disposal.
    const before = observed.current!;
    const disposed = vi.spyOn(before, 'dispose');

    // Settings that fill scopes the provider started without rebuild its Passflow instance.
    await active.releaseSettings({
      ...active.settingsData,
      defaults: { ...active.settingsData.defaults, scopes: ['openid', 'email', 'offline'] },
    });
    await waitFor(() => expect(disposed).toHaveBeenCalledTimes(1));

    await act(async () => {
      first.resolve({ status: 403, data: { error: 'upgrade_required', acr_values: '2' } });
    });

    await waitFor(() => expect(screen.getByTestId('upgrade-dialog')).toBeVisible());
    expect(active.forwards).toEqual([]);
    expect(submitted).toEqual([]);

    active.endpoints.set(upgradePath, { data: null, status: 204 });
    active.endpoints.set(exchangePath, { data: { redirect_url: destination } });
    fireEvent.click(screen.getByTestId('upgrade-dialog-alternatives'));
    fireEvent.click(screen.getByTestId('upgrade-dialog-factor-totp'));
    fireEvent.change(screen.getByTestId('upgrade-dialog-code'), { target: { value: '123456' } });
    await act(async () => {
      fireEvent.click(screen.getByTestId('upgrade-dialog-submit'));
    });

    await waitFor(() => expect(active.forwards).toEqual([destination]));
    view.rerender(<LandingTree observed={observed} flow />);
    await act(async () => {});
    expect(active.requests.filter((request) => request.path === upgradePath)).toHaveLength(1);
    expect(active.requests.filter((request) => request.path === exchangePath)).toHaveLength(2);
    expect(active.forwards).toEqual([destination]);
    expect(submitted).toEqual([]);
  });
});
