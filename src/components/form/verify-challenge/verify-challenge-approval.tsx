import type { PasswordlessApprovalInfo } from '@passflow/core';
import { type FC, useEffect, useState } from 'react';
import { LoginScreen, type LoginScreenState } from '@/components/ui';
import { useAppSettings, usePassflow } from '@/hooks';
import {
  approvalAlreadyDecidedMessage,
  approvalApprovedMessage,
  approvalDeniedMessage,
  approvalErrorFrom,
  approvalInvalidMessage,
  passwordlessLinkExpiredMessage,
} from '@/utils';

type VerifyChallengeApprovalProps = {
  challengeId: string | null;
  otp: string | null;
};

type ApprovalView =
  | { kind: 'loading' }
  | { kind: 'form'; info: PasswordlessApprovalInfo }
  | { kind: 'decided'; message: string }
  | { kind: 'terminal'; message: string }
  | { kind: 'load-failed'; message: string };

const viewFromInfo = (info: PasswordlessApprovalInfo): ApprovalView => {
  if (info.state === 'pending') return { kind: 'form', info };
  if (info.state === 'expired') return { kind: 'terminal', message: passwordlessLinkExpiredMessage };
  return { kind: 'terminal', message: approvalAlreadyDecidedMessage };
};

/**
 * The device that opened an emailed link on a row only another device can sign in with. Opening it writes nothing: the
 * user reads the request, then signs in or answers that it wasn't them, in one click. Errors from these calls are
 * plain and carry no code, but are not logged here anyway, because this screen holds the OTP.
 */
export const VerifyChallengeApproval: FC<VerifyChallengeApprovalProps> = ({ challengeId, otp }) => {
  const passflow = usePassflow();
  const { currentStyles, loginAppTheme } = useAppSettings();
  const [view, setView] = useState<ApprovalView>(
    challengeId && otp ? { kind: 'loading' } : { kind: 'terminal', message: approvalInvalidMessage },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  // `loadAttempt` only triggers a retry; `passflow` is left out so a replaced instance does not reload a request on screen.
  useEffect(() => {
    if (!challengeId || !otp) return undefined;
    let left = false;

    const load = async () => {
      try {
        const info = await passflow.getPasswordlessApproval(challengeId);
        if (!left) setView(viewFromInfo(info));
      } catch (loadError) {
        if (left) return;
        const { message, terminal } = approvalErrorFrom(loadError);
        setView(terminal ? { kind: 'terminal', message } : { kind: 'load-failed', message });
      }
    };
    void load();

    return () => {
      left = true;
    };
  }, [challengeId, otp, loadAttempt]);

  const decide = async (approve: boolean) => {
    if (!challengeId || !otp) return;
    setBusy(true);
    setError(null);
    try {
      await passflow.decidePasswordlessApproval(challengeId, otp, approve);
      setView({ kind: 'decided', message: approve ? approvalApprovedMessage : approvalDeniedMessage });
    } catch (decideError) {
      const { message, terminal } = approvalErrorFrom(decideError);
      if (terminal) setView({ kind: 'terminal', message });
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  const screenState = ((): LoginScreenState => {
    switch (view.kind) {
      case 'loading':
        return { kind: 'passwordless-approval', loading: true };
      case 'form': {
        const { info } = view;
        return {
          kind: 'passwordless-approval',
          appName: info.app_name,
          browser: info.browser,
          os: info.os,
          location: info.location ? [info.location.city, info.location.country].filter(Boolean).join(', ') : null,
          requestedAt: new Date(info.requested_at).toLocaleString(),
          error,
          busy,
          testId: 'passwordless-approval',
          onApprove: () => void decide(true),
          onDeny: () => void decide(false),
        };
      }
      case 'decided':
        return { kind: 'status', tone: 'success', message: view.message };
      case 'terminal':
        return { kind: 'status', tone: 'error', message: view.message };
      case 'load-failed':
        return {
          kind: 'status',
          tone: 'error',
          message: view.message,
          recoverable: true,
          onRetry: () => {
            setView({ kind: 'loading' });
            setLoadAttempt((attempt) => attempt + 1);
          },
        };
    }
  })();

  return (
    <LoginScreen
      chrome={{
        title: view.kind === 'loading' || view.kind === 'form' ? 'Approve sign-in' : 'Sign-in request',
        customCss: currentStyles?.custom_css,
        customLogo: currentStyles?.logo_url,
        customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
        removeBranding: loginAppTheme?.remove_passflow_logo,
      }}
      state={screenState}
    />
  );
};
