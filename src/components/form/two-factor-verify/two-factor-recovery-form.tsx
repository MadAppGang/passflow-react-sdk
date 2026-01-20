import { Button, Icon } from '@/components/ui';
import { useTwoFactorVerify } from '@/hooks';
import { TwoFactorLoopPrevention, cn, getUserFriendlyErrorMessage } from '@/utils';
import type { ChangeEvent, FC, FormEvent } from 'react';
import { useState } from 'react';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';

type TwoFactorRecoveryFormProps = {
  onSuccess?: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  signInPath?: string;
};

export const TwoFactorRecoveryForm: FC<TwoFactorRecoveryFormProps> = ({
  onSuccess,
  onBack,
  title = 'Use Recovery Code',
  subtitle = 'Enter one of your recovery codes',
  signInPath,
}) => {
  const [code, setCode] = useState('');
  const { useRecoveryCode, isLoading, isError, errorDetails, reset } = useTwoFactorVerify();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    reset();
    // Normalize: uppercase and remove spaces
    setCode(e.target.value.toUpperCase().replace(/\s/g, ''));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const result = await useRecoveryCode(code);
    if (result) {
      onSuccess?.();
    }
  };

  const handleBackToSignIn = () => {
    TwoFactorLoopPrevention.reset();
    window.location.href = signInPath || '/signin';
  };

  // Check if loop detected
  const isLoopDetected = !TwoFactorLoopPrevention.canRedirect();

  // Render error content (same logic as verify form)
  const renderErrorContent = () => {
    if (!isError || !errorDetails) return null;

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

    if (errorDetails.type === 'not_enabled') {
      return (
        <div className='passflow-form-error passflow-form-error--persistent'>
          <Icon size='medium' id='warning' type='general' className='icon-warning' />
          <div className='passflow-form-error-content'>
            <span className='passflow-form-error-text'>{getUserFriendlyErrorMessage(errorDetails)}</span>
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

    if (errorDetails.type === 'expired') {
      return (
        <div className='passflow-form-info'>
          <Icon size='small' id='info' type='general' className='icon-info' />
          <span className='passflow-form-info-text'>{getUserFriendlyErrorMessage(errorDetails)}</span>
        </div>
      );
    }

    return (
      <div className='passflow-form-error'>
        <Icon size='small' id='warning' type='general' className='icon-warning' />
        <span className='passflow-form-error-text'>{getUserFriendlyErrorMessage(errorDetails)}</span>
      </div>
    );
  };

  const isInputDisabled =
    isLoading || errorDetails?.type === 'not_enabled' || errorDetails?.type === 'expired' || isLoopDetected;

  return (
    <Wrapper title={title} subtitle={subtitle} className='passflow-2fa-recovery'>
      <form onSubmit={handleSubmit} className='passflow-form'>
        <div className='passflow-form-container'>
          <div className='passflow-form-field'>
            <label htmlFor='recovery-code' className={cn('passflow-field-label', isError && 'passflow-field-label--error')}>
              Recovery Code
            </label>
            <input
              id='recovery-code'
              type='text'
              value={code}
              onChange={handleChange}
              placeholder='XXXX-XXXX'
              className={cn(
                'passflow-field passflow-field--text passflow-field--focused',
                isError && 'passflow-field--error',
                isInputDisabled && 'passflow-field--disabled',
              )}
              autoFocus={!isInputDisabled}
              autoComplete='off'
              disabled={isInputDisabled}
            />
            {renderErrorContent()}
          </div>
        </div>

        {!isInputDisabled && (
          <Button
            size='big'
            type='submit'
            variant='primary'
            disabled={code.length < 8 || isLoading}
            className='passflow-button-signin'
          >
            {isLoading ? 'Verifying...' : 'Verify'}
          </Button>
        )}

        {onBack && !isInputDisabled && (
          <div className='passflow-form-actions'>
            <p className='passflow-dont-have-account'>
              Have your device?{' '}
              <button
                type='button'
                onClick={onBack}
                className='passflow-link'
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Use authenticator code
              </button>
            </p>
          </div>
        )}
      </form>
    </Wrapper>
  );
};
