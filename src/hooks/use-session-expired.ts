import { PassflowEvent, type PassflowSubscriber, type SessionExpiredReason } from '@passflow/core';
import { useEffect, useState } from 'react';
import { usePassflow } from './use-passflow';

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
 * Core emits SessionExpired only when the session has really ended: the last
 * auth strike (`'refresh_failed'`), no successor token pair in time
 * (`'successor_timeout'`), or another user's tokens in storage
 * (`'identity_changed'`). A transient refresh failure (network, 5xx) keeps the
 * session and is reported as RefreshFailing / RefreshRecovered instead; see
 * `useRefreshStatus`. This hook lets you react to the real end and redirect
 * users to your login page.
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
