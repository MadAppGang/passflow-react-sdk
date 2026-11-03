import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

const message = 'We sent a code to a***@example.com.';
const openStory = async (page: Page, story: string) => {
  await page.goto(`http://localhost:6107/iframe.html?id=components-loginscreen--${story}&viewMode=story`);
  await expect(page.locator('#storybook-root')).not.toBeEmpty();
  await expect(page.locator('html')).toHaveClass(/storybook-passflow-(light|dark|brand)/);
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) =>
      !(animation instanceof CSSTransition) || animation.playState !== 'running'));
};

// Storybook's a11y addon can audit the same frame concurrently. Match the
// catalog spec's bounded retry for transient audit/reload errors only.
const auditStory = async (page: Page) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await new AxeBuilder({ page }).include('#storybook-root').analyze();
    } catch (error) {
      const isTransientStorybookReload =
        error instanceof Error &&
        (error.message.includes('Axe is already running') || error.message.includes('Execution context was destroyed'));
      if (!isTransientStorybookReload || attempt === 4) throw error;
      await expect(page.locator('#storybook-root')).toBeVisible();
      await page.waitForTimeout(200);
    }
  }

  throw new Error('Unable to audit the Storybook state');
};

const states = [
  ['EmailCodeEntry', 'email-code-entry'],
  ['EmailCodeResendReady', 'email-code-resend-ready'],
  ['EmailCodeResending', 'email-code-resending'],
  ['EmailCodeVerifying', 'email-code-verifying'],
  ['EmailCodeWrongCode', 'email-code-wrong-code'],
  ['EmailCodeRateLimited', 'email-code-rate-limited'],
  ['EmailCodeNoResend', 'email-code-no-resend'],
  ['EmailCodeDarkTheme', 'email-code-dark-theme'],
  ['CheckYourEmail', 'check-your-email'],
  ['NewPassword', 'new-password'],
  ['NewPasswordInvalid', 'new-password-invalid'],
  ['NewPasswordError', 'new-password-error'],
  ['NewPasswordSaving', 'new-password-saving'],
  ['CreateAccountPassword', 'create-account-password'],
] as const;

for (const [name, id] of states) {
  test(`REQ-18 LoginScreen · ${name} · accessible advertised state`, async ({ page }) => {
    await openStory(page, id);
    if (id.startsWith('email-code-')) {
      const code = page.getByRole('textbox', { name: message, exact: true });
      await expect(code).toBeVisible();
      await expect(code).toHaveAttribute('inputmode', 'numeric');
      await expect(code).toHaveAttribute('autocomplete', 'one-time-code');
      if (id === 'email-code-entry') {
        // The story's own play fills six digits. Synchronize before testing a new value.
        await expect(code).toHaveValue('123456');
        await code.fill('12345');
        await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeDisabled();
        await code.fill('123456');
        await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeEnabled();
      }
      if (id === 'email-code-verifying') {
        await expect(code).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Verifying…' })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Resend code', exact: true })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Use a different email' })).toBeDisabled();
      }
      if (id === 'email-code-resending') {
        // Busy copy is not fixed by the story. The resend control uses the
        // focus-preserving aria-disabled state advertised by Button's contract.
        const resend = page.getByRole('button').and(page.locator('[aria-disabled="true"]'));
        await expect(resend).toHaveCount(1);
        await expect(resend).toBeVisible();
        await expect(resend).toBeDisabled();
        await resend.focus();
        await expect(resend).toBeFocused();
      }
      if (id === 'email-code-resend-ready') {
        await expect(page.getByRole('button', { name: 'Resend code', exact: true })).toBeEnabled();
      }
      if (id === 'email-code-wrong-code') {
        await expect(code).toHaveValue('');
        await expect(code).toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByRole('alert')).toHaveText('The code is not match, please check it and try again.');
      }
      if (id === 'email-code-rate-limited') {
        await expect(page.getByRole('alert')).toHaveText(
          'Too many verification codes were requested. Please wait a few minutes and try again.');
        await expect(code).toHaveValue('');
      }
      if (id === 'email-code-no-resend') {
        await expect(page.getByRole('button', { name: /Resend/ })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
      } else {
        await expect(page.getByRole('button', { name: 'Use a different email' })).toBeVisible();
      }
      if (id === 'email-code-dark-theme') {
        await expect(page.locator('html')).toHaveClass(/storybook-passflow-dark/);
      }
    } else if (id === 'check-your-email') {
      await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
      await expect(page.getByRole('status')).toContainText(
        'We sent a link to a***@example.com. Follow it to choose your password and finish signing up.');
      await expect(page.getByRole('textbox')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Back to sign up' })).toBeEnabled();
    } else {
      const password = page.getByLabel('New password', { exact: true });
      await expect(password).toBeVisible();
      if (id === 'new-password-saving') {
        await expect(password).toBeDisabled();
        await expect(page.getByRole('button', { name: /Sav/ })).toBeDisabled();
      } else if (id === 'new-password-invalid') {
        await expect(password).toHaveValue('short');
        await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled();
      } else if (id === 'new-password-error') {
        await expect(page.getByRole('alert')).toHaveText('This reset link has expired. Ask for a new one.');
        await expect(password).toBeEnabled();
      } else if (id === 'create-account-password') {
        await expect(page.getByRole('heading', { name: 'Create your password' })).toBeVisible();
        await expect(page.getByText('Choose a password to finish creating your account.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create account' })).toBeDisabled();
        await password.fill('Str0ngPassword');
        await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled();
      } else {
        await expect(password).toHaveValue('Str0ngPassword');
        await password.fill('');
        await expect(page.getByRole('button', { name: 'Save new password' })).toBeDisabled();
        await password.fill('Str0ngPassword');
        await expect(page.getByRole('button', { name: 'Save new password' })).toBeEnabled();
      }
    }
    const accessibility = await auditStory(page);
    expect(accessibility.violations).toEqual([]);
  });
}

test('REQ-6 REQ-18 LoginScreen · EmailCodeEntry · resend enables at 30 seconds and restarts on press', async ({ page }) => {
  await page.clock.install();
  await openStory(page, 'email-code-entry');
  const code = page.getByRole('textbox', { name: message, exact: true });
  await expect(code).toHaveValue('123456');
  await code.fill('123');
  const resend = page.getByRole('button', { name: /^Resend code(?:\s+\(\d+\))?$/ });
  await expect(resend).toBeDisabled();
  // Clock installation above precedes navigation. Execute every interval tick,
  // rather than fastForward, which can coalesce recurring ticks.
  await page.clock.runFor(30_000);
  await expect(resend).toBeEnabled();

  await resend.click();
  await expect(code).toHaveValue('');
  await expect(resend).toBeDisabled();
  // aria-disabled preserves keyboard focus while the new cooldown is running.
  await expect(resend).toBeFocused();
  await page.clock.runFor(30_000);
  await expect(resend).toBeEnabled();
});
