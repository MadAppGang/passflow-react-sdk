import type { DefaultMethod } from '@/types';
import { cn, emailRegex, passwordValidation } from '@/utils';
import { phone } from 'phone';
import type { FC } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Button } from '../button';
import { FieldPassword } from '../fields/field-password';
import { FieldPhone } from '../fields/field-phone';
import { FieldText } from '../fields/field-text';
import { Icon } from '../icon';
import { Link } from '../link';
import { ProvidersBox } from '../providers-box';
import { Switch } from '../switch';
import { LoginActionStack, LoginAlert, LoginDivider, LoginProgress, LoginScreenNotice } from './shared';
import type { LoginCredentialsState, LoginCredentialsValues } from './types';

type LoginFormValues = {
  email_or_username: string;
  phone: string;
  password: string;
};

const initialValues: LoginFormValues = {
  email_or_username: '',
  phone: '',
  password: '',
};

const getDefaultMethod = (state: LoginCredentialsState): DefaultMethod | null => {
  if (state.initialMethod !== undefined && state.methods.identities.some((method) => method.id === state.initialMethod)) {
    return state.initialMethod;
  }
  return state.methods.identities[0]?.id ?? null;
};

export const LoginCredentials: FC<LoginCredentialsState> = (state) => {
  const { methods } = state;
  const computedDefaultMethod = getDefaultMethod(state);
  const [defaultMethod, setDefaultMethod] = useState<DefaultMethod | null>(computedDefaultMethod);
  const [passkeyOnly, setPasskeyOnly] = useState(Boolean(state.forcePasskey));
  const previousComputedMethod = useRef(computedDefaultMethod);
  const previousForcePasskey = useRef(Boolean(state.forcePasskey));
  const {
    control,
    getValues,
    reset,
    trigger,
    watch,
    formState: { errors, isDirty, isValid },
    handleSubmit,
  } = useForm<LoginFormValues>({
    defaultValues: initialValues,
    mode: 'onChange',
  });

  useEffect(() => {
    if (previousComputedMethod.current === computedDefaultMethod) return;
    previousComputedMethod.current = computedDefaultMethod;
    setDefaultMethod(computedDefaultMethod);
    reset(initialValues);
  }, [computedDefaultMethod, reset]);

  useEffect(() => {
    const nextForcePasskey = Boolean(state.forcePasskey);
    if (previousForcePasskey.current === nextForcePasskey) return;
    previousForcePasskey.current = nextForcePasskey;
    setPasskeyOnly(nextForcePasskey);
  }, [state.forcePasskey]);

  const currentIdentity = methods.identities.find((method) => method.id === defaultMethod);
  const hasPassword = Boolean(currentIdentity?.password);
  const hasPasswordless = Boolean(currentIdentity?.passwordlessLabel);
  const hasPasskey = methods.passkey;
  const hasIdentity = Boolean(currentIdentity);
  const showCredentialFields = !passkeyOnly && hasIdentity;
  const showStandalonePasskey = hasPasskey && (passkeyOnly || !hasIdentity);
  const hasCredentialActions = hasPassword || hasPasswordless || hasPasskey;
  const controlsDisabled = Boolean(state.busy || state.disabled);
  const errorScope = state.error?.scope;
  const hasIdentityError = errorScope === 'identity' || errorScope === 'credentials';
  const hasPasswordError = errorScope === 'password' || errorScope === 'credentials';
  const isNewPassword = state.passwordPurpose === 'sign-up';

  const validatePassword = (value: string) => {
    if (!isNewPassword) return true;

    try {
      passwordValidation(state.passwordPolicy).validateSync(value);
      return true;
    } catch (error) {
      const validationError = error as { errors?: string[] };
      return validationError.errors?.join(', ') ?? 'Password does not meet the requirements';
    }
  };

  const toCredentials = (values: LoginFormValues): LoginCredentialsValues => ({
    method: defaultMethod,
    emailOrUsername: values.email_or_username,
    phone: values.phone,
    password: values.password,
  });

  const handleReset = () => {
    reset(initialValues);
    state.onReset?.();
  };

  const handleMethodChange = (method: DefaultMethod) => {
    setDefaultMethod(method);
    handleReset();
  };

  const handlePasskeyExperienceChange = (checked: boolean) => {
    setPasskeyOnly(checked);
    handleReset();
  };

  const submitCurrentMethod = handleSubmit((values) => {
    if (hasPassword) {
      state.onPassword?.(toCredentials(values));
      return;
    }
    if (hasPasswordless) state.onPasswordless?.(toCredentials(values));
  });

  const submitPasswordless = async () => {
    if (!defaultMethod || !state.onPasswordless) return;
    const identityField = defaultMethod === 'phone' ? 'phone' : 'email_or_username';
    if (!(await trigger(identityField))) return;
    state.onPasswordless(toCredentials(getValues()));
  };
  const selectedIdentityValue = defaultMethod === 'phone' ? watch('phone') : watch('email_or_username');
  const alternateIdentity = methods.identities.find((method) => method.id !== defaultMethod);

  return (
    <>
      {state.notice ? <LoginScreenNotice {...state.notice} /> : null}
      {state.allowPasskeyToggle && hasPasskey && hasIdentity && (hasPassword || hasPasswordless) ? (
        <div className='passflow-form-switch'>
          <Switch
            label='Passwordless experience'
            checked={passkeyOnly}
            disabled={controlsDisabled}
            onChange={(event) => handlePasskeyExperienceChange(event.target.checked)}
          />
        </div>
      ) : null}
      <form
        className='passflow-form'
        data-testid={state.testId}
        aria-busy={controlsDisabled && Boolean(state.busy)}
        onSubmit={submitCurrentMethod}
      >
        {state.busy ? <LoginProgress message={state.primaryLabel ?? 'Signing in…'} /> : null}
        {showCredentialFields ? (
          <>
            <div className='passflow-form-container'>
              {defaultMethod === 'email_or_username' ? (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='email_or_username'
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': hasIdentityError || Boolean(errors.email_or_username),
                      })}
                    >
                      {currentIdentity?.label}
                    </label>
                    {alternateIdentity ? (
                      <Button
                        size='small'
                        variant='clean'
                        type='button'
                        className='passflow-field-label-button'
                        disabled={controlsDisabled}
                        onClick={() => handleMethodChange(alternateIdentity.id)}
                      >
                        {alternateIdentity.selectLabel}
                      </Button>
                    ) : null}
                  </div>
                  <Controller
                    name='email_or_username'
                    control={control}
                    rules={{
                      required: currentIdentity?.requiredMessage ?? 'Identity is required',
                      ...(currentIdentity?.format === 'email'
                        ? { pattern: { value: emailRegex, message: 'Invalid email' } }
                        : undefined),
                    }}
                    render={({ field }) => (
                      <FieldText
                        {...field}
                        id='email_or_username'
                        type={currentIdentity?.format === 'email' ? 'email' : 'text'}
                        autoComplete={currentIdentity?.format === 'email' ? 'email' : 'username'}
                        aria-invalid={Boolean(errors.email_or_username)}
                        aria-describedby={errors.email_or_username ? 'email_or_username-error' : undefined}
                        isError={hasIdentityError || Boolean(errors.email_or_username)}
                        disabled={controlsDisabled}
                      />
                    )}
                  />
                  {errors.email_or_username?.message ? (
                    <LoginAlert id='email_or_username-error' message={errors.email_or_username.message} />
                  ) : null}
                </div>
              ) : null}

              {defaultMethod === 'phone' ? (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='phone'
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': hasIdentityError || Boolean(errors.phone),
                      })}
                    >
                      Phone number
                    </label>
                    {alternateIdentity ? (
                      <Button
                        size='small'
                        variant='clean'
                        type='button'
                        className='passflow-field-label-button'
                        disabled={controlsDisabled}
                        onClick={() => handleMethodChange(alternateIdentity.id)}
                      >
                        {alternateIdentity.selectLabel}
                      </Button>
                    ) : null}
                  </div>
                  <Controller
                    name='phone'
                    control={control}
                    rules={{
                      required: 'Phone number is required',
                      validate: (value) => phone(value).isValid || 'Invalid phone number',
                    }}
                    render={({ field }) => (
                      <FieldPhone
                        id='phone'
                        name='phone'
                        onChange={field.onChange}
                        aria-describedby={errors.phone ? 'phone-error' : undefined}
                        isError={hasIdentityError || Boolean(errors.phone)}
                        disabled={controlsDisabled}
                        ref={null}
                      />
                    )}
                  />
                  {errors.phone?.message ? <LoginAlert id='phone-error' message={errors.phone.message} /> : null}
                </div>
              ) : null}

              {hasPassword ? (
                <div className='passflow-form-field'>
                  <div className='passflow-form-field__header'>
                    <label
                      htmlFor='password'
                      className={cn('passflow-field-label', {
                        'passflow-field-label--error': hasPasswordError || Boolean(errors.password),
                      })}
                    >
                      Password
                    </label>
                    {state.forgotPassword ? (
                      <Link
                        to={state.forgotPassword.to}
                        search={state.forgotPassword.getSearch?.(defaultMethod)}
                        className='passflow-field-label-button'
                      >
                        Forgot Password?
                      </Link>
                    ) : null}
                  </div>
                  <Controller
                    name='password'
                    control={control}
                    rules={{ required: 'Password is required', validate: validatePassword }}
                    render={({ field }) => (
                      <FieldPassword
                        {...field}
                        id='password'
                        name='password'
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password && !isNewPassword ? 'password-error' : undefined}
                        isError={hasPasswordError || Boolean(errors.password)}
                        passwordPolicy={state.passwordPolicy}
                        withMessages={isNewPassword}
                        validationErrors={
                          isNewPassword && errors.password?.message ? errors.password.message.split(', ') : undefined
                        }
                        autoComplete={isNewPassword ? 'new-password' : 'current-password'}
                        disabled={controlsDisabled}
                      />
                    )}
                  />
                  {!isNewPassword && errors.password?.message ? (
                    <LoginAlert id='password-error' message={errors.password.message} />
                  ) : null}
                </div>
              ) : null}

              <LoginAlert message={state.error?.message} />
            </div>

            <LoginActionStack>
              {hasPassword && state.onPassword ? (
                <Button
                  size='big'
                  variant='primary'
                  type='submit'
                  disabled={controlsDisabled || !isDirty || !isValid}
                  className='passflow-button-signin'
                  data-testid={state.primaryTestId}
                >
                  {state.primaryLabel ?? 'Sign In'}
                </Button>
              ) : null}
              {hasPasswordless && state.onPasswordless ? (
                <Button
                  size='big'
                  variant={hasPassword ? 'outlined' : 'primary'}
                  type='button'
                  className={cn('passflow-button-passwordless', {
                    'passflow-button-passwordless--active': hasPassword,
                  })}
                  disabled={controlsDisabled || selectedIdentityValue.trim().length === 0}
                  onClick={() => void submitPasswordless()}
                >
                  {state.passwordlessLabelPrefix ?? 'Sign In with'} {currentIdentity?.passwordlessLabel}
                </Button>
              ) : null}
              {hasPasskey && state.onPasskey ? (
                <Button
                  size='big'
                  variant='dark'
                  type='button'
                  className='passflow-button-passkey'
                  withIcon
                  disabled={controlsDisabled}
                  onClick={state.onPasskey}
                >
                  <Icon
                    id='key'
                    size='small'
                    type='general'
                    className='passflow-button-passkey-icon'
                    decorative
                    matchTextColor
                  />
                  {state.passkeyLabel ?? 'Sign In with a Passkey'}
                </Button>
              ) : null}
            </LoginActionStack>
          </>
        ) : null}

        {showStandalonePasskey ? (
          <>
            <LoginAlert message={state.error?.message} />
            {state.onPasskey ? (
              <LoginActionStack>
                <Button
                  size='big'
                  variant='dark'
                  type='button'
                  className='passflow-button-passkey'
                  withIcon
                  disabled={controlsDisabled}
                  onClick={state.onPasskey}
                >
                  <Icon
                    id='key'
                    size='small'
                    type='general'
                    className='passflow-button-passkey-icon'
                    decorative
                    matchTextColor
                  />
                  {state.passkeyLabel ?? 'Sign In with a Passkey'}
                </Button>
              </LoginActionStack>
            ) : null}
          </>
        ) : null}

        {state.footer ? (
          <div className={cn('passflow-form-actions', { 'passflow-form-actions--top-space': hasCredentialActions })}>
            <p className='passflow-dont-have-account'>
              {state.footer.prompt}{' '}
              <Link to={state.footer.to} search={state.footer.search} className='passflow-link'>
                {state.footer.label}
              </Link>
            </p>
          </div>
        ) : null}

        {methods.providers.length > 0 && state.onProvider ? (
          <div className='passflow-form-providers'>
            {hasCredentialActions ? <LoginDivider label='Or continue with' /> : null}
            <ProvidersBox providers={methods.providers} onClick={state.onProvider} />
          </div>
        ) : null}
      </form>
    </>
  );
};
