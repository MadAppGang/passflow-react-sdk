import type { FC } from 'react';
import { Button } from '../button';
import type { LoginGeneralErrorState } from './types';

export const LoginGeneralError: FC<LoginGeneralErrorState> = ({
  message,
  detail = 'Go back to start again.',
  actionLabel = 'Go back',
  testId,
  onAction,
}) => (
  <div className='passflow-error-container' data-testid={testId}>
    <div className='passflow-error-container-text-wrapper' role='alert' aria-live='assertive'>
      {message ? <h1 className='passflow-error-container-text'>{message}</h1> : null}
      <p className='passflow-error-container-text-secondary'>{detail}</p>
    </div>
    <Button size='big' type='button' variant='primary' onClick={onAction} className='passflow-button-go-back-error'>
      {actionLabel}
    </Button>
  </div>
);
