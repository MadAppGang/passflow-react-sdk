import type { Route } from '@playwright/test';
import { expect, test } from '../fixture';
import {
  appOrigin, codeInput, codeStep, endpointFor, errorBody, expectSignedIn, prompt,
  setupEmailFlow, submitCredentials, successUrl, tokens, waitForResend,
} from './email-verification.helpers';

test.beforeEach(async ({ page }) => {
  await setupEmailFlow(page);
});

for (const flow of ['signup', 'signin'] as const) {
  const endpoint = endpointFor(flow);
  const backLabel = flow === 'signup' ? 'Use a different email' : 'Use a different account';

  test(`REQ-1 REQ-2 ${flow}: code answer stays on the form URL without a success request`, async ({ page }) => {
    const redirects: string[] = [];
    page.on('request', (request) => {
      if (request.url().startsWith(successUrl)) redirects.push(request.url());
    });
    await page.route(`**${endpoint}`, (route) => route.fulfill({ json: codeStep() }));

    await submitCredentials(page, flow);

    await expect(codeInput(page)).toBeVisible();
    await expect(page.getByText(prompt, { exact: true })).toBeVisible();
    await expect(codeInput(page)).toHaveAttribute('inputmode', 'numeric');
    await expect(codeInput(page)).toHaveAttribute('autocomplete', 'one-time-code');
    await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeDisabled();
    await expect(page).toHaveURL(`${appOrigin}/web/${flow}`);
    expect(redirects).toEqual([]);
    await expect(page.getByRole('button', { name: backLabel })).toBeEnabled();
    await page.getByRole('button', { name: backLabel }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  });

  test(`REQ-3 ${flow}: verifies to tokens and the configured redirect`, async ({ page }) => {
    const response = tokens();
    await page.route(`**${endpoint}`, (route) => route.fulfill({ json: codeStep() }));
    await page.route('**/auth/validate', (route) => route.fulfill({ json: response }));
    await submitCredentials(page, flow);

    const request = page.waitForRequest('**/auth/validate');
    await codeInput(page).fill('123456');
    const validation = await request;

    expect(validation.method()).toBe('POST');
    expect(validation.postDataJSON()).toMatchObject({ challenge_id: 'challenge-original', otp: '123456' });
    await expectSignedIn(page, response);
  });

  test(`REQ-5 ${flow}: verifies to 2FA rather than the success redirect`, async ({ page }) => {
    await page.route(`**${endpoint}`, (route) => route.fulfill({ json: codeStep() }));
    await page.route('**/auth/validate', (route) => route.fulfill({
      json: { tfa_token: 'email-code-second-factor', requires_2fa: true },
    }));
    await submitCredentials(page, flow);
    await codeInput(page).fill('123456');
    await expect(page).toHaveURL(/\/web\/two-factor-verify(?:\?|$)/);
    expect(page.url()).not.toContain(successUrl);
  });

  test(`REQ-6 ${flow}: resend rebinds the challenge and clears partial input`, async ({ page }) => {
    await page.clock.install();
    const bodies: Record<string, unknown>[] = [];
    await page.route(`**${endpoint}`, async (route) => {
      bodies.push(route.request().postDataJSON());
      await route.fulfill({ json: codeStep(bodies.length === 1 ? 'challenge-original' : 'challenge-resent') });
    });
    const response = tokens();
    await page.route('**/auth/validate', (route) => route.fulfill({ json: response }));
    await submitCredentials(page, flow);
    await codeInput(page).fill('123');
    await (await waitForResend(page)).click();

    await expect.poll(() => bodies.length).toBe(2);
    expect(bodies[1]).toEqual(bodies[0]); // non-PKCE app: all original fields must match
    await expect(codeInput(page)).toHaveValue('');
    await expect(page.getByRole('button', { name: /^Resend code(?:\s+\(\d+\))?$/ })).toBeDisabled();

    const request = page.waitForRequest('**/auth/validate');
    await codeInput(page).fill('654321');
    expect((await request).postDataJSON()).toMatchObject({ challenge_id: 'challenge-resent', otp: '654321' });
    await expectSignedIn(page, response);
  });

  test(`REQ-7 ${flow}: link continuation shows status without a code input and can return`, async ({ page }) => {
    const message = 'Nous avons envoyé un lien à a***@example.com. Consultez votre messagerie.';
    await page.route(`**${endpoint}`, (route) => route.fulfill({
      json: { email_verification_required: true, message },
    }));
    await submitCredentials(page, flow);

    await expect(page.getByRole('status')).toContainText(message);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Verify', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(`${appOrigin}/web/${flow}`);
    await page.getByRole('button', { name: flow === 'signup' ? 'Back to sign up' : /Back to sign in/i }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  });

  for (const id of ['error.registration.email.domain_not_allowed', 'error.registration.email.required']) {
    test(`REQ-11 ${flow}: localized registration error ${id}`, async ({ page }) => {
      const message = `Adresse refusée par la politique — ${id}.`;
      await page.route(`**${endpoint}`, (route) => route.fulfill({
        status: 403, json: errorBody(id, message, 403, endpoint),
      }));
      await submitCredentials(page, flow);
      await expect(page.getByRole('alert')).toHaveText(message);
      await expect(page).toHaveURL(`${appOrigin}/web/${flow}`);
    });
  }

  test(`REQ-14 ${flow}: rate limited resend shows the localized server message`, async ({ page }) => {
    await page.clock.install();
    let attempts = 0;
    const message = 'Trop de codes demandés. Réessayez dans quelques minutes.';
    await page.route(`**${endpoint}`, (route) => {
      attempts += 1;
      return attempts === 1
        ? route.fulfill({ json: codeStep() })
        : route.fulfill({ status: 429, json: errorBody('error.verification.code.rate_limited', message, 429, endpoint) });
    });
    await submitCredentials(page, flow);
    await (await waitForResend(page)).click();
    await expect(page.getByRole('alert')).toHaveText(message);
    await expect(codeInput(page)).toBeVisible();
    await expect(page).toHaveURL(`${appOrigin}/web/${flow}`);
  });

  for (const listed of [true, false]) {
    test(`REQ-12 ${flow}: federated ${listed ? 'allow-listed message stays localized' : 'unknown error hides raw message'}`, async ({ page }) => {
      const message = 'Le fournisseur ne confirme pas cette adresse.';
      const query = new URLSearchParams({
        error: listed ? 'error.registration.email.not_verified_by_provider' : 'error.federated.app.redirect.not.allowed',
        message,
      });
      await page.goto(`${appOrigin}/web/${flow}?${query}`);
      if (listed) {
        await expect(page.getByText(message, { exact: true })).toBeVisible();
      } else {
        await expect(page.getByText(message, { exact: true })).toHaveCount(0);
        await expect(page.getByText("We couldn't continue this authentication request. Return to the app and try again.", {
          exact: true,
        })).toBeVisible();
      }
    });
  }
}

test('REQ-6 REQ-7 resend can exhaust the code budget and switch to a link-only continuation', async ({ page }) => {
  await page.clock.install();
  let attempts = 0;
  const message = 'A link was sent instead. Check your email to finish creating the account.';
  await page.route('**/auth/register', (route) => {
    attempts += 1;
    return route.fulfill({
      json: attempts === 1 ? codeStep() : { email_verification_required: true, message },
    });
  });
  await submitCredentials(page, 'signup');
  await (await waitForResend(page)).click();
  await expect(page.getByRole('status')).toContainText(message);
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Verify', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to sign up' }).click();
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
});

