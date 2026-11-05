import type { TwoFactorMethod } from '@passflow/core';
import type { FC } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { FieldOtp } from '@/components/ui';
import { useTwoFactorChallenge } from '@/hooks/use-two-factor-challenge';
import { MethodSelector } from './method-selector';

type TwoFactorChallengeProps = {
  firstFactorMethod?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  trustDevice?: boolean;
};

export const TwoFactorChallenge: FC<TwoFactorChallengeProps> = ({
  firstFactorMethod,
  onSuccess,
  onError,
  trustDevice = false,
}) => {
  const { challenge, isLoading, error, requestChallenge, verify, switchMethod, selectedMethod } = useTwoFactorChallenge();

  const [otpValue, setOtpValue] = useState('');
  const [isMethodSelectorOpen, setIsMethodSelectorOpen] = useState(false);
  const otpId = useId();
  const otpLabelId = `${otpId}-label`;
  const otpErrorId = `${otpId}-error`;

  // Once per method: every request spends budget, so StrictMode's second effect must not send another.
  // Starts at null because `firstFactorMethod` may be undefined and must still request on mount.
  const requested = useRef<string | undefined | null>(null);
  useEffect(() => {
    if (requested.current === firstFactorMethod) return;
    requested.current = firstFactorMethod;
    requestChallenge(firstFactorMethod);
  }, [requestChallenge, firstFactorMethod]);

  // Handle errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleVerify = async () => {
    if (!otpValue) {
      return;
    }

    const result = await verify(otpValue, trustDevice);
    if (result) {
      onSuccess?.();
    }
  };

  const handleSwitchMethod = async (method: TwoFactorMethod) => {
    setOtpValue('');
    await switchMethod(method);
  };

  const handleOtpChange = (value: string) => {
    setOtpValue(value);

    // Auto-submit when OTP is complete (6 digits)
    if (value.length === 6) {
      setTimeout(() => {
        verify(value, trustDevice).then((result) => {
          if (result) {
            onSuccess?.();
          }
        });
      }, 100);
    }
  };

  if (!challenge) {
    return (
      <div className='pf-two-factor-challenge pf-loading'>
        <p>Loading challenge...</p>
      </div>
    );
  }

  const currentMethod = selectedMethod || challenge.method;
  const availableMethods = [challenge.method, ...(challenge.alternative_methods || [])];

  const renderChallengeInput = () => {
    switch (currentMethod) {
      case 'totp':
      case 'email_otp':
      case 'sms_otp':
        return (
          <div className='pf-challenge-input-wrapper'>
            <FieldOtp
              id={otpId}
              name='code'
              length={6}
              value={otpValue}
              onChange={handleOtpChange}
              state={isLoading ? 'disabled' : error ? 'error' : 'default'}
              labelledBy={otpLabelId}
              describedBy={error ? otpErrorId : undefined}
              autoFocus
            />
            {error && (
              <div id={otpErrorId} className='pf-otp-error'>
                {error.message}
              </div>
            )}
            {currentMethod === 'email_otp' && challenge.code_sent_to && (
              <p className='pf-challenge-hint'>Code sent to {challenge.code_sent_to}</p>
            )}
            {currentMethod === 'sms_otp' && challenge.code_sent_to && (
              <p className='pf-challenge-hint'>Code sent to {challenge.code_sent_to}</p>
            )}
            <button
              type='button'
              onClick={handleVerify}
              disabled={isLoading || otpValue.length !== 6}
              className='pf-button pf-button-primary'
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        );

      case 'passkey':
        return (
          <div className='pf-challenge-input-wrapper'>
            <button type='button' onClick={handleVerify} disabled={isLoading} className='pf-button pf-button-primary'>
              {isLoading ? 'Verifying...' : 'Use Passkey'}
            </button>
          </div>
        );

      case 'recovery_codes':
        return (
          <div className='pf-challenge-input-wrapper'>
            <input
              type='text'
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value)}
              placeholder='Enter recovery code'
              disabled={isLoading}
              className='pf-input'
            />
            <button
              type='button'
              onClick={handleVerify}
              disabled={isLoading || !otpValue}
              className='pf-button pf-button-primary'
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        );

      default:
        return <p>Unsupported method: {currentMethod}</p>;
    }
  };

  return (
    <div className='pf-two-factor-challenge'>
      <div className='pf-challenge-method-info'>
        <h3>Two-Factor Authentication</h3>
        <p id={otpLabelId}>Enter the verification code</p>
      </div>

      {renderChallengeInput()}

      {availableMethods.length > 1 && (
        <button
          type='button'
          onClick={() => setIsMethodSelectorOpen(true)}
          className='pf-button pf-button-secondary pf-button-switch-method'
        >
          Use different method
        </button>
      )}

      <MethodSelector
        availableMethods={availableMethods}
        currentMethod={currentMethod}
        onSelectMethod={handleSwitchMethod}
        isOpen={isMethodSelectorOpen}
        onClose={() => setIsMethodSelectorOpen(false)}
      />
    </div>
  );
};
