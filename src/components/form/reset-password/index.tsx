/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC } from 'react';
import { Form, Formik, FormikHandlers } from 'formik';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, FieldPassword, Icon } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useAooth, useAppSettings, useResetPassword } from '@/hooks';
import { cn, getUrlWithTokens, isValidUrl, undefinedOnCatch, validationResetPasswordSchema } from '@/utils';
import '@/styles/index.css';
import { SuccessAuthRedirect } from '@/types';
import { Token, parseToken } from '@aooth/aooth-js-sdk';

const initialValues = {
  password: '',
};

type TResetPassword = {
  successAuthRedirect: SuccessAuthRedirect;
};

type ResetToken = Token & {
  redirect_url: string;
};

export const ResetPassword: FC<TResetPassword> = ({ successAuthRedirect }) => {
  const aooth = useAooth();
  const { fetch, error, isError, isLoading, reset } = useResetPassword();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { passwordPolicy } = useAppSettings();
  const resetToken = searchParams.get('token') ?? undefined;
  const resetTokenData = resetToken ? undefinedOnCatch(parseToken)(resetToken) : undefined;

  const onSubmitHanlder = async (values: typeof initialValues) => {
    const resetTokenType = resetTokenData as ResetToken;
    const status = await fetch(values.password);
    if (status) {
      if (!isValidUrl(resetTokenType?.redirect_url ?? successAuthRedirect))
        navigate(resetTokenType?.redirect_url ?? successAuthRedirect);
      else window.location.href = await getUrlWithTokens(aooth, resetTokenType?.redirect_url ?? successAuthRedirect);
    }
  };

  const onCustomChangeHandler = (handleChange: FormikHandlers['handleChange']) => (e: ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    if (isError) {
      reset();
    }
  };

  const labelStyle = cn('aooth-text-caption-1-medium aooth-text-Grey-One', {
    'aooth-text-Warning': isError,
  });

  return (
    <Wrapper title='Reset password' subtitle='Let’s get you back in.'>
      <span className='aooth-block aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center'>
        Enter your new password below.
      </span>
      <Formik
        initialValues={initialValues}
        validationSchema={validationResetPasswordSchema(passwordPolicy)}
        onSubmit={onSubmitHanlder}
        validateOnChange
      >
        {({ isValid, dirty, handleChange, handleBlur, values, errors }) => (
          <Form className='aooth-flex aooth-flex-col aooth-gap-[32px] aooth-mt-[32px]'>
            <div
              className={`aooth-flex aooth-flex-col aooth-gap-[24px] aooth-w-full aooth-p-[24px] 
              aooth-rounded-[6px] aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
            >
              <div
                className={`group aooth-relative aooth-flex aooth-flex-col aooth-items-start 
                aooth-justify-center aooth-gap-[6px]`}
              >
                <label htmlFor='password' className={labelStyle}>
                  New password
                </label>
                <FieldPassword
                  isError={isError}
                  id='password'
                  value={values.password}
                  passwordPolicy={passwordPolicy}
                  validationErrors={errors.password}
                  withMessages
                  name='password'
                  onChange={onCustomChangeHandler(handleChange)}
                  onBlur={handleBlur}
                />
                {isError && (
                  <div className='aooth-flex aooth-items-center aooth-justify-center aooth-gap-[4px]'>
                    <Icon size='small' id='warning' type='general' className='icon-warning' />
                    <span className='aooth-text-caption-1-medium aooth-text-Warning'>{error}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              size='big'
              variant='primary'
              type='submit'
              disabled={!isValid || !dirty || isLoading}
              className='aooth-m-auto'
            >
              Save new password
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};
