import type { Page, Route } from '@playwright/test';
import { expect, test } from '../fixture';
import { jwt } from './email-verification.helpers';
import { appOrigin, errorBody, setupPasswordless } from './passwordless-approval.helpers';

// A federated return to the hosted login app: `/web/signin?user_state=...#tfa_token=...`, with no `appid`, on a provider
// that was given no app id. These mocks hold the two facts of the real server that made this a dead end in 0.20.0:
//   - discovery answers with the default login app, not the app the user started on;
//   - a 2FA token is only accepted under the app it names in `aud`.
// A mount with `?appid=` or an `appId` prop, or a mock that takes any app, cannot catch it.
const STARTED_ON = 'app-the-user-started-on';
const DEFAULT_LOGIN_APP = 'default-login-app';
const NEVER_STORED = 'state-from-the-callback';
const VERIFY_SCREEN = '/hosted/two-factor-verify';

const tfaToken = jwt({ type: '2fa', aud: [STARTED_ON], challenge_id: 'federated-factor' });
const landing = `${appOrigin}/hosted/signin?user_state=${NEVER_STORED}#tfa_token=${encodeURIComponent(tfaToken)}`;

type Calls = { paths: string[]; apps: string[] };

const installRealServerRules = async (page: Page, enrollment: 'verify' | 'email_link' | 'direct'): Promise<Calls> => {
  await setupPasswordless(page, { pkce: false });
  const calls: Calls = { paths: [], apps: [] };
  await page.route('**/settings', (route) => {
    calls.paths.push('/settings');
    return route.fulfill({ json: { login_app: { app_id: DEFAULT_LOGIN_APP, scopes: ['openid'] } } });
  });
  await page.route('**/auth/2fa/**', async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const app = request.headers()['x-passflow-clientid'] ?? '';
    calls.paths.push(path);
    calls.apps.push(app);
    if (app !== STARTED_ON) {
      await route.fulfill({
        status: 400,
        json: errorBody('error.token.invalid.error', 'Invalid token: audience', 400, path),
      });
      return;
    }
    if (path === '/auth/2fa/enrollment') {
      await route.fulfill({ json: { enrollment, totp_digits: 6 } });
      return;
    }
    await route.fulfill({ status: 501, json: errorBody('error.not.implemented', 'Not mocked', 501, path) });
  });
  return calls;
};

const expectOnVerifyUnderTheRightApp = async (page: Page, calls: Calls) => {
  await expect(page).toHaveURL((url) => url.pathname === VERIFY_SCREEN);
  expect(new URL(page.url()).searchParams.get('appid')).toBe(STARTED_ON);
  expect(calls.apps.length).toBeGreaterThan(0);
  expect(new Set(calls.apps)).toEqual(new Set([STARTED_ON]));
};

test('a new federated user the provider does not vouch for reaches direct setup under the app they started on', async ({ page }) => {
  const calls = await installRealServerRules(page, 'direct');
  await page.goto(landing);
  await expect(page.getByText('Enable Two-Factor Authentication')).toBeVisible();
  await expectOnVerifyUnderTheRightApp(page, calls);
});

test('a new federated user the provider vouches for reaches the emailed setup link', async ({ page }) => {
  const calls = await installRealServerRules(page, 'email_link');
  await page.goto(landing);
  await expect(page.getByRole('button', { name: 'Email me a setup link' })).toBeVisible();
  await expectOnVerifyUnderTheRightApp(page, calls);
});

test('an enrolled federated user reaches the code screen', async ({ page }) => {
  const calls = await installRealServerRules(page, 'verify');
  await page.goto(landing);
  await expect(page.getByText('Enter the 6-digit code from your authenticator app')).toBeVisible();
  await expectOnVerifyUnderTheRightApp(page, calls);
});

