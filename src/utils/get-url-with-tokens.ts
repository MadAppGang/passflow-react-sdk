import type { Passflow } from '@passflow/core';
import type { HandOff } from '@/context/passflow-context';
import { handOffScopes } from './hand-off';

export type TokenUrlFormat = 'query' | 'hash';

const grantsRefreshToken = (scopes: string[]): boolean => scopes.includes('offline') || scopes.includes('offline_access');

/**
 * `url` with the stored tokens appended. Without `handOff` every token goes. With it, the refresh token goes only
 * when the app asked for `offline` or `offline_access`, and the app's `state` is appended.
 */
export const getUrlWithTokens = async (
  passflow: Passflow,
  url: string,
  format: TokenUrlFormat = 'hash',
  handOff?: HandOff,
): Promise<string> => {
  const tokens = await passflow.getTokens(false);

  if (tokens) {
    const sent: Record<string, unknown> = { ...tokens, scopes: undefined };
    const requested = handOffScopes(handOff);
    if (requested && !grantsRefreshToken(requested)) sent.refresh_token = undefined;

    const params = Object.entries(sent)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`);
    if (handOff?.state) params.push(`state=${encodeURIComponent(handOff.state)}`);
    const tokenParams = params.join('&');

    if (format === 'hash') {
      // Use hash fragment (more secure - not sent to server)
      return `${url}#${tokenParams}`;
    }
    // Use query parameters
    return `${url}?${tokenParams}`;
  }
  return url;
};
