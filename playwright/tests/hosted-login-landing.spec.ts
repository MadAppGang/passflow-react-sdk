import { generateKeyPairSync, type KeyObject, sign } from 'node:crypto';
import type { Page, Route } from '@playwright/test';
import { SERVICE_UNAVAILABLE_MESSAGE } from '@passflow/core';
import { expect, test } from '../fixture';
import { jwt, tokens } from './email-verification.helpers';
import { appOrigin, errorBody, expiresAt, MATCH_CODE, setupPasswordless, successUrl } from './passwordless-approval.helpers';

// A federated return to the hosted login app: `/web/signin?user_state=...#tfa_token=...`, with no `appid`, on a provider
// that was given no app id. These mocks hold the two facts of the real server that made this a dead end in 0.20.0:
//   - discovery answers with the default login app, not the app the user started on;
//   - a 2FA token is only accepted under the app it names in `aud`.
// A mount with `?appid=` or an `appId` prop, or a mock that takes any app, cannot catch it.
const STARTED_ON = 'app-the-user-started-on';
const DEFAULT_LOGIN_APP = 'default-login-app';
const NEVER_STORED = 'state-from-the-callback';
const VERIFY_SCREEN = '/hosted/two-factor-verify';

// `**/settings` would also match `/app/settings`: discovery is the `/settings` path alone.
const DISCOVERY = (url: URL) => url.pathname === '/settings';

const tfaToken = jwt({ type: '2fa', aud: [STARTED_ON], challenge_id: 'federated-factor' });
const landing = `${appOrigin}/hosted/signin?user_state=${NEVER_STORED}#tfa_token=${encodeURIComponent(tfaToken)}`;

type Calls = { paths: string[]; apps: string[] };

