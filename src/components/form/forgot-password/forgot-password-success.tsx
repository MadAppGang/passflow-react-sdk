import { Navigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui";
import { Wrapper } from "../wrapper";
import { useForgotPassword } from "@/hooks";
import "@/styles/index.css";
import { AoothSendPasswordResetEmailPayload } from "@aooth/aooth-js-sdk";

export const ForgotPasswordSuccess = () => {
  const { fetch: refetch } = useForgotPassword();
  const location = useLocation();

  const { state } = location as {
    state: AoothSendPasswordResetEmailPayload;
  };

  // eslint-disable-next-line no-void
  const onClickResendHandler = () => void refetch(state);

  if (!state)
    return (
      <Navigate
        to={{ pathname: "*", search: window.location.search }}
        replace
      />
    );

  const currentIdentityString = () => {
    if (state.email) return state.email;
    if (state.phone) return state.phone;
    return state.username;
  };

  return (
    <Wrapper
      title={`Check your ${state.email ? "email" : "phone"}`}
      className="aooth-flex aooth-flex-col aooth-max-w-[336px]"
    >
      <div className="aooth-w-full aooth-flex aooth-flex-col aooth-gap-[32px]">
        <p className="aooth-text-body-2-medium aooth-text-Grey-One aooth-text-center aooth-mt-[8px]">
          We sent a link to {state.phone ? "phone number" : "email address"}{" "}
          <strong className="aooth-text-body-2-bold">
            {currentIdentityString()}
          </strong>
          . Click the link to reset your password.
        </p>
        <Button
          size="big"
          variant="secondary"
          type="button"
          className="aooth-text-body-2-medium aooth-m-auto aooth-max-w-[196px]"
          onClick={onClickResendHandler}
        >
          Resend {state.email ? "email" : "SMS"}
        </Button>
      </div>
    </Wrapper>
  );
};
