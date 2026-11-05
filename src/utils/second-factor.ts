import { type Passflow, parseToken } from '@passflow/core';
import type { NavigateFunction } from '@/context';
import { undefinedOnCatch } from './undefined-on-catch';

/**
 * The search for a new sign-in or its 2FA step: the original one, without anything that belonged to this attempt. A
 * reset token must not reach the verify URL, and the attempt's own destination is not carried across 2FA.
 */
export const signInSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  for (const key of ['challenge_id', 'expires_at', 'match_code', 'otp', 'flow', 'token', 'redirect_url']) params.delete(key);
  return params.toString();
};

/**
 * Sends a sign-in that still owes its second factor to the 2FA screen.
 *
 * Every sign-in path can end this way: the server answers with a 2FA token in
 * place of tokens, `@passflow/core` keeps it and saves no session, and
 * `isTwoFactorVerificationRequired()` reads true. The caller must then stop:
 * no success redirect, and no `getUrlWithTokens` — there are no tokens yet.
 *
 * @param search the current search; what `signInSearch` keeps goes onto the 2FA URL
 * @returns true when it navigated, so the caller returns without redirecting
 */
export const routeToSecondFactor = (
  passflow: Pick<Passflow, 'isTwoFactorVerificationRequired'>,
  navigate: NavigateFunction,
  twoFactorVerifyPath: string,
  search = '',
): boolean => {
  if (!passflow.isTwoFactorVerificationRequired()) return false;
  navigate({ to: twoFactorVerifyPath, search: signInSearch(search) || undefined });
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

/**
 * The app a `#tfa_token=` landing belongs to: the one the token names in `aud`. A federated return carries no `appid`,
 * and the server takes the token only under that app, so discovery (which answers with the default login app) would be
 * wrong. Read for routing only: the server checks the signature and refuses any other pairing.
 */
export const twoFactorTokenAppId = (): string | undefined => {
  if (!urlCarriesTwoFactorToken()) return undefined;
  const token = new URLSearchParams(window.location.hash.substring(1)).get('tfa_token') ?? '';
  const audience: string | string[] | undefined = undefinedOnCatch(parseToken)(token)?.aud;
  return Array.isArray(audience) ? audience[0] : audience;
};
