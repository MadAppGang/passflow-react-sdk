# Two-Factor Authentication (2FA) React SDK Changes

This document outlines all changes needed to add 2FA support to `@passflow/react` based on the `@passflow/core@0.1.0` 2FA implementation.

## Prerequisites

Update `@passflow/core` peer dependency to `^0.1.0` in `package.json`.

---

## 1. New Hooks

### File: `src/hooks/use-two-factor-status.ts`

```typescript
import { useCallback, useLayoutEffect, useState } from 'react';
import type { TwoFactorStatusResponse } from '@passflow/core';
import { usePassflow } from './use-passflow';

/**
 * Hook to get the current 2FA enrollment status
 */
export const useTwoFactorStatus = () => {
  const passflow = usePassflow();
  const [data, setData] = useState<TwoFactorStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setErrorMessage('');
    try {
      const response = await passflow.getTwoFactorStatus();
      setData(response);
      return response;
    } catch (error) {
      setIsError(true);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to get 2FA status');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  useLayoutEffect(() => {
    void fetch();
  }, [fetch]);

  return {
    data,
    refetch: fetch,
    isLoading,
    isError,
    errorMessage,
  };
};
```

### File: `src/hooks/use-two-factor-setup.ts`

```typescript
import { useCallback, useState } from 'react';
import type { TwoFactorSetupResponse, TwoFactorConfirmResponse } from '@passflow/core';
import { usePassflow } from './use-passflow';

/**
 * Hook to handle 2FA setup flow (enable 2FA)
 */
export const useTwoFactorSetup = () => {
  const passflow = usePassflow();
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'idle' | 'setup' | 'confirm' | 'complete'>('idle');

  const beginSetup = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      const response = await passflow.beginTwoFactorSetup();
      setSetupData(response);
      setStep('setup');
      return response;
    } catch (e) {
      setIsError(true);
      setError(e instanceof Error ? e.message : 'Failed to begin 2FA setup');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const confirmSetup = useCallback(async (code: string) => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      const response = await passflow.confirmTwoFactorSetup(code);
      setRecoveryCodes(response.recovery_codes);
      setStep('complete');
      return response;
    } catch (e) {
      setIsError(true);
      setError(e instanceof Error ? e.message : 'Invalid code');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const reset = useCallback(() => {
    setSetupData(null);
    setRecoveryCodes([]);
    setIsError(false);
    setError('');
    setStep('idle');
  }, []);

  return {
    setupData,
    recoveryCodes,
    step,
    beginSetup,
    confirmSetup,
    reset,
    isLoading,
    isError,
    error,
  };
};
```

### File: `src/hooks/use-two-factor-verify.ts`

```typescript
import { useCallback, useState } from 'react';
import { usePassflow } from './use-passflow';

/**
 * Hook to verify 2FA code during login
 */
export const useTwoFactorVerify = () => {
  const passflow = usePassflow();
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');

  const isVerificationRequired = useCallback(() => {
    return passflow.isTwoFactorVerificationRequired();
  }, [passflow]);

  const verify = useCallback(async (code: string) => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      const response = await passflow.verifyTwoFactor(code);
      return response;
    } catch (e) {
      setIsError(true);
      setError(e instanceof Error ? e.message : 'Invalid code');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const useRecoveryCode = useCallback(async (code: string) => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      const response = await passflow.useTwoFactorRecoveryCode(code);
      return response;
    } catch (e) {
      setIsError(true);
      setError(e instanceof Error ? e.message : 'Invalid recovery code');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const reset = useCallback(() => {
    setIsError(false);
    setError('');
  }, []);

  return {
    isVerificationRequired,
    verify,
    useRecoveryCode,
    reset,
    isLoading,
    isError,
    error,
  };
};
```

### File: `src/hooks/use-two-factor-manage.ts`

