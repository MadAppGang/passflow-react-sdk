import { type Passflow, PassflowEvent, type PassflowEventPayload, type PassflowSubscriber } from '@passflow/core';
import { act, renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialState, PassflowContext, type PassflowContextType } from '../../context/passflow-context';
import { useRefreshStatus } from '../use-refresh-status';
import { useSessionExpired } from '../use-session-expired';

// A fake passflow whose subscribe captures the subscriber, so a test can fire events.
const createFakePassflow = () => {
  let subscriber: PassflowSubscriber | null = null;
  const fake = {
    subscribe: vi.fn((s: PassflowSubscriber) => {
      subscriber = s;
    }),
    unsubscribe: vi.fn((s: PassflowSubscriber) => {
      if (subscriber === s) subscriber = null;
    }),
  };
  const fire = <E extends PassflowEvent>(eventType: E, payload?: PassflowEventPayload[E]) => {
    act(() => {
      subscriber?.onAuthChange(eventType, payload);
    });
  };
  return { fake, fire, current: () => subscriber };
};

type FakePassflow = ReturnType<typeof createFakePassflow>;

const createWrapper = (passflow: FakePassflow): FC<PropsWithChildren> => {
  const context: PassflowContextType = {
    state: initialState,
    dispatch: vi.fn(),
    passflow: passflow.fake as unknown as Passflow,
  };
  return ({ children }) => <PassflowContext.Provider value={context}>{children}</PassflowContext.Provider>;
};

describe('useRefreshStatus', () => {
  let passflow: FakePassflow;
  let wrapper: FC<PropsWithChildren>;

  beforeEach(() => {
    passflow = createFakePassflow();
    wrapper = createWrapper(passflow);
  });

  const failing = (since: number, nextRetryAt?: number) =>
    passflow.fire(PassflowEvent.RefreshFailing, { since, nextRetryAt, origin: 'this-tab' });

  it('starts idle and subscribes to the episode and session events', () => {
    const { result } = renderHook(() => useRefreshStatus(), { wrapper });

    expect(result.current).toEqual({ isFailing: false, since: null, nextRetryAt: null });
    expect(passflow.fake.subscribe).toHaveBeenCalledWith(
      expect.any(Object),
      expect.arrayContaining([
        PassflowEvent.RefreshFailing,
        PassflowEvent.RefreshRecovered,
        PassflowEvent.SessionExpired,
        PassflowEvent.SignOut,
        PassflowEvent.SignIn,
        PassflowEvent.Register,
      ]),
    );
  });

  it('takes since and nextRetryAt from the RefreshFailing payload', () => {
    const { result } = renderHook(() => useRefreshStatus(), { wrapper });

    failing(1000, 6000);
    expect(result.current).toEqual({ isFailing: true, since: 1000, nextRetryAt: 6000 });

    failing(1000);
    expect(result.current).toEqual({ isFailing: true, since: 1000, nextRetryAt: null });
  });

  it('clears on RefreshRecovered', () => {
    const { result } = renderHook(() => useRefreshStatus(), { wrapper });

    failing(1000, 6000);
    passflow.fire(PassflowEvent.RefreshRecovered, { since: 1000, origin: 'other-tab' });

    expect(result.current).toEqual({ isFailing: false, since: null, nextRetryAt: null });
  });

  it('clears on SessionExpired', () => {
    const { result } = renderHook(() => useRefreshStatus(), { wrapper });

    failing(1000, 6000);
    passflow.fire(PassflowEvent.SessionExpired, { reason: 'refresh_failed', origin: 'this-tab' });

    expect(result.current).toEqual({ isFailing: false, since: null, nextRetryAt: null });
  });

  it('clears on SignOut', () => {
    const { result } = renderHook(() => useRefreshStatus(), { wrapper });

    failing(1000, 6000);
    passflow.fire(PassflowEvent.SignOut, { origin: 'other-tab' });

    expect(result.current).toEqual({ isFailing: false, since: null, nextRetryAt: null });
  });

  it('clears on SignIn', () => {
    const { result } = renderHook(() => useRefreshStatus(), { wrapper });

    failing(1000, 6000);
    passflow.fire(PassflowEvent.SignIn, {});

    expect(result.current.isFailing).toBe(false);
  });

  it('unsubscribes the same subscriber on unmount', () => {
    const { unmount } = renderHook(() => useRefreshStatus(), { wrapper });
    const subscribed = passflow.fake.subscribe.mock.calls[0]?.[0];

    unmount();

    expect(passflow.fake.unsubscribe).toHaveBeenCalledWith(subscribed);
    expect(passflow.current()).toBeNull();
  });
});

describe('useSessionExpired with core 0.21 reasons', () => {
  let passflow: FakePassflow;
  let wrapper: FC<PropsWithChildren>;

  beforeEach(() => {
    passflow = createFakePassflow();
    wrapper = createWrapper(passflow);
  });

  it.each(['successor_timeout', 'identity_changed'] as const)('reports reason %s', (reason) => {
    const onSessionExpired = vi.fn();
    const { result } = renderHook(() => useSessionExpired({ onSessionExpired }), { wrapper });

    passflow.fire(PassflowEvent.SessionExpired, { reason, origin: 'this-tab' });

    expect(result.current.isSessionExpired).toBe(true);
    expect(result.current.expiredReason).toBe(reason);
    expect(onSessionExpired).toHaveBeenCalledWith(reason);
  });

  it('resets on SignIn after identity_changed', () => {
    const { result } = renderHook(() => useSessionExpired(), { wrapper });

    passflow.fire(PassflowEvent.SessionExpired, { reason: 'identity_changed', origin: 'other-tab' });
    expect(result.current.isSessionExpired).toBe(true);

    passflow.fire(PassflowEvent.SignIn, {});

    expect(result.current.isSessionExpired).toBe(false);
    expect(result.current.expiredReason).toBeNull();
  });
});
