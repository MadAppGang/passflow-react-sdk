import { act, waitFor } from '@testing-library/react';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import {
  factorAnswer,
  installLandingEnvironment,
  LandingTree,
  makeObserved,
  type Network,
  renderLanding,
  slotKey,
  writeSlot,
} from '../../src/components/provider/__tests__/support/federated-harness';

let network: Network | undefined;
afterEach(() => {
  network?.restore();
  network = undefined;
});

describe('REQ-15 React 18.3.1 committed-effect landing (vitest.react18.config.ts)', () => {
  it('successful StrictMode landing forwards exactly once', async () => {
    expect(React.version).toBe('18.3.1');
    network = installLandingEnvironment();
    writeSlot();
    const observed = makeObserved();
    renderLanding({ observed }, true);
    await network.releaseSettings();
    await network.releaseExchange();
    await waitFor(() => expect(network!.forwards).toHaveLength(1));
    await act(async () => {});
    expect(observed.outcome).toBe('signed-in');
    expect(observed.current!.isAuthenticated()).toBe(true);
    expect(network.requests.filter((request) => request.path === '/auth/pkce_exchange')).toHaveLength(1);
  });

  it('StrictMode second-factor handoff reaches the registered 2FA route once', async () => {
    expect(React.version).toBe('18.3.1');
    network = installLandingEnvironment();
    writeSlot();
    const observed = makeObserved();
    renderLanding({ observed, flow: false, factorPath: '/web/two-factor-verify' }, true);
    await network.releaseExchange(factorAnswer());
    await network.releaseSettings();
    await waitFor(() => expect(observed.navigations).toEqual([{ to: '/web/two-factor-verify', replace: true }]));
    expect(observed.current!.isTwoFactorVerificationRequired()).toBe(true);
    expect(network.forwards).toEqual([]);
    expect(network.requests.filter((request) => request.path === '/auth/pkce_exchange')).toHaveLength(1);
  });

  it('render without commit leaves the slot and URL untouched; a later committed mount can still finish', async () => {
    expect(React.version).toBe('18.3.1');
    network = installLandingEnvironment();
    const originalSlot = writeSlot();
    const originalSearch = window.location.search;
    renderToString(
      <React.StrictMode>
        <LandingTree observed={makeObserved()} flow={false} />
      </React.StrictMode>,
    );
    expect(sessionStorage.getItem(slotKey)).toBe(originalSlot);
    expect(window.location.search).toBe(originalSearch);
    expect(network.requests.filter((request) => request.path === '/auth/pkce_exchange')).toEqual([]);
    const observed = makeObserved();
    renderLanding({ observed }, true);
    await network.releaseSettings();
    await network.releaseExchange();
    await waitFor(() => expect(network!.forwards).toHaveLength(1));
  });
});
