import { test, expect } from '../fixture';


test.describe('default passwordless expierence', () => {
  
  test('has all elements of passwordless signin', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Aooth/);
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByText('Don\'t have an account? Sign Up')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href');
  
  });

  test('has all elements of passwordless sihnup', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Aooth/);
    await expect(page.getByRole('button', { name: 'key Sign In with a Passkey' })).toBeVisible();
    await expect(page.getByText('Passwordless experience')).toBeVisible();
    await expect(page.locator('label div')).toBeChecked();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
    await expect(page.getByText('Don\'t have an account? Sign Up')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href');
  
  });
  
})
