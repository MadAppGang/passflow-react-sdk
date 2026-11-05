import type { FC } from 'react';
import { LoginScreen } from '@/components/ui';
import { useAppSettings } from '@/hooks';

export const SIGNED_IN_MESSAGE = "You're signed in";

/** The end of a sign-in that has nowhere to go. See `useSignInEnding`. */
export const SignedInScreen: FC = () => {
  const { currentStyles, loginAppTheme } = useAppSettings();

  return (
    <LoginScreen
      chrome={{
        title: SIGNED_IN_MESSAGE,
        customCss: currentStyles?.custom_css,
        customLogo: currentStyles?.logo_url,
        customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
        removeBranding: loginAppTheme?.remove_passflow_logo,
      }}
      state={{ kind: 'status', tone: 'success', message: 'You can close this page.', testId: 'signed-in' }}
    />
  );
};
