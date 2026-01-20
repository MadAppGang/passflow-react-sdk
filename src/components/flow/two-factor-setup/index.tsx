import { TwoFactorSetupForm } from '@/components/form/two-factor-setup';
import { routes } from '@/context';
import { useNavigation, usePassflow } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import { TwoFactorLoopPrevention } from '@/utils';
import type { FC } from 'react';
import { useEffect, useState } from 'react';

import '@/styles/index.css';

type TwoFactorSetupFlowProps = {
  successAuthRedirect?: SuccessAuthRedirect;
  twoFactorVerifyPath?: string;
  signInPath?: string;
};

export const TwoFactorSetupFlow: FC<TwoFactorSetupFlowProps> = ({
  twoFactorVerifyPath = routes.two_factor_verify.path,
  signInPath = routes.signin.path,
}) => {
  const [shouldBlockRender, setShouldBlockRender] = useState(false);
  const { navigate } = useNavigation();
  const passflow = usePassflow();

  // Handle initial verification requirement check
  // User must be in partial auth state (have tfa_token) to access setup
  useEffect(() => {
    if (!passflow.isTwoFactorVerificationRequired()) {
      // Not in partial auth state - redirect to sign-in
      if (TwoFactorLoopPrevention.canRedirect()) {
        TwoFactorLoopPrevention.incrementRedirect();
        navigate({ to: signInPath });
        setShouldBlockRender(true);
      } else {
        // Loop detected - let component handle gracefully
        setShouldBlockRender(false);
      }
    }
  }, [passflow, navigate, signInPath]);

  const handleSetupComplete = () => {
    // After setup is complete, redirect back to verify flow
    // User now has 2FA enabled and needs to verify with a code
    navigate({ to: twoFactorVerifyPath });
  };

  const handleCancel = () => {
    // User cancelled setup - reset loop prevention and go back to sign-in
    TwoFactorLoopPrevention.reset();
    navigate({ to: signInPath });
  };

  // Don't render if we're redirecting
  if (shouldBlockRender) {
    return null;
  }

  // Don't render if verification not required and no loop detected
  if (!passflow.isTwoFactorVerificationRequired() && TwoFactorLoopPrevention.canRedirect()) {
    return null;
  }

  return <TwoFactorSetupForm onComplete={handleSetupComplete} onCancel={handleCancel} />;
};
