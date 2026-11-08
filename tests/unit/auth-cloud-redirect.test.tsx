import { Passflow, PassflowProvider, useAuthCloudRedirect, usePassflow } from '@passflow/react';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
// Coverage map: REQ-10 (TEST-13, TEST-14), REQ-1 (TEST-13)
import { afterEach, expect, test, vi } from 'vitest';
import { APP_ID, installLocation, installServer, PAGE_ORIGIN } from './support/handoff-harness';

// core 0.29 `authRedirect` is async and rejects on failure (after its own Error
// event). The hook's redirect function must swallow that rejection.

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const wrapper = ({ children }: PropsWithChildren) => (
  <PassflowProvider url='https://auth.example.com' appId={APP_ID} parseQueryParams={false}>
    {children}
  </PassflowProvider>
);

const flush = () => new Promise((r) => setTimeout(r, 20));

/** Every `authRedirect` the hook could reach (the provider's instance or one of its own) rejects. */
const rejectAuthRedirect = (instance: Passflow, error: unknown) => {
  const reject = () => Promise.reject(error);
  const spies: Array<{ mock: { calls: unknown[] } }> = [];
  const proto = Passflow.prototype as unknown as Record<string, unknown>;
  if (typeof proto.authRedirect === 'function') {
    spies.push(vi.spyOn(Passflow.prototype as never, 'authRedirect' as never).mockImplementation(reject as never));
  }
  if (Object.hasOwn(instance as object, 'authRedirect')) {
    spies.push(vi.spyOn(instance as never, 'authRedirect' as never).mockImplementation(reject as never));
  }
  return () => spies.reduce((n, s) => n + s.mock.calls.length, 0);
};

const captureUnhandled = () => {
  const reasons: unknown[] = [];
  const onNode = (reason: unknown) => reasons.push(reason);
  const onWindow = (event: PromiseRejectionEvent) => {
    reasons.push(event.reason);
    event.preventDefault();
  };
  process.on('unhandledRejection', onNode);
  window.addEventListener('unhandledrejection', onWindow);
  return {
    reasons,
    stop: () => {
      process.off('unhandledRejection', onNode);
      window.removeEventListener('unhandledrejection', onWindow);
    },
  };
};

test('TEST-13 REQ-10 a rejecting authRedirect causes no unhandled rejection and no throw', async () => {
  installServer({ pkce: false });
  installLocation(`${PAGE_ORIGIN}/`);
  const { result } = renderHook(
    () => ({ passflow: usePassflow(), redirect: useAuthCloudRedirect('https://cloud.example.com') }),
    { wrapper },
  );
  await act(flush);

  const callCount = rejectAuthRedirect(result.current.passflow, new Error('CONFIDENTIAL_CLIENT'));
  const unhandled = captureUnhandled();
  try {
    expect(() => result.current.redirect()).not.toThrow();
    await act(flush);
    await act(flush);
  } finally {
    unhandled.stop();
  }

  expect(callCount()).toBeGreaterThan(0);
  expect(unhandled.reasons).toEqual([]);
});

test('TEST-14 REQ-10 a non-Error rejection is swallowed too', async () => {
  installServer({ pkce: false });
  installLocation(`${PAGE_ORIGIN}/`);
  const { result } = renderHook(
    () => ({ passflow: usePassflow(), redirect: useAuthCloudRedirect('https://cloud.example.com') }),
    { wrapper },
  );
  await act(flush);

  const callCount = rejectAuthRedirect(result.current.passflow, { code: 'SECURE_CONTEXT_REQUIRED' });
  const unhandled = captureUnhandled();
  try {
    result.current.redirect();
    await act(flush);
    await act(flush);
  } finally {
    unhandled.stop();
  }

  expect(callCount()).toBeGreaterThan(0);
  expect(unhandled.reasons).toEqual([]);
});
