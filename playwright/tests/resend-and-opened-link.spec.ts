import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';
import { jwt, tokens } from './email-verification.helpers';
import { appOrigin, expiresAt, MATCH_CODE, setupPasswordless } from './passwordless-approval.helpers';

const APP = 'app-the-user-started-on';
const invite = jwt({ inviter_name: 'A', tenant_name: 'T', type: 'invite' });
const OPENED_LINK = `app_id=${APP}&challenge_id=row&otp=123456`;

const owesSecondFactor = () => ({
  requires_2fa: true,
  tfa_token: jwt({ type: 'tfa', aud: [APP], challenge_id: 'factor' }),
  challenge_id: 'factor',
});

const recordStarts = async (page: Page) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/auth/passwordless/start', (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { challenge_id: 'row', expires_at: expiresAt, match_code: MATCH_CODE } });
  });
  await page.route('**/auth/passwordless/status', (route) => route.fulfill({ json: { status: 'pending' } }));
  return bodies;
};

const startInvited = async (page: Page, button: RegExp) => {
  await page.goto(`${appOrigin}/hosted/signin?appid=${APP}&invite_token=${invite}`);
  await page.getByLabel('Email', { exact: true }).fill('new@example.com');
  await page.getByRole('button', { name: button }).click();
};

const expectResendKeepsInvite = async (page: Page, bodies: Record<string, unknown>[]) => {
  await page.getByRole('button', { name: /Resend/ }).click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(bodies[0]?.invite_token).toBe(invite);
  expect(bodies[1]?.invite_token).toBe(invite);
};

test.describe('resending to an invited user', () => {
  test('email link, this tab has nothing to wait for', async ({ page }) => {
    await setupPasswordless(page, { pkce: false });
    const bodies = await recordStarts(page);
    await startInvited(page, /email link$/);
    await expect(page.getByRole('button', { name: 'Resend email' })).toBeVisible();
    await expectResendKeepsInvite(page, bodies);
  });

  test('email link, this tab is waiting', async ({ page }) => {
    await page.clock.install();
    await setupPasswordless(page);
    const bodies = await recordStarts(page);
    await startInvited(page, /email link$/);
    await expect(page.getByText(MATCH_CODE, { exact: true })).toBeVisible();
    await page.clock.runFor(61_000);
    await expectResendKeepsInvite(page, bodies);
  });

  test('OTP', async ({ page }) => {
    await page.clock.install();
    await setupPasswordless(page, { pkce: false, magic: false });
    const bodies = await recordStarts(page);
    await startInvited(page, /(code|OTP)/i);
    await expect(page).toHaveURL(/verify-challenge-otp/);
    await page.clock.runFor(31_000);
    await expectResendKeepsInvite(page, bodies);
  });

  test('a user with no invite sends none', async ({ page }) => {
    await setupPasswordless(page, { pkce: false });
    const bodies = await recordStarts(page);
    await page.goto(`${appOrigin}/hosted/signin?appid=${APP}`);
    await page.getByLabel('Email', { exact: true }).fill('new@example.com');
    await page.getByRole('button', { name: /email link$/ }).click();
    await page.getByRole('button', { name: 'Resend email' }).click();
    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[1]).not.toHaveProperty('invite_token');
  });
});

test('forgot password with a username reaches its success screen and resends by username', async ({ page }) => {
  await setupPasswordless(page);
  const sent: unknown[] = [];
  await page.route('**/auth/password/reset', (route) => {
    sent.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true } });
  });
  await page.goto(`${appOrigin}/hosted/forgot-password?appid=${APP}&default_method=email_or_username`);
  await page.getByRole('textbox').first().fill('someuser');
  await page.getByRole('button', { name: 'Send reset instructions' }).click();

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText('We sent a link to the email address for')).toContainText('someuser');
  await page.getByRole('button', { name: 'Resend email' }).click();
  await expect.poll(() => sent).toEqual([{ username: 'someuser' }, { username: 'someuser' }]);
});

test('an opened link completes once under StrictMode', async ({ page }) => {
  await setupPasswordless(page);
  let completes = 0;
  await page.route('**/auth/passwordless/complete', (route) => {
    completes += 1;
    return route.fulfill({ json: { ...tokens(), redirect_url: '' } });
  });
  await page.goto(`${appOrigin}/hosted/verify-challenge-otp?appid=${APP}&${OPENED_LINK}`);
  await expect(page.getByRole('heading', { name: "You're signed in" })).toBeVisible();
  expect(completes).toBe(1);
});

test.describe('a first factor that owes the second, on a screen that starts on mount', () => {
  test('a reloaded waiting tab stays under the flow prefix', async ({ page }) => {
    await setupPasswordless(page);
    await recordStarts(page);
    await startInvited(page, /email link$/);
    await expect(page.getByText(MATCH_CODE, { exact: true })).toBeVisible();
    await page.unroute('**/auth/passwordless/status');
    await page.route('**/auth/passwordless/status', (route) => route.fulfill({ json: { status: 'approved', code: 'authz' } }));
    await page.route('**/auth/pkce_exchange', (route) => route.fulfill({ json: owesSecondFactor() }));
    await page.reload();
    await expect.poll(() => new URL(page.url()).pathname).toBe('/hosted/two-factor-verify');
  });

  test('an opened link stays under the flow prefix', async ({ page }) => {
    await setupPasswordless(page);
    await page.route('**/auth/passwordless/complete', (route) => route.fulfill({ json: owesSecondFactor() }));
    await page.goto(`${appOrigin}/hosted/verify-challenge-otp?appid=${APP}&${OPENED_LINK}`);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/hosted/two-factor-verify');
  });

  test('an opened link stays in a hash router', async ({ page }) => {
    await setupPasswordless(page);
    await page.route('**/auth/passwordless/complete', (route) => route.fulfill({ json: owesSecondFactor() }));
    await page.goto(`${appOrigin}/hosted?appid=${APP}&router=hash#/verify-challenge-otp?${OPENED_LINK}`);
    await expect.poll(() => new URL(page.url()).hash).toContain('two-factor-verify');
    expect(new URL(page.url()).pathname).toBe('/hosted');
  });
});
