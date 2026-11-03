import type { Passflow } from '@passflow/core';
import { useEffect, useRef } from 'react';

type Disposable = Pick<Passflow, 'dispose'>;

type PendingDispose = {
  instance: Disposable;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Disposes a Passflow instance once it is replaced (a new `useMemo` value) or the
 * provider unmounts. Each instance owns refresh timers, a BroadcastChannel and Web
 * Locks; one left undisposed keeps acting as an extra tab.
 *
 * Why the dispose is deferred: React StrictMode runs effect cleanup and setup again
 * for the same instance in one commit, while `useMemo` keeps that instance live. An
 * immediate dispose in cleanup would kill the instance the app keeps using, and core
 * forbids using an instance after `dispose()`. So cleanup only schedules the dispose
 * (`setTimeout(0)`); a setup that sees the same instance cancels it. A different
 * instance or a real unmount leaves the timer to fire.
 */
export function useDisposeOnReplace(instance: Disposable): void {
  const pending = useRef<PendingDispose | null>(null);

  useEffect(() => {
    const scheduled = pending.current;
    if (scheduled) {
      if (scheduled.instance === instance) clearTimeout(scheduled.timer);
      pending.current = null;
    }

    return () => {
      const timer = setTimeout(() => instance.dispose(), 0);
      pending.current = { instance, timer };
    };
  }, [instance]);
}
