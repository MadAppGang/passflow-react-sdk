import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidUrl } from '@/utils';
import { Wrapper } from '../form';
import { Button } from '../ui';

export type TError = {
  goBackRedirectTo: string;
  error?: string;
};

export const Error: FC<TError> = ({ error, goBackRedirectTo }) => {
  const navigate = useNavigate();

  const onGoBackHandler = () => {
    if (!isValidUrl(goBackRedirectTo)) navigate(goBackRedirectTo);
    else window.location.href = goBackRedirectTo;
  };

  return (
    <Wrapper iconId='logo-red'>
      <div className='flex flex-col items-center justify-start gap-[32px]'>
        <div className='flex flex-col items-center justify-start gap-[8px]'>
          {error && <p className='text-title-2-bold text-Warning text-center'>{error}</p>}
          <p className='text-body-2-medium text-Grey-One'>Please go back or try again later</p>
        </div>
        <Button size='big' type='button' variant='primary' onClick={onGoBackHandler} className='max-w-[196px]'>
          Go back
        </Button>
      </div>
    </Wrapper>
  );
};

Error.defaultProps = { error: 'Something went wrong' };
