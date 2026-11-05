import { expect, test } from '../fixture';
import { rateCopy, screen } from './enrollment-contract.helpers';
import {
  checkEmailCopy, endpoint, failure, land, ok, paths, rawRateLimit, runtime, sendFailedCopy,
} from './enrollment-runtime.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

test('TEST-E1 REQ-2 REQ-13 email_link landing spends no budget under StrictMode', async ({ page }) => {
  const http = await runtime(page, 'email_link');
  await land(page, 'email_link');
  await expect(page.getByRole('button', { name: 'Email me a setup link', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  http.readOnly();
});

test('TEST-E2 REQ-2 first tap sends once and says check email and sign in again', async ({ page }) => {
  const http = await runtime(page, 'email_link');
  await land(page, 'email_link');
  await page.getByRole('button', { name: 'Email me a setup link', exact: true }).click();
  await expect(page.getByText(checkEmailCopy, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send again', exact: true })).toBeEnabled();
  expect(http.count(paths.send)).toBe(1);
  expect(http.posts[0]?.authorization).toBe('Bearer ' + http.tfaToken);
});

test('TEST-E3 REQ-2 REQ-13 exactly three user sends exhaust resend controls, with a way back', async ({ page }) => {
  const http = await runtime(page, 'email_link');
  await land(page, 'email_link');
  await page.getByRole('button', { name: 'Email me a setup link', exact: true }).click();
  for (const count of [2, 3]) {
    await page.getByRole('button', { name: 'Send again', exact: true }).click();
    await expect.poll(() => http.count(paths.send)).toBe(count);
    await expect(page.getByText(checkEmailCopy, { exact: true })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /send again|email me a setup link/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
  expect(http.count(paths.read)).toBe(1);
  expect(http.count(paths.begin)).toBe(0);
  expect(http.count('/auth/2fa/challenge')).toBe(0);
});

for (const [name, reply] of [
  ['email_sent false', ok({ email_sent: false })],
  ['503 send_failed', failure('error.2fa.setup_link.send_failed', 503)],
] as const) {
  test(`TEST-E4 REQ-10 ${name} shows the specified send failure without ending sign-in`, async ({ page }) => {
    const http = await runtime(page, 'email_link');
    await endpoint(page, paths.send, [reply]);
    await land(page, 'email_link');
    await page.getByRole('button', { name: 'Email me a setup link', exact: true }).click();
    await expect(screen(page, 'email-link')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText(sendFailedCopy);
    await expect(page.getByRole('button', { name: /send again|email me a setup link/i })).toBeEnabled();
    expect(http.count(paths.send)).toBe(1);
    expect(http.count(paths.read)).toBe(1);
  });
}

test('TEST-E5 REQ-12 raw send 429 ends sign-in with own copy, not 15 minutes', async ({ page }) => {
  const http = await runtime(page, 'email_link');
  await endpoint(page, paths.send, [rawRateLimit]);
  await land(page, 'email_link');
  await page.getByRole('button', { name: 'Email me a setup link', exact: true }).click();
  await expect(screen(page, 'ended')).toBeVisible();
  await expect(page.getByText(rateCopy, { exact: true })).toBeVisible();
  await expect(page.getByText(/15 minutes/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /send again|email me a setup link/i })).toHaveCount(0);
  expect(http.count(paths.send)).toBe(1);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});
