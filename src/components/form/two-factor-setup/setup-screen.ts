import type { TwoFactorSetupResponse } from '@passflow/core';
import type { LoginScreenAction, LoginScreenProps } from '@/components/ui';

const DEFAULT_DIGITS = 6;

type SetupScreenStatus = {
  busy: boolean;
  error?: string | null;
};

type StartScreenProps = SetupScreenStatus & {
  secondaryAction?: LoginScreenAction;
  onStart: () => void;
};

type CodeScreenProps = SetupScreenStatus & {
  data: TwoFactorSetupResponse;
  /** Used when the server named no digit count. */
  fallbackDigits?: number;
  /** Tells the user something without marking the code invalid. An `error` takes its place. */
  notice?: string;
  secondaryAction?: LoginScreenAction;
  onSubmit: (code: string) => void;
};

type RecoveryCodesScreenProps = SetupScreenStatus & {
  codes: string[];
  onContinue: () => void;
};

/** Direct enrolment and the setup link page share these, so both look the same. */
export const getTwoFactorSetupStartScreen = ({
  busy,
  error,
  secondaryAction,
  onStart,
}: StartScreenProps): LoginScreenProps => ({
  chrome: {
    title: 'Enable Two-Factor Authentication',
    subtitle: 'Add an extra layer of security to your account',
  },
  state: {
    kind: 'two-factor-setup',
    step: 'start',
    startLabel: 'Get Started',
    busyLabel: 'Loading...',
    busy,
    error,
    secondaryAction,
    testId: 'two-factor-setup-start',
    onStart,
  },
});

export const getTwoFactorSetupCodeScreen = ({
  data,
  fallbackDigits = DEFAULT_DIGITS,
  notice,
  busy,
  error,
  secondaryAction,
  onSubmit,
}: CodeScreenProps): LoginScreenProps => {
  const digits = data.totp_digits ?? fallbackDigits;

  return {
    chrome: data.qr_code
      ? {
          title: 'Scan QR Code',
          subtitle: 'Scan this code with your authenticator app (Google Authenticator, Authy, etc.)',
        }
      : {
          title: 'Add Your Authenticator',
          subtitle: 'Add this key to your authenticator app (Google Authenticator, Authy, etc.)',
        },
    state: {
      kind: 'two-factor-setup',
      step: 'code',
      qrCode: data.qr_code,
      qrAlt: '2FA QR Code',
      secret: data.secret,
      secretLabel: 'Enter this key in your authenticator app.',
      showSecretLabel: "Can't scan? Enter code manually",
      hideSecretLabel: 'Hide manual code',
      digits,
      codeLabel: `Enter the ${digits}-digit code from your app to confirm:`,
      submitLabel: 'Confirm & Enable',
      busyLabel: 'Confirming...',
      busy,
      alert: error ? { message: error, tone: 'error' } : notice ? { message: notice, tone: 'info' } : undefined,
      secondaryAction,
      testId: 'two-factor-setup-code',
      onSubmit,
    },
  };
};

export const getTwoFactorRecoveryCodesScreen = ({
  codes,
  busy,
  error,
  onContinue,
}: RecoveryCodesScreenProps): LoginScreenProps => ({
  chrome: {
    title: 'Save Your Recovery Codes',
    subtitle: "Store these codes in a safe place. You'll need them if you lose access to your authenticator.",
  },
  state: {
    kind: 'two-factor-recovery-codes',
    warning: 'These codes will only be shown once. Make sure to save them!',
    codes,
    copyLabel: 'Copy to Clipboard',
    continueLabel: "I've Saved These Codes",
    busyLabel: 'Finishing sign-in...',
    busy,
    error,
    testId: 'two-factor-recovery-codes',
    onCopy: () => void navigator.clipboard.writeText(codes.join('\n')),
    onContinue,
  },
});
