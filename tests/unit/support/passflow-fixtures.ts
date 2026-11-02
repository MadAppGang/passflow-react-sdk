import { vi } from 'vitest';

// Settings the provider fetches on mount, and the browser APIs jsdom lacks, for tests
// that render PassflowProvider with PassflowFlow.

export const passflowSettingsFixture = {
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

export const appSettingsFixture = {
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

export const providerConfig = {
  url: 'https://auth.example.com',
  appId: '2uocaf41S7tOXb14wrhGTFiSErt',
  parseQueryParams: false,
};

/** Call in beforeEach; undo with vi.unstubAllGlobals(). */
const fixtureFor = (url: string) => (url.includes('/app/settings') ? appSettingsFixture : passflowSettingsFixture);

/**
 * @passflow/core talks through axios, which picks XHR in jsdom and would reach the
 * network. This answers every request after a tick, as the fetch stub does.
 */
class FakeXMLHttpRequest {
  static readonly DONE = 4;
  readyState = 0;
  status = 0;
  statusText = '';
  responseURL = '';
  responseType = '';
  response: unknown = null;
  responseText = '';
  timeout = 0;
  withCredentials = false;
  upload = { addEventListener: () => undefined };
  onloadend: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  private url = '';
  open(_method: string, url: string) {
    this.url = url;
    this.readyState = 1;
  }
  setRequestHeader() {}
  getAllResponseHeaders() {
    return 'content-type: application/json\r\n';
  }
  addEventListener() {}
  removeEventListener() {}
  abort() {}
  send() {
    setTimeout(() => {
      this.readyState = 4;
      this.status = 200;
      this.statusText = 'OK';
      this.responseURL = this.url;
      this.responseText = JSON.stringify(fixtureFor(this.url));
      this.response = this.responseText;
      this.onreadystatechange?.();
      this.onloadend?.();
    }, 0);
  }
}

export const stubBrowserApis = () => {
  vi.stubGlobal('XMLHttpRequest', FakeXMLHttpRequest);

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
      const body = fixtureFor(url);
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
};
