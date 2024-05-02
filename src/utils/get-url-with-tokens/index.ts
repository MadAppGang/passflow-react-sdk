import { Aooth, Tokens } from '@aooth/aooth-js-sdk';

export const getUrlWithTokens = (aooth: Aooth, url: string): string => {
  const tokens: Tokens | undefined = aooth.getTokensCache();
  if (tokens) {
    tokens.scopes = undefined;
    const tokenParams = Object.entries(tokens)
      // eslint-disable-next-line no-unused-vars
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
      .join('&');

    return `${url}?${tokenParams}`;
  }
  return url;
};
