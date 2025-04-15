/* eslint-disable quotes */
import { expect, test } from '../fixture';
import path from 'node:path';

test.describe('default passwordless experience', () => {
  test('has all elements of passwordless signup', async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signup');
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByRole('button', { name: 'key Sign up with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Already have an account? Sign In")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
  });
});

test.describe('default signup flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signup');
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText('Create account to sign up', { exact: true })).toBeVisible();
    await expect(page.getByText('For Passflow by Madappgang', { exact: true })).toBeVisible();
    await page.locator('label div').click();
    await expect(page.locator('label div')).toBeVisible();
    await expect(page.locator('label div')).not.toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Already have an account? Sign In")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
});

  test('has all element of default signup settings', async ({ page }) => {
    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByText('At least 8 characters', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Contain a number, symbol, lowercase letter, and uppercase letter', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign Up with email link' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).toBeVisible();
  });

  test('has all element of default signup settings with phone + password', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await page.getByRole('button', { name: 'Use phone' }).click();
    await expect(page.locator('label', { hasText: 'Phone number' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use email' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign Up with SMS code' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up with email link' })).toBeHidden();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).toBeVisible();
  });
});

test.describe('default signup flow with providers', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings-with-google.json') });
    });

    await page.goto('http://localhost:5173/web/signup');
  });

  test('has all element of default signup settings with google provider', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'google' })).toBeVisible();
  });
});

test.describe('default signup flow without passkey', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings-without-passkey.json') });
    });

    await page.goto('http://localhost:5173/web/signup');
  });

  test('has all element of default signup settings without passkey', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Forgot password' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Sign Up with email link' })).toBeVisible();
  });
});

test.describe('default signup flow with email and password', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings-default.json') });
    });

    await page.goto('http://localhost:5173/web/signup');
  });

  test('has all element of default signup settings with email and password', async ({ page }) => {
    await expect(page.getByText('Passwordless experience')).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'key Sign Up with a Passkey' })).not.toBeVisible();
    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use phone' })).not.toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeDisabled();
  });
});

test.describe('signup flow with invite token', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signup?invite_token=test-token');
  });

  test('has all elements with invite token', async ({ page }) => {
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByRole('button', { name: 'key Sign up with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Already have an account? Sign In")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
    await page.locator('label div').click();

    await page.getByRole('button', { name: 'Use phone' }).click();
    expect(page.url()).toContain('invite_token=test-token');
    
    await page.getByRole('button', { name: 'Use email' }).click();
    expect(page.url()).toContain('invite_token=test-token');
  });

  test('show error if registration is only available via invite token', async ({ page }) => {
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByRole('button', { name: 'key Sign up with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Already have an account? Sign In")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
    await page.locator('label div').click();

    expect(page.url()).toContain('invite_token=test-token');
  });
});

test.describe('signup flow without invite token', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signup');
  });

  test('show error if registration is only available via invite token', async ({ page }) => {
    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByRole('button', { name: 'key Sign up with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByText("Already have an account? Sign In")).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toHaveAttribute('href');
    await page.locator('label div').click();

    expect(page.url()).toContain('http://localhost:5173/web/signup');

    await expect(page.locator('input#email_or_username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    await page.locator('input#email_or_username').fill('test@example.com');
    await page.locator('input#password').fill('Test12345!');

    await expect(page.locator('input#email_or_username')).toHaveValue('test@example.com');
    await expect(page.locator('input#password')).toHaveValue('Test12345!');
    await expect(page.getByRole('button', { name: 'Sign Up', exact: true })).toBeEnabled();

    await page.getByRole('button', { name: 'Sign Up', exact: true }).click();

    await expect(page.getByText('registration is allowed by invitation only', { exact: true })).toBeVisible();
  });
});

test.describe('default signup flow with error', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });

    await page.goto('http://localhost:5173/web/signup?error=error.federated.app.redirect.not.allowed&message=The redirect URL provided is not allowed by the app.');
  });

  test('with error and message', async ({ page }) => {
    await expect(page.getByText('The redirect URL provided is not allowed by the app.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
