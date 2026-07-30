import path from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixture';

const ACCESS_TOKEN =
  'eyJhbGciOiJFUzI1NiIsImtpZCI6InB1VzVYY0MySkFvQnJHbjBIakxDTWtrWWwySSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMndKMnVkNGxHd1lZZm82ODJnRWNrV2h6Z3pDIl0sImV4cCI6MTc0NTc1MTI2NiwiaWF0IjoxNzQ1NzQ5NDY2LCJpc3MiOiJodHRwczovL3Rlc3QucGFzc2Zsb3cuY2xvdWQiLCJqdGkiOiItb0Y4dHBESE1mMUNmOEdJMnMxZnc2aVRaY2VHeVdVdlFWd2x1dEVNQnFnIiwicGFzc2Zsb3dfdG0iOnsiMndKOTZCOHpSOVNZbVRVZENhUUY0NDRyTkNQIjp7InRlbmFudF9pZCI6IjJ3Sjk2Qjh6UjlTWW1UVWRDYVFGNDQ0ck5DUCIsInRlbmFudF9uYW1lIjoiTXkgV29ya3NwYWNlIiwidGVuYW50X3JvbGVzIjpbInVzZXIiXSwicm9vdF9ncm91cF9pZCI6IjJ3Sjk2N0hCaEIwNWpTNXZ6SGFPTDFYaE1zQSIsImdyb3VwcyI6eyIyd0o5NjdIQmhCMDVqUzV2ekhhT0wxWGhNc0EiOlsidXNlciJdfSwiZ3JvdXBfbmFtZXMiOnsiMndKOTY3SEJoQjA1alM1dnpIYU9MMVhoTXNBIjoiZGVmYXVsdCJ9fSwiMndKQW45WUV0S0R6Z1RvejMyNkZ1UEVjNlU3Ijp7InRlbmFudF9pZCI6IjJ3SkFuOVlFdEtEemdUb3ozMjZGdVBFYzZVNyIsInRlbmFudF9uYW1lIjoiTXkgV29ya3NwYWNlIiwidGVuYW50X3JvbGVzIjpbIm93bmVyIl0sInJvb3RfZ3JvdXBfaWQiOiIyd0pBbjZnM1FadnNscTRibkYyUmo0TDM3WkoiLCJncm91cHMiOnsiMndKQW42ZzNRWnZzbHE0Ym5GMlJqNEwzN1pKIjpbIm93bmVyIl19LCJncm91cF9uYW1lcyI6eyIyd0pBbjZnM1FadnNscTRibkYyUmo0TDM3WkoiOiJkZWZhdWx0In19fSwic2NvcGVzIjpbImlkIiwib2ZmbGluZSIsInRlbmFudCIsImVtYWlsIiwib2lkYyIsIm9wZW5pZCIsImFjY2Vzczp0ZW5hbnQ6YWxsIl0sInN1YiI6IjJ3SkFuOEE4eTZLYmcwa3MxYks3ZFFrZEZCdiIsInR5cGUiOiJhY2Nlc3MifQ.7yAvv-I7PSZrQdVDr5VOoOmD7zQUCBD0YRNR8gPqQp1UUlT8eJXaZJdZ-1T_t0uOL29EesmT8Sd2wReahHkJvA';
const ID_TOKEN =
  'eyJhbGciOiJFUzI1NiIsImtpZCI6InB1VzVYY0MySkFvQnJHbjBIakxDTWtrWWwySSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMndKMnVkNGxHd1lZZm82ODJnRWNrV2h6Z3pDIl0sImVtYWlsIjoidGVzdCsxQHRlc3QuY29tIiwiZXhwIjoxNzQ1NzQ5NzY2LCJpYXQiOjE3NDU3NDk0NjYsImlkIjoiMndKQW44QTh5NktiZzBrczFiSzdkUWtkRkJ2IiwiaXNzIjoiaHR0cHM6Ly90ZXN0LnBhc3NmbG93LmNsb3VkIiwianRpIjoiSzhjWmU1dklLUjM4ZGxBTmFkUjQ0akdBeTM5NzJ6ZWpDRTR1ckJ0dTM5NCIsInN1YiI6IjJ3SkFuOEE4eTZLYmcwa3MxYks3ZFFrZEZCdiIsInR5cGUiOiJpZF90b2tlbiJ9.qJYb18qOZ87lRxHyK8PjTwFpUVO7CYb0xVuK4RZ9NJDIib39jK56HUL4TSstf0cYalKcffdYdmGXsWzr6Cf1Lw';
const VALID_INVITE_TOKEN =
  'eyJhbGciOiJFUzI1NiIsImtpZCI6InB1VzVYY0MySkFvQnJHbjBIakxDTWtrWWwySSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMndKMnVkNGxHd1lZZm82ODJnRWNrV2h6Z3pDIl0sImVtYWlsIjoidGVzdCsxQHRlc3QuY29tIiwiZXhwIjoxNzQ1ODM1MTgyLCJpYXQiOjE3NDU3NDg3ODIsImludml0ZV9pZCI6IjJ3SjlQOFRxdWhnTVdiRGtVQmZrSndXYmZwYSIsImludml0ZXJfaWQiOiIyd0o5NkNHTmF0RVRUWmRmMzJkWWtFcmJpM24iLCJpbnZpdGVyX25hbWUiOiIiLCJpc3MiOiJodHRwczovL3Rlc3QucGFzc2Zsb3cuY2xvdWQiLCJqdGkiOiJ6S3NXNkpEeXFvNmVBdmNqcEg1b2RWM2NxTWg3anVibXZRTk1iTFVrbm5RIiwicGFzc2Zsb3dfdG0iOnsiMndKOTZCOHpSOVNZbVRVZENhUUY0NDRyTkNQIjp7InRlbmFudF9pZCI6IjJ3Sjk2Qjh6UjlTWW1UVWRDYVFGNDQ0ck5DUCIsImdyb3VwcyI6eyIyd0o5NjdIQmhCMDVqUzV2ekhhT0wxWGhNc0EiOlsidXNlciJdfX19LCJwYXlsb2FkIjp7ImRhdGExIjoiSSBhbSBhZGRpdGlvbmFsIGRhdGEgdG8gaW5jbHVkZSIsImRhdGEyIjpmYWxzZX0sInJlZGlyZWN0X3VybCI6Imh0dHBzOi8vand0LmlvIiwic3ViIjoiMndKOTZDR05hdEVUVFpkZjMyZFlrRXJiaTNuIiwidGVuYW50X25hbWUiOiJNeSBXb3Jrc3BhY2UiLCJ0eXBlIjoiaW52aXRlIn0.edUr0dVGw473LOTc9DFs-K0SKeRCUO1ev7czK8_hs8PiAFLwaXrpAhnpmi0t9VPjP2Zooi8a6lCw_oUGFbqjuA';
