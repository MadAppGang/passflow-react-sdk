import { expect, test } from '../fixture';
import {
  appOrigin, corsHeaders, expectReadOnly, failState, installEnrollmentBoundary,
  onState, overCopy, rateCopy, screen, signInToFactor, unavailableCopy,
} from './enrollment-contract.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

test('TEST-B1 REQ-1 REQ-13 StrictMode waits for state before showing code or spending any budget', async ({ page }) => {
  const { requests } = await installEnrollmentBoundary(page);
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  await onState(page, async (route) => {
    await held;
    await failState(route, 'error.tfa.token.invalid', 401);
  });
  try {
    await signInToFactor(page);
    await expect(screen(page, 'loading')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Checking your sign-in...');
    await expect(page.getByRole('textbox', { name: /code/i })).toHaveCount(0);
    expectReadOnly(requests, 1);
    release();
    await expect(screen(page, 'ended')).toBeVisible();
    expectReadOnly(requests, 1);
  } finally {
    release();
  }
});

for (const id of [
  'error.tfa.token.invalid',
  'error.otp.already.used',
  'error.2fa.not_enabled', // State-read 401 must override the operation classifier's special case.
  'error.unrelated.read.failure',
]) {
  test(`TEST-B2 REQ-6 REQ-17 any state-read 401 (${id}) ends sign-in with an explicit way out`, async ({ page }) => {
    const { requests } = await installEnrollmentBoundary(page);
    await onState(page, (route) => failState(route, id, 401));
    await signInToFactor(page);
    await expect(screen(page, 'ended')).toBeVisible();
    await expect(page.getByText(overCopy, { exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /code/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0);
    await expect(page.getByText('Private translated diagnostic', { exact: false })).toHaveCount(0);
    expectReadOnly(requests, 1);
    // Architecture: "send to sign in" is a button, not a timed redirect.
    await expect(page).toHaveURL((url) => url.pathname === '/web/two-factor-verify');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
  });
}

test('TEST-B3 REQ-1 REQ-11 REQ-17 a failed state read retries only on a tap, despite the mount guard', async ({ page }) => {
  const { requests } = await installEnrollmentBoundary(page);
  let reads = 0;
  await onState(page, (route) =>
    ++reads === 1 ? route.abort('failed') : failState(route, 'error.not.implemented', 501));
  await signInToFactor(page);
  await expect(screen(page, 'read-failed')).toBeVisible();
  await expect(page.getByText('We could not continue your sign-in. Try again.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
  expectReadOnly(requests, 1);
  await page.getByRole('button', { name: /try again/i }).click();
  await expect(screen(page, 'unavailable')).toBeVisible();
  await expect(page.getByText(unavailableCopy, { exact: true })).toBeVisible();
  expectReadOnly(requests, 2);
});

test('TEST-B4 REQ-1 REQ-17 an older server returning 404 cannot bypass enrollment with a code prompt', async ({ page }) => {
  const { requests } = await installEnrollmentBoundary(page);
  await onState(page, (route) => failState(route, 'error.route.not_found', 404));
  await signInToFactor(page);
  await expect(screen(page, 'read-failed')).toBeVisible();
  expectReadOnly(requests, 1);
  await page.getByRole('button', { name: /try again/i }).click();
  await expect.poll(() => requests.filter((request) => request.method === 'GET').length).toBe(2);
  await expect(screen(page, 'read-failed')).toBeVisible();
  await expect(page.getByRole('textbox', { name: /code/i })).toHaveCount(0);
  expectReadOnly(requests, 2);
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});

test('TEST-B5 REQ-4 REQ-11 unsupported enrollment shows administrator guidance and Back to sign in', async ({ page }) => {
  const { requests } = await installEnrollmentBoundary(page);
  await onState(page, (route) => failState(route, 'error.not.implemented', 501));
  await signInToFactor(page);
  await expect(screen(page, 'unavailable')).toBeVisible();
  await expect(page.getByText(unavailableCopy, { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /code/i })).toHaveCount(0);
  expectReadOnly(requests, 1);
  await page.getByRole('button', { name: 'Back to sign in' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});

test('TEST-B5 REQ-12 raw 429 ignores the server 15-minute string and ends with SDK copy', async ({ page }) => {
  const { requests } = await installEnrollmentBoundary(page);
  await onState(page, (route) => route.fulfill({
    status: 429, headers: { ...corsHeaders, 'retry-after': '0' },
    json: { error: 'Too many requests. Try again in 15 minutes.' },
  }));
  await signInToFactor(page);
  await expect(screen(page, 'ended')).toBeVisible();
  await expect(page.getByText(rateCopy, { exact: true })).toBeVisible();
  await expect(page.getByText(/15 minutes/)).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: /code/i })).toHaveCount(0);
  // GET 429 retries belong to core; the client must still spend no POST budget.
  expect(requests.filter((request) => request.method === 'GET').length).toBeGreaterThanOrEqual(1);
  expectReadOnly(requests, requests.filter((request) => request.method === 'GET').length);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
});

test('TEST-B6 REQ-6 client-side signin → factor → signin preserves app and parent without attempt secrets', async ({ page }) => {
  const { requests } = await installEnrollmentBoundary(page);
  await onState(page, (route) => failState(route, 'error.tfa.token.invalid', 401));
  const search = '?' + new URLSearchParams({
    appid: 'context-app', parent_challenge_id: 'context-parent',
    challenge_id: 'discard-challenge', expires_at: '2099-11-04T17:12:00Z',
    otp: 'discard-otp', token: 'discard-reset-token', redirect_url: 'https://untrusted.example/steal',
  });
  await signInToFactor(page, search);
  await expect(screen(page, 'ended')).toBeVisible();
  const assertContext = (url: URL) => {
    expect(url.searchParams.get('appid')).toBe('context-app');
    expect(url.searchParams.get('parent_challenge_id')).toBe('context-parent');
    for (const key of ['challenge_id', 'expires_at', 'match_code', 'otp', 'flow', 'token', 'redirect_url']) {
      expect(url.searchParams.has(key), key).toBe(false);
    }
  };
  assertContext(new URL(page.url()));
  // The one-read rule uses a client-side handoff, per contract/test-notes.md:3.
  expectReadOnly(requests, 1);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
  assertContext(new URL(page.url()));
});

test('TEST-B7 REQ-1 REQ-6 REQ-13 fragment landing reads once and never spends setup budget in StrictMode', async ({ page }) => {
  const { requests, tfaToken } = await installEnrollmentBoundary(page);
  await onState(page, (route) => failState(route, 'error.tfa.token.invalid', 401));
  await page.goto(appOrigin + '/web/signin?appid=context-app#tfa_token=' + encodeURIComponent(tfaToken));
  await expect(page).toHaveURL((url) => url.pathname === '/web/two-factor-verify');
  await expect(screen(page, 'ended')).toBeVisible();
  await expect(page.getByText(overCopy, { exact: true })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expectReadOnly(requests, 1);
});
