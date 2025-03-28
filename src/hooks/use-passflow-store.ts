import type { Passflow, PassflowEvent, PassflowSubscriber, Tokens } from '@passflow/passflow-js-sdk';
import { useSyncExternalStore } from 'react';
import { usePassflow } from './use-passflow';

export function usePassflowStore(events?: PassflowEvent[]) {
  const passflow = usePassflow();
  const passflowSnapshot = useSyncExternalStore(subscribe(passflow, events), getSnapshot(passflow));
  return passflowSnapshot;
}

// wrapper around react's subscribe
function subscribe(passflow: Passflow, event?: PassflowEvent[]): (onStoreChange: () => void) => () => void {
  return (onStoreChange: () => void): (() => void) => {
    const bscr = subscriber(onStoreChange);
    passflow.subscribe(bscr, event);
    return () => {
      passflow.unsubscribe(bscr);
    };
  };
}

function subscriber(onStoreChange: () => void): PassflowSubscriber {
  return {
    onAuthChange: () => {
      onStoreChange();
    },
  };
}

function getSnapshot(passflow: Passflow): () => Tokens | undefined {
  return () => {
    return passflow.getTokensCache();
  };
}
