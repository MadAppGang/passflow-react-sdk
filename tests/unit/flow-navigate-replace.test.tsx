import { PassflowFlow, PassflowProvider, useNavigation } from '@passflow/react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from 'react-router';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// PassflowFlow hands the host router's navigate to the provider. A navigation
// asked for with `replace: true` must replace the history entry, not push one.

const passflowSettingsFixture = {
  password_policy: {
    restrict_min_password_length: true,
    min_password_length: 8,
    reject_compromised: true,
    enforce_password_strength: 'average',
    require_lowercase: true,
    require_uppercase: true,
    require_number: true,
    require_symbol: true,
  },
  passkey_provider: {
    name: 'aooth.com',
    display_name: 'Aooth server',
    id_field: 'email',
    validation: 'none',
    registration: {
      user_verification: 'discouraged',
      authenticator_attachment: 'any',
      discoverable_key: 'preferred',
      attestation_metadata: 'preferred',
      extensions: null,
    },
  },
};

const appSettingsFixture = {
  id: '2uocaf41S7tOXb14wrhGTFiSErt',
  secret: '',
  active: true,
  name: 'Test App',
  description: 'Test app',
  offline: false,
  type: 'web',
  redirect_urls: null,
  origins: null,
  login_app_settings: null,
  login_app_theme: {
    template_type: 'default',
    application_name: 'Passflow',
    remove_passflow_logo: false,
    description: '',
    color_scheme: 'system',
    light_style: {
      primary_color: '#0C59DD',
      content_color: '#1E1E1E',
      background_color: '#FFFFFF',
      background_image: '',
      logo_url: '',
    },
    dark_style: {
      primary_color: '#0C59DD',
      content_color: '#1E1E1E',
      background_color: '#FFFFFF',
      background_image: '',
      logo_url: '',
    },
  },
  custom_email_templates: false,
  auth_strategies: [
    {
      strategy: {
        identity: 'email',
        challenge: 'password',
        transport: 'none',
      },
      type: 'internal',
    },
  ],
  force_passwordless_login: false,
  pkce_enabled: false,
  custom_sms_messages: null,
  registration_allowed: true,
  invite_only_registration: false,
  passwordless_registration_allowed: true,
  anonymous_registration_allowed: false,
  create_tenant_on_registration: '',
  fim_merge_by_email_allowed: true,
  debug_otp_code_allowed: false,
  debug_otp_code_for_registration: '',
};

const providerConfig = {
  url: 'https://auth.example.com',
  appId: '2uocaf41S7tOXb14wrhGTFiSErt',
  parseQueryParams: false,
};

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const body = url.includes('/app/settings') ? appSettingsFixture : passflowSettingsFixture;
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// Lives in the host router, outside the flow's routes: shows where the router is
// and how it got there, and drives the provider's navigate.
const Probe = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const { navigate } = useNavigation();
  return (
    <>
      <output data-testid='where'>{`${location.pathname}${location.search} ${navigationType}`}</output>
      <button type='button' onClick={() => navigate({ to: '/auth/signup', search: 'a=1', replace: true })}>
        replace
      </button>
      <button type='button' onClick={() => navigate({ to: '/auth/signup', search: 'a=1' })}>
        push
      </button>
    </>
  );
};

const renderInHostRouter = () =>
  render(
    <PassflowProvider {...providerConfig} router='react-router'>
      <MemoryRouter initialEntries={['/auth/signin']}>
        <Routes>
          <Route path='/auth/*' element={<PassflowFlow />} />
        </Routes>
        <Probe />
      </MemoryRouter>
    </PassflowProvider>,
  );

describe('PassflowFlow navigation through the host router', () => {
  test('replace: true replaces the history entry', async () => {
    renderInHostRouter();
    // Wait until the flow has registered the host navigate with the provider.
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/auth/signin POP'));
    await act(async () => screen.getByRole('button', { name: 'replace' }).click());
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/auth/signup?a=1 REPLACE'));
  });

  test('without replace the navigation pushes', async () => {
    renderInHostRouter();
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/auth/signin POP'));
    await act(async () => screen.getByRole('button', { name: 'push' }).click());
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/auth/signup?a=1 PUSH'));
  });
});
