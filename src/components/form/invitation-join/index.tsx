/* eslint-disable max-len */
/* eslint-disable complexity */
import { FC, useState } from 'react';
import * as Yup from 'yup';
import { InvitationToken, parseToken } from '@passflow/passflow-js-sdk';
import { Error as ErrorComponent } from '@/components/error';
import { Button } from '@/components/ui';
import { Wrapper } from '../wrapper';
import { useJoinInvite, useNavigation, usePassflow } from '@/hooks';
import '@/styles/index.css';
import { withError } from '@/hocs';
import { undefinedOnCatch, useUrlParams } from '@/utils';

const searchParamsInvitationJoinSchema = Yup.object().shape({
  token: Yup.string().required(),
});

const InvitationJoinFlow: FC = () => {
  const { navigate } = useNavigation();
  const { get } = useUrlParams();
  const passflow = usePassflow();
  const { fetch: joinInvite, isLoading: isInvitationJoinLoading, error, isError } = useJoinInvite();
  const [isLoading, setLoading] = useState(false);

  const params = {
    token: get('token'),
  };

  try {
    searchParamsInvitationJoinSchema.validateSync(params, { abortEarly: false });
  } catch (err) {
    throw new Error('Invalid invitation token.');
  }

  const { token: invitationToken } = params;

  const invitationTokenData = invitationToken ? undefinedOnCatch(parseToken)(invitationToken) : undefined;

  const onClickAcceptInvitationHandler = async (successJoinPath: string) => {
    if (invitationToken) {
      const invitationJoinResponse = await joinInvite(invitationToken);
      if (invitationJoinResponse) {
        setLoading(true);
        const refreshTokenResponse = await passflow.refreshToken();
        setLoading(false);
        if (refreshTokenResponse) navigate({to: successJoinPath});
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
      <Wrapper title='Join to Passflow'>
        <span className='passflow-block passflow-text-body-2-medium passflow-text-Grey-One passflow-text-center passflow-mt-[8px]'>
          {inviterName} has invited you to workspace
          <br /> <strong className='passflow-text-body-2-bold'>{tenantName}</strong>
        </span>
        <Button
          size='big'
          type='button'
          variant='primary'
          className='passflow-mt-[32px] passflow-mx-auto'
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
