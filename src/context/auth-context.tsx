import type { ParsedTokens, Tokens } from '@passflow/passflow-js-sdk';
import React, { type FC, type PropsWithChildren, createContext, useCallback, useState } from 'react';
import { usePassflow } from '../hooks/use-passflow';

export type AuthContextValue = {
  isAuthenticated: () => boolean;
  logout: () => void;
  isLoading: boolean;
  getTokens: (doRefresh: boolean) => Promise<{ tokens: Tokens | undefined; parsedTokens: ParsedTokens | undefined }>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const passflow = usePassflow();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAuthenticated = useCallback(() => passflow.isAuthenticated(), [passflow]);

  const getTokens = useCallback(
    async (doRefresh: boolean) => {
      setIsLoading(true);

      try {
        const tokens = await passflow.getTokens(doRefresh);
        const parsedTokens = tokens ? passflow.getParsedTokens() : undefined;

        return {
          tokens,
          parsedTokens,
        };
      } catch (e) {
        return {
          tokens: undefined,
          parsedTokens: undefined,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [passflow],
  );

  const logout = useCallback(async () => {
    await passflow.logOut();
  }, [passflow]);

  const value = {
    isAuthenticated,
    logout,
    isLoading,
    getTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
