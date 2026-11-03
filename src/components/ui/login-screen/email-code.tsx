import type { FC, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../button';
import { FieldOtp, type FieldOtpState } from '../fields/field-otp';
import { VisuallyHidden } from '../visually-hidden';
import { LoginActionStack, LoginAlert, LoginProgress } from './shared';
import type { LoginEmailCodeResend, LoginEmailCodeState } from './types';

const PROMPT_ID = 'email-code-prompt';
const INPUT_ID = 'email-code';
const ERROR_ID = 'email-code-error';
const RESEND_HINT_ID = 'email-code-resend-hint';
const DEFAULT_LENGTH = 6;
const DEFAULT_COOLDOWN_SECONDS = 30;

type EmailCodeResendButtonProps = LoginEmailCodeResend & {
  /** Locked by the step itself, while a verify is in flight. */
  locked: boolean;
};

/**
 * Resend, with its own cooldown. The countdown is drawn in the label but hidden
 * from assistive technology, so the name stays `Resend code` and is not re-read
 * every second. While it counts down, the button is `aria-disabled`: it keeps
 * focus after a press instead of dropping the keyboard user.
 *
 * The step remounts it (`key`) when `restartKey` changes, which restarts the
 * cooldown for a code the server sent again.
 */
const EmailCodeResendButton: FC<EmailCodeResendButtonProps> = ({
  cooldownSeconds = DEFAULT_COOLDOWN_SECONDS,
  busy = false,
  label = 'Resend code',
  locked,
  onResend,
}) => {
  const [remaining, setRemaining] = useState(cooldownSeconds);

  useEffect(() => {
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setRemaining((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const coolingDown = remaining > 0;
  const unavailable = coolingDown || busy || locked;

  const handleResend = () => {
    if (unavailable) return;
    setRemaining(cooldownSeconds);
    onResend();
  };

  return (
    <>
      <Button
        size='big'
        variant='clean'
        type='button'
        aria-disabled={unavailable}
        aria-describedby={coolingDown ? RESEND_HINT_ID : undefined}
        onClick={handleResend}
      >
        {busy ? 'Sending…' : label}
        {coolingDown && !busy ? <span aria-hidden='true'>{`\u00A0(${remaining})`}</span> : null}
      </Button>
      {coolingDown ? (
        <VisuallyHidden id={RESEND_HINT_ID}>A new code can be requested when the countdown ends.</VisuallyHidden>
      ) : null}
    </>
  );
};

/**
 * The emailed verification code step: the server's prompt names a row of code
 * boxes; six digits submit by themselves. A failed verify or a resend clears the
 * typed code. While a verify is in flight the code, Resend and the way back are
 * locked, and focus returns to the code when it ends.
 */
export const LoginEmailCode: FC<LoginEmailCodeState> = ({
  message,
  length = DEFAULT_LENGTH,
  error,
  busy = false,
  submitLabel = 'Verify',
  resend,
  secondaryAction,
  testId,
  onSubmit,
}) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wasBusy = useRef(busy);

  // A verify or resend that ended with an error clears the code, so the user types
  // the next one into empty boxes. Compared during render, not in an effect, so the
  // stale code is never drawn next to the error.
  const [seenOutcome, setSeenOutcome] = useState({ busy, error });
  if (seenOutcome.busy !== busy || seenOutcome.error !== error) {
    setSeenOutcome({ busy, error });
    if (!busy && error) setCode('');
  }

  // A new code was sent: the old one is no longer worth keeping.
  const restartKey = resend?.restartKey;
  const [seenRestartKey, setSeenRestartKey] = useState(restartKey);
  if (seenRestartKey !== restartKey) {
    setSeenRestartKey(restartKey);
    setCode('');
  }

  // The locked input loses focus; give it back once the verify ends.
  useEffect(() => {
    if (wasBusy.current && !busy) inputRef.current?.focus();
    wasBusy.current = busy;
  }, [busy]);

  const submit = (value: string) => {
    if (busy || value.length !== length) return;
    onSubmit(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(code);
  };

  const fieldState: FieldOtpState = busy ? 'disabled' : error ? 'error' : 'default';

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit}>
      <div className='passflow-form-container passflow-login-screen-centered'>
        <p id={PROMPT_ID} className='passflow-login-screen-text passflow-login-screen-centered-text'>
          {message}
        </p>
        <FieldOtp
          ref={inputRef}
          id={INPUT_ID}
          name='otp'
          length={length}
          value={code}
          onChange={setCode}
          onComplete={submit}
          charset='numeric'
          state={fieldState}
          labelledBy={PROMPT_ID}
          describedBy={error ? ERROR_ID : undefined}
          autoFocus
        />
        <LoginAlert id={ERROR_ID} message={error} />
      </div>
      {busy ? <LoginProgress message='Checking the code…' /> : null}
      <LoginActionStack>
        <Button size='big' variant='primary' type='submit' disabled={busy || code.length !== length}>
          {busy ? 'Verifying…' : submitLabel}
        </Button>
        {resend ? (
          <EmailCodeResendButton
            key={restartKey}
            {...resend}
            locked={busy}
            onResend={() => {
              setCode('');
              resend.onResend();
            }}
          />
        ) : null}
        {secondaryAction ? (
          <Button size='big' variant='clean' type='button' disabled={busy} onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </LoginActionStack>
    </form>
  );
};
