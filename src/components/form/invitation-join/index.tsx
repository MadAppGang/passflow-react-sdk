import { FC } from 'react';
import { Button } from '@/components/ui';
import { Wrapper } from '../wrapper';
import {
  InvitationToken,
  useAppSettings,
  useGetTokens,
  useJoinInvite,
  useLogout,
  useParseToken,
  useRefreshToken,
} from '@/hooks';
import '@/styles/index.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { TokenType } from '@aooth/aooth-sdk-js';

type TInvitationJoin = {
  signInPath: string;
};

export const InvitationJoin: FC<TInvitationJoin> = ({ signInPath }) => {
  useAppSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tokenByType } = useGetTokens();
  const { fetch, isLoading: isInvitationJoinLoading } = useJoinInvite();
  const { fetch: logOut, isLoading: isLogoutLoading } = useLogout();
  const { fetch: refreshToken, isLoading: isLoadingRefreshToken } = useRefreshToken();

  const invitationToken = searchParams.get('token');
  const idToken = tokenByType(TokenType.id_token);

  const { data: inviteData } = useParseToken(invitationToken);
  const { data: idTokenData } = useParseToken(idToken);

  const isReadyToJoin = idTokenData && inviteData?.email === idTokenData?.email;

  const onClickAcceptInvitationHandler = async (successJoinPath: string) => {
    if (isReadyToJoin && invitationToken) {
      const invitationJoinResponse = await fetch(invitationToken);
      if (invitationJoinResponse) {
        const refreshTokenResponse = await refreshToken();
        if (refreshTokenResponse) navigate(successJoinPath);
      }
    } else {
      const logOutReponse = await logOut();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      localStorage.setItem('aoothInvitationToken', invitationToken!);
      if (logOutReponse) navigate(signInPath);
    }
  };

  if (inviteData) {
    const {
      email,
      inviter_name: inviterName,
      tenant_name: tenantName,
      redirect_url: redirectUrl,
    } = inviteData as InvitationToken;

    return (
      <Wrapper title='Join to Aooth'>
        <span className='aooth-block aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center aooth-mt-[8px]'>
          {inviterName} has invited you to workspace
          <br /> <strong className='aooth-text-body-2-bold'>{tenantName}</strong>
        </span>
        {!isReadyToJoin && (
          <span className='aooth-block aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center aooth-mt-[8px]'>
            To accept the invitation please continue as <br />
            <strong className='aooth-text-body-2-bold'>{email}</strong>
          </span>
        )}
        <Button
          size='big'
          type='button'
          variant='primary'
          className='aooth-mt-[32px] aooth-mx-auto'
          // eslint-disable-next-line no-void
          onClick={() => void onClickAcceptInvitationHandler(redirectUrl)}
          disabled={isInvitationJoinLoading || isLogoutLoading || isLoadingRefreshToken}
        >
          {isReadyToJoin ? 'Accept invitation' : 'Continue'}
        </Button>
      </Wrapper>
    );
  }

  return null;
};
