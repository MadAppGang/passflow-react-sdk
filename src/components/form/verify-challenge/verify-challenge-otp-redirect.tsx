import { routes } from '@/context';
import { useNavigation, usePassflow, usePasswordlessComplete } from '@/hooks';
import {
  getUrlWithTokens,
  isValidUrl,
  routeToSecondFactor,
  verificationLinkErrorMessage,
  verificationRequestErrorMessage,
} from '@/utils';
import React, { useEffect, useState } from 'react';
import { VerifyChallengeSuccess } from './verify-challenge-success';

type VerifyChallengeOTPRedirectProps = {
  appId: string | null;
  otp: string | null;
  challengeId: string | null;
  twoFactorVerifyPath?: string;
};

export const VerifyChallengeOTPRedirect = ({
  otp,
  challengeId,
  appId,
  twoFactorVerifyPath = routes.two_factor_verify.path,
}: VerifyChallengeOTPRedirectProps) => {
  const passflow = usePassflow();
  const { navigate } = useNavigation();
  const [paramsError, setParamsError] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const { fetch, isError, error, isLoading } = usePasswordlessComplete();

  // Run once on mount - intentionally empty dependency array
  useEffect(() => {
    const fetchData = async () => {
      if (!appId || !otp || !challengeId) {
        const missingParameters = [!appId && 'app_id', !otp && 'otp', !challengeId && 'challenge_id'].filter(Boolean);
        console.error('[passflow] passwordless verification redirect is missing required parameters', missingParameters);
        setParamsError(verificationLinkErrorMessage);
        return;
      }

      if (!isLoading) {
        const response = await fetch({ otp, challenge_id: challengeId });

        if (response) {
          // The link completed the first factor only: no tokens yet.
          if (routeToSecondFactor(passflow, navigate, twoFactorVerifyPath)) return;
          if (response.redirect_url) {
            if (!isValidUrl(response.redirect_url)) navigate({ to: response.redirect_url });
            else window.location.href = await getUrlWithTokens(passflow, response.redirect_url);
          } else {
            setShowSuccessMessage(true);
          }
        } else {
          setParamsError(verificationRequestErrorMessage);
        }
      }
    };

    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isError && error) throw new Error(error);

  if (paramsError) throw new Error(paramsError);

  if (showSuccessMessage) return <VerifyChallengeSuccess />;

  return null;
};
