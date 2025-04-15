import { Button } from '@/components/ui';
import { useSignIn } from '@/hooks';
/* eslint-disable no-nested-ternary */
import type { PassflowPasswordlessSignInPayload } from '@passflow/passflow-js-sdk';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';
import { useUrlParams } from '@/utils';
import { eq } from 'lodash';

const challengeTypeFullString = {
  email: 'email address',
  phone: 'phone number',
};

export const VerifyChallengeMagicLink = () => {
  const { fetch: refetch } = useSignIn();
  const { get } = useUrlParams({
    identity: '',
    identity_value: '',
    challenge_type: '',
    type: '',
    redirect_url: '',
  });

  const identity = get('email') ? 'email' : get('phone') ? 'phone' : undefined;
  const identityValue = get('email') ? get('email') : get('phone') ? get('phone') : undefined;
  const challengeType = get('challenge_type');
  const type = get('type') as 'passkey' | 'password' | 'passwordless';
  const redirectUrl = get('redirect_url');

  const onClickResendHandler = async () => {
    const resendPayload = {
      ...(eq(identity, 'email') ? { email: identityValue } : undefined),
      ...(eq(identity, 'phone') ? { phone: identityValue } : undefined),
      challenge_type: challengeType,
      redirect_url: redirectUrl,
    };

    await refetch(resendPayload as PassflowPasswordlessSignInPayload, type);
  };

  return (
    <Wrapper title='Check your email' className='passflow-flex passflow-flex-col passflow-max-w-[336px] passflow-mx-auto'>
      <div className='passflow-w-full passflow-flex passflow-flex-col passflow-gap-[32px] passflow-mt-[-24px]'>
        <p className='passflow-text-body-2-medium passflow-text-Grey-One passflow-text-center passflow-mt-[8px]'>
          We sent a link to {challengeTypeFullString[identity as keyof typeof challengeTypeFullString]}{' '}
          {identityValue && <strong className='passflow-text-body-2-bold'>{identityValue}</strong>}. Click on the link to
          confirm your registration.
        </p>
        {type === 'passwordless' && (
          <Button
            size='big'
            variant='secondary'
            type='button'
            className='passflow-text-body-2-medium passflow-m-auto passflow-max-w-[196px]'
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={onClickResendHandler}
          >
            Resend email
          </Button>
        )}
      </div>
    </Wrapper>
  );
};
