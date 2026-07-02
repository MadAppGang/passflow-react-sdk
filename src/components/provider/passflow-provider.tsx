import {
  AuthProvider,
  type NavigateFunction,
  NavigationContext,
  PassflowContext,
  type RouterType,
  defaultNavigate,
  initialState,
  passflowReducer,
} from '@/context';
import { Passflow, type PassflowConfig } from '@passflow/core';
import React, { type FC, type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import '@/styles/index.css';

type PassflowProviderProps = PassflowConfig & {
  children: ReactNode;
  navigate?: NavigateFunction;
  router?: RouterType;
};

/**
 * Passflow auth-endpoint regex used by the OIDC interceptor below.
 * Matches every endpoint that takes credentials + an optional
 * parent_challenge_id so the SDK can inject the parent on outbound
 * POSTs and follow `redirect_url` on responses.
 *
 * The set is canonical with the server's AuthFlow dispatcher; if a
 * new credential endpoint lands server-side, it must be added here.
 *
 *   - /auth/login                      — password login
 *   - /auth/passwordless/*             — OTP / magic-link start+complete
 *   - /auth/passkey/*                  — passkey registration/auth
 *   - /auth/2fa/*                      — second-factor verify
 *   - /auth/federated/start            — federated start (callback is server)
 *   - /auth/session/exchange           — RFC 8693-style session exchange
 *                                        (ADR-2; activated on Leg 2 of
 *                                        OIDC two-step flows)
 */
const AUTH_ENDPOINT_PATTERN =
  /\/auth\/(login|passwordless|passkey|2fa|session\/exchange)\b|\/auth\/federated\/start\b/;

/**
 * Read `parent_challenge_id` from the current URL's query string.
 * Returns `undefined` when not present so callers can short-circuit
 * the OIDC interceptor on non-OIDC mounts.
 *
 * Lowercases only the parameter KEYS (not values) so the
 * KSUID-shaped value isn't corrupted on the way through. (URL params
 * are case-sensitive per RFC 3986; some Passflow URLs use mixed
 * case like `appId=...`. The lowercase-keys treatment mirrors what
 * the bundled login-app was doing pre-SDK-migration.)
 */
export const readParentChallengeIdFromURL = (): string | undefined => {
  if (typeof window === 'undefined') return undefined;
  const raw = new URLSearchParams(window.location.search);
  // Lowercase only keys, preserve values (values are often
  // case-sensitive — KSUIDs, JWTs, OIDC state, etc.).
  const lower = new URLSearchParams(
    Array.from(raw, ([key, value]) => [key.toLowerCase(), value]),
  );
  const value = lower.get('parent_challenge_id');
  return value || undefined;
};

// Captured at module evaluation — before React mounts and before any
// consumer-side router can rewrite the URL. The provider's mount-time
// read stays primary (a consumer could mount the SDK long after boot,
// on a different URL); this is the fallback that makes the OIDC opt-in
// immune to mount-vs-navigation timing. Observed in the field: the
// OIDF conformance login intermittently proceeded as a plain
// first-party login (tokens in the response, no redirect_url) because
// the whole OIDC layer keyed off a single mount-time read.
const bootParentChallengeId = readParentChallengeIdFromURL();

/**
 * Install the global OIDC AuthFlow interceptor on `fetch` and
 * `XMLHttpRequest`. The interceptor:
 *
 *   1. Injects `parent_challenge_id` on every Passflow auth POST
 *      body (when one is present on the SDK's host URL).
 *   2. Watches Passflow auth responses for a JSON
 *      `{ redirect_url: "..." }` and, when present, calls
 *      `window.location.assign(redirect_url)` to follow the
 *      server-side dispatch.
 *
 * Why both fetch and XHR: `@passflow/core` uses axios, which on the
 * browser delegates to XMLHttpRequest. Other consumer code (and the
 * SDK's own `/oidc/requests/{id}` GET) uses fetch. Patching both
 * keeps the interceptor uniform.
 *
 * No-op when `parent_challenge_id` is absent from the URL.
 *
 * Implementation note: previously this hook lived in the bundled
 * login-app at `login-app/src/App.tsx::useAuthFlowInterceptor`.
 * Moved into the SDK so any Passflow consumer that mounts
 * `<PassflowProvider>` gets full OIDC RP integration automatically.
 */
const useOIDCInterceptor = (parentChallengeId: string | undefined): void => {
  useEffect(() => {
    if (!parentChallengeId || typeof window === 'undefined') {
      return;
    }

    const isAuthURL = (url: string): boolean => AUTH_ENDPOINT_PATTERN.test(url);

    const injectParentChallenge = (raw: string | null | undefined): string | undefined => {
      if (!raw) return undefined;
      try {
        const obj = JSON.parse(raw) as Record<string, unknown>;
        if ('parent_challenge_id' in obj) return undefined;
        obj.parent_challenge_id = parentChallengeId;
        return JSON.stringify(obj);
      } catch {
        return undefined;
      }
    };

    const followRedirectURL = (raw: string | null | undefined): void => {
      if (!raw) return;
      try {
        const obj = JSON.parse(raw) as { redirect_url?: unknown };
        if (typeof obj.redirect_url === 'string' && obj.redirect_url) {
          window.location.assign(obj.redirect_url);
        }
      } catch {
        // Non-JSON — ignore.
      }
    };

    // fetch() interceptor (covers code paths that use the platform fetch API).
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      let url = '';
      if (typeof input === 'string') url = input;
      else if (input instanceof URL) url = input.toString();
      else if (input instanceof Request) url = input.url;

      const method = init?.method?.toUpperCase() ?? 'GET';
      let outInit = init;
      if (method === 'POST' && isAuthURL(url) && typeof init?.body === 'string') {
        const rewritten = injectParentChallenge(init.body);
        if (rewritten !== undefined) outInit = { ...init, body: rewritten };
      }

      const response = await originalFetch(input, outInit);

      if (response.ok && isAuthURL(url)) {
        try {
          const cloned = response.clone();
          const text = await cloned.text();
          followRedirectURL(text);
        } catch {
          // ignore
        }
      }

      return response;
    };

    // XMLHttpRequest interceptor — `@passflow/core` uses axios, which in
    // the browser uses XHR under the hood. The fetch interceptor above
    // does NOT catch those calls.
    const OriginalXHROpen = XMLHttpRequest.prototype.open;
    const OriginalXHRSend = XMLHttpRequest.prototype.send;

    type XHRTracker = { method?: string; url?: string; isAuth?: boolean };
    const tracker = new WeakMap<XMLHttpRequest, XHRTracker>();

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      ...rest: unknown[]
    ): void {
      const urlStr = typeof url === 'string' ? url : url.toString();
      tracker.set(this, {
        method: method?.toUpperCase(),
        url: urlStr,
        isAuth: isAuthURL(urlStr),
      });
      this.addEventListener('load', () => {
        const meta = tracker.get(this);
        if (!meta?.isAuth) return;
        if (this.status >= 200 && this.status < 300) {
          // Server returns 200 + JSON body { redirect_url: "..." } when
          // an AuthFlow parent (OIDC, federated, future step-up) needs
          // the SPA to navigate. See ADR-2.
          followRedirectURL(typeof this.responseText === 'string' ? this.responseText : null);
        }
      });
      // @ts-expect-error spread into open's varargs signature
      return OriginalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const meta = tracker.get(this);
      let outBody: Document | XMLHttpRequestBodyInit | null | undefined = body;
      if (meta?.isAuth && meta.method === 'POST' && typeof body === 'string') {
        const rewritten = injectParentChallenge(body);
        if (rewritten !== undefined) outBody = rewritten;
      }
      return OriginalXHRSend.call(this, outBody as Document | XMLHttpRequestBodyInit | null);
    };

    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = OriginalXHROpen;
      XMLHttpRequest.prototype.send = OriginalXHRSend;
    };
  }, [parentChallengeId]);
};