const APP_ID = '2uocaf41S7tOXb14wrhGTFiSErt';

test.describe('invitation join flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((token) => {
      window.localStorage.setItem('access', token);
    }, ACCESS_TOKEN);

    await page.addInitScript((token) => {
      window.localStorage.setItem('id_token', token);
    }, ID_TOKEN);

    await page.route('**/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
    });
    await page.route('**/app/settings', async (route) => {
      await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
    });
  });

  test('invitation join flow with valid token', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByRole('heading', { name: "You've been invited to join My Workspace." })).toBeVisible();
    await expect(page.getByText('Review the invitation before continuing.')).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com.")).toBeVisible();
    await expect(page.getByText('Continue with this account, or switch accounts?')).toBeVisible();

    const acceptInvitation = page.getByRole('button', { name: 'Accept invitation' });
    const switchAccount = page.getByRole('button', { name: 'Switch account' });
    const createAccount = page.getByRole('button', { name: 'Create a new account' });
    await expect(acceptInvitation).toBeVisible();
    await expect(acceptInvitation).toBeFocused();
    await expect(acceptInvitation).toHaveCSS('color', 'rgb(255, 255, 255)');
    await expect(acceptInvitation).toHaveCSS('background-color', 'rgb(12, 89, 221)');
    await expect(switchAccount).toHaveCSS('border-color', 'rgb(243, 245, 247)');
    await expect(createAccount).toHaveCSS('border-style', 'none');

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test('keeps the invitation actions usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    const accept = await page.getByRole('button', { name: 'Accept invitation' }).boundingBox();
    const createAccount = await page.getByRole('button', { name: 'Create a new account' }).boundingBox();
    const branding = await page.locator('.passflow-branding').boundingBox();
    expect(accept).not.toBeNull();
    expect(createAccount).not.toBeNull();
    expect(branding).not.toBeNull();
    if (!accept || !createAccount || !branding) throw new Error('expected invitation action and branding bounds');

    expect(accept.y).toBeGreaterThanOrEqual(0);
    expect(createAccount.y + createAccount.height).toBeLessThanOrEqual(branding.y);
  });

  test('invitation join flow with valid token to accept invitation', async ({ page }) => {
    await page.route('**/user/tenant/join', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 300));
      await route.fulfill({
        status: 401,
        json: {
          error: {
            id: 'error.token.expired',
            message: 'Error parsing access token: token has invalid claims: token is expired.',
            status: 401,
            location: '/user/tenant/join',
            time: '2026-07-17T00:00:00Z',
          },
        },
      });
    });

    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("You've been invited to join My Workspace.")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com.")).toBeVisible();
    await expect(page.getByText('Continue with this account, or switch accounts?')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a new account' })).toBeVisible();

    await page.getByRole('button', { name: 'Accept invitation' }).click();

    await expect(page.locator('[data-testid="invitation-join"]')).toHaveAttribute('aria-busy', 'true');
    await expect(page.getByRole('status').filter({ hasText: 'Accepting invitation…' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accepting invitation…' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Create a new account' })).toBeDisabled();

    await expect(page.getByRole('alert')).toHaveText("We couldn't accept this invitation. Try again.");
    await expect(page.getByText('Error parsing access token: token has invalid claims: token is expired.')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeEnabled();
  });

  test('invitation join flow with valid token to switch account', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("You've been invited to join My Workspace.")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com.")).toBeVisible();
    await expect(page.getByText('Continue with this account, or switch accounts?')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a new account' })).toBeVisible();

    await page.getByRole('button', { name: 'Switch account' }).click();

    expect(page.url()).toContain(`signin?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);
    await expect(page.getByRole('heading', { name: 'Sign in to join My Workspace.' })).toBeVisible();
    await expect(page.getByText("After you sign in, you'll continue to the invitation.")).toBeVisible();
  });

  test('invitation join flow with valid token to register', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("You've been invited to join My Workspace.")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com.")).toBeVisible();
    await expect(page.getByText('Continue with this account, or switch accounts?')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create a new account' })).toBeVisible();

    await page.getByRole('button', { name: 'Create a new account' }).click();

    expect(page.url()).toContain(`signup?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);
    await expect(page.getByRole('heading', { name: 'Create your account to join My Workspace.' })).toBeVisible();
    await expect(page.getByText("After you create your account, you'll continue to the invitation.")).toBeVisible();
  });

  test('invitation join flow with invalid invite token', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=invalid-token`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain('invite_token=invalid-token');

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText('This invitation link is invalid or has expired.')).toBeVisible();
    await expect(page.getByText('Go back to start again.')).toBeVisible();

    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});
