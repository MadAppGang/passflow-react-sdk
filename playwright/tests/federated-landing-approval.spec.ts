import { expect, test } from '../fixture';
import { appOrigin, reject, setupPasswordless } from './passwordless-approval.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });

test('REQ-14 taken federated landing failure is caught by the flow error boundary', async ({ page }) => {
  await setupPasswordless(page);
  await page.addInitScript(() => {
    sessionStorage.setItem(
      'passflow_federated_pkce',
      JSON.stringify({
        verifier: 'test-verifier-' + 'v'.repeat(43),
        scopes: ['openid'],
        expiresAt: Date.now() + 600_000,
      }),
    );
  });
  let exchanges = 0;
  await page.route('**/auth/pkce_exchange', async (route) => {
    exchanges += 1;
    await reject(route, 'error.pkce.exchange');
  });
  await page.goto(`${appOrigin}/web/signin?code=landing-code&user_state=state&appid=non-default-app`);
  await expect(page.getByText('Sign-in failed. Start again.', { exact: true })).toBeVisible();
  expect(exchanges).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('access'))).toBeNull();
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
});
