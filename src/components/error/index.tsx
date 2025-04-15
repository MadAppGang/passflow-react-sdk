import { useNavigation } from '@/hooks';
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

  const onGoBackHandler = () => {
    if (!isValidUrl(goBackRedirectTo)) navigate({ to: goBackRedirectTo });
    else window.location.href = goBackRedirectTo;
  };

  return (
    <Wrapper iconId='logo-red'>
      <div className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-start passflow-gap-[32px] passflow-mt-[-8px]'>
        <div className='passflow-flex passflow-flex-col passflow-items-center passflow-justify-start passflow-gap-[8px]'>
          {error && <p className='passflow-text-title-2-bold passflow-text-Warning passflow-text-center'>{error}</p>}
          <p className='passflow-text-body-2-medium passflow-text-Grey-One'>Please go back or try again later</p>
        </div>
        <Button size='big' type='button' variant='primary' onClick={onGoBackHandler} className='passflow-max-w-[196px]'>
          Go back
        </Button>
      </div>
    </Wrapper>
  );
};
