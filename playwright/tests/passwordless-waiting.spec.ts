import { expect, test } from '../fixture';
import { jwt } from './email-verification.helpers';
import {
  appOrigin,
  beginMagicLink,
  expectWaitingWithoutCode as expectWaiting,
  expiresAt,
  MATCH_CODE,
  noSecretInUrl,
  reject,
  setupPasswordless,
  successUrl,
  tokens,
  WAITING_COPY,
} from './passwordless-approval.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

for (const flow of ['signin', 'signup'] as const) {
  test(`REQ-1 REQ-18 ${flow} shows no code, strips match_code but preserves challenge and other query context`, async ({ page }) => {
    await setupPasswordless(page);
    await page.route('**/auth/passwordless/start', (route) =>
      route.fulfill({
        json: {
          challenge_id: 'query-row',
          expires_at: expiresAt,
          match_code: MATCH_CODE,
        },
      }),
    );
    await page.route('**/auth/passwordless/status', (route) => route.fulfill({ json: { status: 'pending' } }));
    await beginMagicLink(page, flow, '?keep=original&redirect_url=' + encodeURIComponent(successUrl));
    await expectWaiting(page);
    const url = new URL(page.url());
    noSecretInUrl(url);
    expect(url.searchParams.get('challenge_id')).toBe('query-row');
    expect(url.searchParams.get('expires_at')).toBe(expiresAt);
    expect(url.searchParams.get('keep')).toBe('original');
    expect(url.searchParams.get('email')).toBe('mailbox@example.com');
    expect(url.searchParams.get('challenge_type')).toBe('magic_link');
  });
}

const failures = [
  ['denied', 'This sign-in was denied. Start again.'],
  ['expired', 'This link expired. Start again.'],
  ['completed', 'This sign-in was already used. Start again.'],
  ['unavailable', 'Sign-in failed. Start again.'],
  ['exchange-failed', 'Sign-in failed. Start again.'],
] as const;
for (const [outcome, message] of failures) {
  test(`REQ-2 REQ-3 wait ${outcome} has exact copy and Start again removes transient keys`, async ({ page }) => {
    await page.clock.install();
    await setupPasswordless(page);
    let finish = false;
    await page.route('**/auth/passwordless/start', (route) =>
      route.fulfill({
        json: { challenge_id: 'wait-row', expires_at: expiresAt, match_code: MATCH_CODE },
      }),
    );
    await page.route('**/auth/passwordless/status', async (route) => {
      const body = route.request().postDataJSON();
      expect(body).toHaveProperty('code_challenge');
      expect(body).not.toHaveProperty('parent_challenge_id');
      if (!finish) return route.fulfill({ json: { status: 'pending' } });
      if (outcome === 'unavailable') return reject(route, 'error.auth.passwordless.approval.unavailable');
      return route.fulfill({
        json: outcome === 'exchange-failed' ? { status: 'approved', code: 'wait-authz-code' } : { status: outcome },
      });
    });
    await page.route('**/auth/pkce_exchange', (route) => route.abort('failed'));
    await beginMagicLink(page, 'signin', '?keep=preserved');
    await expectWaiting(page);
    finish = true;
    await page.clock.runFor(3_100);
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Start again', exact: true }).click();
    await expect(page).toHaveURL((url) => url.pathname === '/web/signin');
    const url = new URL(page.url());
    for (const key of ['challenge_id', 'expires_at', 'match_code', 'otp', 'flow'])
      expect(url.searchParams.has(key)).toBe(false);
    expect(url.searchParams.get('keep')).toBe('preserved');
  });
}

