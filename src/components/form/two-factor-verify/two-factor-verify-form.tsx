import { Button, Icon } from '@/components/ui';
import { useTwoFactorVerify } from '@/hooks';
import { cn } from '@/utils';
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
};

export const TwoFactorVerifyForm: FC<TwoFactorVerifyFormProps> = ({
  onSuccess,
  onUseRecovery,
  title = 'Two-Factor Authentication',
  subtitle = 'Enter the 6-digit code from your authenticator app',
  numInputs = 6,
  shouldAutoFocus = true,
}) => {
  const [code, setCode] = useState('');
  const { verify, isLoading, isError, error, reset } = useTwoFactorVerify();

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
    if (value.length === numInputs) {
      const result = await verify(value);
      if (result) {
        onSuccess?.();
      }
    }
  };

  return (
    <Wrapper title={title} subtitle={subtitle} className='passflow-2fa-verify'>
      <form onSubmit={handleSubmit} className='passflow-2fa-verify-form'>
        <div id='otp-wrapper' className='passflow-verify-otp-wrapper'>
          <OtpInput
            value={code}
            onChange={handleOtpChange}
            numInputs={numInputs}
            shouldAutoFocus={shouldAutoFocus}
            skipDefaultStyles
            containerStyle='passflow-verify-otp-inputs'
            inputStyle={cn('passflow-field-otp passflow-field-otp--focused', isError && 'passflow-field-otp--error')}
            inputType='text'
            renderInput={(props) => <input {...props} />}
          />
          {isError && (
            <div className='passflow-verify-otp-error'>
              <Icon size='small' id='warning' type='general' className='icon-warning' />
              <span className='passflow-verify-otp-error-text'>{error}</span>
            </div>
          )}
        </div>

        <Button size='big' type='submit' variant='primary' disabled={code.length !== numInputs || isLoading}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>

        {onUseRecovery && (
          <button type='button' className='passflow-link-button' onClick={onUseRecovery}>
            Use recovery code instead
          </button>
        )}
      </form>
    </Wrapper>
  );
};