const installRealServerRules = async (page: Page, enrollment: 'verify' | 'email_link' | 'direct'): Promise<Calls> => {
  await setupPasswordless(page, { pkce: false });
  const calls: Calls = { paths: [], apps: [] };
  await page.route(DISCOVERY, (route) => {
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

type Issued = { access_token: string; refresh_token?: string; id_token?: string };

// `sdk` is an app in SDK mode (`pkce_enabled: true`): sign-in answers with a code, exchanged for the tokens.
const installEnding = async (
  page: Page,
  defaultRedirect: string | undefined,
  options: { sdk?: boolean; issued?: Issued } = {},
) => {
  const sdk = options.sdk ?? false;
  await setupPasswordless(page, { pkce: sdk });
  await page.route('**/app/settings', (route) =>
    route.fulfill({
      json: {
        id: STARTED_ON,
        active: true,
        pkce_enabled: sdk,
        force_passwordless_login: false,
        registration_allowed: true,
        defaults: { redirect: defaultRedirect },
        auth_strategies: [{ strategy: { identity: 'email', challenge: 'password', transport: 'none' }, type: 'internal' }],
      },
    }),
  );
  const tokens = options.issued ?? { access_token: jwt({ type: 'access' }), refresh_token: jwt({ type: 'refresh' }) };
  const answer = sdk ? { code: 'sign-in-code' } : tokens;
  await page.route('**/auth/login', (route) => route.fulfill({ json: answer }));
  await page.route('**/auth/register', (route) => route.fulfill({ json: answer }));
  if (sdk) await page.route('**/auth/pkce_exchange', (route) => route.fulfill({ json: tokens }));
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

// The server validates any address it is sent, and an app need not register the operator's default. So a start call
// names an address only when the request did, and the app's default is applied at the ending.
for (const flow of ['signin', 'signup'] as const) {
  const beginEmailLink = async (page: Page, requested?: string) => {
    let body: Record<string, unknown> = {};
    await page.route('**/auth/passwordless/start', (route) => {
      body = route.request().postDataJSON();
      return route.fulfill({ json: { challenge_id: 'row', expires_at: expiresAt, match_code: MATCH_CODE } });
    });
    await page.route('**/auth/passwordless/status', (route) => route.fulfill({ json: { status: 'approved', code: 'authz-code' } }));
    await page.route('**/auth/pkce_exchange', (route) => route.fulfill({ json: tokens() }));
    const target = requested ? `&redirectto=${encodeURIComponent(requested)}` : '';
    await page.goto(`${appOrigin}/hosted/${flow}?appid=${STARTED_ON}${target}`);
    await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
    await page.getByRole('button', { name: new RegExp(`^Sign ${flow === 'signup' ? 'Up' : 'In'} with email link$`) }).click();
    return () => body;
  };

  test(`${flow}: an email link with no target names no address, and an SDK app's default applies at the end, bare and unchecked`, async ({
    page,
  }) => {
    await setupPasswordless(page);
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.abort('failed');
    });
    const startBody = await beginEmailLink(page);
    await expect(page.getByRole('heading', { name: 'Authentication complete' })).toBeVisible();
    expect(startBody()).not.toHaveProperty('redirect_url');
    const landed = new URL(page.url());
    expect(landed.hash).toBe('');
    expect(page.url()).not.toContain('access_token');
    expect(checks).toBe(0);
  });

  test(`${flow}: an email link with no target names no address, and a Simple app gets the tokens at the address the opened link answers`, async ({
    page,
  }) => {
    await setupPasswordless(page, { pkce: false });
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.fulfill({ json: { redirect_url: route.request().postDataJSON().redirect_url } });
    });
    const startBody = await beginEmailLink(page);
    await expect(page.getByRole('button', { name: /^Resend email/ })).toBeVisible();
    expect(startBody()).not.toHaveProperty('redirect_url');
    // The server answers the opened link with the app's default address.
    const issued = tokens();
    await page.route('**/auth/passwordless/complete', (route) =>
      route.fulfill({ json: { ...issued, redirect_url: successUrl } }),
    );
    await page.goto(`${appOrigin}/hosted/verify-challenge-otp?appid=${STARTED_ON}&app_id=${STARTED_ON}&challenge_id=row&otp=123456`);
    await expect(page.getByRole('heading', { name: 'Authentication complete' })).toBeVisible();
    const fragment = new URLSearchParams(new URL(page.url()).hash.slice(1));
    expect(fragment.get('access_token')).toBe(issued.access_token);
    // The hosted login was not asked for `offline`, so no refresh token leaves it.
    expect(fragment.has('refresh_token')).toBe(false);
    expect(checks).toBe(1);
  });

  test(`${flow}: an email link with a target names it, and it is checked at the end`, async ({ page }) => {
    await setupPasswordless(page);
    await page.route(`${REAL_APP}**`, (route) => route.fulfill({ contentType: 'text/html', body: '<h1>The real app</h1>' }));
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.fulfill({ json: { redirect_url: REAL_APP } });
    });
    const startBody = await beginEmailLink(page, REAL_APP);
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
    expect(startBody().redirect_url).toBe(REAL_APP);
    expect(checks).toBe(1);
  });
}

for (const flow of ['signin', 'signup'] as const) {
  test(`a redirect_url left on the ${flow} page is not carried into an email link`, async ({ page }) => {
    await setupPasswordless(page);
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.abort('failed');
    });
    await page.route('**/auth/passwordless/start', (route) =>
      route.fulfill({ json: { challenge_id: 'row', expires_at: expiresAt, match_code: MATCH_CODE } }),
    );
    await page.route('**/auth/passwordless/status', (route) => route.fulfill({ json: { status: 'approved', code: 'authz-code' } }));
    await page.route('**/auth/pkce_exchange', (route) => route.fulfill({ json: tokens() }));
    await page.goto(`${appOrigin}/hosted/${flow}?appid=${STARTED_ON}&redirect_url=${encodeURIComponent(REAL_APP)}`);
    await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
    await page.getByRole('button', { name: new RegExp(`^Sign ${flow === 'signup' ? 'Up' : 'In'} with email link$`) }).click();
    await expect(page.getByRole('heading', { name: 'Authentication complete' })).toBeVisible();
    expect(checks).toBe(0);
  });
}

