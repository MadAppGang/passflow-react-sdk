import type { Page } from '@playwright/test';
import { expect, test } from '../fixture';

test.use({ locale: 'en-US', timezoneId: 'UTC', viewport: { width: 715, height: 900 } });
const storybook = process.env.STORYBOOK_URL ?? 'http://localhost:6107';
const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';
const wrongCode = 'Invalid code. Please check your authenticator app and try again.';
const wrongRecovery = 'Invalid recovery code.';
const ended = 'Your sign-in has ended. Sign in again.';
const limited = 'Too many attempts. Sign in again later.';
const changed = 'Your setup code changed. Scan this new QR code.';
const saved = 'Your setup is saved. Enter a new code from your authenticator app to finish signing in.';
const generic = 'Something went wrong. Try again.';
const sendFailed = 'We could not send the setup email. Try again later or contact your administrator.';
const checkEmail = 'Check your email for a link to set up two-factor authentication. After you set it up, sign in again.';

const openStory = async (page: Page, name: string) => {
  const id = name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  await page.goto(storybook + '/iframe.html?id=components-loginscreen--' + id + '&viewMode=story');
};

// REQ-totp_digits: eight slots must fit their container and the card at both widths.
for (const width of [715, 320]) {
  test(`REQ-totp_digits · eight-digit TOTP fits the card at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openStory(page, 'TwoFactorCodeTotpEightDigits');
    await expect(page.getByRole('textbox', { name: 'Verification code', exact: true })).toBeVisible();
    // The boxes can spill out of a row that keeps its own width, so measure the last box.
    const lastBox = page.locator('.passflow-field-otp-slots .passflow-field-otp').last();
    await expect(page.locator('.passflow-field-otp-slots .passflow-field-otp')).toHaveCount(8);
    await expect.poll(async () => lastBox.evaluate((element) => {
      const container = element.closest('.passflow-field-otp-field')?.parentElement;
      // The nearest shared ancestor of the heading and the field bounds the card content.
      let card = container;
      while (card && !card.querySelector('h1, h2, h3, [role="heading"]')) {
        card = card.parentElement;
      }
      if (!container || !card) throw new Error('OTP container or heading-bearing card is missing');
      const right = element.getBoundingClientRect().right;
      return {
        fitsContainer: right <= container.getBoundingClientRect().right,
        fitsCard: right <= card.getBoundingClientRect().right,
        fitsViewport: document.documentElement.scrollWidth <= window.innerWidth,
      };
    })).toEqual({ fitsContainer: true, fitsCard: true, fitsViewport: true });
  });
}

// TEST-S1: one named case per new export in contract/login-screen.stories.tsx.
// Do not import runtime screen mappers or expected-copy constants: those are the SUT.
const codeStories = [
  'TwoFactorCodeTotp', 'TwoFactorCodeTotpEightDigits', 'TwoFactorCodeTotpReady',
  'TwoFactorCodeTotpSetupSaved', 'TwoFactorCodeTotpBusy', 'TwoFactorCodeTotpWrongCode',
  'TwoFactorCodeTotpLocked', 'TwoFactorCodeTotpLockedNoAction', 'TwoFactorCodeTotpRateLimited',
  'TwoFactorCodeTotpDarkTheme', 'TwoFactorCodeRecovery', 'TwoFactorCodeRecoveryBusy',
  'TwoFactorCodeRecoveryWrongCode', 'TwoFactorCodeRecoveryLocked',
  'TwoFactorCodeRecoveryRateLimited', 'TwoFactorCodeRecoveryDarkTheme',
];

for (const story of codeStories) {
  test(`TEST-S1 REQ-1 REQ-5 REQ-6 REQ-7 REQ-12 REQ-19 LoginScreen · ${story} · exposes its supported code-entry state`, async ({ page }) => {
    await openStory(page, story);
    const recovery = story.includes('Recovery');
    const code = page.getByRole('textbox', { name: recovery ? 'Recovery Code' : 'Verification code', exact: true });
    const trust = page.getByRole('checkbox', { name: 'Trust this device' });
    const locked = story.includes('Locked') || story.endsWith('RateLimited');
    const busy = story.endsWith('Busy');
    const alternate = page.getByRole('button', { name: recovery ? 'Use authenticator code' : 'Use recovery code', exact: true });
    await expect(page.getByRole('heading', { name: recovery ? 'Use Recovery Code' : 'Two-Factor Authentication', exact: true })).toBeVisible();
    await expect(code).toBeVisible();
    await expect(trust).toBeVisible();
    if (recovery) await expect(code).toHaveAttribute('placeholder', 'XXXX-XXXX');
    else {
      await expect(code).toHaveAttribute('inputmode', 'numeric');
      await expect(code).toHaveAttribute('maxlength', story.endsWith('EightDigits') ? '8' : '6');
    }

    if (locked) {
      await expect(code).toBeDisabled();
      await expect(trust).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Verify', exact: true })).toHaveCount(0);
      await expect(alternate).toHaveCount(0);
      await expect(page.getByText(story.endsWith('RateLimited') ? limited : ended, { exact: true })).toBeVisible();
      if (story.endsWith('LockedNoAction')) {
        await expect(page.getByRole('button', { name: 'Back to sign in' })).toHaveCount(0);
      } else {
        await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
      }
    } else if (busy) {
      await expect(code).toBeDisabled();
      await expect(trust).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Verifying...', exact: true })).toBeDisabled();
      await expect(alternate).toBeDisabled();
    } else {
      await expect(code).toBeEnabled();
      await expect(trust).toBeEnabled();
      await expect(alternate).toBeEnabled();
      const ready = story.endsWith('Ready') || story.endsWith('WrongCode');
      if (ready) await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeEnabled();
      else await expect(page.getByRole('button', { name: 'Verify', exact: true })).toBeDisabled();
      if (story.endsWith('Ready')) {
        await expect(code).toHaveValue('123456');
        await expect(trust).toBeChecked();
      } else await expect(trust).not.toBeChecked();
    }

    if (story.endsWith('WrongCode')) {
      await expect(code).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('alert')).toHaveText(recovery ? wrongRecovery : wrongCode);
    }
    if (story.endsWith('RateLimited')) await expect(page.getByRole('alert')).toHaveText(limited);
    if (story.endsWith('SetupSaved')) await expect(page.getByText(saved, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Set Up 2FA$/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^Set Up 2FA$/i })).toHaveCount(0);
  });
}

test('TEST-S1 REQ-1 REQ-19 LoginScreen · TwoFactorCodeInteractive · controls code readiness and trust independently', async ({ page }) => {
  await openStory(page, 'TwoFactorCodeInteractive');
  const code = page.getByRole('textbox', { name: 'Verification code', exact: true });
  const trust = page.getByRole('checkbox', { name: 'Trust this device' });
  const verify = page.getByRole('button', { name: 'Verify', exact: true });
  await expect(verify).toBeDisabled();
  await code.fill('12345');
  await expect(code).toHaveValue('12345');
  await expect(verify).toBeDisabled();
  await code.press('6');
  await expect(code).toHaveValue('123456');
  await expect(verify).toBeEnabled();
  // The visual switch owns the hit area; click its accessible label rather than
  // asking check() to click a visually hidden native checkbox.
  await page.getByText('Trust this device', { exact: true }).click();
  await expect(trust).toBeChecked();
  await expect(code).toHaveValue('123456');
  await page.getByText('Trust this device', { exact: true }).click();
  await expect(trust).not.toBeChecked();
  // A full FieldOtp selects the last digit on focus; Backspace is a real user edit.
  await code.focus();
  await code.press('Backspace');
  await expect(code).toHaveValue('12345');
  await expect(verify).toBeDisabled();
});

for (const story of [
  'TwoFactorSetupStart', 'TwoFactorSetupStartBusy', 'TwoFactorSetupStartError', 'TwoFactorSetupStartCancel',
]) {
  test(`TEST-S1 REQ-3 REQ-19 LoginScreen · ${story} · requests setup only through its start action`, async ({ page }) => {
    await openStory(page, story);
    const busy = story.endsWith('Busy');
    const start = page.getByRole('button', { name: busy ? 'Loading...' : 'Get Started', exact: true });
    const back = page.getByRole('button', { name: story.endsWith('Cancel') ? 'Cancel' : 'Back to sign in', exact: true });
    await expect(start).toBeVisible();
    await expect(back).toBeVisible();
    if (busy) {
      await expect(start).toBeDisabled();
      await expect(back).toBeDisabled();
    } else {
      await expect(start).toBeEnabled();
      await expect(back).toBeEnabled();
    }
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('img', { name: '2FA QR Code' })).toHaveCount(0);
    if (story.endsWith('Error')) await expect(page.getByRole('alert')).toHaveText(generic);
  });
}

for (const story of [
  'TwoFactorSetupCode', 'TwoFactorSetupCodeSecretShown', 'TwoFactorSetupCodeEmptyQr',
  'TwoFactorSetupCodeEightDigits', 'TwoFactorSetupCodeBusy', 'TwoFactorSetupCodeError',
  'TwoFactorSetupCodeChanged', 'TwoFactorSetupCodeDarkTheme', 'TwoFactorSetupCodeReplaced',
]) {
  test(`TEST-S1 REQ-3 REQ-7 REQ-8 REQ-19 LoginScreen · ${story} · presents the specified secret and confirmation state`, async ({ page }) => {
    await openStory(page, story);
    const code = page.getByRole('textbox');
    const qr = page.getByRole('img', { name: '2FA QR Code', exact: true });
    await expect(code).toBeVisible();
    await expect(code).toHaveAttribute('inputmode', 'numeric');
    await expect(code).toHaveAttribute('maxlength', story.endsWith('EightDigits') ? '8' : '6');

    if (story.endsWith('EmptyQr')) {
      await expect(qr).toHaveCount(0);
      await expect(page.getByText(secret, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: "Can't scan? Enter code manually" })).toHaveCount(0);
    } else {
      await expect(qr).toBeVisible();
      await expect(qr).toHaveAttribute('src', /^data:image\/png;base64,.+/);
    }
    if (story.endsWith('SecretShown')) {
      // The story's play toggles it; synchronize with its final state rather than racing it.
      await expect(page.getByText(secret, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Hide manual code', exact: true }).click();
      await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: "Can't scan? Enter code manually" })).toBeVisible();
    }
    if (story === 'TwoFactorSetupCode') {
      // The story types but must not auto-confirm the setup code.
      await expect(code).toHaveValue('123456');
      await expect(page.getByRole('button', { name: 'Confirm & Enable', exact: true })).toBeEnabled();
      await expect(page.getByRole('button', { name: "Can't scan? Enter code manually" })).toBeVisible();
    }
    if (story.endsWith('EightDigits')) {
      await code.fill('1234567');
      await expect(page.getByRole('button', { name: 'Confirm & Enable', exact: true })).toBeDisabled();
      await code.press('8');
      await expect(code).toHaveValue('12345678');
      await expect(page.getByRole('button', { name: 'Confirm & Enable', exact: true })).toBeEnabled();
    }
    if (story.endsWith('Busy')) {
      await expect(code).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Confirming...', exact: true })).toBeDisabled();
      await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeDisabled();
    } else {
      await expect(code).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Back to sign in' })).toBeEnabled();
    }
    if (story.endsWith('Error')) {
      await expect(code).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByRole('alert')).toHaveText(wrongCode);
    }
    if (story.endsWith('Changed') || story.endsWith('Replaced')) {
      await expect(page.getByRole('status').filter({ hasText: changed })).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(code).not.toHaveAttribute('aria-invalid', 'true');
      await expect(code).toHaveValue('');
      if (story.endsWith('Replaced')) {
        // Waited for the story's replacement interaction above; expose the actual new key.
        await page.getByRole('button', { name: "Can't scan? Enter code manually" }).click();
        await expect(page.getByText('NEWSECRETNEWSECRET', { exact: true })).toBeVisible();
        await expect(page.getByText(secret, { exact: true })).toHaveCount(0);
      }
    }
  });
}

for (const story of [
  'TwoFactorRecoveryCodes', 'TwoFactorRecoveryCodesBusy', 'TwoFactorRecoveryCodesError', 'TwoFactorRecoveryCodesDarkTheme',
]) {
  test(`TEST-S1 REQ-3 REQ-15 REQ-19 LoginScreen · ${story} · retains every code while finishing or reporting an error`, async ({ page }) => {
    await openStory(page, story);
    const codes = ['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6', 'Q7R8-S9T0', 'U1V2-W3X4', 'Y5Z6-A7B8', 'C9D0-E1F2'];
    await expect(page.getByRole('listitem')).toHaveText(codes);
    await expect(page.getByRole('button', { name: 'Copy to Clipboard', exact: true })).toBeEnabled();
    const busy = story.endsWith('Busy');
    const next = page.getByRole('button', { name: busy ? 'Finishing sign-in...' : "I've Saved These Codes", exact: true });
    if (busy) await expect(next).toBeDisabled();
    else await expect(next).toBeEnabled();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    if (story.endsWith('Error')) await expect(page.getByRole('alert')).toHaveText(generic);
  });
}

for (const story of [
  'StatusWorking', 'StatusWithSecondaryAction', 'StatusBusyPrimary', 'StatusWithError',
  'StatusSecondaryActionOnly', 'StatusRetryWithSecondaryAction', 'StatusSignedIn',
]) {
  test(`TEST-S1 REQ-2 REQ-10 REQ-18 REQ-19 LoginScreen · ${story} · provides the specified progress, notice and exit actions`, async ({ page }) => {
    await openStory(page, story);
    await expect(page.getByRole('textbox')).toHaveCount(0);
    if (story === 'StatusWorking') {
      await expect(page.getByRole('status').filter({ hasText: 'Checking your sign-in...' })).toBeVisible();
      await expect(page.getByRole('button')).toHaveCount(0);
    } else if (story === 'StatusSignedIn') {
      await expect(page.getByText("You're signed in", { exact: true })).toBeVisible();
      await expect(page.getByRole('button')).toHaveCount(0);
    } else {
      const back = page.getByRole('button', { name: 'Back to sign in', exact: true });
      if (story === 'StatusBusyPrimary') {
        await expect(page.getByRole('button', { name: 'Sending...', exact: true })).toBeDisabled();
        await expect(back).toBeDisabled();
      } else {
        await expect(back).toBeEnabled();
        if (story === 'StatusWithSecondaryAction') {
          await expect(page.getByRole('button', { name: 'Email me a setup link', exact: true })).toBeEnabled();
        } else if (story === 'StatusWithError') {
          await expect(page.getByText(checkEmail, { exact: true })).toBeVisible();
          await expect(page.getByRole('alert')).toHaveText(sendFailed);
          await expect(page.getByRole('button', { name: 'Send again', exact: true })).toBeEnabled();
        } else if (story === 'StatusSecondaryActionOnly') {
          await expect(page.getByText(checkEmail, { exact: true })).toBeVisible();
          await expect(page.getByRole('button')).toHaveCount(1);
          await expect(page.getByRole('button', { name: /send again|email me/i })).toHaveCount(0);
        } else {
          await expect(page.getByText('We could not continue your sign-in. Try again.', { exact: true })).toBeVisible();
          await expect(page.getByRole('button', { name: /try again/i })).toBeEnabled();
        }
      }
    }
  });
}