```typescript
import { useCallback, useState } from 'react';
import type { TwoFactorRegenerateResponse } from '@passflow/core';
import { usePassflow } from './use-passflow';

/**
 * Hook to manage 2FA (disable, regenerate codes)
 */
export const useTwoFactorManage = () => {
  const passflow = usePassflow();
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState('');

  const disable = useCallback(async (code: string) => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      await passflow.disableTwoFactor(code);
      return true;
    } catch (e) {
      setIsError(true);
      setError(e instanceof Error ? e.message : 'Failed to disable 2FA');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const regenerateCodes = useCallback(async (code: string) => {
    setIsLoading(true);
    setIsError(false);
    setError('');
    try {
      const response = await passflow.regenerateTwoFactorRecoveryCodes(code);
      setRecoveryCodes(response.recovery_codes);
      return response;
    } catch (e) {
      setIsError(true);
      setError(e instanceof Error ? e.message : 'Failed to regenerate codes');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [passflow]);

  const reset = useCallback(() => {
    setRecoveryCodes([]);
    setIsError(false);
    setError('');
  }, []);

  return {
    recoveryCodes,
    disable,
    regenerateCodes,
    reset,
    isLoading,
    isError,
    error,
  };
};
```

---

## 2. Update Hooks Index

### File: `src/hooks/index.ts` (add exports)

```typescript
// Add these exports:
export * from './use-two-factor-status';
export * from './use-two-factor-setup';
export * from './use-two-factor-verify';
export * from './use-two-factor-manage';
```

---

## 3. New Form Components

### File: `src/components/form/two-factor-verify/two-factor-verify-form.tsx`

```typescript
import { type FC, useState } from 'react';
import OtpInput from 'react-otp-input';
import { useTwoFactorVerify } from '../../../hooks';
import { Button } from '../../ui';

interface TwoFactorVerifyFormProps {
  onSuccess?: () => void;
  onUseRecovery?: () => void;
}

export const TwoFactorVerifyForm: FC<TwoFactorVerifyFormProps> = ({
  onSuccess,
  onUseRecovery,
}) => {
  const [code, setCode] = useState('');
  const { verify, isLoading, isError, error, reset } = useTwoFactorVerify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await verify(code);
    if (result) {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="passflow-2fa-verify-form">
      <div className="passflow-2fa-verify-header">
        <h2>Two-Factor Authentication</h2>
        <p>Enter the 6-digit code from your authenticator app</p>
      </div>

      <OtpInput
        value={code}
        onChange={(value) => {
          reset();
          setCode(value);
        }}
        numInputs={6}
        renderInput={(props) => <input {...props} />}
        inputStyle="passflow-otp-input"
        containerStyle="passflow-otp-container"
        shouldAutoFocus
      />

      {isError && (
        <div className="passflow-error-message">{error}</div>
      )}

      <Button
        type="submit"
        disabled={code.length !== 6 || isLoading}
        loading={isLoading}
      >
        Verify
      </Button>

      {onUseRecovery && (
        <button
          type="button"
          className="passflow-link-button"
          onClick={onUseRecovery}
        >
          Use recovery code instead
        </button>
      )}
    </form>
  );
};
```

### File: `src/components/form/two-factor-verify/two-factor-recovery-form.tsx`

```typescript
import { type FC, useState } from 'react';
import { useTwoFactorVerify } from '../../../hooks';
import { Button } from '../../ui';

interface TwoFactorRecoveryFormProps {
  onSuccess?: () => void;
  onBack?: () => void;
}

export const TwoFactorRecoveryForm: FC<TwoFactorRecoveryFormProps> = ({
  onSuccess,
  onBack,
}) => {
  const [code, setCode] = useState('');
  const { useRecoveryCode, isLoading, isError, error, reset } = useTwoFactorVerify();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await useRecoveryCode(code);
    if (result) {
      onSuccess?.();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="passflow-2fa-recovery-form">
      <div className="passflow-2fa-recovery-header">
        <h2>Use Recovery Code</h2>
        <p>Enter one of your recovery codes</p>
      </div>

      <input
        type="text"
        value={code}
        onChange={(e) => {
          reset();
          setCode(e.target.value.toUpperCase());
        }}
        placeholder="XXXX-XXXX"
        className="passflow-recovery-input"
        autoFocus
      />

      {isError && (
        <div className="passflow-error-message">{error}</div>
      )}

      <Button
        type="submit"
        disabled={code.length < 8 || isLoading}
        loading={isLoading}
      >
        Verify
      </Button>

      {onBack && (
        <button
          type="button"
          className="passflow-link-button"
          onClick={onBack}
        >
          Use authenticator code instead
        </button>
      )}
    </form>
  );
};
```

