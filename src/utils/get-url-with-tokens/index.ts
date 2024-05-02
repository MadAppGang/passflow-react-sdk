import { TokenType } from '@aooth/aooth-sdk-js';

type TokenTypeKeys = keyof typeof TokenType;

export const getUrlWithTokens = (url: string): string => {
  const tokens: Record<Exclude<TokenTypeKeys, 'invite_token'>, string | null> = {
    access_token: localStorage.getItem(TokenType.access_token),
    id_token: localStorage.getItem(TokenType.id_token),
    refresh_token: localStorage.getItem(TokenType.refresh_token),
  };

  const tokenParams = Object.entries(tokens)
    .filter(([_, value]) => value)
    .map(([key, value]) => `${key}=${encodeURIComponent(value as string)}`)
    .join('&');

  return `${url}?${tokenParams}`;
};
