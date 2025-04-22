import { Button, FieldPhone, FieldText, Icon, Link } from '@/components/ui';
import { routes } from '@/context';
import { useAppSettings, useForgotPassword, useNavigation } from '@/hooks';
import { cn, emailRegex, getAuthMethods, getIdentityLabel, useUrlParams } from '@/utils';
import type { PassflowSendPasswordResetEmailPayload } from '@passflow/passflow-js-sdk';
import { eq, has, size } from 'lodash';
import { phone } from 'phone';
/* eslint-disable max-len */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable complexity */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { type FC, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as Yup from 'yup';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';
import queryString from 'query-string';

const initialValues = {
  email_or_username: '',
  phone: '',
};

const searchParamsForgotPasswordSchema = Yup.object().shape({
  defaultMethod: Yup.string().oneOf(['email_or_username', 'phone']).required(),
});

type TForgotPassword = {
  successResetRedirect: string;
  signInPath?: string;
  forgotPasswordSuccessPath?: string;
};

export const ForgotPassword: FC<TForgotPassword> = ({
  successResetRedirect,
  signInPath = routes.signin.path,
  forgotPasswordSuccessPath = routes.forgot_password_success.path,
}) => {
  const {
    getValues,
    control,
    register,
    formState: { errors, isDirty, isValid },
  } = useForm({
    defaultValues: initialValues,
  });

  const { appSettings, currentStyles, isError: isErrorApp, error: errorApp } = useAppSettings();

  if (isErrorApp) throw new Error(errorApp);

  const authMethods = useMemo(() => getAuthMethods(appSettings?.auth_strategies), [appSettings]);
  const { navigate } = useNavigation();
  const { get } = useUrlParams({
    default_method: '',
  });

  const params = {
    defaultMethod: get('default_method'),
  };

  try {
    searchParamsForgotPasswordSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid default method param');
  }

  const { defaultMethod } = params;

  const { fetch, error, isError, isLoading } = useForgotPassword();

  const onSubmitHanlder = async () => {
    const values = getValues();
    const isEmail = values.email_or_username.match(emailRegex);
    const isUsername = !isEmail && size(values.email_or_username) > 0;
    const validatedPhone = phone(values.phone);
    const isPhone = validatedPhone.isValid;

    const payload = {
      ...(isEmail && { email: values.email_or_username }),
      ...(isUsername && { username: values.email_or_username }),
      ...(isPhone && { phone: validatedPhone.phoneNumber }),
      redirect_url: successResetRedirect,
    } as PassflowSendPasswordResetEmailPayload;

    const status = await fetch(payload);

    if (status) {
      const currentSearchParams = new URLSearchParams(window.location.search);
      const newParams = queryString.stringify({
        ...Object.fromEntries(currentSearchParams.entries()),
        ...payload,
      });
      navigate({ to: forgotPasswordSuccessPath, search: newParams });
    }
  };

  // if (!state)
  //   return (
  //     <Navigate
  //       to={{
  //         pathname: signInPath ?? routes.signin.path,
  //         search: window.location.search,
  //       }}
  //       replace
  //     />
  //   );

  const currentSubtitle = eq(defaultMethod, 'email_or_username')
    ? 'Enter the email address you used when you joined and we’ll send you instructions to reset your password.'
    : 'Enter the mobile phone number you used when you joined and we’ll send you the reset link.';

  const currentSubscriptions = eq(defaultMethod, 'email_or_username')
    ? 'For security reasons, we do NOT store your password. So rest assured that we will never send your password via email.'
    : 'For security reasons, we do NOT store your password. So rest assured that we will never send your password via SMS.';

  return (
    <Wrapper
      title='Forgot password?'
      subtitle={currentSubtitle}
      className='passflow-forgot-password-wrapper'
      customCss={currentStyles?.custom_css}
    >
      <span className='passflow-form-subscriptions'>{currentSubscriptions}</span>

      <form onSubmit={(e) => e.preventDefault()} className='passflow-form'>
        <div className='passflow-form-container'>
          <div className='passflow-form-field'>
            {eq(defaultMethod, 'email_or_username') && (
              <>
                <div className='passflow-form-field__header'>
                  <label htmlFor='identity' className={cn('passflow-field-label', { 'passflow-field-label--error': isError })}>
                    {getIdentityLabel(authMethods, 'label')}
                  </label>
                </div>
                <Controller
                  name='email_or_username'
                  control={control}
                  rules={{
                    required: 'Email is required',
                    pattern: {
                      value: emailRegex,
                      message: 'Invalid email',
                    },
                  }}
                  render={({ field }) => (
                    <FieldText
                      {...field}
                      {...register('email_or_username')}
                      isError={isError || has(errors, 'email_or_username')}
                      id='email_or_username'
                      type='text'
                      name='email_or_username'
                    />
                  )}
                />
              </>
            )}
            {eq(defaultMethod, 'phone') && (
              <>
                <div className='passflow-form-field__header'>
                  <label htmlFor='phone' className={cn('passflow-field-label', { 'passflow-field-label--error': isError })}>
                    Phone
                  </label>
                </div>
                <Controller
                  name='phone'
                  control={control}
                  rules={{
                    required: 'Phone is required',
                    validate: (value) => {
                      const validatePhone = phone(value);
                      if (validatePhone.isValid) return true;
                      return 'Invalid phone number';
                    },
                  }}
                  render={({ field }) => (
                    <FieldPhone
                      {...field}
                      {...register('phone')}
                      onChange={(e) => field.onChange(e)}
                      id='phone'
                      name='phone'
                      isError={isError || has(errors, 'phone')}
                      ref={null}
                    />
                  )}
                />
              </>
            )}
            {isError && (
              <div className='passflow-form-error'>
                <Icon size='small' id='warning' type='general' className='icon-warning' />
                <span className='passflow-form-error-text'>{error}</span>
              </div>
            )}
          </div>
        </div>
        <div className='passflow-send-reset-wrapper'>
          <Button
            size='big'
            variant='primary'
            type='button'
            disabled={!isDirty || !isValid || isLoading}
            className='passflow-button-send-reset-password'
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={onSubmitHanlder}
          >
            Send reset instructions
          </Button>
          <p className='passflow-remember-password'>
            Remember your password?{' '}
            <Link to={signInPath ?? routes.signin.path} className='passflow-link'>
              Sign In
            </Link>{' '}
          </p>
        </div>
      </form>
    </Wrapper>
  );
};
