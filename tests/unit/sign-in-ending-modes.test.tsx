import { type HandOff, PassflowProvider, usePassflow, useSignInEnding } from '@passflow/react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
// Coverage map: REQ-2 (TEST-1..TEST-5; TEST-6 is in sign-in-ending-oidc-parent.test.tsx), REQ-3 (TEST-7..TEST-12)
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  APP_ID,
  allParamsOf,
  appSettingsFor,
  fragmentOf,
  holdSession,
  installLocation,
  installServer,
  PAGE_ORIGIN,
  type PkceMode,
  TARGET,
  withoutFragment,
} from './support/handoff-harness';

// How a sign-in ends for a target the app configured (the app default, which is
// not server-checked): tokens in the fragment only for a Simple-mode app, a bare
// navigation for an SDK-mode app, and nothing at all when the mode cannot be read.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

type Setup = { pkce?: PkceMode; handOff?: HandOff; search?: string };

const setup = async ({ pkce = false, handOff, search = '' }: Setup = {}) => {
  installServer({ pkce });
  const { navigations } = installLocation(`${PAGE_ORIGIN}/web/signin${search}`);
  const wrapper = ({ children }: PropsWithChildren) => (
    <PassflowProvider url='https://auth.example.com' appId={APP_ID} parseQueryParams={false} handOff={handOff}>
      {children}
    </PassflowProvider>
  );
  const { result } = renderHook(() => ({ passflow: usePassflow(), sign: useSignInEnding() }), { wrapper });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
  const session = holdSession(result.current.passflow, async () => appSettingsFor(pkce));
  const finish = async () => {
    await act(async () => {
      await result.current.sign.finishSignIn(null, TARGET);
    });
  };
  return { result, navigations, session, finish };
};

const tokenNavigations = (navigations: string[]) => navigations.filter((n) => n.includes('access_token'));

describe('REQ-2 sign-in ending follows the app mode from getAppSettings()', () => {
  test('TEST-1 REQ-2 Simple app (pkce_enabled false) goes to the target with the tokens in the fragment', async () => {
    const { navigations, session, finish } = await setup({ pkce: false });
    await finish();

    await waitFor(() => expect(navigations.length).toBeGreaterThan(0));
    const to = navigations.at(-1) as string;
    expect(withoutFragment(to)).toBe(TARGET);
    expect(fragmentOf(to).get('access_token')).toBe(session.tokens.access_token);
    // Tokens travel in the fragment, never in the query.
    expect(new URL(to).searchParams.get('access_token')).toBeNull();
    expect(new URL(to).searchParams.get('keep')).toBe('1');
  });

  test('TEST-2 REQ-2 SDK app (pkce_enabled true) goes to the bare target with no tokens', async () => {
    const { navigations, finish } = await setup({ pkce: true });
    await finish();

    await waitFor(() => expect(navigations.length).toBeGreaterThan(0));
    expect(navigations.at(-1)).toBe(TARGET);
    expect(tokenNavigations(navigations)).toEqual([]);
    expect(navigations.some((n) => n.includes('refresh_token') || n.includes('id_token'))).toBe(false);
  });

  test('TEST-3 REQ-2 app settings without pkce_enabled send no tokens (bare target)', async () => {
    const { navigations, finish } = await setup({ pkce: 'absent' });
    await finish();

    await waitFor(() => expect(navigations.length).toBeGreaterThan(0));
    expect(navigations.at(-1)).toBe(TARGET);
    expect(tokenNavigations(navigations)).toEqual([]);
  });

  test('TEST-4 REQ-2 a settings read failure sends nothing and the ending is unavailable', async () => {
    const { result, navigations, session, finish } = await setup({ pkce: false });
    session.settingsSpy.mockImplementation(async () => {
      throw new Error('settings unavailable');
    });
    await finish();

    await waitFor(() => expect(result.current.sign.ending).toBe('unavailable'));
    expect(navigations).toEqual([]);
  });

  test('TEST-5 REQ-2 retry after a read failure finishes the sign-in to the app default target', async () => {
    const { result, navigations, session, finish } = await setup({ pkce: false });
    session.settingsSpy.mockImplementation(async () => {
      throw new Error('settings unavailable');
    });
    await finish();
    await waitFor(() => expect(result.current.sign.ending).toBe('unavailable'));

    session.settingsSpy.mockImplementation(async () => appSettingsFor(false));
    await act(async () => {
      result.current.sign.retry();
      await new Promise((r) => setTimeout(r, 0));
    });

    await waitFor(() => expect(tokenNavigations(navigations).length).toBe(1));
    const to = tokenNavigations(navigations)[0];
    expect(withoutFragment(to)).toBe(TARGET);
    expect(fragmentOf(to).get('access_token')).toBe(session.tokens.access_token);
  });
});

