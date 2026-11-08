import { PassflowProvider, usePassflow, useSignInEnding } from '@passflow/react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
// Coverage map: REQ-2 (TEST-6)
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  APP_ID,
  appSettingsFor,
  holdSession,
  installLocation,
  installServer,
  PAGE_ORIGIN,
  TARGET,
} from './support/handoff-harness';

// Under an OIDC parent the provider follows the server's redirect_url itself. Once it
// has, finishing the sign-in must not navigate again or send tokens anywhere.
// Kept in its own file: the provider remembers a followed redirect for the life of the
// page, so it would leak into the other ending tests.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const tokenNavigations = (navigations: string[]) => navigations.filter((n) => n.includes('access_token'));

describe('REQ-2 sign-in ending under an OIDC parent', () => {
  test('TEST-6 REQ-2 once the provider has followed the OIDC redirect, the ending adds no navigation and no tokens', async () => {
    const RP = 'https://rp.example.com/callback?code=oidc-code-1&state=rp-state';
    const server = installServer({ pkce: false });
    const { navigations } = installLocation(`${PAGE_ORIGIN}/web/signin?parent_challenge_id=PC-ending-1`);
    const wrapper = ({ children }: PropsWithChildren) => (
      <PassflowProvider url='https://auth.example.com' appId={APP_ID} parseQueryParams={false}>
        {children}
      </PassflowProvider>
    );
    const { result } = renderHook(() => ({ passflow: usePassflow(), sign: useSignInEnding() }), { wrapper });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    holdSession(result.current.passflow, async () => appSettingsFor(false));

    // A credential call under a parent goes through the page's fetch; the server answers
    // with the redirect, which the provider follows.
    server.answer('/auth/login', { redirect_url: RP });
    await act(async () => {
      await window.fetch('https://auth.example.com/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'user@example.com', password: 'Secret-pass-1!' }),
      });
      await new Promise((r) => setTimeout(r, 10));
    });
    await waitFor(() => expect(navigations).toContain(RP));
    const followed = navigations.length;

    await act(async () => {
      await result.current.sign.finishSignIn(null, TARGET);
    });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(navigations.length).toBe(followed);
    expect(tokenNavigations(navigations)).toEqual([]);
  });
});
