import { Button, FieldPassword, Icon } from '@/components/ui';
import { useAppSettings, useNavigation, usePassflow, useResetPassword } from '@/hooks';
import { cn, getUrlWithTokens, isValidUrl, passwordValidation, undefinedOnCatch, useUrlParams } from '@/utils';
/* eslint-disable max-len */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable jsx-a11y/label-has-associated-control */
import type { FC } from 'react';
import * as Yup from 'yup';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';
import type { SuccessAuthRedirect } from '@/types';
import { type Token, parseToken } from '@passflow/core';
import { has } from 'lodash';
import { Controller, useForm } from 'react-hook-form';

const initialValues = {
  password: '',
};

const searchParamsResetPasswordSchema = Yup.object().shape({
  token: Yup.string().required(),
});

type TResetPassword = {
  successAuthRedirect?: SuccessAuthRedirect;
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
  const { appSettings } = useAppSettings();
  const { fetch, error, isError, isLoading } = useResetPassword();
  const { navigate } = useNavigation();
  const { get } = useUrlParams();
  const { passwordPolicy, currentStyles, isError: isErrorApp, error: errorApp, loginAppTheme } = useAppSettings();

  if (isErrorApp) throw new Error(errorApp);

  const params = {
    token: get('token'),
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
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      if (!isValidUrl(resetTokenType?.redirect_url ?? successAuthRedirect ?? appSettings!.defaults.redirect))
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        navigate({ to: resetTokenType?.redirect_url ?? successAuthRedirect ?? appSettings!.defaults.redirect });
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      else window.location.href = await getUrlWithTokens(passflow, resetTokenType?.redirect_url ?? successAuthRedirect ?? appSettings!.defaults.redirect);
    }
  };

  const handlePasswordChange = async () => {
    await trigger(['password']);
  };

  return (
    <Wrapper
      title='Reset password'
      subtitle='Let’s get you back in.'
      className='passflow-reset-password-wrapper'
      customCss={currentStyles?.custom_css}
      customLogo={currentStyles?.logo_url}
      removeBranding={loginAppTheme?.remove_passflow_logo}
    >
      <span className='passflow-reset-password-text'>Enter your new password below.</span>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmitHanlder();
        }}
        className='passflow-form passflow-reset-password-form'
      >
        <div className='passflow-form-container'>
          <div className='passflow-form-field'>
            <div className='passflow-form-field__header'>
              <label htmlFor='password' className={cn('passflow-field-label', { 'passflow-field-label--error': isError })}>
                New password
              </label>
            </div>
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
              <div className='passflow-form-error'>
                <Icon size='small' id='warning' type='general' className='icon-warning' />
                <span className='passflow-form-error-text'>{error}</span>
              </div>
            )}
          </div>
        </div>
        <Button
          size='big'
          variant='primary'
          type='submit'
          disabled={!isDirty || !isValid || isLoading}
          className='passflow-button-reset-password'
        >
          Save new password
        </Button>
      </form>
    </Wrapper>
  );
};
