import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '../button';
import { FieldText } from '../fields/field-text';
import { LoginAlert, LoginProgress } from './shared';
import type { LoginSecondFactorMethod, LoginSecondFactorState } from './types';

/** The words for each factor, matching the sign-in's own two-factor screens. */
const METHOD_COPY: Record<LoginSecondFactorMethod, { label: string; hint: string; switchLabel: string }> = {
  totp: {
    label: 'Authenticator code',
    hint: 'Enter the 6-digit code from your authenticator app.',
    switchLabel: 'Use authenticator app',
  },
  recovery_codes: {
    label: 'Recovery code',
    hint: 'Enter one of your recovery codes.',
    switchLabel: 'Use recovery code',
  },
};

export const LoginSecondFactor: FC<LoginSecondFactorState> = ({
  methods,
  identity,
  busy = false,
  error,
  submitLabel = 'Verify',
  testId,
  onSubmit,
  onMethodChange,
}) => {
  const [method, setMethod] = useState<LoginSecondFactorMethod>(methods[0] ?? 'totp');
  const [code, setCode] = useState('');
  const alternate = methods.find((m) => m !== method);
  const copy = METHOD_COPY[method];
  const isTOTP = method === 'totp';

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (normalizedCode) onSubmit(method, normalizedCode);
  };

  const switchTo = (next: LoginSecondFactorMethod) => {
    setMethod(next);
    setCode('');
    onMethodChange?.();
  };

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit}>
      <div className='passflow-form-container'>
        {identity ? (
          <p className='passflow-login-screen-hint'>
            Signed in as <strong className='passflow-login-screen-app-name'>{identity}</strong>.
          </p>
        ) : null}
        <div className='passflow-form-field'>
          <div className='passflow-form-field__header'>
            <label htmlFor='second-factor-code' className='passflow-field-label'>
              {copy.label}
            </label>
            {alternate ? (
              <Button
                size='small'
                variant='clean'
                type='button'
                className='passflow-field-label-button'
                disabled={busy}
                onClick={() => switchTo(alternate)}
              >
                {METHOD_COPY[alternate].switchLabel}
              </Button>
            ) : null}
          </div>
          <FieldText
            id='second-factor-code'
            name={isTOTP ? 'otp' : 'recovery_code'}
            type='text'
            autoComplete={isTOTP ? 'one-time-code' : 'off'}
            autoCapitalize={isTOTP ? 'off' : 'characters'}
            autoCorrect='off'
            spellCheck={false}
            inputMode={isTOTP ? 'numeric' : 'text'}
            autoFocus
            className='passflow-login-screen-code-input'
            value={code}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'second-factor-code-error' : 'second-factor-code-hint'}
            isError={Boolean(error)}
            onChange={(event) => setCode(event.target.value)}
          />
          <p id='second-factor-code-hint' className='passflow-login-screen-hint'>
            {copy.hint}
          </p>
        </div>
        <LoginAlert id='second-factor-code-error' message={error} />
      </div>
      {busy ? <LoginProgress message='Checking the code…' /> : null}
      <Button size='big' variant='primary' type='submit' disabled={busy || code.trim().length === 0}>
        {busy ? 'Checking…' : submitLabel}
      </Button>
    </form>
  );
};
