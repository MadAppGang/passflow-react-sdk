import type { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import { LoginAlert } from './shared';
import type { LoginStatusState } from './types';

export const LoginStatus: FC<LoginStatusState> = ({
  tone,
  message,
  detail,
  recoverable = false,
  retryLabel = 'Try again',
  testId,
  onRetry,
  primaryAction,
}) => (
  <div className='passflow-form' data-testid={testId}>
    <div className='passflow-form-container passflow-login-screen-centered'>
      {tone === 'success' ? (
        <div className='passflow-login-screen-success' role='status'>
          <Icon size='small' id='check' type='general' className='icon-success' decorative />
          <span className='passflow-login-screen-success-text'>{message}</span>
        </div>
      ) : (
        <LoginAlert message={message} />
      )}
      {detail ? <p className='passflow-login-screen-hint'>{detail}</p> : null}
    </div>
    {primaryAction ? (
      <Button size='big' variant='primary' type='button' onClick={primaryAction.onClick}>
        {primaryAction.label}
      </Button>
    ) : tone === 'error' && recoverable && onRetry ? (
      <Button size='big' variant='primary' type='button' onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </div>
);
