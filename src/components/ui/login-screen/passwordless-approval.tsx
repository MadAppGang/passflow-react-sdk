import type { FC, FormEvent } from 'react';
import { Button } from '../button';
import { LoginActionStack, LoginAlert, LoginProgress } from './shared';
import type { LoginPasswordlessApprovalFormState, LoginPasswordlessApprovalState } from './types';

/**
 * Approving a sign-in started on any device, in one click. The request details are shown, and the two answers are
 * equally prominent. While an answer is in flight both are locked.
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
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy) onApprove();
  };

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
          Choose Sign in only if you just started signing in. If you didn't, choose This wasn't me.
        </p>
        <LoginAlert message={error} />
      </div>
      {busy ? <LoginProgress message='Sending your answer…' /> : null}
      <LoginActionStack>
        <Button size='big' variant='primary' type='submit' disabled={busy}>
          Sign in
        </Button>
        <Button size='big' variant='warning' type='button' disabled={busy} onClick={onDeny}>
          This wasn't me
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
