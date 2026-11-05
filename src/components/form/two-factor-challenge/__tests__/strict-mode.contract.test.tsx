import { act, render, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { TwoFactorChallenge } from '@/components/form/two-factor-challenge';
import { PassflowProvider } from '@/components/provider/passflow-provider';
import { installLandingEnvironment, jwt, type Network } from '../../../provider/__tests__/support/federated-harness';

describe('REQ-13 TwoFactorChallenge HTTP lifecycle under StrictMode', () => {
  let network: Network | undefined;

  afterEach(() => {
    network?.restore();
    network = undefined;
  });

  it('posts exactly once on mount and once more when firstFactorMethod changes', async () => {
    const http = installLandingEnvironment({ pathname: '/web/two-factor-verify', search: '' });
    network = http;
    window.history.replaceState(
      null,
      '',
      '/web/two-factor-verify#tfa_token=' + jwt({ type: 'tfa', challenge_id: 'strict-mode-contract-factor' }),
    );

    const challengePath = '/v2/auth/2fa/challenge';
    // A completed HTTP error avoids depending on an undocumented challenge success
    // payload. The contract being checked is request budgeting, not visual state.
    http.endpoints.set(challengePath, {
      status: 501,
      data: { error: { id: 'error.not.implemented', status: 501, message: 'Not supported' } },
    });

    function tree(firstFactorMethod: string) {
      return (
        <React.StrictMode>
          <PassflowProvider appId='challenge-contract-app' url='https://auth.example.com' navigate={() => {}}>
            <TwoFactorChallenge firstFactorMethod={firstFactorMethod} />
          </PassflowProvider>
        </React.StrictMode>
      );
    }

    const posts = () =>
      http.requests.filter((request) => request.path === challengePath && request.method.toUpperCase() === 'POST');

    const { rerender } = render(tree('password'));
    await http.releaseSettings();
    await waitFor(() => expect(posts()).toHaveLength(1));
    await act(async () => {});
    expect(posts()).toHaveLength(1);

    rerender(tree('email'));
    await waitFor(() => expect(posts()).toHaveLength(2));
    await act(async () => {});
    expect(posts()).toHaveLength(2);
  });
});
