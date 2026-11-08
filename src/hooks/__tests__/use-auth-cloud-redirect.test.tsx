import { renderHook } from '@testing-library/react';
import type { FC, PropsWithChildren } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initialState, PassflowContext, type PassflowContextType } from '../../context/passflow-context';
import { useAuthCloudRedirect } from '../use-auth-cloud-redirect';

const wrapperFor =
  (authRedirect: () => Promise<void>): FC<PropsWithChildren> =>
  ({ children }) => {
    const value = { state: initialState, dispatch: vi.fn(), passflow: { authRedirect } } as unknown as PassflowContextType;
    return <PassflowContext.Provider value={value}>{children}</PassflowContext.Provider>;
  };

// Rejections are reported to `process` in Node and to `window` in a browser; listen on both.
const watchUnhandledRejections = () => {
  const seen: unknown[] = [];
  const onProcess = (reason: unknown) => seen.push(reason);
  const onWindow = (event: PromiseRejectionEvent) => seen.push(event.reason);
  process.on('unhandledRejection', onProcess);
  window.addEventListener('unhandledrejection', onWindow);
  return {
    seen,
    stop: () => {
      process.off('unhandledRejection', onProcess);
      window.removeEventListener('unhandledrejection', onWindow);
    },
  };
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('useAuthCloudRedirect', () => {
  let watcher: ReturnType<typeof watchUnhandledRejections> | undefined;
  afterEach(() => {
    watcher?.stop();
    watcher = undefined;
  });

  it('passes the cloud URL to authRedirect', () => {
    const authRedirect = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAuthCloudRedirect('https://auth.example.com'), {
      wrapper: wrapperFor(authRedirect),
    });

    result.current();

    expect(authRedirect).toHaveBeenCalledWith({ url: 'https://auth.example.com' });
  });

  it.each([
    ['a confidential client', Object.assign(new Error('confidential client'), { code: 'CONFIDENTIAL_CLIENT' })],
    ['a failed settings read', new Error('settings unavailable')],
  ])('leaves no unhandled rejection when authRedirect fails for %s', async (_case, failure) => {
    watcher = watchUnhandledRejections();
    const authRedirect = vi.fn().mockRejectedValue(failure);
    const { result } = renderHook(() => useAuthCloudRedirect('https://auth.example.com'), {
      wrapper: wrapperFor(authRedirect),
    });

    expect(result.current()).toBeUndefined();
    await settle();

    expect(watcher.seen).toEqual([]);
  });
});
