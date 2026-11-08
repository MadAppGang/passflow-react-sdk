import type { Page, Route } from '@playwright/test';
import { expect } from '../fixture';
import { appOrigin, errorBody, password, successUrl, tokens } from './email-verification.helpers';
import appSettings from './responses/app-settings-default.json';
import settings from './responses/passflow-settings.json';

export { appOrigin, errorBody, password, successUrl, tokens };
export const MATCH_CODE = '4821';
export const OTP = '613907';
/** The waiting tab's instruction. It shows no number: the start answer's `match_code` only marks this tab as the starter. */
export const WAITING_COPY = 'Open the link we sent on any device and choose Sign in.';
export const expiresAt = '2099-11-04T17:12:00Z';
export const info = (overrides: Record<string, unknown> = {}) => ({
  state: 'pending',
  app_name: 'Acme Portal',
  requested_at: '2026-11-04T16:42:00Z',
  expires_at: expiresAt,
  browser: 'Chrome',
  os: 'macOS',
  location: { city: 'Lisbon', country: 'Portugal' },
  attempts_left: 5,
  ...overrides,
});

export const setupPasswordless = async (page: Page, options: { pkce?: boolean; magic?: boolean; createTenant?: boolean } = {}) => {
  await page.route('**/auth/redirect/check', (route) =>
    route.fulfill({ json: { redirect_url: route.request().postDataJSON().redirect_url } }),
  );
  await page.route('**/settings', (route) => route.fulfill({ json: settings }));
  await page.route('**/settings/password', (route) => route.fulfill({ json: settings.password_policy }));
  await page.route('**/app/settings', (route) =>
    route.fulfill({
      json: {
        ...appSettings,
        active: true,
        pkce_enabled: options.pkce ?? true,
        force_passwordless_login: false,
        defaults: { redirect: successUrl, create_tenant_for_new_user: options.createTenant },
        auth_strategies: [
          { strategy: { identity: 'email', challenge: 'password', transport: 'none' }, type: 'internal' },
          {
            strategy: { identity: 'email', challenge: options.magic === false ? 'otp' : 'magic_link', transport: 'email' },
            type: 'internal',
          },
        ],
      },
    }),
  );
  await page.route(`${successUrl}**`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>Authentication complete</h1>',
    }),
  );
};

export const fillCredentials = async (page: Page) => {
  await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
  await page.getByLabel('Password', { exact: true }).fill(password);
};

export const beginMagicLink = async (page: Page, flow: 'signin' | 'signup' = 'signin', search = '') => {
  await page.goto(`${appOrigin}/web/${flow}${search}`);
  await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
  await page.getByRole('button', { name: new RegExp(`^Sign ${flow === 'signup' ? 'Up' : 'In'} with email link$`) }).click();
};

export const approvalUrl = (extra: Record<string, string> = {}) =>
  `${appOrigin}/web/verify-challenge-otp?${new URLSearchParams({
    app_id: 'non-default-app',
    challenge_id: 'approval-row',
    otp: OTP,
    flow: 'approval',
    ...extra,
  })}`;

export const reject = (route: Route, id: string, status = 400) =>
  route.fulfill({
    status,
    json: errorBody(id, 'Do not expose server diagnostics', status, new URL(route.request().url()).pathname),
  });

export const noSecretInUrl = (url: URL) => {
  expect([...url.searchParams.keys()].map((key) => key.toLowerCase())).not.toContain('match_code');
  expect(url.href).not.toContain(MATCH_CODE);
  expect([...url.searchParams.keys()]).not.toContain('code_challenge');
};

export const expectWaitingWithoutCode = async (page: Page) => {
  await expect(page.getByText(WAITING_COPY, { exact: true })).toBeVisible();
  await expect(page.getByTestId('passwordless-match-code')).toHaveCount(0);
  await expect(page.getByText(MATCH_CODE, { exact: true })).toHaveCount(0);
};
