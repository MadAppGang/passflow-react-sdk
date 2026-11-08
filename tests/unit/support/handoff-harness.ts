import type { Passflow } from '@passflow/react';
import { vi } from 'vitest';
import { appSettingsFixture, passflowSettingsFixture } from './passflow-fixtures';

// A stubbed HTTP boundary, a recording `location`, and a signed-in session, for black-box
// tests of how a sign-in ends and what a federated start carries. Only the public
// surface of @passflow/react is used; core's own methods are replaced on the live
// instance only where the spec names them as the input (`getAppSettings`, tokens).

export const APP_ID = appSettingsFixture.id;
export const PAGE_ORIGIN = 'http://localhost:3000';
export const TARGET = 'https://app.example.com/callback?keep=1';

export type PkceMode = boolean | 'absent';

export const appSettingsFor = (pkce: PkceMode) => {
  const settings: Record<string, unknown> = { ...appSettingsFixture };
  if (pkce === 'absent') delete settings.pkce_enabled;
  else settings.pkce_enabled = pkce;
  return settings;
};

// ---------------------------------------------------------------- HTTP boundary

export type Outbound = { method: string; url: string; body: unknown };

const parseBody = (raw: unknown): unknown => {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return Object.fromEntries(new URLSearchParams(raw));
    }
  }
  if (raw instanceof URLSearchParams) return Object.fromEntries(raw);
  return raw;
};

