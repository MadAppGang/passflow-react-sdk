import { Icon } from '@/components/ui';
import type { DeviceError } from '@/types/device-errors';
import type { FC } from 'react';
import { DeviceShell } from './device-shell';
import '@/styles/index.css';

/**
 * The refusal: the app's owner has this sign-in mode switched off.
 *
 * This screen REFUSES rather than hiding, and carries no approvable surface at
 * all — no sign-in, no approve button, nothing to tap. That is the entire point
 * of the component: rendering an approvable UI and rejecting the exchange later
 * would waste the human's sign-in, tell them nothing, and make the setting look
 * like a rendering hint rather than the security control it is.
 *
 * The server does not merely omit the button — it never sends a mode, a code, or
 * a CSRF token for a refused challenge (see TestDeviceInfo_RefusesDisabledMode),
 * so this screen has nothing to approve WITH even if someone added a button to
 * it. That is what makes the enforcement real rather than cosmetic.
 *
 * Asserted by test/ui/tests/device-ui-enforcement.spec.ts, which checks both the
 * refusal AND the absence of every other mode's UI.
 */
export const DeviceModeDisabled: FC<{ error: DeviceError }> = ({ error }) => (
  <DeviceShell title="Sign-in isn't available this way" testId='device-mode-disabled' className='passflow-device-wrapper'>
    <div className='passflow-form-container passflow-device-centered'>
      <div className='passflow-form-error' role='alert'>
        <Icon size='small' id='warning' type='general' className='icon-warning' />
        <span className='passflow-form-error-text'>{error.message}</span>
      </div>
      <p className='passflow-device-hint'>
        Nothing was approved, and nothing was sent to the device that showed you this code.
      </p>
    </div>
  </DeviceShell>
);
