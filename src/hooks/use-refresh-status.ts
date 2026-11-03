import { PassflowEvent, type PassflowEventPayload, type PassflowSubscriber } from '@passflow/core';
import { useEffect, useState } from 'react';
import { usePassflow } from './use-passflow';

export interface UseRefreshStatusResult {
  /**
   * True inside a transient-failure episode: a token refresh failed for a reason that
   * does not end the session (network, 5xx) and core is retrying. The session is kept.
   */
  isFailing: boolean;
  /**
   * Epoch ms of the episode's first transient failure (`RefreshFailing.since`).
   */
  since: number | null;
  /**
   * Epoch ms of the pending retry, when core knows it (`RefreshFailing.nextRetryAt`).
   */
  nextRetryAt: number | null;
}

const IDLE: UseRefreshStatusResult = { isFailing: false, since: null, nextRetryAt: null };

const EVENTS = [
  PassflowEvent.RefreshFailing,
  PassflowEvent.RefreshRecovered,
  PassflowEvent.SessionExpired,
  PassflowEvent.SignOut,
  PassflowEvent.SignIn,
  PassflowEvent.Register,
];

/**
 * Hook to show a "connection trouble" notice while token refresh is failing transiently.
 *
 * Set by `RefreshFailing`; cleared by `RefreshRecovered`, and by `SessionExpired`,
 * `SignOut`, `SignIn` and `Register`, which end or replace the session the episode
 * belonged to. A real end of the session is reported by `useSessionExpired`, not here.
 *
 * Core reports the episode only as events (there is no getter to read on mount), so a
 * component that mounts after `RefreshFailing` starts idle. Call the hook in a component
 * that lives for the whole app, near `PassflowProvider`.
 *
 * @example
 * ```tsx
 * function ConnectionNotice() {
 *   const { isFailing } = useRefreshStatus();
 *   return isFailing ? <Banner>Reconnecting...</Banner> : null;
 * }
 * ```
 */
export function useRefreshStatus(): UseRefreshStatusResult {
  const passflow = usePassflow();
  const [status, setStatus] = useState<UseRefreshStatusResult>(IDLE);

  useEffect(() => {
    const subscriber: PassflowSubscriber = {
      onAuthChange: (eventType, payload) => {
        if (eventType === PassflowEvent.RefreshFailing) {
          const failing = payload as PassflowEventPayload[PassflowEvent.RefreshFailing] | undefined;
          setStatus({
            isFailing: true,
            since: failing?.since ?? null,
            nextRetryAt: failing?.nextRetryAt ?? null,
          });
        } else {
          setStatus(IDLE);
        }
      },
    };

    passflow.subscribe(subscriber, EVENTS);

    return () => {
      passflow.unsubscribe(subscriber);
    };
  }, [passflow]);

  return status;
}
