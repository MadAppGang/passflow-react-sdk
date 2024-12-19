/* eslint-disable quotes */
import { expect, test } from '../fixture';

test.describe('default passwordless experience', () => {
  test('has all elements of passwordless signup', async ({ page }) => {
    await page.goto('/web/signup');
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.locator('label', { hasText: 'Email' })).toBeVisible();
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign up with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Don't have an account? Sign In")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
  });
});

test.beforeEach(async ({ page }) => {
  await page.goto('/web/signup');
  await expect(page).toHaveTitle(/Passflow/);
  await expect(page.getByText('Create account to sign up', { exact: true })).toBeVisible();
  await expect(page.getByText('For Passflow by Madappgang', { exact: true })).toBeVisible();
  await page.locator('label div').click();
  await expect(page.locator('label div')).toBeVisible();
  await expect(page.locator('label div')).not.toBeChecked();
  await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByText("Don't have an account? Sign In")).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
});

test.describe('default signup flow', () => {
  test('has all element of default signup settings', async ({ page }) => {
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByText('At least 8 characters', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Contain a number, symbol, lowercase letter, and uppercase letter', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign Up with link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).toBeVisible();
  });

  test('has all element of default signup settings with phone + password', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await page.getByRole('button', { name: 'Use phone' }).click();
    await expect(page.locator('label', { hasText: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign Up with SMS code' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up with link' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).toBeVisible();
  });
});

test.describe('default signup flow with providers', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/passflow-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings-with-google.json' });
    });

    await page.goto('/web/signin');
  });

  test('has all element of default signup settings with google provider', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
  });
});

test.describe('default signup flow without passkey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/passflow-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings-without-passkey.json' });
    });

    await page.goto('/web/signup');
  });

  test('has all element of default signup settings without passkey', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign Up with link' })).toBeVisible();
  });
});

test.describe('default signup flow with email and password', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/passflow-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings-default.json' });
    });

    await page.goto('/web/signup');
  });

  test('has all element of default signup settings with email and password', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).not.toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
  });
});
