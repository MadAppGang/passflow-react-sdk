import { Aooth } from '@aooth/aooth-js-sdk';

export const getUrlWithTokens = async (aooth: Aooth, url: string): Promise<string> => {
  const tokens = await aooth.getTokens(false);

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
