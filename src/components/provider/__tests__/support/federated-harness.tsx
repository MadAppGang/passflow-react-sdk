import { webcrypto } from 'node:crypto';
import type { Passflow } from '@passflow/core';
import { act, cleanup, render } from '@testing-library/react';
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import React, { type PropsWithChildren, useContext, useEffect } from 'react';
import { vi } from 'vitest';
import { PassflowFlow } from '@/components/flow/passflow';
import { PassflowProvider } from '@/components/provider/passflow-provider';
import { NavigationContext } from '@/context';
import { useAppSettings, useNavigation, usePassflow } from '@/hooks';
import {
  appSettingsFixture,
  passflowSettingsFixture,
  stubBrowserApis,
} from '../../../../../tests/unit/support/passflow-fixtures';

export const slotKey = 'passflow_federated_pkce';
export const target = 'https://app.example.com/after-signin';
export const appId = 'non-default-pkce-app';
export const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
export const jwt = (claims: Record<string, unknown>) =>
  [
    btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, ''),
    btoa(JSON.stringify({ sub: 'federated-test-user', exp: 4102444800, ...claims })).replace(/=+$/, ''),
    'signature',
  ].join('.');
export const authTokens = () => ({
  access_token: jwt({ type: 'access', scopes: ['openid', 'email'] }),
  refresh_token: jwt({ type: 'refresh' }),
  id_token: jwt({ type: 'id_token', email: 'federated@example.com' }),
  token_type: 'Bearer',
  expires_in: 3600,
});
export const factorAnswer = () => ({
  requires_2fa: true,
  tfa_token: jwt({ type: 'tfa', challenge_id: 'federated-factor' }),
  challenge_id: 'federated-factor',
});
export const writeSlot = () => {
  const value = JSON.stringify({
    verifier: 'test-verifier-' + 'v'.repeat(43),
    scopes: ['openid', 'email'],
    expiresAt: Date.now() + 600_000,
  });
  sessionStorage.setItem(slotKey, value);
  return value;
};
export type HttpRequest = { path: string; method: string; body: Record<string, unknown> };
export type HttpReply = { data: unknown; status?: number };
export type Network = ReturnType<typeof installLandingEnvironment>;

