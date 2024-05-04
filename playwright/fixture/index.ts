import { test as base } from "@playwright/test";
    
export const test = base.extend({
  page: async ({ baseURL, page }, use) => {
    // We have a few cases where we need our app to know it's running in Playwright.
    // This is inspired by Cypress that auto-injects window.Cypress.
    await page.addInitScript(() => {
      (window as any).Playwright = true;
    });

    // add all mock tests
    await page.route('**/settings', async route => {
      await route.fulfill({ path: './tests/responses/aooth-settings.json' });
    });
    await page.route('**/app/settings', async route => {
      await route.fulfill({ path: './tests/responses/app-settings.json' });
    });

    use(page);
  },
});
export { expect } from "@playwright/test";