describe('REQ-3 what a Simple-mode ending hands back, with and without handOff', () => {
  test('TEST-7 REQ-3 without handOff every token goes and no state is added (unchanged default)', async () => {
    const { navigations, session, finish } = await setup({ pkce: false });
    await finish();

    await waitFor(() => expect(tokenNavigations(navigations).length).toBe(1));
    const fragment = fragmentOf(tokenNavigations(navigations)[0]);
    expect(fragment.get('access_token')).toBe(session.tokens.access_token);
    expect(fragment.get('refresh_token')).toBe(session.tokens.refresh_token);
    expect(fragment.get('id_token')).toBe(session.tokens.id_token);
    expect(allParamsOf(tokenNavigations(navigations)[0]).has('state')).toBe(false);
  });

  test('TEST-8 REQ-2 REQ-3 handOff without offline scopes withholds the refresh token', async () => {
    const { navigations, session, finish } = await setup({
      pkce: false,
      handOff: { scopes: ['openid', 'profile', 'id'] },
    });
    await finish();

    await waitFor(() => expect(tokenNavigations(navigations).length).toBe(1));
    const fragment = fragmentOf(tokenNavigations(navigations)[0]);
    expect(fragment.get('access_token')).toBe(session.tokens.access_token);
    expect(fragment.has('refresh_token')).toBe(false);
  });

  test.each([['offline'], ['offline_access']])(
    'TEST-9 REQ-2 REQ-3 handOff scopes with %s include the refresh token',
    async (scope) => {
      const { navigations, session, finish } = await setup({
        pkce: false,
        handOff: { scopes: ['openid', scope] },
      });
      await finish();

      await waitFor(() => expect(tokenNavigations(navigations).length).toBe(1));
      const fragment = fragmentOf(tokenNavigations(navigations)[0]);
      expect(fragment.get('refresh_token')).toBe(session.tokens.refresh_token);
      expect(fragment.get('access_token')).toBe(session.tokens.access_token);
    },
  );

  test('TEST-10 REQ-2 REQ-3 handOff state is echoed back with the tokens', async () => {
    const { navigations, finish } = await setup({
      pkce: false,
      handOff: { scopes: ['openid', 'offline'], state: 'app-state-42' },
    });
    await finish();

    await waitFor(() => expect(tokenNavigations(navigations).length).toBe(1));
    expect(allParamsOf(tokenNavigations(navigations)[0]).get('state')).toBe('app-state-42');
  });

  test('TEST-11 REQ-3 REQ-4 handOff with state and no scopes falls back to configured scopes: state goes, refresh token does not', async () => {
    const { navigations, session, finish } = await setup({ pkce: false, handOff: { state: 'only-state' } });
    await finish();

    await waitFor(() => expect(tokenNavigations(navigations).length).toBe(1));
    const to = tokenNavigations(navigations)[0];
    expect(fragmentOf(to).get('access_token')).toBe(session.tokens.access_token);
    expect(fragmentOf(to).has('refresh_token')).toBe(false);
    expect(allParamsOf(to).get('state')).toBe('only-state');
  });

  test('TEST-12 REQ-2 REQ-3 an SDK-mode app sends no tokens and no state even with a handOff', async () => {
    const { navigations, finish } = await setup({
      pkce: true,
      handOff: { scopes: ['openid', 'offline'], state: 'sdk-state' },
    });
    await finish();

    await waitFor(() => expect(navigations.length).toBeGreaterThan(0));
    expect(navigations.at(-1)).toBe(TARGET);
    expect(tokenNavigations(navigations)).toEqual([]);
  });
});
