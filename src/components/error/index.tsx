import type { FC } from 'react';
import { LoginScreen } from '@/components/ui';
import { useAppSettings, useNavigation } from '@/hooks';
import { isSameOriginPath } from '@/utils';

export type TError = {
  goBackRedirectTo: string;
  error?: string;
};

const defaultErrorMessage = 'Something went wrong';

export const ErrorComponent: FC<TError> = ({ error = defaultErrorMessage, goBackRedirectTo }) => {
  const { navigate } = useNavigation();
  const { currentStyles, loginAppTheme } = useAppSettings();

  // The target can come from the request, so this only ever follows a path on this origin.
  const handleGoBack = () => navigate({ to: isSameOriginPath(goBackRedirectTo) ? goBackRedirectTo : '/' });

  return (
    <LoginScreen
      chrome={{
        title: '',
        customCss: currentStyles?.custom_css,
        customLogo: currentStyles?.logo_url,
        customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
        removeBranding: loginAppTheme?.remove_passflow_logo,
      }}
      state={{
        kind: 'general-error',
        message: error,
        onAction: handleGoBack,
      }}
    />
  );
};
