import type { FC } from 'react';
import { EmailCodeResendButton } from './email-code';
import { LoginActionStack, LoginAlert } from './shared';
import type { LoginPasswordlessWaitingState } from './types';

export const LoginPasswordlessWaiting: FC<LoginPasswordlessWaitingState> = ({
  matchCode,
  error,
  resend,
  testId,
  codeTestId,
}) => (
  <div className='passflow-form' data-testid={testId}>
    <div className='passflow-form-container passflow-login-screen-centered'>
      <div className='passflow-login-screen-notice' role='status'>
        <p className='passflow-login-screen-text passflow-login-screen-centered-text'>
          Open the link we sent on any device and enter this code:
        </p>
        <div className='passflow-login-screen-code' data-testid={codeTestId}>
          {matchCode}
        </div>
      </div>
      <LoginAlert message={error} />
    </div>
    {resend ? (
      <LoginActionStack>
        <EmailCodeResendButton key={resend.restartKey} label='Resend email' {...resend} locked={false} />
      </LoginActionStack>
    ) : null}
  </div>
);
