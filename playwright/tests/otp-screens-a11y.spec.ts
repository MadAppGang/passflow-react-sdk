import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

// The OTP field on a real screen must be named by text the user can see, also
// while the screen shows a wrong-code error (axe `label-title-only`).

const mockSettings = async (page: Page) => {
  await page.route('**/settings', async (route) => {
    await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
  });
  await page.route('**/app/settings', async (route) => {
    await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
  });
};

const expectNoViolations = async (page: Page) => {
  const audit = await new AxeBuilder({ page }).include('#otp-wrapper').analyze();
  expect(audit.passes.length, 'the audit must evaluate the OTP field').toBeGreaterThan(0);
  expect(audit.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
};

test.describe('passwordless OTP screen', () => {
  const url =
    'http://localhost:5173/web/verify-challenge-otp?email=testuser%40test.com&challenge_id=some-challenge-id&challenge_type=otp&type=passwordless';

  test('names the code field with visible text, before and after a wrong code', async ({ page }) => {
    await mockSettings(page);
    await page.route('**/auth/passwordless/complete', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { id: 'error.otp.invalid', message: 'Invalid code' } }),
      });
    });

    await page.goto(url);
    const field = page.getByRole('textbox', { name: 'Verification code' });
    await expect(field).toBeVisible();
    await expect(page.locator('#otp-wrapper').getByText('Verification code', { exact: true })).toBeVisible();
    await expectNoViolations(page);

    await field.fill('123456');
    await expect(page.locator('.passflow-verify-otp-error-text')).toBeVisible();
    await expectNoViolations(page);
  });
});
