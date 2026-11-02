// Coverage map: REQ-2 (REQ-2.1, REQ-2.2, REQ-2.3)
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

const storybookUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6107';

const openStory = async (page: Page, id: string) => {
  await page.goto(`${storybookUrl}/iframe.html?id=components-loginscreen--${id}&viewMode=story`);
  const storyRoot = page.locator('#storybook-root');
  await expect(storyRoot).toBeVisible();
  await expect(storyRoot).not.toBeEmpty();
  return storyRoot;
};

test.describe('REQ-2 LoginScreen customCss injection without react-helmet-async', () => {
  const expectedCustomCss = '.passflow-form-title { letter-spacing: 0.04em; text-transform: uppercase; }';

  test('TEST-12 REQ-2.1 LoginScreen · CustomBrand · renders <style class="psfw-custom-styles" data-passflow-style-layer="custom"> inside #passflow-wrapper and not in document.head', async ({
    page,
  }) => {
    await openStory(page, 'custom-brand');

    const wrapper = page.locator('#passflow-wrapper');
    await expect(wrapper).toBeVisible();

    const styleInWrapper = wrapper.locator('style.psfw-custom-styles[data-passflow-style-layer="custom"]');
    await expect(styleInWrapper).toHaveCount(1);
    const styleText = await styleInWrapper.evaluate((el) => el.textContent ?? '');
    expect(styleText.trim()).toBe(expectedCustomCss);

    // Must NOT be rendered in document.head (react-helmet-async removed)
    const styleInHead = page.locator('head style[data-passflow-style-layer="custom"], head style.psfw-custom-styles');
    await expect(styleInHead).toHaveCount(0);
  });

  test('TEST-13 REQ-2.2 LoginScreen · CustomBrand · applies custom CSS so the form title has computed text-transform uppercase', async ({
    page,
  }) => {
    await openStory(page, 'custom-brand');

    const formTitle = page.locator('.passflow-form-title');
    await expect(formTitle).toBeVisible();
    await expect(formTitle).toHaveCSS('text-transform', 'uppercase');
  });

  test('TEST-14 REQ-2.3 LoginScreen · stories without customCss · render no data-passflow-style-layer="custom" style element', async ({
    page,
  }) => {
    for (const storyId of ['default-sign-in', 'email-and-password', 'dark-theme']) {
      await openStory(page, storyId);

      await expect(page.locator('#passflow-wrapper')).toBeVisible();
      await expect(page.locator('[data-passflow-style-layer="custom"]')).toHaveCount(0);
      await expect(page.locator('style.psfw-custom-styles')).toHaveCount(0);
    }
  });
});
