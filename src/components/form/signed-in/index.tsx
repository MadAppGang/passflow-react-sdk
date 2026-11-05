import type { FC } from 'react';
import { LoginScreen, type LoginScreenProps } from '@/components/ui';
import { useAppSettings } from '@/hooks';
import type { SignInEnding } from '@/hooks/use-sign-in-ending';

export const SIGNED_IN_MESSAGE = "You're signed in";

const COULD_NOT_FINISH = 'We could not finish your sign-in';

const screens: Record<
  Exclude<SignInEnding, 'none'>,
  (onRetry: () => void) => Pick<LoginScreenProps, 'state'> & { title: string }
> = {
  'signed-in': () => ({
    title: SIGNED_IN_MESSAGE,
    state: { kind: 'status', tone: 'success', message: 'You can close this page.', testId: 'signed-in' },
  }),
  refused: () => ({
    title: COULD_NOT_FINISH,
    state: {
      kind: 'status',
      tone: 'error',
      message: 'This app does not allow the address it was asked to return to. Contact your administrator.',
      testId: 'sign-in-refused',
    },
  }),
  unavailable: (onRetry) => ({
    title: COULD_NOT_FINISH,
    state: {
      kind: 'status',
      tone: 'error',
      message: 'We could not check where to send you. Try again.',
      recoverable: true,
      retryLabel: 'Try again',
      onRetry,
      testId: 'sign-in-unavailable',
    },
  }),
};

/** How a sign-in ended, when that is not a redirect. See `useSignInEnding`. */
export const SignInEndingScreen: FC<{ ending: Exclude<SignInEnding, 'none'>; onRetry: () => void }> = ({ ending, onRetry }) => {
  const { currentStyles, loginAppTheme } = useAppSettings();
  const { title, state } = screens[ending](onRetry);

  return (
    <LoginScreen
      chrome={{
        title,
        customCss: currentStyles?.custom_css,
        customLogo: currentStyles?.logo_url,
        customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
        removeBranding: loginAppTheme?.remove_passflow_logo,
      }}
      state={state}
    />
  );
};
