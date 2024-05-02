/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC } from 'react';
import { Form, Formik, FormikHandlers } from 'formik';
import { useNavigate } from 'react-router-dom';
import { Button, FieldPassword, Icon } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useAppSettings, useResetPassword } from '@/hooks';
import { cn, getUrlWithTokens, isValidUrl, validationResetPasswordSchema } from '@/utils';
import '@/styles/index.css';
import { SuccessAuthRedirect } from '@/types';
import { concatScopes, defaultScopes } from '@/constants';

const initialValues = {
  password: '',
};

type TResetPassword = {
  successAuthRedirect: SuccessAuthRedirect;
  scopes?: string[];
};

export const ResetPassword: FC<TResetPassword> = ({ successAuthRedirect, scopes = defaultScopes }) => {
  const { fetch, error, isError, isLoading, reset } = useResetPassword();
  const navigate = useNavigate();
  const { passwordPolicy } = useAppSettings();
  const onSubmitHanlder = async (values: typeof initialValues) => {
    const status = await fetch(values.password, concatScopes(scopes));
    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = getUrlWithTokens(successAuthRedirect);
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

ResetPassword.defaultProps = { scopes: defaultScopes };
