/* eslint-disable complexity */
import { FC, useState } from "react";
import { Button } from "@/components/ui";
import { Wrapper } from "../wrapper";
import { useAooth, useAppSettings, useJoinInvite } from "@/hooks";
import "@/styles/index.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import { InvitationToken, parseToken } from "@aooth/aooth-js-sdk";

type TInvitationJoin = {
  signInPath: string;
};

function undefinedOnCatch<T, K>(fn: (t: K) => T): (t: K) => T | undefined {
  return (t: K) => {
    try {
      return fn(t);
    } catch (error) {
      return undefined;
    }
  };
}

export const InvitationJoin: FC<TInvitationJoin> = () => {
  useAppSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const aooth = useAooth();
  const { fetch: joinInvite, isLoading: isInvitationJoinLoading } =
    useJoinInvite();
  const [isLoading, setLoading] = useState(false);
  const invitationToken = searchParams.get("token") ?? undefined;
  const invitationTokenData = invitationToken
    ? undefinedOnCatch(parseToken)(invitationToken)
    : undefined;

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

  if (invitationTokenData) {
    const {
      inviter_name: inviterName,
      tenant_name: tenantName,
      redirect_url: redirectUrl,
    } = invitationTokenData as InvitationToken;

    return (
      <Wrapper title="Join to Aooth">
        <span className="aooth-block aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center aooth-mt-[8px]">
          {inviterName} has invited you to workspace
          <br />{" "}
          <strong className="aooth-text-body-2-bold">{tenantName}</strong>
        </span>
        <Button
          size="big"
          type="button"
          variant="primary"
          className="aooth-mt-[32px] aooth-mx-auto"
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
