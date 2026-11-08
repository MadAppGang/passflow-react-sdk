import { SERVICE_UNAVAILABLE_MESSAGE } from '@passflow/core';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';
import { approvalUrl, info, MATCH_CODE, OTP, reject, setupPasswordless } from './passwordless-approval.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

const signIn = (page: Page) => page.getByRole('button', { name: 'Sign in', exact: true });
const notMe = (page: Page) => page.getByRole('button', { name: "This wasn't me", exact: true });

test('REQ-5 REQ-18 approval never auto-validates, shows context without identity, and signs in only after one explicit click', async ({
  page,
}) => {
  await setupPasswordless(page);
  const decides: Record<string, unknown>[] = [];
  const forbidden: string[] = [];
  page.on('request', (request) => {
    if (/\/auth\/(passwordless\/complete|validate|pkce_exchange)$/.test(new URL(request.url()).pathname))
      forbidden.push(request.url());
  });
  await page.route('**/auth/passwordless/approval/info', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ challenge_id: 'approval-row' });
    await route.fulfill({ json: info() });
  });
  await page.route('**/auth/passwordless/approval/decide', async (route) => {
    decides.push(route.request().postDataJSON());
    await route.fulfill({ json: { state: 'approved' } });
  });
  await page.goto(approvalUrl({ identity: 'email', identity_value: 'mailbox@example.com' }));
  await expect(page.getByText('Acme Portal', { exact: false })).toBeVisible();
  await expect(page.getByText('Chrome', { exact: false })).toBeVisible();
  await expect(page.getByText('macOS', { exact: false })).toBeVisible();
  await expect(page.getByText('Lisbon', { exact: false })).toBeVisible();
  await expect(page.getByText('Portugal', { exact: false })).toBeVisible();
  // Locale and timezone fixed above; exact formatting is deliberately not specified for runtime.
  await expect(page.getByText(/2026/)).toBeVisible();
  await expect(page.getByText(/mailbox@example.com|non-default-app@example.com/)).toHaveCount(0);
  await expect(page.getByText(MATCH_CODE, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.locator('input[name="match_code"]')).toHaveCount(0);
  await expect(signIn(page)).toBeEnabled();
  await expect(notMe(page)).toBeEnabled();
  expect(decides).toEqual([]);

  await signIn(page).click();
  await expect(page.getByText('Approved. Return to the tab that started sign-in. You can close this tab.')).toBeVisible();
  expect(decides).toEqual([{ challenge_id: 'approval-row', otp: OTP, approve: true }]);
  expect(forbidden).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('access'))).toBeNull();
});

test("REQ-5 REQ-6 This wasn't me denies in one click and never signs anyone in", async ({ page }) => {
  await setupPasswordless(page);
  await page.route('**/auth/passwordless/approval/info', (route) => route.fulfill({ json: info() }));
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/auth/passwordless/approval/decide', async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ json: { state: 'denied' } });
  });
  await page.goto(approvalUrl());
  await notMe(page).click();
  await expect(page.getByText('Denied. No one was signed in. You can close this tab.')).toBeVisible();
  expect(bodies).toEqual([{ challenge_id: 'approval-row', otp: OTP, approve: false }]);
  expect(await page.evaluate(() => localStorage.getItem('access'))).toBeNull();
});

test('REQ-6 both answers are locked while one is in flight', async ({ page }) => {
  await setupPasswordless(page);
  await page.route('**/auth/passwordless/approval/info', (route) => route.fulfill({ json: info() }));
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let decisions = 0;
  await page.route('**/auth/passwordless/approval/decide', async (route) => {
    decisions += 1;
    await held;
    await route.fulfill({ json: { state: 'approved' } });
  });
  await page.goto(approvalUrl());
  await signIn(page).click();
  await expect(page.getByTestId('passwordless-approval')).toHaveAttribute('aria-busy', 'true');
  await expect(signIn(page)).toBeDisabled();
  await expect(notMe(page)).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Sending your answer…' })).toBeVisible();
  release();
  await expect(page.getByText('Approved. Return to the tab that started sign-in. You can close this tab.')).toBeVisible();
  expect(decisions).toBe(1);
});

const terminalErrors = [
  ['error.auth.passwordless.approval.invalid', 400, 'This link is not valid. Start again from the page where you signed in.'],
  ['error.auth.passwordless.approval.unavailable', 400, 'This sign-in cannot be approved here. Start again.'],
  ['error.otp.expired', 400, 'This link expired. Start again.'],
  ['error.otp.already.used', 409, 'This sign-in was already decided.'],
  ['error.auth.passwordless.approval.attempts', 400, 'Too many wrong codes. This sign-in was denied. Start again.'],
] as const;
for (const [id, status, message] of terminalErrors) {
  for (const phase of ['info', 'decide'] as const) {
    test(`REQ-6 ${phase} · ${id} · shows exact terminal copy with no live approval form`, async ({ page }) => {
      await setupPasswordless(page);
      await page.route('**/auth/passwordless/approval/info', (route) =>
        phase === 'info' ? reject(route, id, status) : route.fulfill({ json: info() }),
      );
      await page.route('**/auth/passwordless/approval/decide', (route) => reject(route, id, status));
      await page.goto(approvalUrl());
      if (phase === 'decide') await signIn(page).click();
      await expect(page.getByText(message, { exact: true })).toBeVisible();
      await expect(signIn(page)).toHaveCount(0);
      await expect(notMe(page)).toHaveCount(0);
    });
  }
}

for (const state of ['approved', 'denied', 'completed', 'expired'] as const) {
  test(`REQ-6 info state ${state} is terminal on load without decide`, async ({ page }) => {
    await setupPasswordless(page);
    let decisions = 0;
    await page.route('**/auth/passwordless/approval/info', (route) => route.fulfill({ json: info({ state }) }));
    await page.route('**/auth/passwordless/approval/decide', async (route) => {
      decisions += 1;
      await route.fulfill({ json: { state: 'approved' } });
    });
    await page.goto(approvalUrl());
    await expect(
      page.getByText(state === 'expired' ? 'This link expired. Start again.' : 'This sign-in was already decided.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(signIn(page)).toHaveCount(0);
    expect(decisions).toBe(0);
  });
}

for (const failure of ['network', 'server'] as const) {
  test(`REQ-6 ${failure} decision failure is announced and keeps both answers available`, async ({ page }) => {
    await setupPasswordless(page);
    await page.route('**/auth/passwordless/approval/info', (route) => route.fulfill({ json: info({ location: null }) }));
    await page.route('**/auth/passwordless/approval/decide', (route) =>
      failure === 'network' ? route.abort('failed') : reject(route, 'error.server', 500),
    );
    await page.goto(approvalUrl());
    await signIn(page).click();
    await expect(page.getByRole('alert')).toHaveText(
      failure === 'network' ? SERVICE_UNAVAILABLE_MESSAGE : 'Something went wrong. Try again later.',
    );
    await expect(signIn(page)).toBeEnabled();
    await expect(notMe(page)).toBeEnabled();
    await expect(page.getByText('Lisbon', { exact: false })).toHaveCount(0);
  });
}
