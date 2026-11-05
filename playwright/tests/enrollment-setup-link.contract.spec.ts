import { expect, test } from '../fixture';
import { rateCopy, screen } from './enrollment-contract.helpers';
import {
  assertLinkRequests, linkBoundary, linkBeginPath, linkConfirmPath, linkSession, linkUrl,
  openLink, storeExpiredSession, validationPath,
} from './enrollment-link-session.helpers';
import {
  begin, enterSetupCode, expectCodes, failure, ok, showCodes,
} from './enrollment-runtime.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

test('TEST-L0 REQ-14 link validation loading is visible and validates once under StrictMode', async ({ page }) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const requests = await linkBoundary(page, { holdValidation: held });
  try {
    await page.goto(linkUrl);
    await expect(screen(page, 'link-loading')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toHaveCount(0);
    assertLinkRequests(requests, { phase: 'mount' });
    release();
    await expect(screen(page, 'setup-start')).toBeVisible();
    assertLinkRequests(requests, { phase: 'mount' });
  } finally { release(); }
});

test('TEST-L1 REQ-14 expired stored access plus refresh cannot trigger provider, user, settings or refresh requests', async ({ page }) => {
  await storeExpiredSession(page);
  const requests = await linkBoundary(page);
  await openLink(page);
  await expect(page.getByRole('button', { name: 'Get Started', exact: true })).toBeEnabled();
  // Stop before Sign in: that user action legitimately leaves the restricted session.
  assertLinkRequests(requests, { phase: 'mount' });
});

test('TEST-L2 REQ-14 REQ-15 validation has no bearer, begin/confirm use only link session, codes survive confirm', async ({ page }) => {
  await storeExpiredSession(page);
  const requests = await linkBoundary(page);
  await openLink(page);
  await showCodes(page);
  await expectCodes(page);
  await expect(page.getByRole('button', { name: "I've Saved These Codes", exact: true })).toBeEnabled();
  await expect(screen(page, 'link-error')).toHaveCount(0);
  await expect(screen(page, 'setup-start')).toHaveCount(0);
  assertLinkRequests(requests, { phase: 'confirmed' });
  expect(requests.find((r) => r.path === validationPath)?.authorization).toBeUndefined();
  for (const path of [linkBeginPath, linkConfirmPath]) {
    expect(requests.find((r) => r.path === path)?.authorization).toBe('Bearer ' + linkSession);
  }
  expect(requests.find((r) => r.path === linkConfirmPath)?.body).toMatchObject({ code: '123456' });
});

for (const withParent of [false, true]) {
  test(`TEST-L3 REQ-16 ALREADY_USED says already used and signs in ${withParent ? 'retaining parent context' : 'from an emailed appid-only link'}`, async ({ page }) => {
    const requests = await linkBoundary(page, {
      validation: failure('error.2fa.setup.token.already_used', 400),
    });
    await page.goto(linkUrl + (withParent ? '&parent_challenge_id=link-parent&otp=discard&token=discard' : ''));
    await expect(screen(page, 'link-error')).toBeVisible();
    await expect(page.getByText('This link was already used. Sign in.', { exact: true })).toBeVisible();
    await expect(page.getByText(/contact.*administrator/i)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0);
    // Emailed links have only appid. A parent-context link also runs the provider
    // exchange; its contract here is URL retention, not the restricted request list.
    if (!withParent) assertLinkRequests(requests, { phase: 'mount' });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page).toHaveURL((url) =>
      url.pathname === '/web/signin' && url.searchParams.get('appid') === 'link-app' &&
      url.searchParams.get('parent_challenge_id') === (withParent ? 'link-parent' : null) &&
      !url.searchParams.has('otp') && !url.searchParams.has('token'));
  });
}

for (const scenario of [
  { name: 'EXPIRED_TOKEN', reply: failure('error.2fa.setup.token.expired', 400) },
  { name: 'REVOKED_TOKEN', reply: failure('error.2fa.setup.token.revoked', 400) },
  { name: 'INVALID_TOKEN', reply: ok({ valid: false }) },
  { name: 'RATE_LIMITED', reply: failure('error.2fa.setup.token.rate.limit.exceeded', 429) },
  { name: 'SERVER_ERROR', reply: failure('error.server', 500) },
]) {
  test(`TEST-L4 REQ-12 REQ-14 ${scenario.name} shows link error and its sign-in action; retry only for server error`, async ({ page }) => {
    const requests = await linkBoundary(page, { validation: scenario.reply });
    await page.goto(linkUrl);
    const error = screen(page, 'link-error');
    // Core retries GET 429 after 1s, 2s and 4s before showing the error.
    await expect(error).toBeVisible({ timeout: scenario.name === 'RATE_LIMITED' ? 15000 : 5000 });
    // Only rate limiting has decided wording here. The other error categories
    // require a visible error state and the specified actions, not invented copy.
    if (scenario.name === 'RATE_LIMITED') await expect(error).toContainText(rateCopy);
    const signInLabel = scenario.name === 'RATE_LIMITED' ? 'Sign in' : 'Back to sign in';
    await expect(page.getByRole('button', { name: signInLabel, exact: true })).toBeEnabled();
    if (scenario.name === 'SERVER_ERROR') await expect(page.getByRole('button', { name: /try again/i })).toBeEnabled();
    else await expect(page.getByRole('button', { name: /try again/i })).toHaveCount(0);
    // Core may retry a GET 429, but may not begin, confirm, refresh or request settings.
    const validations = requests.filter((r) => r.path === validationPath).length;
    if (scenario.name === 'RATE_LIMITED') expect(validations).toBeGreaterThanOrEqual(1);
    else expect(validations).toBe(1);
    assertLinkRequests(requests, { phase: 'mount', validations });
  });
}

test('TEST-L5 REQ-14 server-error Try Again explicitly validates again despite the mount guard', async ({ page }) => {
  const requests = await linkBoundary(page, { validation: failure('error.server', 500) });
  await page.goto(linkUrl);
  await expect(screen(page, 'link-error')).toBeVisible();
  await page.getByRole('button', { name: /try again/i }).click();
  await expect.poll(() => requests.filter((r) => r.path === validationPath).length).toBe(2);
  await expect(screen(page, 'link-error')).toBeVisible();
  await expect(page.getByRole('button', { name: /try again/i })).toBeEnabled();
  assertLinkRequests(requests, { phase: 'mount', validations: 2 });
});

// Exercise the host's persisted cookie delivery mode before any app code runs.
// GET /user/me is optional, but must never use the link bearer when it occurs.
for (const cookieStatus of [200, 401] as const) {
  test(`TEST-L6 REQ-14 persisted cookie mode permits GET user/me ${cookieStatus} only without Authorization`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('passflow_delivery_mode', 'cookie'));
    const requests = await linkBoundary(page, { cookieStatus });
    await openLink(page);
    assertLinkRequests(requests, { phase: 'mount', cookieException: true });
    await begin(page);
    await enterSetupCode(page);
    await expectCodes(page);
    await expect(screen(page, 'link-error')).toHaveCount(0);
    assertLinkRequests(requests, { phase: 'confirmed', cookieException: true });
  });
}
