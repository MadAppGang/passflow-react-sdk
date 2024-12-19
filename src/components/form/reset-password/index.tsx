/* eslint-disable max-len */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { FC } from 'react';
import * as Yup from 'yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, FieldPassword, Icon } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useAppSettings, usePassflow, useResetPassword } from '@/hooks';
import { cn, getUrlWithTokens, isValidUrl, passwordValidation, undefinedOnCatch } from '@/utils';
import '@/styles/index.css';
import { SuccessAuthRedirect } from '@/types';
import { Token, parseToken } from '@passflow/passflow-js-sdk';
import { Controller, useForm } from 'react-hook-form';
import { has } from 'lodash';

const initialValues = {
  password: '',
};

const searchParamsResetPasswordSchema = Yup.object().shape({
  token: Yup.string().required(),
});

type TResetPassword = {
  successAuthRedirect: SuccessAuthRedirect;
};

type ResetToken = Token & {
  redirect_url: string;
};

export const ResetPassword: FC<TResetPassword> = ({ successAuthRedirect }) => {
  const {
    getValues,
    control,
    register,
    trigger,
    formState: { errors, isDirty, isValid },
    clearErrors,
    setError,
  } = useForm({
    defaultValues: initialValues,
  });

  const passflow = usePassflow();
  const { fetch, error, isError, isLoading } = useResetPassword();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { passwordPolicy, isError: isErrorApp, error: errorApp } = useAppSettings();

  if (isErrorApp) throw new Error(errorApp);

  const params = {
    token: searchParams.get('token'),
  };

  try {
    searchParamsResetPasswordSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid reset token.');
  }

  const { token: resetToken } = params;

  const resetTokenData = resetToken ? undefinedOnCatch(parseToken)(resetToken) : undefined;

  const onSubmitHanlder = async () => {
    const values = getValues();
    const resetTokenType = resetTokenData as ResetToken;
    const status = await fetch(values.password);
    if (status) {
      if (!isValidUrl(resetTokenType?.redirect_url ?? successAuthRedirect))
        navigate(resetTokenType?.redirect_url ?? successAuthRedirect);
      else window.location.href = await getUrlWithTokens(passflow, resetTokenType?.redirect_url ?? successAuthRedirect);
    }
  };

  const handlePasswordChange = async () => {
    await trigger(['password']);
  };

  const labelStyle = cn('passflow-text-caption-1-medium passflow-text-Grey-One', {
    'passflow-text-Warning': isError,
  });

  return (
    <Wrapper title='Reset password' subtitle='Let’s get you back in.'>
      <span className='passflow-block passflow-text-body-2-medium passflow-text-Grey-Six passflow-text-center passflow-mt-[-32px]'>
        Enter your new password below.
      </span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitHanlder();
        }}
        className='passflow-flex passflow-flex-col passflow-gap-[32px] passflow-max-w-[384px] passflow-w-full'
      >
        <div
          className={`passflow-flex passflow-flex-col passflow-gap-[24px] passflow-w-full passflow-p-[24px] 
              passflow-rounded-[6px] passflow-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
        >
          <div
            className={`group passflow-relative passflow-flex passflow-flex-col passflow-items-start 
                passflow-justify-center passflow-gap-[6px]`}
          >
            <label htmlFor='password' className={labelStyle}>
              New password
            </label>
            <Controller
              name='password'
              control={control}
              rules={{
                required: 'Password is required',
                validate: (value) => {
                  try {
                    passwordValidation(passwordPolicy).validateSync(value);
                    clearErrors('password');
                    return true;
                  } catch (err) {
                    const passwordErrors = err as { errors: string[] };
                    setError('password', {
                      type: 'manual',
                      message: passwordErrors.errors.join(', '),
                    });
                    return passwordErrors.errors.join(', ');
                  }
                },
              }}
              render={({ field }) => (
                <FieldPassword
                  {...field}
                  {...register('password')}
                  isError={isError}
                  passwordPolicy={passwordPolicy}
                  validationErrors={
                    has(errors, 'password') && errors.password?.message ? errors.password.message.split(', ') : undefined
                  }
                  id='password'
                  name='password'
                  withMessages
                  onChange={(e) => {
                    field.onChange(e);
                    void handlePasswordChange();
                  }}
                />
              )}
            />
            {isError && (
              <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px]'>
                <Icon size='small' id='warning' type='general' className='icon-warning' />
                <span className='passflow-text-caption-1-medium passflow-text-Warning'>{error}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          size='big'
          variant='primary'
          type='submit'
          disabled={!isDirty || !isValid || isLoading}
          className='passflow-m-auto'
        >
          Save new password
        </Button>
      </form>
    </Wrapper>
  );
};
