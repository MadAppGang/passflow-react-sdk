import type { AppSettings, PassflowConfig } from '@passflow/core';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { StrictMode, useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PassflowProvider } from '@/components/provider/passflow-provider';
import { PassflowContext, type PassflowContextType } from '@/context';
import { appSettingsFixture, passflowSettingsFixture, stubBrowserApis } from '../../../tests/unit/support/passflow-fixtures';
import { useAppSettings } from '../use-app-settings';

// Core is real except for two seams: constructions are counted, and the app's settings come from the test.
const core = vi.hoisted(() => ({
  constructions: [] as unknown[],
  settingsCalls: [] as Array<string | undefined>,
  appSettings: (_appId: string | undefined): Promise<unknown> => Promise.resolve({}),
}));

vi.mock('@passflow/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@passflow/core')>();
  class CountingPassflow extends actual.Passflow {
    constructor(config: PassflowConfig) {
      super(config);
      core.constructions.push(config);
    }
    async getAppSettings() {
      core.settingsCalls.push(this.appId);
      return (await core.appSettings(this.appId)) as AppSettings;
    }
    async getPasswordPolicySettings() {
      return passflowSettingsFixture.password_policy as never;
    }
  }
  return { ...actual, Passflow: CountingPassflow };
});

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((yes) => {
    resolve = yes;
  });
  return { promise, resolve };
};

type Reply = { status: number; body?: unknown };
let answerFetch: (path: string, init?: RequestInit) => Promise<Reply>;
const fetchedPaths: string[] = [];

const installFetch = () => {
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const path = new URL(raw, window.location.origin).pathname;
    fetchedPaths.push(path);
    const reply = await answerFetch(path, init);
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { 'content-type': 'application/json' },
    });
  });
};

type Observed = {
  appSettingsSeen: Array<AppSettings | null>;
  context?: PassflowContextType;
};
let observed: Observed;

const Probe = () => {
  const { appSettings } = useAppSettings();
  observed.context = useContext(PassflowContext);
  observed.appSettingsSeen.push(appSettings);
  return null;
};

const flush = () => act(async () => {});

