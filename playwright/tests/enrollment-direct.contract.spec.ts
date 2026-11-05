import { expect, test } from '../fixture';
import { expectReadOnly, screen } from './enrollment-contract.helpers';
import { expectSignedIn, tokens } from './email-verification.helpers';
import {
  begin, changedCopy, confirmData, endpoint, enterSetupCode, expectCodes, failure, finish,
  genericCopy, land, noSetupLink, ok, paths, replacementSecret, runtime, savedOverCopy,
  secret, setupData, showCodes, staleCopy, wrongCopy,
} from './enrollment-runtime.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

test('TEST-D1 REQ-3 REQ-13 direct landing does not begin or challenge in StrictMode', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await land(page, 'direct');
  await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await noSetupLink(page);
  http.readOnly();
});

test('TEST-D2 REQ-3 Get Started spends one begin and shows bare-base64 QR, secret and code', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await land(page, 'direct');
  await begin(page);
  await expect(page.getByRole('img', { name: '2FA QR Code', exact: true })).toHaveAttribute('src', /^data:image\/png;base64,.+/);
  await page.getByRole('button', { name: "Can't scan? Enter code manually", exact: true }).click();
  await expect(page.getByText(secret, { exact: true })).toBeVisible();
  await expect(screen(page, 'setup-code').getByRole('textbox')).toHaveAttribute('maxlength', '6');
  await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
  expect(http.count(paths.begin)).toBe(1);
  expect(http.count(paths.confirm)).toBe(0);
  expect(http.count(paths.verify)).toBe(0);
});

test('TEST-D3 REQ-3 an empty QR hides the image and exposes the manual secret', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.begin, [ok(setupData({ qr_code: '' }))]);
  await land(page, 'direct');
  await begin(page);
  await expect(page.getByRole('img', { name: '2FA QR Code', exact: true })).toHaveCount(0);
  await expect(page.getByText(secret, { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox')).toBeEnabled();
  expect(http.count(paths.begin)).toBe(1);
});

test('TEST-D4 REQ-7 wrong confirm code stays on setup and the next code can succeed', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.confirm, [
    failure('error.api.request.2fa_code.invalid', 401), ok(confirmData),
  ]);
  await land(page, 'direct');
  await begin(page);
  await enterSetupCode(page);
  await expect(screen(page, 'setup-code')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText(wrongCopy);
  expect(http.count(paths.begin)).toBe(1);
  expect(http.count(paths.verify)).toBe(0);
  await enterSetupCode(page, '654321');
  await expectCodes(page);
  expect(http.count(paths.confirm)).toBe(2);
  expect(http.count(paths.verify)).toBe(0);
});

test('TEST-D5 REQ-8 setup incomplete begins once again, changes the key and clears the old code with notice', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.begin, [
    ok(setupData()), ok(setupData({ secret: replacementSecret })),
  ]);
  await endpoint(page, paths.confirm, [failure('error.2fa.setup.incomplete', 400)]);
  await land(page, 'direct');
  await begin(page);
  await enterSetupCode(page);
  await expect(page.getByText(changedCopy, { exact: true })).toBeVisible();
  await expect(screen(page, 'setup-code').getByRole('textbox')).toHaveValue('');
  await page.getByRole('button', { name: "Can't scan? Enter code manually", exact: true }).click();
  await expect(page.getByText(replacementSecret, { exact: true })).toBeVisible();
  await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
  expect(http.count(paths.begin)).toBe(2);
  expect(http.count(paths.confirm)).toBe(1);
});

test('TEST-D6 REQ-8 REQ-17 second setup incomplete is a plain error, not a begin loop', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.begin, (i) => ok(setupData(i ? { secret: replacementSecret } : {})));
  await endpoint(page, paths.confirm, [failure('error.2fa.setup.incomplete', 400)]);
  await land(page, 'direct');
  await begin(page);
  await enterSetupCode(page);
  await expect(page.getByText(changedCopy, { exact: true })).toBeVisible();
  await enterSetupCode(page, '654321');
  await expect(page.getByRole('alert')).toHaveText(genericCopy);
  await expect(screen(page, 'setup-code')).toBeVisible();
  expect(http.count(paths.begin)).toBe(2);
  expect(http.count(paths.confirm)).toBe(2);
  expect(http.count(paths.read)).toBe(1);
});

test('TEST-D7 REQ-3 recovery codes are shown before any finishing verify request', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await land(page, 'direct');
  await showCodes(page);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: "I've Saved These Codes", exact: true })).toBeEnabled();
  expect(http.count(paths.confirm)).toBe(1);
  expect(http.count(paths.verify)).toBe(0);
  expectReadOnly(http.requests.filter((r) => r.path !== paths.begin && r.path !== paths.confirm), 1);
});

test('TEST-D8 REQ-3 finishing sends the exact confirm code once and continues like a completed sign-in', async ({ page }) => {
  const http = await runtime(page, 'direct');
  const response = tokens();
  await endpoint(page, paths.verify, [ok(response)]);
  await land(page, 'direct');
  await showCodes(page, '654321');
  expect(http.count(paths.verify)).toBe(0);
  await finish(page);
  await expectSignedIn(page, response);
  const confirm = http.posts.filter((r) => r.path === paths.confirm);
  const verify = http.posts.filter((r) => r.path === paths.verify);
  expect(confirm).toHaveLength(1);
  expect(verify).toHaveLength(1);
  expect(confirm[0]?.body).toMatchObject({ code: '654321' });
  expect(verify[0]?.body).toMatchObject({ code: '654321' });
  expect(verify[0]?.authorization).toBe('Bearer ' + http.tfaToken);
});

test('TEST-D9 REQ-3 stale held code moves to verify with saved notice and server digit count', async ({ page }) => {
  const http = await runtime(page, 'direct', 8);
  await endpoint(page, paths.verify, [failure('error.api.request.2fa_code.invalid', 401)]);
  await land(page, 'direct');
  await showCodes(page, '12345678');
  await finish(page);
  await expect(screen(page, 'verify')).toBeVisible();
  await expect(page.getByText(staleCopy, { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toHaveAttribute('maxlength', '8');
  await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toHaveValue('');
  await noSetupLink(page);
  expect(http.count(paths.verify)).toBe(1);
  expect(http.count(paths.begin)).toBe(1);
});

test('TEST-D10 REQ-3 REQ-6 over after confirm says setup saved instead of losing that outcome', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.verify, [failure('error.tfa.token.invalid', 401)]);
  await land(page, 'direct');
  await showCodes(page);
  await finish(page);
  await expect(screen(page, 'ended')).toBeVisible();
  await expect(page.getByText(savedOverCopy, { exact: true })).toBeVisible();
  expect(http.count(paths.verify)).toBe(1);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});

test('TEST-D11 REQ-3 generic finishing failure leaves every recovery code available', async ({ page }) => {
  const http = await runtime(page, 'direct');
  await endpoint(page, paths.verify, [failure('error.unexpected', 500)]);
  await land(page, 'direct');
  await showCodes(page);
  await finish(page);
  await expectCodes(page);
  await expect(page.getByRole('alert')).toHaveText(genericCopy);
  await expect(page.getByRole('button', { name: "I've Saved These Codes", exact: true })).toBeEnabled();
  expect(http.count(paths.verify)).toBe(1);
});
