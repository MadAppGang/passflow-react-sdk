import { useEffect, useState } from 'react';
import { usePassflow } from './use-passflow';
import { ParsedTokens, Token, isTokenExpired } from '@passflow/passflow-js-sdk';

type useAuthReturn = {
  isAuthenticated: boolean;
  idToken?: Token;
  accessToken?: Token;
  refreshToken?: Token;
  scopes?: string[];
  error?: string;
  isRefreshing?: boolean;
};

export const useAuth = (doRefresh: boolean): useAuthReturn => {
  const passflow = usePassflow();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // Do we need proactively refresh the token?
  // or do we need to do it when we do api call?
  const [tokens, setTokens] = useState<ParsedTokens | undefined>(passflow.getParsedTokenCache());
  // When an access token has expired and we need to refresh it,
  // we signal to the stat that the token is being refreshed and we cannot make any requests
  // without the refreshed token until it is successfully refreshed.
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      if (tokens) {
        const tokenExpired = isTokenExpired(tokens.access_token);
        if (tokenExpired && doRefresh) {
          try {
            setIsRefreshing(true);
            await passflow.refreshToken();
            setTokens(passflow.getParsedTokenCache());
            setIsAuthenticated(tokens?.access_token !== undefined);
          } catch (e) {
            const ee = e as Error;
            setError(ee.message);
            setTokens(undefined);
            setIsAuthenticated(false);
          } finally {
            setIsRefreshing(false);
          }
        } else {
          setIsAuthenticated(tokens?.access_token !== undefined);
        }
      }
    })();
  }, [passflow, doRefresh, tokens]);

  return {
    isAuthenticated,
    idToken: tokens?.id_token,
    accessToken: tokens?.access_token,
    refreshToken: tokens?.refresh_token,
    scopes: tokens?.scopes,
    error,
    isRefreshing,
  };
};
