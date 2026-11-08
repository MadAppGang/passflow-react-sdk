import {
  type ErrorPayload,
  FETCH_PRIORITY_OIDC,
  Passflow,
  type PassflowConfig,
  PassflowEvent,
  type PassflowEventPayload,
  type PassflowSubscriber,
  registerFetchMiddleware,
  requiredAcrLevel,
} from '@passflow/core';
import React, { type FC, type ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { UpgradeProvider, type UpgradeProviderProps } from '@/components/provider/upgrade-provider';
import { useDisposeOnReplace } from '@/components/provider/use-dispose-on-replace';
import { ContinuingStatus } from '@/components/ui/continuing-status';
import {
  AuthProvider,
  addressBarSearch,
  defaultNavigate,
  type FederatedLandingOutcome,
  type HandOff,
  initialState,
  type NavigateFunction,
  NavigationContext,
  PassflowContext,
  type PassflowState,
  passflowReducer,
  type RouterType,
  routes,
} from '@/context';
import { submitFormPost } from '@/utils/form-post';
import { signInSearch, twoFactorTokenAppId, urlCarriesAccessToken, urlCarriesTwoFactorToken } from '@/utils/second-factor';
import { readParentChallengeIdFromURL } from '@/utils/url-params';
import '@/styles/index.css';

export { readParentChallengeIdFromURL };

/**
 * The assurance-upgrade options a consumer may set on `PassflowProvider`.
 *
 * `children`, `enabled` and `backend` are owned by `PassflowProvider` itself:
 * `backend` is a top-level prop (§13.5 — "where your API is" is the headline
 * act, not a nested detail) and `enabled` is derived from `upgrade`/`backend`
 * below, so there is exactly one source for each.
 */
export type PassflowUpgradeOptions = Omit<UpgradeProviderProps, 'children' | 'enabled' | 'backend'>;

type PassflowProviderProps = PassflowConfig & {
  /** See `PassflowConfig`. Read once, when the provider mounts. */
  keyStoragePrefix?: PassflowConfig['keyStoragePrefix'];
  /** See `PassflowConfig`. Read once, when the provider mounts. */
  tokenExchange?: PassflowConfig['tokenExchange'];
  /** See `PassflowConfig`. Read once, when the provider mounts. */
  platform?: PassflowConfig['platform'];
  /** See `PassflowConfig`. Read once, when the provider mounts. */
  refreshCoordination?: PassflowConfig['refreshCoordination'];
  /** See `PassflowConfig`. Read once, when the provider mounts. */
  refreshStrikes?: PassflowConfig['refreshStrikes'];
  children: ReactNode;
  navigate?: NavigateFunction;
  router?: RouterType;
  /**
   * Where the customer's own API is — domain 2 of §13.5's two-domain
   * interception model. Nothing outside this and Passflow's own API is ever
   * observed, and there is no allow-all opt-in. `string | string[]`, an origin
   * or a same-origin path prefix (`'/api'`).
   */
  backend?: string | string[];
  /**
   * Automatic assurance upgrade (step-up). `undefined` ⇒ **off**, so no
   * existing consumer changes behaviour on upgrade. `true` ⇒ on with
   * defaults; an object ⇒ on with those options; `false` ⇒ off even when
   * `backend` is declared.
   *
   * Declaring `backend` also turns it on: naming where your API is has no
   * other meaning, and §13.5's acceptance configuration is `backend` plus one
   * attached client. The global `window.fetch` patch is a separate, explicit
   * act (`upgrade={{ interceptFetch: true }}`) and stays off by default.
   */
  upgrade?: boolean | PassflowUpgradeOptions;
  /**
   * Where to send a sign-in that lands on this page owing its second factor:
   * a federated redirect on a non-PKCE app comes back with `#tfa_token=` and
   * no tokens. A mounted `PassflowFlow` registers its own (prefixed) route,
   * which wins; set this when the landing page renders no flow, or the flow
   * is mounted elsewhere. Defaults to `routes.two_factor_verify.path`.
   */
  twoFactorVerifyPath?: string;
  /**
   * For the hosted login: the scopes and `state` the app that sent the user here asked for. They decide what goes
   * back to the app after sign-in; unset `scopes` are filled from the app's configuration, else `openid profile id`.
   * Read once, when the provider mounts. Leave unset when the flow is embedded in the app itself.
   */
  handOff?: HandOff;
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
 *   - /auth/register                   — password sign-up
 *   - /auth/passwordless/start|complete — OTP / magic-link; the status and
 *                                        approval calls take no parent
 *   - /auth/passkey/*                  — passkey registration/auth
 *   - /auth/2fa/*                      — second-factor verify
 *   - /auth/validate                   — emailed sign-up / sign-in code
 *   - /auth/federated/start            — federated start (callback is server)
 *   - /auth/session/exchange           — RFC 8693-style session exchange
 *                                        (ADR-2; activated on Leg 2 of
 *                                        OIDC two-step flows)
 */
export const AUTH_ENDPOINT_PATTERN =
  /\/auth\/(login|register|passwordless\/(start|complete)|passkey|2fa|validate|session\/exchange)\b|\/auth\/federated\/start\b/;

/**
 * The passwordless status poll. Under a parent, the approved answer is `{ redirect_url }`, which the interceptor
 * follows. It is follow-only: the poll takes no parent, so its request body is never rewritten.
 */
export const PASSWORDLESS_STATUS_PATTERN = /\/auth\/passwordless\/status\b/;

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
 * The RFC 8628 device verification page (`/oidc/device`) is the ONE auth surface
 * that must never silently exchange an existing session. A device grant is
 * approved only through the explicit authenticate → user_code confirmation →
 * approve path (see `useDeviceVerify` + src/web/oidc/device_verify.go). Letting
 * the exchange-on-mount probe solve a device parent would approve a grant with
 * no §5.4 code check — the STORM-2372 device-code phishing attack. The server
 * now refuses this at `/auth/session/exchange` too; this is the client half of
 * the same guard, so the probe never even fires here.
 */
const isDeviceVerificationURL = (): boolean => typeof window !== 'undefined' && window.location.pathname === '/oidc/device';

/**
 * Set once the OIDC interceptor has started following a server-issued
 * `redirect_url`. Module-level on purpose: it is read by the credential forms,
 * which are siblings of the provider rather than children of a context it could
 * publish through, and its lifetime is exactly one page — the navigation it
 * records is what ends that page.
 */
let oidcRedirectFollowed = false;

/**
 * Has the OIDC interceptor already taken ownership of the post-login navigation?
 *
 * A credential form MUST NOT navigate after a successful login when this is
 * true. Two navigations do not queue — the second cancels the first, and the
 * first is the one that completes the OIDC flow:
 *
 *   1. The interceptor calls `window.location.assign(redirect_url)` to hand the
 *      authorization code back to the RP (a CLI's `127.0.0.1:<port>/callback`,
 *      a web RP's `redirect_uri`, …).
 *   2. `window.location.assign` does not halt script execution, so the form's
 *      success handler keeps running and sets `window.location.href` to the
 *      app's default post-login page.
 *   3. The browser drops the in-flight request from (1) and goes to (2).
 *
 * Whether (1) has already been delivered when (2) lands is pure scheduling, so
 * this presents as a flake rather than a clean break. Measured against the CLI
 * loopback flow (RFC 8252 §7.3): roughly a third of real browser sign-ins had
 * the GET to the CLI's loopback port aborted mid-flight, and the CLI then sat
 * waiting for a callback that had already been cancelled until it timed out.
 */
export const hasFollowedOIDCRedirect = (): boolean => oidcRedirectFollowed;

/**
 * Install the global OIDC AuthFlow interceptor on `fetch` and
 * `XMLHttpRequest`. The interceptor:
 *
 *   1. Injects `parent_challenge_id` on every Passflow auth POST
 *      body (when one is present on the SDK's host URL).
 *   2. Watches Passflow auth responses for a JSON answer and executes
 *      it: `{ redirect_url: "..." }` is followed with
 *      `window.location.assign(redirect_url)`, and
 *      `{ form_post: { action, fields } }` is submitted as a hidden POST
 *      form (OIDC response_mode=form_post).
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
    const followsAnswer = (url: string): boolean => isAuthURL(url) || PASSWORDLESS_STATUS_PATTERN.test(url);

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
        const obj = JSON.parse(raw) as {
          redirect_url?: unknown;
          form_post?: { action?: unknown; fields?: unknown } | null;
        };
        // Claim the navigation BEFORE starting it. `assign` and `submit` do not
        // stop JavaScript: the credential form's own success handler runs right
        // after this and would otherwise navigate on top of us. See
        // `hasFollowedOIDCRedirect` for why that is fatal, not cosmetic.
        const formPost = obj.form_post;
        if (
          typeof formPost === 'object' &&
          formPost !== null &&
          typeof formPost.action === 'string' &&
          formPost.action &&
          typeof formPost.fields === 'object' &&
          formPost.fields !== null
        ) {
          // response_mode=form_post: the RP takes the code as a POST body.
          oidcRedirectFollowed = true;
          submitFormPost(formPost.action, formPost.fields as Record<string, string>);
          return;
        }
        if (typeof obj.redirect_url === 'string' && obj.redirect_url) {
          oidcRedirectFollowed = true;
          window.location.assign(obj.redirect_url);
        }
      } catch {
        // Non-JSON — ignore.
      }
    };

    // fetch() interceptor (covers code paths that use the platform fetch API).
    //
    // Installed through the core's fetch registry rather than by assigning
    // `window.fetch` here. Two features that each capture and restore the
    // global compose as `A(B(native))`, and whichever cleanup runs first
    // restores a fetch that predates the other patch — so one interceptor
    // disappears non-deterministically (architecture §13.5, "the OIDC
    // collision: 'untouched' is withdrawn"). The registry owns the single
    // patch, reference-counts it, and never restores over a foreign patch.
    //
    // Priority matters behaviourally: OIDC is the OUTER layer
    // (`FETCH_PRIORITY_OIDC` = 10, outside `FETCH_PRIORITY_UPGRADE` = 20) so it
    // still observes the response the caller actually receives — including a
    // replayed one — which is what it reads `redirect_url` from. The logic
    // below is unchanged from the hand-rolled patch: `next` stands exactly
    // where the captured `originalFetch` stood.
    const unregisterFetchMiddleware = registerFetchMiddleware(
      async (next, input, init) => {
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

        const response = await next(input, outInit);

        if (response.ok && followsAnswer(url)) {
          try {
            const cloned = response.clone();
            const text = await cloned.text();
            followRedirectURL(text);
          } catch {
            // ignore
          }
        }

        return response;
      },
      { priority: FETCH_PRIORITY_OIDC, name: 'passflow-oidc-authflow' },
    );

    // XMLHttpRequest interceptor — `@passflow/core` uses axios, which in
    // the browser uses XHR under the hood. The fetch interceptor above
    // does NOT catch those calls.
    const OriginalXHROpen = XMLHttpRequest.prototype.open;
    const OriginalXHRSend = XMLHttpRequest.prototype.send;

    // `isAuth` gates the parent injection; `follows` gates following `redirect_url` in the answer.
    type XHRTracker = { method?: string; url?: string; isAuth?: boolean; follows?: boolean };
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
        follows: followsAnswer(urlStr),
      });
      this.addEventListener('load', () => {
        const meta = tracker.get(this);
        if (!meta?.follows) return;
        if (this.status >= 200 && this.status < 300) {
          // Server returns 200 + JSON body { redirect_url } or
          // { form_post: { action, fields } } when an AuthFlow parent
          // (OIDC, federated) needs the SPA to navigate.
          followRedirectURL(typeof this.responseText === 'string' ? this.responseText : null);
        }
      });
      // @ts-expect-error spread into open's varargs signature
      OriginalXHROpen.call(this, method, url, ...rest);
    };

    XMLHttpRequest.prototype.send = function (this: XMLHttpRequest, body?: Document | XMLHttpRequestBodyInit | null): void {
      const meta = tracker.get(this);
      let outBody: Document | XMLHttpRequestBodyInit | null | undefined = body;
      if (meta?.isAuth && meta.method === 'POST' && typeof body === 'string') {
        const rewritten = injectParentChallenge(body);
        if (rewritten !== undefined) outBody = rewritten;
      }
      OriginalXHRSend.call(this, outBody as Document | XMLHttpRequestBodyInit | null);
    };

    return () => {
      // Fetch teardown is the registry's: it removes the one patch on the last
      // registration's removal and declines to restore over a stranger's patch.
      // Nothing here captures or restores `window.fetch`.
      unregisterFetchMiddleware();
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
  // The OIDC directives the parent carries. `prompt=login` and `max_age` are
  // enforced by the server at /auth/session/exchange, which answers 403 when
  // the hosted session does not satisfy them; `prompt=none` is the SDK's to
  // honour, because only the SDK can decide not to render a form.
  oidc_prompt_login?: boolean;
  oidc_prompt_none?: boolean;
  max_age?: number;
};

/**
 * Where the exchange-on-mount probe stands.
 *
 *   - `idle`: nothing attempted yet (no parent, or the app id is unknown).
 *   - `exchanging`: the exchange is in flight, or it answered and the browser is
 *     on its way back to the relying party.
 *   - `upgrade_required`: the hosted session needs a step-up before it can be
 *     exchanged, and the step-up dialog is open.
 *   - `fallback_to_login`: no usable hosted session; the sign-in form renders.
 */
type ExchangeState = 'idle' | 'exchanging' | 'upgrade_required' | 'fallback_to_login';

/** The 403 body of /auth/session/exchange: what the hosted session falls short of. */
type ExchangeRefusal = { acr_values?: unknown; max_age?: unknown };

/** An OIDC error sent back to the relying party instead of rendering a form. */
type RelyingPartyError = 'login_required' | 'interaction_required' | 'unmet_authentication_requirements';

const relyingPartyErrorDescriptions: Record<RelyingPartyError, string> = {
  login_required: 'user is not authenticated',
  interaction_required: 'user interaction is required',
  unmet_authentication_requirements: 'the authentication requirements could not be met',
};

/**
 * Sends an OIDC error to the parent's `redirect_uri`, in the parent's
 * `response_mode`: a hidden POST form for `form_post`, a query-string
 * navigation otherwise. Returns false when the metadata has no `redirect_uri`
 * (its fetch failed), leaving the caller to render the form.
 */
const answerRelyingParty = (meta: ParentChallengeMeta | undefined, error: RelyingPartyError): boolean => {
  if (!meta?.redirect_uri) return false;
  const fields: Record<string, string> = { error, error_description: relyingPartyErrorDescriptions[error] };
  if (meta.state) fields.state = meta.state;
  if (meta.response_mode === 'form_post') {
    submitFormPost(meta.redirect_uri, fields);
    return true;
  }
  const dest = new URL(meta.redirect_uri);
  for (const [key, value] of Object.entries(fields)) dest.searchParams.set(key, value);
  window.location.assign(dest.toString());
  return true;
};

/**
 * Does a 200 from the exchange carry an answer the OIDC interceptor executes
 * (`redirect_url` or `form_post`)? The interceptor is the sole owner of that
 * navigation: it reads the response before this hook does, and a second
 * navigation from here would re-present the single-use authorization code.
 */
const carriesAnswer = async (res: Response): Promise<boolean> => {
  try {
    const body = (await res.json()) as { redirect_url?: unknown; form_post?: unknown };
    return Boolean(body.redirect_url) || Boolean(body.form_post);
  } catch {
    return false;
  }
};

const readRefusal = async (res: Response): Promise<ExchangeRefusal> => {
  try {
    const body = (await res.json()) as ExchangeRefusal | null;
    return body ?? {};
  } catch {
    return {};
  }
};

/**
 * Exchange-on-mount: when a parent challenge is on the URL, ask
 * /auth/session/exchange whether the hosted session cookie can answer it
 * without a sign-in form. The request carries the cookie only
 * (`credentials: 'include'`), never stored tokens; the server is the sole judge
 * of the session, including `prompt=login` and `max_age`.
 *
 * The answers:
 *
 *   - 200 `{ redirect_url }` or `{ form_post }` → the OIDC interceptor executes
 *     it; the hook stays `exchanging` so no form flashes while the page leaves.
 *     A 200 with neither renders the form.
 *   - 401 / 400 → no usable hosted session: the form, or `login_required` to
 *     the relying party under `prompt=none`.
 *   - 403 → the session falls short. Under `prompt=none` that is
 *     `interaction_required` to the relying party. Otherwise a body naming
 *     `acr_values` or `max_age` opens the step-up dialog through
 *     `passflow.hostedUpgrade` (`upgrade_required`); a body naming neither
 *     renders the form.
 *     - Step-up succeeds → exactly one more exchange. A 200 answer completes;
 *       a 401 renders the form; anything else sends
 *       `unmet_authentication_requirements` to the relying party.
 *     - Step-up is cancelled or fails → when the refusal named `acr_values`
 *       the relying party gets `unmet_authentication_requirements`, since a
 *       fresh sign-in through the form would not meet it either; when it named
 *       only `max_age`, the form renders so the user can sign in again.
 *   - Any other status, or a network error → the form.
 *
 * An error for the relying party needs the parent's `redirect_uri`; without
 * it the form renders instead.
 */
const useSessionExchangeOnMount = (
  parentChallengeId: string | undefined,
  landedWithTwoFactorToken: boolean,
  passflow: Passflow,
  baseUrl: string | undefined,
  appId: string | undefined,
): { exchangeState: ExchangeState; parentMeta?: ParentChallengeMeta } => {
  const [exchangeState, setExchangeState] = useState<ExchangeState>('idle');
  const [parentMeta, setParentMeta] = useState<ParentChallengeMeta | undefined>(undefined);
  const attemptedRef = useRef(false);

  useEffect(() => {
    // A landing that owes its second factor finishes that sign-in: the 2FA screen, not an exchange of another session.
    if (!parentChallengeId || landedWithTwoFactorToken || attemptedRef.current) {
      return;
    }
    // Never auto-exchange on the device verification page — that would approve
    // a device grant with no user_code check (see isDeviceVerificationURL).
    if (isDeviceVerificationURL()) {
      return;
    }
    // Wait until appId has been discovered before attempting the
    // exchange — otherwise the request 400s on "Application ID is
    // missing from request".
    if (!appId) {
      return;
    }
    attemptedRef.current = true;

    const base = baseUrl ?? '';

    const exchange = (): Promise<Response> =>
      fetch(`${base}/auth/session/exchange`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          // App middleware reads X-Passflow-ClientID; without it the
          // request gets 400 "Application ID is missing from request".
          'X-Passflow-ClientID': appId,
        },
        body: JSON.stringify({ parent_challenge_id: parentChallengeId }),
      });

    const run = async () => {
      // The parent's metadata: where an error for the relying party goes
      // (`redirect_uri`, `state`, `response_mode`), whether it asked for
      // `prompt=none`, and the app name for the continuing status.
      let meta: ParentChallengeMeta | undefined;
      try {
        const res = await fetch(`${base}/oidc/requests/${encodeURIComponent(parentChallengeId)}`);
        if (res.ok) {
          meta = (await res.json()) as ParentChallengeMeta;
          setParentMeta(meta);
        }
      } catch {
        // Network error fetching the parent: no relying-party answer is
        // possible, but the exchange still decides between leaving and the form.
      }

      const showForm = () => setExchangeState('fallback_to_login');
      const answerOrShowForm = (error: RelyingPartyError) => {
        if (!answerRelyingParty(meta, error)) showForm();
      };

      setExchangeState('exchanging');
      try {
        const res = await exchange();
        if (res.ok) {
          if (!(await carriesAnswer(res))) showForm();
          return;
        }
        if (res.status === 401 || res.status === 400) {
          if (meta?.oidc_prompt_none) answerOrShowForm('login_required');
          else showForm();
          return;
        }
        if (res.status !== 403) {
          showForm();
          return;
        }
        if (meta?.oidc_prompt_none) {
          answerOrShowForm('interaction_required');
          return;
        }

        const refusal = await readRefusal(res);
        const acrValues = typeof refusal.acr_values === 'string' && refusal.acr_values ? refusal.acr_values : undefined;
        const maxAge = typeof refusal.max_age === 'number' ? refusal.max_age : undefined;
        if (acrValues === undefined && maxAge === undefined) {
          showForm();
          return;
        }

        setExchangeState('upgrade_required');
        try {
          await passflow.hostedUpgrade.elevate(
            { acrValues, maxAge, requiredLevel: requiredAcrLevel(acrValues), status: 403, channels: [] },
            { kind: 'imperative' },
          );
        } catch {
          if (acrValues !== undefined) answerOrShowForm('unmet_authentication_requirements');
          else showForm();
          return;
        }

        setExchangeState('exchanging');
        const retry = await exchange();
        if (retry.ok) {
          if (!(await carriesAnswer(retry))) showForm();
          return;
        }
        if (retry.status === 401) {
          showForm();
          return;
        }
        answerOrShowForm('unmet_authentication_requirements');
      } catch {
        showForm();
      }
    };

    void run();
  }, [parentChallengeId, passflow, baseUrl, appId]);

  return { exchangeState, parentMeta };
};

