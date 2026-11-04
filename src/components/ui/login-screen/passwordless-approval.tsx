import type { FC, FormEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../button';
import { FieldOtp, type FieldOtpState } from '../fields/field-otp';
import { LoginActionStack, LoginAlert, LoginProgress } from './shared';
import type { LoginPasswordlessApprovalFormState, LoginPasswordlessApprovalState } from './types';

const CODE_LENGTH = 4;

/**
 * Approving a sign-in started on another device. Reaching four digits submits nothing: only Approve does. A failed
 * answer clears the typed code and gives focus back to it.
 */
const LoginPasswordlessApprovalForm: FC<LoginPasswordlessApprovalFormState> = ({
  appName,
  browser,
  os,
  location,
  requestedAt,
  error,
  busy = false,
  testId,
  onApprove,
  onDeny,
}) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const wasBusy = useRef(busy);
  const inputId = useId();
  const errorId = `${inputId}-error`;

  // Compared during render, not in an effect, so the stale code is never drawn next to the error.
  const [seenOutcome, setSeenOutcome] = useState({ busy, error });
  if (seenOutcome.busy !== busy || seenOutcome.error !== error) {
    setSeenOutcome({ busy, error });
    if (!busy && error) setCode('');
  }

  useEffect(() => {
    if (wasBusy.current && !busy) inputRef.current?.focus();
    wasBusy.current = busy;
  }, [busy]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy && code.length === CODE_LENGTH) onApprove(code);
  };

  const fieldState: FieldOtpState = busy ? 'disabled' : error ? 'error' : 'default';
  const details = [
    { label: 'Application', value: appName },
    { label: 'Browser', value: browser },
    { label: 'Operating system', value: os },
    { label: 'Location', value: location },
    { label: 'Time', value: requestedAt },
  ];

  return (
    <form className='passflow-form' data-testid={testId} aria-busy={busy} onSubmit={handleSubmit}>
      <div className='passflow-form-container passflow-login-screen-centered'>
        <dl className='passflow-login-screen-details'>
          {details.map(({ label, value }) =>
            value ? (
              <div key={label} className='passflow-login-screen-details-row'>
                <dt className='passflow-login-screen-details-label'>{label}</dt>
                <dd className='passflow-login-screen-details-value'>{value}</dd>
              </div>
            ) : null,
          )}
        </dl>
        <p className='passflow-login-screen-text passflow-login-screen-centered-text'>
          Approve only if you started signing in on another device and can see the code there now. If someone asked you for a
          code, choose Deny.
        </p>
        <FieldOtp
          ref={inputRef}
          id={inputId}
          name='match_code'
          length={CODE_LENGTH}
          value={code}
          onChange={setCode}
          charset='numeric'
          state={fieldState}
          label='Code shown on your other device'
          describedBy={error ? errorId : undefined}
        />
        <LoginAlert id={errorId} message={error} />
      </div>
      {busy ? <LoginProgress message='Sending your answer…' /> : null}
      <LoginActionStack>
        <Button size='big' variant='primary' type='submit' disabled={busy || code.length !== CODE_LENGTH}>
          Approve
        </Button>
        <Button size='big' variant='warning' type='button' disabled={busy} onClick={onDeny}>
          Deny
        </Button>
      </LoginActionStack>
    </form>
  );
};

export const LoginPasswordlessApproval: FC<LoginPasswordlessApprovalState> = (state) =>
  state.loading ? (
    <div className='passflow-form'>
      <div className='passflow-form-container passflow-login-screen-centered'>
        <LoginProgress message='Loading the sign-in request…' />
      </div>
    </div>
  ) : (
    <LoginPasswordlessApprovalForm {...state} />
  );
