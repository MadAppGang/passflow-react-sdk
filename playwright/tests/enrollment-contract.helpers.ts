import type { Page, Route } from '@playwright/test';
import { expect } from '../fixture';
import { jwt } from './email-verification.helpers';
import { appOrigin, errorBody, fillCredentials, setupPasswordless } from './passwordless-approval.helpers';

export { appOrigin };
export const statePath = '/auth/2fa/enrollment';
export const overCopy = 'Your sign-in has ended. Sign in again.';
export const rateCopy = 'Too many attempts. Sign in again later.';
export const unavailableCopy =
  'Two-factor authentication cannot be set up for your account here. Contact your administrator.';

// These ids identify screens, not private DOM structure (contract/test-notes.md:6).
export const screen = (page: Page, id: string) => page.getByTestId('two-factor-' + id);
export const corsHeaders = {
  'access-control-allow-origin': appOrigin,
  'access-control-allow-credentials': 'true',
  // Let core read the mocked retry-after: 0 rather than taking its 7s GET backoff.
  'access-control-expose-headers': 'retry-after',
  'access-control-allow-headers': 'authorization, content-type, x-csrf-token',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

export async function onState(page: Page, respond: (route: Route) => Promise<void>) {
  await page.route('**/auth/2fa/enrollment', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await respond(route);
  });
}

export async function failState(route: Route, id: string, status: number) {
  await route.fulfill({
    status,
    headers: corsHeaders,
    json: errorBody(id, 'Private translated diagnostic', status, statePath),
  });
}

export async function installEnrollmentBoundary(page: Page, digits = 6) {
  await setupPasswordless(page, { pkce: false });
  const requests: Array<{ method: string; path: string }> = [];
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/auth/2fa/')) requests.push({ method: request.method(), path });
  });
  // Deny all unconfigured factor endpoints instead of falling through to a live API.
  await page.route('**/auth/2fa/**', async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    await failState(route, 'error.not.implemented', 501);
  });
  const tfaToken = jwt({ type: 'tfa', challenge_id: 'enrollment-contract-factor' });
  await page.route('**/auth/login', (route) => route.fulfill({
    headers: corsHeaders,
    json: { requires_2fa: true, tfa_token: tfaToken, challenge_id: 'enrollment-contract-factor', totp_digits: digits },
  }));
  return { requests, tfaToken };
}

export async function signInToFactor(page: Page, search = '') {
  await page.goto(appOrigin + '/web/signin' + search);
  await fillCredentials(page);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/two-factor-verify');
}

export function expectReadOnly(requests: Array<{ method: string; path: string }>, count: number) {
  // External HTTP behavior, not calls to a hook/core mock.
  expect(requests.filter((request) => request.method !== 'OPTIONS')).toEqual(
    Array.from({ length: count }, () => ({ method: 'GET', path: statePath })),
  );
}