/**
 * Context surface exposed to children so the SDK's own components
 * (or consumer code) can read the OIDC parent-challenge state.
 */
export type OIDCExchangeContextValue = {
  parentChallengeId?: string;
  parentMeta?: ParentChallengeMeta;
  exchangeState: ExchangeState;
};

/**
 * Sends a landing that owes its second factor to the 2FA screen.
 *
 * A federated sign-in on a non-PKCE app comes back to its redirect URL with
 * the 2FA token in the fragment and no tokens. Core adopts it as it is
 * constructed (`parseQueryParams`, on by default) and strips the fragment;
 * with that off, the token is adopted here through `handleTokensRedirect()`.
 *
 * The navigation runs one render after mount, not in the mount effect: the
 * flow's router and its 2FA route register themselves in their own mount
 * effects, which run before this one, and their state lands in the next
 * render. Navigating at mount would go through the default full-page
 * navigation to the unprefixed route. App-id discovery would hold the flow back
 * the same way, so a `#tfa_token=` landing on the hosted login never runs it: the
 * app comes from the token. That app goes onto the URL here, where the hosted login
 * reads it after a reload.
 *
 * A PKCE federated landing (`?code=&user_state=`) is taken here too, from an
 * effect: the instance is built during render, and StrictMode throws one away
 * without running its effects, so core must not take the landing in its
 * constructor. So is the landing of a hosted sign-in in SDK mode (`?code=&state=`,
 * started by `authRedirect()` in this tab), which core takes after the federated
 * one. Taking either can end in that same 2FA navigation; returned is how it
 * ended otherwise, and a refused landing is `'failed'`.
 *
 * Under an OIDC parent the 2FA landing goes on even with a stored session: the
 * parent's sign-in is the one owing the factor.
 *
 * Tokens in the URL (`access_token=`) are taken from an effect for the same
 * reason, and only once the app id is known: core verifies them against it in
 * the background, and an instance with no app id would reject and strip them.
 * The outcome arrives as `SignIn` with source `tokens-in-url`, or as `Error`
 * with operation `tokens.from-url`, after which the sign-in form shows.
 */
