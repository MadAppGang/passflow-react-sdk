import type { Passflow } from '@passflow/core';

export type TokenUrlFormat = 'query' | 'hash';

export const getUrlWithTokens = async (passflow: Passflow, url: string, format: TokenUrlFormat = 'hash'): Promise<string> => {
  const tokens = await passflow.getTokens(false);

  if (tokens) {
    tokens.scopes = undefined;
    const tokenParams = Object.entries(tokens)
      // eslint-disable-next-line no-unused-vars
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
      .join('&');

    if (format === 'hash') {
      // Use hash fragment (more secure - not sent to server)
      return `${url}#${tokenParams}`;
    }
    // Use query parameters
    return `${url}?${tokenParams}`;
  }
  return url;
};
