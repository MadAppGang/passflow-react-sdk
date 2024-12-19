/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable max-len */
/* eslint-disable complexity */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC, useEffect, useMemo, useState } from 'react';
import { Button, FieldPassword, FieldPhone, FieldText, Icon, Link, ProvidersBox, Switch } from '@/components/ui';
import { Controller, useForm } from 'react-hook-form';
import {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
  Providers,
} from '@passflow/passflow-js-sdk';
import { phone } from 'phone';
import queryString from 'query-string';
import { eq, has, size } from 'lodash';
import { Wrapper } from '../wrapper';
import { useAppSettings, usePassflow, useProvider, useSignIn } from '@/hooks';
import { cn, emailRegex, getAuthMethods, getIdentityLabel, getPasswordlessData, getUrlWithTokens, isValidUrl } from '@/utils';
import { routes } from '@/context';
import { useNavigate } from 'react-router-dom';
import { DefaultMethod, SuccessAuthRedirect } from '@/types';
import { withError } from '@/hocs';
import { Error as ErrorComponent } from '@/components/error';
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
  const navigate = useNavigate();
  const { appSettings, passwordPolicy, passkeyProvider, isError: isErrorApp, error: errorApp } = useAppSettings();
  const { federatedWithRedirect } = useProvider(federatedCallbackUrl);

  if (isErrorApp) throw new Error(errorApp);

  const authMethods = useMemo(() => getAuthMethods(appSettings?.auth_strategies), [appSettings]);

  const { fetch, isError, error, reset, isLoading } = useSignIn();

  const [forcePasswordless, setForcePasswordless] = useState<boolean>(
    authMethods.email.passkey || authMethods.phone.passkey || authMethods.username.passkey || false,
  );

  const [defaultMethod, setDefaultMethod] = useState<DefaultMethod | null>(() => {
    if (authMethods.hasEmailMethods || authMethods.hasUsernameMethods) return 'email_or_username';
    if (authMethods.hasPhoneMethods) return 'phone';
    return null;
  });

  useEffect(() => {
    setForcePasswordless(authMethods.email.passkey || authMethods.phone.passkey || authMethods.username.passkey || false);

    if (authMethods.hasSignInEmailMethods || authMethods.hasSignInUsernameMethods) {
      setDefaultMethod('email_or_username');
    } else if (authMethods.hasSignInPhoneMethods) {
      setDefaultMethod('phone');
    } else {
      setDefaultMethod(null);
    }
  }, [authMethods]);

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
    (eq(defaultMethod, 'phone') && authMethods.phone.password) ||
    (eq(defaultMethod, 'email_or_username') && (authMethods.email.password || authMethods.username.password));

  const hasPasswordless =
    (eq(defaultMethod, 'phone') && (authMethods.phone.otp || authMethods.phone.magicLink)) ||
    (eq(defaultMethod, 'email_or_username') && (authMethods.email.otp || authMethods.email.magicLink));

  const hasPasskey = authMethods.phone.passkey || authMethods.email.passkey || authMethods.username.passkey;

  const onChangePasswordlessExperience = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setForcePasswordless(checked);

    resetFormStates();
  };

  const onSubmitPasswordHandler = async (userPayload: PassflowSignInPayload) => {
    const status = await fetch(userPayload, 'password');

    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
    }
  };

  const onSubmitPasskeyHandler = async (passkeyPayload: PassflowPasskeyAuthenticateStartPayload) => {
    const response = await fetch(passkeyPayload, 'passkey');

    if (response && typeof response === 'boolean') {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
    }

    const params = new URLSearchParams(window.location.search);
    const searchParamsState = {
      ...passkeyPayload,
      type: 'passkey',
      challenge_id: response as string,
      challenge_type: passkeyProvider?.validation,
      create_tenant: createTenant,
    };
    const newParams = queryString.stringify({
      ...params,
      ...searchParamsState,
    });

    if (response && eq(passkeyProvider?.validation, 'otp'))
      navigate({
        pathname: verifyOTPPath ?? routes.verify_otp.path,
        search: newParams.toString(),
      });
    if (response && eq(passkeyProvider?.validation, 'magic_link'))
      navigate({
        pathname: verifyMagicLinkPath ?? routes.verify_magic_link.path,
        search: newParams.toString(),
      });
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
      ...params,
      ...searchParamsState,
    });

    if (eq(currentChallegeType, 'otp') && (response satisfies PassflowPasswordlessResponse))
      navigate({
        pathname: verifyOTPPath ?? routes.verify_otp.path,
        search: newParams.toString(),
      });

    if (eq(currentChallegeType, 'magic_link') && (response satisfies PassflowPasswordlessResponse))
      navigate({
        pathname: verifyMagicLinkPath ?? routes.verify_magic_link.path,
        search: newParams.toString(),
      });
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
    let isValidated;
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
      redirect_url: successAuthRedirect,
    };

    await onSubmitHandler(payload, 'passkey');
  };

  const onClickProviderHandler = (provider: Providers) => federatedWithRedirect(provider);

  const labelStyle = cn('passflow-text-caption-1-medium passflow-text-Grey-Six passflow-normal-case', {
    'passflow-text-Warning': isError,
  });

  return (
    <Wrapper title='Sign In to your account' subtitle='To Passflow by Madappgang'>
      {hasPasskey && (hasPasswordless || hasPassword) && (
        <div className='passflow-w-full passflow-flex passflow-items-center passflow-justify-center passflow-mb-[-8px]'>
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
        className='passflow-flex passflow-flex-col passflow-gap-[32px] passflow-max-w-[384px] passflow-w-full'
      >
        {!forcePasswordless && defaultMethod ? (
          <>
            <div className='passflow-p-[24px] passflow-rounded-[6px] passflow-max-w-[384px] passflow-w-full passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[24px] passflow-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]'>
              {eq(defaultMethod, 'email_or_username') && (
                <div className='passflow-w-full passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[6px]'>
                  <div className='passflow-w-full passflow-flex passflow-items-center passflow-justify-between'>
                    <label
                      htmlFor='identity'
                      className={cn(labelStyle, { 'passflow-text-Warning': isError || has(errors, 'email_or_username') })}
                    >
                      {getIdentityLabel(authMethods, 'label')}
                    </label>
                    {authMethods.hasSignInPhoneMethods && (
                      <Button
                        size='small'
                        variant='clean'
                        type='button'
                        className={`passflow-text-Primary passflow-text-caption-1-medium
                                      passflow-h-max passflow-max-w-max passflow-p-0`}
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
                    <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px] passflow-mt-[4px]'>
                      <Icon size='small' id='warning' type='general' className='icon-warning' />
                      <span className='passflow-text-caption-1-medium passflow-text-Warning'>
                        {errors.email_or_username?.message}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {eq(defaultMethod, 'phone') && (
                <div className='passflow-w-full passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[6px]'>
                  <div className='passflow-w-full passflow-flex passflow-items-center passflow-justify-between'>
                    <label
                      htmlFor='phone'
                      className={cn(labelStyle, { 'passflow-text-Warning': isError || has(errors, 'phone') })}
                    >
                      Phone number
                    </label>
                    {(authMethods.hasSignInEmailMethods || authMethods.hasSignInUsernameMethods) && (
                      <Button
                        size='small'
                        variant='clean'
                        type='button'
                        className={`passflow-text-Primary passflow-text-caption-1-medium
                                    passflow-h-max passflow-max-w-max passflow-p-0`}
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
                    <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px] passflow-mt-[4px]'>
                      <Icon size='small' id='warning' type='general' className='icon-warning' />
                      <span className='passflow-text-caption-1-medium passflow-text-Warning'>{errors.phone?.message}</span>
                    </div>
                  )}
                </div>
              )}
              {hasPassword ? (
                <div className='passflow-w-full passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[6px]'>
                  <div className='passflow-w-full passflow-flex passflow-items-center passflow-justify-between'>
                    <label
                      htmlFor='password'
                      className={cn(labelStyle, { 'passflow-text-Warning': isError || has(errors, 'password') })}
                    >
                      Password
                    </label>
                    <Link
                      to={{
                        pathname: forgotPasswordPath ?? routes.forgot_password.path,
                        search: queryString.stringify({ default_method: defaultMethod }),
                      }}
                      className='passflow-text-Primary passflow-text-caption-1-medium'
                    >
                      Forgot password
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
                    <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px] passflow-mt-[4px]'>
                      <Icon size='small' id='warning' type='general' className='icon-warning' />
                      <span className='passflow-text-caption-1-medium passflow-text-Warning'>{errors.password?.message}</span>
                    </div>
                  )}
                </div>
              ) : null}
              {isError && (
                <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px]'>
                  <Icon size='small' id='warning' type='general' className='icon-warning' />
                  <span className='passflow-text-caption-1-medium passflow-text-Warning'>{error}</span>
                </div>
              )}
            </div>
            {hasPassword ? (
              <Button
                size='big'
                variant='primary'
                type='submit'
                disabled={!isDirty || !isValid || isLoading}
                className='passflow-mx-auto passflow-text-body-2-semibold passflow-text-White !passflow-shadow-primary'
              >
                Sign In
              </Button>
            ) : null}
            {hasPasswordless && (
              <Button
                size='big'
                variant={hasPassword ? 'outlined' : 'primary'}
                type={hasPassword ? 'button' : 'submit'}
                className={cn('passflow-m-auto passflow-text-White passflow-text-body-2-semiBold', {
                  'passflow-border passflow-border-Primary !passflow-text-Primary passflow-bg-transparent !passflow-text-body-2-medium !passflow-mt-[-16px]':
                    hasPassword,
                })}
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
                className={cn('passflow-m-auto', {
                  '!passflow-mt-[-16px]': hasPassword || hasPasswordless,
                })}
                withIcon
                onClick={validateSignInPasskey}
              >
                <Icon id='key' size='small' type='general' className='icon-white' />
                Sign In with a Passkey
              </Button>
            ) : null}
          </>
        ) : null}
        {forcePasswordless && hasPasskey ? (
          <>
            {isError && (
              <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px] passflow-max-w-[336px] passflow-w-full passflow-mx-auto'>
                <Icon size='small' id='warning' type='general' className='icon-warning' />
                <span className='passflow-text-caption-1-medium passflow-text-Warning'>{error}</span>
              </div>
            )}
            <Button
              size='big'
              variant='dark'
              type='button'
              className='passflow-m-auto'
              withIcon
              onClick={validateSignInPasskey}
            >
              <Icon id='key' size='small' type='general' className='icon-white' />
              Sign In with a Passkey
            </Button>
          </>
        ) : null}
        <div
          className={cn(
            'passflow-mx-auto passflow-max-w-[336px] passflow-w-full passflow-flex passflow-items-center passflow-justify-center',
            {
              '!passflow-mt-[-8px]': hasPassword || hasPasskey,
            },
          )}
        >
          <p className='passflow-text-Grey-Six passflow-text-body-2-medium passflow-text-center'>
            Don&apos;t have an account?{' '}
            <Link to={signUpPath ?? routes.signup.path} className='passflow-text-Primary passflow-text-body-2-semiBold'>
              Sign Up
            </Link>
          </p>
        </div>
        {size(authMethods.providers) > 0 && (
          <div className='passflow-mx-auto passflow-max-w-[336px] passflow-w-full passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[24px]'>
            {hasPassword || hasPasswordless || hasPasskey ? (
              <div className='passflow-w-full passflow-py-[9px] passflow-relative'>
                <div className='passflow-w-full passflow-h-[1px] passflow-bg-Grey-Four' />
                <span className='passflow-absolute passflow-top-1/2 -passflow-translate-y-1/2 passflow-left-1/2 -passflow-translate-x-1/2 passflow-px-[15px] passflow-text-Grey-Six passflow-text-caption-1-medium passflow-bg-White'>
                  Or continue with
                </span>
              </div>
            ) : null}
            <ProvidersBox providers={authMethods.providers} onClick={onClickProviderHandler} />
          </div>
        )}
      </form>
    </Wrapper>
  );
};

export const SignIn = withError(SignInForm, ErrorComponent);
