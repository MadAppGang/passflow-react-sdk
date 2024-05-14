import { expect, test } from '../fixture';

test.describe('validate email', () => {
  test('validate show error when no challenge_id in params', async ({ page }) => {
    await page.goto('/web/verify-challenge-otp');
    await expect(page).toHaveTitle(/Aooth/);
  });
});
