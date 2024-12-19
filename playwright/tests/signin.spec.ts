/* eslint-disable quotes */
import { expect, test } from '../fixture';

test.describe('default passwordless experience', () => {
  test('has all elements of passwordless signin', async ({ page }) => {
    await page.goto('/web/signin');
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByText("Don't have an account? Sign Up")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href');
  });
});

test.describe('default signin flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/web/signin');
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText('Sign In to your account', { exact: true })).toBeVisible();
    await expect(page.getByText('To Passflow by Madappgang', { exact: true })).toBeVisible();
    await page.locator('label div').click();
    await expect(page.locator('label div')).toBeVisible();
    await expect(page.locator('label div')).not.toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByText("Don't have an account? Sign Up")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href');
  });

  test('has all element of default signin settings', async ({ page }) => {
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
  });

  test('has all element of default signin settings with phone + password', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await page.getByRole('button', { name: 'Use phone' }).click();
    await expect(page.locator('label', { hasText: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Use email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with SMS code' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In with link' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
  });
});

test.describe('default signin flow with providers', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/passflow-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings-with-google.json' });
    });

    await page.goto('/web/signin');
  });

  test('has all element of default signin settings with google provider', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Google' })).toBeVisible();
  });
});

test.describe('default signin flow without passkey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/passflow-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings-without-passkey.json' });
    });

    await page.goto('/web/signin');
  });

  test('has all element of default signin settings without passkey', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with link' })).toBeVisible();
  });
});

test.describe('default signin flow with email and password', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/passflow-settings.json' });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: './tests/responses/app-settings-default.json' });
    });

    await page.goto('/web/signin');
  });

  test('has all element of default signin settings with email and password', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#identity')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).not.toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with link' })).not.toBeVisible();
  });
});
