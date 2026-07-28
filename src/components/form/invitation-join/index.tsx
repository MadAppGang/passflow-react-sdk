import { ErrorComponent } from '@/components/error';
import { LoginScreen } from '@/components/ui';
import { routes } from '@/context';
import { withError } from '@/hocs';
import { useAppSettings, useJoinInvite, useNavigation, usePassflow } from '@/hooks';
import { getUrlWithTokens, invitationLinkErrorMessage, isValidUrl, undefinedOnCatch, useUrlParams } from '@/utils';
import { type InvitationToken, parseToken } from '@passflow/core';
import React, { type FC, useEffect } from 'react';

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
  const { get } = useUrlParams();
  const passflow = usePassflow();
  const { fetch: joinInvite, isLoading, error, isError } = useJoinInvite();
  const invitationToken = get('invite_token');
  const invitationTokenData = invitationToken ? undefinedOnCatch(parseToken)(invitationToken) : undefined;
  const parsedTokenCache = passflow.getParsedTokens();
  const hasAuthenticatedSession = Boolean(parsedTokenCache?.access_token);

  useEffect(() => {
    if (invitationTokenData && !hasAuthenticatedSession) {
      navigate({ to: signInPath, search: window.location.search });
    }
  }, [hasAuthenticatedSession, invitationTokenData, navigate, signInPath]);

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

    const successJoinPath = redirectUrl ?? successAuthRedirect ?? appSettings?.defaults?.redirect ?? '';
    if (!isValidUrl(successJoinPath)) navigate({ to: successJoinPath });
    else window.location.href = await getUrlWithTokens(passflow, successJoinPath);
  };

  const navigateToSignIn = () => navigate({ to: signInPath, search: window.location.search });
  const navigateToSignUp = () => navigate({ to: signUpPath, search: window.location.search });

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
