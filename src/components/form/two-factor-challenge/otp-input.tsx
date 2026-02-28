import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import OtpInput from 'react-otp-input';

type OtpInputComponentProps = {
  value: string;
  onChange: (value: string) => void;
  numInputs?: number;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
};

export const OtpInputComponent: FC<OtpInputComponentProps> = ({
  value,
  onChange,
  numInputs = 6,
  error,
  disabled = false,
  autoFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && containerRef.current) {
      const firstInput = containerRef.current.querySelector('input');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }, [autoFocus]);

  return (
    <div ref={containerRef} className='pf-otp-input-container'>
      <OtpInput
        value={value}
        onChange={onChange}
        numInputs={numInputs}
        renderSeparator={<span className='pf-otp-separator' />}
        renderInput={(props) => (
          <input
            {...props}
            className={`pf-otp-input ${error ? 'pf-otp-input-error' : ''} ${disabled ? 'pf-otp-input-disabled' : ''}`}
            disabled={disabled}
          />
        )}
        inputType='tel'
        shouldAutoFocus={autoFocus}
      />
      {error && <div className='pf-otp-error'>{error}</div>}
    </div>
  );
};
