import {
  type ParsedTokens,
  PassflowEvent,
  type PassflowSubscriber,
  type SessionExpiredReason,
  type Tokens,
} from '@passflow/core';
import { createContext, type FC, type PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { usePassflow } from '../hooks/use-passflow';

export type SessionExpiredHandler = (reason: SessionExpiredReason) => void;

export type AuthContextValue = {
  isAuthenticated: () => boolean;
  logout: () => void;
  isLoading: boolean;
  isSessionExpired: boolean;
  getTokens: (doRefresh: boolean) => Promise<{ tokens: Tokens | undefined; parsedTokens: ParsedTokens | undefined }>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export type AuthProviderProps = PropsWithChildren<{
  /**
   * Called when the session has really ended: last auth strike, no successor token pair
   * in time, or another user's tokens in storage. A transient refresh failure keeps the
   * session and does not call this. Use this to redirect to your login page.
   */
  onSessionExpired?: SessionExpiredHandler;
}>;

export const AuthProvider: FC<AuthProviderProps> = ({ children, onSessionExpired }) => {
  const passflow = usePassflow();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  // Subscribe to SessionExpired events
  useEffect(() => {
    const subscriber: PassflowSubscriber = {
      onAuthChange: (eventType, payload) => {
        if (eventType === PassflowEvent.SessionExpired) {
          const reason = (payload as { reason?: SessionExpiredReason })?.reason ?? 'refresh_failed';
          setIsSessionExpired(true);
          onSessionExpired?.(reason);
        } else if (eventType === PassflowEvent.SignIn || eventType === PassflowEvent.Register) {
          // Reset session expired state on successful auth
          setIsSessionExpired(false);
        }
      },
    };

    passflow.subscribe(subscriber, [PassflowEvent.SessionExpired, PassflowEvent.SignIn, PassflowEvent.Register]);

    return () => {
      passflow.unsubscribe(subscriber);
    };
  }, [passflow, onSessionExpired]);

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
    isSessionExpired,
    getTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
