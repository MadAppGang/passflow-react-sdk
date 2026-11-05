import { useEffect, useState } from 'react';
import { SignedInScreen } from '@/components/form/signed-in';
import { routes, useSearchSource } from '@/context';
import { useNavigation, usePassflow, usePasswordlessComplete, useSignInEnding } from '@/hooks';
import { routeToSecondFactor, verificationLinkErrorMessage, verificationRequestErrorMessage } from '@/utils';

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
  const searchSource = useSearchSource();
  const [paramsError, setParamsError] = useState<string | null>(null);
  const { signedIn, finishSignIn } = useSignInEnding();
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
          if (routeToSecondFactor(passflow, navigate, twoFactorVerifyPath, searchSource.read())) return;
          await finishSignIn(response.redirect_url);
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

  if (signedIn) return <SignedInScreen />;

  return null;
};
