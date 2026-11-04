import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });
const parentCopy = {
  RefusedParentExpired: 'This sign-in request has expired. Start again.',
  RefusedParentNotFound: "We couldn't find this sign-in request. Start again.",
  RefusedParentCompleted: 'This sign-in request was already completed. Start again.',
  RefusedParentPasskeyOnly: 'This sign-in request has expired. Start again.',
};
const messages: Record<string, string> = {
  PasswordlessWaiting: 'Open the link we sent on any device and enter this code:',
  PasswordlessWaitingResendReady: 'Open the link we sent on any device and enter this code:',
  PasswordlessWaitingResendBusy: 'Open the link we sent on any device and enter this code:',
  PasswordlessWaitingResendFailed: "We couldn't send a new link. Try again.",
  PasswordlessWaitDenied: 'This sign-in was denied. Start again.',
  PasswordlessWaitExpired: 'This link expired. Start again.',
  PasswordlessWaitCompleted: 'This sign-in was already used. Start again.',
  PasswordlessWaitFailed: 'Sign-in failed. Start again.',
  PasswordlessApproval: 'Acme Portal',
  PasswordlessApprovalLoading: 'Loading the sign-in request…',
  PasswordlessApprovalNoLocation: 'Acme Portal',
  PasswordlessApprovalWrongCode: 'That code does not match. 3 tries left.',
  PasswordlessApprovalConnectionError: 'Check your connection and try again.',
  PasswordlessApprovalBusy: 'Acme Portal',
  PasswordlessApprovalApproved: 'Approved. Return to the tab that started sign-in. You can close this tab.',
  PasswordlessApprovalDenied: 'Denied. No one was signed in. You can close this tab.',
  PasswordlessApprovalInvalidLink: 'This link is not valid. Start again from the page where you signed in.',
  PasswordlessApprovalUnavailable: 'This sign-in cannot be approved here. Start again.',
  PasswordlessApprovalExpired: 'This link expired. Start again.',
  PasswordlessApprovalAlreadyDecided: 'This sign-in was already decided.',
  PasswordlessApprovalTooManyCodes: 'Too many wrong codes. This sign-in was denied. Start again.',
  PasswordlessApprovalLoadFailed: 'Check your connection and try again.',
  ...parentCopy,
};
const approvalForms = new Set([
  'PasswordlessApproval',
  'PasswordlessApprovalNoLocation',
  'PasswordlessApprovalWrongCode',
  'PasswordlessApprovalConnectionError',
  'PasswordlessApprovalBusy',
]);

// Storybook may already be auditing or replacing its iframe. Retry only those
// transient audit errors; unexpected errors and real violations still fail.
const auditStory = async (page: Page) => {
  let audit: Awaited<ReturnType<AxeBuilder['analyze']>> | undefined;
  await expect
    .poll(
      async () => {
        try {
          audit = await new AxeBuilder({ page }).analyze();
          return true;
        } catch (error) {
          const transient =
            error instanceof Error &&
            (error.message.includes('Axe is already running') || error.message.includes('Execution context was destroyed'));
          if (!transient) throw error;
          return false;
        }
      },
      { timeout: 5_000, intervals: [200], message: 'Storybook accessibility audit completes' },
    )
    .toBe(true);
  if (!audit) throw new Error('Unable to audit the Storybook state');
  return audit;
};

// TEST-16 / REQ-16: one named behavioural + axe case per new exported story.
for (const [story, message] of Object.entries(messages)) {
  test(`REQ-16 LoginScreen · ${story} · renders its supported state accessibly`, async ({ page }) => {
    const kebab = story.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    await page.goto(`http://localhost:6107/iframe.html?id=components-loginscreen--${kebab}&viewMode=story`);
    await expect(page.getByText(message, { exact: !story.startsWith('PasswordlessWaiting') })).toBeVisible();

    if (story in parentCopy) {
      await expect(page.getByRole('button', { name: 'Start again', exact: true })).toBeVisible();
      if (story !== 'RefusedParentPasskeyOnly') {
        await expect(page.getByLabel('Email', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
        await expect(page.getByLabel('Password', { exact: true })).not.toHaveAttribute('aria-invalid', 'true');
      }
    }
    if (story.startsWith('PasswordlessWaiting')) {
      await expect(page.getByText('4821', { exact: true })).toBeVisible();
      const resend = story.endsWith('ResendBusy')
        ? page.getByRole('button')
        : page.getByRole('button', { name: /^Resend email/ });
      await expect(resend).toBeVisible();
      if (story.endsWith('ResendFailed')) await expect(resend).toBeEnabled();
      else if (!story.endsWith('ResendReady')) await expect(resend).toBeDisabled();
      // ResendReady's story play already clicks Resend; do not assert its pre-click cooldown state.
    }
    if (story.startsWith('PasswordlessWait') && !story.startsWith('PasswordlessWaiting')) {
      await expect(page.getByRole('button', { name: 'Start again' })).toBeVisible();
    }
    if (approvalForms.has(story)) {
      await expect(page.getByText('Chrome', { exact: false })).toBeVisible();
      await expect(page.getByText('macOS', { exact: false })).toBeVisible();
      await expect(page.getByText('4 Nov 2026, 16:42', { exact: false })).toBeVisible();
      await expect(
        page.getByText(
          'Approve only if you started signing in on another device and can see the code there now. If someone asked you for a code, choose Deny.',
        ),
      ).toBeVisible();
      const code = page.getByLabel('Code shown on your other device');
      await expect(code).toBeVisible();
      await expect(page.getByRole('button', { name: 'Deny', exact: true })).toBeVisible();
      if (story === 'PasswordlessApprovalNoLocation') await expect(page.getByText('Lisbon, Portugal')).toHaveCount(0);
      else await expect(page.getByText('Lisbon, Portugal', { exact: false })).toBeVisible();
      if (story === 'PasswordlessApprovalBusy') {
        await expect(code).toBeDisabled();
        await expect(page.getByRole('button', { name: /Approv/ })).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Deny', exact: true })).toBeDisabled();
      } else {
        if (story === 'PasswordlessApproval') {
          // Wait for the story's final interaction. Edit the full OTP as a user
          // would: focusing selects its last box, rather than the whole value.
          await expect(code).toHaveValue('4821');
          await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeFocused();
          await code.focus();
          await code.press('Backspace');
          await expect(code).toHaveValue('482');
          await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
          await code.press('1');
          await expect(code).toHaveValue('4821');
          await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeEnabled();
        } else {
          await code.fill('123');
          await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
          await code.fill('4821');
          await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeEnabled();
        }
      }
      await expect(page.getByText(/jack@example.com|test\+1@test.com/)).toHaveCount(0);
    }
    if (story.startsWith('PasswordlessApproval') && !approvalForms.has(story)) {
      await expect(page.getByLabel('Code shown on your other device')).toHaveCount(0);
    }
    // Keep the theme-transition guard; bounded polling handles transient audit overlap.
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => !(animation instanceof CSSTransition) || animation.playState !== 'running'),
    );
    const audit = await auditStory(page);
    expect(audit.violations, `${story} accessibility`).toEqual([]);
  });
}
