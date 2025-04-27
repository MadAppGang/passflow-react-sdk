import { expect, test } from '../fixture';
import path from 'node:path';

const ACCESS_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6InB1VzVYY0MySkFvQnJHbjBIakxDTWtrWWwySSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMndKMnVkNGxHd1lZZm82ODJnRWNrV2h6Z3pDIl0sImV4cCI6MTc0NTc1MTI2NiwiaWF0IjoxNzQ1NzQ5NDY2LCJpc3MiOiJodHRwczovL3Rlc3QucGFzc2Zsb3cuY2xvdWQiLCJqdGkiOiItb0Y4dHBESE1mMUNmOEdJMnMxZnc2aVRaY2VHeVdVdlFWd2x1dEVNQnFnIiwicGFzc2Zsb3dfdG0iOnsiMndKOTZCOHpSOVNZbVRVZENhUUY0NDRyTkNQIjp7InRlbmFudF9pZCI6IjJ3Sjk2Qjh6UjlTWW1UVWRDYVFGNDQ0ck5DUCIsInRlbmFudF9uYW1lIjoiTXkgV29ya3NwYWNlIiwidGVuYW50X3JvbGVzIjpbInVzZXIiXSwicm9vdF9ncm91cF9pZCI6IjJ3Sjk2N0hCaEIwNWpTNXZ6SGFPTDFYaE1zQSIsImdyb3VwcyI6eyIyd0o5NjdIQmhCMDVqUzV2ekhhT0wxWGhNc0EiOlsidXNlciJdfSwiZ3JvdXBfbmFtZXMiOnsiMndKOTY3SEJoQjA1alM1dnpIYU9MMVhoTXNBIjoiZGVmYXVsdCJ9fSwiMndKQW45WUV0S0R6Z1RvejMyNkZ1UEVjNlU3Ijp7InRlbmFudF9pZCI6IjJ3SkFuOVlFdEtEemdUb3ozMjZGdVBFYzZVNyIsInRlbmFudF9uYW1lIjoiTXkgV29ya3NwYWNlIiwidGVuYW50X3JvbGVzIjpbIm93bmVyIl0sInJvb3RfZ3JvdXBfaWQiOiIyd0pBbjZnM1FadnNscTRibkYyUmo0TDM3WkoiLCJncm91cHMiOnsiMndKQW42ZzNRWnZzbHE0Ym5GMlJqNEwzN1pKIjpbIm93bmVyIl19LCJncm91cF9uYW1lcyI6eyIyd0pBbjZnM1FadnNscTRibkYyUmo0TDM3WkoiOiJkZWZhdWx0In19fSwic2NvcGVzIjpbImlkIiwib2ZmbGluZSIsInRlbmFudCIsImVtYWlsIiwib2lkYyIsIm9wZW5pZCIsImFjY2Vzczp0ZW5hbnQ6YWxsIl0sInN1YiI6IjJ3SkFuOEE4eTZLYmcwa3MxYks3ZFFrZEZCdiIsInR5cGUiOiJhY2Nlc3MifQ.7yAvv-I7PSZrQdVDr5VOoOmD7zQUCBD0YRNR8gPqQp1UUlT8eJXaZJdZ-1T_t0uOL29EesmT8Sd2wReahHkJvA';
const ID_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6InB1VzVYY0MySkFvQnJHbjBIakxDTWtrWWwySSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMndKMnVkNGxHd1lZZm82ODJnRWNrV2h6Z3pDIl0sImVtYWlsIjoidGVzdCsxQHRlc3QuY29tIiwiZXhwIjoxNzQ1NzQ5NzY2LCJpYXQiOjE3NDU3NDk0NjYsImlkIjoiMndKQW44QTh5NktiZzBrczFiSzdkUWtkRkJ2IiwiaXNzIjoiaHR0cHM6Ly90ZXN0LnBhc3NmbG93LmNsb3VkIiwianRpIjoiSzhjWmU1dklLUjM4ZGxBTmFkUjQ0akdBeTM5NzJ6ZWpDRTR1ckJ0dTM5NCIsInN1YiI6IjJ3SkFuOEE4eTZLYmcwa3MxYks3ZFFrZEZCdiIsInR5cGUiOiJpZF90b2tlbiJ9.qJYb18qOZ87lRxHyK8PjTwFpUVO7CYb0xVuK4RZ9NJDIib39jK56HUL4TSstf0cYalKcffdYdmGXsWzr6Cf1Lw';
const VALID_INVITE_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6InB1VzVYY0MySkFvQnJHbjBIakxDTWtrWWwySSIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsiMndKMnVkNGxHd1lZZm82ODJnRWNrV2h6Z3pDIl0sImVtYWlsIjoidGVzdCsxQHRlc3QuY29tIiwiZXhwIjoxNzQ1ODM1MTgyLCJpYXQiOjE3NDU3NDg3ODIsImludml0ZV9pZCI6IjJ3SjlQOFRxdWhnTVdiRGtVQmZrSndXYmZwYSIsImludml0ZXJfaWQiOiIyd0o5NkNHTmF0RVRUWmRmMzJkWWtFcmJpM24iLCJpbnZpdGVyX25hbWUiOiIiLCJpc3MiOiJodHRwczovL3Rlc3QucGFzc2Zsb3cuY2xvdWQiLCJqdGkiOiJ6S3NXNkpEeXFvNmVBdmNqcEg1b2RWM2NxTWg3anVibXZRTk1iTFVrbm5RIiwicGFzc2Zsb3dfdG0iOnsiMndKOTZCOHpSOVNZbVRVZENhUUY0NDRyTkNQIjp7InRlbmFudF9pZCI6IjJ3Sjk2Qjh6UjlTWW1UVWRDYVFGNDQ0ck5DUCIsImdyb3VwcyI6eyIyd0o5NjdIQmhCMDVqUzV2ekhhT0wxWGhNc0EiOlsidXNlciJdfX19LCJwYXlsb2FkIjp7ImRhdGExIjoiSSBhbSBhZGRpdGlvbmFsIGRhdGEgdG8gaW5jbHVkZSIsImRhdGEyIjpmYWxzZX0sInJlZGlyZWN0X3VybCI6Imh0dHBzOi8vand0LmlvIiwic3ViIjoiMndKOTZDR05hdEVUVFpkZjMyZFlrRXJiaTNuIiwidGVuYW50X25hbWUiOiJNeSBXb3Jrc3BhY2UiLCJ0eXBlIjoiaW52aXRlIn0.edUr0dVGw473LOTc9DFs-K0SKeRCUO1ev7czK8_hs8PiAFLwaXrpAhnpmi0t9VPjP2Zooi8a6lCw_oUGFbqjuA';
const APP_ID = '2uocaf41S7tOXb14wrhGTFiSErt';

