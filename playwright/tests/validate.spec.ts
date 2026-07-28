import path from 'node:path';
import { expect, test } from '../fixture';

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

    await expect(
      page.getByText('This verification link is invalid or incomplete. Request a new link or code and try again.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('Invalid search params', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });

  test('validate via redirect url', async ({ page }) => {
    await page.route('**/auth/passwordless/complete', async (route) => {
      await route.fulfill({
        status: 404,
        json: {
          error: {
            id: 'error.challenge.not_found',
            message: 'challenge not found!',
            status: 404,
            location: '/auth/passwordless/complete',
            time: '2026-07-17T00:00:00Z',
          },
        },
      });
    });
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/verify-challenge-otp?app_id=123&otp=123456&challenge_id=123');

    await expect(
      page.getByText('This verification request is no longer available. Start again to request a new link or code.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByText('challenge not found!', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
