import type { FC, FormEvent } from 'react';
import { useId, useState } from 'react';
import { Button, FieldOtp, Icon } from '@/components/ui';
import { useTwoFactorSetup } from '@/hooks';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';

type TwoFactorSetupFormProps = {
  onComplete?: (recoveryCodes: string[]) => void;
  onCancel?: () => void;
  numInputs?: number;
};

export const TwoFactorSetupForm: FC<TwoFactorSetupFormProps> = ({ onComplete, onCancel, numInputs }) => {
  const [code, setCode] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const { setupData, recoveryCodes, step, beginSetup, confirmSetup, reset, isLoading, isError, error } = useTwoFactorSetup();
  const otpId = useId();
  const otpLabelId = `${otpId}-label`;
  const otpErrorId = `${otpId}-error`;

  // Get TOTP digits (defaults to 6 if not provided)
  const totpDigits = numInputs ?? 6;

  const handleCodeChange = (value: string) => {
    setCode(value);
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    const result = await confirmSetup(code);
    if (result) {
      // Don't call onComplete yet - wait for user to save codes
    }
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
  };

  const handleComplete = () => {
    onComplete?.(recoveryCodes);
    reset();
  };

  // Step 1: Start setup
  if (step === 'idle') {
    return (
      <Wrapper
        title='Enable Two-Factor Authentication'
        subtitle='Add an extra layer of security to your account'
        className='passflow-2fa-setup'
      >
        <div className='passflow-2fa-setup-start'>
          <Button size='big' type='button' variant='primary' onClick={() => beginSetup()} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Get Started'}
          </Button>
          {onCancel && (
            <button type='button' className='passflow-link-button' onClick={onCancel}>
              Cancel
            </button>
          )}
          {isError && (
            <div className='passflow-field-error'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='passflow-field-error-text'>{error}</span>
            </div>
          )}
        </div>
      </Wrapper>
    );
  }

  // Step 2: Show QR code and confirm
  if (step === 'setup' && setupData) {
    return (
      <Wrapper
        title='Scan QR Code'
        subtitle='Scan this code with your authenticator app (Google Authenticator, Authy, etc.)'
        className='passflow-2fa-setup'
      >
        <form onSubmit={handleConfirm} className='passflow-2fa-setup-qr'>
          <div className='passflow-2fa-qr-container'>
            <img src={`data:image/png;base64,${setupData.qr_code}`} alt='2FA QR Code' className='passflow-2fa-qr-image' />
          </div>

          <div className='passflow-2fa-secret-toggle'>
            <button type='button' className='passflow-link-button' onClick={() => setShowSecret(!showSecret)}>
              {showSecret ? 'Hide manual code' : "Can't scan? Enter code manually"}
            </button>
            {showSecret && <code className='passflow-2fa-secret-code'>{setupData.secret}</code>}
          </div>

          <div className='passflow-2fa-confirm-section'>
            <p id={otpLabelId} className='passflow-2fa-confirm-label'>
              Enter the {totpDigits}-digit code from your app to confirm:
            </p>
            <div id='otp-wrapper' className='passflow-verify-otp-wrapper'>
              <FieldOtp
                id={otpId}
                name='code'
                length={totpDigits}
                value={code}
                onChange={handleCodeChange}
                state={isError ? 'error' : 'default'}
                labelledBy={otpLabelId}
                describedBy={isError ? otpErrorId : undefined}
                autoFocus
              />
              {isError && (
                <div className='passflow-verify-otp-error'>
                  <Icon size='small' id='warning' type='general' className='icon-warning' />
                  <span id={otpErrorId} className='passflow-verify-otp-error-text'>
                    {error}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button size='big' type='submit' variant='primary' disabled={code.length !== totpDigits || isLoading}>
            {isLoading ? 'Confirming...' : 'Confirm & Enable'}
          </Button>
        </form>
      </Wrapper>
    );
  }

  // Step 3: Show recovery codes
  if (step === 'complete' && recoveryCodes.length > 0) {
    return (
      <Wrapper
        title='Save Your Recovery Codes'
        subtitle="Store these codes in a safe place. You'll need them if you lose access to your authenticator."
        className='passflow-2fa-setup'
      >
        <div className='passflow-2fa-setup-complete'>
          <div className='passflow-2fa-warning'>
            <Icon size='small' id='warning' type='general' className='icon-warning' />
            <span>These codes will only be shown once. Make sure to save them!</span>
          </div>

          <div className='passflow-2fa-recovery-codes'>
            {recoveryCodes.map((recoveryCode) => (
              <code key={recoveryCode} className='passflow-2fa-recovery-code'>
                {recoveryCode}
              </code>
            ))}
          </div>

          <Button size='big' type='button' variant='secondary' onClick={handleCopyRecoveryCodes}>
            Copy to Clipboard
          </Button>

          <Button size='big' type='button' variant='primary' onClick={handleComplete}>
            I've Saved These Codes
          </Button>
        </div>
      </Wrapper>
    );
  }

  return null;
};
