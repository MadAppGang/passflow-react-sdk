/* eslint-disable complexity */
import { FC, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { InvitationToken, parseToken } from '@aooth/aooth-js-sdk';
import { Error as ErrorComponent } from '@/components/error';
import { Button } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useAooth, useJoinInvite } from '@/hooks';
import '@/styles/index.css';
import { withError } from '@/hocs';
import { undefinedOnCatch } from '@/utils';

const InvitationJoinFlow: FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const aooth = useAooth();
  const { fetch: joinInvite, isLoading: isInvitationJoinLoading, error, isError } = useJoinInvite();
  const [isLoading, setLoading] = useState(false);
  const invitationToken = searchParams.get('token') ?? undefined;
  const invitationTokenData = invitationToken ? undefinedOnCatch(parseToken)(invitationToken) : undefined;

  const onClickAcceptInvitationHandler = async (successJoinPath: string) => {
    if (invitationToken) {
      const invitationJoinResponse = await joinInvite(invitationToken);
      if (invitationJoinResponse) {
        setLoading(true);
        const refreshTokenResponse = await aooth.refreshToken();
        setLoading(false);
        if (refreshTokenResponse) navigate(successJoinPath);
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

    return (
      <Wrapper title='Join to Aooth'>
        <span className='aooth-block aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center aooth-mt-[8px]'>
          {inviterName} has invited you to workspace
          <br /> <strong className='aooth-text-body-2-bold'>{tenantName}</strong>
        </span>
        <Button
          size='big'
          type='button'
          variant='primary'
          className='aooth-mt-[32px] aooth-mx-auto'
          // eslint-disable-next-line no-void
          onClick={() => void onClickAcceptInvitationHandler(redirectUrl)}
          disabled={isInvitationJoinLoading || isLoading}
        >
          Accept invitation
        </Button>
      </Wrapper>
    );
  }

  return null;
};

export const InvitationJoin = withError(InvitationJoinFlow, ErrorComponent);
