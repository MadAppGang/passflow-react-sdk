/* eslint-disable complexity */
/* eslint-disable jsx-a11y/label-has-associated-control */
import { ChangeEvent, FC, useLayoutEffect, useState } from 'react';
import { Button, FieldPassword, FieldPhone, FieldText, Icon, Link, ProvidersBox, Switch } from '@/components/ui';
import { Form, Formik, FormikErrors, FormikHandlers, FormikState } from 'formik';
import { AoothPasswordlessSignInPayload, ChallengeType, Providers } from '@aooth/aooth-js-sdk';
import { find, includes, size, some } from 'lodash';
import { Wrapper } from '../wrapper';
import { useAooth, useAppSettings, useProvider, useSignIn } from '@/hooks';
import { cn, emailRegex, getUrlWithTokens, isValidUrl, validationSingInSchemas } from '@/utils';
import { routes } from '@/context';
import { useNavigate } from 'react-router-dom';
import { PreferIdentity, SuccessAuthRedirect } from '@/types';
import { withError } from '@/hocs';
import { Error as ErrorComponent } from '@/components/error';
import '@/styles/index.css';

const initialValues = {
  password: '',
  identity: '',
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

const generateIdentityLabel = (identities: string[], useString: boolean): string => {
  if (includes(identities, 'username') && includes(identities, 'email'))
    return useString ? 'Use email or username' : 'Email or username';
  if (includes(identities, 'email')) return useString ? 'Use email' : 'Email';
  if (includes(identities, 'username')) return useString ? 'Use username' : 'Username';
  return '';
};

export const SignInForm: FC<TSignIn> = ({
  federatedCallbackUrl = window.location.origin,
  successAuthRedirect,
  relyingPartyId = window.location.hostname,
  federatedDisplayMode = 'redirect',
  signUpPath = routes.signup.path,
  createTenant = false,
  verifyOTPPath = routes.verify_otp.path,
  verifyMagicLinkPath = routes.verify_magic_link.path,
  forgotPasswordPath = routes.forgot_password.path,
}) => {
  const aooth = useAooth();
  const { fetch, isError, error, reset, isLoading } = useSignIn();
  const { appSettings, passwordPolicy, isError: isErrorApp, error: errorApp } = useAppSettings();
  const { federatedWithRedirect, federatedWithPopup } = useProvider(federatedCallbackUrl);
  const navigate = useNavigate();

  const [validationSchema, setValidationSchema] = useState<ReturnType<typeof validationSingInSchemas> | null>(null);

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
      const schema = validationSingInSchemas({
        identity: preferredIdentity,
        challenge: identityHasPassword ? 'password' : 'none',
      });
      setHasMainChallenges(checkHasMainChallenges);
      setCurrentIdentityField(preferredIdentity);
      setValidationSchema(schema);
    }
  }, [appSettings]);

  const onSubmitHanlder = async (values: typeof initialValues) => {
    const { identity, phone, password } = values;
    const isEmail = identity.match(emailRegex);
    const payload = {
      password,
      ...(isEmail ? { email: identity } : { username: identity }),
      ...(size(phone) > 0 && { phone }),
    };

    const status = await fetch(payload, 'password');
    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = await getUrlWithTokens(aooth, successAuthRedirect);
    }
  };

  const onSubmitPasswordlessHandler =
    (field: keyof Pick<AoothPasswordlessSignInPayload, 'email' | 'phone'>, value: string, type: ChallengeType) => async () => {
      const payload = {
        create_tenant: createTenant,
        challenge_type: type,
        ...(field === 'email' ? { email: value } : { phone: value }),
      };

      const status = await fetch(payload, 'passwordless');

      if (type === 'otp' && status)
        navigate(
          {
            pathname: verifyOTPPath ?? routes.verify_otp.path,
            search: window.location.search,
          },
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
          {
            pathname: verifyMagicLinkPath ?? routes.verify_magic_link.path,
            search: window.location.search,
          },
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

  const onSubmitPasskeyHandler = async () => {
    const payload = {
      relying_party_id: relyingPartyId,
    };
    const status = await fetch(payload, 'passkey');
    if (status) {
      if (!isValidUrl(successAuthRedirect)) navigate(successAuthRedirect);
      else window.location.href = await getUrlWithTokens(aooth, successAuthRedirect);
    }
  };

  const onSwitchFieldHandler = (
    field: PreferIdentity,
    validateForm: (values: typeof initialValues) => Promise<FormikErrors<typeof initialValues>>,
    resetForm: (nextState?: Partial<FormikState<typeof initialValues>>) => void,
  ) => {
    const identityField = field === 'identity' ? ['email', 'username'] : ['phone'];
    if (appSettings) {
      const { INTERNAL } = appSettings;
      const fieldHasPassword = identityField.find((idField: string) => find(INTERNAL[idField], { challenge: 'password' }));
      if (fieldHasPassword) setHasPassword(true);
      else setHasPassword(false);
      const schema = validationSingInSchemas({
        identity: field,
        challenge: fieldHasPassword ? 'password' : 'none',
      });

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

  const passwordlessChallengeButton = (values: typeof initialValues, isValid: boolean, dirty: boolean) => {
    if (!appSettings) return null;

    const { identity, phone } = values;

    const passwordlessStyle = cn('aooth-m-auto aooth-text-White aooth-text-body-2-semiBold', {
      'aooth-mb-[16px]': includes(appSettings.CHALLENGES, 'passkey'),
      'aooth-border-Primary !aooth-text-Primary !aooth-text-body-2-medium': hasPassword,
    });

    const { INTERNAL } = appSettings;
    const identityField = currentIdentityField === 'identity' ? 'email' : 'phone';

    const magicLink = find(INTERNAL[identityField], {
      challenge: 'magic_link',
    });
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
          Sign In with {identityField === 'email' ? 'email code' : 'SMS code'}
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
          Sign In with {identityField === 'email' ? 'link' : 'SMS link'}
        </Button>
      );
    }

    return null;
  };

  const onChangePasswordlessExperience = (e: ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setPasswordlessExperience(checked);
  };

  const labelStyle = cn('aooth-text-caption-1-medium aooth-text-Grey-One aooth-normal-case', {
    'aooth-text-Warning': isError,
  });

  if (isError && error && passwordlessExperience) throw new Error(error);

  if (isErrorApp && errorApp) throw new Error('Could not connect to server, please check your network and try again later.');

  if (appSettings) {
    return (
      <Wrapper title='Sign In to your account' subtitle='To Aooth by Madappgang'>
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
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmitHanlder}
          validateOnChange
          enableReinitialize
          validateOnMount
        >
          {({ isValid, dirty, handleChange, handleBlur, values, setFieldValue, validateForm, resetForm }) => (
            <>
              <Form className='aooth-flex aooth-flex-col aooth-gap-[32px] aooth-mt-[32px]'>
                {!passwordlessExperience && hasMainChallenges && (
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
                                  className={`aooth-text-Primary aooth-text-caption-1-semiBold 
                                    aooth-h-max aooth-max-w-max aooth-p-0`}
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
                                    className={`aooth-text-Primary aooth-text-caption-1-semiBold 
                                      aooth-h-max aooth-max-w-max aooth-p-0`}
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
                          className={`group aooth-relative aooth-flex aooth-flex-col aooth-items-start 
                          aooth-justify-center aooth-gap-[6px]`}
                        >
                          <div className='aooth-w-full aooth-flex aooth-items-center aooth-justify-between'>
                            <label htmlFor='password' className={labelStyle}>
                              Password
                            </label>
                            <Link
                              to={forgotPasswordPath ?? routes.forgot_password.path}
                              state={{ identity: currentIdentityField }}
                              className='aooth-text-Primary aooth-text-caption-1-semiBold'
                            >
                              Forgot password
                            </Link>
                          </div>
                          <FieldPassword
                            isError={isError}
                            value={values.password}
                            passwordPolicy={passwordPolicy}
                            id='password'
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
                          Sign In
                        </Button>
                      )}
                      {passwordlessChallengeButton(values, isValid, dirty)}
                    </div>
                  </>
                )}
              </Form>
              <div>
                {includes(appSettings.CHALLENGES, 'passkey') && (
                  <Button
                    size='big'
                    variant='dark'
                    type='button'
                    className='aooth-m-auto'
                    withIcon
                    onClick={onSubmitPasskeyHandler as () => void}
                  >
                    <Icon id='key' size='small' type='general' className='icon-white' />
                    Sign In with a Passkey
                  </Button>
                )}
                <p className='aooth-text-Grey-One aooth-text-body-2-medium aooth-text-center aooth-mt-[32px]'>
                  Don&apos;t have an account?{' '}
                  <Link to={signUpPath ?? routes.signup.path} className='aooth-text-Primary aooth-text-body-2-semiBold'>
                    Sign Up
                  </Link>{' '}
                </p>
                {size(appSettings.PROVIDERS) > 0 && (
                  <div className='aooth-mt-[32px] aooth-px-[24px]'>
                    <div className='aooth-relative aooth-w-full aooth-h-[1px] aooth-bg-Grey-Four aooth-mb-[24px]'>
                      <span
                        className={`aooth-absolute aooth-bg-White aooth-px-[15px] aooth-top-1/2 aooth-left-1/2 
                        -aooth-translate-x-1/2 -aooth-translate-y-1/2 aooth-text-Grey-One aooth-text-caption-1-medium`}
                      >
                        Or continue with
                      </span>
                    </div>
                    <ProvidersBox providers={appSettings.PROVIDERS} onClick={onClickProviderHandler} />
                  </div>
                )}
              </div>
            </>
          )}
        </Formik>
      </Wrapper>
    );
  }

  return null;
};

export const SignIn = withError(SignInForm, ErrorComponent);