export function installLandingEnvironment(options: { pathname?: string; search?: string } = {}) {
  localStorage.clear();
  sessionStorage.clear();
  stubBrowserApis();
  vi.stubGlobal('crypto', webcrypto);
  window.history.replaceState(
    null,
    '',
    (options.pathname ?? '/auth/signin') +
      (options.search ?? '?code=landing-code&user_state=state&appid=' + appId + '&redirectto=' + encodeURIComponent(target)),
  );

  const requests: HttpRequest[] = [];
  const forwards: string[] = [];
  const nativeLocation = window.location;
  const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location')!;
  // Navigation is a browser boundary: capture destinations rather than mocking SDK methods.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      get href() {
        return nativeLocation.href;
      },
      set href(value: string) {
        forwards.push(String(value));
      },
      get origin() {
        return nativeLocation.origin;
      },
      get pathname() {
        return nativeLocation.pathname;
      },
      get search() {
        return nativeLocation.search;
      },
      get hash() {
        return nativeLocation.hash;
      },
      get host() {
        return nativeLocation.host;
      },
      get hostname() {
        return nativeLocation.hostname;
      },
      get protocol() {
        return nativeLocation.protocol;
      },
      assign: (value: string) => {
        forwards.push(String(value));
      },
      replace: (value: string) => {
        forwards.push(String(value));
      },
      toString: () => nativeLocation.href,
    },
  });

  const settings = deferred<HttpReply>();
  const exchange = deferred<HttpReply>();
  const settingsData = { ...appSettingsFixture, id: appId, pkce_enabled: true, defaults: { redirect: target } };
  const endpoints = new Map<string, HttpReply>();
  const originalAdapter = axios.defaults.adapter;
  const reply = async (request: HttpRequest): Promise<HttpReply> => {
    requests.push(request);
    if (request.path === '/app/settings') return settings.promise;
    if (request.path === '/auth/pkce_exchange') return exchange.promise;
    if (request.path === '/auth/redirect/check') return { data: { redirect_url: request.body.redirect_url } };
    if (request.path === '/settings') return { data: passflowSettingsFixture };
    if (request.path === '/settings/password') return { data: passflowSettingsFixture.password_policy };
    if (endpoints.has(request.path)) return endpoints.get(request.path)!;
    if (/session/.test(request.path)) return { data: { valid: true } };
    throw new Error('Unstubbed HTTP boundary: ' + request.method + ' ' + request.path);
  };
  axios.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    const url = new URL(config.url ?? '/', config.baseURL ?? 'https://auth.example.com');
    const body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data ?? {});
    const result = await reply({ path: url.pathname, method: config.method ?? 'get', body });
    const response: AxiosResponse = {
      data: result.data,
      status: result.status ?? 200,
      statusText: '',
      headers: { 'content-type': 'application/json' },
      config,
    };
    if (response.status >= 400) throw new AxiosError('HTTP failure', 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(
      typeof input === 'string' ? input : input instanceof URL ? input.href : input.url,
      nativeLocation.origin,
    );
    const result = await reply({
      path: url.pathname,
      method: init?.method ?? 'get',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : {},
    });
    return new Response(JSON.stringify(result.data), {
      status: result.status ?? 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  return {
    requests,
    forwards,
    endpoints,
    settings,
    exchange,
    settingsData,
    async releaseSettings(data: unknown = settingsData, status = 200) {
      await act(async () => {
        settings.resolve({ data, status });
      });
    },
    async releaseExchange(data: unknown = authTokens(), status = 200) {
      await act(async () => {
        exchange.resolve({ data, status });
      });
    },
    restore() {
      cleanup();
      axios.defaults.adapter = originalAdapter;
      Object.defineProperty(window, 'location', locationDescriptor);
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
      localStorage.clear();
      sessionStorage.clear();
      window.history.replaceState(null, '', '/');
    },
  };
}

export type Observed = {
  current?: Passflow;
  outcome?: 'signed-in' | 'failed';
  settingsReady: boolean;
  navigations: Array<{ to: string; search?: string; replace?: boolean }>;
};
export const makeObserved = (): Observed => ({ settingsReady: false, navigations: [] });

// Public context/hook probes only. No store inspection, constructors spied on or manually emitted auth events.
export function LandingProbe({ observed, factorPath }: { observed: Observed; factorPath?: string }) {
  const passflow = usePassflow();
  const navigation = useNavigation();
  const { appSettings } = useAppSettings();
  observed.current = passflow;
  observed.outcome = useContext(NavigationContext).federatedLandingOutcome;
  observed.settingsReady = !!appSettings;
  useEffect(() => {
    if (factorPath) navigation.setTwoFactorVerifyPath?.(factorPath);
  }, [factorPath, navigation.setTwoFactorVerifyPath]);
  return null;
}

export function LandingTree({
  observed,
  mode = 'login-page',
  flow = true,
  factorPath,
  successRedirect = target,
  children,
}: PropsWithChildren<{
  observed: Observed;
  mode?: 'app' | 'login-page';
  flow?: boolean;
  factorPath?: string;
  successRedirect?: string | null;
}>) {
  return (
    <PassflowProvider
      appId={appId}
      url='https://auth.example.com'
      parseQueryParams
      navigate={(destination) => {
        observed.navigations.push(destination);
      }}
    >
      <LandingProbe observed={observed} factorPath={factorPath} />
      {flow && <PassflowFlow federatedLanding={mode} successAuthRedirect={successRedirect ?? undefined} />}
      {children}
    </PassflowProvider>
  );
}

export function renderLanding(props: React.ComponentProps<typeof LandingTree>, strict = false) {
  const tree = <LandingTree {...props} />;
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
}
