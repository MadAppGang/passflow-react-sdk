import { Button, Icon } from '@/components/ui';
import { useTwoFactorVerify } from '@/hooks';
import { TwoFactorLoopPrevention, cn, getUserFriendlyErrorMessage } from '@/utils';
import type { FC, FormEvent } from 'react';
import { useState } from 'react';
import OtpInput from 'react-otp-input';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';

type TwoFactorVerifyFormProps = {
  onSuccess?: () => void;
  onUseRecovery?: () => void;
  title?: string;
  subtitle?: string;
  numInputs?: number;
  shouldAutoFocus?: boolean;
  signInPath?: string;
  twoFactorSetupPath?: string;
};

export const TwoFactorVerifyForm: FC<TwoFactorVerifyFormProps> = ({
  onSuccess,
  onUseRecovery,
  title = 'Two-Factor Authentication',
  subtitle,
  numInputs,
  shouldAutoFocus = true,
  signInPath,
  twoFactorSetupPath,
}) => {
  const [code, setCode] = useState('');
  const { verify, isLoading, isError, errorDetails, reset } = useTwoFactorVerify();

  // Get TOTP digits (defaults to 6 if not provided)
  const totpDigits = numInputs ?? 6;

  // Compute subtitle dynamically based on totpDigits
  const computedSubtitle = subtitle ?? `Enter the ${totpDigits}-digit code from your authenticator app`;

  const handleChange = (value: string) => {
    reset();
    setCode(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await verify(code);
    if (result) {
      onSuccess?.();
    }
  };

  // Auto-submit when code is complete
  const handleOtpChange = async (value: string) => {
    handleChange(value);
    if (value.length === totpDigits) {
      const result = await verify(value);
      if (result) {
        onSuccess?.();
      }
    }
  };

  const handleBackToSignIn = () => {
    TwoFactorLoopPrevention.reset();
    window.location.href = signInPath || '/signin';
  };

  const handleSetup2FA = () => {
    // Navigate to 2FA setup page
    window.location.href = twoFactorSetupPath || '/two-factor-setup';
  };

  // Check if loop detected
  const isLoopDetected = !TwoFactorLoopPrevention.canRedirect();

  // Render different UI based on error type
  const renderErrorContent = () => {
    if (!isError || !errorDetails) return null;

    // Loop detected - critical error
    if (isLoopDetected) {
      return (
        <div className='passflow-form-error passflow-form-error--critical'>
          <Icon size='medium' id='warning' type='general' className='icon-warning' />
          <div className='passflow-form-error-content'>
            <span className='passflow-form-error-text'>{TwoFactorLoopPrevention.getLoopDetectedMessage()}</span>
            {signInPath && (
              <Button
                type='button'
                size='medium'
                variant='secondary'
                onClick={handleBackToSignIn}
                className='passflow-button-back-to-signin'
              >
                Back to Sign In
              </Button>
            )}
          </div>
        </div>
      );
    }

    // 2FA not enabled - needs setup
    if (errorDetails.type === 'not_enabled') {
      return (
        <div className='passflow-form-error passflow-form-error--persistent'>
          <Icon size='medium' id='warning' type='general' className='icon-warning' />
          <div className='passflow-form-error-content'>
            <span className='passflow-form-error-text'>You need to set up two-factor authentication first.</span>
            <div className='passflow-form-error-actions'>
              {twoFactorSetupPath && (
                <Button
                  type='button'
                  size='medium'
                  variant='primary'
                  onClick={handleSetup2FA}
                  className='passflow-button-setup-2fa'
                >
                  Set Up 2FA
                </Button>
              )}
              {signInPath && (
                <Button
                  type='button'
                  size='medium'
                  variant='secondary'
                  onClick={handleBackToSignIn}
                  className='passflow-button-back-to-signin'
                >
                  Back to Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Expired session - show redirect message
    if (errorDetails.type === 'expired') {
      return (
        <div className='passflow-form-info'>
          <Icon size='small' id='info' type='general' className='icon-info' />
          <span className='passflow-form-info-text'>{getUserFriendlyErrorMessage(errorDetails)}</span>
        </div>
      );
    }

    // Invalid code or generic - allow retry
    return (
      <div className='passflow-form-error'>
        <Icon size='small' id='warning' type='general' className='icon-warning' />
        <span className='passflow-form-error-text'>{getUserFriendlyErrorMessage(errorDetails)}</span>
      </div>
    );
  };

  // Disable input for non-recoverable errors
  const isInputDisabled =
    isLoading || errorDetails?.type === 'not_enabled' || errorDetails?.type === 'expired' || isLoopDetected;

  return (
    <Wrapper title={title} subtitle={computedSubtitle} className='passflow-2fa-verify'>
      <form onSubmit={handleSubmit} className='passflow-form'>
        <div className='passflow-form-container'>
          <div className='passflow-verify-otp-wrapper'>
            <OtpInput
              value={code}
              onChange={handleOtpChange}
              numInputs={totpDigits}
              shouldAutoFocus={shouldAutoFocus && !isInputDisabled}
              skipDefaultStyles
              containerStyle='passflow-verify-otp-inputs'
              inputStyle={cn(
                'passflow-field-otp passflow-field-otp--focused',
                isError && 'passflow-field-otp--error',
                isInputDisabled && 'passflow-field-otp--disabled',
              )}
              inputType='text'
              renderInput={(props) => <input {...props} disabled={isInputDisabled} />}
            />
          </div>
          {renderErrorContent()}
        </div>

        {!isInputDisabled && (
          <Button
            size='big'
            type='submit'
            variant='primary'
            disabled={code.length !== totpDigits || isLoading}
            className='passflow-button-signin'
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        )}

        {onUseRecovery && !isInputDisabled && (
          <div className='passflow-form-actions'>
            <p className='passflow-dont-have-account'>
              Lost your device?{' '}
              <button
                type='button'
                onClick={onUseRecovery}
                className='passflow-link'
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Use recovery code
              </button>
            </p>
          </div>
        )}
      </form>
    </Wrapper>
  );
};
