import { useEffect, useRef, useState } from 'react';
import { SignInEndingScreen } from '@/components/form/signed-in';
import { usePasswordlessComplete, useSignInEnding } from '@/hooks';
import { useSecondFactorRoute } from '@/hooks/use-second-factor-route';
import { verificationLinkErrorMessage, verificationRequestErrorMessage } from '@/utils';

type VerifyChallengeOTPRedirectProps = {
  appId: string | null;
  otp: string | null;
  challengeId: string | null;
  twoFactorVerifyPath?: string;
};

export const VerifyChallengeOTPRedirect = ({ otp, challengeId, appId, twoFactorVerifyPath }: VerifyChallengeOTPRedirectProps) => {
  const routeToSecondFactor = useSecondFactorRoute(twoFactorVerifyPath);
  const [paramsError, setParamsError] = useState<string | null>(null);
  const { ending, retry, finishSignIn } = useSignInEnding();
  const { fetch, isError, error } = usePasswordlessComplete();
  const requested = useRef(false);

  // Once per opened link: the code is single use, so StrictMode's second effect must not send it again.
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const fetchData = async () => {
      if (!appId || !otp || !challengeId) {
        const missingParameters = [!appId && 'app_id', !otp && 'otp', !challengeId && 'challenge_id'].filter(Boolean);
        console.error('[passflow] passwordless verification redirect is missing required parameters', missingParameters);
        setParamsError(verificationLinkErrorMessage);
        return;
      }

      const response = await fetch({ otp, challenge_id: challengeId });

      if (response) {
        // The link completed the first factor only: no tokens yet.
        if (routeToSecondFactor()) return;
        await finishSignIn(response.redirect_url);
      } else {
        setParamsError(verificationRequestErrorMessage);
      }
    };

    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isError && error) throw new Error(error);

  if (paramsError) throw new Error(paramsError);

  if (ending !== 'none') return <SignInEndingScreen ending={ending} onRetry={retry} />;

  return null;
};