export const installServer = (initial: { pkce?: PkceMode } = {}) => {
  const state = { pkce: initial.pkce ?? (false as PkceMode) };
  const outbound: Outbound[] = [];
  /** Answers by path fragment, checked before the fixtures. */
  const answers = new Map<string, unknown>();
  const bodyFor = (url: string) => {
    for (const [path, body] of answers) if (url.includes(path)) return body;
    return url.includes('/app/settings') ? appSettingsFor(state.pkce) : passflowSettingsFixture;
  };

  class RecordingXMLHttpRequest {
    static readonly DONE = 4;
    readyState = 0;
    status = 0;
    statusText = '';
    responseURL = '';
    responseType = '';
    response: unknown = null;
    responseText = '';
    timeout = 0;
    withCredentials = false;
    upload = { addEventListener: () => undefined };
    onloadend: (() => void) | null = null;
    onreadystatechange: (() => void) | null = null;
    onerror: (() => void) | null = null;
    onabort: (() => void) | null = null;
    ontimeout: (() => void) | null = null;
    private method = 'GET';
    private url = '';
    open(method: string, url: string) {
      this.method = method.toUpperCase();
      this.url = url;
      this.readyState = 1;
    }
    setRequestHeader() {}
    getAllResponseHeaders() {
      return 'content-type: application/json\r\n';
    }
    addEventListener() {}
    removeEventListener() {}
    abort() {}
    send(body?: unknown) {
      outbound.push({ method: this.method, url: this.url, body: parseBody(body) });
      setTimeout(() => {
        this.readyState = 4;
        this.status = 200;
        this.statusText = 'OK';
        this.responseURL = this.url;
        this.responseText = JSON.stringify(bodyFor(this.url));
        this.response = this.responseText;
        this.onreadystatechange?.();
        this.onloadend?.();
      }, 0);
    }
  }

  vi.stubGlobal('XMLHttpRequest', RecordingXMLHttpRequest);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
      outbound.push({ method, url, body: parseBody(init?.body) });
      return new Response(JSON.stringify(bodyFor(url)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  return {
    outbound,
    setPkce(pkce: PkceMode) {
      state.pkce = pkce;
    },
    answer(path: string, body: unknown) {
      answers.set(path, body);
    },
  };
};

// ---------------------------------------------------------------- location

/**
 * Replaces `location` with one that records every navigation (href set, assign,
 * replace) instead of leaving the page. Reads (origin, search, hash) answer from
 * `startHref`. Undo with vi.unstubAllGlobals().
 */
export const installLocation = (startHref: string) => {
  const current = new URL(startHref);
  const navigations: string[] = [];
  const record = (to: string | URL) => {
    navigations.push(new URL(String(to), current).href);
  };
  const loc = {
    get href() {
      return current.href;
    },
    set href(to: string) {
      record(to);
    },
    get origin() {
      return current.origin;
    },
    get protocol() {
      return current.protocol;
    },
    get host() {
      return current.host;
    },
    get hostname() {
      return current.hostname;
    },
    get port() {
      return current.port;
    },
    get pathname() {
      return current.pathname;
    },
    set pathname(v: string) {
      current.pathname = v;
    },
    get search() {
      return current.search;
    },
    set search(v: string) {
      current.search = v;
    },
    get hash() {
      return current.hash;
    },
    set hash(v: string) {
      current.hash = v;
    },
    ancestorOrigins: [] as unknown as DOMStringList,
    assign: vi.fn((to: string | URL) => record(to)),
    replace: vi.fn((to: string | URL) => record(to)),
    reload: vi.fn(),
    toString() {
      return current.href;
    },
  };
  vi.stubGlobal('location', loc);
  if ((window.location as unknown) !== loc) {
    throw new Error('test harness: the location stub did not take (window is not globalThis here)');
  }
  return { navigations };
};

// ---------------------------------------------------------------- session

const b64url = (value: unknown) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

export const jwt = (claims: Record<string, unknown>) =>
  `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url(claims)}.c2lnbmF0dXJl`;

const exp = () => Math.floor(Date.now() / 1000) + 3600;

export const sessionTokens = () => ({
  access_token: jwt({ sub: 'user-1', aud: [APP_ID], type: 'access', exp: exp() }),
  refresh_token: jwt({ sub: 'user-1', aud: [APP_ID], type: 'refresh', exp: exp() + 86400 }),
  id_token: jwt({ sub: 'user-1', aud: [APP_ID], type: 'id', exp: exp() }),
});

type Spyable = Record<string, unknown>;

/**
 * Makes the live instance hold a session, and answers `getAppSettings()` with
 * `settings` (the spec names that read as the source of the app's mode).
 */
export const holdSession = (passflow: Passflow, settings: () => Promise<unknown>, tokens = sessionTokens()) => {
  const target = passflow as unknown as Spyable;
  const settingsSpy = vi.spyOn(target as never, 'getAppSettings' as never) as unknown as ReturnType<typeof vi.fn>;
  settingsSpy.mockImplementation(settings);
  if (typeof target.getTokens === 'function') {
    (vi.spyOn(target as never, 'getTokens' as never) as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(tokens);
  }
  if (typeof target.getCachedTokens === 'function') {
    (vi.spyOn(target as never, 'getCachedTokens' as never) as unknown as ReturnType<typeof vi.fn>).mockReturnValue(tokens);
  }
  if (typeof target.isAuthenticated === 'function') {
    (vi.spyOn(target as never, 'isAuthenticated' as never) as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  }
  return { tokens, settingsSpy };
};

// ---------------------------------------------------------------- reading URLs

/** Parameters of a URL's fragment. */
export const fragmentOf = (href: string) => new URLSearchParams(new URL(href).hash.replace(/^#/, ''));

/** Parameters of a URL's query and fragment together (fragment wins). */
export const allParamsOf = (href: string) => {
  const url = new URL(href);
  const merged = new URLSearchParams(url.search);
  for (const [k, v] of fragmentOf(href)) merged.set(k, v);
  return merged;
};

export const withoutFragment = (href: string) => {
  const url = new URL(href);
  url.hash = '';
  return url.href;
};

/** A scope list however it is written: an array, or a space, comma or plus separated string. */
export const scopeList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') return value.split(/[\s,+]+/).filter(Boolean);
  return [];
};

/**
 * Everything the federated start carried: query parameters of the navigation or
 * request that reached `/federated`, merged with a request body when there is one.
 */
export const federatedStartPayload = (outbound: Outbound[], navigations: string[]) => {
  const payload: Record<string, unknown> = {};
  const sources = [
    ...outbound.filter((o) => o.url.includes('federated')),
    ...navigations.filter((n) => n.includes('federated')).map((url) => ({ url, body: undefined as unknown })),
  ];
  for (const source of sources) {
    try {
      for (const [k, v] of new URL(source.url, PAGE_ORIGIN).searchParams) payload[k] = v;
    } catch {
      // not a URL: ignore
    }
    if (source.body && typeof source.body === 'object') Object.assign(payload, source.body);
  }
  return { found: sources.length > 0, payload };
};
