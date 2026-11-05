import type { FC, FormEvent } from 'react';
import { useId, useState } from 'react';
import { Button } from '../button';
import { FieldOtp } from '../fields/field-otp';
import { LoginActionStack, LoginAlert, useFocusAfterBusy } from './shared';
import type {
  LoginScreenAction,
  LoginTwoFactorSetupCodeState,
  LoginTwoFactorSetupStartState,
  LoginTwoFactorSetupState,
} from './types';

const SecondaryAction: FC<{ action?: LoginScreenAction; busy: boolean }> = ({ action, busy }) =>
  action ? (
    <Button size='big' variant='clean' type='button' disabled={busy} onClick={action.onClick}>
      {action.label}
    </Button>
  ) : null;

const LoginTwoFactorSetupStart: FC<LoginTwoFactorSetupStartState> = ({
  startLabel,
  busyLabel,
  busy = false,
  error,
  secondaryAction,
  testId,
  onStart,
}) => (
  <div className='passflow-form' data-testid={testId} aria-busy={busy}>
    {error ? (
      <div className='passflow-form-container passflow-login-screen-centered'>
        <LoginAlert message={error} />
      </div>
    ) : null}
    <LoginActionStack>
      <Button size='big' variant='primary' type='button' disabled={busy} onClick={onStart}>
        {busy ? busyLabel : startLabel}
      </Button>
      <SecondaryAction action={secondaryAction} busy={busy} />
    </LoginActionStack>
  </div>
);

/** The caller shows a new secret by passing it: `LoginTwoFactorSetup` remounts this step, so the typed code clears. */
const LoginTwoFactorSetupCode: FC<LoginTwoFactorSetupCodeState> = ({
  qrCode,
  qrAlt,
  secret,
  secretLabel,
  showSecretLabel,
  hideSecretLabel,
  digits,
  codeLabel,
  submitLabel,
  busyLabel,
  busy = false,
  alert,
  secondaryAction,
  testId,
  onSubmit,
}) => {
  const [code, setCode] = useState('');
  const [secretShown, setSecretShown] = useState(false);
  const inputId = useId();
  const alertId = `${inputId}-alert`;
  const inputRef = useFocusAfterBusy(busy);
  const canSubmit = code.length === digits;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canSubmit && !busy) onSubmit(code);
  };

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit}>
      <div className='passflow-form-container passflow-login-screen-centered'>
        {qrCode ? (
          <>
            <div className='passflow-2fa-qr-container'>
              <img src={`data:image/png;base64,${qrCode}`} alt={qrAlt} className='passflow-2fa-qr-image' />
            </div>
            <p className='passflow-login-screen-hint'>
              <Button size='small' variant='link' type='button' onClick={() => setSecretShown((shown) => !shown)}>
                {secretShown ? hideSecretLabel : showSecretLabel}
              </Button>
            </p>
          </>
        ) : null}
        {secretShown || !qrCode ? (
          <div className='passflow-2fa-secret'>
            <p className='passflow-login-screen-hint'>{secretLabel}</p>
            <code className='passflow-2fa-secret-code'>{secret}</code>
          </div>
        ) : null}
        <FieldOtp
          ref={inputRef}
          id={inputId}
          name='code'
          length={digits}
          value={code}
          onChange={setCode}
          state={busy ? 'disabled' : alert?.tone === 'error' ? 'error' : 'default'}
          label={codeLabel}
          describedBy={alert ? alertId : undefined}
          autoFocus={!busy}
        />
        <LoginAlert id={alertId} message={alert?.message} tone={alert?.tone} />
      </div>
      <LoginActionStack>
        <Button size='big' variant='primary' type='submit' disabled={busy || !canSubmit}>
          {busy ? busyLabel : submitLabel}
        </Button>
        <SecondaryAction action={secondaryAction} busy={busy} />
      </LoginActionStack>
    </form>
  );
};

export const LoginTwoFactorSetup: FC<LoginTwoFactorSetupState> = (state) =>
  state.step === 'start' ? <LoginTwoFactorSetupStart {...state} /> : <LoginTwoFactorSetupCode key={state.secret} {...state} />;