beforeEach(() => {
  stubBrowserApis();
  installFetch();
  answerFetch = async () => ({ status: 404 });
  fetchedPaths.length = 0;
  core.constructions.length = 0;
  core.settingsCalls.length = 0;
  core.appSettings = async () => appSettingsFixture;
  observed = { appSettingsSeen: [] };
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

describe('useAppSettings with app-id discovery', () => {
  it('pending discovery is not loaded', async () => {
    const discovery = deferred<Reply>();
    answerFetch = (path) => (path === '/settings' ? discovery.promise : Promise.resolve({ status: 404 }));

    render(
      <PassflowProvider url='https://auth.example.com'>
        <Probe />
      </PassflowProvider>,
    );
    await flush();

    expect(observed.appSettingsSeen.every((seen) => seen === null)).toBe(true);
    expect(core.settingsCalls).toEqual([]);

    await act(async () => {
      discovery.resolve({ status: 200, body: { login_app: { app_id: 'discovered-app' } } });
    });

    await waitFor(() =>
      expect(observed.context?.state.appSettings?.auth_strategies).toEqual(appSettingsFixture.auth_strategies),
    );
    expect(core.settingsCalls).toEqual(['discovered-app']);
    expect(observed.context?.state.appId).toBe('discovered-app');
  });
});

describe('useAppSettings settings dispatch', () => {
  it('leaves values written while the settings request was pending in place', async () => {
    const settings = deferred<unknown>();
    core.appSettings = () => settings.promise;

    render(
      <PassflowProvider appId='known-app' url='https://auth.example.com'>
        <Probe />
      </PassflowProvider>,
    );
    await waitFor(() => expect(core.settingsCalls).toEqual(['known-app']));

    // Another writer updates the state while the settings request is open.
    await act(async () => {
      const context = observed.context!;
      context.dispatch({ type: 'SET_PASSFLOW_STATE', payload: { ...context.state, scopes: ['openid', 'email'] } });
    });
    await act(async () => {
      settings.resolve(appSettingsFixture);
    });

    await waitFor(() => expect(observed.context?.state.appSettings).toEqual(appSettingsFixture));
    expect(observed.context?.state.scopes).toEqual(['openid', 'email']);
    expect(observed.context?.state.appId).toBe('known-app');
  });
});

describe('PassflowProvider instance under StrictMode', () => {
  it('settings arriving and an equal scopes array build no new instance', async () => {
    const settings = deferred<unknown>();
    core.appSettings = () => settings.promise;

    const view = render(
      <StrictMode>
        <PassflowProvider appId='known-app' url='https://auth.example.com' scopes={['openid', 'profile']}>
          <Probe />
        </PassflowProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(core.settingsCalls.length).toBeGreaterThan(0));
    const built = core.constructions.length;
    const instance = observed.context?.passflow;

    await act(async () => {
      settings.resolve(appSettingsFixture);
    });
    await waitFor(() => expect(observed.context?.state.passwordPolicy).not.toBeNull());
    expect(core.constructions.length).toBe(built);

    await act(async () => {
      const context = observed.context!;
      context.dispatch({ type: 'SET_PASSFLOW_STATE', payload: { ...context.state, scopes: ['openid', 'profile'] } });
    });
    view.rerender(
      <StrictMode>
        <PassflowProvider appId='known-app' url='https://auth.example.com' scopes={['openid', 'profile']}>
          <Probe />
        </PassflowProvider>
      </StrictMode>,
    );
    await flush();

    expect(core.constructions.length).toBe(built);
    expect(observed.context?.passflow).toBe(instance);
  });
});

describe('useAppSettings after discovery', () => {
  it('discovery that finds no app id gives the empty default settings', async () => {
    render(
      <PassflowProvider url='https://auth.example.com'>
        <Probe />
      </PassflowProvider>,
    );

    await waitFor(() => expect(observed.context?.state.appSettings).toEqual({}));
    expect(observed.context?.state.isDiscoveringAppId).toBe(false);
    expect(observed.context?.state.appId).toBeUndefined();
    expect(core.settingsCalls).toEqual([]);
    expect(fetchedPaths).toContain('/settings');
  });

  it('discovery ending builds no new instance', async () => {
    render(
      <PassflowProvider url='https://auth.example.com'>
        <Probe />
      </PassflowProvider>,
    );
    const built = core.constructions.length;

    await waitFor(() => expect(observed.context?.state.appSettings).toEqual({}));

    expect(core.constructions.length).toBe(built);
  });

  it('an app link under an OIDC parent with no session reaches the sign-in form with settings', async () => {
    window.history.replaceState(null, '', '/web?appid=known-app&parent_challenge_id=parent-1');
    answerFetch = async (path) => (path === '/auth/session/exchange' ? { status: 401 } : { status: 404 });
    const appId = new URLSearchParams(window.location.search).get('appid') ?? undefined;

    render(
      <PassflowProvider appId={appId} url='https://auth.example.com'>
        <Probe />
      </PassflowProvider>,
    );

    await waitFor(() =>
      expect(observed.context?.state.appSettings?.auth_strategies).toEqual(appSettingsFixture.auth_strategies),
    );
    expect(fetchedPaths).toContain('/auth/session/exchange');
    expect(core.settingsCalls).toEqual(['known-app']);
  });
});

describe('PassflowProvider construction-time options', () => {
  it('a new tokenExchange object on rerender builds no new instance', async () => {
    const view = render(
      <PassflowProvider appId='known-app' url='https://auth.example.com' tokenExchange={{ enabled: false }}>
        <Probe />
      </PassflowProvider>,
    );
    await waitFor(() => expect(observed.context?.state.appSettings).not.toBeNull());
    const built = core.constructions.length;
    const instance = observed.context?.passflow;

    view.rerender(
      <PassflowProvider appId='known-app' url='https://auth.example.com' tokenExchange={{ enabled: false }}>
        <Probe />
      </PassflowProvider>,
    );
    await flush();

    expect(core.constructions.length).toBe(built);
    expect(observed.context?.passflow).toBe(instance);
  });

  it('an instance built later still gets the options from mount', async () => {
    const mountExchange = { enabled: false };
    const view = render(
      <PassflowProvider appId='known-app' url='https://auth.example.com' keyStoragePrefix='mount' tokenExchange={mountExchange}>
        <Probe />
      </PassflowProvider>,
    );
    await waitFor(() => expect(observed.context?.state.appSettings).not.toBeNull());
    view.rerender(
      <PassflowProvider
        appId='known-app'
        url='https://auth.example.com'
        keyStoragePrefix='later'
        tokenExchange={{ enabled: true }}
      >
        <Probe />
      </PassflowProvider>,
    );
    const built = core.constructions.length;

    await act(async () => {
      observed.context!.dispatch({ type: 'SET_PASSFLOW_STATE', payload: { appId: 'other-app' } });
    });

    expect(core.constructions.length).toBe(built + 1);
    const latest = core.constructions.at(-1) as PassflowConfig;
    expect(latest.appId).toBe('other-app');
    expect(latest.keyStoragePrefix).toBe('mount');
    expect(latest.tokenExchange).toBe(mountExchange);
  });

  it('an equal scopes array written to the state builds no new instance', async () => {
    render(
      <PassflowProvider appId='known-app' url='https://auth.example.com' scopes={['openid', 'profile']}>
        <Probe />
      </PassflowProvider>,
    );
    await waitFor(() => expect(observed.context?.state.appSettings).not.toBeNull());
    const built = core.constructions.length;

    await act(async () => {
      observed.context!.dispatch({ type: 'SET_PASSFLOW_STATE', payload: { scopes: ['openid', 'profile'] } });
    });
    expect(core.constructions.length).toBe(built);

    await act(async () => {
      observed.context!.dispatch({ type: 'SET_PASSFLOW_STATE', payload: { scopes: ['openid', 'profile', 'offline'] } });
    });
    expect(core.constructions.length).toBe(built + 1);
  });
});
