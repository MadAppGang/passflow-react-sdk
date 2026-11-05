import type { FC } from 'react';
import { Button } from '../button';
import { Icon } from '../icon';
import { LoginActionStack, LoginAlert } from './shared';
import type { LoginTwoFactorRecoveryCodesState } from './types';

/** The recovery codes, shown once. They stay on screen through a failed `onContinue`, so they are not lost. */
export const LoginTwoFactorRecoveryCodes: FC<LoginTwoFactorRecoveryCodesState> = ({
  warning,
  codes,
  copyLabel,
  continueLabel,
  busyLabel,
  busy = false,
  error,
  testId,
  onCopy,
  onContinue,
}) => (
  <div className='passflow-form' data-testid={testId} aria-busy={busy}>
    <div className='passflow-form-container'>
      <div className='passflow-2fa-warning' role='note'>
        <Icon size='small' id='warning' type='general' className='icon-warning' decorative />
        <span className='passflow-2fa-warning-text'>{warning}</span>
      </div>
      <ul className='passflow-2fa-recovery-codes'>
        {codes.map((code) => (
          <li key={code}>
            <code className='passflow-2fa-recovery-code'>{code}</code>
          </li>
        ))}
      </ul>
      <LoginAlert message={error} />
    </div>
    <LoginActionStack>
      <Button size='big' variant='secondary' type='button' onClick={onCopy}>
        {copyLabel}
      </Button>
      <Button size='big' variant='primary' type='button' disabled={busy} onClick={onContinue}>
        {busy ? busyLabel : continueLabel}
      </Button>
    </LoginActionStack>
  </div>
);
