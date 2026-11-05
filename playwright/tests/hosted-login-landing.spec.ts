import type { Page, Route } from '@playwright/test';
import { expect, test } from '../fixture';
import { jwt, tokens } from './email-verification.helpers';
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
  await page.route('**/auth/redirect/check', (route) =>
    route.fulfill({ json: { redirect_url: route.request().postDataJSON().redirect_url } }),
  );
  await page.route(`${REAL_APP}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>The real app</h1>' }));
};

const onCheck = (page: Page, respond: (route: Route) => Promise<void>) => page.route('**/auth/redirect/check', respond);

const submit = async (page: Page, screen: 'signin' | 'signup', requested?: string) => {
  const redirectTo = requested ? `&redirectto=${encodeURIComponent(requested)}` : '';
  await page.goto(`${appOrigin}/hosted/${screen}?appid=${STARTED_ON}${redirectTo}`);
  await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Correct-horse-battery-9!');
  await page.getByRole('button', { name: screen === 'signin' ? 'Sign In' : 'Sign Up', exact: true }).click();
};

// A non-PKCE federated return with no second factor: the server sends it to the login page with the tokens in the query.
const tokenLanding = (host: 'hosted' | 'web', accessToken = tokens().access_token) =>
  `${appOrigin}/${host}/signin?${new URLSearchParams({
    access_token: accessToken,
    refresh_token: tokens().refresh_token,
    user_state: NEVER_STORED,
  })}`;

const installDiscovery = (page: Page) =>
  page.route('**/settings', (route) =>
    route.fulfill({ json: { login_app: { app_id: DEFAULT_LOGIN_APP, scopes: ['openid'] } } }),
  );

test('a federated return with tokens on the hosted login ends on the signed-in screen, with a clean address bar', async ({ page }) => {
  await installEnding(page, REAL_APP);
  await installDiscovery(page);
  let checks = 0;
  await onCheck(page, async (route) => {
    checks += 1;
    await route.abort('failed');
  });
  await page.goto(tokenLanding('hosted'));
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeVisible();
  const url = new URL(page.url());
  expect(url.pathname).toBe('/hosted/signin');
  expect(page.url()).not.toContain('access_token');
  expect(url.hash).toBe('');
  expect(checks).toBe(0);
});

test('a malformed token on the hosted login leaves the sign-in form', async ({ page }) => {
  await installEnding(page, REAL_APP);
  await installDiscovery(page);
  await page.goto(tokenLanding('hosted', 'not-a-token'));
  await expect(page.getByRole('heading', { name: 'Sign In to your account' })).toBeVisible();
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
});

test('a federated return with tokens on an embedded flow does not show the signed-in screen', async ({ page }) => {
  await installEnding(page, REAL_APP);
  await page.goto(tokenLanding('web'));
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
});

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

  test(`${screen}: the app's default redirect goes there, tokens included, with no check`, async ({ page }) => {
    await installEnding(page, REAL_APP);
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.abort('failed');
    });
    await submit(page, screen);
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
    expect(new URL(page.url()).hash).toContain('access_token=');
    expect(checks).toBe(0);
  });

  test(`${screen}: a requested target that is the sign-in page ends on the signed-in screen, with no check`, async ({ page }) => {
    await installEnding(page, REAL_APP);
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.abort('failed');
    });
    await submit(page, screen, OWN_SIGN_IN);
    await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeVisible();
    expect(checks).toBe(0);
  });
}

test('a registered target goes to the address the server returns, not the one given', async ({ page }) => {
  const requested = 'https://app.example.test/HOME/../home';
  await installEnding(page, undefined);
  const bodies: unknown[] = [];
  await onCheck(page, async (route) => {
    bodies.push(route.request().postDataJSON());
    await route.fulfill({ json: { redirect_url: REAL_APP } });
  });
  await submit(page, 'signin', requested);
  await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/home');
  expect(bodies).toEqual([{ redirect_url: requested }]);
});

for (const screen of ['signin', 'signup'] as const) {
  test(`${screen}: a refused target shows the error page and sends nothing`, async ({ page }) => {
    await installEnding(page, undefined);
    const left: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith(REAL_APP)) left.push(request.url());
    });
    await onCheck(page, (route) =>
      route.fulfill({
        status: 400,
        json: errorBody('error.app.redirect.url.not.registered', 'Not registered', 400, '/auth/redirect/check'),
      }),
    );
    await submit(page, screen, REAL_APP);
    await expect(page.getByTestId('sign-in-refused')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    expect(left).toEqual([]);
    expect(page.url()).not.toContain('access_token');
  });
}