for (const destination of ['redirect', 'success', '2fa'] as const) {
  test(`REQ-3 approved wait reaches ${destination} using exchange outcome`, async ({ page }) => {
    await page.clock.install();
    await setupPasswordless(page);
    let approved = false;
    const response = tokens();
    await page.route('**/auth/passwordless/start', (route) =>
      route.fulfill({
        json: { challenge_id: 'approved-row', expires_at: expiresAt, match_code: MATCH_CODE },
      }),
    );
    await page.route('**/auth/passwordless/status', (route) =>
      route.fulfill({
        json: approved ? { status: 'approved', code: 'approved-authz-code' } : { status: 'pending' },
      }),
    );
    await page.route('**/auth/pkce_exchange', (route) =>
      route.fulfill({
        json:
          destination === '2fa'
            ? { requires_2fa: true, tfa_token: jwt({ type: 'tfa', challenge_id: 'factor-row' }), challenge_id: 'factor-row' }
            : response,
      }),
    );
    // A `redirect_url` left on the sign-in page is not the attempt's address, so both cases end on the app's default.
    await beginMagicLink(page, 'signin', destination === 'redirect' ? '?redirect_url=' + encodeURIComponent(successUrl) : '');
    await expectWaiting(page);
    approved = true;
    await page.clock.runFor(3_100);
    if (destination === '2fa') {
      await expect(page).toHaveURL((url) => url.pathname === '/web/two-factor-verify');
      expect(await page.evaluate(() => localStorage.getItem('access'))).toBeNull();
    } else if (destination === 'redirect') {
      await expect(page.getByRole('heading', { name: 'Authentication complete' })).toBeVisible();
      // An SDK-mode app gets the bare address; its own SDK starts the sign-in there.
      expect(new URL(page.url()).hash).toBe('');
      expect(decodeURIComponent(page.url())).not.toContain(response.access_token);
    } else {
      // Success is observable as a terminal screen and applied session; wording is not a new contract.
      await expect(page.getByText(WAITING_COPY, { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /^Resend email/ })).toHaveCount(0);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('access'))).toBe(response.access_token);
    }
  });
}

test('REQ-4 Resend replaces row and expiry, shows no code, polls the new row and does not surface cleanup abort', async ({
  page,
}) => {
  test.slow();
  await page.clock.install();
  await setupPasswordless(page);
  let starts = 0;
  const polls: string[] = [];
  const secondExpiry = '2099-11-04T18:12:00Z';
  await page.route('**/auth/passwordless/start', (route) =>
    route.fulfill({
      json:
        ++starts === 1
          ? { challenge_id: 'row-one', expires_at: expiresAt, match_code: MATCH_CODE }
          : { challenge_id: 'row-two', expires_at: secondExpiry, match_code: '7359' },
    }),
  );
  await page.route('**/auth/passwordless/status', (route) => {
    polls.push(route.request().postDataJSON().challenge_id);
    return route.fulfill({ json: { status: 'pending' } });
  });
  await beginMagicLink(page);
  await expectWaiting(page);
  // Skip the cooldown without spending 30 seconds replaying every timer tick.
  await page.clock.fastForward(30_100);
  await page.getByRole('button', { name: /^Resend email/ }).click();
  await expect(page).toHaveURL(
    (url) => url.searchParams.get('challenge_id') === 'row-two' && url.searchParams.get('expires_at') === secondExpiry,
  );
  await expectWaiting(page);
  await expect(page.getByText('7359', { exact: true })).toHaveCount(0);
  await expect.poll(() => polls.includes('row-two')).toBe(true);
  const afterReplacement = polls.length;
  // Skip timer replay, but require a fresh poll so the old-row check is not vacuous.
  await page.clock.fastForward(6_100);
  await expect.poll(() => polls.length).toBeGreaterThan(afterReplacement);
  expect(polls.slice(afterReplacement)).not.toContain('row-one');
  await expect(page.getByText('Sign-in failed. Start again.', { exact: true })).toHaveCount(0);
  noSecretInUrl(new URL(page.url()));
});

for (const transport of ['network', '429', '500'] as const) {
  test(`REQ-19 status ${transport} keeps polling and later signs in`, async ({ page }) => {
    await page.clock.install();
    await setupPasswordless(page);
    let poll = 0;
    await page.route('**/auth/passwordless/start', (route) =>
      route.fulfill({
        json: { challenge_id: 'transient-row', expires_at: expiresAt, match_code: MATCH_CODE },
      }),
    );
    await page.route('**/auth/passwordless/status', async (route) => {
      poll += 1;
      if (poll === 1) return transport === 'network' ? route.abort('failed') : reject(route, 'error.server', Number(transport));
      return route.fulfill({ json: { status: 'approved', code: 'transient-code' } });
    });
    const response = tokens();
    await page.route('**/auth/pkce_exchange', (route) => route.fulfill({ json: response }));
    await beginMagicLink(page, 'signin', '?redirect_url=' + encodeURIComponent(successUrl));
    await expectWaiting(page);
    await page.clock.runFor(3_100);
    await expect.poll(() => poll).toBeGreaterThanOrEqual(2);
    await expect(page.getByRole('heading', { name: 'Authentication complete' })).toBeVisible();
  });
}

