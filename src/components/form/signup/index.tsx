import { Button, FieldPassword, FieldPhone, FieldText, Icon, Link, ProvidersBox, Switch } from '@/components/ui';
import { routes } from '@/context';
import { useAppSettings, useNavigation, usePassflow, useProvider, useSignUp } from '@/hooks';
import {
  cn,
  emailRegex,
  getAuthMethods,
  getIdentityLabel,
  getPasswordlessData,
  getUrlErrors,
  getUrlWithTokens,
  getValidationErrorsLabel,
  isValidUrl,
  passwordValidation,
  useUrlParams,
} from '@/utils';
import type {
  PassflowPasskeyRegisterStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignUpPayload,
  PassflowUserPayload,
  Providers,
} from '@passflow/passflow-js-sdk';
import { eq, has, isEmpty, size } from 'lodash';
import { phone } from 'phone';
import queryString from 'query-string';
import React, { type ChangeEvent, type FC, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';
import { ErrorComponent } from '@/components/error';
import { withError } from '@/hocs';
import type { DefaultMethod, SuccessAuthRedirect } from '@/types';

const initialValues = {
  passkeyEmail: '',
  passkeyPhone: '',
  passkeyUsername: '',
  email_or_username: '',
  phone: '',
  password: '',
};

export type TSignUp = {
  successAuthRedirect: SuccessAuthRedirect;
  relyingPartyId?: string;
  federatedCallbackUrl?: string;
  createTenant?: boolean;
  federatedDisplayMode?: 'modal' | 'redirect';
  signInPath?: string;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
};

export const SignUpForm: FC<TSignUp> = ({
  federatedCallbackUrl = window.location.origin,
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  createTenant = false,
  signInPath = routes.signin.path,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
}) => {
  const {
    getValues,
    control,
    trigger,
    register,
    formState: { errors, isDirty, isValid },
    clearErrors,
    reset: resetForm,
    setError,
  } = useForm({
    defaultValues: initialValues,
  });
  const passflow = usePassflow();
  const { navigate } = useNavigation();
  const { appSettings, passwordPolicy, isError: isErrorApp, error: errorApp } = useAppSettings();

  if (isErrorApp) throw new Error(errorApp);

  const { federatedWithRedirect } = useProvider(federatedCallbackUrl);

  const authMethods = useMemo(() => getAuthMethods(appSettings?.auth_strategies), [appSettings]);

  const { error: errorUrl, message: messageUrl } = getUrlErrors();

  if (errorUrl && messageUrl) throw new Error(messageUrl);

  const { get } = useUrlParams({
    invite_token: '',
  });

  const inviteToken = get('invite_token');

  const { fetch, isError, error, reset, isLoading } = useSignUp();

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

  const onSubmitPasswordHandler = async (userPayload: PassflowUserPayload) => {
    const payload = {
      user: userPayload,
      create_tenant: createTenant,
      ...(!isEmpty(inviteToken) && { invite: inviteToken }),
    } as PassflowSignUpPayload;

    const status = await fetch(payload, 'password');

    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate({ to: successAuthRedirect });
      else window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
    }
  };

  const onSubmitPasskeyHandler = async () => {
    const payload = {
      relying_party_id: relyingPartyId,
      create_tenant: createTenant,
      redirect_url: successAuthRedirect,
      ...(!isEmpty(inviteToken) && { invite: inviteToken }),
    } as PassflowPasskeyRegisterStartPayload;

    const response = await fetch(payload, 'passkey');

    if (response) {
      if (!isValidUrl(successAuthRedirect)) navigate({ to: successAuthRedirect });
      else window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
    }
  };

  const onSubmitPasswordlessHandler = async (userPayload: Partial<PassflowPasswordlessSignInPayload>) => {
    const currentChallegeType = getPasswordlessData(authMethods, defaultMethod)?.challengeType;

    const payload = {
      ...userPayload,
      challenge_type: currentChallegeType,
      create_tenant: createTenant,
      redirect_url: successAuthRedirect,
      ...(!isEmpty(inviteToken) && { invite: inviteToken }),
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

  const onSubmitHandler = async (data: Partial<typeof initialValues>, type: 'passkey' | 'password' | 'passwordless') => {
    if (eq(type, 'password')) await onSubmitPasswordHandler(data as PassflowUserPayload);
    // if (eq(type, 'passkey')) await onSubmitPasskeyHandler();
    if (eq(type, 'passwordless')) await onSubmitPasswordlessHandler(data as PassflowPasswordlessSignInPayload);
  };

  const validateSignUpPasswordless = async () => {
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

  const validateSignUpPasskey = async () => onSubmitPasskeyHandler();

  const validateSingUp = async () => {
    const values = getValues();
    const isEmail = values.email_or_username.match(emailRegex);
    const isUsername = !isEmail && size(values.email_or_username) > 0;
    const validatedPhone = phone(values.phone);
    const isPhone = validatedPhone.isValid;

    const payload = {
      ...(isEmail && { email: values.email_or_username }),
      ...(isUsername && { username: values.email_or_username }),
      ...(isPhone && { phone_number: validatedPhone.phoneNumber }),
      password: values.password,
    };

    await onSubmitHandler(payload, 'password');
  };

  const handlePasswordChange = async () => {
    await trigger(['password']);
  };

  const onClickProviderHandler = (provider: Providers) => federatedWithRedirect(provider);

  const labelStyle = cn('passflow-text-caption-1-medium passflow-text-Grey-Six passflow-normal-case', {
    'passflow-text-Warning': isError,
  });

  return (
    <Wrapper title='Create account to sign up' subtitle='For Passflow by Madappgang'>
      {hasPasskey && (hasPasswordless || hasPassword) && (
        <div className='passflow-w-full passflow-flex passflow-items-center passflow-justify-center passflow-mb-[-8px]'>
          <Switch label='Passwordless experience' checked={forcePasswordless} onChange={onChangePasswordlessExperience} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!forcePasswordless) {
            if (hasPassword) void validateSingUp();
            if (!hasPassword && hasPasswordless) void validateSignUpPasswordless();
          }
          if (forcePasswordless && hasPasskey) void validateSignUpPasskey();
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
                    {authMethods.hasPhoneMethods && (
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
                    rules={{
                      required: getValidationErrorsLabel(authMethods),
                      ...(authMethods.hasEmailMethods && !authMethods.hasUsernameMethods
                        ? {
                            pattern: {
                              value: emailRegex,
                              message: 'Invalid email',
                            },
                          }
                        : undefined),
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
                    {(authMethods.hasEmailMethods || authMethods.hasUsernameMethods) && (
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
                    <label htmlFor='password' className={cn(labelStyle, { 'passflow-text-Warning': isError })}>
                      Password
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
                onClick={validateSingUp}
                disabled={!isDirty || !isValid || isLoading}
                className='passflow-mx-auto passflow-text-body-2-semibold passflow-text-White !passflow-shadow-primary'
              >
                Sign Up
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
                onClick={() => (hasPassword ? validateSignUpPasswordless() : null)}
                disabled={(() => {
                  const values = getValues();
                  if (size(values[defaultMethod]) === 0) return true;
                  return false;
                })()}
              >
                Sign Up with {getPasswordlessData(authMethods, defaultMethod)?.label}
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
                onClick={validateSignUpPasskey}
              >
                <Icon id='key' size='small' type='general' className='icon-white' />
                Sign Up with a Passkey
              </Button>
            ) : null}
          </>
        ) : null}
        {forcePasswordless && hasPasskey ? (
          <>
            <Button size='big' variant='dark' type='submit' className='passflow-m-auto' withIcon>
              <Icon id='key' size='small' type='general' className='icon-white' />
              Sign Up with a Passkey
            </Button>
            {isError && (
              <div className='passflow-flex passflow-items-center passflow-justify-center passflow-gap-[4px] passflow-mt-[-8px]'>
                <Icon size='small' id='warning' type='general' className='icon-warning' />
                <span className='passflow-text-caption-1-medium passflow-text-Warning'>{error}</span>
              </div>
            )}
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
            Already have an account?{' '}
            <Link 
              to={signInPath ?? routes.signin.path} 
              search={window.location.search}
              className='passflow-text-Primary passflow-text-body-2-semiBold'
            >
              Sign In
            </Link>
          </p>
        </div>
        {size(authMethods.fim.providers) > 0 && (
          <div className='passflow-mx-auto passflow-max-w-[336px] passflow-w-full passflow-flex passflow-flex-col passflow-items-start passflow-justify-start passflow-gap-[24px]'>
            {hasPassword || hasPasswordless || hasPasskey ? (
              <div className='passflow-w-full passflow-py-[9px] passflow-relative'>
                <div className='passflow-w-full passflow-h-[1px] passflow-bg-Grey-Four' />
                <span className='passflow-absolute passflow-top-1/2 -passflow-translate-y-1/2 passflow-left-1/2 -passflow-translate-x-1/2 passflow-px-[15px] passflow-text-Grey-Six passflow-text-caption-1-medium passflow-bg-White'>
                  Or continue with
                </span>
              </div>
            ) : null}
            <ProvidersBox providers={authMethods.fim.providers} onClick={onClickProviderHandler} />
          </div>
        )}
      </form>
    </Wrapper>
  );
};

export const SignUp = withError(SignUpForm, ErrorComponent);
