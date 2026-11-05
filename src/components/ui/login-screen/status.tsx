import type { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import { LoginActionStack, LoginAlert, LoginProgress } from './shared';
import type { LoginStatusState } from './types';

export const LoginStatus: FC<LoginStatusState> = ({
  tone,
  message,
  detail,
  error,
  recoverable = false,
  retryLabel = 'Try again',
  testId,
  onRetry,
  primaryAction,
  secondaryAction,
}) => {
  const busy = primaryAction?.busy ?? false;
  const canRetry = !primaryAction && tone === 'error' && recoverable && Boolean(onRetry);

  return (
    <div className='passflow-form' data-testid={testId} aria-busy={busy || undefined}>
      <div className='passflow-form-container passflow-login-screen-centered'>
        {tone === 'working' ? (
          <LoginProgress message={message} />
        ) : tone === 'success' ? (
          <div className='passflow-login-screen-success' role='status'>
            <Icon size='small' id='check' type='general' className='icon-success' decorative />
            <span className='passflow-login-screen-success-text'>{message}</span>
          </div>
        ) : tone === 'info' ? (
          <div className='passflow-login-screen-info' role='status'>
            <Icon size='big' id='mail' type='general' className='passflow-login-screen-info-icon' matchTextColor decorative />
            <p className='passflow-login-screen-text passflow-login-screen-centered-text'>{message}</p>
          </div>
        ) : (
          <LoginAlert message={message} />
        )}
        {detail ? <p className='passflow-login-screen-hint'>{detail}</p> : null}
        <LoginAlert message={error} />
      </div>
      {primaryAction || canRetry || secondaryAction ? (
        <LoginActionStack>
          {primaryAction ? (
            <Button size='big' variant='primary' type='button' disabled={busy} onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : canRetry ? (
            <Button size='big' variant='primary' type='button' onClick={onRetry}>
              {retryLabel}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button size='big' variant='clean' type='button' disabled={busy} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          ) : null}
        </LoginActionStack>
      ) : null}
    </div>
  );
};
