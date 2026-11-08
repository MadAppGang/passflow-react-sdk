import { Passflow } from '@passflow/core';
import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { appId, installLandingEnvironment, jwt, makeObserved, type Network, renderLanding } from './support/federated-harness';

let network: Network | undefined;
afterEach(() => {
  network?.restore();
  network = undefined;
});

describe('session exchange under an OIDC parent', () => {
  it('refreshes an expired access token and sends the new one', async () => {
    network = installLandingEnvironment({ pathname: '/web/signin', search: `?appid=${appId}&parent_challenge_id=parent-1` });
    // A stored session whose access token has expired and whose refresh token is still good.
    new Passflow({ url: 'https://auth.example.com', appId, parseQueryParams: false }).setTokens({
      access_token: jwt({ type: 'access', exp: 1_000 }),
      refresh_token: jwt({ type: 'refresh' }),
    });
    const refreshed = jwt({ type: 'access', fresh: true });
    network.endpoints.set('/auth/refresh', { data: { access_token: refreshed, refresh_token: jwt({ type: 'refresh' }) } });
    network.endpoints.set('/oidc/requests/parent-1', { data: {}, status: 404 });
    network.endpoints.set('/auth/session/exchange', { data: { redirect_url: 'https://rp.example.com/cb?code=c' } });

    renderLanding({ observed: makeObserved(), flow: false });

    await waitFor(() => expect(network!.requests.some((request) => request.path === '/auth/session/exchange')).toBe(true));
    const exchange = network.requests.find((request) => request.path === '/auth/session/exchange')!;
    expect(exchange.headers?.Authorization).toBe(`Bearer ${refreshed}`);
    expect(exchange.body).toEqual({ parent_challenge_id: 'parent-1' });
  });
});
