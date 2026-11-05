import { act, renderHook, waitFor } from '@testing-library/react';
import React, { type PropsWithChildren } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PassflowProvider } from '@/components/provider/passflow-provider';
import { useTwoFactorEnrollment } from '@/hooks/use-two-factor-enrollment';
import {
  installLandingEnvironment, jwt, type Network,
} from '../../../src/components/provider/__tests__/support/federated-harness';

// Non-visual public hook outputs over real provider/core and a stubbed HTTP boundary.
// No SDK method is replaced, and no mock calls or private store data are asserted.
export function enrollmentLifecycleCases(engine: 'default' | '18.3.1') {
  describe(`TEST-H1 REQ-1 REQ-6 REQ-11 REQ-13 enrollment lifecycle, React ${engine}`, () => {
    let network: Network | undefined;
    afterEach(() => {
      network?.restore();
      network = undefined;
    });

    function setup(pending = true) {
      network = installLandingEnvironment({ pathname: '/web/two-factor-verify', search: '' });
      if (pending) {
        window.history.replaceState(null, '', '/web/two-factor-verify#tfa_token=' +
          jwt({ type: 'tfa', challenge_id: 'lifecycle-contract-factor' }));
      }
      network.endpoints.set('/auth/2fa/enrollment', {
        status: 501,
        data: { error: { id: 'error.not.implemented', status: 501, message: 'Not supported' } },
      });
      return network;
    }

    function wrapper({ children }: PropsWithChildren) {
      return (
        <React.StrictMode>
          <PassflowProvider appId='enrollment-contract-app' url='https://auth.example.com' navigate={() => {}}>
            {children}
          </PassflowProvider>
        </React.StrictMode>
      );
    }

    it('reads pending enrollment once under committed StrictMode and exposes unavailable for 501', async () => {
      if (engine !== 'default') expect(React.version).toBe(engine);
      const http = setup();
      const { result } = renderHook(() => useTwoFactorEnrollment({}), { wrapper });
      await http.releaseSettings();
      await waitFor(() => expect(result.current.screen).toEqual({ kind: 'unavailable' }));
      // Flush committed effects before checking for duplicate HTTP requests.
      await act(async () => {});
      expect(http.requests.filter((request) => request.path.startsWith('/auth/2fa/'))
        .map((request) => ({ path: request.path, method: request.method.toUpperCase() })))
        .toEqual([{ path: '/auth/2fa/enrollment', method: 'GET' }]);
    });

    it('read remains usable after the one-time mount read; any 401 overrides not_enabled', async () => {
      const http = setup();
      const { result } = renderHook(() => useTwoFactorEnrollment({}), { wrapper });
      await http.releaseSettings();
      await waitFor(() => expect(result.current.screen.kind).toBe('unavailable'));
      http.endpoints.set('/auth/2fa/enrollment', {
        status: 401,
        data: { error: { id: 'error.2fa.not_enabled', status: 401, message: 'Translated server text' } },
      });
      await act(async () => { await result.current.read(); });
      expect(result.current.screen).toEqual({
        kind: 'ended', message: 'Your sign-in has ended. Sign in again.',
      });
      expect(http.requests.filter((request) => request.path === '/auth/2fa/enrollment')).toHaveLength(2);
    });

    it('preserves the legacy verify screen without querying enrollment when no pending sign-in exists', async () => {
      const http = setup(false);
      const { result } = renderHook(() => useTwoFactorEnrollment({}), { wrapper });
      await http.releaseSettings();
      await waitFor(() => expect(result.current.screen).toEqual({ kind: 'verify' }));
      await act(async () => {});
      expect(http.requests.filter((request) => request.path.startsWith('/auth/2fa/'))).toEqual([]);
    });

    for (const [type, message] of [
      ['expired', 'Your sign-in has ended. Sign in again.'],
      ['rate_limited', 'Too many attempts. Sign in again later.'],
    ] as const) {
      it(`REQ-6 REQ-12 public end(${type}) exposes the decided terminal message`, async () => {
        const http = setup(false);
        const { result } = renderHook(() => useTwoFactorEnrollment({}), { wrapper });
        await http.releaseSettings();
        await waitFor(() => expect(result.current.screen.kind).toBe('verify'));
        await act(async () => { result.current.end(type); });
        expect(result.current.screen).toEqual({ kind: 'ended', message });
      });
    }

    it('REQ-3 public complete exposes finished rather than blanking after a completed form', async () => {
      const http = setup(false);
      const { result } = renderHook(() => useTwoFactorEnrollment({}), { wrapper });
      await http.releaseSettings();
      await waitFor(() => expect(result.current.screen.kind).toBe('verify'));
      await act(async () => { result.current.complete(); });
      expect(result.current.screen).toEqual({ kind: 'finished' });
    });
  });
}