test('an opened email link whose answer is the sign-in page ends on the signed-in screen, with no check', async ({ page }) => {
  await installEnding(page, undefined);
  let checks = 0;
  await onCheck(page, async (route) => {
    checks += 1;
    await route.abort('failed');
  });
  await page.route('**/auth/passwordless/complete', (route) =>
    route.fulfill({ json: { ...tokens(), redirect_url: OWN_SIGN_IN } }),
  );
  await page.goto(`${appOrigin}/hosted/verify-challenge-otp?appid=${STARTED_ON}&app_id=${STARTED_ON}&challenge_id=row&otp=123456`);
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeVisible();
  expect(page.url()).not.toContain('access_token');
  expect(checks).toBe(0);
});

test('forgot password with no target names no address, reaches its success screen and can resend', async ({ page }) => {
  await setupPasswordless(page);
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/auth/password/reset', (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true } });
  });
  // A `redirect_url` left on the page must not reach the resend either.
  await page.goto(
    `${appOrigin}/hosted/forgot-password?appid=${STARTED_ON}&default_method=email_or_username&redirect_url=${encodeURIComponent(REAL_APP)}`,
  );
  await page.getByRole('textbox').first().fill('mailbox@example.com');
  await page.getByRole('button', { name: 'Send reset instructions' }).click();
  await expect(page.getByText('Check your email')).toBeVisible();
  await page.getByRole('button', { name: /resend/i }).click();
  await expect.poll(() => bodies.length).toBe(2);
  for (const body of bodies) expect(body).not.toHaveProperty('redirect_url');
});

test('Go back on the error screen stays on this origin when the target is a full URL', async ({ page }) => {
  await installEnding(page, REAL_APP);
  const otherHost = 'https://other-host.example.test/';
  let reached = false;
  await page.route(`${otherHost}**`, (route) => {
    reached = true;
    return route.fulfill({ contentType: 'text/html', body: '<h1>Other host</h1>' });
  });
  await page.goto(`${appOrigin}/hosted/signin?appid=${STARTED_ON}&redirectto=${encodeURIComponent(`${otherHost}?error=failed`)}`);
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  expect(page.url().startsWith(appOrigin)).toBe(true);
  expect(reached).toBe(false);
});

