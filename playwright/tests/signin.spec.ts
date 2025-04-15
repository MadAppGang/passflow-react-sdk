/* eslint-disable quotes */
import { expect, test } from '../fixture';
import path from 'node:path';

test.describe('default passwordless experience', () => {
  test('has all elements of passwordless signin', async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signin');
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
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signin');
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
    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with email link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
  });

  test('has all element of default signin settings with phone + password', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await page.getByRole('button', { name: 'Use phone' }).click();
    await expect(page.locator('label', { hasText: 'Phone number' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Use email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with SMS code' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In with email link' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
  });
});

test.describe('default signin flow with providers', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings-with-google.json') });
    });

    await page.goto('http://localhost:5173/web/signin');
  });

  test('has all element of default signin settings with google provider', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'google' })).toBeVisible();
  });
});

test.describe('default signin flow without passkey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings-without-passkey.json') });
    });

    await page.goto('http://localhost:5173/web/signin');
  });

  test('has all element of default signin settings without passkey', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with email link' })).toBeVisible();
  });
});

test.describe('default signin flow with email and password', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings-default.json') });
    });

    await page.goto('http://localhost:5173/web/signin');
  });

  test('has all element of default signin settings with email and password', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).not.toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).toHaveAttribute('href');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign In with email link' })).not.toBeVisible();
  });
});

test.describe('default signin flow with error', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signin?error=error.federated.app.redirect.not.allowed&message=The redirect URL provided is not allowed by the app.');
  });

  test('with error and message', async ({ page }) => {
    await expect(page.getByText('The redirect URL provided is not allowed by the app.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