### File: `src/components/form/two-factor-verify/index.ts`

```typescript
export * from './two-factor-verify-form';
export * from './two-factor-recovery-form';
```

### File: `src/components/form/two-factor-setup/two-factor-setup-form.tsx`

```typescript
import { type FC, useState } from 'react';
import OtpInput from 'react-otp-input';
import { useTwoFactorSetup } from '../../../hooks';
import { Button } from '../../ui';

interface TwoFactorSetupFormProps {
  onComplete?: (recoveryCodes: string[]) => void;
  onCancel?: () => void;
}

export const TwoFactorSetupForm: FC<TwoFactorSetupFormProps> = ({
  onComplete,
  onCancel,
}) => {
  const [code, setCode] = useState('');
  const {
    setupData,
    recoveryCodes,
    step,
    beginSetup,
    confirmSetup,
    reset,
    isLoading,
    isError,
    error,
  } = useTwoFactorSetup();

  const handleBegin = async () => {
    await beginSetup();
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await confirmSetup(code);
    if (result) {
      onComplete?.(result.recovery_codes);
    }
  };

  // Step 1: Start setup
  if (step === 'idle') {
    return (
      <div className="passflow-2fa-setup-start">
        <h2>Enable Two-Factor Authentication</h2>
        <p>Add an extra layer of security to your account</p>
        <Button onClick={handleBegin} loading={isLoading}>
          Get Started
        </Button>
        {onCancel && (
          <button type="button" className="passflow-link-button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    );
  }

  // Step 2: Show QR code and confirm
  if (step === 'setup' && setupData) {
    return (
      <form onSubmit={handleConfirm} className="passflow-2fa-setup-qr">
        <h2>Scan QR Code</h2>
        <p>Scan this code with your authenticator app</p>

        <div className="passflow-qr-container">
          <img src={`data:image/png;base64,${setupData.qr_code}`} alt="2FA QR Code" />
        </div>

        <details className="passflow-secret-details">
          <summary>Can't scan? Enter code manually</summary>
          <code className="passflow-secret-code">{setupData.secret}</code>
        </details>

        <div className="passflow-confirm-code">
          <label>Enter the 6-digit code from your app</label>
          <OtpInput
            value={code}
            onChange={(value) => {
              reset();
              setCode(value);
            }}
            numInputs={6}
            renderInput={(props) => <input {...props} />}
            inputStyle="passflow-otp-input"
            containerStyle="passflow-otp-container"
          />
        </div>

        {isError && <div className="passflow-error-message">{error}</div>}

        <Button type="submit" disabled={code.length !== 6 || isLoading} loading={isLoading}>
          Confirm & Enable
        </Button>
      </form>
    );
  }

  // Step 3: Show recovery codes
  if (step === 'complete' && recoveryCodes.length > 0) {
    return (
      <div className="passflow-2fa-setup-complete">
        <h2>Save Your Recovery Codes</h2>
        <p className="passflow-warning">
          Store these codes in a safe place. You'll need them if you lose access to your authenticator.
        </p>

        <div className="passflow-recovery-codes">
          {recoveryCodes.map((code, index) => (
            <code key={index} className="passflow-recovery-code">
              {code}
            </code>
          ))}
        </div>

        <Button
          onClick={() => {
            navigator.clipboard.writeText(recoveryCodes.join('\n'));
          }}
          variant="secondary"
        >
          Copy to Clipboard
        </Button>

        <Button onClick={() => onComplete?.(recoveryCodes)}>
          I've Saved These Codes
        </Button>
      </div>
    );
  }

  return null;
};
```