const useSecondFactorLanding = (
  landedWithTwoFactorToken: boolean,
  passflow: Passflow,
  navigate: NavigateFunction,
  twoFactorVerifyPath: string,
  appIdFromToken: string | undefined,
  takeTokensFromUrl: boolean,
  isDiscoveringAppId: boolean,
  parentChallengeId: string | undefined,
): FederatedLandingOutcome | undefined => {
  const [pending, setPending] = useState(false);
  const [federatedLandingOutcome, setFederatedLandingOutcome] = useState<FederatedLandingOutcome>();

  const takenRef = useRef(false);
  const currentPassflowRef = useRef(passflow);
  currentPassflowRef.current = passflow;

  // Deps `[passflow]`: under app-id discovery the first instance has no app id
  // and leaves the landing to the next one. The ref makes StrictMode's replay a
  // no-op. No cleanup on purpose: settings can replace the instance while its
  // exchange runs, and the events still fire on the store of the one that took
  // the landing. The listener removes itself on its first outcome.
  useEffect(() => {
    if (takenRef.current) return;

    const subscriber: PassflowSubscriber = {
      onAuthChange: (eventType, payload) => {
        if (eventType === PassflowEvent.TwoFactorRequired) {
          passflow.unsubscribe(subscriber);
          setPending(true);
        } else if (eventType === PassflowEvent.Error) {
          const operation = (payload as ErrorPayload | undefined)?.operation;
          if (operation !== 'federated.redirect' && operation !== 'oidc.redirect') return;
          passflow.unsubscribe(subscriber);
          setFederatedLandingOutcome('failed');
        } else if (eventType === PassflowEvent.SignIn) {
          const signIn = payload as PassflowEventPayload[PassflowEvent.SignIn] | undefined;
          if (signIn?.source !== 'federated-landing' && signIn?.source !== 'oidc-landing') return;
          passflow.unsubscribe(subscriber);
          // A replaced instance's session start is a no-op, and the current one
          // read storage before these tokens existed.
          const current = currentPassflowRef.current;
          if (current !== passflow && signIn.tokens) current.setTokens(signIn.tokens);
          setFederatedLandingOutcome('signed-in');
        }
      },
    };

    passflow.subscribe(subscriber, [PassflowEvent.TwoFactorRequired, PassflowEvent.SignIn, PassflowEvent.Error]);
    if (passflow.completeFederatedLanding()) takenRef.current = true;
    else passflow.unsubscribe(subscriber);
  }, [passflow]);

  // Same shape as the federated landing above: once, on the instance that has
  // the app id (or the last one, if discovery failed), with no cleanup.
  const tokensTakenRef = useRef(false);
  useEffect(() => {
    if (!takeTokensFromUrl || isDiscoveringAppId || tokensTakenRef.current) return;
    tokensTakenRef.current = true;

    const subscriber: PassflowSubscriber = {
      onAuthChange: (eventType, payload) => {
        if (eventType === PassflowEvent.Error) {
          if ((payload as ErrorPayload | undefined)?.operation !== 'tokens.from-url') return;
          passflow.unsubscribe(subscriber);
        } else if (eventType === PassflowEvent.SignIn) {
          const signIn = payload as PassflowEventPayload[PassflowEvent.SignIn] | undefined;
          if (signIn?.source !== 'tokens-in-url') return;
          passflow.unsubscribe(subscriber);
          const current = currentPassflowRef.current;
          if (current !== passflow && signIn.tokens) current.setTokens(signIn.tokens);
          setFederatedLandingOutcome('tokens-in-url');
        }
      },
    };

    passflow.subscribe(subscriber, [PassflowEvent.SignIn, PassflowEvent.Error]);
    passflow.handleTokensRedirect();
  }, [passflow, takeTokensFromUrl, isDiscoveringAppId]);

  // Once, on mount — the landing is a property of the page load.
  useEffect(() => {
    if (!landedWithTwoFactorToken) return;
    // A signed-in user owes no factor: a `#tfa_token=` link is not theirs to answer. Under an OIDC parent it is the
    // parent's sign-in that owes it.
    if (passflow.isAuthenticated() && !parentChallengeId) return;
    if (!passflow.isTwoFactorVerificationRequired()) passflow.handleTokensRedirect();
    if (passflow.isTwoFactorVerificationRequired()) setPending(true);
  }, []);

  useEffect(() => {
    if (!pending) return;
    setPending(false);
    const search = new URLSearchParams(signInSearch(addressBarSearch.read()));
    if (appIdFromToken) search.set('appid', appIdFromToken);
    navigate({ to: twoFactorVerifyPath, search: search.toString() || undefined, replace: true });
  }, [pending, navigate, twoFactorVerifyPath, appIdFromToken]);

  return federatedLandingOutcome;
};

