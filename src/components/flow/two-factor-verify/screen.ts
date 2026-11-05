import {
  getTwoFactorRecoveryCodesScreen,
  getTwoFactorSetupCodeScreen,
  getTwoFactorSetupStartScreen,
} from '@/components/form/two-factor-setup/setup-screen';
import type { LoginScreenAction, LoginScreenProps } from '@/components/ui';
import { TWO_FACTOR_LINK_MAX_SENDS, type UseTwoFactorEnrollmentReturn } from '@/hooks/use-two-factor-enrollment';
import { twoFactorBackToSignInLabel, twoFactorSignInLabel } from '@/utils';

const TITLE = 'Two-Factor Authentication';

/** The screen for the enrolment state; null on `verify`, which the verify and recovery forms draw. */
export const getTwoFactorEnrollmentScreenProps = (
  enrollment: UseTwoFactorEnrollmentReturn,
  onBackToSignIn: () => void,
): LoginScreenProps | null => {
  const { screen } = enrollment;
  const backToSignIn: LoginScreenAction = { label: twoFactorBackToSignInLabel, onClick: onBackToSignIn };

  switch (screen.kind) {
    case 'verify':
      return null;

    case 'loading':
      return {
        chrome: { title: TITLE },
        state: { kind: 'status', tone: 'working', message: 'Checking your sign-in...', testId: 'two-factor-loading' },
      };

    case 'email_link':
      return {
        chrome: { title: 'Set Up Two-Factor Authentication' },
        state: {
          kind: 'status',
          tone: 'info',
          message: screen.sent
            ? 'Check your email for a link to set up two-factor authentication. After you set it up, sign in again.'
            : 'Your account needs two-factor authentication. We can email you a link to set it up.',
          error: screen.error,
          testId: 'two-factor-email-link',
          primaryAction:
            screen.busy || screen.sends < TWO_FACTOR_LINK_MAX_SENDS
              ? {
                  label: screen.busy ? 'Sending...' : screen.sent ? 'Send again' : 'Email me a setup link',
                  busy: screen.busy,
                  onClick: () => void enrollment.sendLink(),
                }
              : undefined,
          secondaryAction: backToSignIn,
        },
      };

    case 'direct':
      if (screen.step === 'codes') {
        return getTwoFactorRecoveryCodesScreen({
          codes: screen.codes,
          busy: screen.busy,
          error: screen.error,
          onContinue: () => void enrollment.finish(),
        });
      }
      if (screen.step === 'code' && screen.data) {
        return getTwoFactorSetupCodeScreen({
          data: screen.data,
          notice: screen.notice,
          busy: screen.busy,
          error: screen.error,
          secondaryAction: backToSignIn,
          onSubmit: (code) => void enrollment.confirm(code),
        });
      }
      return getTwoFactorSetupStartScreen({
        busy: screen.busy,
        error: screen.error,
        secondaryAction: backToSignIn,
        onStart: () => void enrollment.begin(),
      });

    case 'unavailable':
      return {
        chrome: { title: TITLE },
        state: {
          kind: 'status',
          tone: 'disabled',
          message: 'Two-factor authentication cannot be set up for your account here. Contact your administrator.',
          testId: 'two-factor-unavailable',
          secondaryAction: backToSignIn,
        },
      };

    case 'ended':
      return {
        chrome: { title: TITLE },
        state: {
          kind: 'status',
          tone: 'error',
          message: screen.message,
          testId: 'two-factor-ended',
          primaryAction: { label: twoFactorSignInLabel, onClick: onBackToSignIn },
        },
      };

    case 'read_failed':
      return {
        chrome: { title: TITLE },
        state: {
          kind: 'status',
          tone: 'error',
          message: 'We could not continue your sign-in. Try again.',
          recoverable: true,
          testId: 'two-factor-read-failed',
          onRetry: () => void enrollment.read(),
          secondaryAction: backToSignIn,
        },
      };

    case 'finished':
      return {
        chrome: { title: TITLE },
        state: { kind: 'status', tone: 'success', message: 'You are signed in.', testId: 'two-factor-finished' },
      };
  }
};