### File: `src/components/form/two-factor-setup/index.ts`

```typescript
export * from './two-factor-setup-form';
```

---

## 4. Update Form Index

### File: `src/components/form/index.ts` (add exports)

```typescript
// Add these exports:
export * from './two-factor-verify';
export * from './two-factor-setup';
```

---

## 5. Update Main Index

### File: `src/index.ts` (add exports)

```typescript
// Add to existing exports:
export * from './hooks/use-two-factor-status';
export * from './hooks/use-two-factor-setup';
export * from './hooks/use-two-factor-verify';
export * from './hooks/use-two-factor-manage';
export * from './components/form/two-factor-verify';
export * from './components/form/two-factor-setup';
```

---

## 6. Update Package.json

```json
{
  "peerDependencies": {
    "@passflow/core": "^0.1.0"
  }
}
```

---

## 7. Integration with SignIn Flow

Modify `src/components/form/signin/signin-form.tsx` to detect 2FA requirement:

```typescript
// After successful signIn that returns requires_2fa:
if (response?.requires_2fa) {
  // Show TwoFactorVerifyForm
  setShow2FA(true);
  return;
}
```

---

## Summary of Files to Create/Modify

### New Files (8):
1. `src/hooks/use-two-factor-status.ts`
2. `src/hooks/use-two-factor-setup.ts`
3. `src/hooks/use-two-factor-verify.ts`
4. `src/hooks/use-two-factor-manage.ts`
5. `src/components/form/two-factor-verify/two-factor-verify-form.tsx`
6. `src/components/form/two-factor-verify/two-factor-recovery-form.tsx`
7. `src/components/form/two-factor-verify/index.ts`
8. `src/components/form/two-factor-setup/two-factor-setup-form.tsx`
9. `src/components/form/two-factor-setup/index.ts`

### Modified Files (3):
1. `src/hooks/index.ts` - Add 4 hook exports
2. `src/components/form/index.ts` - Add 2 component exports
3. `src/index.ts` - Add all new exports
4. `package.json` - Update peer dependency

---

## Usage Examples

### Enable 2FA in Settings

```tsx
import { TwoFactorSetupForm, useTwoFactorStatus } from '@passflow/react';

function SecuritySettings() {
  const { data: status, refetch } = useTwoFactorStatus();

  if (status?.enabled) {
    return <div>2FA is enabled</div>;
  }

  return (
    <TwoFactorSetupForm
      onComplete={(codes) => {
        console.log('Recovery codes:', codes);
        refetch();
      }}
    />
  );
}
```

### Handle 2FA During Login

```tsx
import { useState } from 'react';
import { useSignIn, TwoFactorVerifyForm } from '@passflow/react';

function LoginPage() {
  const [needs2FA, setNeeds2FA] = useState(false);
  const { fetch: signIn } = useSignIn();

  const handleSignIn = async (email: string, password: string) => {
    const response = await signIn({ email, password }, 'password');
    if (response?.requires_2fa) {
      setNeeds2FA(true);
    }
  };

  if (needs2FA) {
    return <TwoFactorVerifyForm onSuccess={() => navigate('/dashboard')} />;
  }

  return <SignInForm onSubmit={handleSignIn} />;
}
```

### Check 2FA Status

```tsx
import { useTwoFactorStatus, useTwoFactorManage } from '@passflow/react';

function TwoFactorSettings() {
  const { data: status } = useTwoFactorStatus();
  const { disable, regenerateCodes, recoveryCodes } = useTwoFactorManage();

  return (
    <div>
      <p>2FA: {status?.enabled ? 'Enabled' : 'Disabled'}</p>
      <p>Recovery codes remaining: {status?.recovery_codes_remaining}</p>

      {status?.enabled && (
        <>
          <button onClick={() => regenerateCodes('123456')}>
            Regenerate Recovery Codes
          </button>
          <button onClick={() => disable('123456')}>
            Disable 2FA
          </button>
        </>
      )}
    </div>
  );
}
```
