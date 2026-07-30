import type { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import { LoginAlert } from './shared';
import type { LoginPasskeyProgressState } from './types';

export const LoginPasskeyProgress: FC<LoginPasskeyProgressState> = ({
  working,
  message,
  actionLabel = 'Continue with a passkey',
  error,
  recoverable = false,
  retryLabel = 'Try again',
  testId,
  onAction,
  onRetry,
}) => (
  <div className='passflow-form' data-testid={testId}>
    <div className='passflow-form-container passflow-login-screen-centered'>
      <div className='passflow-login-screen-status' role='status'>
        {working ? <div className='passflow-login-screen-spinner' aria-hidden='true' /> : null}
        <p className='passflow-login-screen-text'>{message}</p>
      </div>
      <LoginAlert message={error} />
    </div>
    {!working && onAction ? (
      <Button size='big' variant='dark' type='button' className='passflow-button-passkey' withIcon onClick={onAction}>
        <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' decorative />
        {actionLabel}
      </Button>
    ) : !working && error && recoverable && onRetry ? (
      <Button size='big' variant='dark' type='button' className='passflow-button-passkey' withIcon onClick={onRetry}>
        <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' decorative />
        {retryLabel}
      </Button>
    ) : null}
  </div>
);
