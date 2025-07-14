import type { Passflow } from '@passflow/core';

export const getUrlWithTokens = async (passflow: Passflow, url: string): Promise<string> => {
  const tokens = await passflow.getTokens(false);

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