for (const legacy of ['non-pkce', 'old-server', 'other-tab'] as const) {
  test(`REQ-2 REQ-21 ${legacy} has no pending code or status polling`, async ({ page }) => {
    await setupPasswordless(page, { pkce: legacy !== 'non-pkce' });
    let polls = 0;
    await page.route('**/auth/passwordless/start', (route) =>
      route.fulfill({
        json: {
          challenge_id: 'legacy-row',
          expires_at: expiresAt,
          ...(legacy === 'other-tab' ? { match_code: MATCH_CODE } : {}),
        },
      }),
    );
    await page.route('**/auth/passwordless/status', (route) => {
      polls += 1;
      return route.fulfill({ json: { status: 'pending' } });
    });
    await beginMagicLink(page);
    if (legacy === 'other-tab') {
      await expectWaiting(page);
      const waitingUrl = page.url();
      // No opener: this same-browser tab does not receive the initiating tab's sessionStorage.
      const otherTab = await page.context().newPage();
      try {
        await setupPasswordless(otherTab);
        let otherPolls = 0;
        await otherTab.route('**/auth/passwordless/status', (route) => {
          otherPolls += 1;
          return route.fulfill({ json: { status: 'pending' } });
        });
        await otherTab.goto(waitingUrl);
        await expect(otherTab.getByRole('button', { name: /Resend/i })).toBeVisible();
        await expect(otherTab.getByText(WAITING_COPY, { exact: true })).toHaveCount(0);
        expect(otherPolls).toBe(0);
      } finally {
        await otherTab.close();
      }
    } else {
      await expect(page.getByRole('button', { name: /Resend/i })).toBeVisible();
      await expect(page.getByText(WAITING_COPY, { exact: true })).toHaveCount(0);
      expect(polls).toBe(0);
    }
  });
}

for (const manual of [false, true]) {
  test(`REQ-7 ${manual ? 'manual OTP' : 'legacy link'} unavailable guard has exact restart copy`, async ({ page }) => {
    await setupPasswordless(page);
    await page.route('**/auth/passwordless/complete', (route) => reject(route, 'error.auth.passwordless.approval.unavailable'));
    const params = new URLSearchParams({ app_id: 'app-1', challenge_id: 'legacy-link' });
    if (manual) {
      params.set('type', 'passwordless');
      params.set('challenge_type', 'otp');
      params.set('email', 'mailbox@example.com');
    } else {
      // A legacy redirect link has an OTP but no manual-screen `type` parameter.
      params.set('otp', '613907');
    }
    await page.goto(`${appOrigin}/web/verify-challenge-otp?${params}`);
    if (manual) await page.getByRole('textbox', { name: 'Verification code' }).fill('613907');
    await expect(page.getByText('This sign-in cannot be approved here. Start again.', { exact: true })).toBeVisible();
  });
}

test('REQ-3 under a parent the waiting tab shows no code and follows the status redirect_url exactly once', async ({
  page,
}) => {
  await page.clock.install();
  await setupPasswordless(page);
  const rpUrl = 'https://rp.example.com/callback?code=rp-authz-code';
  let approved = false;
  const starts: Record<string, unknown>[] = [];
  const polls: Record<string, unknown>[] = [];
  const rpHits: string[] = [];
  const defaultHits: string[] = [];
  await page.route('**/oidc/requests/**', (route) => route.fulfill({ status: 404, json: {} }));
  await page.route('**/auth/passwordless/start', (route) => {
    starts.push(route.request().postDataJSON());
    return route.fulfill({ json: { challenge_id: 'parent-row', expires_at: expiresAt, match_code: MATCH_CODE } });
  });
  await page.route('**/auth/passwordless/status', (route) => {
    polls.push(route.request().postDataJSON());
    return route.fulfill({ json: approved ? { redirect_url: rpUrl } : { status: 'pending' } });
  });
  await page.route('https://rp.example.com/**', (route) => {
    rpHits.push(route.request().url());
    return route.fulfill({ contentType: 'text/html', body: '<h1>Relying party</h1>' });
  });
  page.on('request', (request) => {
    if (request.url().startsWith(successUrl)) defaultHits.push(request.url());
  });

  await beginMagicLink(page, 'signin', '?parent_challenge_id=parent-1');
  await expectWaiting(page);
  expect(starts[0]?.parent_challenge_id).toBe('parent-1');

  approved = true;
  await page.clock.runFor(3_100);
  await expect(page.getByRole('heading', { name: 'Relying party' })).toBeVisible();
  expect(rpHits).toEqual([rpUrl]);
  expect(defaultHits).toEqual([]);
  expect(polls.length).toBeGreaterThan(0);
  for (const body of polls) expect(body).not.toHaveProperty('parent_challenge_id');
});