/**
 * Parent-challenge metadata returned by GET /oidc/requests/{id}.
 * Subset used by the SDK's exchange-on-mount probe.
 */
type ParentChallengeMeta = {
  request_id: string;
  app_name?: string;
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  response_mode?: string;
  // Server-side fields the SDK consults to decide whether to render
  // the login form vs auto-exchange. The OP at /oidc/authorize is
  // stateless (cookie-blind by design — see ADR-2); the SDK enforces
  // prompt directives because the SDK holds the session.
  oidc_prompt_login?: boolean;
  oidc_prompt_none?: boolean;
  max_age?: number;
};

/**
 * Token-exchange-on-mount probe per ADR-2 Leg 2. When a parent
 * challenge is present in the URL AND the SDK has an existing
 * session AND the parent allows exchange (no `prompt=login`,
 * `max_age` not exceeded), POST the access token to
 * /auth/session/exchange so the OP can issue a fresh authorization
 * code for the RP without re-prompting the user.
 *
 * Decision-making is the SDK's; the server enforces too (defence in
 * depth — see `auth_util.EvaluatePolicy`).
 *
 * Today the response branches are:
 *
 *   - 200 { redirect_url } → existing interceptor's redirect
 *     navigation fires (XHR `load` listener above).
 *   - 403 { error: "upgrade_required", ... } → SDK falls through to
 *     `setUpgradeRequired(true)` so the consumer renders the
 *     upgrade-required placeholder + login form. Code path is
 *     UNREACHABLE today (server's EvaluatePolicy is a no-op
 *     scaffold); activates when Subtask E lands.
 *   - 401 → clear stale tokens, fall through to login form.
 *
 * On any decision-point that ends with "render login form," the
 * SDK consumer's existing PassflowFlow render path picks up
 * naturally.
 */
