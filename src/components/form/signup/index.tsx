/* eslint-disable complexity */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC, useLayoutEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Form, Formik, FormikErrors, FormikHandlers, FormikState } from 'formik';
import { AoothPasswordlessSignInPayload, ChallengeType, Providers } from '@aooth/aooth-sdk-js';
import { find, get, includes, size, some } from 'lodash';
import { Button, FieldPassword, FieldPhone, FieldText, Icon, Link, ProvidersBox, Switch } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useAppSettings, useProvider, useSignUp } from '@/hooks';
import { cn, emailRegex, getUrlWithTokens, isValidUrl, phoneNumberRegex, validationSingUpSchemas } from '@/utils';
import { routes } from '@/context';
import '@/styles/index.css';
import { PreferIdentity, SuccessAuthRedirect } from '@/types';
import { concatScopes, defaultScopes } from '@/constants';
import { Error as ErrorComponent } from '@/components/error';
import { withError } from '@/hocs';
import { PasskeyForm } from '../passkey-form';

const initialValues = (state: { identity: PreferIdentity; itentityValue: string }) => {
  const values = {
    password: '',
    identity: '',
    phone: '',
  };
  if (state) {
    const { identity, itentityValue } = state;
    if (identity && itentityValue) return { ...values, [identity]: itentityValue };
  }
  return values;
};

export type TSignUp = {
  successAuthRedirect: SuccessAuthRedirect;
  relyingPartyId?: string;
  federatedCallbackUrl?: string;
  scopes?: string[];
  createTenant?: boolean;
  federatedDisplayMode?: 'modal' | 'redirect';
  signInPath?: string;
  verifyOTPPath?: string;
  verifyMagicLinkPath?: string;
};

const generateIdentityLabel = (identities: string[], useString: boolean): string => {
  if (includes(identities, 'username') && includes(identities, 'email'))
    return useString ? 'Use email or username' : 'Email or username';
  if (includes(identities, 'email')) return useString ? 'Use email' : 'Email';
  if (includes(identities, 'username')) return useString ? 'Use username' : 'Username';
  return '';
};

