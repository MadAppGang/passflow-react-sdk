import type { Page, Route } from '@playwright/test';
import { expect } from '../fixture';
import {
  corsHeaders, expectReadOnly, installEnrollmentBoundary, onState, screen, signInToFactor,
} from './enrollment-contract.helpers';
import { errorBody } from './passwordless-approval.helpers';
import { tokens } from './email-verification.helpers';

export const paths = {
  read: '/auth/2fa/enrollment',
  send: '/auth/2fa/enrollment/email-link',
  begin: '/auth/2fa/setup/begin',
  confirm: '/auth/2fa/setup/confirm',
  verify: '/auth/2fa/verify',
};
export const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
export const replacementSecret = 'NEWSECRETNEWSECRET';
export const qr = 'iVBORw0KGgoAAAANSUhEUgAAABkAAAAZAQAAAADskrjOAAAAfUlEQVR42mNgZDnAwFArFM/A4PruIgODSyeIqAMSNQZAMYaPQNkFd2QbGCrTzBkY5h1Sa2B4aO7fwFD1nbmBIddIo4FhR8+TBoYrJ7gYGCS9dzAwuDNeAOqQn9bAwPhHHmiymA3Q5EVngMQLpgYGl4OeDQy1KaYMDIwMTxgASlUlaQXOc6AAAAAASUVORK5CYII=';
export const setupData = (overrides: Record<string, unknown> = {}) => ({
  secret, qr_code: qr, qr_code_url: '', totp_digits: 6, ...overrides,
});
export const recoveryCodes = ['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6'];
export const confirmData = { enabled: true, recovery_codes: recoveryCodes };
export const genericCopy = 'Something went wrong. Try again.';
export const wrongCopy = 'Invalid code. Please check your authenticator app and try again.';
export const changedCopy = 'Your setup code changed. Scan this new QR code.';
export const staleCopy = 'Your setup is saved. Enter a new code from your authenticator app to finish signing in.';
export const savedOverCopy = 'Your setup is saved. Sign in again.';
export const sendFailedCopy = 'We could not send the setup email. Try again later or contact your administrator.';
export const checkEmailCopy = 'Check your email for a link to set up two-factor authentication. After you set it up, sign in again.';

export type Reply = { status?: number; json: unknown };
export const failure = (id: string, status: number): Reply => ({
  status, json: errorBody(id, 'Private translated server diagnostic', status, ''),
});
export const rawRateLimit: Reply = {
  status: 429, json: { error: 'Too many requests. Try again in 15 minutes.' },
};
export const ok = (json: unknown): Reply => ({ json });
export const respond = (route: Route, reply: Reply) =>
  route.fulfill({ ...reply, headers: { ...corsHeaders, 'retry-after': '0' } });

export async function endpoint(
  page: Page, path: string, replies: Reply[] | ((index: number) => Reply),
) {
  let count = 0;
  await page.route('**' + path, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders });
      return;
    }
    const index = count++;
    const reply = typeof replies === 'function' ? replies(index) : replies[Math.min(index, replies.length - 1)];
    await respond(route, reply as Reply);
  });
}

export async function runtime(page: Page, initial: 'verify' | 'email_link' | 'direct' | 'unavailable', digits = 6) {
  const boundary = await installEnrollmentBoundary(page, digits);
  const posts: Array<{ path: string; body: Record<string, unknown>; authorization?: string }> = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.startsWith('/auth/2fa/')) {
      posts.push({
        path: new URL(request.url()).pathname,
        body: request.postDataJSON() as Record<string, unknown>,
        authorization: request.headers().authorization,
      });
    }
  });
  // Contract: enrollment reads return {enrollment}; digits come from login and begin.
  await onState(page, (route) => respond(route, ok({ enrollment: initial })));
  await endpoint(page, paths.send, [ok({ email_sent: true })]);
  await endpoint(page, paths.begin, [ok(setupData({ totp_digits: digits }))]);
  await endpoint(page, paths.confirm, [ok(confirmData)]);
  await endpoint(page, paths.verify, [ok(tokens())]);
  return {
    ...boundary, posts,
    count: (path: string) => boundary.requests.filter((r) => r.path === path && r.method !== 'OPTIONS').length,
    readOnly: () => expectReadOnly(boundary.requests, 1),
  };
}

export async function land(page: Page, state: 'verify' | 'email_link' | 'direct' | 'unavailable') {
  await signInToFactor(page);
  await expect(screen(page, state === 'direct' ? 'setup-start' : state.replace('_', '-'))).toBeVisible();
}
export async function begin(page: Page) {
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await expect(screen(page, 'setup-code')).toBeVisible();
}
export async function enterSetupCode(page: Page, code = '123456') {
  const input = screen(page, 'setup-code').getByRole('textbox');
  // Clear with an actual user edit: a full input-otp selects its last digit on focus.
  await input.focus();
  await input.press('ControlOrMeta+A');
  await input.press('Backspace');
  await input.fill(code);
  await page.getByRole('button', { name: 'Confirm & Enable', exact: true }).click();
}
export async function showCodes(page: Page, code = '123456') {
  await begin(page);
  await enterSetupCode(page, code);
  await expectCodes(page);
}
export async function expectCodes(page: Page) {
  await expect(screen(page, 'recovery-codes')).toBeVisible();
  await expect(screen(page, 'recovery-codes').getByRole('listitem')).toHaveText(recoveryCodes);
}
export const finish = (page: Page) => page.getByRole('button', { name: "I've Saved These Codes", exact: true }).click();
export async function noSetupLink(page: Page) {
  await expect(page.getByRole('link', { name: /^Set Up 2FA$/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Set Up 2FA$/i })).toHaveCount(0);
}
