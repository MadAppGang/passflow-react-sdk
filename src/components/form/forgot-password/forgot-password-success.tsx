import { Button } from '@/components/ui';
import { useForgotPassword } from '@/hooks';
/* eslint-disable no-nested-ternary */
/* eslint-disable complexity */
import * as Yup from 'yup';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';
import { useUrlParams } from '@/utils';
import type { PassflowSendPasswordResetEmailPayload } from '@passflow/passflow-js-sdk';
import { eq } from 'lodash';

const searchParamsForgotPasswordSuccessSchema = Yup.object().shape({
  identity: Yup.string().oneOf(['email', 'phone']).required(),
  identityValue: Yup.string().required(),
  redirectUrl: Yup.string().required(),
});

export const ForgotPasswordSuccess = () => {
  const { fetch: refetch } = useForgotPassword();
  const { get } = useUrlParams();

  const params = {
    identity: get('email') ? 'email' : get('phone') ? 'phone' : null,
    identityValue: get('email') ? get('email') : get('phone') ? get('phone') : null,
    redirectUrl: get('redirect_url'),
  };

  try {
    searchParamsForgotPasswordSuccessSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid search params');
  }

  const onClickResendHandler = async () => {
    const resendPayload = {
      ...(params.identity === 'email' ? { email: params.identityValue } : undefined),
      ...(params.identity === 'phone' ? { phone: params.identityValue } : undefined),
      redirect_url: params.redirectUrl,
    };

    await refetch(resendPayload as PassflowSendPasswordResetEmailPayload);
  };

  return (
    <Wrapper
      title={`Check your ${params.identity}`}
      className='passflow-flex passflow-flex-col passflow-w-full passflow-mx-auto'
    >
      <div className='passflow-w-full passflow-max-w-[336px] passflow-flex passflow-flex-col passflow-gap-[32px] passflow-mt-[-8px]'>
        <p className='passflow-text-body-2-medium passflow-text-Grey-One passflow-text-center'>
          We sent a link to {eq(params.identity, 'phone') ? 'phone number' : 'email address'}{' '}
          <strong className='passflow-text-body-2-bold'>{params.identityValue}</strong>. Click the link to reset your password.
        </p>
        <Button
          size='big'
          variant='secondary'
          type='button'
          className='passflow-text-body-2-medium passflow-m-auto passflow-max-w-[196px]'
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onClick={onClickResendHandler}
        >
          Resend {eq(params.identity, 'email') ? 'email' : 'SMS'}
        </Button>
      </div>
    </Wrapper>
  );
};
