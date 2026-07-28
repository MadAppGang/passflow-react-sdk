import { LoginScreen } from '@/components/ui';
import { useAppSettings, useNavigation } from '@/hooks';
import { isValidUrl } from '@/utils';
import type { FC } from 'react';
import React from 'react';

export type TError = {
  goBackRedirectTo: string;
  error?: string;
};

const defaultErrorMessage = 'Something went wrong';

export const ErrorComponent: FC<TError> = ({ error = defaultErrorMessage, goBackRedirectTo }) => {
  const { navigate } = useNavigation();
  const { currentStyles, loginAppTheme } = useAppSettings();

  const handleGoBack = () => {
    if (!isValidUrl(goBackRedirectTo)) navigate({ to: goBackRedirectTo });
    else window.location.href = goBackRedirectTo;
  };

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
