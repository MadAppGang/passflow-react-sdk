import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import { Button } from '../button';
import { FieldText } from '../fields/field-text';
import { LoginAlert, LoginProgress } from './shared';
import type { LoginCodeEntryState } from './types';

export const LoginCodeEntry: FC<LoginCodeEntryState> = ({
  label = 'Code',
  initialCode = '',
  error,
  busy = false,
  submitLabel = 'Continue',
  testId,
  onSubmit,
}) => {
  const [code, setCode] = useState(initialCode);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.trim();
    if (normalizedCode) onSubmit(normalizedCode);
  };

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit}>
      <div className='passflow-form-container'>
        <div className='passflow-form-field'>
          <div className='passflow-form-field__header'>
            <label htmlFor='device-user-code' className='passflow-field-label'>
              {label}
            </label>
          </div>
          <FieldText
            id='device-user-code'
            name='user_code'
            type='text'
            autoCapitalize='characters'
            autoComplete='off'
            autoCorrect='off'
            spellCheck={false}
            inputMode='text'
            className='passflow-login-screen-code-input'
            value={code}
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'device-user-code-error' : undefined}
            isError={Boolean(error)}
            onChange={(event) => setCode(event.target.value)}
          />
        </div>
        <LoginAlert id='device-user-code-error' message={error} />
      </div>
      {busy ? <LoginProgress message='Checking the code…' /> : null}
      <Button size='big' variant='primary' type='submit' disabled={busy || code.trim().length === 0}>
        {busy ? 'Checking…' : submitLabel}
      </Button>
    </form>
  );
};