test('REQ-15 wrong code shows server text, clears the input, and a corrected code signs in', async ({ page }) => {
  let validations = 0;
  const response = tokens();
  const message = 'Ce code est incorrect. Vérifiez le dernier courriel reçu.';
  await page.route('**/auth/register', (route) => route.fulfill({ json: codeStep() }));
  await page.route('**/auth/validate', (route) => {
    validations += 1;
    return validations === 1
      ? route.fulfill({ status: 400, json: errorBody('error.otp.incorrect', message, 400, '/auth/validate') })
      : route.fulfill({ json: response });
  });
  await submitCredentials(page, 'signup');
  await codeInput(page).fill('111111');

  await expect(page.getByRole('alert')).toHaveText(message);
  await expect(codeInput(page)).toHaveValue('');
  await expect(page).toHaveURL(`${appOrigin}/web/signup`);

  await codeInput(page).fill('123456');
  await expectSignedIn(page, response);
  expect(validations).toBe(2);
});

test('REQ-14 validate rate limited displays server text without navigating', async ({ page }) => {
  const message = 'Veuillez attendre avant de vérifier un autre code.';
  await page.route('**/auth/register', (route) => route.fulfill({ json: codeStep() }));
  await page.route('**/auth/validate', (route) => route.fulfill({
    status: 429, json: errorBody('error.verification.code.rate_limited', message, 429, '/auth/validate'),
  }));
  await submitCredentials(page, 'signup');
  await codeInput(page).fill('123456');
  await expect(page.getByRole('alert')).toHaveText(message);
  await expect(codeInput(page)).toHaveValue('');
  await expect(page).toHaveURL(`${appOrigin}/web/signup`);
});

