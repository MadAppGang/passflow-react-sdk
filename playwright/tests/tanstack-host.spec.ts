import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

// In a real browser: an app routed by TanStack Router mounts <PassflowFlow /> with no
// router props at /tanstack/auth (src/dev-tanstack-host.tsx). The flow and TanStack
// Router must agree on the URL whichever of them moves, including Back and Forward.

const base = 'http://localhost:5173';

const mockSettings = async (page: Page) => {
  await page.route('**/settings', async (route) => {
    await route.fulfill({ path: path.join(__dirname, './responses/passflow-settings.json') });
  });
  await page.route('**/app/settings', async (route) => {
    await route.fulfill({ path: path.join(__dirname, './responses/app-settings.json') });
  });
};

const hostPath = (page: Page) => page.getByTestId('host-path');
const signInHeading = (page: Page) => page.getByRole('heading', { name: 'Sign In to your account' });
const signUpHeading = (page: Page) => page.getByRole('heading', { name: 'Create your account' });

test.describe('zero-config PassflowFlow inside a TanStack Router app', () => {
  test.beforeEach(async ({ page }) => mockSettings(page));

  test('finds its mount path and lands on sign-in', async ({ page }) => {
    await page.goto(`${base}/tanstack/auth`);
    await expect(signInHeading(page)).toBeVisible();
    await expect(page).toHaveURL(`${base}/tanstack/auth/signin`);
    await expect(hostPath(page)).toHaveText('/tanstack/auth/signin');
  });

  test('flow and app router follow each other, through Back and Forward', async ({ page }) => {
    await page.goto(`${base}/tanstack/auth/signin`);
    await expect(signInHeading(page)).toBeVisible();

    // The flow moves (its own "Sign Up" link): the app router follows.
    await page.getByRole('link', { name: 'Sign Up' }).click();
    await expect(signUpHeading(page)).toBeVisible();
    await expect(page).toHaveURL(`${base}/tanstack/auth/signup`);
    await expect(hostPath(page)).toHaveText('/tanstack/auth/signup');

    // The app leaves the flow: no bounce back into it.
    await page.getByRole('link', { name: 'Host home' }).click();
    await expect(page.getByRole('heading', { name: 'Host home page' })).toBeVisible();
    await expect(page).toHaveURL(`${base}/tanstack/home`);

    // Back into the flow, then back again to where it started.
    await page.goBack();
    await expect(signUpHeading(page)).toBeVisible();
    await expect(hostPath(page)).toHaveText('/tanstack/auth/signup');
    await page.goBack();
    await expect(signInHeading(page)).toBeVisible();
    await expect(hostPath(page)).toHaveText('/tanstack/auth/signin');

    // Forward, then the app's own link into the flow.
    await page.goForward();
    await expect(signUpHeading(page)).toBeVisible();
    await page.getByRole('link', { name: 'Host home' }).click();
    await expect(page.getByRole('heading', { name: 'Host home page' })).toBeVisible();
    await page.getByRole('link', { name: 'Host link to sign-up' }).click();
    await expect(signUpHeading(page)).toBeVisible();
    await expect(page).toHaveURL(`${base}/tanstack/auth/signup`);
  });
});
