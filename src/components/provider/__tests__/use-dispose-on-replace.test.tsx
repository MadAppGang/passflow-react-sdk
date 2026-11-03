import { renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDisposeOnReplace } from '../use-dispose-on-replace';

const createInstance = () => ({ dispose: vi.fn() });

describe('useDisposeOnReplace', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('disposes a replaced instance, not the new one', () => {
    const first = createInstance();
    const second = createInstance();
    const { rerender } = renderHook(({ instance }) => useDisposeOnReplace(instance), {
      initialProps: { instance: first },
    });

    rerender({ instance: second });
    expect(first.dispose).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.dispose).not.toHaveBeenCalled();
  });

  it('disposes the instance on unmount', () => {
    const instance = createInstance();
    const { unmount } = renderHook(() => useDisposeOnReplace(instance));

    unmount();
    vi.runAllTimers();

    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });

  it('does not dispose the live instance on a StrictMode remount', () => {
    const instance = createInstance();
    const { unmount } = renderHook(() => useDisposeOnReplace(instance), { wrapper: StrictMode });

    vi.runAllTimers();
    expect(instance.dispose).not.toHaveBeenCalled();

    unmount();
    vi.runAllTimers();

    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes a replaced instance under StrictMode', () => {
    const first = createInstance();
    const second = createInstance();
    const { rerender } = renderHook(({ instance }) => useDisposeOnReplace(instance), {
      initialProps: { instance: first },
      wrapper: StrictMode,
    });

    rerender({ instance: second });
    vi.runAllTimers();

    expect(first.dispose).toHaveBeenCalledTimes(1);
    expect(second.dispose).not.toHaveBeenCalled();
  });
});