for (const status of [400, 401, 500]) {
  test(`REQ-17 unknown verify error ${status} hides raw detail and provides a way back`, async ({ page }) => {
    const raw = 'private verifier or infrastructure detail';
    await page.route('**/auth/register', (route) => route.fulfill({ json: codeStep() }));
    await page.route('**/auth/validate', (route) => route.fulfill({
      status, json: errorBody('error.unlisted', raw, status, '/auth/validate'),
    }));
    await submitCredentials(page, 'signup');
    await codeInput(page).fill('123456');
    await expect(page.getByRole('alert')).toContainText(/code.*(could not|couldn't).*verif|start again/i);
    await expect(page.getByText(raw, { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Use a different email' }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  });
}

test('REQ-16 pending verification locks controls and prevents duplicate validation', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let validations = 0;
  await page.route('**/auth/register', (route) => route.fulfill({ json: codeStep() }));
  await page.route('**/auth/validate', async (route) => {
    validations += 1;
    await pending;
    await route.fulfill({ status: 400, json: errorBody('error.otp.incorrect', 'Try another code.', 400, '/auth/validate') });
  });
  await submitCredentials(page, 'signup');
  await codeInput(page).fill('123456');
  try {
    await expect.poll(() => validations).toBe(1);
    await expect(codeInput(page)).toBeDisabled();
    await expect(page.getByRole('button', { name: /Verifying|Verify/ })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Resend code', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Use a different email' })).toBeDisabled();
    await page.keyboard.type('654321');
    await page.keyboard.press('Enter');
    expect(validations).toBe(1);
  } finally {
    release();
  }
  await expect(page.getByRole('alert')).toHaveText('Try another code.');
  await expect(codeInput(page)).toBeEnabled();
  expect(validations).toBe(1);
});

test('REQ-23 cancel drops late resend and cannot restore an old code screen', async ({ page }) => {
  await page.clock.install();
  let attempts = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  let lateRoute: Route | undefined;
  await page.route('**/auth/register', async (route) => {
    attempts += 1;
    if (attempts === 1) return route.fulfill({ json: codeStep() });
    lateRoute = route;
    await pending;
    await route.fulfill({ json: codeStep('late-challenge') });
  });
  await submitCredentials(page, 'signup');
  const lateResponse = page.waitForResponse('**/auth/register');
  await (await waitForResend(page)).click();
  try {
    await expect.poll(() => Boolean(lateRoute)).toBe(true);
    await page.getByRole('button', { name: 'Use a different email' }).click();
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  } finally {
    release();
  }
  await (await lateResponse).finished();
  // Let the released response reach React before asserting the final visible screen.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(codeInput(page)).toHaveCount(0);
});
