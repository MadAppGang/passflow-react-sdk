import { type FC, useEffect, useRef, useState } from 'react';
import { LoginScreen } from '@/components/ui';
import { useTwoFactorVerify } from '@/hooks';
import {
  getUserFriendlyErrorMessage,
  isTerminalTwoFactorError,
  twoFactorBackToSignInLabel,
  twoFactorWrongRecoveryCodeMessage,
} from '@/utils';

import '@/styles/index.css';

type TwoFactorRecoveryFormProps = {
  onSuccess?: () => void;
  onBack?: () => void;
  /** The server ended the sign-in, or locked it for too many attempts. The form still shows why when this is not handled. */
  onEnded?: (type: 'expired' | 'rate_limited') => void;
  /** The way out once no further code can be taken. */
  onBackToSignIn?: () => void;
  title?: string;
  subtitle?: string;
  /** Label of the "trust this device" option, unticked by default. */
  trustDeviceLabel?: string;
};

/** Only a ticked box asks for trust; an unticked one sends no option at all. */
const completionOptions = (trustDevice: boolean) => (trustDevice ? { trustDevice: true } : undefined);

export const TwoFactorRecoveryForm: FC<TwoFactorRecoveryFormProps> = ({
  onSuccess,
  onBack,
  onEnded,
  onBackToSignIn,
  title = 'Use Recovery Code',
  subtitle = 'Enter one of your recovery codes',
  trustDeviceLabel = 'Trust this device',
}) => {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const { useRecoveryCode: redeemRecoveryCode, isLoading, isError, errorDetails, reset } = useTwoFactorVerify();
  const errorType = errorDetails?.type;

  // Once per error, whatever the caller's callback identity does.
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  useEffect(() => {
    if (errorType === 'expired' || errorType === 'rate_limited') onEndedRef.current?.(errorType);
  }, [errorType]);

  const handleCodeChange = (value: string) => {
    reset();
    // Normalize: uppercase and remove spaces
    setCode(value.toUpperCase().replace(/\s/g, ''));
  };

  const handleSubmit = async () => {
    const result = await redeemRecoveryCode(code, completionOptions(trustDevice));
    if (result) onSuccess?.();
  };

  const locked = isTerminalTwoFactorError(errorType);
  const errorMessage = errorDetails
    ? errorType === 'invalid_code'
      ? twoFactorWrongRecoveryCodeMessage
      : getUserFriendlyErrorMessage(errorDetails)
    : '';

  return (
    <LoginScreen
      chrome={{ title, subtitle }}
      state={{
        kind: 'two-factor-code',
        factor: { type: 'recovery', placeholder: 'XXXX-XXXX' },
        label: 'Recovery Code',
        code,
        trustDevice: { label: trustDeviceLabel, checked: trustDevice, onChange: setTrustDevice },
        busy: isLoading,
        canSubmit: code.length >= 8,
        locked,
        alert:
          isError && errorDetails ? { message: errorMessage, tone: errorType === 'expired' ? 'info' : 'error' } : undefined,
        submitLabel: 'Verify',
        busyLabel: 'Verifying...',
        alternate: onBack ? { prompt: 'Have your device?', label: 'Use authenticator code', onClick: onBack } : undefined,
        secondaryAction: locked && onBackToSignIn ? { label: twoFactorBackToSignInLabel, onClick: onBackToSignIn } : undefined,
        testId: 'two-factor-recovery',
        onCodeChange: handleCodeChange,
        onSubmit: () => void handleSubmit(),
      }}
    />
  );
};
