import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // We have a few cases where we need our app to know it's running in Playwright.
    // This is inspired by Cypress that auto-injects window.Cypress.
    await page.addInitScript(() => {
      (window as Window & { Playwright?: boolean }).Playwright = true;
    });
    await page.emulateMedia({ reducedMotion: 'reduce' });

    // add all mock tests
    await page.route('**/settings/password', async (route) => {
      await route.fulfill({
        json: {
          restrict_min_password_length: true,
          min_password_length: 8,
          reject_compromised: true,
          enforce_password_strength: 'average',
          require_lowercase: true,
          require_uppercase: true,
          require_number: true,
          require_symbol: true,
        },
      });
    });
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/aooth-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings.json' });
    });

    await use(page);
  },
});
export { expect } from '@playwright/test';
