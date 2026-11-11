import path from 'node:path';
import { expect, test } from '../fixture';

test.describe('magic link sent screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });
  });

  test('tells the user to open the link without mentioning registration', async ({ page }) => {
    await page.goto(
      'http://localhost:5173/web/verify-challenge-magic-link?email=jack%40example.com&challenge_type=magic_link&type=passwordless',
    );

    const text = page.locator('.passflow-verify-challenge-magic-link-text');
    await expect(text).toBeVisible();
    await expect(text).not.toContainText('registration');
    await expect(text).toHaveText('We sent a link to email address jack@example.com. Open the link to continue.');
  });
});