type ExchangeState = 'idle' | 'exchanging' | 'upgrade_required' | 'fallback_to_login';

const useSessionExchangeOnMount = (
  parentChallengeId: string | undefined,
  passflow: Passflow,
  baseUrl: string | undefined,
  appId: string | undefined,
): { exchangeState: ExchangeState; parentMeta?: ParentChallengeMeta } => {
  const [exchangeState, setExchangeState] = useState<ExchangeState>('idle');
  const [parentMeta, setParentMeta] = useState<ParentChallengeMeta | undefined>(undefined);
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (!parentChallengeId || attemptedRef.current) {
      return;
    }
    // Wait until appId has been discovered before attempting the
    // exchange — otherwise the request 400s on "Application ID is
    // missing from request".
    if (!appId) {
      return;
    }
    attemptedRef.current = true;

    const run = async () => {
      // Fetch parent metadata upfront — we need OIDC `prompt` /
      // `max_age` directives to make the right decision regardless
      // of session state.
      let meta: ParentChallengeMeta | undefined;
      try {
        const base = baseUrl ?? '';
        const url = `${base}/oidc/requests/${encodeURIComponent(parentChallengeId)}`;
        const res = await fetch(url);
        if (res.ok) {
          meta = (await res.json()) as ParentChallengeMeta;
          setParentMeta(meta);
        }
      } catch {
        // Network error fetching parent → fall through to login form;
        // the user's POST will fail loudly enough.
      }

      // prompt=login on parent → render login form with banner.
      // The login interceptor will pick up parent_challenge_id and
      // dispatch normally. (Check this BEFORE attempting exchange —
      // even with a session, prompt=login means we must re-prompt.)
      if (meta?.oidc_prompt_login) {
        setExchangeState('fallback_to_login');
        return;
      }

      // max_age check: if parent set max_age, compare against the SDK's
      // known auth_time on the access token. When the access token's
      // auth_time is older than max_age (in seconds), the parent
      // demands re-auth.
      if (meta?.max_age && meta.max_age > 0) {
        const parsed = passflow.getParsedTokens?.();
        const accessPayload = parsed?.access_token?.payload as
          | { auth_time?: number }
          | undefined;
        const idPayload = parsed?.id_token?.payload as
          | { auth_time?: number }
          | undefined;
        const authTime = accessPayload?.auth_time ?? idPayload?.auth_time;
        if (authTime && typeof authTime === 'number') {
          const ageSeconds = Math.floor(Date.now() / 1000) - authTime;
          if (ageSeconds > meta.max_age) {
            setExchangeState('fallback_to_login');
            return;
          }
        }
      }

      // Attempt exchange. Use credentials: 'include' so the cookie-mode
      // access token (HttpOnly) accompanies the request even when the
      // SDK has no token in localStorage. Server's middleware.Token
      // falls back from Authorization header to cookie automatically.
      //
      // We always attempt the exchange (don't gate on isAuthenticated()
      // because in cookie mode the SDK can't see the HttpOnly access
      // token — the server is the authority). If the server returns 401
      // we know there's no session and we fall through to login.
      setExchangeState('exchanging');
      try {
        let accessToken: string | undefined;
        try {
          const tokens = await passflow.getTokens(false);
          accessToken = tokens?.access_token;
        } catch {
          // No token in SDK storage — that's OK for cookie mode; the
          // server will read from cookie. We still call /auth/session/
          // exchange and let the server's token middleware decide.
        }
        const base = baseUrl ?? '';
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }
        if (appId) {
          // App middleware reads X-Passflow-ClientID; without it the
          // request gets 400 "Application ID is missing from request".
          headers['X-Passflow-ClientID'] = appId;
        }
        const res = await fetch(`${base}/auth/session/exchange`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ parent_challenge_id: parentChallengeId }),
        });
        if (res.ok) {
          // The fetch interceptor above handles redirect_url
          // navigation. As insurance, do it here too in case the
          // interceptor's pattern misses some future endpoint rename.
          try {
            const body = (await res.json()) as { redirect_url?: string };
            if (body.redirect_url) {
              window.location.assign(body.redirect_url);
              return;
            }
          } catch {
            // ignore
          }
          // Successful but no redirect — unusual. Fall through.
          setExchangeState('fallback_to_login');
          return;
        }
        if (res.status === 403) {
          // upgrade_required. The server's MaxAge enforcement (Subtask D
          // partial) triggers this on max_age-exceeded sessions; the SDK
          // should render the login form to let the user re-auth. The
          // dedicated upgrade-required placeholder is reserved for the
          // future factor-elevation flow (Subtask E in
          // docs/roadmap/auth-level-enforcement.md).
          setExchangeState('fallback_to_login');
          return;
        }
        if (res.status === 401 || res.status === 400) {
          // No valid session. For prompt=none, OIDC requires us to
          // route the user back to the RP with error=login_required
          // WITHOUT rendering an interactive login form. For other
          // cases, fall through to the login form. We intentionally
          // do NOT call passflow.logOut() here — clearing cookies
          // here would also clear any session that exists but wasn't
          // visible to the SDK due to the cookie-mode HttpOnly
          // constraint; the user would lose their session for a
          // failed exchange that's the SDK's fault, not theirs.
          if (meta?.oidc_prompt_none && meta.redirect_uri) {
            const dest = new URL(meta.redirect_uri);
            dest.searchParams.set('error', 'login_required');
            dest.searchParams.set(
              'error_description',
              'user is not authenticated',
            );
            if (meta.state) dest.searchParams.set('state', meta.state);
            window.location.assign(dest.toString());
            return;
          }
          setExchangeState('fallback_to_login');
          return;
        }
        setExchangeState('fallback_to_login');
      } catch {
        setExchangeState('fallback_to_login');
      }
    };

    void run();
  }, [parentChallengeId, passflow, baseUrl, appId]);

  return { exchangeState, parentMeta };
};

