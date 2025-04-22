import { ErrorComponent } from '@/components/error';
import { Button, FieldPassword, FieldPhone, FieldText, Icon, Link, ProvidersBox, Switch } from '@/components/ui';
import { routes } from '@/context';
import { withError } from '@/hocs';
import { useAppSettings, useNavigation, usePassflow, useProvider, useSignIn } from '@/hooks';
import type { DefaultMethod, SuccessAuthRedirect } from '@/types';
import {
  cn,
  emailRegex,
  getAuthMethods,
  getIdentityLabel,
  getPasswordlessData,
  getUrlErrors,
  getUrlWithTokens,
  isValidUrl,
} from '@/utils';
import type {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
  Providers,
} from '@passflow/passflow-js-sdk';
import { eq, has, size } from 'lodash';
import { phone } from 'phone';
import queryString from 'query-string';
import React, { type ChangeEvent, type FC, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';

const initialValues = {
  password: '',
  email_or_username: '',
  phone: '',
};

export type TSignIn = {
  successAuthRedirect: SuccessAuthRedirect;
  relyingPartyId?: string;
  federatedCallbackUrl?: string;
  federatedDisplayMode?: 'modal' | 'redirect';
  signUpPath?: string;
  createTenant?: boolean;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
  forgotPasswordPath?: string;
};

export const SignInForm: FC<TSignIn> = ({
  federatedCallbackUrl = window.location.origin,
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  signUpPath = routes.signup.path,
  createTenant = false,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
  forgotPasswordPath = routes.forgot_password.path,
}) => {
  const {
    getValues,
    control,
    trigger,
    register,
    formState: { errors, isDirty, isValid },
    clearErrors,
    reset: resetForm,
  } = useForm({
    defaultValues: initialValues,
  });
  const passflow = usePassflow();
  const { navigate } = useNavigation();
  const { appSettings, passwordPolicy, currentStyles, isError: isErrorApp, error: errorApp, loginAppTheme } = useAppSettings();
  const { federatedWithRedirect } = useProvider(federatedCallbackUrl);

  if (isErrorApp) throw new Error(errorApp);

  const authMethods = useMemo(() => getAuthMethods(appSettings?.auth_strategies), [appSettings]);

  const { error: errorUrl, message: messageUrl } = getUrlErrors();

  if (errorUrl && messageUrl) throw new Error(messageUrl);

  const { fetch, isError, error, reset, isLoading } = useSignIn();

  const [forcePasswordless, setForcePasswordless] = useState<boolean>(
    (appSettings?.force_passwordless_login && authMethods.passkey) || false,
  );

  const [defaultMethod, setDefaultMethod] = useState<DefaultMethod | null>(() => {
    if (authMethods.hasEmailMethods || authMethods.hasUsernameMethods) return 'email_or_username';
    if (authMethods.hasPhoneMethods) return 'phone';
    return null;
  });

  useEffect(() => {
    setForcePasswordless((appSettings?.force_passwordless_login && authMethods.passkey) || false);

    if (authMethods.hasSignInEmailMethods || authMethods.hasSignInUsernameMethods) {
      setDefaultMethod('email_or_username');
    } else if (authMethods.hasSignInPhoneMethods) {
      setDefaultMethod('phone');
    } else {
      setDefaultMethod(null);
    }
  }, [appSettings?.force_passwordless_login, authMethods]);

  const resetFormStates = () => {
    resetForm();
    clearErrors();
    reset();
  };

  const handleDefaultMethod = (method: DefaultMethod) => {
    setDefaultMethod(method);
    resetFormStates();
  };

  const hasPassword =
    (eq(defaultMethod, 'phone') && authMethods.internal.phone.password) ||
    (eq(defaultMethod, 'email_or_username') && (authMethods.internal.email.password || authMethods.internal.username.password));

  const hasPasswordless =
    (eq(defaultMethod, 'phone') && (authMethods.internal.phone.otp || authMethods.internal.phone.magicLink)) ||
    (eq(defaultMethod, 'email_or_username') && (authMethods.internal.email.otp || authMethods.internal.email.magicLink));

  const hasPasskey = authMethods.passkey;

  const onChangePasswordlessExperience = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setForcePasswordless(checked);

    resetFormStates();
  };

  const onSubmitPasswordHandler = async (userPayload: PassflowSignInPayload) => {
    const status = await fetch(userPayload, 'password');

    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate({ to: successAuthRedirect });
      else window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
    }
  };

  const onSubmitPasskeyHandler = async (passkeyPayload: PassflowPasskeyAuthenticateStartPayload) => {
    const response = await fetch(passkeyPayload, 'passkey');

    if (response) {
      if (!isValidUrl(successAuthRedirect)) navigate({ to: successAuthRedirect });
      else window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
    }
  };

  const onSubmitPasswordlessHandler = async (userPayload: Partial<PassflowPasswordlessSignInPayload>) => {
    const currentChallegeType = getPasswordlessData(authMethods, defaultMethod)?.challengeType;

    const payload = {
      ...userPayload,
      challenge_type: getPasswordlessData(authMethods, defaultMethod)?.challengeType,
      create_tenant: createTenant,
      redirect_url: successAuthRedirect,
    } as PassflowPasswordlessSignInPayload;

    const response = (await fetch(payload, 'passwordless')) as PassflowPasswordlessResponse;

    const params = new URLSearchParams(window.location.search);
    const searchParamsState = {
      ...payload,
      ...response,
      type: 'passwordless',
      challenge_type: currentChallegeType,
      create_tenant: createTenant,
    };
    const newParams = queryString.stringify({
      ...Object.fromEntries(params.entries()),
      ...searchParamsState,
    });

    if (eq(currentChallegeType, 'otp') && (response satisfies PassflowPasswordlessResponse))
      navigate({ to: verifyOTPPath ?? routes.verify_otp.path, search: newParams });

    if (eq(currentChallegeType, 'magic_link') && (response satisfies PassflowPasswordlessResponse))
      navigate({ to: verifyMagicLinkPath ?? routes.verify_magic_link.path, search: newParams });
  };

  const onSubmitHandler = async (
    data: Partial<typeof initialValues> | PassflowPasskeyAuthenticateStartPayload,
    type: 'passkey' | 'password' | 'passwordless',
  ) => {
    if (eq(type, 'password')) await onSubmitPasswordHandler(data as PassflowSignInPayload);
    if (eq(type, 'passkey')) await onSubmitPasskeyHandler(data as PassflowPasskeyAuthenticateStartPayload);
    if (eq(type, 'passwordless')) await onSubmitPasswordlessHandler(data as PassflowPasswordlessSignInPayload);
  };

  const validateSignInPasswordless = async () => {
    let isValidated = false;
    if (eq(defaultMethod, 'phone')) isValidated = await trigger(['phone']);
    if (eq(defaultMethod, 'email_or_username')) isValidated = await trigger(['email_or_username']);

    if (isValidated) {
      const values = getValues();
      const isEmail = values.email_or_username.match(emailRegex);
      const validatedPhone = phone(values.phone);
      const isPhone = validatedPhone.isValid;

      const payload = {
        ...(isEmail && { email: values.email_or_username }),
        ...(isPhone && { phone: validatedPhone.phoneNumber }),
      };

      await onSubmitHandler(payload, 'passwordless');
    }
  };

  const validateSingIn = async () => {
    const values = getValues();
    const isEmail = values.email_or_username.match(emailRegex);
    const isUsername = !isEmail && size(values.email_or_username) > 0;
    const validatedPhone = phone(values.phone);
    const isPhone = validatedPhone.isValid;

    const payload = {
      ...(isEmail && { email: values.email_or_username }),
      ...(isUsername && { username: values.email_or_username }),
      ...(isPhone && { phone: validatedPhone.phoneNumber }),
      password: values.password,
    };

    await onSubmitHandler(payload, 'password');
  };

  const validateSignInPasskey = async () => {
    const payload = {
      relying_party_id: relyingPartyId,
    };

    await onSubmitHandler(payload, 'passkey');
  };

  const onClickProviderHandler = (provider: Providers) => federatedWithRedirect(provider);

  return (
    <Wrapper
      title='Sign In to your account'
      subtitle='To Passflow by Madappgang'
      className='passflow-signin-wrapper'
      customCss={currentStyles?.custom_css}
      customLogo={currentStyles?.logo_url}
      removeBranding={loginAppTheme?.remove_passflow_logo}
    >
      {hasPasskey && (hasPasswordless || hasPassword) && (
        <div className='passflow-form-switch'>
          <Switch label='Passwordless experience' checked={forcePasswordless} onChange={onChangePasswordlessExperience} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!forcePasswordless) {
            if (hasPassword) void validateSingIn();
            if (!hasPassword && hasPasswordless) void validateSignInPasswordless();
          }
        }}
        className='passflow-form'
      >
        {!forcePasswordless && defaultMethod ? (
          <>
            <div className='passflow-form-container'>
              {eq(defaultMethod, 'email_or_username') && (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='identity'
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': isError || has(errors, 'email_or_username'),
                      })}
                    >
                      {getIdentityLabel(authMethods, 'label')}
                    </label>
                    {authMethods.hasSignInPhoneMethods && (
                      <Button
                        size='small'
                        variant='clean'
                        type='button'
                        className='passflow-field-label-button'
                        onClick={() => handleDefaultMethod('phone')}
                      >
                        Use phone
                      </Button>
                    )}
                  </div>
                  <Controller
                    name='email_or_username'
                    control={control}
                    rules={{ required: 'Email is required' }}
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
                  {has(errors, 'email_or_username') && (
                    <div className='passflow-form-error'>
                      <Icon size='small' id='warning' type='general' className='icon-warning' />
                      <span className='passflow-form-error-text'>{errors.email_or_username?.message}</span>
                    </div>
                  )}
                </div>
              )}
              {eq(defaultMethod, 'phone') && (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='phone'
                      className={cn('passflow-field-label', { 'passflow-field-label--error': isError || has(errors, 'phone') })}
                    >
                      Phone number
                    </label>
                    {(authMethods.hasSignInEmailMethods || authMethods.hasSignInUsernameMethods) && (
                      <Button
                        size='small'
                        variant='clean'
                        type='button'
                        className='passflow-field-label-button'
                        onClick={() => handleDefaultMethod('email_or_username')}
                      >
                        {getIdentityLabel(authMethods, 'button')}
                      </Button>
                    )}
                  </div>
                  <Controller
                    name='phone'
                    control={control}
                    rules={{
                      required: 'Phone number is required',
                      validate: (value) => {
                        const validatePhone = phone(value);
                        if (validatePhone.isValid) return true;
                        return 'Invalid phone number';
                      },
                    }}
                    render={({ field }) => (
                      <FieldPhone
                        {...register('phone')}
                        ref={null}
                        onChange={(e) => field.onChange(e)}
                        id='phone'
                        name='phone'
                        isError={isError || has(errors, 'phone')}
                      />
                    )}
                  />
                  {has(errors, 'phone') && (
                    <div className='passflow-form-error'>
                      <Icon size='small' id='warning' type='general' className='icon-warning' />
                      <span className='passflow-form-error-text'>{errors.phone?.message}</span>
                    </div>
                  )}
                </div>
              )}
              {hasPassword ? (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='password'
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': isError || has(errors, 'password'),
                      })}
                    >
                      Password
                    </label>
                    <Link
                      to={forgotPasswordPath ?? routes.forgot_password.path}
                      search={queryString.stringify({
                        ...queryString.parse(window.location.search),
                        default_method: defaultMethod,
                      })}
                      className='passflow-field-label-button'
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <Controller
                    name='password'
                    control={control}
                    rules={{ required: 'Password is required' }}
                    render={({ field }) => (
                      <FieldPassword
                        {...field}
                        {...register('password')}
                        isError={isError || has(errors, 'password')}
                        passwordPolicy={passwordPolicy}
                        id='password'
                        name='password'
                      />
                    )}
                  />
                  {has(errors, 'password') && (
                    <div className='passflow-form-error'>
                      <Icon size='small' id='warning' type='general' className='icon-warning' />
                      <span className='passflow-form-error-text'>{errors.password?.message}</span>
                    </div>
                  )}
                </div>
              ) : null}
              {isError && (
                <div className='passflow-form-error'>
                  <Icon size='small' id='warning' type='general' className='icon-warning' />
                  <span className='passflow-form-error-text'>{error}</span>
                </div>
              )}
            </div>
            {hasPassword ? (
              <Button
                size='big'
                variant='primary'
                type='submit'
                disabled={!isDirty || !isValid || isLoading}
                className='passflow-button-signin'
              >
                Sign In
              </Button>
            ) : null}
            {hasPasswordless && (
              <Button
                size='big'
                variant={hasPassword ? 'outlined' : 'primary'}
                type={hasPassword ? 'button' : 'submit'}
                className={cn('passflow-button-passwordless', {
                  'passflow-button-passwordless--active': hasPassword,
                })}
                style={hasPassword ? { marginTop: '-16px' } : {}}
                onClick={() => (hasPassword ? validateSignInPasswordless() : null)}
                disabled={(() => {
                  const values = getValues();
                  if (size(values[defaultMethod]) === 0) return true;
                  return false;
                })()}
              >
                Sign In with {getPasswordlessData(authMethods, defaultMethod)?.label}
              </Button>
            )}
            {hasPasskey ? (
              <Button
                size='big'
                variant='dark'
                type='button'
                className={cn('passflow-button-passkey')}
                style={hasPassword || hasPasswordless ? { marginTop: '-16px' } : {}}
                withIcon
                onClick={validateSignInPasskey}
              >
                <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
                Sign In with a Passkey
              </Button>
            ) : null}
          </>
        ) : null}
        {forcePasswordless && hasPasskey ? (
          <>
            {isError && (
              <div className='passflow-form-error'>
                <Icon size='small' id='warning' type='general' className='icon-warning' />
                <span className='passflow-form-error-text'>{error}</span>
              </div>
            )}
            <Button
              size='big'
              variant='dark'
              type='button'
              className='passflow-button-passkey'
              withIcon
              onClick={validateSignInPasskey}
            >
              <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
              Sign In with a Passkey
            </Button>
          </>
        ) : null}
        <div className={cn('passflow-form-actions', { 'passflow-form-actions--top-space': hasPassword || hasPasskey })}>
          <p className='passflow-dont-have-account'>
            Don&apos;t have an account?{' '}
            <Link to={signUpPath ?? routes.signup.path} search={window.location.search} className='passflow-link'>
              Sign Up
            </Link>
          </p>
        </div>
        {size(authMethods.fim.providers) > 0 && (
          <div className='passflow-form-providers'>
            {hasPassword || hasPasswordless || hasPasskey ? (
              <div className='passflow-form-divider'>
                <div className='passflow-form-divider__line' />
                <span className='passflow-form-divider__text'>Or continue with</span>
              </div>
            ) : null}
            <ProvidersBox providers={authMethods.fim.providers} onClick={onClickProviderHandler} />
          </div>
        )}
      </form>
    </Wrapper>
  );
};

export const SignIn = withError(SignInForm, ErrorComponent);
