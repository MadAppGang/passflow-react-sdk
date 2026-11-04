import { expect, test } from '../fixture';
import { appOrigin, fillCredentials, reject, setupPasswordless } from './passwordless-approval.helpers';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });
const errors = [
  ['error.auth.flow.parent.expired', 'This sign-in request has expired. Start again.'],
  ['error.auth.flow.parent.not.found', "We couldn't find this sign-in request. Start again."],
  ['error.auth.flow.parent.completed', 'This sign-in request was already completed. Start again.'],
] as const;

for (const flow of ['signin', 'signup'] as const) {
  for (const [id, copy] of errors) {
    test(`REQ-8 REQ-9 ${flow} · ${id} · restarts with neutral fields and no parent in next POST`, async ({ page }) => {
      await setupPasswordless(page, { pkce: false });
      const bodies: Record<string, unknown>[] = [];
      await page.route(`**/auth/${flow === 'signup' ? 'register' : 'login'}`, async (route) => {
        bodies.push(route.request().postDataJSON());
        await reject(route, id);
      });
      await page.goto(
        `${appOrigin}/web/${flow}?parent_challenge_id=old&Parent_Challenge_Id=duplicate&PARENT_CHALLENGE_ID=third&keep=a%20b%2fc`,
      );
      await fillCredentials(page);
      await page.getByRole('button', { name: flow === 'signup' ? 'Sign Up' : 'Sign In', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveText(copy);
      const initialBody = bodies[0];
      if (!initialBody) throw new Error('Expected the initial credential POST');
      expect(initialBody.parent_challenge_id).toBeTruthy();
      await expect(page.getByLabel('Email', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByLabel('Password', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');

      // A document response, not just a history transition, proves the full reload reset.
      const reload = page.waitForResponse(
        (response) => response.request().resourceType() === 'document' && new URL(response.url()).pathname === `/web/${flow}`,
      );
      await page.getByRole('button', { name: 'Start again', exact: true }).click();
      await reload;
      const restarted = new URL(page.url());
      expect([...restarted.searchParams.keys()].map((key) => key.toLowerCase())).not.toContain('parent_challenge_id');
      expect(restarted.search).toContain('keep=a%20b%2fc');
      await fillCredentials(page);
      await page.getByRole('button', { name: flow === 'signup' ? 'Sign Up' : 'Sign In', exact: true }).click();
      await expect.poll(() => bodies.length).toBe(2);
      const restartedBody = bodies[1];
      if (!restartedBody) throw new Error('Expected the credential POST after Start again');
      expect(restartedBody).not.toHaveProperty('parent_challenge_id');
      expect(Object.keys(restartedBody).map((key) => key.toLowerCase())).not.toContain('parent_challenge_id');
    });
  }
}
