import { Providers } from '@passflow/core';
import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  appId,
  installLandingEnvironment,
  LandingTree,
  makeObserved,
  type Network,
  renderLanding,
  target,
} from '../../components/provider/__tests__/support/federated-harness';
import { useProvider } from '../use-provider';

let network: Network | undefined;
afterEach(() => {
  network?.restore();
  network = undefined;
});

describe('REQ-11 useProvider redirects through the login page only when opted in and eligible', () => {
  const cases: Array<{
    name: string;
    mode?: 'app' | 'login-page';
    pkce: boolean;
    path: string;
    target?: string;
    parent?: string;
    hosted: boolean;
  }> = [
    {
      name: 'login-page PKCE strips every trailing slash and extraneous query',
      mode: 'login-page',
      pkce: true,
      path: '/web///',
      target,
      hosted: true,
    },
    { name: 'absolute target stays absolute', mode: 'login-page', pkce: true, path: '/web', target, hosted: true },
    {
      name: 'relative target gets the current origin',
      mode: 'login-page',
      pkce: true,
      path: '/web/',
      target: '/callback',
      hosted: true,
    },
    {
      name: 'relative target without leading slash gets the current origin',
      mode: 'login-page',
      pkce: true,
      path: '/web/',
      target: 'callback',
      hosted: true,
    },
    {
      name: 'no target omits redirectto rather than sending an empty value',
      mode: 'login-page',
      pkce: true,
      path: '/web/',
      hosted: true,
    },
    { name: 'empty target omits redirectto', mode: 'login-page', pkce: true, path: '/web/', target: '', hosted: true },
    { name: 'root path remains a slash', mode: 'login-page', pkce: true, path: '/', target, hosted: true },
    { name: 'default app mode preserves the existing redirect', pkce: true, path: '/web/', target, hosted: false },
    {
      name: 'explicit app mode preserves the existing redirect',
      mode: 'app',
      pkce: true,
      path: '/web/',
      target,
      hosted: false,
    },
    { name: 'non-PKCE preserves the existing redirect', mode: 'login-page', pkce: false, path: '/web/', target, hosted: false },
    {
      name: 'parent preserves the existing redirect',
      mode: 'login-page',
      pkce: true,
      path: '/web/',
      target,
      parent: 'parent_challenge_id',
      hosted: false,
    },
    {
      name: 'mixed-case parent also preserves the existing redirect',
      mode: 'login-page',
      pkce: true,
      path: '/web/',
      target,
      parent: 'Parent_Challenge_Id',
      hosted: false,
    },
  ];

  it.each(cases)('$name', async (scenario) => {
    network = installLandingEnvironment({
      pathname: scenario.path,
      search:
        '?unrelated=remove&code=unarmed&user_state=unarmed' + (scenario.parent ? '&' + scenario.parent + '=parent-row' : ''),
    });
    const observed = makeObserved();
    let actions: ReturnType<typeof useProvider> | undefined;
    function HookProbe() {
      actions = useProvider(scenario.target, undefined, scenario.mode);
      return null;
    }
    const tree = renderLanding({ observed, flow: false, children: <HookProbe /> });
    await network.releaseSettings({ ...network.settingsData, pkce_enabled: scenario.pkce });
    await waitFor(() => expect(observed.settingsReady).toBe(true));
    await act(async () => {
      actions!.federatedWithRedirect(Providers.google);
    });
    await waitFor(() => expect(network!.forwards).toHaveLength(1));
    const outbound = new URL(network.forwards[0]);
    const redirect = outbound.searchParams.get('redirect_url');
    if (scenario.hosted) {
      const landing = new URL(redirect!);
      const origin = window.location.origin;
      expect(landing.origin).toBe(origin);
      expect(landing.pathname).toBe(scenario.path.replace(/\/+$/, '') || '/');
      expect([...landing.searchParams.keys()].sort()).toEqual(scenario.target ? ['appid', 'redirectto'] : ['appid']);
      expect(landing.searchParams.get('appid')).toBe(appId);
      if (scenario.target)
        expect(landing.searchParams.get('redirectto')).toBe(
          scenario.target.startsWith('https:')
            ? scenario.target
            : origin + (scenario.target.startsWith('/') ? '' : '/') + scenario.target,
        );
      else expect(landing.searchParams.has('redirectto')).toBe(false);
      expect(landing.searchParams.has('code')).toBe(false);
      expect(landing.searchParams.has('user_state')).toBe(false);
    } else expect(redirect).toBe(target);
    tree.rerender(
      <LandingTree observed={observed} flow={false}>
        <HookProbe />
      </LandingTree>,
    );
  });
});
