import { expect, test } from '../fixture';
import { onState, overCopy, rateCopy, screen, unavailableCopy } from './enrollment-contract.helpers';
import {
  begin, endpoint, enterSetupCode, failure, finish, genericCopy, land, noSetupLink,
  ok, paths, rawRateLimit, respond, runtime, savedOverCopy, showCodes,
} from './enrollment-runtime.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

test('TEST-V1 REQ-1 REQ-5 REQ-13 enrolled users see code entry without a dead setup link or mount challenge', async ({ page }) => {
  const http = await runtime(page, 'verify');
  await land(page, 'verify');
  await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Use recovery code', exact: true })).toBeEnabled();
  await noSetupLink(page);
  http.readOnly();
  await page.getByRole('button', { name: 'Use recovery code', exact: true }).click();
  await expect(screen(page, 'recovery')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Recovery Code', exact: true })).toBeVisible();
  await noSetupLink(page);
  http.readOnly();
});

test('TEST-X1 REQ-4 unavailable state offers administrator guidance and navigates back to sign-in', async ({ page }) => {
  const http = await runtime(page, 'unavailable');
  await land(page, 'unavailable');
  await expect(page.getByText(unavailableCopy, { exact: true })).toBeVisible();
  http.readOnly();
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});

test('TEST-X2 REQ-9 not_allowed re-reads once and displays the newly reported email-link state', async ({ page }) => {
  const http = await runtime(page, 'direct');
  let reads = 0;
  await onState(page, (route) => respond(route, ok({ enrollment: ++reads === 1 ? 'direct' : 'email_link' })));
  await endpoint(page, paths.begin, [failure('error.2fa.enrollment.not_allowed', 403)]);
  await land(page, 'direct');
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await expect(screen(page, 'email-link')).toBeVisible();
  expect(http.count(paths.read)).toBe(2);
  expect(http.count(paths.begin)).toBe(1);
  expect(http.count(paths.send)).toBe(0);
});

test('TEST-X3 REQ-9 REQ-17 second not_allowed is a plain error without a third state read', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.begin, [failure('error.2fa.enrollment.not_allowed', 403)]);
  await land(page, 'direct');
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await expect.poll(() => http.count(paths.read)).toBe(2);
  await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText(genericCopy);
  expect(http.count(paths.begin)).toBe(2);
  expect(http.count(paths.read)).toBe(2);
});

test('TEST-X4 REQ-11 begin 501 shows unavailable with a way back, not an automatic retry', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.begin, [failure('error.not.implemented', 501)]);
  await land(page, 'direct');
  await page.getByRole('button', { name: 'Get Started', exact: true }).click();
  await expect(screen(page, 'unavailable')).toBeVisible();
  await expect(page.getByText(unavailableCopy, { exact: true })).toBeVisible();
  expect(http.count(paths.begin)).toBe(1);
  await page.getByRole('button', { name: 'Back to sign in', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});

// Independent test per operation and each terminal id: no shared data or serial ordering.
for (const operation of ['begin', 'confirm', 'verify'] as const) {
  for (const id of ['error.tfa.token.invalid', 'error.otp.already.used']) {
    test(`TEST-X5 REQ-6 ${operation} ${id} ends sign-in without automatic recovery`, async ({ page }) => {
      const http = await runtime(page, 'direct');
      await endpoint(page, paths[operation], [failure(id, 401)]);
      await land(page, 'direct');
      if (operation === 'begin') await page.getByRole('button', { name: 'Get Started', exact: true }).click();
      else if (operation === 'confirm') {
        await begin(page);
        await enterSetupCode(page);
      } else {
        await showCodes(page);
        await finish(page);
      }
      await expect(screen(page, 'ended')).toBeVisible();
      await expect(page.getByText(operation === 'verify' ? savedOverCopy : overCopy, { exact: true })).toBeVisible();
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0);
      expect(http.count(paths[operation])).toBe(1);
      expect(http.count(paths.read)).toBe(1);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
    });
  }
  test(`TEST-X6 REQ-12 raw 429 on ${operation} ends with own rate-limit copy`, async ({ page }) => {
    const http = await runtime(page, 'direct');
    await endpoint(page, paths[operation], [rawRateLimit]);
    await land(page, 'direct');
    if (operation === 'begin') await page.getByRole('button', { name: 'Get Started', exact: true }).click();
    else if (operation === 'confirm') {
      await begin(page);
      await enterSetupCode(page);
    } else {
      await showCodes(page);
      await finish(page);
    }
    await expect(screen(page, 'ended')).toBeVisible();
    await expect(page.getByText(rateCopy, { exact: true })).toBeVisible();
    await expect(page.getByText(/15 minutes/)).toHaveCount(0);
    expect(http.count(paths[operation])).toBe(1);
    expect(http.count(paths.read)).toBe(1);
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeEnabled();
  });
}

for (const [id, status, copy] of [
  ['error.tfa.token.invalid', 401, overCopy],
  ['error.otp.already.used', 401, overCopy],
  ['error.2fa.rate_limit_exceeded', 401, rateCopy],
] as const) {
  test(`TEST-V2 REQ-6 REQ-12 enrolled verify ${id} ends the form sign-in`, async ({ page }) => {
    const http = await runtime(page, 'verify');
    await endpoint(page, paths.verify, [failure(id, status)]);
    await land(page, 'verify');
    await page.getByRole('textbox', { name: 'Verification code', exact: true }).fill('123456');
    await expect(screen(page, 'ended')).toBeVisible();
    await expect(page.getByText(copy, { exact: true })).toBeVisible();
    expect(http.count(paths.verify)).toBe(1);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
  });
}