export const SignUpForm: FC<TSignUp> = ({
  federatedCallbackUrl = window.location.origin,
  scopes = defaultScopes,
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  createTenant,
  federatedDisplayMode,
  signInPath,
  verifyOTPPath,
  verifyMagicLinkPath,
}) => {
  const { fetch, isError, error, reset, isLoading } = useSignUp();
  const { federatedWithRedirect, federatedWithPopup } = useProvider(federatedCallbackUrl, concatScopes(scopes));
  const { appSettings, passwordPolicy, passkeyProvider } = useAppSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const identityState = location.state as {
    identity: PreferIdentity;
    itentityValue: string;
  };
  const [validationSchema, setValidationSchema] = useState<ReturnType<typeof validationSingUpSchemas> | null>(null);

  const [passwordlessExperience, setPasswordlessExperience] = useState<boolean>(false);
  const [currentIdentityField, setCurrentIdentityField] = useState<PreferIdentity>('none');
  const [hasPassword, setHasPassword] = useState<boolean>(false);
  const [hasMainChallenges, setHasMainChallenges] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (appSettings) {
      const { IDENTITY_FIELDS, INTERNAL } = appSettings;
      let preferredIdentity = 'none' as PreferIdentity;
      const checkHasMainChallenges = some(['email', 'phone', 'username'], (challenge) => includes(IDENTITY_FIELDS, challenge));
      if (some(['email', 'username'], (identity) => includes(IDENTITY_FIELDS, identity)) && checkHasMainChallenges)
        preferredIdentity = 'identity';
      else if (includes(IDENTITY_FIELDS, 'phone') && checkHasMainChallenges) preferredIdentity = 'phone';
      else preferredIdentity = 'none';
      const identityField = preferredIdentity === 'identity' ? ['email', 'username'] : ['phone'];
      const identityHasPassword = identityField.find((idField: string) => find(INTERNAL[idField], { challenge: 'password' }));
      if (identityHasPassword) setHasPassword(true);
      else setHasPassword(false);
      if (
        includes(appSettings.CHALLENGES, 'passkey') &&
        some(['email', 'username', 'phone'], (identity) => includes(appSettings.IDENTITY_FIELDS, identity))
      )
        setPasswordlessExperience(true);
      const schema = validationSingUpSchemas(
        {
          identity: preferredIdentity,
          challenge: identityHasPassword ? 'password' : 'none',
        },
        passwordPolicy,
      );
      setHasMainChallenges(checkHasMainChallenges);
      setCurrentIdentityField(preferredIdentity);
      setValidationSchema(schema);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appSettings]);

  const onSubmitHanlder = async (values: ReturnType<typeof initialValues>) => {
    const { identity, phone, password } = values;
    const isEmail = identity.match(emailRegex);
    const isPhone = phone.match(phoneNumberRegex);
    const userPayload = {
      password,
      ...(isEmail ? { email: identity, username: '' } : { email: '', username: identity }),
      ...(isPhone && size(phone) > 0 && { phone_number: phone }),
    };
    const payload = {
      scopes: concatScopes(scopes),
      user: userPayload,
      create_tenant: createTenant,
    };
    const status = await fetch(payload, 'password');
    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = getUrlWithTokens(successAuthRedirect);
    }
  };

  const onSubmitPasskeyHandler = async (values: Omit<ReturnType<typeof initialValues>, 'password'>) => {
    const { identity, phone } = values;
    const isEmail = identity.match(emailRegex);
    const isPhone = phone.match(phoneNumberRegex);
    const payload = {
      ...(isEmail && size(identity) > 0 && { email: identity }),
      ...(!isEmail && size(identity) > 0 && { username: identity }),
      ...(isPhone && size(phone) > 0 && { phone }),
      ...(!isEmail && !isPhone && size(identity) === 0 && size(phone) === 0 && { user_id: '' }),
      scopes: concatScopes(scopes),
      relying_party_id: relyingPartyId,
      create_tenant: createTenant,
    };
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const status = await fetch(payload, 'passkey');
    if (status && passkeyProvider?.validation === 'none') {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = getUrlWithTokens(successAuthRedirect);
    }

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.append('chId', status as string);

    if (get(passkeyProvider, 'validation', false) === 'otp' && status)
      navigate(
        { pathname: verifyOTPPath ?? routes.verify_otp.path, search: searchParams.toString() },
        {
          state: {
            // eslint-disable-next-line no-nested-ternary
            identity: isEmail ? 'email' : isPhone ? 'phone' : 'username',
            identityValue: identity ?? phone,
            passwordlessPayload: payload,
            type: 'passkey',
          },
        },
      );
    if (get(passkeyProvider, 'validation', false) === 'magic_link' && status)
      navigate(
        { pathname: verifyMagicLinkPath ?? routes.verify_magic_link.path, search: searchParams.toString() },
        {
          state: {
            // eslint-disable-next-line no-nested-ternary
            identity: isEmail ? 'email' : isPhone ? 'phone' : 'username',
            identityValue: identity ?? phone,
            passwordlessPayload: payload,
          },
        },
      );
  };

  const onSubmitPasswordlessHandler =
    (field: keyof Pick<AoothPasswordlessSignInPayload, 'email' | 'phone'>, value: string, type: ChallengeType) => async () => {
      const payload = {
        scopes: concatScopes(scopes),
        create_tenant: createTenant,
        challenge_type: type,
        ...(field === 'email' ? { email: value } : { phone: value }),
      };

      const status = await fetch(payload, 'passwordless');

      if (type === 'otp' && status)
        navigate(
          { pathname: verifyOTPPath ?? routes.verify_otp.path, search: window.location.search },
          {
            state: {
              identity: field,
              identityValue: value,
              passwordlessPayload: payload,
              type: 'passwordless',
            },
          },
        );
      if (type === 'magic_link' && status)
        navigate(
          { pathname: verifyMagicLinkPath ?? routes.verify_magic_link.path, search: window.location.search },
          {
            state: {
              identity: field,
              identityValue: value,
              passwordlessPayload: payload,
              type: 'passwordless',
            },
          },
        );
    };

  const onSwitchFieldHandler = (
    field: PreferIdentity,
    validateForm: (values: typeof initialValues) => Promise<FormikErrors<typeof initialValues>>,
    resetForm: (nextState?: Partial<FormikState<ReturnType<typeof initialValues>>>) => void,
  ) => {
    const identityField = field === 'identity' ? ['email', 'username'] : ['phone'];
    if (appSettings) {
      const { INTERNAL } = appSettings;
      const fieldHasPassword = identityField.find((idField: string) => find(INTERNAL[idField], { challenge: 'password' }));
      if (fieldHasPassword) setHasPassword(true);
      else setHasPassword(false);
      const schema = validationSingUpSchemas(
        {
          identity: field,
          challenge: fieldHasPassword ? 'password' : 'none',
        },
        passwordPolicy,
      );

      setCurrentIdentityField(field);
      setValidationSchema(schema);
      void validateForm(initialValues);
      resetForm();
      reset();
    }
  };

  const onCustomChangeHandler = (handleChange: FormikHandlers['handleChange']) => (e: ChangeEvent<HTMLInputElement>) => {
    handleChange(e);
    if (isError) {
      reset();
    }
  };

  const onClickProviderHandler = (provider: Providers) =>
    federatedDisplayMode === 'redirect' ? federatedWithRedirect(provider) : federatedWithPopup(provider);

  const passwordlessChallengeButton = (values: ReturnType<typeof initialValues>, isValid: boolean, dirty: boolean) => {
    if (!appSettings) return null;

    const { identity, phone } = values;

    const passwordlessStyle = cn('aooth-m-auto aooth-text-White aooth-text-body-2-semiBold', {
      'aooth-mb-[16px]': includes(appSettings.CHALLENGES, 'passkey'),
      'aooth-border-Primary !aooth-text-Primary !aooth-text-body-2-medium': hasPassword,
    });

    const { INTERNAL } = appSettings;
    const identityField = currentIdentityField === 'identity' ? 'email' : 'phone';

    const magicLink = find(INTERNAL[identityField], { challenge: 'magic_link' });
    const otp = find(INTERNAL[identityField], { challenge: 'otp' });

    if (otp) {
      const onClickHandler =
        identityField === 'email'
          ? onSubmitPasswordlessHandler('email', identity, 'otp')
          : onSubmitPasswordlessHandler('phone', phone, 'otp');
      return (
        <Button
          size='big'
          variant={hasPassword ? 'outlined' : 'primary'}
          type='button'
          className={passwordlessStyle}
          onClick={onClickHandler as () => void}
          disabled={!hasPassword ? !isValid || !dirty : false}
        >
          Sign Up with {identityField === 'email' ? 'email code' : 'SMS code'}
        </Button>
      );
    }

    if (magicLink) {
      const onClickHandler =
        identityField === 'email'
          ? onSubmitPasswordlessHandler('email', identity, 'magic_link')
          : onSubmitPasswordlessHandler('phone', phone, 'magic_link');
      return (
        <Button
          size='big'
          variant={hasPassword ? 'outlined' : 'primary'}
          type='button'
          className={passwordlessStyle}
          onClick={onClickHandler as () => void}
          disabled={!hasPassword ? !isValid || !dirty : false}
        >
          Sign Up with {identityField === 'email' ? 'link' : 'SMS link'}
        </Button>
      );
    }

    return null;
  };

  const onChangePasswordlessExperience = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setPasswordlessExperience(checked);
  };

  const labelStyle = cn('aooth-text-caption-1-medium aooth-text-Grey-One', {
    'aooth-text-Warning': isError,
  });

  if (isError && error && passwordlessExperience) throw new Error(error);

  if (appSettings) {
    return (
      <Wrapper title='Create account to sign up' subtitle='For Aooth by Madappgang'>
        {includes(appSettings.CHALLENGES, 'passkey') &&
          some(['email', 'username', 'phone'], (identity) => includes(appSettings.IDENTITY_FIELDS, identity)) && (
            <div className='aooth-w-full aooth-flex aooth-items-center aooth-justify-center aooth-mb-[-8px] aooth-mt-[32px]'>
              <Switch
                label='Passwordless experience'
                checked={passwordlessExperience}
                onChange={onChangePasswordlessExperience}
              />
            </div>
          )}
        {!passwordlessExperience ? (
          <Formik
            initialValues={initialValues(identityState)}
            validationSchema={validationSchema}
            onSubmit={onSubmitHanlder}
            enableReinitialize
            validateOnChange
          >
            {({ isValid, dirty, handleChange, handleBlur, values, setFieldValue, errors, validateForm, resetForm }) => (
              <>
                <Form className='aooth-flex aooth-flex-col aooth-gap-[32px] aooth-mt-[32px]'>
                  {hasMainChallenges && (
                    <>
                      <div
                        className={`aooth-flex aooth-flex-col aooth-gap-[24px] aooth-w-full aooth-p-[24px] 
                          aooth-rounded-[6px] aooth-shadow-[0_4px_15px_0_rgba(0,0,0,0.09)]`}
                      >
                        <div
                          className={`group aooth-relative aooth-flex aooth-flex-col aooth-items-start 
                          aooth-justify-center aooth-gap-[6px]`}
                        >
                          {includes(appSettings.IDENTITY_FIELDS, 'phone') && currentIdentityField === 'phone' && (
                            <>
                              <div className='aooth-w-full aooth-flex aooth-items-center aooth-justify-between'>
                                <label htmlFor='phone' className={labelStyle}>
                                  Use phone
                                </label>
                                {some(['email', 'username'], (identity) => includes(appSettings.IDENTITY_FIELDS, identity)) && (
                                  <Button
                                    size='small'
                                    variant='clean'
                                    type='button'
                                    className={`aooth-text-Primary aooth-text-caption-1-semiBold aooth-h-max 
                                      aooth-max-w-max aooth-p-0`}
                                    onClick={() => onSwitchFieldHandler('identity', validateForm, resetForm)}
                                  >
                                    {generateIdentityLabel(appSettings.IDENTITY_FIELDS, true)}
                                  </Button>
                                )}
                              </div>
                              <FieldPhone
                                id='phone'
                                name='phone'
                                isError={isError}
                                value={values.phone}
                                setValue={setFieldValue}
                                onChange={onCustomChangeHandler(handleChange)}
                                onBlur={handleBlur}
                              />
                            </>
                          )}
                          {some(['email', 'username'], (identity) => includes(appSettings.IDENTITY_FIELDS, identity)) &&
                            currentIdentityField === 'identity' && (
                              <>
                                <div className='aooth-w-full aooth-flex aooth-items-center aooth-justify-between'>
                                  <label htmlFor='identity' className={labelStyle}>
                                    {generateIdentityLabel(appSettings.IDENTITY_FIELDS, false)}
                                  </label>
                                  {includes(appSettings.IDENTITY_FIELDS, 'phone') && (
                                    <Button
                                      size='small'
                                      variant='clean'
                                      type='button'
                                      className={`aooth-text-Primary aooth-text-caption-1-semiBold aooth-h-max 
                                        aooth-max-w-max aooth-p-0`}
                                      onClick={() => onSwitchFieldHandler('phone', validateForm, resetForm)}
                                    >
                                      Use phone
                                    </Button>
                                  )}
                                </div>
                                <FieldText
                                  isError={isError}
                                  id='identity'
                                  type='text'
                                  name='identity'
                                  onChange={onCustomChangeHandler(handleChange)}
                                  onBlur={handleBlur}
                                />
                              </>
                            )}
                          {isError && (
                            <div className='aooth-flex aooth-items-center aooth-justify-center aooth-gap-[4px]'>
                              <Icon size='small' id='warning' type='general' className='icon-warning' />
                              <span className='aooth-text-caption-1-medium aooth-text-Warning'>{error}</span>
                            </div>
                          )}
                        </div>
                        {includes(appSettings.CHALLENGES, 'password') && hasPassword && (
                          <div
                            className={`group aooth-relative aooth-flex aooth-flex-col aooth-items-start aooth-justify-center 
                            aooth-gap-[6px]`}
                          >
                            <div className='aooth-w-full aooth-flex aooth-items-center aooth-justify-between'>
                              <label htmlFor='password' className={labelStyle}>
                                Password
                              </label>
                            </div>
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
                          </div>
                        )}
                      </div>
                      <div className='aooth-flex aooth-flex-col'>
                        {hasPassword && (
                          <Button
                            size='big'
                            variant='primary'
                            type='submit'
                            disabled={!isValid || !dirty || isLoading}
                            className={cn('aooth-m-auto', {
                              'aooth-mb-[16px]': some(['passkey', 'otp', 'magic_link'], (challenge) =>
                                includes(appSettings.CHALLENGES, challenge),
                              ),
                            })}
                          >
                            Sign Up
                          </Button>
                        )}
                        {passwordlessChallengeButton(values, isValid, dirty)}
                      </div>
                    </>
                  )}
                </Form>
                {includes(appSettings.CHALLENGES, 'passkey') && (
                  <Button
                    size='big'
                    variant='dark'
                    type='button'
                    className='aooth-m-auto'
                    withIcon
                    // eslint-disable-next-line no-void
                    onClick={() => void onSubmitPasskeyHandler(values)}
                  >
                    <Icon id='key' size='small' type='general' className='icon-white' />
                    Sign Up with a Passkey
                  </Button>
                )}
              </>
            )}
          </Formik>
        ) : (
          <PasskeyForm
            passkeySettings={passkeyProvider}
            successAuthRedirect={successAuthRedirect}
            createTenant={createTenant}
            relyingPartyId={relyingPartyId}
            scopes={scopes}
            verifyOTPPath={verifyOTPPath}
            verifyMagicLinkPath={verifyMagicLinkPath}
          />
        )}
        <p className='aooth-text-Grey-One aooth-text-body-2-medium aooth-text-center aooth-mt-[32px]'>
          Don&apos;t have an account?{' '}
          <Link to={signInPath ?? routes.signin.path} className='aooth-text-Primary aooth-text-body-2-semiBold'>
            Sign In
          </Link>{' '}
        </p>
        {size(appSettings.PROVIDERS) > 0 && (
          <div className='aooth-mt-[32px] aooth-px-[24px]'>
            <div className='aooth-relative aooth-w-full aooth-h-[1px] aooth-bg-Grey-Four aooth-mb-[24px]'>
              <span
                className={`aooth-absolute aooth-bg-White aooth-px-[15px] aooth-top-1/2 aooth-left-1/2 -aooth-translate-x-1/2
                  -aooth-translate-y-1/2 aooth-text-Grey-One aooth-text-caption-1-medium`}
              >
                Or continue with
              </span>
            </div>
            <ProvidersBox providers={appSettings.PROVIDERS} onClick={onClickProviderHandler} />
          </div>
        )}
      </Wrapper>
    );
  }

  return null;
};

SignUpForm.defaultProps = {
  federatedCallbackUrl: window.location.origin,
  scopes: defaultScopes,
  createTenant: false,
  federatedDisplayMode: 'modal',
  signInPath: routes.signin.path,
  verifyOTPPath: routes.verify_otp.path,
  verifyMagicLinkPath: routes.verify_magic_link.path,
  relyingPartyId: window.location.hostname,
};

export const SignUp = withError(SignUpForm, ErrorComponent);
