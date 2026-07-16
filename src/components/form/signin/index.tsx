import { ErrorComponent } from '@/components/error';
import { readParentChallengeIdFromURL } from '@/components/provider/passflow-provider';
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
  useUrlParams,
} from '@/utils';
import type {
  PassflowPasskeyAuthenticateStartPayload,
  PassflowPasswordlessResponse,
  PassflowPasswordlessSignInPayload,
  PassflowSignInPayload,
  Providers,
} from '@passflow/core';
import { eq, has, isEmpty, size } from 'lodash';
import { phone } from 'phone';
import queryString from 'query-string';
import React, { type ChangeEvent, type FC, type ReactNode, useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';

const initialValues = {
  password: '',
  email_or_username: '',
  phone: '',
};

/**
 * Device-approval integration for the RFC 8628 verification page.
 *
 * When present, SignInForm renders its ORDINARY login card — same logo, fields,
 * black passkey button and layout — but its credential submit does NOT issue
 * tokens or redirect. Instead it hands the verified intent to the device flow's
 * authenticate → approve back-channel (`useDeviceVerify`), which keeps the
 * §5.4 split the device grant depends on. Providers, passwordless and the
 * sign-up link are hidden: the device back-channel supports only password +
 * passkey, so offering anything else would be a dead control on this surface.
 *
 * This is the single additive seam that lets the device page BE the login page
 * rather than a copy of it.
 */
export type SignInDeviceApprove = {
  /** Prove identity with a password. Does NOT redirect. */
  onPassword: (email: string, password: string) => void;
  /** Prove identity with a passkey. Does NOT redirect. */
  onPasskey: () => void;
  /** Busy state, owned by the device hook (a call is in flight). */
  busy?: boolean;
  /** The device flow's classified, human-facing error, if any. */
  error?: string | null;
  /** Label for the primary password button ('Approve' for consent, 'Sign In' for full login). */
  primaryLabel: string;
  /** testid for the primary password button (e.g. the §5.4 `device-confirm` control). */
  primaryTestId?: string;
  /** Extra controls rendered inside the card after the form (e.g. a separate Approve). */
  afterForm?: ReactNode;
};

export type TSignIn = {
  successAuthRedirect?: SuccessAuthRedirect;
  relyingPartyId?: string;
  federatedDisplayMode?: 'modal' | 'redirect';
  signUpPath?: string;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
  forgotPasswordPath?: string;
  twoFactorVerifyPath?: string;
  /** A node rendered above the form, inside the same card (e.g. the device banner). */
  header?: ReactNode;
  /** When set, SignInForm drives the RFC 8628 device approval flow — see the type. */
  deviceApprove?: SignInDeviceApprove;
};

export const SignInForm: FC<TSignIn> = ({
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  signUpPath = routes.signup.path,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
  forgotPasswordPath = routes.forgot_password.path,
  twoFactorVerifyPath = routes.two_factor_verify.path,
  header,
  deviceApprove,
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
  const {
    appSettings,
    scopes,
    createTenantForNewUser,
    passwordPolicy,
    currentStyles,
    isError: isErrorApp,
    error: errorApp,
    loginAppTheme,
  } = useAppSettings();
  const { federatedWithRedirect } = useProvider(successAuthRedirect, createTenantForNewUser);

  if (isErrorApp) throw new Error(errorApp);

  const authMethods = useMemo(() => getAuthMethods(appSettings?.auth_strategies), [appSettings]);

  const { error: errorUrl, message: messageUrl } = getUrlErrors();

  if (errorUrl && messageUrl) throw new Error(messageUrl);

  const { get } = useUrlParams({
    invite_token: '',
  });

  const inviteToken = get('invite_token');

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

  // ── Device-approval mode (RFC 8628 verification page) ──────────────────────
  // When `deviceApprove` is set the card renders identically to the login but
  // its state and submit are the device flow's, not useSignIn's.
  const deviceMode = !!deviceApprove;
  const displayError = deviceMode ? (deviceApprove?.error ?? null) : error;
  const displayIsError = deviceMode ? Boolean(deviceApprove?.error) : isError;
  const submitting = deviceMode ? Boolean(deviceApprove?.busy) : isLoading;
  // No passwordless transport exists on the device page, so always show the
  // identifier + method surface — never the passkey-only forced view.
  const effectiveForcePasswordless = deviceMode ? false : forcePasswordless;

  const onChangePasswordlessExperience = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setForcePasswordless(checked);

    resetFormStates();
  };

  // The OIDC AuthFlow layer (PassflowProvider's interceptor) consumes
  // logins that carry parent_challenge_id via the server's redirect_url
  // dispatch, so OIDC flows never reach the legacy redirect branches
  // below. Reaching one anyway means the interceptor did not engage and
  // the RP callback will never happen — say so loudly instead of
  // silently issuing first-party tokens (observed intermittently in
  // OIDF conformance runs, where the operator was stranded on the
  // login page with no error).
  const warnIfOIDCFlowLeaked = () => {
    if (readParentChallengeIdFromURL()) {
      console.error(
        '[passflow] login took the legacy token path while parent_challenge_id is present on the URL — the OIDC interceptor did not engage and the RP redirect will not happen',
      );
    }
  };

  const onSubmitPasswordHandler = async (userPayload: PassflowSignInPayload) => {
    const payload = {
      ...userPayload,
      ...(!isEmpty(inviteToken) && { invite_token: inviteToken }),
    } as PassflowSignInPayload;

    const status = await fetch(payload, 'password');

    if (status) {
      // Check if 2FA verification is required
      if (passflow.isTwoFactorVerificationRequired()) {
        navigate({ to: twoFactorVerifyPath ?? routes.two_factor_verify.path });
        return;
      }
      warnIfOIDCFlowLeaked();
      const redirectUrl = successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
      if (!isValidUrl(redirectUrl)) navigate({ to: redirectUrl });
      else window.location.href = await getUrlWithTokens(passflow, redirectUrl);
    }
  };

  const onSubmitPasskeyHandler = async (passkeyPayload: PassflowPasskeyAuthenticateStartPayload) => {
    const payload = {
      ...passkeyPayload,
      ...(!isEmpty(inviteToken) && { invite_token: inviteToken }),
    } as PassflowPasskeyAuthenticateStartPayload;

    const response = await fetch(payload, 'passkey');

    if (response) {
      // Check if 2FA verification is required
      if (passflow.isTwoFactorVerificationRequired()) {
        navigate({ to: twoFactorVerifyPath ?? routes.two_factor_verify.path });
        return;
      }
      warnIfOIDCFlowLeaked();
      const redirectUrl = successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
      if (!isValidUrl(redirectUrl)) navigate({ to: redirectUrl });
      else window.location.href = await getUrlWithTokens(passflow, redirectUrl);
    }
  };

  const onSubmitPasswordlessHandler = async (userPayload: Partial<PassflowPasswordlessSignInPayload>) => {
    const currentChallegeType = getPasswordlessData(authMethods, defaultMethod)?.challengeType;

    const payload = {
      ...userPayload,
      challenge_type: getPasswordlessData(authMethods, defaultMethod)?.challengeType,
      create_tenant: createTenantForNewUser,
      redirect_url: successAuthRedirect ?? appSettings?.defaults?.redirect,
      ...(!isEmpty(inviteToken) && { invite_token: inviteToken }),
    } as PassflowPasswordlessSignInPayload;

    const response = (await fetch(payload, 'passwordless')) as PassflowPasswordlessResponse;

    const params = new URLSearchParams(window.location.search);
    const searchParamsState = {
      ...payload,
      ...response,
      type: 'passwordless',
      challenge_type: currentChallegeType,
      create_tenant: createTenantForNewUser,
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
        scopes,
      };

      await onSubmitHandler(payload, 'passwordless');
    }
  };

  const validateSingIn = async () => {
    const values = getValues();

    // Device mode: hand the credentials to the verification flow's
    // authenticate → approve back-channel; issue NO tokens here.
    if (deviceApprove) {
      deviceApprove.onPassword(values.email_or_username, values.password);
      return;
    }

    const isEmail = values.email_or_username.match(emailRegex);
    const isUsername = !isEmail && size(values.email_or_username) > 0;
    const validatedPhone = phone(values.phone);
    const isPhone = validatedPhone.isValid;

    const payload = {
      ...(isEmail && { email: values.email_or_username }),
      ...(isUsername && { username: values.email_or_username }),
      ...(isPhone && { phone: validatedPhone.phoneNumber }),
      scopes,
      password: values.password,
    };

    await onSubmitHandler(payload, 'password');
  };

  const validateSignInPasskey = async () => {
    // Device mode: reuse the login's passkey action, routed to the device
    // ceremony instead of the token path.
    if (deviceApprove) {
      deviceApprove.onPasskey();
      return;
    }

    const payload = {
      relying_party_id: relyingPartyId,
      scopes,
    };

    await onSubmitHandler(payload, 'passkey');
  };

  const onClickProviderHandler = (provider: Providers) => federatedWithRedirect(provider, inviteToken ?? undefined);

  return (
    <Wrapper
      title='Sign In to your account'
      subtitle='To Passflow by Madappgang'
      className='passflow-signin-wrapper'
      customCss={currentStyles?.custom_css}
      customLogo={currentStyles?.logo_url}
      removeBranding={loginAppTheme?.remove_passflow_logo}
      header={header}
    >
      {!deviceMode && hasPasskey && (hasPasswordless || hasPassword) && (
        <div className='passflow-form-switch'>
          <Switch label='Passwordless experience' checked={forcePasswordless} onChange={onChangePasswordlessExperience} />
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!effectiveForcePasswordless) {
            if (hasPassword) void validateSingIn();
            if (!hasPassword && hasPasswordless) void validateSignInPasswordless();
          }
        }}
        className='passflow-form'
      >
        {!effectiveForcePasswordless && defaultMethod ? (
          <>
            <div className='passflow-form-container'>
              {eq(defaultMethod, 'email_or_username') && (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='email_or_username'
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': displayIsError || has(errors, 'email_or_username'),
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
                        isError={displayIsError || has(errors, 'email_or_username')}
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
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': displayIsError || has(errors, 'phone'),
                      })}
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
                        isError={displayIsError || has(errors, 'phone')}
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
                        'passflow-field-label--error': displayIsError || has(errors, 'password'),
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
                        isError={displayIsError || has(errors, 'password')}
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
              {displayIsError && (
                <div className='passflow-form-error'>
                  <Icon size='small' id='warning' type='general' className='icon-warning' />
                  <span className='passflow-form-error-text'>{displayError}</span>
                </div>
              )}
            </div>
            {hasPassword ? (
              <Button
                size='big'
                variant='primary'
                type='submit'
                disabled={deviceMode ? submitting : !isDirty || !isValid || isLoading}
                className='passflow-button-signin'
                data-testid={deviceApprove?.primaryTestId}
              >
                {deviceApprove ? deviceApprove.primaryLabel : 'Sign In'}
              </Button>
            ) : null}
            {!deviceMode && hasPasswordless && (
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
                disabled={deviceMode ? submitting : false}
                onClick={validateSignInPasskey}
              >
                <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
                Sign In with a Passkey
              </Button>
            ) : null}
            {deviceApprove?.afterForm}
          </>
        ) : null}
        {effectiveForcePasswordless && hasPasskey ? (
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
        {!deviceMode && (
          <div className={cn('passflow-form-actions', { 'passflow-form-actions--top-space': hasPassword || hasPasskey })}>
            <p className='passflow-dont-have-account'>
              Don&apos;t have an account?{' '}
              <Link to={signUpPath ?? routes.signup.path} search={window.location.search} className='passflow-link'>
                Sign Up
              </Link>
            </p>
          </div>
        )}
        {!deviceMode && size(authMethods.fim.providers) > 0 && (
          <div className='passflow-form-providers'>
            {hasPassword || hasPasswordless || hasPasskey ? (
              <div className='passflow-form-divider'>
                <div className='passflow-form-divider__line-left' />
                <span className='passflow-form-divider__text'>Or continue with</span>
                <div className='passflow-form-divider__line-right' />
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
