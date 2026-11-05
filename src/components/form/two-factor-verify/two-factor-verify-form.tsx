import { type FC, useEffect, useRef, useState } from 'react';
import { LoginScreen } from '@/components/ui';
import { useTwoFactorVerify } from '@/hooks';
import { getUserFriendlyErrorMessage, isTerminalTwoFactorError, twoFactorBackToSignInLabel } from '@/utils';

import '@/styles/index.css';

type TwoFactorVerifyFormProps = {
  onSuccess?: () => void;
  onUseRecovery?: () => void;
  /** The server ended the sign-in, or locked it for too many attempts. The form still shows why when this is not handled. */
  onEnded?: (type: 'expired' | 'rate_limited') => void;
  /** The way out once no further code can be taken. */
  onBackToSignIn?: () => void;
  title?: string;
  subtitle?: string;
  numInputs?: number;
  shouldAutoFocus?: boolean;
  /** Label of the "trust this device" option, unticked by default. */
  trustDeviceLabel?: string;
};

/** Only a ticked box asks for trust; an unticked one sends no option at all. */
const completionOptions = (trustDevice: boolean) => (trustDevice ? { trustDevice: true } : undefined);

export const TwoFactorVerifyForm: FC<TwoFactorVerifyFormProps> = ({
  onSuccess,
  onUseRecovery,
  onEnded,
  onBackToSignIn,
  title = 'Two-Factor Authentication',
  subtitle,
  numInputs,
  shouldAutoFocus = true,
  trustDeviceLabel = 'Trust this device',
}) => {
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const { verify, isLoading, isError, errorDetails, reset } = useTwoFactorVerify();
  const errorType = errorDetails?.type;

  // Get TOTP digits (defaults to 6 if not provided)
  const totpDigits = numInputs ?? 6;

  // Compute subtitle dynamically based on totpDigits
  const computedSubtitle = subtitle ?? `Enter the ${totpDigits}-digit code from your authenticator app`;

  // Once per error, whatever the caller's callback identity does.
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  useEffect(() => {
    if (errorType === 'expired' || errorType === 'rate_limited') onEndedRef.current?.(errorType);
  }, [errorType]);

  const submit = async (value: string) => {
    const result = await verify(value, completionOptions(trustDevice));
    if (result) onSuccess?.();
  };

  // Auto-submit when code is complete
  const handleCodeChange = (value: string) => {
    reset();
    setCode(value);
    if (value.length === totpDigits) void submit(value);
  };

  const locked = isTerminalTwoFactorError(errorType);

  return (
    <LoginScreen
      chrome={{ title, subtitle: computedSubtitle }}
      state={{
        kind: 'two-factor-code',
        factor: { type: 'totp', digits: totpDigits },
        label: 'Verification code',
        code,
        trustDevice: { label: trustDeviceLabel, checked: trustDevice, onChange: setTrustDevice },
        busy: isLoading,
        canSubmit: code.length === totpDigits,
        locked,
        alert:
          isError && errorDetails
            ? { message: getUserFriendlyErrorMessage(errorDetails), tone: errorType === 'expired' ? 'info' : 'error' }
            : undefined,
        submitLabel: 'Verify',
        busyLabel: 'Verifying...',
        alternate: onUseRecovery
          ? { prompt: 'Lost your device?', label: 'Use recovery code', onClick: onUseRecovery }
          : undefined,
        secondaryAction: locked && onBackToSignIn ? { label: twoFactorBackToSignInLabel, onClick: onBackToSignIn } : undefined,
        autoFocus: shouldAutoFocus,
        testId: 'two-factor-verify',
        onCodeChange: handleCodeChange,
        onSubmit: () => void submit(code),
      }}
    />
  );
};
