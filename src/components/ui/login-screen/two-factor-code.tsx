import type { FC, FormEvent } from 'react';
import { useId } from 'react';
import { cn } from '@/utils';
import { Button } from '../button';
import { FieldOtp } from '../fields/field-otp';
import { FieldText } from '../fields/field-text';
import { Switch } from '../switch';
import { LoginActionStack, LoginAlert, useFocusAfterBusy } from './shared';
import type { LoginTwoFactorCodeState } from './types';

/**
 * Asking for a second factor at sign-in: authenticator boxes or a recovery code field, with the trust switch above
 * them. The screen owns no code: a submit on the last digit belongs to the caller's `onCodeChange`.
 */
export const LoginTwoFactorCode: FC<LoginTwoFactorCodeState> = ({
  factor,
  label,
  code,
  trustDevice,
  busy = false,
  canSubmit,
  locked = false,
  alert,
  submitLabel,
  busyLabel,
  alternate,
  secondaryAction,
  autoFocus = false,
  testId,
  onCodeChange,
  onSubmit,
}) => {
  const inputId = useId();
  const alertId = `${inputId}-alert`;
  const inputRef = useFocusAfterBusy(busy);
  const disabled = busy || locked;
  const isError = alert?.tone === 'error';
  const describedBy = alert ? alertId : undefined;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit && !disabled) onSubmit();
  };

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit}>
      <div className='passflow-form-container'>
        {/* Above the code: the code can submit itself on its last digit. */}
        <div className='passflow-form-field'>
          <Switch
            label={trustDevice.label}
            checked={trustDevice.checked}
            disabled={disabled}
            onChange={(event) => trustDevice.onChange(event.target.checked)}
          />
        </div>
        {factor.type === 'totp' ? (
          <div className='passflow-verify-otp-wrapper'>
            <FieldOtp
              ref={inputRef}
              id={inputId}
              name='code'
              length={factor.digits}
              value={code}
              onChange={onCodeChange}
              state={disabled ? 'disabled' : isError ? 'error' : 'default'}
              label={label}
              describedBy={describedBy}
              autoFocus={autoFocus && !disabled}
            />
          </div>
        ) : (
          <div className='passflow-form-field'>
            <label htmlFor={inputId} className={cn('passflow-field-label', isError && 'passflow-field-label--error')}>
              {label}
            </label>
            <FieldText
              ref={inputRef}
              id={inputId}
              name='recovery_code'
              autoCapitalize='characters'
              autoComplete='off'
              autoCorrect='off'
              spellCheck={false}
              placeholder={factor.placeholder}
              className='passflow-login-screen-code-input'
              value={code}
              disabled={disabled}
              autoFocus={autoFocus && !disabled}
              aria-invalid={isError}
              aria-describedby={describedBy}
              isError={isError}
              onChange={(event) => onCodeChange(event.target.value)}
            />
          </div>
        )}
        <LoginAlert id={alertId} message={alert?.message} tone={alert?.tone} />
      </div>
      {!locked || secondaryAction ? (
        <LoginActionStack>
          {locked ? null : (
            <Button size='big' variant='primary' type='submit' disabled={busy || !canSubmit}>
              {busy ? busyLabel : submitLabel}
            </Button>
          )}
          {secondaryAction ? (
            <Button size='big' variant='clean' type='button' disabled={busy} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </LoginActionStack>
      ) : null}
      {alternate && !locked ? (
        <div className='passflow-form-actions'>
          <p className='passflow-dont-have-account'>
            {alternate.prompt}{' '}
            <Button size='small' variant='link' type='button' disabled={busy} onClick={alternate.onClick}>
              {alternate.label}
            </Button>
          </p>
        </div>
      ) : null}
    </form>
  );
};
