import { Button, Icon } from '@/components/ui';
import { useTwoFactorVerify } from '@/hooks';
import { cn } from '@/utils';
import type { ChangeEvent, FC, FormEvent } from 'react';
import { useState } from 'react';
import { Wrapper } from '../wrapper';

import '@/styles/index.css';

type TwoFactorRecoveryFormProps = {
  onSuccess?: () => void;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
};

export const TwoFactorRecoveryForm: FC<TwoFactorRecoveryFormProps> = ({
  onSuccess,
  onBack,
  title = 'Use Recovery Code',
  subtitle = 'Enter one of your recovery codes',
}) => {
  const [code, setCode] = useState('');
  const { useRecoveryCode, isLoading, isError, error, reset } = useTwoFactorVerify();

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

  return (
    <Wrapper title={title} subtitle={subtitle} className="passflow-2fa-recovery">
      <form onSubmit={handleSubmit} className="passflow-2fa-recovery-form">
        <div className="passflow-field-wrapper">
          <input
            type="text"
            value={code}
            onChange={handleChange}
            placeholder="XXXX-XXXX"
            className={cn('passflow-field passflow-field--text', isError && 'passflow-field--error')}
            autoFocus
            autoComplete="off"
          />
          {isError && (
            <div className="passflow-field-error">
              <Icon size="small" id="warning" type="general" className="icon-warning" />
              <span className="passflow-field-error-text">{error}</span>
            </div>
          )}
        </div>

        <Button size="big" type="submit" variant="primary" disabled={code.length < 8 || isLoading}>
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>

        {onBack && (
          <button type="button" className="passflow-link-button" onClick={onBack}>
            Use authenticator code instead
          </button>
        )}
      </form>
    </Wrapper>
  );
};