for (const [name, fail] of [
  ['a server error', (route: Route) => route.fulfill({ status: 500, json: errorBody('error.internal', 'x', 500, '/auth/redirect/check') })],
  ['no route on the server', (route: Route) => route.fulfill({ status: 404, body: '404 page not found' })],
  ['a network error', (route: Route) => route.abort('failed')],
] as const) {
  test(`${name} on the check sends nothing, and a retry can finish`, async ({ page }) => {
    await installEnding(page, undefined);
    let calls = 0;
    await onCheck(page, async (route) => {
      calls += 1;
      if (calls === 1) await fail(route);
      else await route.fulfill({ json: { redirect_url: REAL_APP } });
    });
    await submit(page, 'signin', REAL_APP);
    await expect(page.getByTestId('sign-in-unavailable')).toBeVisible();
    expect(page.url()).not.toContain('access_token');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
  });
}

for (const [name, target] of [
  ['a script address', 'javascript:document.title="ran"'],
  ['an address with no scheme', '//app.example.test/home'],
] as const) {
  test(`${name} goes to the check, and refused it does nothing`, async ({ page }) => {
    await installEnding(page, undefined);
    const bodies: unknown[] = [];
    await onCheck(page, async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({
        status: 400,
        json: errorBody('error.app.redirect.url.not.registered', 'Not registered', 400, '/auth/redirect/check'),
      });
    });
    await submit(page, 'signin', target);
    await expect(page.getByTestId('sign-in-refused')).toBeVisible();
    expect(bodies).toEqual([{ redirect_url: target }]);
    expect(await page.title()).not.toBe('ran');
  });
}

test('a requested path on this origin navigates without a check', async ({ page }) => {
  await installEnding(page, undefined);
  let calls = 0;
  await onCheck(page, async (route) => {
    calls += 1;
    await route.abort('failed');
  });
  await submit(page, 'signin', '/hosted/signup');
  await expect(page).toHaveURL((url) => url.pathname === '/hosted/signup' && url.hash === '');
  expect(calls).toBe(0);
});

test('a requested target equal to the default is still checked: the source decides, not the value', async ({ page }) => {
  await installEnding(page, REAL_APP);
  await onCheck(page, (route) =>
    route.fulfill({
      status: 400,
      json: errorBody('error.app.redirect.url.not.registered', 'Not registered', 400, '/auth/redirect/check'),
    }),
  );
  await submit(page, 'signin', REAL_APP);
  await expect(page.getByTestId('sign-in-refused')).toBeVisible();
});

test('after a 2FA code, a refused target shows the error page and sends nothing', async ({ page }) => {
  await installEnding(page, undefined);
  await page.route('**/auth/login', (route) =>
    route.fulfill({ json: { requires_2fa: true, tfa_token: tfaToken, challenge_id: 'factor', totp_digits: 6 } }),
  );
  await page.route('**/auth/2fa/enrollment', (route) => route.fulfill({ json: { enrollment: 'verify', totp_digits: 6 } }));
  await page.route('**/auth/2fa/challenge', (route) => route.fulfill({ json: { challenge_id: 'factor' } }));
  await page.route('**/auth/2fa/verify', (route) =>
    route.fulfill({ json: { access_token: jwt({ type: 'access' }), refresh_token: jwt({ type: 'refresh' }) } }),
  );
  await onCheck(page, (route) =>
    route.fulfill({
      status: 400,
      json: errorBody('error.app.redirect.url.not.registered', 'Not registered', 400, '/auth/redirect/check'),
    }),
  );
  await submit(page, 'signin', REAL_APP);
  await page.getByRole('textbox').first().click();
  await page.keyboard.type('123456');
  await expect(page.getByTestId('sign-in-refused')).toBeVisible();
  expect(page.url()).not.toContain('access_token');
});

test('the same path on another host is a real redirect, not the sign-in page', async ({ page }) => {
  const elsewhere = 'https://app.example.test/hosted/signin';
  await installEnding(page, undefined);
  await page.route(`${elsewhere}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>The real app</h1>' }));
  await submit(page, 'signin', elsewhere);
  await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
});
