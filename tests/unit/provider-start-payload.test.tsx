import { type HandOff, PassflowProvider, type Providers, useAppSettings, useProvider } from '@passflow/react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
// Coverage map: REQ-7 (TEST-15..TEST-21)
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  APP_ID,
  federatedStartPayload,
  installLocation,
  installServer,
  PAGE_ORIGIN,
  type PkceMode,
  scopeList,
} from './support/handoff-harness';

// What a federated sign-in start carries, read at the boundary (the request or
// navigation that reaches the federated start), not from any internal call:
// the parent challenge from the URL, the app's state only in Simple mode, and the
// scopes by mode (Simple: the hand-off scopes; SDK: the sign-in scopes).

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type Setup = { pkce: PkceMode; handOff?: HandOff; search?: string; scopes?: string[] };

const startFederated = async ({ pkce, handOff, search = '', scopes }: Setup) => {
  const server = installServer({ pkce });
  const { navigations } = installLocation(`${PAGE_ORIGIN}/web/signin${search}`);
  const wrapper = ({ children }: PropsWithChildren) => (
    <PassflowProvider url='https://auth.example.com' appId={APP_ID} parseQueryParams={false} handOff={handOff} scopes={scopes}>
      {children}
    </PassflowProvider>
  );
  // The sign-in form mounts useAppSettings, which loads the settings the mode is read from.
  const { result } = renderHook(() => ({ settings: useAppSettings(), provider: useProvider() }), { wrapper });
  await waitFor(() => {
    expect(result.current.settings.isLoading).toBe(false);
    expect(result.current.settings.appSettings).not.toBeNull();
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10));
  });

  await act(async () => {
    result.current.provider.federatedWithRedirect('google' as Providers);
    await new Promise((r) => setTimeout(r, 10));
  });

  let start = federatedStartPayload(server.outbound, navigations);
  await waitFor(() => {
    start = federatedStartPayload(server.outbound, navigations);
    expect(start.found).toBe(true);
  });
  return start.payload;
};

const scopesOf = (payload: Record<string, unknown>) => scopeList(payload.scopes ?? payload.scope);

describe('REQ-7 parent_challenge_id from the URL', () => {
  test('TEST-15 REQ-7 the start carries parent_challenge_id taken from the page URL', async () => {
    const payload = await startFederated({
      pkce: false,
      handOff: { scopes: ['openid', 'email'], state: 's-1' },
      search: '?parent_challenge_id=PC-start-123',
    });
    expect(payload.parent_challenge_id).toBe('PC-start-123');
  });

  test('TEST-16 REQ-7 without a parent in the URL the start carries no parent_challenge_id', async () => {
    const payload = await startFederated({ pkce: false, handOff: { scopes: ['openid', 'email'] } });
    expect(payload.parent_challenge_id ?? '').toBe('');
  });
});

describe('REQ-7 Simple mode', () => {
  test('TEST-17 REQ-7 the start carries the hand-off state', async () => {
    const payload = await startFederated({ pkce: false, handOff: { scopes: ['openid', 'email'], state: 'simple-st' } });
    expect(payload.state).toBe('simple-st');
  });

  test('TEST-18 REQ-7 REQ-4 the start asks for the hand-off scopes, not the sign-in scopes', async () => {
    const payload = await startFederated({ pkce: false, handOff: { scopes: ['openid', 'email'] } });
    const scopes = scopesOf(payload);
    expect(scopes).toEqual(expect.arrayContaining(['openid', 'email']));
    // `offline` belongs to the sign-in scopes (hand-off plus offline) only.
    expect(scopes).not.toContain('offline');
  });
});

describe('REQ-7 SDK mode', () => {
  test('TEST-19 REQ-7 the start does not carry the hand-off state', async () => {
    const payload = await startFederated({ pkce: true, handOff: { scopes: ['openid', 'email'], state: 'sdk-st' } });
    expect(payload.state).not.toBe('sdk-st');
  });

  test('TEST-20 REQ-7 REQ-4 under a hand-off the start asks for the sign-in scopes (hand-off plus offline)', async () => {
    const payload = await startFederated({ pkce: true, handOff: { scopes: ['openid', 'email'] } });
    expect(scopesOf(payload)).toEqual(expect.arrayContaining(['openid', 'email', 'offline']));
  });

  test('TEST-21 REQ-7 without a hand-off the start asks for the provider scopes', async () => {
    const payload = await startFederated({ pkce: true, scopes: ['openid', 'custom.read'] });
    expect(scopesOf(payload)).toEqual(expect.arrayContaining(['openid', 'custom.read']));
  });
});
