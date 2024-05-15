import { expect, test } from '../fixture';

test.describe('validate email', () => {
  test('validate email with all params', async ({ page }) => {
    const allParams = {
      identity: 'email',
      identity_value: 'testuser@test.com',
      create_tenant: 'false',
      challenge_type: 'otp',
      challenge_id: 'some-challenge-id',
      type: 'passwordless',
    };
    const params = new URLSearchParams();

    Object.keys(allParams).forEach((key) => params.set(key, allParams[key as keyof typeof allParams]));

    await page.goto(`/web/verify-challenge-otp?${params.toString()}`);

    await expect(page).toHaveTitle(/Aooth/);
    await expect(page.getByText('Verify your email', { exact: true })).toBeVisible();
    await expect(page.getByText('We sent OTP code to your email address', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'testuser@test.com' })).toBeVisible();
    await expect(page.locator('div#otp-wrapper')).toBeVisible();

    const otpInputsCount = await page.locator('input.aooth-field-otp').count();
    expect(otpInputsCount).toBe(6);
  });

  test('validate via redirect url', async ({ page }) => {
    await page.goto('/web/verify-challenge-otp?app_id=123&otp=123456&challenge_id=123');

    await expect(page).toHaveTitle(/Aooth/);
  });
});
