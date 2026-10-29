import type { NavigateFunction } from '@/context';
import type { Passflow } from '@passflow/core';

/**
 * Sends a sign-in that still owes its second factor to the 2FA screen.
 *
 * Every sign-in path can end this way: the server answers with a 2FA token in
 * place of tokens, `@passflow/core` keeps it and saves no session, and
 * `isTwoFactorVerificationRequired()` reads true. The caller must then stop:
 * no success redirect, and no `getUrlWithTokens` — there are no tokens yet.
 *
 * @returns true when it navigated, so the caller returns without redirecting
 */
export const routeToSecondFactor = (
  passflow: Pick<Passflow, 'isTwoFactorVerificationRequired'>,
  navigate: NavigateFunction,
  twoFactorVerifyPath: string,
): boolean => {
  if (!passflow.isTwoFactorVerificationRequired()) return false;
  navigate({ to: twoFactorVerifyPath });
  return true;
};

/**
 * Whether the current URL is a landing that owes its second factor: a
 * federated sign-in on a non-PKCE app comes back with `#tfa_token=` in the
 * fragment and no tokens. Read it before `@passflow/core` is constructed,
 * because core adopts the token and strips the fragment as it starts.
 */
export const urlCarriesTwoFactorToken = (): boolean => {
  if (typeof window === 'undefined' || !window.location.hash) return false;
  return new URLSearchParams(window.location.hash.substring(1)).has('tfa_token');
};