test('a reload on the 2FA screen keeps the app', async ({ page }) => {
  const calls = await installRealServerRules(page, 'direct');
  await page.goto(landing);
  await expect(page.getByText('Enable Two-Factor Authentication')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Enable Two-Factor Authentication')).toBeVisible();
  await expectOnVerifyUnderTheRightApp(page, calls);
});

test('an app id on the URL still wins over the token', async ({ page }) => {
  const calls = await installRealServerRules(page, 'direct');
  await page.goto(`${appOrigin}/hosted/signin?appid=${DEFAULT_LOGIN_APP}#tfa_token=${encodeURIComponent(tfaToken)}`);
  await expect(page).toHaveURL((url) => url.pathname === VERIFY_SCREEN);
  await expect.poll(() => calls.apps[0]).toBe(DEFAULT_LOGIN_APP);
});

test('a plain visit with no app id and no token still discovers the app', async ({ page }) => {
  const calls = await installRealServerRules(page, 'direct');
  const appSettings = page.waitForRequest('**/app/settings');
  await page.goto(`${appOrigin}/hosted/signin`);
  await expect(page.getByRole('heading', { name: 'Sign In to your account' })).toBeVisible();
  expect((await appSettings).headers()['x-passflow-clientid']).toBe(DEFAULT_LOGIN_APP);
  expect(calls.apps).toEqual([]);
  await expect(page).toHaveURL((url) => url.pathname === '/hosted/signin');
});

// How a sign-in ends on the hosted login. Its default redirect is usually its own sign-in page.
const OWN_SIGN_IN = `${appOrigin}/hosted/signin`;
const REAL_APP = 'https://app.example.test/home';
const SIGNED_IN = "You're signed in";

const installEnding = async (page: Page, defaultRedirect: string | undefined) => {
  await setupPasswordless(page, { pkce: false });
  await page.route('**/app/settings', (route) =>
    route.fulfill({
      json: {
        id: STARTED_ON,
        active: true,
        pkce_enabled: false,
        force_passwordless_login: false,
        registration_allowed: true,
        defaults: { redirect: defaultRedirect },
        auth_strategies: [{ strategy: { identity: 'email', challenge: 'password', transport: 'none' }, type: 'internal' }],
      },
    }),
  );
  const tokens = { access_token: jwt({ type: 'access' }), refresh_token: jwt({ type: 'refresh' }) };
  await page.route('**/auth/login', (route) => route.fulfill({ json: tokens }));
  await page.route('**/auth/register', (route) => route.fulfill({ json: tokens }));
  await page.route(`${REAL_APP}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>The real app</h1>' }));
};

const submit = async (page: Page, screen: 'signin' | 'signup') => {
  await page.goto(`${appOrigin}/hosted/${screen}?appid=${STARTED_ON}`);
  await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Correct-horse-battery-9!');
  await page.getByRole('button', { name: screen === 'signin' ? 'Sign In' : 'Sign Up', exact: true }).click();
};

for (const screen of ['signin', 'signup'] as const) {
  for (const [name, target] of [
    ['its own sign-in page', OWN_SIGN_IN],
    ['its own sign-in page with a query and a trailing slash', `${OWN_SIGN_IN}/?from=settings`],
    ['nowhere', undefined],
  ] as const) {
    test(`${screen} with ${name} as the target ends on the signed-in screen, with no tokens in the address bar`, async ({ page }) => {
      await installEnding(page, target);
      await submit(page, screen);
      await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeVisible();
      expect(new URL(page.url()).hash).toBe('');
      expect(page.url()).not.toContain('access_token');
    });
  }

  test(`${screen} with a real redirect still goes there, tokens included`, async ({ page }) => {
    await installEnding(page, REAL_APP);
    await submit(page, screen);
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
    expect(new URL(page.url()).hash).toContain('access_token=');
  });
}

test('the same path on another host is a real redirect, not the sign-in page', async ({ page }) => {
  const elsewhere = 'https://app.example.test/hosted/signin';
  await installEnding(page, elsewhere);
  await page.route(`${elsewhere}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>The real app</h1>' }));
  await submit(page, 'signin');
  await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
});
