import { deviceErrorOfType } from '@/utils';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type DeviceUIMode, type DeviceVerifyInfo, useDeviceVerify } from '../use-device-verify';

const info = (mode: DeviceUIMode): DeviceVerifyInfo => ({
  mode,
  user_code: 'WDJB-MJHT',
  app_name: 'Passflow CLI',
  csrf_token: 'csrf-1',
  methods: { password: true, passkey: true },
});

const reply = (body: unknown, status = 200): Response =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as unknown as Response;

/** /oidc/device/authenticate for a user whose app requires a second factor. */
const owesSecondFactor = reply({
  approval_ticket: 'first-factor-ticket',
  email: 'jack@example.com',
  device_mode: 'consent',
  second_factor_required: true,
  second_factor_methods: ['totp', 'recovery_codes'],
});

describe('useDeviceVerify', () => {
  const originalLocation = window.location;
  const fetchMock = vi.fn();

  const mountReady = async (mode: DeviceUIMode) => {
    fetchMock.mockResolvedValueOnce(reply(info(mode)));
    const hook = renderHook(() => useDeviceVerify());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    return hook;
  };

  const post = (index: number) => {
    const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
    return { url, body: JSON.parse(String(init.body)), headers: init.headers as Record<string, string> };
  };

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    Object.defineProperty(window, 'location', { value: { search: '?user_code=WDJB-MJHT', href: '' }, writable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('approves on one tap when the sign-in owes nothing more', async () => {
    const { result } = await mountReady('consent');
    fetchMock.mockResolvedValueOnce(reply({ approval_ticket: 'ticket', email: 'jack@example.com' }));
    fetchMock.mockResolvedValueOnce(reply({}));

    await act(() => result.current.confirmWithPassword('jack@example.com', 'secret'));

    expect(result.current.status).toBe('done');
    expect(post(2)).toMatchObject({ url: '/oidc/device/approve', body: { approval_ticket: 'ticket' } });
  });

  it('stops a consent tap at the second factor, then approves with the ticket that answers', async () => {
    const { result } = await mountReady('consent');
    fetchMock.mockResolvedValueOnce(owesSecondFactor);

    await act(() => result.current.confirmWithPassword('jack@example.com', 'secret'));

    expect(result.current.status).toBe('second_factor');
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isSecondFactorPending).toBe(true);
    expect(result.current.secondFactorMethods).toEqual(['totp', 'recovery_codes']);
    // A first factor alone must not reach the approval.
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockResolvedValueOnce(reply({ approval_ticket: 'both-factors-ticket' }));
    fetchMock.mockResolvedValueOnce(reply({}));
    await act(() => result.current.submitSecondFactor('totp', '123456'));

    expect(result.current.status).toBe('done');
    const secondFactor = post(2);
    expect(secondFactor.url).toBe('/oidc/device/second-factor');
    expect(secondFactor.headers['X-Passflow-CSRF']).toBe('csrf-1');
    expect(secondFactor.body).toEqual({
      approval_ticket: 'first-factor-ticket',
      method: 'totp',
      code: '123456',
      user_code: 'WDJB-MJHT',
    });
    expect(post(3)).toMatchObject({ url: '/oidc/device/approve', body: { approval_ticket: 'both-factors-ticket' } });
  });

  it('lands a full-login second factor on the approval screen, not past it', async () => {
    const { result } = await mountReady('full_login');
    fetchMock.mockResolvedValueOnce(owesSecondFactor);
    await act(() => result.current.signInWithPassword('jack@example.com', 'secret'));
    expect(result.current.status).toBe('second_factor');

    fetchMock.mockResolvedValueOnce(reply({ approval_ticket: 'both-factors-ticket' }));
    await act(() => result.current.submitSecondFactor('recovery_codes', 'ABCD-EFGH-IJKL'));

    expect(result.current.status).toBe('signed_in');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isSecondFactorPending).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    fetchMock.mockResolvedValueOnce(reply({}));
    await act(() => result.current.approve());
    expect(result.current.status).toBe('done');
    expect(post(3).body).toMatchObject({ approval_ticket: 'both-factors-ticket' });
  });

  it('keeps the second-factor step after a wrong code, with the page’s own words', async () => {
    const { result } = await mountReady('consent');
    fetchMock.mockResolvedValueOnce(owesSecondFactor);
    await act(() => result.current.confirmWithPassword('jack@example.com', 'secret'));

    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    fetchMock.mockResolvedValueOnce(
      reply({ error: 'access_denied', reason: 'second_factor_invalid', error_description: 'operator detail' }, 401),
    );
    await act(() => result.current.submitSecondFactor('totp', '000000'));

    expect(result.current.status).toBe('second_factor');
    expect(result.current.isSecondFactorPending).toBe(true);
    expect(result.current.error?.type).toBe('second_factor_invalid');
    expect(result.current.error?.message).toBe(deviceErrorOfType('second_factor_invalid').message);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
