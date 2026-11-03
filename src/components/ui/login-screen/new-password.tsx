import type { FC } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { cn, passwordValidation } from '@/utils';
import { Button } from '../button';
import { FieldPassword } from '../fields/field-password';
import { LoginAlert, LoginProgress } from './shared';
import type { LoginNewPasswordState } from './types';

type NewPasswordValues = { password: string };

const ERROR_ID = 'new-password-error';
const VALIDATION_ERROR_ID = 'new-password-validation-error';

/**
 * Choosing a new password, checked against the app's password policy as it is
 * typed: for a reset, or to finish an account started by email. The field keeps
 * `id="password"`, and the button the `passflow-button-reset-password` class, so an
 * app's custom CSS still finds them.
 */
export const LoginNewPassword: FC<LoginNewPasswordState> = ({
  passwordPolicy,
  label = 'New password',
  hint = 'Enter your new password below.',
  error,
  busy = false,
  submitLabel = 'Save new password',
  testId,
  onSubmit,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<NewPasswordValues>({
    defaultValues: { password: '' },
    mode: 'onChange',
  });

  const validatePassword = (value: string) => {
    try {
      passwordValidation(passwordPolicy).validateSync(value);
      return true;
    } catch (validationError) {
      const { errors: messages } = validationError as { errors?: string[] };
      return messages?.join(', ') ?? 'Password does not meet the requirements';
    }
  };

  const submit = handleSubmit((values) => {
    if (!busy) onSubmit(values.password);
  });

  const validationMessage = errors.password?.message;
  // With a policy, FieldPassword lists what is missing; without one, say it in an alert.
  const showValidationAlert = !passwordPolicy && Boolean(validationMessage);
  const describedBy = [error ? ERROR_ID : null, showValidationAlert ? VALIDATION_ERROR_ID : null].filter(Boolean).join(' ');

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={submit}>
      {hint ? <p className='passflow-login-screen-hint'>{hint}</p> : null}
      <div className='passflow-form-container'>
        <div className='passflow-form-field'>
          <div className='passflow-form-field__header'>
            <label htmlFor='password' className={cn('passflow-field-label', { 'passflow-field-label--error': Boolean(error) })}>
              {label}
            </label>
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
                autoComplete='new-password'
                aria-invalid={Boolean(error) || Boolean(validationMessage)}
                aria-describedby={describedBy || undefined}
                isError={Boolean(error)}
                passwordPolicy={passwordPolicy}
                withMessages
                validationErrors={validationMessage ? validationMessage.split(', ') : undefined}
                disabled={busy}
              />
            )}
          />
          {showValidationAlert ? <LoginAlert id={VALIDATION_ERROR_ID} message={validationMessage} /> : null}
        </div>
        <LoginAlert id={ERROR_ID} message={error} />
      </div>
      {busy ? <LoginProgress message='Saving your password…' /> : null}
      <Button
        size='big'
        variant='primary'
        type='submit'
        disabled={busy || !isDirty || !isValid}
        className='passflow-button-reset-password'
      >
        {busy ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
};