/**
 * Default placeholder rendered while session exchange is in flight.
 * Consumers can theme this via the `continuingToAppPlaceholder` prop
 * on PassflowFlow.
 */
const DefaultContinuingPlaceholder: FC<{ appName?: string }> = ({ appName }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '1rem',
      color: '#444',
    }}
  >
    {appName ? `Continuing to ${appName}…` : 'Continuing…'}
  </div>
);

/**
 * Default upgrade-required placeholder. Code path is currently
 * unreachable (server `EvaluatePolicy` returns Satisfied=true for
 * every valid token); shipped now so it's already in place when
 * Subtask E activates the augmented `/auth/refresh` flow.
 */
const DefaultUpgradeRequiredPlaceholder: FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '0.95rem',
      color: '#666',
    }}
  >
    Additional authentication required (not yet implemented — please log in again).
  </div>
);

/**
 * Context surface exposed to children so the SDK's own components
 * (or consumer code) can read the OIDC parent-challenge state.
 */
export type OIDCExchangeContextValue = {
  parentChallengeId?: string;
  parentMeta?: ParentChallengeMeta;
  exchangeState: ExchangeState;
};

export const OIDCExchangeContext = React.createContext<OIDCExchangeContextValue>({
  exchangeState: 'idle',
});

export const PassflowProvider: FC<PassflowProviderProps> = ({
  children,
  navigate: initialNavigate,
  router = 'default',
  ...config
}) => {
  // If appId is not provided, set isDiscoveringAppId to true to signal
  // that auto-discovery should happen (prevents showing error before discovery)
  const needsDiscovery = !config.appId;

  const [state, dispatch] = useReducer(passflowReducer, {
    ...initialState,
    ...config,
    isDiscoveringAppId: needsDiscovery,
  });

  const [navigate, setNavigate] = useState<NavigateFunction>(() => {
    if (initialNavigate) {
      return initialNavigate;
    }
    return defaultNavigate;
  });

  const passflow = useMemo(() => new Passflow(state), [state]);

  // OIDC AuthFlow integration: the interceptor injects
  // parent_challenge_id on outbound auth POSTs + follows
  // server-returned redirect_url; the exchange-on-mount probe decides
  // whether to render login form vs auto-exchange. See ADR-2.
  const parentChallengeId = useMemo(
    () => readParentChallengeIdFromURL() ?? bootParentChallengeId,
    [],
  );
  useOIDCInterceptor(parentChallengeId);
  const { exchangeState, parentMeta } = useSessionExchangeOnMount(
    parentChallengeId,
    passflow,
    config.url,
    state.appId,
  );

  // Auto-discover appId from /settings endpoint if not provided
  const discoveryAttemptedRef = useRef(false);
  useEffect(() => {
    if (needsDiscovery && !discoveryAttemptedRef.current && state.isDiscoveringAppId) {
      discoveryAttemptedRef.current = true;

      const discoverAppId = async () => {
        // Try relative path first (works with dev server proxy and same-origin production)
        // Then fall back to absolute URL if configured
        const urlsToTry = ['/settings'];
        if (config.url) {
          urlsToTry.push(`${config.url}/settings`);
        }

        for (const url of urlsToTry) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              const settings = await response.json();
              const discoveredAppId = settings.login_app?.app_id || settings.appId;

              if (discoveredAppId) {
                passflow.setAppId(discoveredAppId);
                dispatch({
                  type: 'SET_PASSFLOW_STATE',
                  payload: {
                    ...state,
                    appId: discoveredAppId,
                    scopes: settings.login_app?.scopes || settings.scopes || state.scopes,
                    createTenantForNewUser:
                      settings.login_app?.create_tenant_for_new_user ??
                      settings.createTenantForNewUser ??
                      state.createTenantForNewUser,
                    isDiscoveringAppId: false,
                  },
                });
                return;
              }
            }
          } catch (error) {}
        }

        // All URLs failed
        console.warn('Failed to discover appId from /settings');
        dispatch({
          type: 'SET_PASSFLOW_STATE',
          payload: {
            ...state,
            isDiscoveringAppId: false,
          },
        });
      };

      void discoverAppId();
    }
  }, [needsDiscovery, state.isDiscoveringAppId, config.url, passflow, state]);

  const passflowValue = useMemo(() => ({ state, dispatch, passflow }), [state, passflow]);

  const handleSetNavigate = useCallback((newNavigate: NavigateFunction | null) => {
    setNavigate(() => newNavigate || defaultNavigate);
  }, []);

  const navigationValue = useMemo(
    () => ({
      navigate,
      setNavigate: handleSetNavigate,
      router,
    }),
    [navigate, handleSetNavigate, router],
  );

  const oidcExchangeValue = useMemo<OIDCExchangeContextValue>(
    () => ({ parentChallengeId, parentMeta, exchangeState }),
    [parentChallengeId, parentMeta, exchangeState],
  );

  // Render the placeholder while exchange is in flight. Once it
  // resolves (either via navigation or by falling through), children
  // mount as normal. The `upgrade_required` path still renders
  // children so the login form below the placeholder can be used.
  return (
    <PassflowContext.Provider value={passflowValue}>
      <NavigationContext.Provider value={navigationValue}>
        <OIDCExchangeContext.Provider value={oidcExchangeValue}>
          <AuthProvider>
            {exchangeState === 'exchanging' ? (
              <DefaultContinuingPlaceholder appName={parentMeta?.app_name} />
            ) : exchangeState === 'upgrade_required' ? (
              <>
                <DefaultUpgradeRequiredPlaceholder />
                {children}
              </>
            ) : (
              children
            )}
          </AuthProvider>
        </OIDCExchangeContext.Provider>
      </NavigationContext.Provider>
    </PassflowContext.Provider>
  );
};
