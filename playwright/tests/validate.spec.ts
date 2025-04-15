import { expect, test } from '../fixture';
import path from 'node:path';

test.describe('validate email', () => {
  test('validate email with all params', async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    const allParams = {
      identity: 'email',
      identity_value: 'testuser@test.com',
      create_tenant: 'false',
      challenge_type: 'otp',
      challenge_id: 'some-challenge-id',
      type: 'passwordless',
      app_id: '123',
      otp: '123456',
    };
    const params = new URLSearchParams();

    for (const key of Object.keys(allParams)) {
      params.set(key, allParams[key as keyof typeof allParams]);
    }

    await page.goto(`http://localhost:5173/web/verify-challenge-otp?${params.toString()}`);

    await expect(page.getByText('Invalid search params', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });

  test('validate via redirect url', async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/verify-challenge-otp?app_id=123&otp=123456&challenge_id=123');

    await expect(page.getByText('challenge not found!', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
