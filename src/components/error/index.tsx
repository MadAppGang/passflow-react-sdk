import { useAppSettings, useNavigation } from '@/hooks';
import { isValidUrl } from '@/utils';
import type { FC } from 'react';
import React from 'react';
import { Wrapper } from '../form';
import { Button } from '../ui';

export type TError = {
  goBackRedirectTo: string;
  error?: string;
};

const defaultErrorMessage = 'Something went wrong';

export const ErrorComponent: FC<TError> = ({ error = defaultErrorMessage, goBackRedirectTo }) => {
  const { navigate } = useNavigation();
  const { currentStyles, loginAppTheme } = useAppSettings();

  const onGoBackHandler = () => {
    if (!isValidUrl(goBackRedirectTo)) navigate({ to: goBackRedirectTo });
    else window.location.href = goBackRedirectTo;
  };

  return (
    <Wrapper
      iconId='logo-red'
      className='passflow-error-wrapper'
      customCss={currentStyles?.custom_css}
      customLogo={currentStyles?.logo_url}
      removeBranding={loginAppTheme?.remove_passflow_logo}
    >
      <div className='passflow-error-container'>
        <div className='passflow-error-container-text-wrapper'>
          {error && <p className='passflow-error-container-text'>{error}</p>}
          <p className='passflow-error-container-text-secondary'>Please go back or try again later</p>
        </div>
        <Button size='big' type='button' variant='primary' onClick={onGoBackHandler} className='passflow-button-go-back-error'>
          Go back
        </Button>
      </div>
    </Wrapper>
  );
};
