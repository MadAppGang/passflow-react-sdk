import type { Page, Request } from '@playwright/test';
import { expect } from '../fixture';
import { appOrigin, corsHeaders, screen } from './enrollment-contract.helpers';
import { expectSignedIn, jwt, tokens } from './email-verification.helpers';
import { fillCredentials, setupPasswordless } from './passwordless-approval.helpers';
import {
  confirmData, failure, ok, respond, setupData, type Reply,
} from './enrollment-runtime.helpers';

export const linkToken = 'enrollment-contract-link';
export const linkSession = jwt({ type: 'two_factor_setup_session', sub: 'link-user' });
export const validationPath = '/auth/2fa-setup/' + linkToken;
export const linkBeginPath = '/user/2fa/setup/begin';
export const linkConfirmPath = '/user/2fa/setup/confirm';
export const statusPath = '/user/2fa/status';
export const linkUrl = appOrigin + '/web/two-factor-setup-magic-link/' + linkToken + '?appid=link-app';
export const validated = ok({
  session_token: linkSession, user_id: 'link-user', expires_in: 300, app_id: 'link-app',
});
export type LinkRequest = {
  method: string; path: string; authorization?: string; body: unknown;
};
const apiRequest = (request: Request) =>
  ['fetch', 'xhr'].includes(request.resourceType()) &&
  new URL(request.url()).origin !== new URL(appOrigin).origin;

// Create a real browser-persisted session through public Sign In. This avoids guessing
// core's private refresh-token key; the response includes a refresh token. The established
// public test fixture names only the access key, which we then expire.
export async function storeExpiredSession(page: Page) {
  await setupPasswordless(page, { pkce: false });
  const response = tokens();
  await page.route('**/auth/login', (route) => route.fulfill({ headers: corsHeaders, json: response }));
  // Keep priming itself deterministic if the provider looks up the authenticated user.
  await page.route('**/user/me', (route) => route.fulfill({
    headers: corsHeaders, json: { id: 'email-code-test-user', email: 'mailbox@example.com' },
  }));
  await page.goto(appOrigin + '/web/signin');
  await fillCredentials(page);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expectSignedIn(page, response);
  await page.evaluate((access) => localStorage.setItem('access', access), jwt({ type: 'access', exp: 1 }));
}

export async function linkBoundary(page: Page, options: {
  validation?: Reply;
  cookieStatus?: 200 | 401;
  holdValidation?: Promise<void>;
} = {}) {
  const requests: LinkRequest[] = [];
  page.on('request', (request) => {
    if (apiRequest(request) && request.method() !== 'OPTIONS') {
      requests.push({
        method: request.method(), path: new URL(request.url()).pathname,
        authorization: request.headers().authorization,
        body: request.postData() ? request.postDataJSON() as unknown : null,
      });
    }
  });
  // Catch every API fetch, not merely the allowed endpoints. Unexpected provider,
  // settings and refresh requests get a stubbed 403 AND fail the request-list assertion.
  await page.route('**/*', async (route) => {
    const request = route.request();
    if (!apiRequest(request) && request.method() !== 'OPTIONS') {
      await route.fallback();
      return;
    }
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const path = new URL(request.url()).pathname;
    if (path === validationPath) {
      if (options.holdValidation) await options.holdValidation;
      await respond(route, options.validation ?? validated);
    } else if (path === linkBeginPath && request.method() === 'POST') {
      await respond(route, ok(setupData()));
    } else if (path === linkConfirmPath && request.method() === 'POST') {
      await respond(route, ok(confirmData));
    } else if (path === statusPath && request.method() === 'GET') {
      await respond(route, ok({ enabled: false }));
    } else if (path === '/user/me' && options.cookieStatus) {
      await respond(route, options.cookieStatus === 200
        ? ok({ id: 'cookie-user', email: 'cookie@example.com' })
        : failure('error.unauthorized', 401));
    } else {
      await respond(route, failure('error.2fa.setup_session.restricted', 403));
    }
  });
  return requests;
}

export function assertLinkRequests(requests: LinkRequest[], options: {
  phase: 'mount' | 'confirmed'; cookieException?: boolean; validations?: number;
}) {
  const cookieRequests = requests.filter((r) => r.path === '/user/me');
  if (!options.cookieException) expect(cookieRequests).toEqual([]);
  else {
    for (const request of cookieRequests) {
      expect(request.method).toBe('GET');
      expect(request.authorization).toBeUndefined();
    }
  }
  const factor = requests.filter((r) => r.path !== '/user/me');
  const statusRequests = factor.filter((r) => r.path === statusPath);
  for (const request of statusRequests) {
    expect(request.method).toBe('GET');
    expect(request.authorization).toBe('Bearer ' + linkSession);
  }
  // status is explicitly optional in test-notes.md:47. Every other request, including
  // provider/user/settings calls, participates in this EXACT ordered-list assertion.
  expect(factor.filter((r) => r.path !== statusPath).map(({ method, path }) => ({ method, path }))).toEqual([
    ...Array.from({ length: options.validations ?? 1 }, () => ({ method: 'GET', path: validationPath })),
    ...(options.phase === 'confirmed' ? [
      { method: 'POST', path: linkBeginPath },
      { method: 'POST', path: linkConfirmPath },
    ] : []),
  ]);
  for (const request of factor) {
    if (request.path === validationPath) expect(request.authorization).toBeUndefined();
    else expect(request.authorization).toBe('Bearer ' + linkSession);
  }
}

export async function openLink(page: Page) {
  await page.goto(linkUrl);
  await expect(screen(page, 'setup-start')).toBeVisible();
}
