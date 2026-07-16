import { Button, Icon } from '@/components/ui';
import type { DeviceError } from '@/types/device-errors';
import type { FC, PropsWithChildren } from 'react';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';

/**
 * The pieces every device verification screen is built from.
 *
 * These are thin on purpose. They exist so the five device screens cannot drift
 * from each other or from the login screen — every one of them is Wrapper +
 * passflow-form + the same Button, and none of them owns a colour, a radius or a
 * font. When the login screen changes, these change with it, because they are
 * the same components.
 */

type DeviceShellProps = PropsWithChildren & {
  title: string;
  subtitle?: string;
  /** data-testid on the content root. The Playwright suite grips these. */
  testId?: string;
  className?: string;
};

/**
 * The card. Identical shell to SignInForm's — same Wrapper, same
 * `passflow-form` column — so a device screen and the login screen are the same
 * object at a glance, because they are the same object.
 */
export const DeviceShell: FC<DeviceShellProps> = ({ title, subtitle, testId, className = '', children }) => (
  <Wrapper title={title} subtitle={subtitle} className={className}>
    <div className='passflow-form' data-testid={testId}>
      {children}
    </div>
  </Wrapper>
);

/**
 * A classified failure, rendered.
 *
 * Shows `error.message` and ONLY `error.message` — the sentence
 * classify-device-error.ts wrote for a human. `error.detail` (the DOMException,
 * the server's error_description) is deliberately not rendered here at all; the
 * hook has already put it in the console, which is where the person who needs it
 * is looking. See types/device-errors.ts for why this is a rule and not a
 * preference.
 */
export const DeviceErrorMessage: FC<{ error: DeviceError | null }> = ({ error }) => {
  if (!error) return null;
  return (
    <div className='passflow-form-error' role='alert' data-testid='device-error'>
      <Icon size='small' id='warning' type='general' className='icon-warning' />
      <span className='passflow-form-error-text'>{error.message}</span>
    </div>
  );
};

/**
 * The RFC 8628 §5.4 code display: the thing the human is asked to compare
 * against their terminal.
 *
 * Rendered big, monospaced and letter-spaced because it exists to be READ
 * character by character against another screen. `user-select: all` so a code
 * that turns out to be wrong is easy to copy into a bug report.
 */
export const DeviceUserCode: FC<{ code: string; testId?: string }> = ({ code, testId }) => (
  <div className='passflow-device-code' data-testid={testId}>
    {code}
  </div>
);

/**
 * The terminal success state, shared by all three modes.
 *
 * Says "go back to your terminal" because that is the only thing left to do —
 * the tokens are already on their way to it.
 */
export const DeviceDone: FC<{ testId?: string }> = ({ testId }) => (
  <DeviceShell title="You're signed in" subtitle="Head back to your terminal — it's ready to go." testId={testId}>
    <div className='passflow-form-container passflow-device-centered'>
      <div className='passflow-device-success'>
        <Icon size='small' id='check' type='general' className='icon-success' />
        <span className='passflow-device-success-text'>This device is approved</span>
      </div>
      <p className='passflow-device-text'>You can close this page.</p>
    </div>
  </DeviceShell>
);

/**
 * A dead end: the code is bad, expired, or the app is gone.
 *
 * Offers a way back to the code form only when trying again could actually work
 * (`isRecoverable`). An expired code will never become unexpired by being
 * retyped, so we do not invite that.
 */
export const DeviceFailed: FC<{ error: DeviceError; onRetry?: () => void }> = ({ error, onRetry }) => (
  <DeviceShell title="That didn't work" testId='device-failed'>
    <div className='passflow-form-container'>
      <DeviceErrorMessage error={error} />
    </div>
    {error.isRecoverable && onRetry ? (
      <Button size='big' variant='primary' type='button' onClick={onRetry}>
        Try again
      </Button>
    ) : null}
  </DeviceShell>
);