export const OIDCExchangeContext = React.createContext<OIDCExchangeContextValue>({
  exchangeState: 'idle',
});

export const PassflowProvider: FC<PassflowProviderProps> = ({
  children,
  navigate: initialNavigate,
  router = 'default',
  backend,
  upgrade,
  twoFactorVerifyPath,
  // `backend` and `upgrade` are destructured out on purpose: they are
  // interception policy, not client-wide configuration, and §13.5 keeps them
  // off `PassflowConfig` — which is what `config` is spread into below.
  ...config
}) => {
  // Read before core is constructed: core adopts `#tfa_token=` and strips it.
  const [appIdFromToken] = useState(() => (config.appId ? undefined : twoFactorTokenAppId(config.url)));

  // If appId is not provided, set isDiscoveringAppId to true to signal
  // that auto-discovery should happen (prevents showing error before discovery)
  const needsDiscovery = !config.appId && !appIdFromToken;

  const [state, dispatch] = useReducer(passflowReducer, {
    ...initialState,
    ...config,
    appId: config.appId || appIdFromToken,
    isDiscoveringAppId: needsDiscovery,
  });

  const [navigate, setNavigate] = useState<NavigateFunction>(() => {
    if (initialNavigate) {
      return initialNavigate;
    }
    return defaultNavigate;
  });

  // Read before core is constructed: core adopts `#tfa_token=` and strips it.
  const [landedWithTwoFactorToken] = useState(urlCarriesTwoFactorToken);
  const [landedWithAccessToken] = useState(urlCarriesAccessToken);
  const takeTokensFromUrl = landedWithAccessToken && config.parseQueryParams !== false;

  // Read once, at mount, like every other prop that seeds the reducer.
  const [fixedConfig] = useState<PassflowConfig>(() => ({
    keyStoragePrefix: config.keyStoragePrefix,
    tokenExchange: config.tokenExchange,
    platform: config.platform,
    refreshCoordination: config.refreshCoordination,
    refreshStrikes: config.refreshStrikes,
  }));

  // Rebuilt only when a field core reads changes. Settings arriving, discovery ending or an equal scopes array keep
  // the instance, and with it core's cached settings read.
  const scopesKey = state.scopes?.join(' ');
  const passflow = useMemo(
    () =>
      new Passflow({
        ...fixedConfig,
        url: state.url,
        appId: state.appId,
        scopes: state.scopes,
        createTenantForNewUser: state.createTenantForNewUser,
        parseQueryParams: landedWithAccessToken ? false : state.parseQueryParams,
        deferFederatedLanding: true,
      }),
    [
      fixedConfig,
      state.url,
      state.appId,
      scopesKey,
      state.createTenantForNewUser,
      state.parseQueryParams,
      landedWithAccessToken,
    ],
  );
  useDisposeOnReplace(passflow);

  // OIDC AuthFlow integration: the interceptor injects
  // parent_challenge_id on outbound auth POSTs + follows
  // server-returned redirect_url; the exchange-on-mount probe decides
  // whether to render login form vs auto-exchange. See ADR-2.
  const parentChallengeId = useMemo(() => readParentChallengeIdFromURL() ?? bootParentChallengeId, []);
  useOIDCInterceptor(parentChallengeId);
  const { exchangeState, parentMeta } = useSessionExchangeOnMount(
    parentChallengeId,
    landedWithTwoFactorToken,
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
                // Only what discovery found: a field it did not find keeps whatever is in the state now.
                const discovered: Partial<PassflowState> = { appId: discoveredAppId, isDiscoveringAppId: false };
                const scopes = settings.login_app?.scopes || settings.scopes;
                // Under a hand-off the sign-in scopes follow the hand-off scopes rule, applied by the reducer.
                if (state.handOff) dispatch({ type: 'SET_FOUND_SCOPES', found: scopes });
                else if (scopes) discovered.scopes = scopes;
                const createTenant = settings.login_app?.create_tenant_for_new_user ?? settings.createTenantForNewUser;
                if (createTenant !== undefined) discovered.createTenantForNewUser = createTenant;
                dispatch({ type: 'SET_PASSFLOW_STATE', payload: discovered });
                return;
              }
            }
          } catch (error) {}
        }

        // All URLs failed
        console.warn('Failed to discover appId from /settings');
        dispatch({ type: 'SET_PASSFLOW_STATE', payload: { isDiscoveringAppId: false } });
      };

      void discoverAppId();
    }
  }, [needsDiscovery, state.isDiscoveringAppId, config.url, passflow]);

  const passflowValue = useMemo(() => ({ state, dispatch, passflow }), [state, passflow]);

  const handleSetNavigate = useCallback((newNavigate: NavigateFunction | null) => {
    setNavigate(() => newNavigate || defaultNavigate);
  }, []);

  const [flowTwoFactorVerifyPath, setFlowTwoFactorVerifyPath] = useState<string | null>(null);
  const resolvedTwoFactorVerifyPath = flowTwoFactorVerifyPath ?? twoFactorVerifyPath ?? routes.two_factor_verify.path;
  const [flowSignInPath, setFlowSignInPath] = useState<string | null>(null);
  const federatedLandingOutcome = useSecondFactorLanding(
    landedWithTwoFactorToken,
    passflow,
    navigate,
    resolvedTwoFactorVerifyPath,
    appIdFromToken,
    takeTokensFromUrl,
    state.isDiscoveringAppId === true,
    parentChallengeId,
  );

  const navigationValue = useMemo(
    () => ({
      navigate,
      setNavigate: handleSetNavigate,
      router,
      twoFactorVerifyPath: resolvedTwoFactorVerifyPath,
      setTwoFactorVerifyPath: setFlowTwoFactorVerifyPath,
      signInPath: flowSignInPath ?? routes.signin.path,
      setSignInPath: setFlowSignInPath,
      federatedLandingOutcome,
    }),
    [navigate, handleSetNavigate, router, resolvedTwoFactorVerifyPath, flowSignInPath, federatedLandingOutcome],
  );

  const oidcExchangeValue = useMemo<OIDCExchangeContextValue>(
    () => ({ parentChallengeId, parentMeta, exchangeState }),
    [parentChallengeId, parentMeta, exchangeState],
  );

  // `undefined` ⇒ off, so no existing consumer changes behaviour. `false`
  // forces it off even when a `backend` is declared; declaring a `backend` is
  // itself an opt-in, since naming where your API is has no other meaning.
  //
  // Under a parent challenge (the hosted login) it is on, through
  // `passflow.hostedUpgrade`: the exchange-on-mount probe steps the hosted
  // session up through that facade. The facade is chosen once, from mount, and
  // the global fetch is never patched there — the exchange reads its own 403.
  const hosted = parentChallengeId !== undefined;
  const upgradeEnabled = upgrade === false ? false : upgrade !== undefined || backend !== undefined || hosted;
  const upgradeOptions = useMemo<PassflowUpgradeOptions>(
    () => (typeof upgrade === 'object' && upgrade !== null ? upgrade : {}),
    [upgrade],
  );

  // Render the continuing status while the exchange is in flight or the
  // step-up dialog is open over it. Once it resolves (either via navigation
  // or by falling through), children mount as normal.
  const showContinuing = exchangeState === 'exchanging' || exchangeState === 'upgrade_required';
  return (
    <PassflowContext.Provider value={passflowValue}>
      <NavigationContext.Provider value={navigationValue}>
        <OIDCExchangeContext.Provider value={oidcExchangeValue}>
          <AuthProvider>
            {/* Mounted outside the exchange branch so a state change does not
                tear down and reinstall the upgrade interceptors. */}
            <UpgradeProvider
              {...upgradeOptions}
              facade={hosted ? passflow.hostedUpgrade : undefined}
              interceptFetch={hosted ? false : upgradeOptions.interceptFetch}
              enabled={upgradeEnabled}
              backend={backend}
            >
              {showContinuing ? <ContinuingStatus appName={parentMeta?.app_name} /> : children}
            </UpgradeProvider>
          </AuthProvider>
        </OIDCExchangeContext.Provider>
      </NavigationContext.Provider>
    </PassflowContext.Provider>
  );
};
