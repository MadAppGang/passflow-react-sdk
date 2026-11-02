import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
// Coverage map: REQ-1 (REQ-1.11), REQ-3 (REQ-3.1, REQ-3.2, REQ-3.3)
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { FieldOtp, PassflowFlow, PassflowProvider } from '@passflow/react';

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

describe('REQ-3 React Router shared peer and PassflowFlow inside a host router', () => {
  test('TEST-15 REQ-3.1 renders <PassflowFlow> inside a host <MemoryRouter> under <Route path="/auth/*"> without throwing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let container: HTMLElement | undefined;
    expect(() => {
      const rendered = render(
        <PassflowProvider {...providerConfig}>
          <MemoryRouter initialEntries={['/auth/signin']}>
            <Routes>
              <Route path="/auth/*" element={<PassflowFlow />} />
            </Routes>
          </MemoryRouter>
        </PassflowProvider>,
      );
      container = rendered.container;
    }).not.toThrow();

    expect(container?.innerHTML).not.toBe('');
    const routerTypeWarns = warnSpy.mock.calls.filter((args) => args.join(' ').includes('routerType'));
    expect(routerTypeWarns).toHaveLength(0);
  });

  test('TEST-16 REQ-3.2 logs console.warn mentioning routerType is ignored when nested in a host router and routerType is passed', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(() => {
      render(
        <PassflowProvider {...providerConfig}>
          <MemoryRouter initialEntries={['/auth/signin']}>
            <Routes>
              <Route path="/auth/*" element={<PassflowFlow routerType="memory" />} />
            </Routes>
          </MemoryRouter>
        </PassflowProvider>,
      );
    }).not.toThrow();

    const messages = warnSpy.mock.calls.map((args) => args.map(String).join(' '));
    expect(
      messages.some((msg) => /routerType/i.test(msg) && /ignore/i.test(msg)),
      `Expected console.warn to mention routerType is ignored, got: ${JSON.stringify(messages)}`,
    ).toBe(true);
  });

  test('TEST-17 REQ-3.3 renders standalone <PassflowFlow routerType="memory"> with no host router without error and without warning', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    let container: HTMLElement | undefined;
    expect(() => {
      const rendered = render(
        <PassflowProvider {...providerConfig}>
          <PassflowFlow routerType="memory" />
        </PassflowProvider>,
      );
      container = rendered.container;
    }).not.toThrow();

    expect(container?.innerHTML).not.toBe('');
    const routerTypeWarns = warnSpy.mock.calls.filter((args) => args.join(' ').includes('routerType'));
    expect(routerTypeWarns).toHaveLength(0);
  });
});

describe('REQ-1.11 FieldOtp onComplete callback', () => {
  test('TEST-11 REQ-1.11 fires onComplete once when the value reaches length characters', async () => {
    const onComplete = vi.fn();
    const user = userEvent.setup();

    const ControlledFieldOtp = () => {
      const [value, setValue] = useState('');
      return (
        <div>
          <span id="otp-label">Verification code</span>
          <FieldOtp
            id="otp-input"
            name="otp"
            length={6}
            value={value}
            onChange={setValue}
            onComplete={onComplete}
            labelledBy="otp-label"
          />
        </div>
      );
    };

    render(<ControlledFieldOtp />);

    const input = screen.getByRole('textbox', { name: 'Verification code' });
    await user.type(input, '12345');
    expect(onComplete).not.toHaveBeenCalled();

    await user.type(input, '6');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith('123456');
  });
});
