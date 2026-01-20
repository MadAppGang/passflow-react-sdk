import { TwoFactorRecoveryForm, TwoFactorVerifyForm } from '@/components/form/two-factor-verify';
import { routes } from '@/context';
import { useNavigation, usePassflow, useTwoFactorVerify } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import { TwoFactorLoopPrevention, getUrlWithTokens, isValidUrl } from '@/utils';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import '@/styles/index.css';

type TwoFactorVerifyFlowProps = {
  successAuthRedirect?: SuccessAuthRedirect;
  signInPath?: string;
  twoFactorSetupPath?: string;
};

export const TwoFactorVerifyFlow: FC<TwoFactorVerifyFlowProps> = ({
  successAuthRedirect,
  signInPath = routes.signin.path,
  twoFactorSetupPath = routes.two_factor_setup?.path ?? '/two-factor-setup',
}) => {
  const [mode, setMode] = useState<'verify' | 'recovery'>('verify');
  const [shouldBlockRender, setShouldBlockRender] = useState(false);
  const { navigate } = useNavigation();
  const passflow = usePassflow();
  const { errorType } = useTwoFactorVerify();

  // Handle initial verification requirement check
  useEffect(() => {
    if (!passflow.isTwoFactorVerificationRequired()) {
      // Only redirect if we can safely do so (no loop detected)
      if (TwoFactorLoopPrevention.canRedirect()) {
        TwoFactorLoopPrevention.incrementRedirect();
        navigate({ to: signInPath });
        setShouldBlockRender(true);
      } else {
        // Loop detected - let component render error state
        setShouldBlockRender(false);
      }
    }
  }, [passflow, navigate, signInPath]);

  // Handle error-based redirect
  useEffect(() => {
    if (errorType === 'expired') {
      // Session expired - safe to redirect if no loop detected
      if (TwoFactorLoopPrevention.canRedirect()) {
        TwoFactorLoopPrevention.incrementRedirect();
        TwoFactorLoopPrevention.setLastErrorType('expired');

        // Brief delay for user to see "redirecting" message
        setTimeout(() => {
          navigate({ to: signInPath });
        }, 1500);
      }
    } else if (errorType === 'not_enabled') {
      // Configuration error - DO NOT redirect
      // Track error but don't increment redirect count
      TwoFactorLoopPrevention.setLastErrorType('not_enabled');
    }
  }, [errorType, navigate, signInPath]);

  const handleSuccess = async () => {
    // Reset loop prevention on successful auth
    TwoFactorLoopPrevention.reset();

    if (successAuthRedirect) {
      if (!isValidUrl(successAuthRedirect)) {
        navigate({ to: successAuthRedirect });
      } else {
        window.location.href = await getUrlWithTokens(passflow, successAuthRedirect);
      }
    }
  };

  const handleUseRecovery = () => {
    setMode('recovery');
  };

  const handleBackToVerify = () => {
    setMode('verify');
  };

  // Don't render if we're redirecting
  if (shouldBlockRender) {
    return null;
  }

  // Don't render if verification not required and no loop detected
  if (!passflow.isTwoFactorVerificationRequired() && TwoFactorLoopPrevention.canRedirect()) {
    return null;
  }

  return (
    <>
      {mode === 'verify' ? (
        <TwoFactorVerifyForm
          onSuccess={handleSuccess}
          onUseRecovery={handleUseRecovery}
          signInPath={signInPath}
          twoFactorSetupPath={twoFactorSetupPath}
        />
      ) : (
        <TwoFactorRecoveryForm onSuccess={handleSuccess} onBack={handleBackToVerify} signInPath={signInPath} />
      )}
    </>
  );
};
