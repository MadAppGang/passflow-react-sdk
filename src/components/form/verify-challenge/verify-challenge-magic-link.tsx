import { AoothPasswordlessSignInPayload } from '@aooth/aooth-js-sdk';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useSignIn } from '@/hooks';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';

export const VerifyChallengeMagicLink = () => {
  const { fetch: refetch } = useSignIn();
  const location = useLocation();
  const { identityValue, type, passwordlessPayload } = location.state as {
    identity: 'email' | 'phone';
    identityValue: string;
    type: 'passwordless' | 'passkey';
    passwordlessPayload: AoothPasswordlessSignInPayload;
  };

  // eslint-disable-next-line no-void
  const onClickResendHandler = () => void refetch(passwordlessPayload, 'passwordless');

  return (
    <Wrapper title='Check your email' className='aooth-flex aooth-flex-col aooth-max-w-[336px]'>
      <div className='aooth-w-full aooth-flex aooth-flex-col aooth-gap-[32px]'>
        <p className='aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center aooth-mt-[8px]'>
          We sent a link to email address {identityValue && <strong className='aooth-text-body-2-bold'>{identityValue}</strong>}
          . Click on the link to confirm your registration.
        </p>
        {type === 'passwordless' && (
          <Button
            size='big'
            variant='secondary'
            type='button'
            className='aooth-text-body-2-medium aooth-m-auto aooth-max-w-[196px]'
            onClick={onClickResendHandler}
          >
            Resend email
          </Button>
        )}
      </div>
    </Wrapper>
  );
};
