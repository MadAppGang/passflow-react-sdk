import { Button, Icon } from '@/components/ui';
import type { UseDeviceVerifyProps } from '@/hooks/use-device-verify';
import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { DeviceErrorMessage, DeviceShell } from './device-shell';
import '@/styles/index.css';

/**
 * Mode 3 — straight to passkey. ZERO taps.
 *
 * The ceremony fires on mount with no user gesture, because WebAuthn L3's
 * get() carries no transient-activation requirement (unlike create()). The
 * phone's own biometric prompt IS the interaction; asking for a button tap first
 * would add a step that protects nothing.
 *
 * No user_code and no confirm control here, and their absence is asserted by the
 * suite — the server does not even send a code for this mode. See the §5.4 note
 * in src/web/oidc/device_page.go for why an origin-bound passkey earns the right
 * to skip the code check that Modes 1 and 2 need.
 */
export const DevicePasskeyForm: FC<{ device: UseDeviceVerifyProps }> = ({ device }) => {
  const { info, error, status } = device;

  /**
   * Fire once.
   *
   * A ref rather than a bare effect body: React 18 StrictMode double-invokes
   * effects in development, and two overlapping navigator.credentials.get()
   * calls abort each other — the first rejects with NotAllowedError, which would
   * paint a failure on a page that is actually mid-ceremony.
   */
  const firedRef = useRef(false);
  const run = device.confirmWithPasskey;

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    void run();
  }, [run]);

  if (!info) return null;

  const working = status === 'working' || status === 'ready';
  const failed = error !== null && !working;

  return (
    <DeviceShell
      title="Confirm it's you"
      subtitle={`Use your passkey to sign in to ${info.app_name}.`}
      testId='device-auto-passkey'
      className='passflow-device-wrapper'
    >
      <div className='passflow-form-container passflow-device-centered'>
        {working ? (
          /*
           * A live region, not a progressbar. This spinner is indeterminate —
           * it is waiting on a human's thumb — so it has no value to report and
           * `role="progressbar"` would be a promise of aria-valuenow it cannot
           * keep. The status here is the SENTENCE; the spinner conveys nothing a
           * screen reader user can act on, so it is hidden from them and the
           * text is announced instead.
           */
          <div className='passflow-device-status' role='status'>
            <div className='passflow-device-spinner' aria-hidden='true' />
            <p className='passflow-device-text'>Waiting for your passkey — follow the prompt on your device.</p>
          </div>
        ) : null}

        <DeviceErrorMessage error={error} />
      </div>

      {/*
        Only ever shown after the automatic attempt fails — a prompt the user
        dismissed, or an authenticator that was not ready. Retrying needs a
        gesture; the first attempt does not. And only when retrying could work:
        an unsupported authenticator will not become supported on a second tap.
      */}
      {failed && error?.isRecoverable ? (
        <Button size='big' variant='dark' type='button' className='passflow-button-passkey' withIcon onClick={() => void run()}>
          <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
          Try again
        </Button>
      ) : null}
    </DeviceShell>
  );
};
