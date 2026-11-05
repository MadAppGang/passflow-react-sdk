import { act, renderHook } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PassflowProvider } from '@/components/provider/passflow-provider';
import { useTwoFactorVerify } from '@/hooks/use-two-factor-verify';
import { installLandingEnvironment, jwt, type Network } from '../../components/provider/__tests__/support/federated-harness';

let network: Network | undefined;
afterEach(() => {
  network?.restore();
  network = undefined;
});

function setup(pending = true) {
  network = installLandingEnvironment({ pathname: '/web/two-factor-verify', search: '' });
  if (pending) {
    window.history.replaceState(
      null,
      '',
      '/web/two-factor-verify#tfa_token=' + jwt({ type: 'tfa', challenge_id: 'verify-errors-contract-factor' }),
    );
  }
  return network;
}

function wrapper({ children }: PropsWithChildren) {
  return (
    <React.StrictMode>
      <PassflowProvider appId='verify-contract-app' url='https://auth.example.com' navigate={() => {}}>
        {children}
      </PassflowProvider>
    </React.StrictMode>
  );
}

describe('TEST-H2 REQ-6 REQ-7 REQ-12 useTwoFactorVerify classifies structured errors, not translated text', () => {
  it.each([
    ['error.2fa.not_enabled', 401, 'not_enabled'],
    ['error.api.request.2fa_code.invalid', 401, 'invalid_code'],
    ['error.2fa.rate_limit_exceeded', 401, 'rate_limited'],
    ['error.tfa.token.invalid', 401, 'expired'],
    ['error.otp.already.used', 401, 'expired'],
    ['error.unknown', 401, 'expired'],
    ['error.server', 500, 'generic'],
  ])('%s (%s) returns %s', async (id, status, expected) => {
    const http = setup();
    http.endpoints.set('/auth/2fa/verify', {
      status: Number(status),
      data: { error: { id, status, message: 'Message traduit sans indice anglais' } },
    });
    const { result } = renderHook(() => useTwoFactorVerify(), { wrapper });
    await http.releaseSettings();
    await act(async () => {
      await result.current.verify('123456');
    });
    expect(result.current.errorDetails?.type).toBe(expected);
  });

  it('raw HTTP 429 with string error body returns rate_limited rather than generic or expired', async () => {
    const http = setup();
    http.endpoints.set('/auth/2fa/verify', {
      status: 429,
      data: { error: 'Try again in 15 minutes.' },
    });
    const { result } = renderHook(() => useTwoFactorVerify(), { wrapper });
    await http.releaseSettings();
    await act(async () => {
      await result.current.verify('123456');
    });
    expect(result.current.errorDetails?.type).toBe('rate_limited');
  });

  it('a core Error without status when the pending sign-in is gone returns expired', async () => {
    const http = setup(false);
    const { result } = renderHook(() => useTwoFactorVerify(), { wrapper });
    await http.releaseSettings();
    await act(async () => {
      await result.current.verify('123456');
    });
    expect(result.current.errorDetails?.type).toBe('expired');
  });
});
