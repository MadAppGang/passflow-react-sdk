import type { FC } from 'react';
import { LoginScreen, type LoginScreenAction } from '@/components/ui';
import { useTwoFactorSetup } from '@/hooks';
import { twoFactorBackToSignInLabel } from '@/utils';
import { getTwoFactorRecoveryCodesScreen, getTwoFactorSetupCodeScreen, getTwoFactorSetupStartScreen } from './setup-screen';

import '@/styles/index.css';

type TwoFactorSetupFormProps = {
  onComplete?: (recoveryCodes: string[]) => void;
  /** The way out of the first step only. */
  onCancel?: () => void;
  /** The way out of the first step and the code step, labelled Back to sign in. */
  onBackToSignIn?: () => void;
  numInputs?: number;
};

export const TwoFactorSetupForm: FC<TwoFactorSetupFormProps> = ({ onComplete, onCancel, onBackToSignIn, numInputs }) => {
  const { setupData, recoveryCodes, step, beginSetup, confirmSetup, reset, isLoading, isError, error } = useTwoFactorSetup();
  const shownError = isError ? error : null;
  const backToSignIn: LoginScreenAction | undefined = onBackToSignIn
    ? { label: twoFactorBackToSignInLabel, onClick: onBackToSignIn }
    : undefined;
  const cancel: LoginScreenAction | undefined = onCancel ? { label: 'Cancel', onClick: onCancel } : undefined;

  const handleComplete = () => {
    // A caller that gets `onComplete` owns the next step: its session may be gone, so the form stays on the codes.
    if (onComplete) onComplete(recoveryCodes);
    else reset();
  };

  if (step === 'idle') {
    return (
      <LoginScreen
        {...getTwoFactorSetupStartScreen({
          busy: isLoading,
          error: shownError,
          secondaryAction: backToSignIn ?? cancel,
          onStart: () => void beginSetup(),
        })}
      />
    );
  }

  if (step === 'setup' && setupData) {
    return (
      <LoginScreen
        {...getTwoFactorSetupCodeScreen({
          data: setupData,
          fallbackDigits: numInputs,
          busy: isLoading,
          error: shownError,
          secondaryAction: backToSignIn,
          onSubmit: (code) => void confirmSetup(code),
        })}
      />
    );
  }

  if (step === 'complete') {
    return (
      <LoginScreen {...getTwoFactorRecoveryCodesScreen({ codes: recoveryCodes, busy: false, onContinue: handleComplete })} />
    );
  }

  return null;
};
