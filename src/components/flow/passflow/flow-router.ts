/**
 * The flow's own router: no router library. PassflowFlow has a fixed set of
 * screens, one path parameter (`:token`) and search params, so it matches paths
 * itself and keeps one of three histories, or takes the location from the host.
 *
 * Browser history is the default and works on its own or inside a host router
 * (React Router, TanStack Router, Wouter): the flow moves the URL with
 * `history.pushState` and then fires `popstate`, the event every browser-history
 * router listens to, so the host's location follows. Back and Forward reach the
 * flow through the same event.
 */
import { routes } from '@/context';

export type FlowLocation = { pathname: string; search: string };
export type FlowNavigateOptions = { replace: boolean };
export type FlowNavigate = (location: FlowLocation, options: FlowNavigateOptions) => void;

export type FlowHistory = {
  /** The current location. Returns the same object until the location changes. */
  read: () => FlowLocation;
  subscribe: (listener: () => void) => () => void;
  navigate: FlowNavigate;
};

/** The screens PassflowFlow renders, keyed as in `routes`. */
export const FLOW_SCREENS = [
  'signin',
  'signup',
  'verify_otp',
  'verify_magic_link',
  'forgot_password',
  'forgot_password_success',
  'reset_password',
  'invitation',
  'two_factor_verify',
  'two_factor_setup',
  'two_factor_setup_magic_link',
] as const satisfies readonly (keyof typeof routes)[];

export type FlowScreen = (typeof FLOW_SCREENS)[number];

export type FlowMatch = { screen: FlowScreen; params: Record<string, string> };

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `/two-factor-setup-magic-link/:token` → a pattern for the path's segments, capturing params. */
const patternSource = (path: string) =>
  path
    .split('/')
    .map((segment) => (segment.startsWith(':') ? '([^/]+)' : escapeRegExp(segment)))
    .join('/');

const paramNames = (path: string) =>
  path
    .split('/')
    .filter((segment) => segment.startsWith(':'))
    .map((segment) => segment.slice(1));

// Longest first, so `/forgot-password/success` wins over `/forgot-password`.
const SCREENS_BY_LENGTH = [...FLOW_SCREENS].sort((a, b) => routes[b].path.length - routes[a].path.length);

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/** `'/auth/'` → `'/auth'`, `'auth'` → `'/auth'`, `'/'` or `''` → `''`. */
export const normalizePrefix = (prefix: string | undefined): string => {
  const trimmed = (prefix ?? '').replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}` : '';
};

const trimTrailingSlash = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname);

/** The screen at `pathname` under `prefix`, or null when the path is not one of the flow's screens. */
export const matchScreen = (pathname: string, prefix: string): FlowMatch | null => {
  const path = trimTrailingSlash(pathname);
  for (const screen of SCREENS_BY_LENGTH) {
    const route = routes[screen].path;
    const match = new RegExp(`^${escapeRegExp(prefix)}${patternSource(route)}$`).exec(path);
    if (match) {
      const names = paramNames(route);
      return { screen, params: Object.fromEntries(names.map((name, index) => [name, decode(match[index + 1] ?? '')])) };
    }
  }
  return null;
};

/**
 * Where the flow is mounted, worked out from the first URL it sees: the part in
 * front of a screen path (`/auth/signin` → `/auth`), or the whole path when it
 * names no screen (`/auth` → `/auth`, `/` → `''`).
 */
export const detectPrefix = (pathname: string): string => {
  const path = trimTrailingSlash(pathname);
  for (const screen of SCREENS_BY_LENGTH) {
    const match = new RegExp(`^(.*?)${patternSource(routes[screen].path)}$`).exec(path);
    if (match) return normalizePrefix(match[1]);
  }
  return normalizePrefix(path);
};

/** The absolute path of a screen under `prefix`; `params` fill `:name` segments. */
export const screenPath = (screen: FlowScreen, prefix: string, params: Record<string, string> = {}): string =>
  `${prefix}${routes[screen].path.replace(/:(\w+)/g, (_, name: string) => encodeURIComponent(params[name] ?? ''))}`;

export const isUnderPrefix = (pathname: string, prefix: string) =>
  prefix === '' || pathname === prefix || pathname.startsWith(`${prefix}/`);

export const withQuestionMark = (search: string) => (search && !search.startsWith('?') ? `?${search}` : search);

/** Keeps `read` stable between changes, as `useSyncExternalStore` requires. */
const cached = (compute: () => FlowLocation) => {
  let last: FlowLocation | null = null;
  return () => {
    const next = compute();
    if (!last || last.pathname !== next.pathname || last.search !== next.search) last = next;
    return last;
  };
};

const listenTo = (events: string[]) => (listener: () => void) => {
  for (const event of events) window.addEventListener(event, listener);
  return () => {
    for (const event of events) window.removeEventListener(event, listener);
  };
};

/** Tells every browser-history router on the page (the flow included) that the URL moved. */
const announceUrlChange = () => window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));

export const createBrowserHistory = (): FlowHistory => ({
  read: cached(() => ({ pathname: window.location.pathname, search: window.location.search })),
  subscribe: listenTo(['popstate']),
  navigate: ({ pathname, search }, { replace }) => {
    const url = `${pathname}${withQuestionMark(search)}`;
    // The current state is kept so a host router's own bookkeeping (its history
    // index and key) stays readable after the move.
    if (replace) window.history.replaceState(window.history.state, '', url);
    else window.history.pushState(window.history.state, '', url);
    announceUrlChange();
  },
});

const readHash = (): FlowLocation => {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const queryAt = raw.indexOf('?');
  const pathname = queryAt >= 0 ? raw.slice(0, queryAt) : raw;
  return { pathname: pathname.startsWith('/') ? pathname : `/${pathname}`, search: queryAt >= 0 ? raw.slice(queryAt) : '' };
};

export const createHashHistory = (): FlowHistory => ({
  read: cached(readHash),
  subscribe: listenTo(['popstate', 'hashchange']),
  navigate: ({ pathname, search }, { replace }) => {
    const url = `${window.location.pathname}${window.location.search}#${pathname}${withQuestionMark(search)}`;
    if (replace) window.history.replaceState(window.history.state, '', url);
    else window.history.pushState(window.history.state, '', url);
    announceUrlChange();
  },
});

export const createMemoryHistory = (initial: FlowLocation = { pathname: '/', search: '' }): FlowHistory => {
  const entries: FlowLocation[] = [initial];
  const listeners = new Set<() => void>();
  return {
    read: () => entries[entries.length - 1] as FlowLocation,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    navigate: ({ pathname, search }, { replace }) => {
      const next = { pathname, search: withQuestionMark(search) };
      if (replace) entries[entries.length - 1] = next;
      else entries.push(next);
      for (const listener of listeners) listener();
    },
  };
};
