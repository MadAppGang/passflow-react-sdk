import { PassflowEvent, type PassflowSubscriber } from '@passflow/core';
import { useEffect, useState } from 'react';
import { usePassflow } from './use-passflow';

export type SessionExpiredReason = 'refresh_failed' | 'token_invalid' | 'logged_out';

export interface UseSessionExpiredOptions {
  /**
   * Called when the session expires.
   * Use this to redirect to your login page.
   */
  onSessionExpired?: (reason: SessionExpiredReason) => void;
}

export interface UseSessionExpiredResult {
  /**
   * True if the session has expired and user needs to re-authenticate.
   */
  isSessionExpired: boolean;
  /**
   * The reason why the session expired, if applicable.
   */
  expiredReason: SessionExpiredReason | null;
  /**
   * Reset the session expired state (e.g., after redirecting to login).
   */
  resetSessionExpired: () => void;
}

/**
 * Hook to handle session expiration events.
 *
 * When the SDK detects that the session is invalid (e.g., refresh token expired),
 * it emits a SessionExpired event. This hook allows you to react to that event
 * and redirect users to your login page.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isSessionExpired } = useSessionExpired({
 *     onSessionExpired: (reason) => {
 *       console.log('Session expired:', reason);
 *       window.location.href = '/login';
 *     },
 *   });
 *
 *   if (isSessionExpired) {
 *     return <div>Redirecting to login...</div>;
 *   }
 *
 *   return <YourApp />;
 * }
 * ```
 */
export function useSessionExpired(options?: UseSessionExpiredOptions): UseSessionExpiredResult {
  const passflow = usePassflow();
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [expiredReason, setExpiredReason] = useState<SessionExpiredReason | null>(null);

  useEffect(() => {
    const subscriber: PassflowSubscriber = {
      onAuthChange: (eventType, payload) => {
        if (eventType === PassflowEvent.SessionExpired) {
          const reason = (payload as { reason?: SessionExpiredReason })?.reason ?? 'refresh_failed';
          setIsSessionExpired(true);
          setExpiredReason(reason);
          options?.onSessionExpired?.(reason);
        } else if (eventType === PassflowEvent.SignIn || eventType === PassflowEvent.Register) {
          // Reset on successful auth
          setIsSessionExpired(false);
          setExpiredReason(null);
        }
      },
    };

    passflow.subscribe(subscriber, [PassflowEvent.SessionExpired, PassflowEvent.SignIn, PassflowEvent.Register]);

    return () => {
      passflow.unsubscribe(subscriber);
    };
  }, [passflow, options?.onSessionExpired]);

  const resetSessionExpired = () => {
    setIsSessionExpired(false);
    setExpiredReason(null);
  };

  return {
    isSessionExpired,
    expiredReason,
    resetSessionExpired,
  };
}
