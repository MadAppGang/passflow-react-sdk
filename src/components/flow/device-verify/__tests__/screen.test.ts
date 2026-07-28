import type { UseDeviceVerifyProps } from '@/hooks/use-device-verify';
import { deviceErrorOfType } from '@/utils';
import { describe, expect, it, vi } from 'vitest';
import { getDeviceLoginScreenProps } from '../screen';

const device = (overrides: Partial<UseDeviceVerifyProps> = {}): UseDeviceVerifyProps => ({
  status: 'ready',
  info: {
    mode: 'consent',
    user_code: 'WDJB-MJHT',
    app_name: 'Passflow CLI',
    csrf_token: 'csrf-token',
    methods: { password: true, passkey: true },
  },
  error: null,
  email: null,
  isAuthenticated: false,
  submitCode: vi.fn(),
  signInWithPassword: vi.fn().mockResolvedValue(undefined),
  signInWithPasskey: vi.fn().mockResolvedValue(undefined),
  approve: vi.fn().mockResolvedValue(undefined),
  confirmWithPassword: vi.fn().mockResolvedValue(undefined),
  confirmWithPasskey: vi.fn().mockResolvedValue(undefined),
  clearError: vi.fn(),
  ...overrides,
});

describe('getDeviceLoginScreenProps', () => {
  it('maps consent to the canonical credential state and preserves one-tap approval', () => {
    const value = device();
    const screen = getDeviceLoginScreenProps(value);

    expect(screen?.state.kind).toBe('credentials');
    if (screen?.state.kind !== 'credentials') throw new Error('expected credentials state');

    expect(screen.state.notice).toMatchObject({ code: 'WDJB-MJHT', appName: 'Passflow CLI' });
    screen.state.onPassword?.({
      method: 'email_or_username',
      emailOrUsername: 'jack@example.com',
      phone: '',
      password: 'secret',
    });
    expect(value.confirmWithPassword).toHaveBeenCalledWith('jack@example.com', 'secret');
  });

  it('replaces full-login credentials with approval after authentication', () => {
    const before = getDeviceLoginScreenProps(
      device({
        info: {
          mode: 'full_login',
          user_code: 'WDJB-MJHT',
          app_name: 'Passflow CLI',
          csrf_token: 'csrf-token',
          methods: { password: true, passkey: true },
        },
      }),
    );
    expect(before?.state.kind).toBe('credentials');

    const value = device({
      status: 'signed_in',
      isAuthenticated: true,
      email: 'jack@example.com',
      info: {
        mode: 'full_login',
        user_code: 'WDJB-MJHT',
        app_name: 'Passflow CLI',
        csrf_token: 'csrf-token',
        methods: { password: true, passkey: true },
      },
    });
    const after = getDeviceLoginScreenProps(value);

    expect(after?.state).toMatchObject({
      kind: 'device-approval',
      appName: 'Passflow CLI',
      code: 'WDJB-MJHT',
      identity: 'jack@example.com',
      busy: false,
    });
    if (after?.state.kind !== 'device-approval') throw new Error('expected device approval state');
    after.state.onApprove();
    expect(value.approve).toHaveBeenCalledOnce();
  });

  it('keeps authenticated approval visible while approval is working', () => {
    const screen = getDeviceLoginScreenProps(
      device({
        status: 'working',
        isAuthenticated: true,
        email: 'jack@example.com',
        info: {
          mode: 'full_login',
          user_code: 'WDJB-MJHT',
          app_name: 'Passflow CLI',
          csrf_token: 'csrf-token',
          methods: { password: true, passkey: true },
        },
      }),
    );

    expect(screen?.state).toMatchObject({ kind: 'device-approval', busy: true, identity: 'jack@example.com' });
  });

  it('maps a recoverable passkey error to retry instead of another automatic wait', () => {
    const retry = vi.fn().mockResolvedValue(undefined);
    const error = deviceErrorOfType('passkey_failed');
    const screen = getDeviceLoginScreenProps(
      device({
        status: 'ready',
        error,
        confirmWithPasskey: retry,
        info: {
          mode: 'passkey',
          app_name: 'Passflow CLI',
          csrf_token: 'csrf-token',
          methods: { password: false, passkey: true },
        },
      }),
    );

    expect(screen?.state.kind).toBe('passkey-progress');
    if (screen?.state.kind !== 'passkey-progress') throw new Error('expected passkey state');
    expect(screen.state.working).toBe(false);
    expect(screen.state.recoverable).toBe(true);
    screen.state.onRetry?.();
    expect(retry).toHaveBeenCalledOnce();
  });

  it('maps refused mode to a terminal state with no retry', () => {
    const screen = getDeviceLoginScreenProps(
      device({
        status: 'refused',
        error: deviceErrorOfType('mode_disabled'),
      }),
    );

    expect(screen?.state).toMatchObject({ kind: 'status', tone: 'disabled' });
    if (screen?.state.kind !== 'status') throw new Error('expected status state');
    expect(screen.state.recoverable).toBeUndefined();
    expect(screen.state.onRetry).toBeUndefined();
  });

  it('returns no presentation while loading', () => {
    expect(getDeviceLoginScreenProps(device({ status: 'loading', info: null }))).toBeNull();
  });
});