test('the form is replaced while the target is checked, so it cannot be submitted again', async ({ page }) => {
  await installEnding(page, undefined);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let checks = 0;
  await onCheck(page, async (route) => {
    checks += 1;
    await held;
    await route.fulfill({ json: { redirect_url: REAL_APP } });
  });
  await page.route(`${REAL_APP}**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<h1>The real app</h1>' }),
  );
  await submit(page, 'signin', REAL_APP);
  await expect(page.getByTestId('sign-in-checking')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
  expect(checks).toBe(1);
});

test('an OIDC sign-in that the provider already redirected is not checked or redirected again', async ({ page }) => {
  await setupPasswordless(page, { pkce: false });
  const parent = 'https://relying-party.example.test/cb';
  let checks = 0;
  await onCheck(page, async (route) => {
    checks += 1;
    await route.abort('failed');
  });
  // A slow relying party: the page is still here while its navigation is under way.
  await page.route(`${parent}**`, async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.fulfill({ contentType: 'text/html', body: '<h1>Relying party</h1>' });
  });
  await page.route('**/auth/passwordless/complete', (route) => route.fulfill({ json: { ...tokens(), redirect_url: parent } }));
  await page.goto(
    `${appOrigin}/hosted/verify-challenge-otp?appid=${STARTED_ON}&app_id=${STARTED_ON}&challenge_id=row&otp=123456&parent_challenge_id=parent-row`,
  );
  await expect(page.getByRole('heading', { name: 'Relying party' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
  expect(checks).toBe(0);
});

// Core verifies tokens from the URL against the server's published keys and issuer, and the app id: these sign them
// the way the server does, and publish the key where core looks for it.
const ISSUER = `${appOrigin}/`;
const KEY_ID = 'landing-key';
const serverKey = generateKeyPairSync('ec', { namedCurve: 'P-256' });
const otherKey = generateKeyPairSync('ec', { namedCurve: 'P-256' });

const signedJwt = (claims: Record<string, unknown>, key: KeyObject = serverKey.privateKey) => {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT', kid: KEY_ID })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'federated-user', iss: ISSUER, aud: [DEFAULT_LOGIN_APP], exp: 4102444800, ...claims }),
  ).toString('base64url');
  const signature = sign('sha256', Buffer.from(`${header}.${payload}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${header}.${payload}.${signature.toString('base64url')}`;
};

const signedTokens = (key?: KeyObject) => ({
  access_token: signedJwt({ type: 'access' }, key),
  refresh_token: signedJwt({ type: 'refresh' }, key),
});

const installServerKeys = async (page: Page) => {
  await page.route('**/.well-known/openid-configuration', (route) => route.fulfill({ json: { issuer: ISSUER } }));
  await page.route('**/.well-known/jwks.json', (route) =>
    route.fulfill({ json: { keys: [{ ...serverKey.publicKey.export({ format: 'jwk' }), kid: KEY_ID, alg: 'ES256', use: 'sig' }] } }),
  );
};

// A non-PKCE federated return with no second factor: the server sends it to the login page with the tokens in the query.
const tokenLanding = (host: 'hosted' | 'web', landed: { access_token: string; refresh_token: string } = signedTokens()) =>
  `${appOrigin}/${host}/signin?${new URLSearchParams({ ...landed, user_state: NEVER_STORED })}`;

const installDiscovery = (page: Page) =>
  page.route(DISCOVERY, (route) => route.fulfill({ json: { login_app: { app_id: DEFAULT_LOGIN_APP, scopes: ['openid'] } } }));

test('a federated return with tokens on the hosted login ends on the signed-in screen, with a clean address bar', async ({ page }) => {
  await installEnding(page, REAL_APP);
  await installDiscovery(page);
  await installServerKeys(page);
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
  await installServerKeys(page);
  await page.goto(tokenLanding('hosted', { access_token: 'not-a-token', refresh_token: signedTokens().refresh_token }));
  await expect(page.getByRole('heading', { name: 'Sign In to your account' })).toBeVisible();
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
});

for (const [name, landed] of [
  ['unsigned tokens', tokens()],
  ['tokens signed with a key the server does not publish', signedTokens(otherKey.privateKey)],
] as const) {
  test(`${name} on the hosted login leave the sign-in form and a clean address bar`, async ({ page }) => {
    await installEnding(page, REAL_APP);
    await installDiscovery(page);
    await installServerKeys(page);
    await page.goto(tokenLanding('hosted', landed));
    await expect(page.getByRole('heading', { name: 'Sign In to your account' })).toBeVisible();
    await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
    expect(page.url()).not.toContain('access_token');
    expect(page.url()).not.toContain('refresh_token');
    expect(await page.evaluate(() => JSON.stringify(window.localStorage))).not.toContain(landed.access_token);
  });
}

test('a federated return with tokens on an embedded flow does not show the signed-in screen', async ({ page }) => {
  await installEnding(page, REAL_APP);
  await page.goto(tokenLanding('web'));
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
});

// The same return with the tokens in the fragment, as a Simple-mode hand-off sends them.
const fragmentLanding = (landed: { access_token: string; refresh_token: string } = signedTokens()) =>
  `${appOrigin}/hosted/signin?user_state=${NEVER_STORED}#${new URLSearchParams(landed)}`;

const storedSession = (page: Page) => page.evaluate(() => JSON.stringify(window.localStorage));

test('a fragment token landing waits for a slow app discovery, then ends on the signed-in screen with a clean address bar', async ({
  page,
}) => {
  await installEnding(page, REAL_APP);
  await installServerKeys(page);
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(DISCOVERY, async (route) => {
    await held;
    await route.fulfill({ json: { login_app: { app_id: DEFAULT_LOGIN_APP, scopes: ['openid'] } } });
  });
  const landed = signedTokens();
  const discovery = page.waitForRequest((request) => new URL(request.url()).pathname === '/settings');
  await page.goto(fragmentLanding(landed));
  await discovery;
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
  release();
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeVisible();
  const url = new URL(page.url());
  expect(url.pathname).toBe('/hosted/signin');
  expect(url.hash).toBe('');
  expect(page.url()).not.toContain('access_token');
  expect(await storedSession(page)).toContain(landed.access_token);
});

test('an SDK app refuses tokens in the fragment: the sign-in form shows and nothing is stored', async ({ page }) => {
  await installEnding(page, REAL_APP, { sdk: true });
  await installDiscovery(page);
  await installServerKeys(page);
  const landed = signedTokens();
  const settingsRead = page.waitForResponse((response) => new URL(response.url()).pathname === '/app/settings');
  await page.goto(fragmentLanding(landed));
  await settingsRead;
  await expect(page.getByRole('heading', { name: 'Sign In to your account' })).toBeVisible();
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
  expect(page.url()).not.toContain('access_token');
  expect(await storedSession(page)).not.toContain(landed.access_token);
});

for (const screen of ['signin', 'signup'] as const) {
  test(`${screen}: a Simple app's default redirect carries the tokens, the ID token and the state, with no refresh token`, async ({
    page,
  }) => {
    const issued = { access_token: jwt({ type: 'access' }), refresh_token: jwt({ type: 'refresh' }), id_token: jwt({ type: 'id' }) };
    await installEnding(page, REAL_APP, { issued });
    await page.goto(`${appOrigin}/hosted/${screen}?appid=${STARTED_ON}&state=x`);
    await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Correct-horse-battery-9!');
    await page.getByRole('button', { name: screen === 'signin' ? 'Sign In' : 'Sign Up', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
    const fragment = new URLSearchParams(new URL(page.url()).hash.slice(1));
    expect(fragment.get('access_token')).toBe(issued.access_token);
    expect(fragment.get('id_token')).toBe(issued.id_token);
    expect(fragment.get('state')).toBe('x');
    expect(fragment.has('refresh_token')).toBe(false);
  });

  test(`${screen}: an SDK app's default redirect is the bare address`, async ({ page }) => {
    await installEnding(page, REAL_APP, { sdk: true });
    let checks = 0;
    await onCheck(page, async (route) => {
      checks += 1;
      await route.abort('failed');
    });
    await submit(page, screen);
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
    expect(new URL(page.url()).hash).toBe('');
    expect(page.url()).not.toContain('access_token');
    expect(checks).toBe(0);
  });
}

test("a Simple app asked for offline sends the refresh token too", async ({ page }) => {
  const issued = { access_token: jwt({ type: 'access' }), refresh_token: jwt({ type: 'refresh' }) };
  await installEnding(page, REAL_APP, { issued });
  await page.goto(`${appOrigin}/hosted/signin?appid=${STARTED_ON}&scopes=openid,offline`);
  await page.getByLabel('Email', { exact: true }).fill('mailbox@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Correct-horse-battery-9!');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
  const fragment = new URLSearchParams(new URL(page.url()).hash.slice(1));
  expect(fragment.get('refresh_token')).toBe(issued.refresh_token);
});

// A hosted sign-in in SDK mode returns `?code=&state=` to the page that started it, which holds the proof key in
// sessionStorage. The slot is written before the page loads, as core wrote it before leaving.
const OIDC_SLOT = 'passflow_oidc_pkce';
const SLOT_STATE = 'sign-in-state';
const seedOidcSlot = (page: Page) =>
  page.addInitScript(
    ([key, slot]) => {
      if (new URLSearchParams(window.location.search).has('code')) window.sessionStorage.setItem(key, slot);
    },
    [
      OIDC_SLOT,
      JSON.stringify({
        verifier: `verifier-${'v'.repeat(43)}`,
        state: SLOT_STATE,
        clientId: STARTED_ON,
        redirectUri: `${appOrigin}/hosted/signin`,
        scopes: ['email'],
        expiresAt: Date.now() + 600_000,
      }),
    ] as const,
  );

const oidcLanding = (state: string) => `${appOrigin}/hosted/signin?appid=${STARTED_ON}&code=oidc-code&state=${state}`;

test('a hosted sign-in code landing exchanges the code with the stored proof key and signs in', async ({ page }) => {
  await installEnding(page, undefined, { sdk: true });
  await seedOidcSlot(page);
  const issued = tokens();
  const bodies: Record<string, string>[] = [];
  await page.route('**/oidc/token', (route) => {
    bodies.push(Object.fromEntries(new URLSearchParams(route.request().postData() ?? '')));
    return route.fulfill({ json: issued });
  });
  await page.goto(oidcLanding(SLOT_STATE));
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeVisible();
  expect(bodies).toEqual([
    {
      grant_type: 'authorization_code',
      code: 'oidc-code',
      redirect_uri: `${appOrigin}/hosted/signin`,
      client_id: STARTED_ON,
      code_verifier: `verifier-${'v'.repeat(43)}`,
    },
  ]);
  const url = new URL(page.url());
  expect(url.searchParams.has('code')).toBe(false);
  expect(url.searchParams.has('state')).toBe(false);
  expect(await storedSession(page)).toContain(issued.access_token);
  expect(await page.evaluate((key) => window.sessionStorage.getItem(key), OIDC_SLOT)).toBeNull();
});

test('a code landing whose state does not match the stored sign-in shows the failure screen and signs no one in', async ({
  page,
}) => {
  await installEnding(page, undefined, { sdk: true });
  await seedOidcSlot(page);
  let exchanges = 0;
  await page.route('**/oidc/token', (route) => {
    exchanges += 1;
    return route.fulfill({ json: tokens() });
  });
  await page.goto(oidcLanding('tampered-state'));
  await expect(page.getByText('Sign-in failed. Start again.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: SIGNED_IN })).toBeHidden();
  expect(exchanges).toBe(0);
  expect(await page.evaluate(() => window.localStorage.getItem('access'))).toBeNull();
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

for (const [name, fail, screen] of [
  [
    'a server error',
    (route: Route) => route.fulfill({ status: 500, json: errorBody('error.internal', 'x', 500, '/auth/redirect/check') }),
    'sign-in-unavailable',
  ],
  ['no route on the server', (route: Route) => route.fulfill({ status: 404, body: '404 page not found' }), 'sign-in-unavailable'],
  ['a network error', (route: Route) => route.abort('failed'), 'sign-in-service-unavailable'],
  ['a gateway 503 with no Passflow body', (route: Route) => route.fulfill({ status: 503, body: 'Service Unavailable' }), 'sign-in-service-unavailable'],
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
    await expect(page.getByTestId(screen)).toBeVisible();
    expect(page.url()).not.toContain('access_token');
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByRole('heading', { name: 'The real app' })).toBeVisible();
  });
}

test('a check that gets no answer says Passflow is unavailable', async ({ page }) => {
  await installEnding(page, undefined);
  await onCheck(page, (route) => route.abort('failed'));
  await submit(page, 'signin', REAL_APP);
  await expect(page.getByTestId('sign-in-service-unavailable')).toContainText(SERVICE_UNAVAILABLE_MESSAGE);
  await expect(page.getByText('We could not check where to send you. Try again.')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  expect(page.url()).not.toContain('access_token');
});

test('a server error on the check keeps its own message', async ({ page }) => {
  await installEnding(page, undefined);
  await onCheck(page, (route) =>
    route.fulfill({ status: 500, json: errorBody('error.internal', 'x', 500, '/auth/redirect/check') }),
  );
  await submit(page, 'signin', REAL_APP);
  await expect(page.getByTestId('sign-in-unavailable')).toContainText('We could not check where to send you. Try again.');
});

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
