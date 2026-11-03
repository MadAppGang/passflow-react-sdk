import { expect, test } from '../fixture';

const states = [
  ['Primary', 'primary', 'Verify', false],
  ['PrimaryDisabled', 'primary-disabled', 'Verify', true],
  ['Secondary', 'secondary', 'Use another way', false],
  ['Outlined', 'outlined', 'Use another way', false],
  ['Warning', 'warning', 'Delete account', false],
  ['Clean', 'clean', 'Cancel', false],
  ['CleanAriaDisabled', 'clean-aria-disabled', 'Resend code', true],
  ['Link', 'link', 'Use recovery code', false],
  ['LinkDisabled', 'link-disabled', 'Use recovery code', true],
  ['Dark', 'dark', 'Continue', false],
  ['Provider', 'provider', 'Continue with Google', false],
  ['Small', 'small', '+', false],
  ['Medium', 'medium', 'Save', false],
  ['Option', 'option', 'Authenticator app', false],
  ['OptionMultiline', 'option-multiline', 'Authenticator app Enter the code from your authenticator app', false],
  ['OptionPressed', 'option-pressed', 'Recovery code Enter one of your single-use recovery codes', false],
  ['OptionUnpressed', 'option-unpressed', 'Passkey Confirm with your device', false],
  ['OptionDisabled', 'option-disabled', 'SMS code Enter the code we texted you', true],
  ['OptionPressedDisabled', 'option-pressed-disabled', 'Authenticator app Enter the code from your authenticator app', true],
  ['OptionDescribed', 'option-described', 'Passkey Confirm with your device', false],
] as const;

for (const [name, id, label, disabled] of states) {
  test(`REQ-19 Button · ${name} · exposes its advertised accessible state`, async ({ page }) => {
    await page.goto(`http://localhost:6107/iframe.html?id=components-button--${id}&viewMode=story`);
    const button = page.getByRole('button', { name: label, exact: true });
    await expect(button).toBeVisible();
    if (disabled) await expect(button).toBeDisabled();
    else await expect(button).toBeEnabled();

    if (id === 'clean-aria-disabled') {
      await expect(button).toHaveAttribute('aria-disabled', 'true');
      await button.focus();
      await expect(button).toBeFocused();
    }
    if (id === 'option-pressed' || id === 'option-pressed-disabled') {
      await expect(button).toHaveAttribute('aria-pressed', 'true');
    }
    if (id === 'option-unpressed') await expect(button).toHaveAttribute('aria-pressed', 'false');
  });
}
