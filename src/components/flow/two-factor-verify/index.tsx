import type { FC } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { SignInEndingScreen } from '@/components/form/signed-in';
import { TwoFactorRecoveryForm, TwoFactorVerifyForm } from '@/components/form/two-factor-verify';
import { hasFollowedOIDCRedirect } from '@/components/provider/passflow-provider';
import { LoginScreen } from '@/components/ui';
import { routes, useSearchSource } from '@/context';
import { useNavigation, usePassflow, useSignInEnding } from '@/hooks';
import { useTwoFactorEnrollment } from '@/hooks/use-two-factor-enrollment';
import type { SuccessAuthRedirect } from '@/types';
import { signInSearch } from '@/utils';
import { getTwoFactorEnrollmentScreenProps } from './screen';

import '@/styles/index.css';

type TwoFactorVerifyFlowProps = {
  successAuthRedirect?: SuccessAuthRedirect;
  signInPath?: string;
};

export const TwoFactorVerifyFlow: FC<TwoFactorVerifyFlowProps> = ({ successAuthRedirect, signInPath = routes.signin.path }) => {
  const [mode, setMode] = useState<'verify' | 'recovery'>('verify');
  const { navigate } = useNavigation();
  const passflow = usePassflow();
  const { ending, retry, finishSignIn } = useSignInEnding();
  const searchSource = useSearchSource();
  // Read once: a screen must not blank when core's 5 minute pending state expires under it.
  const [pendingOnLanding] = useState(() => passflow.isTwoFactorVerificationRequired());

  const goToSignIn = useCallback(
    () => navigate({ to: signInPath, search: signInSearch(searchSource.read()) }),
    [navigate, signInPath, searchSource],
  );

  const continueSignIn = async () => {
    // `/auth/2fa/*` is an interceptor-matched endpoint, so an OIDC login that
    // required a second factor has already been dispatched back to the RP by
    // the time this runs. Navigating again would cancel that in flight — see
    // `hasFollowedOIDCRedirect`.
    if (hasFollowedOIDCRedirect()) return;

    try {
      // With nowhere to go the user stays: the screen is already the finished one, which says they are signed in.
      await finishSignIn(
        successAuthRedirect,
        successAuthRedirect ? undefined : (await passflow.getAppSettings()).defaults?.redirect,
      );
    } catch {
      // No target to go to: as above.
    }
  };

  const enrollment = useTwoFactorEnrollment({ onFinished: () => void continueSignIn() });

  // This cannot loop: the sign-in screen sends the user back here only with a pending sign-in.
  useEffect(() => {
    if (!pendingOnLanding) goToSignIn();
  }, [pendingOnLanding, goToSignIn]);

  if (!pendingOnLanding) return null;

  // The finished screen already says the user is signed in; only a target that could not be used needs its own.
  if (ending === 'checking' || ending === 'refused' || ending === 'unavailable' || ending === 'service-unavailable')
    return <SignInEndingScreen ending={ending} onRetry={retry} />;

  const screenProps = getTwoFactorEnrollmentScreenProps(enrollment, goToSignIn);
  if (screenProps) return <LoginScreen {...screenProps} />;

  const { screen } = enrollment;

  return mode === 'verify' ? (
    <TwoFactorVerifyForm
      subtitle={screen.kind === 'verify' ? screen.notice : undefined}
      numInputs={screen.kind === 'verify' ? screen.digits : undefined}
      onSuccess={enrollment.complete}
      onUseRecovery={() => setMode('recovery')}
      onEnded={enrollment.end}
      onBackToSignIn={goToSignIn}
    />
  ) : (
    <TwoFactorRecoveryForm
      onSuccess={enrollment.complete}
      onBack={() => setMode('verify')}
      onEnded={enrollment.end}
      onBackToSignIn={goToSignIn}
    />
  );
};
