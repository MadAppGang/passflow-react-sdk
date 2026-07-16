import { Button, FieldPassword, FieldText, Icon } from '@/components/ui';
import type { UseDeviceVerifyProps } from '@/hooks/use-device-verify';
import type { FC } from 'react';
import { useState } from 'react';
import { DeviceErrorMessage, DeviceShell, DeviceUserCode } from './device-shell';
import '@/styles/index.css';

/**
 * Mode 1 — the RFC 8628 §5.4 device-code consent screen.
 *
 * The app name and the code are the entire point of this screen: together they
 * are what lets a human notice that they did not start this. They are rendered
 * first, largest, and before anything else — a consent screen that buries either
 * one is a phishing surface that asks "approve?" about nothing.
 *
 * One tap does sign-in and approval together (see confirmWithPassword). That is
 * the "1 tap" the mode promises, and it costs nothing: the §5.4 check is that a
 * human read the code and chose to proceed, which is exactly what the tap is.
 *
 * Also the destination for `qr_approval` and for an unrecognised mode — the
 * server degrades toward this screen precisely because it is the one that
 * carries the code check.
 */
export const DeviceConsentForm: FC<{ device: UseDeviceVerifyProps }> = ({ device }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { info, error, status } = device;
  if (!info) return null;

  const busy = status === 'working';
  const signedIn = device.isAuthenticated || status === 'signed_in';
  const showPasswordFields = info.methods.password && !signedIn;

  return (
    <DeviceShell
      title={`Sign in to ${info.app_name}?`}
      subtitle='Check that this code matches the one shown in your terminal.'
      testId='device-consent'
      className='passflow-device-wrapper'
    >
      <div className='passflow-form-container'>
        {/* §5.4, both halves: the code to compare... */}
        {info.user_code ? <DeviceUserCode code={info.user_code} testId='device-consent-user-code' /> : null}
        {/* ...and the name of who is asking. */}
        <p className='passflow-device-text passflow-device-centered-text'>
          <span className='passflow-device-app-name' data-testid='device-consent-app-name'>
            {info.app_name}
          </span>{' '}
          is asking to sign in on a device showing this code.
        </p>
        <p className='passflow-device-hint'>If it doesn't match, close this page — don't approve.</p>

        {showPasswordFields ? (
          <>
            <div className='passflow-form-field'>
              <div className='passflow-form-field__header'>
                <label htmlFor='device-email' className='passflow-field-label'>
                  Email
                </label>
              </div>
              <FieldText
                id='device-email'
                name='email'
                type='email'
                autoComplete='username'
                autoCapitalize='off'
                autoCorrect='off'
                spellCheck={false}
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className='passflow-form-field'>
              <div className='passflow-form-field__header'>
                <label htmlFor='device-password' className='passflow-field-label'>
                  Password
                </label>
              </div>
              <FieldPassword
                id='device-password'
                name='password'
                autoComplete='current-password'
                passwordPolicy={null}
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </>
        ) : null}

        {signedIn ? (
          <div className='passflow-device-success'>
            <Icon size='small' id='check' type='general' className='icon-success' />
            <span className='passflow-device-success-text'>Signed in{device.email ? ` as ${device.email}` : ''}</span>
          </div>
        ) : null}

        <DeviceErrorMessage error={error} />
      </div>

      {/*
        Enabled from the start, and that is the design: this screen asks a
        question you can answer before you identify yourself.
      */}
      <Button
        size='big'
        variant='primary'
        type='button'
        data-testid='device-confirm'
        disabled={busy}
        onClick={() => void device.confirmWithPassword(email, password)}
      >
        {busy ? 'Approving...' : 'Approve'}
      </Button>

      {info.methods.passkey && !signedIn ? (
        <Button
          size='big'
          variant='dark'
          type='button'
          className='passflow-button-passkey'
          withIcon
          disabled={busy}
          onClick={() => void device.confirmWithPasskey()}
        >
          <Icon id='key' size='small' type='general' className='icon-white passflow-button-passkey-icon' />
          Use a passkey instead
        </Button>
      ) : null}

      <p className='passflow-device-hint'>
        Didn't start this on a terminal? Close this page. The request expires by itself in a few minutes.
      </p>
    </DeviceShell>
  );
};
