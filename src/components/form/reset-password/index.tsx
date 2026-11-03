import { parseToken, type Token } from '@passflow/core';
import type { FC } from 'react';
import * as Yup from 'yup';
import { hasFollowedOIDCRedirect } from '@/components/provider/passflow-provider';
import { LoginScreen, type LoginScreenChrome, type LoginScreenState } from '@/components/ui';
import { routes } from '@/context';
import { useAppSettings, useNavigation, usePassflow, useResetPassword } from '@/hooks';
import type { SuccessAuthRedirect } from '@/types';
import { getUrlWithTokens, isValidUrl, routeToSecondFactor, undefinedOnCatch, useUrlParams } from '@/utils';
import '@/styles/index.css';

const searchParamsResetPasswordSchema = Yup.object().shape({
  token: Yup.string().required(),
});

type TResetPassword = {
  successAuthRedirect?: SuccessAuthRedirect;
  twoFactorVerifyPath?: string;
  /** Where `Back to sign in` goes once the password is saved. */
  signInPath?: string;
};

/**
 * The reset link's claims. A registration continuation link (an account started by email whose code budget ran out)
 * carries `registration_continuation` and no `redirect_url`.
 */
type ResetToken = Token & {
  redirect_url?: string;
  registration_continuation?: string;
};

export const ResetPassword: FC<TResetPassword> = ({
  successAuthRedirect,
  twoFactorVerifyPath = routes.two_factor_verify.path,
  signInPath = routes.signin.path,
}) => {
  const passflow = usePassflow();
  const { fetch, error, isError, isLoading, isPasswordSaved, emailCode } = useResetPassword();
  const { navigate } = useNavigation();
  const { get } = useUrlParams();
  const { appSettings, passwordPolicy, currentStyles, isError: isErrorApp, error: errorApp, loginAppTheme } = useAppSettings();

  if (isErrorApp) throw new Error(errorApp);

  const params = {
    token: get('token'),
  };

  try {
    searchParamsResetPasswordSchema.validateSync(params, { abortEarly: false });
  } catch {
    throw new Error('Invalid reset token.');
  }

  const { token: resetToken } = params;
  const resetTokenData = resetToken ? (undefinedOnCatch(parseToken)(resetToken) as ResetToken | undefined) : undefined;
  const isContinuation = Boolean(resetTokenData?.registration_continuation);

  // A user with 2FA is signed in only once the second factor passes; an OIDC parent's redirect wins over ours.
  const completeSignIn = async (answerRedirectUrl?: string) => {
    if (routeToSecondFactor(passflow, navigate, twoFactorVerifyPath)) return;
    if (hasFollowedOIDCRedirect()) return;
    const redirectUrl =
      answerRedirectUrl ?? resetTokenData?.redirect_url ?? successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
    if (!isValidUrl(redirectUrl)) navigate({ to: redirectUrl });
    else window.location.href = await getUrlWithTokens(passflow, redirectUrl);
  };

  const savePassword = async (password: string) => {
    // The token goes along explicitly: core would otherwise read it from the address bar, which a hash or memory
    // router does not keep.
    if (await fetch(password, resetToken ?? undefined)) await completeSignIn();
  };

  const verifyEmailCode = async (code: string) => {
    const answer = await emailCode.verify(code);
    if (answer) await completeSignIn(answer.redirect_url);
  };

  const backToSignIn = () => {
    emailCode.cancel();
    navigate({ to: signInPath });
  };

  const chrome: LoginScreenChrome = {
    title: isContinuation ? 'Create your password' : 'Reset password',
    subtitle: isContinuation ? 'Finish creating your account' : 'Let’s get you back in.',
    variant: 'reset-password',
    customCss: currentStyles?.custom_css,
    customLogo: currentStyles?.logo_url,
    customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
    removeBranding: loginAppTheme?.remove_passflow_logo,
  };

  const { step } = emailCode;

  const state: LoginScreenState =
    step.kind === 'code'
      ? {
          // No resend: the reset link is spent once the password is saved.
          kind: 'email-code',
          message: step.message,
          error: emailCode.error,
          busy: emailCode.isVerifying,
          secondaryAction: { label: 'Back to sign in', onClick: backToSignIn },
          onSubmit: (code) => void verifyEmailCode(code),
        }
      : step.kind === 'link'
        ? {
            kind: 'status',
            tone: 'info',
            message: step.message,
            primaryAction: { label: 'Back to sign in', onClick: backToSignIn },
          }
        : isPasswordSaved
          ? {
              kind: 'status',
              tone: 'info',
              message: error,
              primaryAction: { label: 'Back to sign in', onClick: backToSignIn },
            }
          : {
              kind: 'new-password',
              passwordPolicy,
              hint: isContinuation ? 'Choose a password to finish creating your account.' : 'Enter your new password below.',
              error: isError ? error : null,
              busy: isLoading,
              submitLabel: isContinuation ? 'Create account' : 'Save new password',
              onSubmit: (password) => void savePassword(password),
            };

  const heading: Pick<LoginScreenChrome, 'title' | 'subtitle'> =
    step.kind === 'code'
      ? { title: 'Verify your email', subtitle: 'Enter the code to finish signing in' }
      : step.kind === 'link'
        ? { title: 'Check your email', subtitle: undefined }
        : isPasswordSaved
          ? { title: 'Password saved', subtitle: undefined }
          : { title: chrome.title, subtitle: chrome.subtitle };

  return <LoginScreen chrome={{ ...chrome, ...heading }} state={state} />;
};
