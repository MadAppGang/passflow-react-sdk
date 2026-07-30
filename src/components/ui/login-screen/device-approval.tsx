import type { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import { LoginAlert, LoginProgress, LoginScreenNotice } from './shared';
import type { LoginDeviceApprovalState } from './types';

export const LoginDeviceApproval: FC<LoginDeviceApprovalState> = ({
  appName,
  code,
  identity,
  busy = false,
  error,
  actionLabel = 'Approve this device',
  busyLabel = 'Approving…',
  testId,
  actionTestId,
  codeTestId,
  appNameTestId,
  onApprove,
}) => (
  <div className='passflow-form' data-testid={testId} aria-busy={busy}>
    <LoginScreenNotice
      code={code}
      appName={appName}
      message='requested this sign-in. Confirm that the code matches your terminal.'
      codeTestId={codeTestId}
      appNameTestId={appNameTestId}
    />
    <div className='passflow-form-container passflow-login-screen-centered'>
      <div className='passflow-login-screen-success' role='status' aria-live='polite'>
        <Icon size='small' id='check' type='general' className='icon-success' decorative />
        <p className='passflow-login-screen-text'>
          {identity ? (
            <>
              Signed in as <strong className='passflow-login-screen-app-name'>{identity}</strong>.
            </>
          ) : (
            'Signed in successfully.'
          )}
        </p>
      </div>
      <p className='passflow-login-screen-hint'>Approve this request to finish signing in on the device.</p>
      <LoginAlert message={error} />
    </div>
    {busy ? <LoginProgress message={busyLabel} /> : null}
    <Button
      size='big'
      variant='primary'
      type='button'
      autoFocus={!busy}
      data-testid={actionTestId}
      disabled={busy}
      onClick={onApprove}
    >
      {busy ? busyLabel : actionLabel}
    </Button>
  </div>
);