test.describe('invitation join flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(token => {
      window.localStorage.setItem('access', token);
    }, ACCESS_TOKEN);

    await page.addInitScript(token => {
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
    await expect(page.getByText("Someone invited you to join the My Workspace - want to accept?")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com right now. Do you want keep going as test+1@test.com or switch to different account?")).toBeVisible();
    
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register new user' })).toBeVisible();

  });

  test('invitation join flow with valid token to accept invitation', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("Someone invited you to join the My Workspace - want to accept?")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com right now. Do you want keep going as test+1@test.com or switch to different account?")).toBeVisible();
    
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register new user' })).toBeVisible();

    await page.getByRole('button', { name: 'Accept invitation' }).click();

    await expect(page.getByText("Error parsing access token: token has invalid claims: token is expired.")).toBeVisible();
    await expect(page.getByText("Please go back or try again later")).toBeVisible();

    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });

  test('invitation join flow with valid token to switch account', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("Someone invited you to join the My Workspace - want to accept?")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com right now. Do you want keep going as test+1@test.com or switch to different account?")).toBeVisible();
    
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register new user' })).toBeVisible();

    await page.getByRole('button', { name: 'Switch account' }).click();

    expect(page.url()).toContain(`signin?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);
  });

  test('invitation join flow with valid token to register', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain(`invite_token=${VALID_INVITE_TOKEN}`);

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("Someone invited you to join the My Workspace - want to accept?")).toBeVisible();
    await expect(page.getByText("You're signed in as test+1@test.com right now. Do you want keep going as test+1@test.com or switch to different account?")).toBeVisible();
    
    await expect(page.getByRole('button', { name: 'Accept invitation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Switch account' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Register new user' })).toBeVisible();

    await page.getByRole('button', { name: 'Register new user' }).click();

    expect(page.url()).toContain(`signup?appId=${APP_ID}&invite_token=${VALID_INVITE_TOKEN}`);
  });

  test('invitation join flow with invalid invite token', async ({ page }) => {
    await page.goto(`http://localhost:5173/web/invitation?appId=${APP_ID}&invite_token=invalid-token`);

    expect(page.url()).toContain(`appId=${APP_ID}`);
    expect(page.url()).toContain('invite_token=invalid-token');

    await expect(page).toHaveTitle(/Passflow/);
    await expect(page.getByText("Invalid invitation token.")).toBeVisible();
    await expect(page.getByText("Please go back or try again later")).toBeVisible();

    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible();
  });
});