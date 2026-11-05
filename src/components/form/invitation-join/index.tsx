import { type InvitationToken, parseToken } from '@passflow/core';
import { type FC, useEffect } from 'react';
import { ErrorComponent } from '@/components/error';
import { SignedInScreen } from '@/components/form/signed-in';
import { LoginScreen } from '@/components/ui';
import { routes, useSearchSource } from '@/context';
import { withError } from '@/hocs';
import { useAppSettings, useJoinInvite, useNavigation, usePassflow, useSignInEnding } from '@/hooks';
import { invitationLinkErrorMessage, undefinedOnCatch, useUrlParams } from '@/utils';

export type TInvitationJoinFlow = {
  successAuthRedirect?: string;
  signInPath?: string;
  signUpPath?: string;
};

const InvitationJoinFlow: FC<TInvitationJoinFlow> = ({
  signInPath = routes.signin.path,
  signUpPath = routes.signup.path,
  successAuthRedirect,
}) => {
  const { appSettings, currentStyles, loginAppTheme } = useAppSettings();
  const { navigate } = useNavigation();
  const searchSource = useSearchSource();
  const { get } = useUrlParams();
  const passflow = usePassflow();
  const { fetch: joinInvite, isLoading, error, isError } = useJoinInvite();
  const invitationToken = get('invite_token');
  const invitationTokenData = invitationToken ? undefinedOnCatch(parseToken)(invitationToken) : undefined;
  const parsedTokenCache = passflow.getParsedTokens();
  const hasAuthenticatedSession = Boolean(parsedTokenCache?.access_token);

  useEffect(() => {
    if (invitationTokenData && !hasAuthenticatedSession) {
      navigate({ to: signInPath, search: searchSource.read() });
    }
  }, [hasAuthenticatedSession, invitationTokenData, navigate, searchSource, signInPath]);

  if (!invitationTokenData) {
    console.error('[passflow] invitation token could not be parsed');
    throw new Error(invitationLinkErrorMessage);
  }
  if (!hasAuthenticatedSession) return null;

  const {
    inviter_name: inviterName,
    tenant_name: tenantName,
    redirect_url: redirectUrl,
  } = invitationTokenData as InvitationToken;

  const acceptInvitation = async () => {
    if (!invitationToken) return;

    const joined = await joinInvite(invitationToken);
    if (!joined) return;

    await finishSignIn(redirectUrl ?? successAuthRedirect ?? appSettings?.defaults?.redirect);
  };

  const { signedIn, finishSignIn } = useSignInEnding();
  const navigateToSignIn = () => navigate({ to: signInPath, search: searchSource.read() });
  const navigateToSignUp = () => navigate({ to: signUpPath, search: searchSource.read() });

  if (signedIn) return <SignedInScreen />;

  return (
    <LoginScreen
      chrome={{
        title: `You've been invited to join ${tenantName}.`,
        subtitle: 'Review the invitation before continuing.',
        customCss: currentStyles?.custom_css,
        customLogo: currentStyles?.logo_url,
        customLogoAlt: `${loginAppTheme?.application_name ?? 'Application'} logo`,
        removeBranding: loginAppTheme?.remove_passflow_logo,
      }}
      state={{
        kind: 'invitation',
        identity: parsedTokenCache?.id_token?.email,
        inviterName: inviterName || undefined,
        busy: isLoading,
        error: isError ? error : null,
        testId: 'invitation-join',
        acceptTestId: 'invitation-accept',
        onAccept: () => void acceptInvitation(),
        onSwitchAccount: navigateToSignIn,
        onCreateAccount: navigateToSignUp,
      }}
    />
  );
};

export const InvitationJoin = withError(InvitationJoinFlow, ErrorComponent);
