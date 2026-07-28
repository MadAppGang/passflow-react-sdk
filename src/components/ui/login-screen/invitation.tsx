import type { FC } from 'react';
import { Button } from '../button';
import { LoginActionStack, LoginAlert, LoginProgress } from './shared';
import type { LoginInvitationState } from './types';

export const LoginInvitation: FC<LoginInvitationState> = ({
  identity,
  inviterName,
  busy = false,
  error,
  acceptLabel = 'Accept invitation',
  busyLabel = 'Accepting invitation…',
  switchAccountLabel = 'Switch account',
  createAccountLabel = 'Create a new account',
  testId,
  acceptTestId,
  onAccept,
  onSwitchAccount,
  onCreateAccount,
}) => (
  <div className='passflow-form' data-testid={testId} aria-busy={busy}>
    <div className='passflow-form-container passflow-login-screen-centered'>
      {inviterName ? (
        <p className='passflow-login-screen-text passflow-login-screen-centered-text'>
          <strong className='passflow-login-screen-app-name'>{inviterName}</strong> sent this invitation.
        </p>
      ) : null}
      <p className='passflow-login-screen-text passflow-login-screen-centered-text'>
        {identity ? (
          <>
            You&apos;re signed in as <strong className='passflow-login-screen-app-name'>{identity}</strong>.
          </>
        ) : (
          'You’re already signed in.'
        )}
      </p>
      <p className='passflow-login-screen-hint'>Continue with this account, or switch accounts?</p>
      <LoginAlert message={error} />
    </div>
    {busy ? <LoginProgress message={busyLabel} /> : null}
    <LoginActionStack>
      <Button
        size='big'
        variant='primary'
        type='button'
        autoFocus={!busy}
        data-testid={acceptTestId}
        disabled={busy}
        onClick={onAccept}
      >
        {busy ? busyLabel : acceptLabel}
      </Button>
      <Button size='big' variant='outlined' type='button' disabled={busy} onClick={onSwitchAccount}>
        {switchAccountLabel}
      </Button>
      <Button size='big' variant='clean' type='button' disabled={busy} onClick={onCreateAccount}>
        {createAccountLabel}
      </Button>
    </LoginActionStack>
  </div>
);
