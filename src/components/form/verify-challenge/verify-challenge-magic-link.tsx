/* eslint-disable no-nested-ternary */
import type { PassflowPasswordlessResponse, PassflowPasswordlessSignInPayload } from '@passflow/core';
import { type FC, useEffect, useMemo, useState } from 'react';
import { SignInEndingScreen } from '@/components/form/signed-in';
import { Button, LoginScreen } from '@/components/ui';
import { routes, useSearchSource } from '@/context';
import { useAppSettings, useNavigation, usePassflow, useSignIn, useSignInEnding } from '@/hooks';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';
import {
  passwordlessLinkExpiredMessage,
  passwordlessSignInFailedMessage,
  passwordlessWaitCompletedMessage,
  passwordlessWaitDeniedMessage,
  routeToSecondFactor,
  signInSearch,
  useUrlParams,
} from '@/utils';

const challengeTypeFullString = {
  email: 'email address',
  phone: 'phone number',
};

const WAIT_FAILURE_MESSAGES = {
  denied: passwordlessWaitDeniedMessage,
  expired: passwordlessLinkExpiredMessage,
  completed: passwordlessWaitCompletedMessage,
};

const useResendPayload = () => {
  const { get } = useUrlParams({
    identity: '',
    identity_value: '',
    challenge_type: '',
    type: '',
    redirect_url: '',
  });

  const identity = get('email') ? 'email' : get('phone') ? 'phone' : undefined;
  const identityValue = get('email') ? get('email') : get('phone') ? get('phone') : undefined;
  const redirectUrl = get('redirect_url');

  return {
    identity,
    identityValue,
    redirectUrl,
    type: get('type') as 'passkey' | 'password' | 'passwordless',
    resendPayload: {
      ...(identity === 'email' ? { email: identityValue } : undefined),
      ...(identity === 'phone' ? { phone: identityValue } : undefined),
      challenge_type: get('challenge_type'),
      redirect_url: redirectUrl,
    } as PassflowPasswordlessSignInPayload,
  };
};

/** A link was sent and this tab has nothing to wait for: the user follows it. */
const MagicLinkSent: FC = () => {
  const { currentStyles, loginAppTheme } = useAppSettings();
  const { fetch: refetch } = useSignIn();
  const { identity, identityValue, type, resendPayload } = useResendPayload();

  const onClickResendHandler = async () => {
    await refetch(resendPayload, type);
  };

  return (
    <Wrapper
      title='Check your email'
      className='passflow-verify-challenge-magic-link-wrapper'
      customCss={currentStyles?.custom_css}
      customLogo={currentStyles?.logo_url}
      removeBranding={loginAppTheme?.remove_passflow_logo}
    >
      <div className='passflow-verify-challenge-magic-link-container'>
        <p className='passflow-verify-challenge-magic-link-text'>
          We sent a link to {challengeTypeFullString[identity as keyof typeof challengeTypeFullString]}{' '}
          {identityValue && <strong className='passflow-verify-challenge-magic-link-text--strong'>{identityValue}</strong>}.
          Click on the link to confirm your registration.
        </p>
        {type === 'passwordless' && (
          <Button
            size='big'
            variant='secondary'
            type='button'
            className='passflow-button-resend-magic-link'
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={onClickResendHandler}
          >
            Resend email
          </Button>
        )}
      </div>
    </Wrapper>
  );
};

type MagicLinkWaitingProps = {
  challengeId: string;
  matchCode: string;
  signInPath: string;
  onResent: (answer: PassflowPasswordlessResponse) => void;
};

/** This tab started the sign-in and holds its secret: it shows the code and takes the session once the link is approved. */
const MagicLinkWaiting: FC<MagicLinkWaitingProps> = ({ challengeId, matchCode, signInPath, onResent }) => {
  const passflow = usePassflow();
  const { currentStyles, loginAppTheme } = useAppSettings();
  const { navigate, twoFactorVerifyPath = routes.two_factor_verify.path } = useNavigation();
  const { fetch: refetch, isLoading: isResending, isError: isResendError, error: resendError } = useSignIn();
  const searchSource = useSearchSource();
  const { redirectUrl, type, resendPayload } = useResendPayload();
  const { ending, retry, finishSignIn } = useSignInEnding();
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const wait = async () => {
      try {
        const result = await passflow.waitForPasswordlessSignIn(challengeId, { signal });
        if (signal.aborted) return;

        if (result.status === 'signed-in') {
          await finishSignIn(redirectUrl);
        } else if (result.status === 'second-factor-required') {
          if (!routeToSecondFactor(passflow, navigate, twoFactorVerifyPath, searchSource.read()))
            setFailure(passwordlessSignInFailedMessage);
        } else {
          setFailure(WAIT_FAILURE_MESSAGES[result.status]);
        }
      } catch (error) {
        if (signal.aborted) return;
        console.error('[passflow] waiting for the passwordless sign-in failed', error);
        setFailure(passwordlessSignInFailedMessage);
      }
    };
    void wait();

    return () => controller.abort();
  }, [passflow, challengeId]);

  const resend = async () => {
    const answer = await refetch(resendPayload, 'passwordless');
    if (answer) onResent(answer as PassflowPasswordlessResponse);
  };

  if (ending !== 'none') return <SignInEndingScreen ending={ending} onRetry={retry} />;

  const chrome = {
    customCss: currentStyles?.custom_css,
    customLogo: currentStyles?.logo_url,
    customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
    removeBranding: loginAppTheme?.remove_passflow_logo,
  };

  if (failure) {
    return (
      <LoginScreen
        chrome={{ ...chrome, title: 'Sign-in not completed' }}
        state={{
          kind: 'status',
          tone: 'error',
          message: failure,
          testId: 'passwordless-wait-failure',
          primaryAction: {
            label: 'Start again',
            onClick: () => navigate({ to: signInPath, search: signInSearch(searchSource.read()) }),
          },
        }}
      />
    );
  }

  return (
    <LoginScreen
      chrome={{ ...chrome, title: 'Check your email' }}
      state={{
        kind: 'passwordless-waiting',
        matchCode,
        error: isResendError ? resendError?.message : null,
        resend:
          type === 'passwordless' ? { restartKey: challengeId, busy: isResending, onResend: () => void resend() } : undefined,
        testId: 'passwordless-waiting',
        codeTestId: 'passwordless-match-code',
      }}
    />
  );
};

type VerifyChallengeMagicLinkProps = {
  signInPath?: string;
};

export const VerifyChallengeMagicLink: FC<VerifyChallengeMagicLinkProps> = ({ signInPath = routes.signin.path }) => {
  const passflow = usePassflow();
  const { get, set } = useUrlParams();
  // The address bar does not re-render on a write, so a resend asks for it.
  const [, setResendCount] = useState(0);
  const challengeId = get('challenge_id');

  // Read once per challenge: core drops the record when the wait ends, and the outcome must stay on this screen.
  const pending = useMemo(() => (challengeId ? passflow.getPendingPasswordlessSignIn(challengeId) : undefined), [challengeId]);

  if (!challengeId || !pending) return <MagicLinkSent />;

  return (
    <MagicLinkWaiting
      challengeId={challengeId}
      matchCode={pending.matchCode}
      signInPath={signInPath}
      onResent={(answer) => {
        set({ challenge_id: answer.challenge_id, expires_at: String(answer.expires_at) });
        setResendCount((count) => count + 1);
      }}
    />
  );
};
