import { ErrorComponent } from '@/components/error';
import { Button } from '@/components/ui';
import { useAppSettings, useJoinInvite, useNavigation, usePassflow } from '@/hooks';
import { type InvitationToken, parseToken } from '@passflow/core';
import React, { type FC } from 'react';
import * as Yup from 'yup';
import { Wrapper } from '../wrapper';
import '@/styles/index.css';
import { routes } from '@/context';
import { withError } from '@/hocs';
import { getUrlWithTokens, isValidUrl, undefinedOnCatch, useUrlParams } from '@/utils';

const searchParamsInvitationJoinSchema = Yup.object().shape({
  invite_token: Yup.string().required(),
});

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
  const { fetch: joinInvite, isLoading: isInvitationJoinLoading, error, isError } = useJoinInvite();

  const params = {
    invite_token: get('invite_token'),
  };

  try {
    searchParamsInvitationJoinSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid invitation token.');
  }

  const { invite_token: invitationToken } = params;

  const invitationTokenData = invitationToken ? undefinedOnCatch(parseToken)(invitationToken) : undefined;

  const onClickAcceptInvitationHandler = async (successJoinPath: string) => {
    if (invitationToken) {
      const invitationJoinResponse = await joinInvite(invitationToken);
      if (invitationJoinResponse) {
        if (!isValidUrl(successJoinPath)) navigate({ to: successJoinPath });
        else window.location.href = await getUrlWithTokens(passflow, successJoinPath);
      }
    }
  };

  if (isError && error) throw Error(error);

  if (!invitationTokenData) throw Error('Invalid invitation token.');

  if (invitationTokenData) {
    const {
      inviter_name: inviterName,
      tenant_name: tenantName,
      redirect_url: redirectUrl,
    } = invitationTokenData as InvitationToken;

    const parsedTokenCache = passflow.getParsedTokenCache();

    const onClickNavigateToSignInHandler = () => navigate({ to: signInPath, search: window.location.search });
    const onClickNavigateToSignUpHandler = () => navigate({ to: signUpPath, search: window.location.search });

    if (!parsedTokenCache?.access_token) onClickNavigateToSignInHandler();

    return (
      <Wrapper
        title={`${inviterName || 'Someone'} invited you to join the ${tenantName} - want to accept?`}
        className='passflow-invitation-join-wrapper'
        customCss={currentStyles?.custom_css}
        customLogo={currentStyles?.logo_url}
        removeBranding={loginAppTheme?.remove_passflow_logo}
      >
        {parsedTokenCache?.access_token && parsedTokenCache.id_token && (
          <span className='passflow-invitation-join-text'>
            You're signed in as{' '}
            <strong className='passflow-invitation-join-text-strong'>{parsedTokenCache.id_token?.email}</strong> right now. Do
            you want keep going as{' '}
            <strong className='passflow-invitation-join-text-strong'>{parsedTokenCache.id_token?.email}</strong> or switch to
            different account?
          </span>
        )}
        {parsedTokenCache?.access_token && (
          <Button
            size='big'
            type='button'
            variant='primary'
            className='passflow-button-invitation-join'
            // biome-ignore lint/style/noNonNullAssertion: <explanation>
            onClick={() => void onClickAcceptInvitationHandler(redirectUrl ?? successAuthRedirect ?? appSettings!.defaults.redirect)}
            disabled={isInvitationJoinLoading}
          >
            Accept invitation
          </Button>
        )}
        <div className='passflow-invitation-join-actions' style={!parsedTokenCache?.access_token ? { marginTop: '32px' } : {}}>
          <Button
            size='big'
            type='button'
            variant='secondary'
            className='passflow-button-invitation-join-switch'
            onClick={onClickNavigateToSignInHandler}
            disabled={isInvitationJoinLoading}
          >
            Switch account
          </Button>
          <Button
            size='big'
            type='button'
            variant='secondary'
            className='passflow-button-invitation-join-register'
            onClick={onClickNavigateToSignUpHandler}
            disabled={isInvitationJoinLoading}
          >
            Register new user
          </Button>
        </div>
      </Wrapper>
    );
  }

  return null;
};

export const InvitationJoin = withError(InvitationJoinFlow, ErrorComponent);
