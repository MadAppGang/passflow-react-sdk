import { expect, test } from '../fixture';
import {
  appOrigin, codeInput, codeStep, errorBody, expectSignedIn, jwt, password,
  setupEmailFlow, successUrl, tokens,
} from './email-verification.helpers';

const resetToken = (continuation: boolean) => jwt({
  type: 'password_reset',
  ...(continuation ? { registration_continuation: 'mailbox' } : {}),
});

test.beforeEach(async ({ page }) => {
  await setupEmailFlow(page);
});

for (const continuation of [true, false]) {
  const kind = continuation ? 'continuation' : 'ordinary reset';
  const submitLabel = continuation ? 'Create account' : 'Save new password';

  test(`REQ-8 REQ-9 ${kind}: a valid password signs in and redirects instead of only reporting changed`, async ({ page }) => {
    const grant = resetToken(continuation);
    const response = tokens();
    await page.route('**/auth/password/change', (route) => route.fulfill({ json: response }));
    await page.goto(`${appOrigin}/web/password/reset?token=${grant}`);
    await expect(page.getByRole('heading', { name: continuation ? 'Create your password' : 'Reset password' })).toBeVisible();
    await page.locator('#password').fill(password);
    const request = page.waitForRequest('**/auth/password/change');
    await page.getByRole('button', { name: submitLabel, exact: true }).click();

    const change = await request;
    expect(change.method()).toBe('POST');
    expect(change.postDataJSON()).toMatchObject({ password });
    await expectSignedIn(page, response);
  });

  // Migrated from src/components/form/reset-password/__tests__/reset-password-second-factor.test.tsx.
  test(`REQ-9 ${kind}: a second factor goes to the 2FA page, never the success redirect`, async ({ page }) => {
    const redirects: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith(successUrl)) redirects.push(request.url());
    });
    await page.route('**/auth/password/change', (route) => route.fulfill({
      json: { tfa_token: 'reset-second-factor', requires_2fa: true },
    }));
    await page.goto(`${appOrigin}/web/password/reset?token=${resetToken(continuation)}`);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: submitLabel, exact: true }).click();
    await expect(page).toHaveURL(/\/web\/two-factor-verify(?:\?|$)/);
    expect(redirects).toEqual([]);
  });
}

for (const action of ['verify', 'back'] as const) {
  test(`REQ-10 reset code step has no resend and supports ${action}`, async ({ page }) => {
    const response = tokens();
    const grant = resetToken(true);
    await page.route('**/auth/password/change', (route) => route.fulfill({ json: codeStep('reset-challenge') }));
    await page.route('**/auth/validate', (route) => route.fulfill({ json: response }));
    await page.goto(`${appOrigin}/web/password/reset?token=${grant}`);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();

    await expect(codeInput(page)).toBeVisible();
    await expect(page.getByRole('button', { name: /Resend code/ })).toHaveCount(0);
    await expect(page).toHaveURL(`${appOrigin}/web/password/reset?token=${grant}`);
    if (action === 'verify') {
      const request = page.waitForRequest('**/auth/validate');
      await codeInput(page).fill('123456');
      expect((await request).postDataJSON()).toMatchObject({ challenge_id: 'reset-challenge', otp: '123456' });
      await expectSignedIn(page, response);
    } else {
      await page.getByRole('button', { name: 'Back to sign in' }).click();
      await expect(page).toHaveURL(/\/web\/signin(?:\?|$)/);
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
    }
  });
}

test('REQ-17 password/change 429 says the password was saved and to try again later', async ({ page }) => {
  const raw = 'Unhelpful internal rate-limit detail.';
  await page.route('**/auth/password/change', (route) => route.fulfill({
    status: 429, json: errorBody('error.verification.code.rate_limited', raw, 429, '/auth/password/change'),
  }));
  await page.goto(`${appOrigin}/web/password/reset?token=${resetToken(true)}`);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  // The contract fixes the meaning, not an alert role or an exact heading.
  // A status screen may repeat "password saved" in its heading and detail.
  const hasVisibleText = async (pattern: RegExp) => {
    for (const match of await page.getByText(pattern).all()) {
      if (await match.isVisible()) return true;
    }
    return false;
  };
  await expect.poll(() => hasVisibleText(/password.*(saved|changed)/i)).toBe(true);
  await expect.poll(() => hasVisibleText(/(?:try|wait).*(?:again|later|minutes)/i)).toBe(true);
  await expect(page.getByText(raw, { exact: true })).toHaveCount(0);
  expect(page.url()).not.toContain(successUrl);
});

test('REQ-17 reset failure uses safe copy and unlocks the form for a retry', async ({ page }) => {
  const raw = 'Database or reset grant implementation detail.';
  await page.route('**/auth/password/change', (route) => route.fulfill({
    status: 500, json: errorBody('error.unlisted', raw, 500, '/auth/password/change'),
  }));
  await page.goto(`${appOrigin}/web/password/reset?token=${resetToken(false)}`);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Save new password', exact: true }).click();

  await expect(page.getByRole('alert')).toHaveText("We couldn't save your password. Try again.");
  await expect(page.getByText(raw, { exact: true })).toHaveCount(0);
  await expect(page.locator('#password')).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Save new password', exact: true })).toBeEnabled();
});
