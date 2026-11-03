import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '../fixture';
import appSettings from './responses/app-settings-default.json';

export const appOrigin = 'http://localhost:5173';
export const successUrl = `${appOrigin}/email-verification-complete`;
export const prompt = 'We sent a code to a***@example.com.';
export const password = 'Str0ngPassword!724';

export const jwt = (claims: Record<string, unknown>) => [
  Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ sub: 'email-code-test-user', exp: 4102444800, ...claims })).toString('base64url'),
  'signature',
].join('.');

export const tokens = () => ({
  access_token: jwt({ type: 'access', scopes: ['openid', 'email'] }),
  refresh_token: jwt({ type: 'refresh' }),
  id_token: jwt({ type: 'id_token', email: 'mailbox@example.com' }),
  token_type: 'Bearer',
  expires_in: 3600,
});

export const codeStep = (challengeId = 'challenge-original') => ({
  challenge_id: challengeId,
  email_verification_required: true,
  message: prompt,
});

export const errorBody = (id: string, message: string, status: number, location: string) => ({
  error: { id, message, status, location, time: '2026-11-03T18:00:00Z' },
});

export const setupEmailFlow = async (page: Page) => {
  await page.route('**/settings', (route) =>
    route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') }));
  await page.route('**/app/settings', (route) => route.fulfill({
    json: { ...appSettings, pkce_enabled: false, defaults: { redirect: successUrl } },
  }));
  await page.route(`${successUrl}**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>Authentication complete</h1>' }));
};

export type CredentialFlow = 'signup' | 'signin';
export const endpointFor = (flow: CredentialFlow) => flow === 'signup' ? '/auth/register' : '/auth/login';

export const submitCredentials = async (page: Page, flow: CredentialFlow) => {
  await page.goto(`${appOrigin}/web/${flow}`);
  await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: flow === 'signup' ? 'Sign Up' : 'Sign In', exact: true }).click();
};

export const codeInput = (page: Page) => page.getByRole('textbox', { name: prompt, exact: true });

export const expectSignedIn = async (page: Page, response: ReturnType<typeof tokens>) => {
  await expect(page).toHaveURL((url) =>
    url.origin === appOrigin && url.pathname === '/email-verification-complete');
  await expect(page.getByRole('heading', { name: 'Authentication complete' })).toBeVisible();
  // Existing invitation tests establish "access" as the browser session key.
  await expect.poll(() => page.evaluate(() => localStorage.getItem('access'))).toBe(response.access_token);
  expect(decodeURIComponent(page.url())).toContain(response.access_token);
};

export const waitForResend = async (page: Page) => {
  // Callers install page.clock before navigation, before the cooldown timers start.
  const resend = page.getByRole('button', { name: /^Resend code(?:\s+\(\d+\))?$/ });
  await expect(resend).toBeDisabled();
  // runFor executes every interval tick; fastForward can coalesce recurring ticks.
  await page.clock.runFor(30_000);
  await expect(resend).toBeEnabled();
  return resend;
};
