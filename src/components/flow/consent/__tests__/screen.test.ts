import type { ConsentInfo, UseConsentProps } from '@/hooks/use-consent';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConsentLoginScreenProps } from '../screen';

const info: ConsentInfo = {
  client_id: 'acme-notes-client',
  app_name: 'Acme Notes',
  app_logo_url: 'https://acme.test/logo.png',
  requested_scopes: ['openid', 'profile', 'offline_access'],
  scope_metadata: [{ scope: 'profile', label: 'View your profile', description: 'Your name and picture.' }],
  redirect_uri: 'https://acme.test/callback',
  state: 'state-1',
  response_mode: 'query',
  first_party: false,
  csrf_token: 'csrf-token',
};

const consent = (overrides: Partial<UseConsentProps> = {}): UseConsentProps => ({
  status: 'ready',
  info,
  grantedScopes: [...info.requested_scopes],
  error: null,
  scopeMetadata: (scope) =>
    info.scope_metadata.find((meta) => meta.scope === scope) ?? { scope, label: scope, description: '' },
  toggleScope: vi.fn(),
  allow: vi.fn().mockResolvedValue(undefined),
  deny: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const consentState = (value: UseConsentProps) => {
  const screen = getConsentLoginScreenProps(value);
  if (screen?.state.kind !== 'consent') throw new Error('expected a consent state');
  return { screen, state: screen.state };
};

describe('getConsentLoginScreenProps', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, 'location', { value: { href: '' }, writable: true });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });

  it('renders nothing while the request is loading', () => {
    expect(getConsentLoginScreenProps(consent({ status: 'loading', info: null }))).toBeNull();
  });

  it('renders nothing when ready without request metadata', () => {
    expect(getConsentLoginScreenProps(consent({ info: null }))).toBeNull();
  });

  it('maps an unusable link to a general error that returns to login', () => {
    const screen = getConsentLoginScreenProps(
      consent({
        status: 'invalid',
        info: null,
        error: { message: 'Consent request unavailable', description: 'Return to the application and try again.' },
      }),
    );

    expect(screen?.chrome.title).toBe('Consent request unavailable');
    expect(screen?.state).toMatchObject({
      kind: 'general-error',
      message: 'Consent request unavailable',
      detail: 'Return to the application and try again.',
      actionLabel: 'Back to login',
    });
    if (screen?.state.kind !== 'general-error') throw new Error('expected general-error');

    screen.state.onAction();
    expect(window.location.href).toBe('/web');
  });

  it('falls back to generic copy when an invalid link carries no error', () => {
    const screen = getConsentLoginScreenProps(consent({ status: 'invalid', info: null }));

    expect(screen?.chrome.title).toBe('Consent request unavailable');
  });

  it('maps a recorded decision to a success status naming the app', () => {
    const screen = getConsentLoginScreenProps(consent({ status: 'redirecting' }));

    expect(screen?.chrome.subtitle).toBe('Returning you to Acme Notes.');
    expect(screen?.state).toMatchObject({ kind: 'status', tone: 'success', testId: 'consent-redirecting' });
  });

  it('names a generic application when the app has no name yet', () => {
    const screen = getConsentLoginScreenProps(consent({ status: 'redirecting', info: null }));

    expect(screen?.chrome.subtitle).toBe('Returning you to the application.');
  });

  it('puts the app name and logo in the chrome so the screen reads as THIS app asking', () => {
    const { screen } = consentState(consent());

    expect(screen.chrome).toMatchObject({
      title: 'Allow Acme Notes to access your account?',
      customLogo: 'https://acme.test/logo.png',
      customLogoAlt: 'Acme Notes logo',
    });
  });

  it('falls back to the client id when the app has no name, and omits an empty logo', () => {
    const { screen, state } = consentState(consent({ info: { ...info, app_name: '', app_logo_url: '' } }));

    expect(screen.chrome.title).toBe('Allow acme-notes-client to access your account?');
    expect(screen.chrome.customLogo).toBeUndefined();
    expect(state.appName).toBe('acme-notes-client');
  });

  it('maps each requested scope with its label, description and granted flag', () => {
    const { state } = consentState(consent({ grantedScopes: ['openid', 'offline_access'] }));

    expect(state.scopes).toEqual([
      { scope: 'openid', label: 'openid', description: undefined, granted: true },
      { scope: 'profile', label: 'View your profile', description: 'Your name and picture.', granted: false },
      { scope: 'offline_access', label: 'offline_access', description: undefined, granted: true },
    ]);
  });

  it('is busy only while a decision is in flight', () => {
    expect(consentState(consent({ status: 'ready' })).state.busy).toBe(false);
    expect(consentState(consent({ status: 'working' })).state.busy).toBe(true);
  });

  it('surfaces a failed decision as the screen error', () => {
    const { state } = consentState(consent({ error: { message: 'Could not submit your decision.' } }));

    expect(state.error).toBe('Could not submit your decision.');
  });

  it('routes the screen callbacks to the hook', () => {
    const value = consent();
    const { state } = consentState(value);

    state.onToggleScope('profile');
    state.onAllow();
    state.onDeny();

    expect(value.toggleScope).toHaveBeenCalledWith('profile');
    expect(value.allow).toHaveBeenCalledTimes(1);
    expect(value.deny).toHaveBeenCalledTimes(1);
  });
});
