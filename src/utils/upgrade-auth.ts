/**
 * The free-function adapters — `withAuth` and `attachAuth` (§13.5).
 *
 * The core exposes both as methods on a configured `Passflow` instance, because
 * that is where the resolved interception scope is bound. The developer-facing
 * form is a bare import, so these two functions translate one into the other
 * and do nothing else:
 *
 * ```tsx
 * import { attachAuth } from '@passflow/react';
 *
 * const api = axios.create({ baseURL: 'https://api.example.com' });
 * useEffect(() => attachAuth(api), []);
 * ```
 *
 * **NO LOGIC IN AN ADAPTER.** Neither function parses a challenge, compares a
 * bar, decides scope, counts a retry or chooses an error class. Every one of
 * those decisions lives in the core's `handleChallenge`, which is what makes
 * all four surfaces behave identically.
 *
 * The instance is published by `UpgradeProvider`, which reads it from
 * `PassflowContext` — so the binding is the provider's instance, resolved at
 * call time rather than captured at import time.
 *
 * **The publication is synchronous, during the provider's render, and that is
 * load-bearing.** React runs a child's effects before its parent's in the same
 * commit, so publishing from the provider's `useEffect` would be too late for
 * the documented `useEffect(() => attachAuth(api), [])` above: the child's
 * effect would reach `requireInstance` with nothing registered and throw, and a
 * throw inside an effect tears the tree down. Attach order must not matter, so
 * the registry is written in render.
 *
 * **And the release is deferred by a microtask, which is what makes the pair
 * survive React Strict Mode.** Strict Mode mounts, unmounts and remounts
 * effects in development, and the child-before-parent effect order holds on the
 * remount pass too — while render, which is what published the instance, does
 * not run again. So an immediate release in the provider's effect cleanup
 * leaves the registry empty exactly when the remounting child's effect reads
 * it, and `attachAuth` throws again (verified: it does). Scheduling the release
 * instead means a re-registration in the same tick cancels it, which is
 * precisely a Strict Mode remount; a real unmount has no re-registration, so
 * the release lands one microtask later. Nothing observes that gap but a caller
 * reaching for an instance that has just been torn down.
 */

import type { FetchLike, Passflow, ResponseInterceptorHost } from '@passflow/core';

let activeInstance: Passflow | null = null;

/**
 * The instance a scheduled release is waiting to clear, or `null` when no
 * release is pending. Any registration clears it, which is how a Strict Mode
 * remount cancels the release its own cleanup just scheduled.
 */
let pendingRelease: Passflow | null = null;

/**
 * Publishes the provider's `Passflow` instance to the free functions, and
 * returns an unregister suitable as a React effect cleanup.
 *
 * Last registration wins, and the returned unregister is *deferred*: it clears
 * the instance on a microtask, and only if nothing has registered in the
 * meantime. See the module comment — that deferral is what keeps a Strict Mode
 * mount → unmount → remount from leaving the free functions unbound, and it is
 * why register and release are symmetric rather than one in render and one in a
 * cleanup that nothing undoes.
 */
export const registerUpgradeAuthInstance = (instance: Passflow): (() => void) => {
  activeInstance = instance;
  pendingRelease = null;
  return () => {
    pendingRelease = instance;
    queueMicrotask(() => {
      // A register (or a later release) superseded this one: leave it alone.
      if (pendingRelease !== instance) return;
      pendingRelease = null;
      releaseUpgradeAuthInstance(instance);
    });
  };
};

/**
 * Clears `instance` if it is still the registered one, and does nothing
 * otherwise. Idempotent, so an effect cleanup that runs after a newer provider
 * has already published cannot unbind the live instance.
 */
export const releaseUpgradeAuthInstance = (instance: Passflow): void => {
  if (activeInstance === instance) activeInstance = null;
};

/** The instance the free functions bind to, or `null` outside a provider. */
export const upgradeAuthInstance = (): Passflow | null => activeInstance;

const requireInstance = (name: string): Passflow => {
  if (activeInstance === null) {
    throw new Error(
      `[passflow] ${name}() needs a mounted <PassflowProvider>: the interception scope is bound to a configured Passflow instance. Call it from inside your app (an effect or a component), or use passflow.${name}() from usePassflow().`,
    );
  }
  return activeInstance;
};

/**
 * Wraps a `fetch` and returns the wrapper. Installs nothing and touches no
 * global — two verbs exist because the semantics genuinely differ: an axios
 * interceptor mutates, a fetch wrapper returns.
 */
export const withAuth = (next?: FetchLike): FetchLike => requireInstance('withAuth').withAuth(next);

/**
 * Attaches step-up handling to an axios instance the caller already owns,
 * **mutating** it, and returns the `detach()` disposer — which is exactly what
 * a React effect needs.
 *
 * The parameter is typed structurally (duck-typed on
 * `interceptors.response.use`), so this package's axios version is not a
 * constraint on the caller's.
 */
export const attachAuth = (instance: ResponseInterceptorHost): (() => void) =>
  requireInstance('attachAuth').attachAuth(instance);
