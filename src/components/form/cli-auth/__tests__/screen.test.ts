import type { UseCLIAuthProps } from '@/hooks/use-cli-auth';
import { describe, expect, it, vi } from 'vitest';
import { getCLILoginScreenProps } from '../screen';

const cli = (overrides: Partial<UseCLIAuthProps> = {}): UseCLIAuthProps => ({
  authenticate: vi.fn().mockResolvedValue(undefined),
  state: 'pending',
  error: null,
  expiresAt: null,
  ...overrides,
});

describe('getCLILoginScreenProps', () => {
  it('maps the pending browser flow to a canonical passkey action', () => {
    const value = cli();
    const screen = getCLILoginScreenProps(value, 'browser');

    expect(screen.state).toMatchObject({
      kind: 'passkey-progress',
      working: false,
      actionLabel: 'Authenticate with Passkey',
      testId: 'cli-auth-pending',
    });
    if (screen.state.kind !== 'passkey-progress') throw new Error('expected passkey state');

    screen.state.onAction?.();
    expect(value.authenticate).toHaveBeenCalledOnce();
  });

  it('keeps browser and QR instructions in the shared adapter', () => {
    const browser = getCLILoginScreenProps(cli(), 'browser');
    const qr = getCLILoginScreenProps(cli(), 'qr');

    expect(browser.chrome.subtitle).toBe('Authenticate your CLI tool');
    expect(qr.chrome.subtitle).toBe('Authenticate for your CLI application');
    expect(browser.state.kind === 'passkey-progress' && browser.state.message).toContain('Click');
    expect(qr.state.kind === 'passkey-progress' && qr.state.message).toContain('Tap');
  });

  it.each([
    ['loading', 'passkey-progress', 'cli-auth-loading'],
    ['authenticating', 'passkey-progress', 'cli-auth-authenticating'],
    ['completed', 'status', 'cli-auth-completed'],
    ['expired', 'status', 'cli-auth-expired'],
    ['error', 'status', 'cli-auth-error'],
  ] as const)('maps %s through LoginScreen state %s', (state, kind, testId) => {
    const screen = getCLILoginScreenProps(cli({ state, error: state === 'error' ? 'Authentication failed' : null }), 'browser');

    expect(screen.state.kind).toBe(kind);
    expect(screen.state.testId).toBe(testId);
  });

  it('preserves the terminal error message', () => {
    const screen = getCLILoginScreenProps(cli({ state: 'error', error: 'Passkey authentication was cancelled' }), 'browser');

    expect(screen.state).toMatchObject({
      kind: 'status',
      tone: 'error',
      message: 'Passkey authentication was cancelled',
    });
  });
});
