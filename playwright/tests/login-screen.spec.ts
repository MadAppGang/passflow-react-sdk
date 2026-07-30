import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

const storybookUrl = 'http://localhost:6006';
const storyTitle = 'Components/LoginScreen';

type StoryIndex = {
  entries: Record<
    string,
    {
      id: string;
      name: string;
      title: string;
      type: 'story' | 'docs';
    }
  >;
};

const openStory = async (page: Page, id: string) => {
  await page.goto(`${storybookUrl}/iframe.html?id=${id}&viewMode=story`);
  const storyRoot = page.locator('#storybook-root');
  await expect(storyRoot).toBeVisible();
  await expect(storyRoot).not.toBeEmpty();
  return storyRoot;
};

const auditStory = async (page: Page) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await new AxeBuilder({ page }).include('#storybook-root').analyze();
    } catch (error) {
      const isTransientStorybookReload =
        error instanceof Error &&
        (error.message.includes('Axe is already running') || error.message.includes('Execution context was destroyed'));
      if (!isTransientStorybookReload || attempt === 4) throw error;
      await expect(page.locator('#storybook-root')).toBeVisible();
      await page.waitForTimeout(200);
    }
  }

  throw new Error('Unable to audit the Storybook state');
};

test.describe('LoginScreen Storybook catalog', () => {
  test('renders and audits every catalogued state', async ({ page, request }) => {
    test.setTimeout(120_000);
    const response = await request.get(`${storybookUrl}/index.json`);
    expect(response.ok()).toBe(true);

    const index = (await response.json()) as StoryIndex;
    const stories = Object.values(index.entries)
      .filter((entry) => entry.type === 'story' && entry.title === storyTitle)
      .sort((left, right) => left.name.localeCompare(right.name));

    expect(stories.length).toBeGreaterThanOrEqual(38);

    for (const story of stories) {
      await test.step(story.name, async () => {
        const runtimeErrors: string[] = [];
        const handlePageError = (error: Error) => runtimeErrors.push(error.message);
        const handleConsole = (message: { type: () => string; text: () => string }) => {
          if (message.type() === 'error') runtimeErrors.push(message.text());
        };

        page.on('pageerror', handlePageError);
        page.on('console', handleConsole);

        await openStory(page, story.id);
        const accessibility = await auditStory(page);

        page.off('pageerror', handlePageError);
        page.off('console', handleConsole);

        expect(runtimeErrors, `${story.name} emitted browser errors`).toEqual([]);
        expect(
          accessibility.violations,
          `${story.name} has accessibility violations:\n${accessibility.violations
            .map((violation) => `${violation.id}: ${violation.help}`)
            .join('\n')}`,
        ).toEqual([]);
      });
    }
  });

  test('preserves the canonical sign-in visual baseline', async ({ page }) => {
    await page.setViewportSize({ width: 715, height: 786 });
    await openStory(page, 'components-loginscreen--default-sign-in');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => Array.from(document.images).every((image) => image.complete));

    const passkey = page.getByRole('button', { name: 'Sign In with a Passkey' });
    const provider = page.getByRole('button', { name: 'Google' });
    const divider = page.locator('.passflow-form-divider__line-left');

    await expect(page.getByRole('heading', { name: 'Sign In to your account' })).toBeVisible();
    await expect(page.getByText("Don't have an account?")).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);

    await expect(passkey).toHaveCSS('background-color', 'rgb(30, 30, 30)');
    await expect(passkey).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(passkey).toHaveCSS('box-shadow', 'rgba(30, 30, 30, 0.35) 0px 3px 15px 0px');
    await expect(passkey).toHaveCSS('width', '336px');
    await expect(passkey).toHaveCSS('height', '48px');

    await expect(provider).toHaveCSS('background-color', 'rgb(248, 249, 251)');
    await expect(provider).toHaveCSS('width', '336px');
    await expect(provider).toHaveCSS('height', '48px');
    await expect(page.locator('.passflow-provider-text')).toHaveCSS('color', 'rgb(30, 30, 30)');
    await expect(divider).toHaveCSS('background-color', 'rgb(233, 234, 240)');
    await expect(page.locator('.passflow-form-main-wrapper')).toHaveCSS('gap', '32px');

    await expect(page).toHaveScreenshot('default-sign-in.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('matches the passkey icon to the themed button label', async ({ page }) => {
    await openStory(page, 'components-loginscreen--dark-theme');

    const passkey = page.getByRole('button', { name: 'Sign In with a Passkey' });
    const icon = passkey.locator('.passflow-button-passkey-icon');
    await expect(passkey).toHaveCSS('color', 'rgb(16, 18, 22)');
    await expect(icon).toHaveCSS('background-color', 'rgb(16, 18, 22)');
  });

  test('preserves the original general-error composition', async ({ page }) => {
    await openStory(page, 'components-loginscreen--general-error');

    const error = page.locator('.passflow-error-container');
    const message = page.locator('.passflow-error-container-text');
    const action = page.getByRole('button', { name: 'Go back' });

    const decorativeLogo = page.locator('.passflow-form-main-container .passflow-icon');
    await expect(decorativeLogo).toBeVisible();
    await expect(decorativeLogo).toHaveAttribute('alt', '');
    await expect(error).toHaveCSS('gap', '32px');
    await expect(error).toHaveCSS('margin-top', '-8px');
    await expect(page.getByRole('heading', { level: 1, name: 'Network Error' })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Go back to start again.');
    await expect(message).toHaveCSS('font-size', '24px');
    await expect(message).toHaveCSS('color', 'rgb(180, 35, 24)');
    await expect(action).toHaveClass(/passflow-button-go-back-error/);
    await expect(action).toHaveCSS('width', '196px');
  });

  test('preserves wide custom-logo proportions', async ({ page }) => {
    await openStory(page, 'components-loginscreen--custom-brand');

    const logo = page.getByRole('img', { name: 'ACME logo' });
    const bounds = await logo.boundingBox();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error('expected custom-logo bounds');
    expect(bounds.width / bounds.height).toBeGreaterThan(3);
    expect(bounds.height).toBeLessThanOrEqual(44);
  });

  test('presents invitations with clear account choices and progress', async ({ page }) => {
    await openStory(page, 'components-loginscreen--invitation-signed-in');

    await expect(page.getByRole('heading', { name: "You've been invited to join My Workspace." })).toBeVisible();
    await expect(page.getByText('Alex Morgan sent this invitation.')).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeFocused();
    await expect(page.getByRole('button', { name: 'Switch account' })).toHaveClass(/passflow-button--outlined/);
    await expect(page.getByRole('button', { name: 'Create a new account' })).toHaveClass(/passflow-button--clean/);

    await openStory(page, 'components-loginscreen--invitation-accepting');
    await expect(page.locator('[data-testid="invitation-join"]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Accepting invitation…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accepting invitation…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Create a new account' })).toBeDisabled();

    await openStory(page, 'components-loginscreen--invitation-error');
    await expect(page.getByRole('alert')).toHaveText("We couldn't accept this invitation. Try again.");
  });

  test('shows password requirements for account creation', async ({ page }) => {
    await openStory(page, 'components-loginscreen--create-account');

    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByText('At least 8 characters')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await page.getByLabel('Email').fill('jack@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Test1234');
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeEnabled();
  });

  test('announces credential progress and disables the password reveal control', async ({ page }) => {
    await openStory(page, 'components-loginscreen--submitting');

    const form = page.locator('form.passflow-form');
    const reveal = page.getByRole('button', { name: 'Show password' });
    const bounds = await reveal.boundingBox();

    await expect(form).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Signing in…' })).toBeVisible();
    await expect(reveal).toBeDisabled();
    expect(bounds).not.toBeNull();
    if (!bounds) throw new Error('expected password reveal bounds');
    expect(bounds.width).toBeGreaterThanOrEqual(28);
    expect(bounds.height).toBeGreaterThanOrEqual(28);
  });

  test('passwordless action does not require a password', async ({ page }) => {
    await openStory(page, 'components-loginscreen--password-and-passwordless');

    await page.getByLabel('Email').fill('jack@example.com');

    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with email link' })).toBeEnabled();
  });

  test('phone country flags are bundled and never request the external CDN', async ({ page }) => {
    const cdnRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('cdnjs.cloudflare.com')) cdnRequests.push(request.url());
    });
    await page.route('https://cdnjs.cloudflare.com/**', (route) => route.abort());
    await openStory(page, 'components-loginscreen--phone-sign-up');

    const selectedFlag = page.locator('[data-country-flag]').first();
    await expect(selectedFlag).toBeVisible();
    await expect(selectedFlag).toHaveCSS('background-image', /flags\.png/);
    await page.getByRole('button', { name: /Select country/i }).click();
    await expect(page.locator('[role="option"] [data-country-flag]').first()).toBeVisible();
    await expect(page.locator('[role="option"] .passflow-country-flag--fallback')).toHaveCount(0);
    expect(cdnRequests).toEqual([]);
  });

  test('country flag renders an ISO fallback for unsupported codes', async ({ page }) => {
    await openStory(page, 'components-countryflag--unknown-fallback');

    const fallback = page.locator('[data-country-flag="zz"]');
    await expect(fallback).toHaveText('ZZ');
    await expect(fallback).toHaveClass(/passflow-country-flag--fallback/);
  });

  test('phone country picker supports keyboard navigation', async ({ page }) => {
    await openStory(page, 'components-loginscreen--phone-and-password');

    const countryButton = page.getByRole('button', { name: /Select country/i });
    await countryButton.click();

    const search = page.getByRole('combobox', { name: 'Search countries' });
    await expect(search).toBeFocused();

    const clippedOptions = await page.locator('#passflow-country-options').evaluate((list) => {
      const listBounds = list.getBoundingClientRect();
      return Array.from(list.querySelectorAll<HTMLElement>('[role="option"]')).filter((option) => {
        const optionBounds = option.getBoundingClientRect();
        const visibleHeight = Math.max(
          0,
          Math.min(optionBounds.bottom, listBounds.bottom) - Math.max(optionBounds.top, listBounds.top),
        );
        return visibleHeight > 0 && visibleHeight < optionBounds.height;
      }).length;
    });
    expect(clippedOptions).toBe(0);

    await search.press('ArrowDown');

    const firstOption = page.getByRole('option').first();
    await expect(firstOption).toBeFocused();
    await firstOption.press('Enter');

    await expect(countryButton).toBeFocused();
    await expect(countryButton).toHaveAttribute('aria-expanded', 'false');
  });

  test('forced passkey state hides credential fields', async ({ page }) => {
    await openStory(page, 'components-loginscreen--forced-passkey-experience');

    await expect(page.getByRole('button', { name: 'Sign In with a Passkey' })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeHidden();
    await expect(page.getByLabel('Password', { exact: true })).toBeHidden();
  });

  test('device approval replaces credentials after authentication', async ({ page }) => {
    await openStory(page, 'components-loginscreen--device-full-login');
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve this device' })).toHaveCount(0);

    await openStory(page, 'components-loginscreen--device-full-login-signed-in');
    const approve = page.getByRole('button', { name: 'Approve this device' });
    await expect(approve).toBeEnabled();
    await expect(approve).toBeFocused();
    await expect(page.getByText(/Signed in as jack@example.com/i)).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Sign In/i })).toHaveCount(0);
  });

  test('device approval exposes an announced busy state', async ({ page }) => {
    await openStory(page, 'components-loginscreen--device-full-login-approving');

    await expect(page.locator('[data-testid="device-full-login-approval"]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Approving…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Approving…' })).toBeDisabled();
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });

  test('keeps authenticated approval visible and clear of branding', async ({ page }) => {
    for (const viewport of [
      { width: 715, height: 786 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await openStory(page, 'components-loginscreen--device-full-login-signed-in');

      const action = await page.getByRole('button', { name: 'Approve this device' }).boundingBox();
      const branding = await page.locator('.passflow-branding').boundingBox();
      expect(action).not.toBeNull();
      expect(branding).not.toBeNull();
      if (!action || !branding) throw new Error('expected approval action and branding bounds');

      expect(action.y).toBeGreaterThanOrEqual(0);
      expect(action.y + action.height).toBeLessThanOrEqual(viewport.height);
      const overlapsBranding =
        action.x < branding.x + branding.width &&
        action.x + action.width > branding.x &&
        action.y < branding.y + branding.height &&
        action.y + action.height > branding.y;
      expect(overlapsBranding).toBe(false);
    }
  });

  test('device states identify the requesting app and use actionable runtime copy', async ({ page }) => {
    await openStory(page, 'components-loginscreen--device-consent');
    await expect(page.getByRole('heading', { name: 'Approve sign-in to Passflow CLI' })).toBeVisible();
    await expect(page.getByText('To Passflow by Madappgang')).toHaveCount(0);

    await openStory(page, 'components-loginscreen--device-passkey-unsupported');
    await expect(page.getByText("Passkey sign-in couldn't continue.")).toBeVisible();
    await expect(page.getByText('Waiting for your passkey — follow the prompt on your device.')).toHaveCount(0);
    await expect(page.getByRole('alert')).toContainText("This device can't use a passkey to sign in here");
    await expect(page.getByRole('alert')).toContainText('return to the app that asked you to sign in and start again');
  });

  test('disabled device mode exposes no approval control', async ({ page }) => {
    await openStory(page, 'components-loginscreen--device-mode-disabled');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(0);
    await expect(page.getByRole('textbox')).toHaveCount(0);
  });

  test('CLI passkey prompt uses the canonical LoginScreen action', async ({ page }) => {
    await openStory(page, 'components-loginscreen--cli-auth-pending');

    await expect(page.getByRole('heading', { name: 'CLI Authentication' })).toBeVisible();
    await expect(page.getByText('Click the button below to authenticate with your passkey.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Authenticate with Passkey' })).toHaveClass(/passflow-button-passkey/);
  });

  test('code entry announces progress while submission is busy', async ({ page }) => {
    await openStory(page, 'components-loginscreen--device-code-entry-busy');

    await expect(page.locator('form.passflow-form')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Checking the code…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checking…' })).toBeDisabled();
  });

  test('code entry exposes its error to assistive technology', async ({ page }) => {
    await openStory(page, 'components-loginscreen--device-code-entry-invalid');

    const code = page.getByLabel('Code');
    await expect(code).toHaveAttribute('aria-invalid', 'true');
    await expect(code).toHaveAttribute('aria-describedby', 'device-user-code-error');
    await expect(page.getByRole('alert')).toContainText("That code isn't right");
  });
});
