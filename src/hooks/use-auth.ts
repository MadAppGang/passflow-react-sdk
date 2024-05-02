import { useEffect, useState } from 'react';
import { useAooth } from './use-aooth';
import { ParsedTokens, Token, isTokenExpired } from '@aooth/aooth-js-sdk';
import { isEqual } from 'lodash';

type useAuthReturn = {
  isAuthenticated: boolean;
  idToken?: Token;
  accessToken?: Token;
  refreshToken?: Token;
  scopes?: string[];
  error?: string;
};

export const useAuth = (doRefresh: boolean): useAuthReturn => {
  const aooth = useAooth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Do we need proactively refresh the token?
  // or do we need to do it when we do api call?
  const [needToRefreshToken, setNeedToRefreshToken] = useState(false);
  const [doRefreshState] = useState(doRefresh);
  const [tokens, setTokens] = useState<ParsedTokens | undefined>(aooth.getParsedTokenCache());
  const [error, setError] = useState<string | undefined>(undefined);

  const tokensCache = aooth.getParsedTokenCache();
  if (!isEqual(tokensCache, tokens)) {
    setTokens(tokensCache);
    setNeedToRefreshToken(doRefreshState);
    setIsAuthenticated(tokensCache?.access_token !== undefined);
  } else if (tokens?.access_token) {
    const tokenExpired = isTokenExpired(tokens.access_token);
    setNeedToRefreshToken(tokenExpired && doRefreshState);
  } else {
    setNeedToRefreshToken(false);
    setIsAuthenticated(false);
    setTokens(undefined);
  }

  useEffect(() => {
    if (needToRefreshToken) {
      const refreshToken = async () => {
        try {
          await aooth.refreshToken();
          setTokens(aooth.getParsedTokenCache());
          const newTokens = aooth.getParsedTokenCache();
          setIsAuthenticated(newTokens?.access_token !== undefined);
          setNeedToRefreshToken(false);
          setError(undefined);
        } catch (e: unknown) {
          const ee = e as Error;
          setTokens(undefined);
          setError(ee.message);
        }
      };
      if (needToRefreshToken) {
        // eslint-disable-next-line no-console
        refreshToken().catch(console.error);
      }
    }
  }, [aooth, needToRefreshToken]);

  return {
    isAuthenticated,
    idToken: tokens?.id_token,
    accessToken: tokens?.access_token,
    refreshToken: tokens?.refresh_token,
    scopes: tokens?.scopes,
    error,
  };
};
