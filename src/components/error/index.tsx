import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidUrl } from '@/utils';
import { Wrapper } from '../form';
import { Button } from '../ui';

export type TError = {
  goBackRedirectTo: string;
  error?: string;
};

const defaultErrorMessage = 'Something went wrong';

export const Error: FC<TError> = ({ error = defaultErrorMessage, goBackRedirectTo }) => {
  const navigate = useNavigate();

  const onGoBackHandler = () => {
    if (!isValidUrl(goBackRedirectTo)) navigate(goBackRedirectTo);
    else window.location.href = goBackRedirectTo;
  };

  return (
    <Wrapper iconId='logo-red'>
      <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-start aooth-gap-[32px]'>
        <div className='aooth-flex aooth-flex-col aooth-items-center aooth-justify-start aooth-gap-[8px]'>
          {error && <p className='aooth-text-title-2-bold aooth-text-Warning aooth-text-center'>{error}</p>}
          <p className='aooth-text-body-2-medium aooth-text-Grey-One'>Please go back or try again later</p>
        </div>
        <Button size='big' type='button' variant='primary' onClick={onGoBackHandler} className='aooth-max-w-[196px]'>
          Go back
        </Button>
      </div>
    </Wrapper>
  );
};
